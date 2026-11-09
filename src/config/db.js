require('dotenv').config();
const { Pool } = require('pg');
const { parse } = require('pg-connection-string');

const connectionString = process.env.DATABASE_URL;

let poolConfig = {
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

if (connectionString) {
  const parsed = parse(connectionString);
  poolConfig = {
    ...poolConfig,
    ...parsed,
  };

  // Supabase pooler / hosted PostgreSQL SSL configuration
  if (
    connectionString.includes('sslmode=require') ||
    connectionString.includes('supabase') ||
    process.env.NODE_ENV === 'production'
  ) {
    poolConfig.ssl = {
      rejectUnauthorized: false,
    };
  }
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
