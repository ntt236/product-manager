require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

async function seedData() {
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    console.log('Seeding initial development categories and demo users...');
    await client.query('BEGIN');

    // 1. Ensure Roles exist
    await client.query(`
      INSERT INTO public.roles (name, description)
      VALUES
        ('admin', 'System administrator'),
        ('manager', 'Product manager'),
        ('user', 'Regular user')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Fetch role IDs
    const rolesRes = await client.query('SELECT id, name FROM public.roles');
    const roleMap = {};
    rolesRes.rows.forEach((r) => {
      roleMap[r.name] = r.id;
    });

    // 2. Demo Users (using secure hash of sample passwords for dev testing only)
    const adminHash = await bcrypt.hash('Admin@123456', 10);
    const managerHash = await bcrypt.hash('Manager@123456', 10);
    const userHash = await bcrypt.hash('User@123456', 10);

    const usersToInsert = [
      { name: 'Admin User', email: 'admin@example.com', hash: adminHash, roleId: roleMap['admin'] },
      { name: 'Manager User', email: 'manager@example.com', hash: managerHash, roleId: roleMap['manager'] },
      { name: 'Regular User', email: 'user@example.com', hash: userHash, roleId: roleMap['user'] },
    ];

    for (const u of usersToInsert) {
      await client.query(
        `
        INSERT INTO public.users (name, email, password_hash, role_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING
      `,
        [u.name, u.email, u.hash, u.roleId]
      );
    }

    // 3. Demo Categories
    const categories = [
      { name: 'Electronics', description: 'Gadgets, devices, computers, and tech accessories' },
      { name: 'Home & Kitchen', description: 'Appliances, furniture, cookware, and home goods' },
      { name: 'Books', description: 'Printed books, textbooks, audiobooks, and e-books' },
      { name: 'Apparel', description: 'Clothing, footwear, and wearable accessories' },
    ];

    for (const c of categories) {
      await client.query(
        `
        INSERT INTO public.categories (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
      `,
        [c.name, c.description]
      );
    }

    // 4. Fetch a category and user for demo products
    const catRes = await client.query("SELECT id FROM public.categories WHERE name = 'Electronics' LIMIT 1");
    const userRes = await client.query("SELECT id FROM public.users WHERE email = 'admin@example.com' LIMIT 1");

    if (catRes.rows.length > 0 && userRes.rows.length > 0) {
      const catId = catRes.rows[0].id;
      const adminId = userRes.rows[0].id;

      const sampleProducts = [
        {
          name: 'Pro Noise-Cancelling Headphones',
          description: 'Wireless over-ear headphones with active noise cancellation and 30-hour battery life.',
          price: 199.99,
          image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
          categoryId: catId,
          createdBy: adminId,
        },
        {
          name: 'Mechanical Gaming Keyboard',
          description: 'RGB backlit mechanical keyboard with hot-swappable switches.',
          price: 89.5,
          image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3',
          categoryId: catId,
          createdBy: adminId,
        },
        {
          name: 'Ultra-thin 4K Monitor 27-inch',
          description: 'IPS panel with 99% sRGB coverage and USB-C display connectivity.',
          price: 349.0,
          image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf',
          categoryId: catId,
          createdBy: adminId,
        },
      ];

      for (const p of sampleProducts) {
        // Only insert if not exists by name
        const exists = await client.query('SELECT id FROM public.products WHERE name = $1', [p.name]);
        if (exists.rows.length === 0) {
          await client.query(
            `
            INSERT INTO public.products (name, description, price, image_url, category_id, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
            [p.name, p.description, p.price, p.image_url, p.categoryId, p.createdBy]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedData();
