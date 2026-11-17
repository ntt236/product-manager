const pool = require('../config/db');

class OrderModel {
  static async createOrder({ userId, shippingAddressId, note = null }) {
    const client = await pool.getClient();

    try {
      await client.query('BEGIN');

      // 1. Fetch shipping address
      const addrRes = await client.query(
        'SELECT * FROM public.shipping_addresses WHERE id = $1 AND user_id = $2 LIMIT 1',
        [shippingAddressId, userId]
      );
      const address = addrRes.rows[0];
      if (!address) {
        const err = new Error('Shipping address not found');
        err.statusCode = 404;
        throw err;
      }

      // 2. Fetch Cart and Cart Items with Variants
      const cartRes = await client.query('SELECT id FROM public.carts WHERE user_id = $1 LIMIT 1', [userId]);
      if (cartRes.rows.length === 0) {
        const err = new Error('Cart is empty');
        err.statusCode = 400;
        throw err;
      }
      const cartId = cartRes.rows[0].id;

      // Lock products and variants FOR UPDATE to prevent race condition during stock deduction
      const itemsQuery = `
        SELECT ci.id AS item_id, ci.product_id, ci.variant_id, ci.quantity,
               p.name AS product_name, p.price AS product_price, p.stock_quantity AS product_stock, p.is_active AS product_is_active,
               pv.size, pv.color, pv.price_override, pv.stock_quantity AS variant_stock, pv.is_active AS variant_is_active
        FROM public.cart_items ci
        JOIN public.products p ON ci.product_id = p.id
        LEFT JOIN public.product_variants pv ON ci.variant_id = pv.id
        WHERE ci.cart_id = $1
        FOR UPDATE OF p
      `;
      const itemsRes = await client.query(itemsQuery, [cartId]);
      const items = itemsRes.rows;

      if (items.length === 0) {
        const err = new Error('Your shopping cart is empty');
        err.statusCode = 400;
        throw err;
      }

      // 3. Validate stock & active status
      let totalAmount = 0;
      for (const item of items) {
        if (!item.product_is_active || (item.variant_id && !item.variant_is_active)) {
          const err = new Error(`Product '${item.product_name}' is currently unavailable`);
          err.statusCode = 400;
          throw err;
        }

        const effectiveStock = item.variant_id ? item.variant_stock : item.product_stock;
        if (item.quantity > effectiveStock) {
          const detail = item.variant_id ? `(${item.size} - ${item.color})` : '';
          const err = new Error(
            `Product '${item.product_name}' ${detail} has only ${effectiveStock} left in stock (you requested ${item.quantity})`
          );
          err.statusCode = 400;
          throw err;
        }

        const itemPrice = item.price_override ? parseFloat(item.price_override) : parseFloat(item.product_price);
        totalAmount += itemPrice * parseInt(item.quantity, 10);
      }

      // 4. Generate unique order code
      const orderCode = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 5. Create Order
      const addressSnapshot = {
        receiver_name: address.receiver_name,
        phone: address.phone,
        street_address: address.street_address,
        ward: address.ward,
        district: address.district,
        province: address.province,
      };

      const insertOrderQuery = `
        INSERT INTO public.orders (order_code, user_id, total_amount, status, shipping_address_snapshot, note)
        VALUES ($1, $2, $3, 'pending', $4, $5)
        RETURNING *
      `;
      const orderRes = await client.query(insertOrderQuery, [
        orderCode,
        userId,
        totalAmount.toFixed(2),
        JSON.stringify(addressSnapshot),
        note || null,
      ]);
      const order = orderRes.rows[0];

      // 6. Insert Order Items & Deduct Stock
      for (const item of items) {
        const unitPrice = item.price_override ? parseFloat(item.price_override) : parseFloat(item.product_price);
        const subtotal = (unitPrice * parseInt(item.quantity, 10)).toFixed(2);

        await client.query(
          `
          INSERT INTO public.order_items (order_id, product_id, variant_id, size_snapshot, color_snapshot, product_name_snapshot, price_snapshot, quantity, subtotal)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
          [order.id, item.product_id, item.variant_id || null, item.size || null, item.color || null, item.product_name, unitPrice, item.quantity, subtotal]
        );

        // Deduct inventory from variant if exists, else from product
        if (item.variant_id) {
          await client.query(
            'UPDATE public.product_variants SET stock_quantity = stock_quantity - $1 WHERE id = $2',
            [item.quantity, item.variant_id]
          );
        } else {
          await client.query(
            'UPDATE public.products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }
      }

      // 7. Clear user's cart
      await client.query('DELETE FROM public.cart_items WHERE cart_id = $1', [cartId]);

      await client.query('COMMIT');
      return order;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async findById(orderId, userId = null) {
    const values = [orderId];
    let userFilter = '';
    if (userId) {
      userFilter = 'AND o.user_id = $2';
      values.push(userId);
    }

    const orderQuery = `
      SELECT o.*, u.name AS user_name, u.email AS user_email
      FROM public.orders o
      JOIN public.users u ON o.user_id = u.id
      WHERE o.id = $1 ${userFilter}
      LIMIT 1
    `;
    const orderRes = await pool.query(orderQuery, values);
    const order = orderRes.rows[0];
    if (!order) return null;

    const itemsRes = await pool.query(
      `
      SELECT oi.*,
             oi.product_name_snapshot AS product_name,
             oi.price_snapshot AS unit_price,
             oi.price_snapshot AS price,
             oi.size_snapshot AS size,
             oi.color_snapshot AS color,
             p.image_url, pv.color_code
      FROM public.order_items oi
      LEFT JOIN public.products p ON oi.product_id = p.id
      LEFT JOIN public.product_variants pv ON oi.variant_id = pv.id
      WHERE oi.order_id = $1
      ORDER BY oi.id ASC
    `,
      [order.id]
    );

    const addr = typeof order.shipping_address_snapshot === 'string'
      ? JSON.parse(order.shipping_address_snapshot)
      : (order.shipping_address_snapshot || {});

    const normalizedAddress = {
      ...addr,
      recipient_name: addr.receiver_name || addr.recipient_name || '',
      receiver_name: addr.receiver_name || addr.recipient_name || '',
      address_line: addr.street_address || addr.address_line || '',
      street_address: addr.street_address || addr.address_line || '',
      city: addr.province || addr.city || '',
      province: addr.province || addr.city || '',
    };

    return {
      ...order,
      shipping_address: normalizedAddress,
      shipping_address_snapshot: normalizedAddress,
      items: itemsRes.rows,
    };
  }

  static async findAll({ userId = null, status = null, page = 1, limit = 10 }) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (userId) {
      conditions.push(`o.user_id = $${paramIndex}`);
      values.push(userId);
      paramIndex++;
    }

    if (status) {
      conditions.push(`o.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) AS total FROM public.orders o ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0].total, 10);

    const offset = (page - 1) * limit;
    const query = `
      SELECT o.*, u.name AS user_name, u.email AS user_email,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'variant_id', oi.variant_id,
                'product_name', oi.product_name_snapshot,
                'product_name_snapshot', oi.product_name_snapshot,
                'price', oi.price_snapshot,
                'unit_price', oi.price_snapshot,
                'price_snapshot', oi.price_snapshot,
                'size', oi.size_snapshot,
                'size_snapshot', oi.size_snapshot,
                'color', oi.color_snapshot,
                'color_snapshot', oi.color_snapshot,
                'quantity', oi.quantity,
                'subtotal', oi.subtotal,
                'image_url', p.image_url,
                'color_code', pv.color_code
              ) ORDER BY oi.id ASC
            )
            FROM public.order_items oi
            LEFT JOIN public.products p ON oi.product_id = p.id
            LEFT JOIN public.product_variants pv ON oi.variant_id = pv.id
            WHERE oi.order_id = o.id
          ),
          '[]'::json
        ) AS items
      FROM public.orders o
      JOIN public.users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const res = await pool.query(query, values);
    const orders = res.rows.map((order) => {
      const addr = typeof order.shipping_address_snapshot === 'string'
        ? JSON.parse(order.shipping_address_snapshot)
        : (order.shipping_address_snapshot || {});
      const normalizedAddress = {
        ...addr,
        recipient_name: addr.receiver_name || addr.recipient_name || '',
        receiver_name: addr.receiver_name || addr.recipient_name || '',
        address_line: addr.street_address || addr.address_line || '',
        street_address: addr.street_address || addr.address_line || '',
        city: addr.province || addr.city || '',
        province: addr.province || addr.city || '',
      };
      return {
        ...order,
        shipping_address: normalizedAddress,
        shipping_address_snapshot: normalizedAddress,
      };
    });

    return {
      orders,
      total,
    };
  }

  static async updateStatus(orderId, newStatus) {
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      const err = new Error(`Invalid order status. Allowed: ${validStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const query = `
      UPDATE public.orders
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const res = await pool.query(query, [newStatus, orderId]);
    return res.rows[0] || null;
  }

  static async cancelOrder(orderId, userId) {
    const client = await pool.getClient();
    try {
      await client.query('BEGIN');

      const orderRes = await client.query(
        'SELECT * FROM public.orders WHERE id = $1 AND user_id = $2 FOR UPDATE LIMIT 1',
        [orderId, userId]
      );
      const order = orderRes.rows[0];
      if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
      }

      if (order.status !== 'pending') {
        const err = new Error(`Only pending orders can be cancelled. Current status is '${order.status}'`);
        err.statusCode = 400;
        throw err;
      }

      // 1. Update status to cancelled
      await client.query("UPDATE public.orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [orderId]);

      // 2. Restock products & variants
      const itemsRes = await client.query('SELECT product_id, variant_id, quantity FROM public.order_items WHERE order_id = $1', [orderId]);
      for (const item of itemsRes.rows) {
        if (item.variant_id) {
          await client.query(
            'UPDATE public.product_variants SET stock_quantity = stock_quantity + $1 WHERE id = $2',
            [item.quantity, item.variant_id]
          );
        } else {
          await client.query(
            'UPDATE public.products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }
      }

      await client.query('COMMIT');
      return { success: true, message: 'Order cancelled successfully and stock refunded' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = OrderModel;
