const { body, param, query } = require('express-validator');
const validateRequest = require('../middlewares/validateRequest');

const registerValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Valid email format is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  validateRequest,
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validateRequest,
];

const categoryCreateValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  validateRequest,
];

const categoryUpdateValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid numeric category ID is required'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  validateRequest,
];

const productCreateValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a nonnegative number'),
  body('image_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('image_url must be a valid URL'),
  body('category_id')
    .notEmpty()
    .withMessage('category_id is required')
    .isInt({ min: 1 })
    .withMessage('category_id must be a valid positive integer'),
  validateRequest,
];

const productUpdateValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid numeric product ID is required'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product name cannot be empty')
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a nonnegative number'),
  body('image_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('image_url must be a valid URL'),
  body('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('category_id must be a valid positive integer'),
  validateRequest,
];

const idParamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid numeric ID parameter is required'),
  validateRequest,
];

const productQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('category_id must be a positive integer'),
  validateRequest,
];

module.exports = {
  registerValidator,
  loginValidator,
  categoryCreateValidator,
  categoryUpdateValidator,
  productCreateValidator,
  productUpdateValidator,
  idParamValidator,
  productQueryValidator,
};
