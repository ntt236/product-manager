const OrderModel = require('../models/orderModel');

class OrderController {
  static async checkout(req, res, next) {
    try {
      const { shipping_address_id, note } = req.body;
      const order = await OrderModel.createOrder({
        userId: req.user.id,
        shippingAddressId: shipping_address_id,
        note,
      });

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyOrders(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
      const status = req.query.status || null;

      const { orders, total } = await OrderModel.findAll({
        userId: req.user.id,
        status,
        page,
        limit,
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
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const isAdminOrManager = ['admin', 'manager'].includes(req.user.role);
      const order = await OrderModel.findById(id, isAdminOrManager ? null : req.user.id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelMyOrder(req, res, next) {
    try {
      const { id } = req.params;
      const result = await OrderModel.cancelOrder(id, req.user.id);
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin & Manager: View all orders across system
  static async getAllOrdersAdmin(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
      const status = req.query.status || null;
      const userId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;

      const { orders, total } = await OrderModel.findAll({
        userId,
        status,
        page,
        limit,
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
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin & Manager: Update order status (confirmed, shipping, delivered, cancelled)
  static async updateOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updated = await OrderModel.updateStatus(id, status);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: `Order status updated to '${status}'`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OrderController;
