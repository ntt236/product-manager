require('dotenv').config({ path: 'D:/product-manager/.env' });
const pool = require('D:/product-manager/src/config/db');

async function setupCategories() {
  try {
    let shoesCat = await pool.query("SELECT id FROM public.categories WHERE LOWER(name) IN ('shoes', 'giày', 'giày dép', 'giày dép & túi xách') LIMIT 1");
    if (shoesCat.rows.length === 0) {
      const insertShoe = await pool.query("INSERT INTO public.categories (name, description, gender) VALUES ($1, $2, $3) RETURNING id", ['Shoes', 'Giày dép và túi xách thời trang', 'unisex']);
      console.log('Inserted Shoes category:', insertShoe.rows[0]);
      shoesCat = insertShoe;
    }

    let accCat = await pool.query("SELECT id FROM public.categories WHERE LOWER(name) IN ('accessories', 'phụ kiện', 'phụ kiện tối giản') LIMIT 1");
    if (accCat.rows.length === 0) {
      const insertAcc = await pool.query("INSERT INTO public.categories (name, description, gender) VALUES ($1, $2, $3) RETURNING id", ['Accessories', 'Phụ kiện thời trang tối giản', 'unisex']);
      console.log('Inserted Accessories category:', insertAcc.rows[0]);
    }

    const shoeCatId = shoesCat.rows[0].id;
    await pool.query('UPDATE public.products SET category_id = $1 WHERE id = 6 OR name LIKE $2', [shoeCatId, '%Giày%']);
    console.log(`Updated product 6 to category Shoes (ID: ${shoeCatId})`);

    // Also update base stock_quantity of product 6 so it matches total variant stock
    await pool.query('UPDATE public.products SET stock_quantity = 180 WHERE id = 6');

    // Add a couple sample accessories if none exist
    const accRows = await pool.query("SELECT id FROM public.products WHERE category_id = (SELECT id FROM public.categories WHERE name = 'Accessories') LIMIT 1");
    if (accRows.rows.length === 0) {
      const accCatRes = await pool.query("SELECT id FROM public.categories WHERE name = 'Accessories' LIMIT 1");
      const accId = accCatRes.rows[0].id;
      const newAcc = await pool.query(
        `INSERT INTO public.products (name, description, price, category_id, gender, brand, stock_quantity, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          'Kính râm Minimalist Acetate',
          'Kính râm gọng vuông phong cách tối giản đương đại',
          450000,
          accId,
          'unisex',
          'Monokro',
          40,
          'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80'
        ]
      );
      console.log('Inserted Accessory product:', newAcc.rows[0]);
    }

    const allCats = await pool.query('SELECT id, name, gender FROM public.categories ORDER BY id');
    console.log('Current categories:', allCats.rows);

    const allPros = await pool.query('SELECT p.id, p.name, p.category_id, c.name as category_name, p.gender, p.stock_quantity FROM public.products p LEFT JOIN public.categories c ON p.category_id = c.id ORDER BY p.id');
    console.log('Current products:', allPros.rows);
    process.exit(0);
  } catch (err) {
    console.error('Category setup error:', err);
    process.exit(1);
  }
}

setupCategories();

