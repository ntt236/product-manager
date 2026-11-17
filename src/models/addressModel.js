const pool = require('../config/db');

class AddressModel {
  static async create({ userId, receiverName, phone, streetAddress, ward, district, province, isDefault = false }) {
    const client = await pool.getClient();
    try {
      await client.query('BEGIN');

      if (isDefault) {
        await client.query('UPDATE public.shipping_addresses SET is_default = false WHERE user_id = $1', [userId]);
      } else {
        // If this is the user's first address, make it default automatically
        const countRes = await client.query('SELECT COUNT(*) AS count FROM public.shipping_addresses WHERE user_id = $1', [userId]);
        if (parseInt(countRes.rows[0].count, 10) === 0) {
          isDefault = true;
        }
      }

      const insertQuery = `
        INSERT INTO public.shipping_addresses (user_id, receiver_name, phone, street_address, ward, district, province, is_default)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, user_id, receiver_name, phone, street_address, ward, district, province, is_default, created_at, updated_at
      `;
      const res = await client.query(insertQuery, [userId, receiverName, phone, streetAddress, ward || null, district, province, isDefault]);

      await client.query('COMMIT');
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async findByUserId(userId) {
    const query = `
      SELECT id, user_id, receiver_name, phone, street_address, ward, district, province, is_default, created_at, updated_at
      FROM public.shipping_addresses
      WHERE user_id = $1
      ORDER BY is_default DESC, id DESC
    `;
    const res = await pool.query(query, [userId]);
    return res.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM public.shipping_addresses WHERE id = $1 LIMIT 1';
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  static async update(id, userId, { receiverName, phone, streetAddress, ward, district, province, isDefault }) {
    const client = await pool.getClient();
    try {
      await client.query('BEGIN');

      if (isDefault) {
        await client.query('UPDATE public.shipping_addresses SET is_default = false WHERE user_id = $1', [userId]);
      }

      const query = `
        UPDATE public.shipping_addresses
        SET receiver_name = COALESCE($1, receiver_name),
            phone = COALESCE($2, phone),
            street_address = COALESCE($3, street_address),
            ward = COALESCE($4, ward),
            district = COALESCE($5, district),
            province = COALESCE($6, province),
            is_default = COALESCE($7, is_default),
            updated_at = NOW()
        WHERE id = $8 AND user_id = $9
        RETURNING id, user_id, receiver_name, phone, street_address, ward, district, province, is_default, created_at, updated_at
      `;
      const res = await client.query(query, [receiverName, phone, streetAddress, ward, district, province, isDefault, id, userId]);

      await client.query('COMMIT');
      return res.rows[0] || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async delete(id, userId) {
    const query = 'DELETE FROM public.shipping_addresses WHERE id = $1 AND user_id = $2 RETURNING id';
    const res = await pool.query(query, [id, userId]);
    return res.rows[0] || null;
  }
}

module.exports = AddressModel;
