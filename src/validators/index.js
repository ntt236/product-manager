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
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('stock_quantity must be a nonnegative integer'),
  body('sku')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('sku must not exceed 100 characters'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
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
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('stock_quantity must be a nonnegative integer'),
  body('sku')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('sku must not exceed 100 characters'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
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
  query('in_stock')
    .optional()
    .isBoolean()
    .withMessage('in_stock must be a boolean string'),
  validateRequest,
];

// Address validators
const addressCreateValidator = [
  body('receiver_name')
    .trim()
    .notEmpty()
    .withMessage('Receiver name is required')
    .isLength({ min: 2, max: 100 }),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 8, max: 20 }),
  body('street_address')
    .trim()
    .notEmpty()
    .withMessage('Street address is required'),
  body('district')
    .trim()
    .notEmpty()
    .withMessage('District is required'),
  body('province')
    .trim()
    .notEmpty()
    .withMessage('Province/City is required'),
  validateRequest,
];

// Cart validators
const cartItemValidator = [
  body('product_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('product_id must be a valid positive integer'),
  body('quantity')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('quantity must be at least 1'),
  validateRequest,
];

const cartItemUpdateValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid cart item ID is required'),
  body('quantity')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('quantity must be at least 1'),
  validateRequest,
];

// Checkout validators
const checkoutValidator = [
  body('shipping_address_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('shipping_address_id is required'),
  body('note')
    .optional()
    .isString(),
  validateRequest,
];

const orderStatusValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid order ID is required'),
  body('status')
    .notEmpty()
    .isIn(['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled'])
    .withMessage('Valid status required: pending, confirmed, processing, shipping, delivered, cancelled'),
  validateRequest,
];

// Review validators
const reviewCreateValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid product ID is required'),
  body('rating')
    .notEmpty()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),
  body('comment')
    .optional()
    .isString(),
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
  addressCreateValidator,
  cartItemValidator,
  cartItemUpdateValidator,
  checkoutValidator,
  orderStatusValidator,
  reviewCreateValidator,
};
