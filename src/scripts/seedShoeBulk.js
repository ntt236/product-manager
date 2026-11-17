require('dotenv').config();
const db = require('../config/db');
const VariantModel = require('../models/variantModel');

async function testShoeBulk() {
  const client = await db.getClient();
  try {
    // Check if shoe exists or create
    let shoeRes = await client.query("SELECT id FROM public.products WHERE name = $1 LIMIT 1", ['Giày Sneaker Retro Classic']);
    let shoeId;

    if (shoeRes.rows.length === 0) {
      const catRes = await client.query("SELECT id FROM public.categories WHERE name = 'Men' LIMIT 1");
      const catId = catRes.rows.length > 0 ? catRes.rows[0].id : 1;

      const newShoe = await client.query(
        `INSERT INTO public.products (name, description, price, category_id, gender, brand)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Giày Sneaker Retro Classic', 'Giày thể thao nam dáng cổ điển', 850000, catId, 'men', 'Nike']
      );
      shoeId = newShoe.rows[0].id;
    } else {
      shoeId = shoeRes.rows[0].id;
    }

    const shoeVariants = [
      { size: '39', color: 'Trắng', color_code: '#FFFFFF', stock_quantity: 20, sku: 'SNK-WHT-39' },
      { size: '40', color: 'Trắng', color_code: '#FFFFFF', stock_quantity: 35, sku: 'SNK-WHT-40' },
      { size: '41', color: 'Trắng', color_code: '#FFFFFF', stock_quantity: 40, sku: 'SNK-WHT-41' },
      { size: '42', color: 'Trắng', color_code: '#FFFFFF', stock_quantity: 25, sku: 'SNK-WHT-42' },
      { size: '40', color: 'Đen', color_code: '#000000', stock_quantity: 30, sku: 'SNK-BLK-40' },
      { size: '41', color: 'Đen', color_code: '#000000', stock_quantity: 30, sku: 'SNK-BLK-41' },
    ];

    const results = await VariantModel.createBulk(shoeId, shoeVariants);
    console.log(`BULK SEED SUCCESS: Created/Updated ${results.length} shoe variants for product ID ${shoeId}`);
    process.exit(0);
  } catch (err) {
    console.error('Bulk test error:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

testShoeBulk();
