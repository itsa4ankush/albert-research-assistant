/**
 * IBM Authentication Module
 * 
 * Handles authentication using IBM Databases for PostgreSQL
 * Supports:
 * - Admin login with email/password (admin@albert.com)
 * - New user signup/login with numeric OTP
 * - Session management
 */

import bcrypt from 'bcrypt';
import { db } from '../integrations/ibm-db/client';

const SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 6;

// Types
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

/**
 * Generate a 6-digit numeric OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Admin Login
 * Authenticates admin@albert.com with password
 */
export async function adminLogin(email: string, password: string): Promise<AuthResult> {
  try {
    // Verify it's the admin email
    if (email !== 'admin@albert.com') {
      return { success: false, error: 'Invalid credentials' };
    }

    // Get admin user from database
    const result = await db.query(
      'SELECT * FROM profiles WHERE email = $1 AND is_admin = true',
      [email]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid credentials' };
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Create session (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const sessionResult = await db.query(
      `INSERT INTO sessions (user_id, expires_at) 
       VALUES ($1, $2) 
       RETURNING *`,
      [user.id, expiresAt.toISOString()]
    );

    const session = sessionResult.rows[0];

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      session: {
        id: session.id,
        user_id: session.user_id,
        expires_at: session.expires_at,
        created_at: session.created_at,
      },
    };
  } catch (error) {
    console.error('Admin login error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Send OTP to email
 * Generates and stores a 6-digit OTP for new user signup/login
 */
export async function sendOTP(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // Store OTP in database
    await db.query(
      `INSERT INTO otp_codes (email, code, expires_at) 
       VALUES ($1, $2, $3)
       ON CONFLICT (email) 
       DO UPDATE SET code = $2, expires_at = $3, created_at = NOW()`,
      [email, otp, expiresAt.toISOString()]
    );

    // TODO: Integrate with IBM Cloud Email Service or SendGrid
    // For now, log the OTP (in production, send via email)
    console.log(`OTP for ${email}: ${otp}`);
    console.log(`OTP expires at: ${expiresAt.toISOString()}`);

    return { success: true };
  } catch (error) {
    console.error('Send OTP error:', error);
    return { success: false, error: 'Failed to send OTP' };
  }
}

/**
 * Verify OTP and create/login user
 * Creates a new user if they don't exist, or logs in existing user
 */
export async function verifyOTP(email: string, otp: string, fullName?: string): Promise<AuthResult> {
  try {
    // Get OTP from database
    const otpResult = await db.query(
      'SELECT * FROM otp_codes WHERE email = $1 AND code = $2',
      [email, otp]
    );

    if (otpResult.rows.length === 0) {
      return { success: false, error: 'Invalid OTP' };
    }

    const otpRecord = otpResult.rows[0];

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Delete expired OTP
      await db.query('DELETE FROM otp_codes WHERE email = $1', [email]);
      return { success: false, error: 'OTP expired' };
    }

    // Delete used OTP
    await db.query('DELETE FROM otp_codes WHERE email = $1', [email]);

    // Check if user exists
    let userResult = await db.query('SELECT * FROM profiles WHERE email = $1', [email]);
    let user;

    if (userResult.rows.length === 0) {
      // Create new user
      const insertResult = await db.query(
        `INSERT INTO profiles (email, full_name, is_admin) 
         VALUES ($1, $2, false) 
         RETURNING *`,
        [email, fullName || null]
      );
      user = insertResult.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // Create session (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const sessionResult = await db.query(
      `INSERT INTO sessions (user_id, expires_at) 
       VALUES ($1, $2) 
       RETURNING *`,
      [user.id, expiresAt.toISOString()]
    );

    const session = sessionResult.rows[0];

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      session: {
        id: session.id,
        user_id: session.user_id,
        expires_at: session.expires_at,
        created_at: session.created_at,
      },
    };
  } catch (error) {
    console.error('Verify OTP error:', error);
    return { success: false, error: 'OTP verification failed' };
  }
}

/**
 * Validate session
 * Checks if a session is valid and not expired
 */
export async function validateSession(sessionId: string): Promise<AuthResult> {
  try {
    const result = await db.query(
      `SELECT s.*, p.* 
       FROM sessions s
       JOIN profiles p ON s.user_id = p.id
       WHERE s.id = $1 AND s.expires_at > NOW()`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid or expired session' };
    }

    const row = result.rows[0];

    return {
      success: true,
      user: {
        id: row.user_id,
        email: row.email,
        full_name: row.full_name,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      session: {
        id: row.id,
        user_id: row.user_id,
        expires_at: row.expires_at,
        created_at: row.created_at,
      },
    };
  } catch (error) {
    console.error('Validate session error:', error);
    return { success: false, error: 'Session validation failed' };
  }
}

/**
 * Logout
 * Deletes a session
 */
export async function logout(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: 'Logout failed' };
  }
}

/**
 * Initialize admin user
 * Creates the admin@albert.com user with password if it doesn't exist
 * This should be run during initial setup
 */
export async function initializeAdmin(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if admin exists
    const result = await db.query('SELECT * FROM profiles WHERE email = $1', ['admin@albert.com']);

    if (result.rows.length > 0) {
      return { success: true }; // Admin already exists
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin user
    await db.query(
      `INSERT INTO profiles (email, full_name, password_hash, is_admin) 
       VALUES ($1, $2, $3, $4)`,
      ['admin@albert.com', 'Admin', passwordHash, true]
    );

    console.log('Admin user created successfully');
    return { success: true };
  } catch (error) {
    console.error('Initialize admin error:', error);
    return { success: false, error: 'Failed to initialize admin' };
  }
}

// Made with Bob
