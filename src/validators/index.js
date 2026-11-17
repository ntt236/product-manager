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
    .isString(),
  body('gender')
    .optional()
    .isIn(['men', 'women', 'unisex', 'kids'])
    .withMessage('gender must be: men, women, unisex, kids'),
  body('parent_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('parent_id must be a valid integer ID'),
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
    .isLength({ min: 2, max: 100 }),
  body('description')
    .optional()
    .isString(),
  body('gender')
    .optional()
    .isIn(['men', 'women', 'unisex', 'kids']),
  body('parent_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }),
  validateRequest,
];

const productCreateValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 200 }),
  body('description')
    .optional()
    .isString(),
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
    .isInt({ min: 1 })
    .withMessage('category_id must be a valid positive integer'),
  body('gender')
    .optional()
    .isIn(['men', 'women', 'unisex', 'kids'])
    .withMessage('gender must be: men, women, unisex, kids'),
  body('brand')
    .optional()
    .isString(),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('stock_quantity must be a nonnegative integer'),
  body('sku')
    .optional()
    .isString()
    .isLength({ max: 100 }),
  body('is_active')
    .optional()
    .isBoolean(),
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
    .isLength({ min: 2, max: 200 }),
  body('description')
    .optional()
    .isString(),
  body('price')
    .optional()
    .isFloat({ min: 0 }),
  body('image_url')
    .optional({ checkFalsy: true })
    .isURL(),
  body('category_id')
    .optional()
    .isInt({ min: 1 }),
  body('gender')
    .optional()
    .isIn(['men', 'women', 'unisex', 'kids']),
  body('brand')
    .optional()
    .isString(),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 }),
  body('sku')
    .optional()
    .isString(),
  body('is_active')
    .optional()
    .isBoolean(),
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
    .isInt({ min: 1 }),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }),
  query('category_id')
    .optional()
    .isInt({ min: 1 }),
  query('gender')
    .optional()
    .isIn(['men', 'women', 'unisex', 'kids']),
  query('in_stock')
    .optional()
    .isBoolean(),
  query('min_price')
    .optional()
    .isFloat({ min: 0 }),
  query('max_price')
    .optional()
    .isFloat({ min: 0 }),
  query('sort')
    .optional()
    .isIn(['price_asc', 'price_desc', 'newest']),
  validateRequest,
];

// Variant Validators
const variantCreateValidator = [
  param('productId')
    .isInt({ min: 1 })
    .withMessage('Valid productId required in URL'),
  body('size')
    .trim()
    .notEmpty()
    .withMessage('size is required (e.g., S, M, L, XL, 39, 40, 41)'),
  body('color')
    .trim()
    .notEmpty()
    .withMessage('color is required (e.g., Đen, Trắng, Be)'),
  body('color_code')
    .optional()
    .isString(),
  body('price_override')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('price_override must be a nonnegative number'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('stock_quantity must be a nonnegative integer'),
  body('sku')
    .optional()
    .isString(),
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
  body('variant_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('variant_id must be a positive integer'),
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
  variantCreateValidator,
  addressCreateValidator,
  cartItemValidator,
  cartItemUpdateValidator,
  checkoutValidator,
  orderStatusValidator,
  reviewCreateValidator,
};
