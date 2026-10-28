const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 3000;

// Test DB connectivity on startup (non-blocking)
if (process.env.DATABASE_URL) {
  pool
    .query('SELECT NOW()')
    .then(() => {
      console.log('Successfully connected to PostgreSQL database');
    })
    .catch((err) => {
      console.warn('Database connection warning on startup:', err.message);
      console.warn('Please verify DATABASE_URL in environment configuration.');
    });
} else {
  console.warn('Warning: DATABASE_URL is not set. Database operations will fail until configured.');
}

const server = app.listen(PORT, () => {
  console.log(`Product Management Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Received shutdown signal, terminating server gracefully...');
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await pool.end();
      console.log('Database pool closed.');
    } catch (err) {
      console.error('Error closing database pool:', err.message);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = server;
