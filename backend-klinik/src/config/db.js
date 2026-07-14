const mysql = require('mysql2/promise');
const { DB_CONFIG } = require('./database');

// Create connection pool for better performance
const pool = mysql.createPool(DB_CONFIG);

// Test connection with retry logic
async function testConnection(maxRetries = 3) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log('✅ Database connection pool established successfully!');
      console.log(`📊 Connection limit: ${DB_CONFIG.connectionLimit}`);
      console.log(`🔒 SSL enabled: ${DB_CONFIG.ssl ? 'Yes' : 'No'}`);
      console.log(`🌐 Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
      console.log(`📦 Database: ${DB_CONFIG.database}`);
      connection.release();
      
      // Test a simple query to ensure TiDB compatibility
      const [rows] = await pool.execute('SELECT 1 as test');
      if (rows[0].test === 1) {
        console.log('✅ Database query test passed!');
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i}/${maxRetries} failed:`, error.message);
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
      if (error.errno) {
        console.error(`   Error errno: ${error.errno}`);
      }
      if (i < maxRetries) {
        console.log(`⏳ Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error('❌ All connection attempts failed. Please check your .env configuration.');
        console.error('\n📝 Make sure you have updated the .env file with your TiDB Cloud credentials:');
        console.error('   - DB_HOST: Your TiDB Cloud gateway host');
        console.error('   - DB_USER: Your TiDB Cloud username (usually xxxxx.root)');
        console.error('   - DB_PASS: Your TiDB Cloud password');
        console.error('   - DB_NAME: Your database name');
        console.error('   - DB_PORT: Usually 4000 for TiDB Cloud');
        console.error('   - DB_SSL: Should be true for TiDB Cloud\n');
        return false;
      }
    }
  }
}

module.exports = {
  pool,
  testConnection
};
