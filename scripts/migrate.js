#!/usr/bin/env node

/**
 * Database Migration Script
 * Runs SQL migrations on IBM Databases for PostgreSQL
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runMigration() {
  log('🚀 Starting database migration...', 'blue');

  // Check environment variables
  if (!process.env.IBM_DB_CONNECTION_STRING) {
    log('❌ Error: IBM_DB_CONNECTION_STRING not set', 'red');
    log('Please set the environment variable and try again.', 'yellow');
    process.exit(1);
  }

  // Create database pool
  const pool = new Pool({
    connectionString: process.env.IBM_DB_CONNECTION_STRING,
    ssl: process.env.IBM_DB_CA_CERT
      ? {
          rejectUnauthorized: true,
          ca: Buffer.from(process.env.IBM_DB_CA_CERT, 'base64').toString('utf-8'),
        }
      : { rejectUnauthorized: false },
  });

  let client;

  try {
    // Connect to database
    log('📡 Connecting to database...', 'blue');
    client = await pool.connect();
    log('✅ Connected successfully!', 'green');

    // Read migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260503000000_ibm_migration.sql');
    log(`📄 Reading migration file: ${migrationPath}`, 'blue');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Run migration
    log('⚙️  Running migration...', 'blue');
    await client.query(migrationSQL);
    log('✅ Migration completed successfully!', 'green');

    // Verify tables
    log('🔍 Verifying tables...', 'blue');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    log('\n📊 Created tables:', 'green');
    result.rows.forEach(row => {
      log(`  ✓ ${row.table_name}`, 'green');
    });

    log('\n🎉 Database migration complete!', 'green');
    log('\nNext steps:', 'yellow');
    log('  1. Run: npm run db:init-admin', 'yellow');
    log('  2. Set ADMIN_PASSWORD in .env', 'yellow');
    log('  3. Deploy application', 'yellow');

  } catch (error) {
    log('\n❌ Migration failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    
    if (error.code) {
      log(`Error code: ${error.code}`, 'red');
    }
    
    if (error.detail) {
      log(`Detail: ${error.detail}`, 'red');
    }

    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run migration
runMigration().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});

// Made with Bob
