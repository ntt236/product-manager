const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const RoleModel = require('../models/roleModel');

const BCRYPT_SALT_ROUNDS = 10;

class AuthService {
  static async register({ name, email, password }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(normalizedEmail);
    if (existingUser) {
      const err = new Error('Email is already registered');
      err.statusCode = 409;
      throw err;
    }

    // Default role assignment is ALWAYS 'user' on the server
    const defaultRole = await RoleModel.findByName('user');
    if (!defaultRole) {
      const err = new Error('Default role configuration error. "user" role not found.');
      err.statusCode = 500;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const newUser = await UserModel.create({
      name,
      email: normalizedEmail,
      passwordHash,
      roleId: defaultRole.id,
    });

    // Generate JWT token
    const token = this.generateToken({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: defaultRole.name,
    });

    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: defaultRole.name,
        created_at: newUser.created_at,
      },
      token,
    };
  }

  static async login({ email, password }) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await UserModel.findByEmail(normalizedEmail);
    if (!user) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const token = this.generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role_name,
        created_at: user.created_at,
      },
      token,
    };
  }

  static async getCurrentUser(userId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  static generateToken(payload) {
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';

    if (!secret) {
      throw new Error('JWT_SECRET environment variable is missing');
    }

    return jwt.sign(payload, secret, { expiresIn });
  }
}

module.exports = AuthService;
