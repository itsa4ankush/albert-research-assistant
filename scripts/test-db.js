#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests connection to IBM Databases for PostgreSQL
 */

import pg from 'pg';

const { Pool } = pg;

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

async function testConnection() {
  log('🧪 Database Connection Test', 'blue');
  log('═══════════════════════════════════════', 'blue');

  // Check environment variables
  if (!process.env.IBM_DB_CONNECTION_STRING) {
    log('\n❌ Error: IBM_DB_CONNECTION_STRING not set', 'red');
    log('Please set the environment variable and try again.', 'yellow');
    process.exit(1);
  }

  log('\n📋 Configuration:', 'blue');
  log(`  Connection String: ${process.env.IBM_DB_CONNECTION_STRING.replace(/:[^:@]+@/, ':****@')}`, 'blue');
  log(`  SSL Certificate: ${process.env.IBM_DB_CA_CERT ? 'Provided' : 'Not provided'}`, 'blue');

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
    // Test connection
    log('\n📡 Connecting to database...', 'blue');
    const startTime = Date.now();
    client = await pool.connect();
    const connectionTime = Date.now() - startTime;
    log(`✅ Connected successfully! (${connectionTime}ms)`, 'green');

    // Test query
    log('\n🔍 Running test query...', 'blue');
    const result = await client.query('SELECT version(), current_database(), current_user');
    const dbInfo = result.rows[0];

    log('\n📊 Database Information:', 'green');
    log(`  Version: ${dbInfo.version.split(' ')[0]} ${dbInfo.version.split(' ')[1]}`, 'green');
    log(`  Database: ${dbInfo.current_database}`, 'green');
    log(`  User: ${dbInfo.current_user}`, 'green');

    // Check tables
    log('\n🔍 Checking tables...', 'blue');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      log('⚠️  No tables found. Run migrations first:', 'yellow');
      log('  npm run db:migrate', 'yellow');
    } else {
      log(`✅ Found ${tablesResult.rows.length} tables:`, 'green');
      tablesResult.rows.forEach(row => {
        log(`  ✓ ${row.table_name}`, 'green');
      });
    }

    // Check admin user
    log('\n🔍 Checking admin user...', 'blue');
    const adminResult = await client.query(
      'SELECT email, full_name, is_admin, created_at FROM profiles WHERE email = $1',
      ['admin@albert.com']
    );

    if (adminResult.rows.length === 0) {
      log('⚠️  Admin user not found. Initialize admin:', 'yellow');
      log('  npm run db:init-admin', 'yellow');
    } else {
      const admin = adminResult.rows[0];
      log('✅ Admin user found:', 'green');
      log(`  Email: ${admin.email}`, 'green');
      log(`  Name: ${admin.full_name}`, 'green');
      log(`  Admin: ${admin.is_admin}`, 'green');
      log(`  Created: ${admin.created_at}`, 'green');
    }

    // Connection pool stats
    log('\n📊 Connection Pool Stats:', 'blue');
    log(`  Total: ${pool.totalCount}`, 'blue');
    log(`  Idle: ${pool.idleCount}`, 'blue');
    log(`  Waiting: ${pool.waitingCount}`, 'blue');

    log('\n🎉 All tests passed!', 'green');
    log('\nDatabase is ready for use.', 'green');

  } catch (error) {
    log('\n❌ Connection test failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    
    if (error.code) {
      log(`Error code: ${error.code}`, 'red');
    }

    if (error.code === 'ENOTFOUND') {
      log('\n💡 Troubleshooting:', 'yellow');
      log('  - Check your connection string', 'yellow');
      log('  - Verify the hostname is correct', 'yellow');
      log('  - Ensure you have internet connectivity', 'yellow');
    } else if (error.code === 'ECONNREFUSED') {
      log('\n💡 Troubleshooting:', 'yellow');
      log('  - Check if the database is running', 'yellow');
      log('  - Verify the port number', 'yellow');
      log('  - Check firewall settings', 'yellow');
    } else if (error.message.includes('password')) {
      log('\n💡 Troubleshooting:', 'yellow');
      log('  - Verify your database credentials', 'yellow');
      log('  - Check if the password is correct', 'yellow');
    } else if (error.message.includes('SSL')) {
      log('\n💡 Troubleshooting:', 'yellow');
      log('  - Verify IBM_DB_CA_CERT is set correctly', 'yellow');
      log('  - Check if the certificate is base64 encoded', 'yellow');
    }

    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run test
testConnection().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});

// Made with Bob
