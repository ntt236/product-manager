const pool = require('../config/db');

class RoleModel {
  static async findByName(name) {
    const res = await pool.query('SELECT * FROM public.roles WHERE name = $1 LIMIT 1', [name]);
    return res.rows[0] || null;
  }

  static async findById(id) {
    const res = await pool.query('SELECT * FROM public.roles WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] || null;
  }

  static async findAll() {
    const res = await pool.query('SELECT * FROM public.roles ORDER BY id ASC');
    return res.rows;
  }
}

module.exports = RoleModel;
