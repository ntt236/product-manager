require('dotenv').config({ path: 'D:/product-manager/.env' });
const pool = require('D:/product-manager/src/config/db');

async function checkCartItemsDb() {
  try {
    const con = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'public.cart_items'::regclass
    `);
    console.log('cart_items constraints:', con.rows);

    const idx = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'cart_items'
    `);
    console.log('cart_items indexes:', idx.rows);

    const triggers = await pool.query(`
      SELECT tgname, pg_get_triggerdef(oid) as def
      FROM pg_trigger
      WHERE tgrelid = 'public.cart_items'::regclass
    `);
    console.log('cart_items triggers:', triggers.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCartItemsDb();

