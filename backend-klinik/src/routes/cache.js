const express = require('express');
const db = require('../config/database');
const { getCacheStats } = require('../utils/cache');

const router = express.Router();

// GET /api/cache-stats
router.get('/cache-stats', (req, res) => {
  res.json(getCacheStats());
});

module.exports = router;
