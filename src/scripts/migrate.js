require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function runMigration() {
  const migrationFilePath = path.join(__dirname, '../../001_initial_product_management.sql');
  console.log('Running migration from:', migrationFilePath);

  if (!fs.existsSync(migrationFilePath)) {
    console.error('Migration file not found at:', migrationFilePath);
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is missing.');
    console.error('Please configure DATABASE_URL in your environment or .env file.');
    process.exit(1);
  }

  try {
    const sql = fs.readFileSync(migrationFilePath, 'utf8');
    console.log('Executing SQL migration script on database...');
    await pool.query(sql);
    console.log('Migration executed successfully! Tables and initial roles created.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
