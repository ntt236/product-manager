require('dotenv').config({ path: 'D:/product-manager/.env' });
const pool = require('D:/product-manager/src/config/db');

async function checkVariantsDb() {
  try {
    const con = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'public.product_variants'::regclass
    `);
    console.log('product_variants constraints:', con.rows);

    const idx = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'product_variants'
    `);
    console.log('product_variants indexes:', idx.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkVariantsDb();

