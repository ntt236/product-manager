const express = require('express');
const CartController = require('../controllers/cartController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { cartItemValidator, cartItemUpdateValidator, idParamValidator } = require('../validators');

const router = express.Router();

// Cart operations for the authenticated user
router.get('/', authenticateToken, CartController.getCart);
router.post('/items', authenticateToken, cartItemValidator, CartController.addItem);
router.put('/items/:id', authenticateToken, cartItemUpdateValidator, CartController.updateItem);
router.delete('/items/:id', authenticateToken, idParamValidator, CartController.removeItem);
router.delete('/', authenticateToken, CartController.clearCart);

module.exports = router;
