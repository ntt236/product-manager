const express = require('express');
const CategoryController = require('../controllers/categoryController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');
const {
  categoryCreateValidator,
  categoryUpdateValidator,
  idParamValidator,
} = require('../validators');

const router = express.Router();

// Public / Authenticated read routes: all authenticated users (admin, manager, user) can view categories
router.get('/', authenticateToken, CategoryController.getAll);
router.get('/:id', authenticateToken, idParamValidator, CategoryController.getById);

// Write routes: admin and manager can create/update; admin can delete
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  categoryCreateValidator,
  CategoryController.create
);

router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'manager'),
  categoryUpdateValidator,
  CategoryController.update
);

router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  idParamValidator,
  CategoryController.delete
);

module.exports = router;
