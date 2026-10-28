const ProductModel = require('../models/productModel');
const CategoryModel = require('../models/categoryModel');

class ProductController {
  static async getAll(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
      const offset = (page - 1) * limit;
      const search = req.query.search ? req.query.search.trim() : null;
      const categoryId = req.query.category_id ? parseInt(req.query.category_id, 10) : null;

      const { products, total } = await ProductModel.findAll({
        search,
        categoryId,
        limit,
        offset,
      });

      const totalPages = Math.ceil(total / limit) || 1;

      return res.status(200).json({
        success: true,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const product = await ProductModel.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${id} not found`,
        });
      }

      return res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const { name, description, price, image_url, category_id } = req.body;

      // Verify category exists
      const category = await CategoryModel.findById(category_id);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: `Referenced category with ID ${category_id} does not exist`,
        });
      }

      const product = await ProductModel.create({
        name,
        description,
        price,
        imageUrl: image_url,
        categoryId: category_id,
        createdBy: req.user ? req.user.id : null,
      });

      return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, price, image_url, category_id } = req.body;

      const existing = await ProductModel.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${id} not found`,
        });
      }

      if (category_id) {
        const category = await CategoryModel.findById(category_id);
        if (!category) {
          return res.status(400).json({
            success: false,
            message: `Referenced category with ID ${category_id} does not exist`,
          });
        }
      }

      const updated = await ProductModel.update(id, {
        name,
        description,
        price,
        imageUrl: image_url,
        categoryId: category_id,
      });

      return res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const existing = await ProductModel.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${id} not found`,
        });
      }

      await ProductModel.delete(id);
      return res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
        data: { id },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProductController;
