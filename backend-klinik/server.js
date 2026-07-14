const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { pool, testConnection } = require('./src/config/db');
const config = require('./src/config/database');
const logger = require('./src/utils/logger');
const { apiLimiter } = require('./src/middleware/rateLimiter');

// Import routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');

const app = express();

// ============================================
// 🛡️ SECURITY MIDDLEWARE
// ============================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable if you need inline scripts
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Name', 'X-User-Role']
}));

// Handle preflight requests
app.options('*', cors());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
if (config.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
} else {
  app.use(morgan('dev'));
}

// Rate limiting for API
app.use('/api', apiLimiter);

// ============================================
// 🏥 HEALTH CHECK ENDPOINT
// ============================================

app.get('/health', async (req, res) => {
  try {
    const connectionOk = await testConnection();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: connectionOk ? 'connected' : 'disconnected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ============================================
// 📍 API ROUTES
// ============================================

app.use('/api/login', authRoutes);
app.use('/api/users', userRoutes);

// Placeholder for other routes (to be migrated from old server.js)
app.use('/api/audit-logs', require('./src/routes/auditLogs'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/finance', require('./src/routes/finance'));
app.use('/api/patients', require('./src/routes/patients'));
app.use('/api/medicines', require('./src/routes/medicines'));
app.use('/api/visits', require('./src/routes/visits'));
app.use('/api/prescriptions', require('./src/routes/prescriptions'));

// ============================================
// ❌ ERROR HANDLING
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
  logger.error('Unhandled error:', err);
  
  // Pastikan header JSON belum dikirim
  if (!res.headersSent) {
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Terjadi kesalahan pada server';
    
    // Kirim detail error hanya jika bukan production
    const responsePayload = {
      success: false,
      message: config.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : message,
    };

    // Tambahkan detail teknis untuk debugging di development
    if (config.NODE_ENV !== 'production') {
      responsePayload.stack = err.stack;
      responsePayload.sqlMessage = err.sqlMessage;
      responsePayload.sqlCode = err.sqlCode;
    }

    return res.status(statusCode).json(responsePayload);
  }

  // Fallback jika headers sudah terkirim
  logger.error('Headers already sent, cannot send error response');
});

// ============================================
// 🚀 START SERVER
// ============================================

const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }
    
    const PORT = config.PORT;
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`🌍 Environment: ${config.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
