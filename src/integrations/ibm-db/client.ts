import { Pool, PoolClient } from 'pg';

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.IBM_DB_CONNECTION_STRING,
  ssl: process.env.IBM_DB_CA_CERT
    ? {
        rejectUnauthorized: false,
        ca: Buffer.from(process.env.IBM_DB_CA_CERT, 'base64').toString('utf-8'),
      }
    : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Handle pool errors
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  // Don't exit process in production, just log the error
  if (process.env.NODE_ENV === 'development') {
    process.exit(-1);
  }
});

// Database interface
export const db = {
  /**
   * Execute a query
   */
  query: async (text: string, params?: any[]) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  /**
   * Get a client from the pool for transactions
   */
  getClient: async (): Promise<PoolClient> => {
    const client = await pool.connect();
    return client;
  },

  /**
   * Execute a transaction
   */
  transaction: async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Close all connections (for graceful shutdown)
   */
  end: async () => {
    await pool.end();
  },
};

// Test connection on startup
if (process.env.IBM_DB_CONNECTION_STRING) {
  pool
    .query('SELECT NOW()')
    .then(() => {
      console.log('✅ IBM PostgreSQL connection successful');
    })
    .catch((err) => {
      console.error('❌ IBM PostgreSQL connection failed:', err.message);
    });
} else {
  console.warn('⚠️  IBM_DB_CONNECTION_STRING not configured');
}

export default db;

// Made with Bob
