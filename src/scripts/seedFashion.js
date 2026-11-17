require('dotenv').config();
const db = require('../config/db');

async function seedFashionData() {
  const client = await db.getClient();
  try {
    console.log('Seeding Fashion Variants & Images...');
    await client.query('BEGIN');

    // 1. Fetch fashion products
    const shirtRes = await client.query("SELECT id FROM public.products WHERE name LIKE '%Áo Phông%' LIMIT 1");
    const dressRes = await client.query("SELECT id FROM public.products WHERE name LIKE '%Váy voan%' LIMIT 1");

    if (shirtRes.rows.length > 0) {
      const shirtId = shirtRes.rows[0].id;
      // Seed sizes M, L, XL with colors Đen, Trắng
      const variants = [
        { size: 'M', color: 'Đen', colorCode: '#000000', stock: 25, sku: 'TSHIRT-BLK-M' },
        { size: 'L', color: 'Đen', colorCode: '#000000', stock: 30, sku: 'TSHIRT-BLK-L' },
        { size: 'M', color: 'Trắng', colorCode: '#FFFFFF', stock: 20, sku: 'TSHIRT-WHT-M' },
        { size: 'L', color: 'Trắng', colorCode: '#FFFFFF', stock: 35, sku: 'TSHIRT-WHT-L' },
      ];

      for (const v of variants) {
        await client.query(
          `
          INSERT INTO public.product_variants (product_id, size, color, color_code, stock_quantity, sku)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (product_id, size, color) DO NOTHING
        `,
          [shirtId, v.size, v.color, v.colorCode, v.stock, v.sku]
        );
      }
    }

    if (dressRes.rows.length > 0) {
      const dressId = dressRes.rows[0].id;
      const variants = [
        { size: 'S', color: 'Hồng Pastel', colorCode: '#FFD1DC', stock: 15, sku: 'DRESS-PNK-S' },
        { size: 'M', color: 'Hồng Pastel', colorCode: '#FFD1DC', stock: 20, sku: 'DRESS-PNK-M' },
        { size: 'S', color: 'Trắng Kem', colorCode: '#FFFDD0', stock: 12, sku: 'DRESS-CRM-S' },
      ];

      for (const v of variants) {
        await client.query(
          `
          INSERT INTO public.product_variants (product_id, size, color, color_code, stock_quantity, sku)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (product_id, size, color) DO NOTHING
        `,
          [dressId, v.size, v.color, v.colorCode, v.stock, v.sku]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Fashion Variants seeded successfully!');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedFashionData();
