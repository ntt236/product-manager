require('dotenv').config({ path: 'D:/product-manager/.env' });
const pool = require('D:/product-manager/src/config/db');

async function syncAllStock() {
  try {
    await pool.query(`
      UPDATE public.products p
      SET stock_quantity = (
        SELECT COALESCE(SUM(pv.stock_quantity), 0)
        FROM public.product_variants pv
        WHERE pv.product_id = p.id AND pv.is_active = true
      )
      WHERE EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id = p.id);
    `);
    const pro = await pool.query('SELECT id, name, stock_quantity FROM public.products ORDER BY id');
    console.log('Synced products in DB:', pro.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

syncAllStock();

