const CartModel = require('../models/cartModel');

class CartController {
  static async getCart(req, res, next) {
    try {
      const cart = await CartModel.getCartDetails(req.user.id);
      return res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addItem(req, res, next) {
    try {
      const { product_id, quantity } = req.body;
      const parsedQty = parseInt(quantity, 10) || 1;
      const item = await CartModel.addItem(req.user.id, product_id, parsedQty);

      const updatedCart = await CartModel.getCartDetails(req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Item added to cart',
        data: updatedCart,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateItem(req, res, next) {
    try {
      const { id } = req.params;
      const { quantity } = req.body;
      const parsedQty = parseInt(quantity, 10);

      await CartModel.updateItemQuantity(req.user.id, id, parsedQty);
      const updatedCart = await CartModel.getCartDetails(req.user.id);

      return res.status(200).json({
        success: true,
        message: 'Cart item updated',
        data: updatedCart,
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeItem(req, res, next) {
    try {
      const { id } = req.params;
      const removed = await CartModel.removeItem(req.user.id, id);
      if (!removed) {
        return res.status(404).json({
          success: false,
          message: 'Cart item not found',
        });
      }

      const updatedCart = await CartModel.getCartDetails(req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Item removed from cart',
        data: updatedCart,
      });
    } catch (error) {
      next(error);
    }
  }

  static async clearCart(req, res, next) {
    try {
      await CartModel.clearCart(req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Cart cleared successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CartController;
