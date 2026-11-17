require('dotenv').config({ path: 'D:/product-manager/.env' });
const pool = require('D:/product-manager/src/config/db');

function resolveColor(name) {
  if (!name) return '#000000';
  const c = name.toLowerCase().trim();
  if (c.includes('vàng') || c.includes('yellow') || c.includes('gold')) return '#FACC15';
  if (c.includes('đỏ') || c.includes('red') || c.includes('burgundy')) return '#EF4444';
  if (c.includes('cam') || c.includes('orange')) return '#F97316';
  if (c.includes('hồng') || c.includes('pink') || c.includes('rose')) return '#F472B6';
  if (c.includes('tím') || c.includes('purple') || c.includes('violet')) return '#A855F7';
  if (c.includes('xanh lá') || c.includes('xanh lục') || c.includes('green') || c.includes('olive')) return '#22C55E';
  if (c.includes('xanh dương') || c.includes('xanh biển') || c.includes('xanh lam') || c.includes('blue') || c.includes('navy')) return '#2563EB';
  if (c.includes('nâu') || c.includes('brown')) return '#78350F';
  if (c.includes('be') || c.includes('beige')) return '#F5F5DC';
  if (c.includes('kem') || c.includes('cream')) return '#FFFDD0';
  if (c.includes('trắng') || c.includes('white')) return '#FFFFFF';
  if (c.includes('đen') || c.includes('black')) return '#171717';
  if (c.includes('xám') || c.includes('ghi') || c.includes('grey') || c.includes('gray')) return '#737373';
  return '#737373';
}

async function fixColors() {
  try {
    const allVars = await pool.query("SELECT id, product_id, size, color, color_code FROM public.product_variants");
    console.log('Total variants:', allVars.rows.length);

    for (const v of allVars.rows) {
      const isBlackMismatch = (v.color_code === '#000000' || !v.color_code) &&
        !v.color.toLowerCase().includes('đen') &&
        !v.color.toLowerCase().includes('black');

      if (isBlackMismatch) {
        const correctCode = resolveColor(v.color);
        await pool.query("UPDATE public.product_variants SET color_code = $1 WHERE id = $2", [correctCode, v.id]);
        console.log(`Updated variant #${v.id} (${v.color}) from ${v.color_code} -> ${correctCode}`);
      }
    }

    const updated = await pool.query("SELECT id, product_id, size, color, color_code FROM public.product_variants ORDER BY id");
    console.log('All variants now:', updated.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixColors();

