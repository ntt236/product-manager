require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

let poolConfig = {
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Supabase and hosted PostgreSQL require SSL
// If DATABASE_URL indicates sslmode or is in production, enable standard SSL config
if (connectionString && (connectionString.includes('sslmode=require') || connectionString.includes('supabase') || process.env.NODE_ENV === 'production')) {
  poolConfig.ssl = {
    rejectUnauthorized: false, // Standard for cloud pg pooler connections without dedicated CA bundle
  };
}

const pool = new Pool(poolConfig);

// Handle unexpected idle client errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
