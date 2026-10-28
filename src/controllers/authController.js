const AuthService = require('../services/authService');

class AuthController {
  static async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const result = await AuthService.register({ name, email, password });

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login({ email, password });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req, res, next) {
    try {
      const user = await AuthService.getCurrentUser(req.user.id);
      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res) {
    // Explanation of stateless JWT logout design:
    // With stateless JWTs, tokens are validated cryptographically without database lookup.
    // Client-side token removal (e.g., from localStorage/cookies) terminates the session on the client.
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully. Please remove the access token from client storage.',
      note: 'Tokens are stateless. Client-side token deletion is required to complete session termination.',
    });
  }
}

module.exports = AuthController;
