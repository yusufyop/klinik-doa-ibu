const express = require('express');
const cors = require('cors');

const router = express.Router();

// CORS Configuration
router.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Name', 'X-User-Role']
}));

// Handle preflight requests
router.options('*', cors());

module.exports = router;
