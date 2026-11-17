const pool = require('../config/db');

class ReviewModel {
  static async create({ productId, userId, orderId = null, rating, comment = null }) {
    // 1. Verify user actually purchased product if orderId not provided or verify via order_items
    const purchaseCheck = await pool.query(
      `
      SELECT o.id
      FROM public.orders o
      JOIN public.order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'delivered'
      LIMIT 1
    `,
      [userId, productId]
    );

    if (purchaseCheck.rows.length === 0) {
      const err = new Error('You can only review products that have been delivered to you in a completed order');
      err.statusCode = 403;
      throw err;
    }

    const verifiedOrderId = orderId || purchaseCheck.rows[0].id;

    const query = `
      INSERT INTO public.reviews (product_id, user_id, order_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const res = await pool.query(query, [productId, userId, verifiedOrderId, rating, comment || null]);
    return res.rows[0];
  }

  static async findByProductId(productId) {
    const query = `
      SELECT r.id, r.product_id, r.rating, r.comment, r.created_at,
             u.id AS user_id, u.name AS user_name
      FROM public.reviews r
      JOIN public.users u ON r.user_id = u.id
      WHERE r.product_id = $1
      ORDER BY r.id DESC
    `;
    const res = await pool.query(query, [productId]);
    return res.rows;
  }
}

module.exports = ReviewModel;
