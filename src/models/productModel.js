const pool = require('../config/db');

class ProductModel {
  static async create({ name, description, price, imageUrl, categoryId, createdBy, stockQuantity = 0, sku = null, isActive = true }) {
    const query = `
      INSERT INTO public.products (name, description, price, image_url, category_id, created_by, stock_quantity, sku, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, description, price, image_url, category_id, created_by, stock_quantity, sku, is_active, created_at, updated_at
    `;
    const values = [name, description || null, price, imageUrl || null, categoryId, createdBy || null, stockQuantity, sku || null, isActive];
    const res = await pool.query(query, values);
    return res.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT p.id, p.name, p.description, p.price, p.image_url, p.category_id, p.created_by,
             p.stock_quantity, p.sku, p.is_active,
             p.created_at, p.updated_at,
             c.name AS category_name,
             u.name AS creator_name, u.email AS creator_email
      FROM public.products p
      JOIN public.categories c ON p.category_id = c.id
      LEFT JOIN public.users u ON p.created_by = u.id
      WHERE p.id = $1
      LIMIT 1
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  static async findAll({ search, categoryId, isActive = null, inStock = false, limit = 10, offset = 0 }) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`p.name ILIKE $${paramIndex}`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (categoryId) {
      conditions.push(`p.category_id = $${paramIndex}`);
      values.push(categoryId);
      paramIndex++;
    }

    if (isActive !== null) {
      conditions.push(`p.is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }

    if (inStock) {
      conditions.push(`p.stock_quantity > 0`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM public.products p
      ${whereClause}
    `;
    const countRes = await pool.query(countQuery, values);
    const total = parseInt(countRes.rows[0].total, 10);

    const query = `
      SELECT p.id, p.name, p.description, p.price, p.image_url, p.category_id, p.created_by,
             p.stock_quantity, p.sku, p.is_active,
             p.created_at, p.updated_at,
             c.name AS category_name,
             u.name AS creator_name
      FROM public.products p
      JOIN public.categories c ON p.category_id = c.id
      LEFT JOIN public.users u ON p.created_by = u.id
      ${whereClause}
      ORDER BY p.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const res = await pool.query(query, values);
    return {
      products: res.rows,
      total,
    };
  }

  static async update(id, { name, description, price, imageUrl, categoryId, stockQuantity, sku, isActive }) {
    const query = `
      UPDATE public.products
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          image_url = COALESCE($4, image_url),
          category_id = COALESCE($5, category_id),
          stock_quantity = COALESCE($6, stock_quantity),
          sku = COALESCE($7, sku),
          is_active = COALESCE($8, is_active),
          updated_at = NOW()
      WHERE id = $9
      RETURNING id, name, description, price, image_url, category_id, created_by, stock_quantity, sku, is_active, created_at, updated_at
    `;
    const values = [name, description, price, imageUrl, categoryId, stockQuantity, sku, isActive, id];
    const res = await pool.query(query, values);
    return res.rows[0] || null;
  }

  static async delete(id) {
    const query = 'DELETE FROM public.products WHERE id = $1 RETURNING id';
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }
}

module.exports = ProductModel;
