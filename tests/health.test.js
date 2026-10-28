const request = require('supertest');
const app = require('../src/app');

describe('Health and Root API Endpoints', () => {
  it('GET /health should return 200 with healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
    // Ensure no sensitive database credentials are exposed
    expect(res.body).not.toHaveProperty('database_url');
    expect(res.body).not.toHaveProperty('jwt_secret');
  });

  it('GET / should return 200 with API overview', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('name', 'Product Management System API');
    expect(res.body).toHaveProperty('endpoints');
  });

  it('GET /api/nonexistent should return 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.message).toContain('not found');
  });
});
