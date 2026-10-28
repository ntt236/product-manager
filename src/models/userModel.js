const pool = require('../config/db');

class UserModel {
  static async create({ name, email, passwordHash, roleId }) {
    const query = `
      INSERT INTO public.users (name, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role_id, created_at, updated_at
    `;
    const values = [name, email, passwordHash, roleId];
    const res = await pool.query(query, values);
    return res.rows[0];
  }

  static async findByEmail(email) {
    const query = `
      SELECT u.id, u.name, u.email, u.password_hash, u.role_id, u.created_at, u.updated_at,
             r.name AS role_name
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1
    `;
    const res = await pool.query(query, [email]);
    return res.rows[0] || null;
  }

  static async findById(id) {
    const query = `
      SELECT u.id, u.name, u.email, u.role_id, u.created_at, u.updated_at,
             r.name AS role_name
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = $1
      LIMIT 1
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  static async findAll() {
    const query = `
      SELECT u.id, u.name, u.email, u.role_id, u.created_at, u.updated_at,
             r.name AS role_name
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      ORDER BY u.id ASC
    `;
    const res = await pool.query(query);
    return res.rows;
  }

  static async updateRole(id, roleId) {
    const query = `
      UPDATE public.users
      SET role_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, email, role_id, updated_at
    `;
    const res = await pool.query(query, [roleId, id]);
    return res.rows[0] || null;
  }
}

module.exports = UserModel;
