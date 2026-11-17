require('dotenv').config();
const db = require('../config/db');

// Map DummyJSON category slugs to our local category IDs and genders
const CATEGORY_MAPPING = {
  'mens-shirts': { catName: 'Men', gender: 'men', defaultSizes: ['S', 'M', 'L', 'XL'] },
  'mens-shoes': { catName: 'Shoes', gender: 'men', defaultSizes: ['39', '40', '41', '42', '43'] },
  'mens-watches': { catName: 'Accessories', gender: 'men', defaultSizes: ['Free Size'] },
  'womens-dresses': { catName: 'Women', gender: 'women', defaultSizes: ['XS', 'S', 'M', 'L'] },
  'womens-shoes': { catName: 'Shoes', gender: 'women', defaultSizes: ['35', '36', '37', '38', '39'] },
  'womens-bags': { catName: 'Accessories', gender: 'women', defaultSizes: ['Free Size'] },
  'womens-jewellery': { catName: 'Accessories', gender: 'women', defaultSizes: ['Free Size'] },
  'womens-watches': { catName: 'Accessories', gender: 'women', defaultSizes: ['Free Size'] },
};

const COLOR_PALETTE = [
  { color: 'Đen', code: '#000000' },
  { color: 'Trắng', code: '#FFFFFF' },
  { color: 'Xanh Navy', code: '#001F3F' },
  { color: 'Beige', code: '#F5F5DC' },
  { color: 'Nâu Cà Phê', code: '#6F4E37' },
  { color: 'Xám Ghi', code: '#808080' },
  { color: 'Hồng Pastel', code: '#FFD1DC' },
];

async function crawlAndSeed() {
  const client = await db.getClient();
  try {
    console.log('🚀 Starting Automated Fashion Crawl & Seed Engine...');
    
    // 1. Fetch our category IDs
    const catRows = await client.query('SELECT id, name FROM public.categories');
    const catMap = {};
    catRows.rows.forEach(r => {
      catMap[r.name] = r.id;
    });

    console.log('Existing Categories in DB:', catMap);

    let totalProductsAdded = 0;
    let totalVariantsAdded = 0;
    let totalImagesAdded = 0;

    for (const [slug, meta] of Object.entries(CATEGORY_MAPPING)) {
      console.log(`\n📦 Crawling category: ${slug}...`);
      const targetCatId = catMap[meta.catName];
      if (!targetCatId) {
        console.warn(`Category '${meta.catName}' not found in DB, skipping ${slug}`);
        continue;
      }

      const res = await fetch(`https://dummyjson.com/products/category/${slug}`);
      if (!res.ok) {
        console.error(`Failed to fetch ${slug}: ${res.statusText}`);
        continue;
      }

      const data = await res.json();
      const products = data.products || [];
      console.log(`Found ${products.length} items for ${slug}`);

      for (const p of products) {
        // Exchange USD to VND approx (e.g., $39.99 -> 850,000 VND rounded)
        const priceVND = Math.round((p.price * 25000) / 10000) * 10000;
        const brand = p.brand || (meta.gender === 'men' ? 'Ananas' : 'Zara');
        const mainImage = p.thumbnail || (p.images && p.images[0]) || '';

        // Check if product with this title already exists
        const checkRes = await client.query('SELECT id FROM public.products WHERE name = $1 LIMIT 1', [p.title]);
        let productId;

        if (checkRes.rows.length === 0) {
          const insertRes = await client.query(
            `
            INSERT INTO public.products (name, description, price, image_url, category_id, stock_quantity, sku, is_active, gender, brand)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
          `,
            [
              p.title,
              p.description,
              priceVND,
              mainImage,
              targetCatId,
              p.stock || 50,
              p.sku || `PROD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              true,
              meta.gender,
              brand,
            ]
          );
          productId = insertRes.rows[0].id;
          totalProductsAdded++;
        } else {
          productId = checkRes.rows[0].id;
        }

        // Add gallery images if available
        if (Array.isArray(p.images) && p.images.length > 0) {
          for (let idx = 0; idx < p.images.length; idx++) {
            const imgUrl = p.images[idx];
            await client.query(
              `
              INSERT INTO public.product_images (product_id, image_url, display_order, is_thumbnail)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT DO NOTHING
            `,
              [productId, imgUrl, idx, idx === 0]
            );
            totalImagesAdded++;
          }
        }

        // Create 2-3 realistic variants per product (size x color)
        const chosenColors = COLOR_PALETTE.slice(0, 2);
        for (const col of chosenColors) {
          for (const sz of meta.defaultSizes) {
            const variantSku = `${p.id}-${sz}-${col.color}`.replace(/\s+/g, '-');
            const vStock = Math.floor(Math.random() * 25) + 10; // 10-35 items per size
            await client.query(
              `
              INSERT INTO public.product_variants (product_id, size, color, color_code, sku, stock_quantity, is_active)
              VALUES ($1, $2, $3, $4, $5, $6, true)
              ON CONFLICT (product_id, size, color) DO UPDATE SET
                stock_quantity = EXCLUDED.stock_quantity,
                updated_at = NOW()
            `,
              [productId, sz, col.color, col.code, variantSku, vStock]
            );
            totalVariantsAdded++;
          }
        }
      }
    }

    console.log('\n=============================================');
    console.log(`✅ CRAWL & SEED HOÀN TẤT THÀNH CÔNG!`);
    console.log(`- Tổng sản phẩm mới bổ sung: ${totalProductsAdded}`);
    console.log(`- Tổng biến thể (Size/Màu) đã tạo: ${totalVariantsAdded}`);
    console.log(`- Tổng ảnh gallery chi tiết đã nạp: ${totalImagesAdded}`);
    console.log('=============================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Crawl error:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

crawlAndSeed();
