process.env.JWT_SECRET = 'test_jwt_secret_key_1234567890_abcdef';
process.env.JWT_EXPIRES_IN = '1h';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const db = require('../src/config/db');

jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  pool: {
    query: jest.fn(),
    on: jest.fn(),
    end: jest.fn(),
  },
}));

describe('Categories and Products RBAC & CRUD Endpoints', () => {
  let adminToken;
  let managerToken;
  let userToken;

  beforeAll(() => {
    adminToken = jwt.sign({ id: 1, name: 'Admin', role: 'admin' }, process.env.JWT_SECRET);
    managerToken = jwt.sign({ id: 2, name: 'Manager', role: 'manager' }, process.env.JWT_SECRET);
    userToken = jwt.sign({ id: 3, name: 'Regular User', role: 'user' }, process.env.JWT_SECRET);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Categories API & Permissions', () => {
    it('GET /api/categories - all authenticated roles can view', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Electronics', description: 'Tech items' },
          { id: 2, name: 'Books', description: 'Books and media' },
        ],
      });

      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
    });

    it('POST /api/categories - user role is FORBIDDEN (403)', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Furniture' });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('POST /api/categories - manager or admin role is allowed', async () => {
      // 1. CategoryModel.findByName -> null (no duplicate)
      db.query.mockResolvedValueOnce({ rows: [] });
      // 2. CategoryModel.create -> created category
      db.query.mockResolvedValueOnce({
        rows: [{ id: 3, name: 'Furniture', description: 'Office desks' }],
      });

      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Furniture', description: 'Office desks' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Furniture');
    });

    it('DELETE /api/categories/:id - manager is FORBIDDEN, admin is allowed', async () => {
      // Manager attempts delete -> 403
      const resManager = await request(app)
        .delete('/api/categories/1')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(resManager.statusCode).toBe(403);

      // Admin attempts delete -> allowed
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Electronics' }], // findById
      });
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1 }], // delete
      });

      const resAdmin = await request(app)
        .delete('/api/categories/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resAdmin.statusCode).toBe(200);
      expect(resAdmin.body.success).toBe(true);
    });
  });

  describe('Products API & Permissions', () => {
    it('GET /api/products - supports pagination and search', async () => {
      // Mock count query
      db.query.mockResolvedValueOnce({ rows: [{ total: '1' }] });
      // Mock data query
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Headphones',
            price: '99.99',
            category_id: 1,
            category_name: 'Electronics',
          },
        ],
      });

      const res = await request(app)
        .get('/api/products?page=1&limit=10&search=head')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination.total).toBe(1);
      expect(res.body.data[0].name).toBe('Headphones');
    });

    it('POST /api/products - validates negative price and rejects 400', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Price Product',
          price: -10,
          category_id: 1,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body.errors)).toContain('nonnegative');
    });

    it('POST /api/products - user role is FORBIDDEN (403)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Gaming Mouse',
          price: 49.99,
          category_id: 1,
        });

      expect(res.statusCode).toBe(403);
    });

    it('POST /api/products - manager can create product', async () => {
      // Category check -> exists
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Electronics' }],
      });
      // Product insert
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 20,
            name: 'Gaming Mouse',
            price: '49.99',
            category_id: 1,
            created_by: 2,
          },
        ],
      });

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Gaming Mouse',
          price: 49.99,
          category_id: 1,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Gaming Mouse');
    });

    it('PUT /api/products/:id - manager can update product', async () => {
      // Product exists check
      db.query.mockResolvedValueOnce({
        rows: [{ id: 20, name: 'Gaming Mouse' }],
      });
      // Product update
      db.query.mockResolvedValueOnce({
        rows: [{ id: 20, name: 'Gaming Mouse Pro', price: '59.99' }],
      });

      const res = await request(app)
        .put('/api/products/20')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Gaming Mouse Pro',
          price: 59.99,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Gaming Mouse Pro');
    });

    it('DELETE /api/products/:id - manager is FORBIDDEN (403), admin is ALLOWED (200)', async () => {
      // Manager attempts delete
      const resManager = await request(app)
        .delete('/api/products/20')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(resManager.statusCode).toBe(403);

      // Admin attempts delete
      db.query.mockResolvedValueOnce({
        rows: [{ id: 20, name: 'Gaming Mouse Pro' }],
      });
      db.query.mockResolvedValueOnce({
        rows: [{ id: 20 }],
      });

      const resAdmin = await request(app)
        .delete('/api/products/20')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resAdmin.statusCode).toBe(200);
      expect(resAdmin.body.success).toBe(true);
    });

    it('GET /api/products/:id - returns 404 for nonexistent product', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/products/999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('not found');
    });
  });
});
