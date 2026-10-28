const CategoryModel = require('../models/categoryModel');

class CategoryController {
  static async getAll(req, res, next) {
    try {
      const categories = await CategoryModel.findAll();
      return res.status(200).json({
        success: true,
        count: categories.length,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const category = await CategoryModel.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: `Category with ID ${id} not found`,
        });
      }

      return res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const { name, description } = req.body;
      const existing = await CategoryModel.findByName(name);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Category with name '${name}' already exists`,
        });
      }

      const newCategory = await CategoryModel.create({ name, description });
      return res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: newCategory,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const existing = await CategoryModel.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: `Category with ID ${id} not found`,
        });
      }

      if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicate = await CategoryModel.findByName(name);
        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: `Category with name '${name}' already exists`,
          });
        }
      }

      const updated = await CategoryModel.update(id, { name, description });
      return res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const existing = await CategoryModel.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: `Category with ID ${id} not found`,
        });
      }

      await CategoryModel.delete(id);
      return res.status(200).json({
        success: true,
        message: 'Category deleted successfully',
        data: { id },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CategoryController;
