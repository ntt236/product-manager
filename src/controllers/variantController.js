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
