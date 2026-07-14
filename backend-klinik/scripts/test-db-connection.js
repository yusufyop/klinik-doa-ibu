const { testConnection } = require('../src/config/db');

console.log('🔍 Testing TiDB Cloud Connection...\n');

testConnection()
  .then(success => {
    if (success) {
      console.log('\n✅ Connection test successful!');
      process.exit(0);
    } else {
      console.log('\n❌ Connection test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });
