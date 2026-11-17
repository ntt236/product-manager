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
      SELECT ci.id, ci.cart_id, ci.product_id, ci.quantity, ci.created_at, ci.updated_at,
             p.name AS product_name, p.price AS product_price, p.image_url,
             p.stock_quantity, p.is_active,
             (ci.quantity * p.price) AS subtotal
      FROM public.cart_items ci
      JOIN public.products p ON ci.product_id = p.id
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

  static async addItem(userId, productId, quantity) {
    const cart = await this.getOrCreateCart(userId);

    // Verify product exists, active and check stock
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

    // Check existing item in cart
    const existingItem = await pool.query(
      'SELECT * FROM public.cart_items WHERE cart_id = $1 AND product_id = $2 LIMIT 1',
      [cart.id, productId]
    );

    const newQuantity = (existingItem.rows[0] ? existingItem.rows[0].quantity : 0) + quantity;
    if (newQuantity > product.stock_quantity) {
      const err = new Error(`Requested quantity exceeds available stock (${product.stock_quantity} available)`);
      err.statusCode = 400;
      throw err;
    }

    const query = `
      INSERT INTO public.cart_items (cart_id, product_id, quantity, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (cart_id, product_id)
      DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = NOW()
      RETURNING *
    `;
    const res = await pool.query(query, [cart.id, productId, quantity]);
    return res.rows[0];
  }

  static async updateItemQuantity(userId, itemId, quantity) {
    const cart = await this.getOrCreateCart(userId);

    const itemRes = await pool.query(
      'SELECT ci.*, p.stock_quantity, p.name FROM public.cart_items ci JOIN public.products p ON ci.product_id = p.id WHERE ci.id = $1 AND ci.cart_id = $2 LIMIT 1',
      [itemId, cart.id]
    );
    const item = itemRes.rows[0];
    if (!item) {
      const err = new Error('Cart item not found');
      err.statusCode = 404;
      throw err;
    }

    if (quantity > item.stock_quantity) {
      const err = new Error(`Requested quantity exceeds available stock (${item.stock_quantity} available)`);
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
