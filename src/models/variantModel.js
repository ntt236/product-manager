const pool = require('../config/db');

class VariantModel {
  static async create({ productId, size, color, colorCode, sku, priceOverride, stockQuantity = 0, imageUrl, isActive = true }) {
    const query = `
      INSERT INTO public.product_variants (product_id, size, color, color_code, sku, price_override, stock_quantity, image_url, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [productId, size, color, colorCode || null, sku || null, priceOverride || null, stockQuantity, imageUrl || null, isActive];
    const res = await pool.query(query, values);
    return res.rows[0];
  }

  static async findByProductId(productId) {
    const query = `
      SELECT * FROM public.product_variants
      WHERE product_id = $1 AND is_active = true
      ORDER BY id ASC
    `;
    const res = await pool.query(query, [productId]);
    return res.rows;
  }

  static async findById(id) {
    const query = `
      SELECT v.*, p.name AS product_name, p.price AS product_base_price, p.is_active AS product_is_active
      FROM public.product_variants v
      JOIN public.products p ON v.product_id = p.id
      WHERE v.id = $1 LIMIT 1
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  static async update(id, { size, color, colorCode, sku, priceOverride, stockQuantity, imageUrl, isActive }) {
    const query = `
      UPDATE public.product_variants
      SET size = COALESCE($1, size),
          color = COALESCE($2, color),
          color_code = COALESCE($3, color_code),
          sku = COALESCE($4, sku),
          price_override = COALESCE($5, price_override),
          stock_quantity = COALESCE($6, stock_quantity),
          image_url = COALESCE($7, image_url),
          is_active = COALESCE($8, is_active),
          updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `;
    const values = [size, color, colorCode, sku, priceOverride, stockQuantity, imageUrl, isActive, id];
    const res = await pool.query(query, values);
    return res.rows[0] || null;
  }

  static async delete(id) {
    const query = 'DELETE FROM public.product_variants WHERE id = $1 RETURNING id';
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }
}

module.exports = VariantModel;
