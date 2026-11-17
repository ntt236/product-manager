const pool = require('../config/db');

class ProductModel {
  static async create({ name, description, price, imageUrl, categoryId, createdBy, stockQuantity = 0, sku = null, isActive = true, gender = 'unisex', brand = null }) {
    const query = `
      INSERT INTO public.products (name, description, price, image_url, category_id, created_by, stock_quantity, sku, is_active, gender, brand)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [name, description || null, price, imageUrl || null, categoryId, createdBy || null, stockQuantity, sku || null, isActive, gender, brand || null];
    const res = await pool.query(query, values);
    return res.rows[0];
  }

  static async findById(id, includeRelations = false) {
    const query = `
      SELECT p.id, p.name, p.description, p.price, p.image_url, p.category_id, p.created_by,
             p.stock_quantity, p.sku, p.is_active, p.gender, p.brand,
             p.created_at, p.updated_at,
             c.name AS category_name,
             u.name AS creator_name, u.email AS creator_email
      FROM public.products p
      JOIN public.categories c ON p.category_id = c.id
      LEFT JOIN public.users u ON p.created_by = u.id
      WHERE p.id = $1
      LIMIT 1
    `;
    const res = await pool.query(query, [id]);
    const product = res.rows[0] || null;
    if (!product || !includeRelations) return product;

    // Fetch variants & image gallery if requested
    const [variantsRes, imagesRes] = await Promise.all([
      pool.query('SELECT * FROM public.product_variants WHERE product_id = $1 AND is_active = true ORDER BY id ASC', [id]),
      pool.query('SELECT * FROM public.product_images WHERE product_id = $1 ORDER BY display_order ASC, id ASC', [id]),
    ]);

    return {
      ...product,
      variants: variantsRes ? variantsRes.rows : [],
      images: imagesRes ? imagesRes.rows : [],
    };
  }

  static async findAll({ search, categoryId, gender, size, color, minPrice, maxPrice, sort, isActive = null, inStock = false, limit = 10, offset = 0 }) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`p.name ILIKE $${paramIndex}`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (categoryId) {
      conditions.push(`p.category_id = $${paramIndex}`);
      values.push(categoryId);
      paramIndex++;
    }

    if (gender) {
      conditions.push(`(p.gender = $${paramIndex} OR p.gender = 'unisex')`);
      values.push(gender);
      paramIndex++;
    }

    if (minPrice !== undefined && minPrice !== null) {
      conditions.push(`p.price >= $${paramIndex}`);
      values.push(minPrice);
      paramIndex++;
    }

    if (maxPrice !== undefined && maxPrice !== null) {
      conditions.push(`p.price <= $${paramIndex}`);
      values.push(maxPrice);
      paramIndex++;
    }

    if (isActive !== null) {
      conditions.push(`p.is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }

    if (inStock) {
      conditions.push(`(p.stock_quantity > 0 OR EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.stock_quantity > 0))`);
    }

    // Filter by variant size / color
    if (size) {
      conditions.push(`EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id = p.id AND LOWER(pv.size) = LOWER($${paramIndex}))`);
      values.push(size);
      paramIndex++;
    }

    if (color) {
      conditions.push(`EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id = p.id AND LOWER(pv.color) = LOWER($${paramIndex}))`);
      values.push(color);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting
    let orderBy = 'p.id DESC';
    if (sort === 'price_asc') orderBy = 'p.price ASC';
    else if (sort === 'price_desc') orderBy = 'p.price DESC';
    else if (sort === 'newest') orderBy = 'p.created_at DESC';

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM public.products p
      ${whereClause}
    `;
    const countRes = await pool.query(countQuery, values);
    const total = parseInt(countRes.rows[0].total, 10);

    const query = `
      SELECT p.id, p.name, p.description, p.price, p.image_url, p.category_id, p.created_by,
             p.stock_quantity, p.sku, p.is_active, p.gender, p.brand,
             p.created_at, p.updated_at,
             c.name AS category_name,
             u.name AS creator_name,
             (SELECT COUNT(*) FROM public.product_variants pv WHERE pv.product_id = p.id) AS variant_count,
             (SELECT ARRAY_AGG(DISTINCT pv.size) FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) AS available_sizes,
             (SELECT ARRAY_AGG(DISTINCT pv.color) FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) AS available_colors,
             (SELECT COALESCE(SUM(pv.stock_quantity), 0) FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) AS total_variant_stock
      FROM public.products p
      JOIN public.categories c ON p.category_id = c.id
      LEFT JOIN public.users u ON p.created_by = u.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const res = await pool.query(query, values);
    return {
      products: res.rows,
      total,
    };
  }

  static async update(id, { name, description, price, imageUrl, categoryId, stockQuantity, sku, isActive, gender, brand }) {
    const query = `
      UPDATE public.products
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          image_url = COALESCE($4, image_url),
          category_id = COALESCE($5, category_id),
          stock_quantity = COALESCE($6, stock_quantity),
          sku = COALESCE($7, sku),
          is_active = COALESCE($8, is_active),
          gender = COALESCE($9, gender),
          brand = COALESCE($10, brand),
          updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `;
    const values = [name, description, price, imageUrl, categoryId, stockQuantity, sku, isActive, gender, brand, id];
    const res = await pool.query(query, values);
    return res.rows[0] || null;
  }

  static async delete(id) {
    const query = 'DELETE FROM public.products WHERE id = $1 RETURNING id';
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }
}

module.exports = ProductModel;
