const express = require('express');
require('dotenv').config();

const db = require('./config/database');
const routes = require('./routes');

const app = express();

// Use routes
app.use(routes);

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend jalan di port ${PORT}`);
  console.log(`📊 Cache aktif dengan TTL bervariasi`);
  console.log(`🔒 CORS enabled untuk localhost & IP lokal`);
});
