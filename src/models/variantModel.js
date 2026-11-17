const pool = require('../config/db');

class VariantModel {
  static async syncProductTotalStock(productId) {
    if (!productId) return;
    await pool.query(
      `
      UPDATE public.products
      SET stock_quantity = (
        SELECT COALESCE(SUM(stock_quantity), 0)
        FROM public.product_variants
        WHERE product_id = $1 AND is_active = true
      ),
      updated_at = NOW()
      WHERE id = $1 AND EXISTS (SELECT 1 FROM public.product_variants WHERE product_id = $1)
    `,
      [productId]
    );
  }

  static async create({ productId, size, color, colorCode, sku, priceOverride, stockQuantity = 0, imageUrl, isActive = true }) {
    const query = `
      INSERT INTO public.product_variants (product_id, size, color, color_code, sku, price_override, stock_quantity, image_url, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (product_id, size, color)
      DO UPDATE SET
        color_code = COALESCE(EXCLUDED.color_code, product_variants.color_code),
        sku = COALESCE(EXCLUDED.sku, product_variants.sku),
        price_override = COALESCE(EXCLUDED.price_override, product_variants.price_override),
        stock_quantity = EXCLUDED.stock_quantity,
        image_url = COALESCE(EXCLUDED.image_url, product_variants.image_url),
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING *
    `;
    const values = [productId, size, color, colorCode || null, sku || null, priceOverride || null, stockQuantity, imageUrl || null, isActive];
    const res = await pool.query(query, values);
    await this.syncProductTotalStock(productId);
    return res.rows[0];
  }

  static async createBulk(productId, variantsList) {
    const client = await pool.getClient();
    try {
      await client.query('BEGIN');
      const results = [];

      for (const item of variantsList) {
        const query = `
          INSERT INTO public.product_variants (product_id, size, color, color_code, sku, price_override, stock_quantity, image_url, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (product_id, size, color)
          DO UPDATE SET
            color_code = COALESCE(EXCLUDED.color_code, product_variants.color_code),
            sku = COALESCE(EXCLUDED.sku, product_variants.sku),
            price_override = COALESCE(EXCLUDED.price_override, product_variants.price_override),
            stock_quantity = EXCLUDED.stock_quantity,
            image_url = COALESCE(EXCLUDED.image_url, product_variants.image_url),
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
          RETURNING *
        `;
        const values = [
          productId,
          item.size,
          item.color,
          item.color_code || null,
          item.sku || null,
          item.price_override || null,
          item.stock_quantity !== undefined ? parseInt(item.stock_quantity, 10) : 0,
          item.image_url || null,
          item.is_active !== undefined ? Boolean(item.is_active) : true,
        ];
        const res = await client.query(query, values);
        results.push(res.rows[0]);
      }

      await client.query('COMMIT');
      await this.syncProductTotalStock(productId);
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
    if (res.rows[0]) {
      await this.syncProductTotalStock(res.rows[0].product_id);
    }
    return res.rows[0] || null;
  }

  static async delete(id) {
    const varRes = await pool.query('SELECT product_id FROM public.product_variants WHERE id = $1', [id]);
    const query = 'DELETE FROM public.product_variants WHERE id = $1 RETURNING id';
    const res = await pool.query(query, [id]);
    if (varRes.rows[0]) {
      await this.syncProductTotalStock(varRes.rows[0].product_id);
    }
    return res.rows[0] || null;
  }
}

module.exports = VariantModel;
