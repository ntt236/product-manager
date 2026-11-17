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

describe('E-Commerce Core (Cart, Address, Order Checkout)', () => {
  let userToken;
  let adminToken;
  let mockClient;

  beforeAll(() => {
    userToken = jwt.sign({ id: 10, name: 'Customer One', role: 'user' }, process.env.JWT_SECRET);
    adminToken = jwt.sign({ id: 1, name: 'Admin One', role: 'admin' }, process.env.JWT_SECRET);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    db.getClient.mockResolvedValue(mockClient);
  });

  describe('Shipping Addresses', () => {
    it('GET /api/addresses - returns list of user addresses', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            receiver_name: 'Nguyen Van A',
            phone: '0901234567',
            street_address: '123 Le Loi',
            district: 'District 1',
            province: 'Ho Chi Minh',
            is_default: true,
          },
        ],
      });

      const res = await request(app)
        .get('/api/addresses')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].receiver_name).toBe('Nguyen Van A');
    });

    it('POST /api/addresses - creates address and sets default', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // count
        .mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              user_id: 10,
              receiver_name: 'Tran Thi B',
              phone: '0912345678',
              street_address: '456 Tran Hung Dao',
              district: 'District 5',
              province: 'Ho Chi Minh',
              is_default: true,
            },
          ],
        })
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .post('/api/addresses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          receiver_name: 'Tran Thi B',
          phone: '0912345678',
          street_address: '456 Tran Hung Dao',
          district: 'District 5',
          province: 'Ho Chi Minh',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receiver_name).toBe('Tran Thi B');
    });
  });

  describe('Cart Management', () => {
    it('GET /api/cart - retrieves user cart with items & total', async () => {
      // 1. getOrCreateCart
      db.query.mockResolvedValueOnce({ rows: [{ id: 100, user_id: 10 }] });
      // 2. getCartDetails items
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            cart_id: 100,
            product_id: 5,
            variant_id: null,
            quantity: 2,
            product_name: 'Wireless Mouse',
            unit_price: '25.00',
            available_stock: 10,
            is_active: true,
            subtotal: '50.00',
          },
        ],
      });

      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalItems).toBe(2);
      expect(res.body.data.totalAmount).toBe(50);
    });

    it('POST /api/cart/items - prevents adding items exceeding available stock', async () => {
      // getOrCreateCart
      db.query.mockResolvedValueOnce({ rows: [{ id: 100, user_id: 10 }] });
      // product query (stock is only 3)
      db.query.mockResolvedValueOnce({
        rows: [{ id: 5, name: 'Limited Item', price: '100.00', stock_quantity: 3, is_active: true }],
      });
      // existing item query
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ product_id: 5, quantity: 10 });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/exceeds available stock/i);
    });
  });

  describe('Order & Checkout Flow', () => {
    it('POST /api/orders/checkout - successfully places order, locks inventory, and empties cart', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              receiver_name: 'Nguyen Van A',
              phone: '0901234567',
              street_address: '123 Le Loi',
              district: 'District 1',
              province: 'HCM',
            },
          ],
        }) // address check
        .mockResolvedValueOnce({ rows: [{ id: 100 }] }) // cart check
        .mockResolvedValueOnce({
          rows: [
            {
              item_id: 1,
              product_id: 2,
              variant_id: null,
              quantity: 2,
              product_name: 'Pro Keyboard',
              product_price: '80.00',
              product_stock: 15,
              product_is_active: true,
              size: null,
              color: null,
              price_override: null,
              variant_stock: null,
              variant_is_active: null,
            },
          ],
        }) // cart items with FOR UPDATE
        .mockResolvedValueOnce({
          rows: [
            {
              id: 50,
              order_code: 'ORD-TEST-123',
              user_id: 10,
              total_amount: '160.00',
              status: 'pending',
            },
          ],
        }) // insert order
        .mockResolvedValueOnce({}) // insert order_items
        .mockResolvedValueOnce({}) // update stock
        .mockResolvedValueOnce({}) // delete cart items
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ shipping_address_id: 1, note: 'Deliver in afternoon' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order_code).toBe('ORD-TEST-123');
      expect(res.body.data.total_amount).toBe('160.00');
    });

    it('PATCH /api/orders/:id/status - regular user is FORBIDDEN, admin can update status', async () => {
      // User attempt -> 403
      const resUser = await request(app)
        .patch('/api/orders/50/status')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'confirmed' });

      expect(resUser.statusCode).toBe(403);

      // Admin attempt -> 200
      db.query.mockResolvedValueOnce({
        rows: [{ id: 50, status: 'confirmed' }],
      });

      const resAdmin = await request(app)
        .patch('/api/orders/50/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' });

      expect(resAdmin.statusCode).toBe(200);
      expect(resAdmin.body.data.status).toBe('confirmed');
    });

    it('PUT /api/orders/:id/cancel - cancels order and refunds stock', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 50, user_id: 10, status: 'pending' }],
        }) // find order
        .mockResolvedValueOnce({}) // update status to cancelled
        .mockResolvedValueOnce({
          rows: [{ product_id: 2, variant_id: null, quantity: 2 }],
        }) // find order items
        .mockResolvedValueOnce({}) // refund stock
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .put('/api/orders/50/cancel')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/stock refunded/i);
    });
  });
});
