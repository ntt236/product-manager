const VariantModel = require('../models/variantModel');
const ProductModel = require('../models/productModel');

class VariantController {
  static async getVariantsByProduct(req, res, next) {
    try {
      const { productId } = req.params;
      const variants = await VariantModel.findByProductId(productId);
      return res.status(200).json({
        success: true,
        count: variants.length,
        data: variants,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createVariant(req, res, next) {
    try {
      const { productId } = req.params;
      const { size, color, color_code, sku, price_override, stock_quantity, image_url, is_active } = req.body;

      const product = await ProductModel.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      const variant = await VariantModel.create({
        productId,
        size,
        color,
        colorCode: color_code,
        sku,
        priceOverride: price_override,
        stockQuantity: stock_quantity !== undefined ? parseInt(stock_quantity, 10) : 0,
        imageUrl: image_url,
        isActive: is_active !== undefined ? Boolean(is_active) : true,
      });

      return res.status(201).json({
        success: true,
        message: 'Product variant created successfully',
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk creation of variants (e.g. Size matrix: 38, 39, 40, 41, 42 for shoes)
  static async createBulkVariants(req, res, next) {
    try {
      const { productId } = req.params;
      const { variants } = req.body;

      if (!Array.isArray(variants) || variants.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'variants must be a non-empty array of variant objects',
        });
      }

      const product = await ProductModel.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      // Basic validation on items
      for (let i = 0; i < variants.length; i++) {
        const item = variants[i];
        if (!item.size || !item.color) {
          return res.status(400).json({
            success: false,
            message: `Variant at index ${i} is missing required 'size' or 'color'`,
          });
        }
      }

      const results = await VariantModel.createBulk(productId, variants);

      return res.status(201).json({
        success: true,
        message: `Successfully created/updated ${results.length} variants`,
        count: results.length,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateVariant(req, res, next) {
    try {
      const { id } = req.params;
      const { size, color, color_code, sku, price_override, stock_quantity, image_url, is_active } = req.body;

      const updated = await VariantModel.update(id, {
        size,
        color,
        colorCode: color_code,
        sku,
        priceOverride: price_override,
        stockQuantity: stock_quantity !== undefined ? parseInt(stock_quantity, 10) : undefined,
        imageUrl: image_url,
        isActive: is_active !== undefined ? Boolean(is_active) : undefined,
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Product variant updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteVariant(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await VariantModel.delete(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Product variant deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = VariantController;
