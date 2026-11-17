const pool = require('../config/db');

class CartModel {
  static async getOrCreateCart(userId) {
    const existing = await pool.query('SELECT * FROM public.carts WHERE user_id = $1 LIMIT 1', [userId]);
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }
    const created = await pool.query(
      'INSERT INTO public.carts (user_id) VALUES ($1) RETURNING *',
      [userId]
    );
    return created.rows[0];
  }

  static async getCartDetails(userId) {
    const cart = await this.getOrCreateCart(userId);
    const itemsQuery = `
      SELECT ci.id, ci.cart_id, ci.product_id, ci.variant_id, ci.quantity, ci.created_at, ci.updated_at,
             p.name AS product_name, p.image_url AS product_image,
             pv.size, pv.color, pv.color_code, pv.sku AS variant_sku,
             COALESCE(pv.price_override, p.price) AS unit_price,
             COALESCE(pv.stock_quantity, p.stock_quantity) AS available_stock,
             p.is_active,
             (ci.quantity * COALESCE(pv.price_override, p.price)) AS subtotal
      FROM public.cart_items ci
      JOIN public.products p ON ci.product_id = p.id
      LEFT JOIN public.product_variants pv ON ci.variant_id = pv.id
      WHERE ci.cart_id = $1
      ORDER BY ci.id DESC
    `;
    const itemsRes = await pool.query(itemsQuery, [cart.id]);
    const items = itemsRes.rows;

    const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
    const totalItems = items.reduce((sum, item) => sum + parseInt(item.quantity, 10), 0);

    return {
      cartId: cart.id,
      userId: cart.user_id,
      totalItems,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      items,
    };
  }

  static async addItem(userId, productId, variantId = null, quantity = 1) {
    const cart = await this.getOrCreateCart(userId);

    // Verify product exists and active
    const prodRes = await pool.query('SELECT * FROM public.products WHERE id = $1 LIMIT 1', [productId]);
    const product = prodRes.rows[0];
    if (!product) {
      const err = new Error(`Product with ID ${productId} does not exist`);
      err.statusCode = 404;
      throw err;
    }

    if (!product.is_active) {
      const err = new Error(`Product '${product.name}' is currently unavailable`);
      err.statusCode = 400;
      throw err;
    }

    let availableStock = product.stock_quantity;

    // If variant specified, verify variant
    if (variantId) {
      const varRes = await pool.query('SELECT * FROM public.product_variants WHERE id = $1 AND product_id = $2 LIMIT 1', [variantId, productId]);
      const variant = varRes.rows[0];
      if (!variant) {
        const err = new Error(`Product variant with ID ${variantId} does not belong to this product`);
        err.statusCode = 404;
        throw err;
      }
      if (!variant.is_active) {
        const err = new Error(`Variant (${variant.size} - ${variant.color}) is currently inactive`);
        err.statusCode = 400;
        throw err;
      }
      availableStock = variant.stock_quantity;
    }

    // Check existing item in cart
    const existingItem = await pool.query(
      'SELECT * FROM public.cart_items WHERE cart_id = $1 AND product_id = $2 AND (variant_id = $3 OR ($3 IS NULL AND variant_id IS NULL)) LIMIT 1',
      [cart.id, productId, variantId]
    );

    const newQuantity = (existingItem.rows[0] ? existingItem.rows[0].quantity : 0) + quantity;
    if (newQuantity > availableStock) {
      const err = new Error(`Requested quantity exceeds available stock (${availableStock} available)`);
      err.statusCode = 400;
      throw err;
    }

    if (existingItem.rows.length > 0) {
      const updateRes = await pool.query(
        'UPDATE public.cart_items SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [quantity, existingItem.rows[0].id]
      );
      return updateRes.rows[0];
    } else {
      const insertRes = await pool.query(
        'INSERT INTO public.cart_items (cart_id, product_id, variant_id, quantity) VALUES ($1, $2, $3, $4) RETURNING *',
        [cart.id, productId, variantId, quantity]
      );
      return insertRes.rows[0];
    }
  }

  static async updateItemQuantity(userId, itemId, quantity) {
    const cart = await this.getOrCreateCart(userId);

    const itemRes = await pool.query(
      `
      SELECT ci.*, p.stock_quantity AS product_stock, pv.stock_quantity AS variant_stock
      FROM public.cart_items ci
      JOIN public.products p ON ci.product_id = p.id
      LEFT JOIN public.product_variants pv ON ci.variant_id = pv.id
      WHERE ci.id = $1 AND ci.cart_id = $2 LIMIT 1
    `,
      [itemId, cart.id]
    );
    const item = itemRes.rows[0];
    if (!item) {
      const err = new Error('Cart item not found');
      err.statusCode = 404;
      throw err;
    }

    const maxStock = item.variant_id ? item.variant_stock : item.product_stock;
    if (quantity > maxStock) {
      const err = new Error(`Requested quantity exceeds available stock (${maxStock} available)`);
      err.statusCode = 400;
      throw err;
    }

    const query = `
      UPDATE public.cart_items
      SET quantity = $1, updated_at = NOW()
      WHERE id = $2 AND cart_id = $3
      RETURNING *
    `;
    const res = await pool.query(query, [quantity, itemId, cart.id]);
    return res.rows[0];
  }

  static async removeItem(userId, itemId) {
    const cart = await this.getOrCreateCart(userId);
    const res = await pool.query(
      'DELETE FROM public.cart_items WHERE id = $1 AND cart_id = $2 RETURNING id',
      [itemId, cart.id]
    );
    return res.rows[0] || null;
  }

  static async clearCart(userId) {
    const cart = await this.getOrCreateCart(userId);
    await pool.query('DELETE FROM public.cart_items WHERE cart_id = $1', [cart.id]);
    return { success: true };
  }
}

module.exports = CartModel;
