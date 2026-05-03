#!/usr/bin/env node

/**
 * Admin Initialization Script
 * Creates admin@albert.com user with password
 */

import { createInterface } from 'readline';
import pg from 'pg';
import bcrypt from 'bcrypt';

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

function prompt(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function initializeAdmin() {
  log('🔐 Admin User Initialization', 'blue');
  log('═══════════════════════════════════════', 'blue');

  // Check environment variables
  if (!process.env.IBM_DB_CONNECTION_STRING) {
    log('❌ Error: IBM_DB_CONNECTION_STRING not set', 'red');
    log('Please set the environment variable and try again.', 'yellow');
    process.exit(1);
  }

  // Get admin password
  let adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    log('\n⚠️  ADMIN_PASSWORD not set in environment', 'yellow');
    adminPassword = await prompt('Enter admin password: ');
    
    if (!adminPassword || adminPassword.length < 8) {
      log('❌ Password must be at least 8 characters', 'red');
      process.exit(1);
    }
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
    log('\n📡 Connecting to database...', 'blue');
    client = await pool.connect();
    log('✅ Connected successfully!', 'green');

    // Check if admin exists
    log('🔍 Checking for existing admin user...', 'blue');
    const checkResult = await client.query(
      'SELECT * FROM profiles WHERE email = $1',
      ['admin@albert.com']
    );

    if (checkResult.rows.length > 0) {
      log('⚠️  Admin user already exists', 'yellow');
      const update = await prompt('Update password? (y/n): ');
      
      if (update.toLowerCase() !== 'y') {
        log('❌ Cancelled', 'yellow');
        process.exit(0);
      }

      // Hash password
      log('🔒 Hashing password...', 'blue');
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      // Update admin
      log('⚙️  Updating admin user...', 'blue');
      await client.query(
        'UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE email = $2',
        [passwordHash, 'admin@albert.com']
      );

      log('✅ Admin password updated successfully!', 'green');
    } else {
      // Hash password
      log('🔒 Hashing password...', 'blue');
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      // Create admin
      log('⚙️  Creating admin user...', 'blue');
      await client.query(
        `INSERT INTO profiles (email, full_name, password_hash, is_admin) 
         VALUES ($1, $2, $3, $4)`,
        ['admin@albert.com', 'Admin', passwordHash, true]
      );

      log('✅ Admin user created successfully!', 'green');
    }

    // Verify admin
    log('\n🔍 Verifying admin user...', 'blue');
    const verifyResult = await client.query(
      'SELECT id, email, full_name, is_admin, created_at FROM profiles WHERE email = $1',
      ['admin@albert.com']
    );

    const admin = verifyResult.rows[0];
    log('\n📊 Admin User Details:', 'green');
    log(`  Email: ${admin.email}`, 'green');
    log(`  Name: ${admin.full_name}`, 'green');
    log(`  Admin: ${admin.is_admin}`, 'green');
    log(`  Created: ${admin.created_at}`, 'green');

    log('\n🎉 Admin initialization complete!', 'green');
    log('\nYou can now login with:', 'yellow');
    log(`  Email: admin@albert.com`, 'yellow');
    log(`  Password: [the password you just set]`, 'yellow');

  } catch (error) {
    log('\n❌ Initialization failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    
    if (error.code) {
      log(`Error code: ${error.code}`, 'red');
    }

    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run initialization
initializeAdmin().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});

// Made with Bob
