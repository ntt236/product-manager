const express = require('express');
const ProductController = require('../controllers/productController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');
const {
  productCreateValidator,
  productUpdateValidator,
  productQueryValidator,
  idParamValidator,
} = require('../validators');

const router = express.Router();

// Read routes: admin, manager, user can view products
router.get('/', authenticateToken, productQueryValidator, ProductController.getAll);
router.get('/:id', authenticateToken, idParamValidator, ProductController.getById);

// Write routes: admin and manager can create products
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  productCreateValidator,
  ProductController.create
);

// Update routes: admin and manager can update products
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  productUpdateValidator,
  ProductController.update
);

// Delete routes: admin only can delete products
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  idParamValidator,
  ProductController.delete
);

module.exports = router;
