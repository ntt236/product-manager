const pool = require('../config/db');

class CategoryModel {
  static async create({ name, description }) {
    const query = `
      INSERT INTO public.categories (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description, created_at
    `;
    const res = await pool.query(query, [name, description || null]);
    return res.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM public.categories WHERE id = $1 LIMIT 1';
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  static async findByName(name) {
    const query = 'SELECT * FROM public.categories WHERE LOWER(name) = LOWER($1) LIMIT 1';
    const res = await pool.query(query, [name]);
    return res.rows[0] || null;
  }

  static async findAll() {
    const query = 'SELECT * FROM public.categories ORDER BY id ASC';
    const res = await pool.query(query);
    return res.rows;
  }

  static async update(id, { name, description }) {
    const query = `
      UPDATE public.categories
      SET name = COALESCE($1, name),
          description = COALESCE($2, description)
      WHERE id = $3
      RETURNING id, name, description, created_at
    `;
    const res = await pool.query(query, [name, description, id]);
    return res.rows[0] || null;
  }

  static async delete(id) {
    const query = 'DELETE FROM public.categories WHERE id = $1 RETURNING id';
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }
}

module.exports = CategoryModel;
