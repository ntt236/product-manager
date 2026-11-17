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

      // 2. Fetch Cart and Cart Items
      const cartRes = await client.query('SELECT id FROM public.carts WHERE user_id = $1 LIMIT 1', [userId]);
      if (cartRes.rows.length === 0) {
        const err = new Error('Cart is empty');
        err.statusCode = 400;
        throw err;
      }
      const cartId = cartRes.rows[0].id;

      // Lock products with FOR UPDATE to prevent race condition during stock deduction
      const itemsQuery = `
        SELECT ci.id AS item_id, ci.product_id, ci.quantity,
               p.name AS product_name, p.price, p.stock_quantity, p.is_active
        FROM public.cart_items ci
        JOIN public.products p ON ci.product_id = p.id
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
        if (!item.is_active) {
          const err = new Error(`Product '${item.product_name}' is currently unavailable`);
          err.statusCode = 400;
          throw err;
        }

        if (item.quantity > item.stock_quantity) {
          const err = new Error(
            `Product '${item.product_name}' has only ${item.stock_quantity} left in stock (you requested ${item.quantity})`
          );
          err.statusCode = 400;
          throw err;
        }

        totalAmount += parseFloat(item.price) * parseInt(item.quantity, 10);
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
        const subtotal = (parseFloat(item.price) * parseInt(item.quantity, 10)).toFixed(2);

        await client.query(
          `
          INSERT INTO public.order_items (order_id, product_id, product_name_snapshot, price_snapshot, quantity, subtotal)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
          [order.id, item.product_id, item.product_name, item.price, item.quantity, subtotal]
        );

        // Deduct inventory
        await client.query(
          'UPDATE public.products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
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
      SELECT oi.*, p.image_url
      FROM public.order_items oi
      LEFT JOIN public.products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
      ORDER BY oi.id ASC
    `,
      [order.id]
    );

    return {
      ...order,
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
      SELECT o.*, u.name AS user_name, u.email AS user_email
      FROM public.orders o
      JOIN public.users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const res = await pool.query(query, values);
    return {
      orders: res.rows,
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

      // 2. Restock products
      const itemsRes = await client.query('SELECT product_id, quantity FROM public.order_items WHERE order_id = $1', [orderId]);
      for (const item of itemsRes.rows) {
        await client.query(
          'UPDATE public.products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
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
