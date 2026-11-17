const express = require('express');
const OrderController = require('../controllers/orderController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { checkoutValidator, orderStatusValidator, idParamValidator } = require('../validators');

const router = express.Router();

// Customer actions
router.post('/checkout', authenticateToken, checkoutValidator, OrderController.checkout);
router.get('/my-orders', authenticateToken, OrderController.getMyOrders);
router.get('/:id', authenticateToken, idParamValidator, OrderController.getOrderById);
router.put('/:id/cancel', authenticateToken, idParamValidator, OrderController.cancelMyOrder);

// Admin & Manager actions: manage and update all orders
router.get('/', authenticateToken, authorizeRoles('admin', 'manager'), OrderController.getAllOrdersAdmin);
router.patch('/:id/status', authenticateToken, authorizeRoles('admin', 'manager'), orderStatusValidator, OrderController.updateOrderStatus);

module.exports = router;
