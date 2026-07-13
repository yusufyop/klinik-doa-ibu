const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import database
const db = require('./config/database');

// Import middleware
const { apiRateLimiter } = require('./middleware/rateLimiter');
const { optionalAuth } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/authRoutes');

// ============================================
// 🌟 MIDDLEWARE CONFIGURATION
// ============================================

// CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Name', 'X-User-Role']
}));

// Handle preflight requests
app.options('*', cors());

// Body parser
app.use(express.json());

// Apply general API rate limiting
app.use('/api', apiRateLimiter);

// Apply optional auth to all routes
app.use(optionalAuth);

// ============================================
// 🌟 ROUTES
// ============================================

// Authentication & User Management routes
app.use('/api', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Clinic API is running',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 🌟 ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// 🌟 SERVER STARTUP
// ============================================

async function startServer() {
  try {
    // Test database connection
    await db.testConnection();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
