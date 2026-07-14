const mysql = require('mysql2/promise');
const { DB_CONFIG } = require('./database');

// Create connection pool for better performance
const pool = mysql.createPool(DB_CONFIG);

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connection pool established successfully!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
