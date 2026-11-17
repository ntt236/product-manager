const express = require('express');
const ProductController = require('../controllers/productController');
const VariantController = require('../controllers/variantController');
const ReviewController = require('../controllers/reviewController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');
const {
  productCreateValidator,
  productUpdateValidator,
  productQueryValidator,
  variantCreateValidator,
  idParamValidator,
  reviewCreateValidator,
} = require('../validators');

const router = express.Router();

// Read routes: public or authenticated can view products
router.get('/', productQueryValidator, ProductController.getAll);
router.get('/:id', idParamValidator, ProductController.getById);

// Product Variants
router.get('/:productId/variants', VariantController.getVariantsByProduct);
router.post(
  '/:productId/variants',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  variantCreateValidator,
  VariantController.createVariant
);
router.put(
  '/variants/:id',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  idParamValidator,
  VariantController.updateVariant
);
router.delete(
  '/variants/:id',
  authenticateToken,
  authorizeRoles('admin'),
  idParamValidator,
  VariantController.deleteVariant
);

// Reviews on products
router.get('/:id/reviews', idParamValidator, ReviewController.getProductReviews);
router.post('/:id/reviews', authenticateToken, reviewCreateValidator, ReviewController.createReview);

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
