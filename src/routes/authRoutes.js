const express = require('express');
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { registerValidator, loginValidator } = require('../validators');

const router = express.Router();

// Rate limiting for auth endpoints (brute force protection)
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, registerValidator, AuthController.register);
router.post('/login', authLimiter, loginValidator, AuthController.login);
router.get('/me', authenticateToken, AuthController.me);
router.post('/logout', authenticateToken, AuthController.logout);

module.exports = router;
