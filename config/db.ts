import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables from .env file at the root of the project
dotenv.config();

/**
 * A connection pool for interacting with the MySQL database.
 * Using a pool is more efficient than creating a new connection for every query,
 * as it manages a set of open connections that can be reused.
 */
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || 'boleto_manager_ai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Recommended for timezone consistency
  timezone: '+00:00', 
});

/**
 * A utility function to test the database connection when the server starts.
 * This helps to fail fast if the database is not configured correctly.
 */
export async function testDbConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Successfully connected to the MySQL database.');
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    // Exit the process if the database connection fails, as the app cannot run without it.
    // Throwing the original error preserves the "fail fast" intent and avoids type conflicts.
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}