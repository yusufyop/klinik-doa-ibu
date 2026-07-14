const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const logAudit = require('../middleware/auditLogger');
const logger = require('../utils/logger');

/**
 * GET /api/audit-logs
 * Get audit logs with pagination and filters
 */
router.get('/', async (req, res) => {
  try {
    const { user_id, action_type, start_date, end_date, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    const countParams = [];
    
    if (user_id) {
      whereClause += ' AND user_id = ?';
      params.push(user_id);
      countParams.push(user_id);
    }
    if (action_type) {
      whereClause += ' AND action_type = ?';
      params.push(action_type);
      countParams.push(action_type);
    }
    if (start_date) {
      whereClause += ' AND DATE(created_at) >= ?';
      params.push(start_date);
      countParams.push(start_date);
    }
    if (end_date) {
      whereClause += ' AND DATE(created_at) <= ?';
      params.push(end_date);
      countParams.push(end_date);
    }
    
    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      countParams
    );
    
    // Get paginated results
    params.push(parseInt(limit), offset);
    const [results] = await pool.execute(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    );
    
    res.json({
      data: results,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
