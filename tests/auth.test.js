process.env.JWT_SECRET = 'test_jwt_secret_key_1234567890_abcdef';
process.env.JWT_EXPIRES_IN = '1h';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const db = require('../src/config/db');

// Mock database query method
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  pool: {
    query: jest.fn(),
    on: jest.fn(),
    end: jest.fn(),
  },
}));

describe('Auth Endpoints & Middlewares', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should validate missing or invalid fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: '', email: 'not-an-email', password: '123' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should reject registration if email is already registered', async () => {
      // UserModel.findByEmail query mock
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'duplicate@example.com' }],
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Existing User',
          email: 'duplicate@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already registered/i);
    });

    it('should register a new user successfully with hashed password and assign default "user" role', async () => {
      // 1. UserModel.findByEmail -> null
      db.query.mockResolvedValueOnce({ rows: [] });
      // 2. RoleModel.findByName('user') -> returns role
      db.query.mockResolvedValueOnce({
        rows: [{ id: 3, name: 'user', description: 'Regular user' }],
      });
      // 3. UserModel.create -> returns created user
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            name: 'New Tester',
            email: 'newuser@example.com',
            role_id: 3,
            created_at: new Date().toISOString(),
          },
        ],
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New Tester',
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('newuser@example.com');
      expect(res.body.data.user.role).toBe('user');
      expect(res.body.data.token).toBeDefined();

      // Verify that the password stored in DB call was hashed and not plaintext
      const createCall = db.query.mock.calls[2];
      const insertedPasswordHash = createCall[1][2];
      expect(insertedPasswordHash).not.toBe('SecurePassword123!');
      expect(await bcrypt.compare('SecurePassword123!', insertedPasswordHash)).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should reject login if email does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unknown@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid email or password/i);
    });

    it('should reject login with incorrect password', async () => {
      const realPasswordHash = await bcrypt.hash('CorrectPassword!', 10);
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            name: 'Test User',
            email: 'test@example.com',
            password_hash: realPasswordHash,
            role_name: 'user',
          },
        ],
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid email or password/i);
    });

    it('should log in successfully with valid credentials and return JWT', async () => {
      const password = 'CorrectPassword123!';
      const hash = await bcrypt.hash(password, 10);

      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Admin User',
            email: 'admin@example.com',
            password_hash: hash,
            role_name: 'admin',
            created_at: new Date().toISOString(),
          },
        ],
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: password,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('admin');

      // Verify token decoded claims
      const decoded = jwt.verify(res.body.data.token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(1);
      expect(decoded.role).toBe('admin');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('Authorization header missing');
    });

    it('should return 403 when JWT token is invalid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.value');
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('Invalid token');
    });

    it('should return 401 when JWT token has expired', async () => {
      const expiredToken = jwt.sign(
        { id: 1, role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('Token has expired');
    });

    it('should return user profile for a valid token', async () => {
      const validToken = jwt.sign(
        { id: 5, role: 'manager' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 5,
            name: 'Manager Person',
            email: 'manager@example.com',
            role_id: 2,
            role_name: 'manager',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('manager@example.com');
      expect(res.body.data.role).toBe('manager');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 and inform user of stateless token termination', async () => {
      const validToken = jwt.sign(
        { id: 1, role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.note).toContain('stateless');
    });
  });
});
