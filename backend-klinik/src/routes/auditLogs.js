const express = require('express');
const db = require('../config/database');
const logAudit = require('../utils/auditLogger');
const paginate = require('../middlewares/pagination');

const router = express.Router();

// GET /api/audit-logs
router.get('/audit-logs', paginate, (req, res) => {
  const { user_id, action_type, start_date, end_date } = req.query;
  const { limit, offset } = req.pagination;
  
  let sql = `SELECT * FROM audit_logs WHERE 1=1`;
  let countSql = `SELECT COUNT(*) as total FROM audit_logs WHERE 1=1`;
  const params = [];
  const countParams = [];
  
  if (user_id) {
    sql += ` AND user_id = ?`;
    countSql += ` AND user_id = ?`;
    params.push(user_id);
    countParams.push(user_id);
  }
  if (action_type) {
    sql += ` AND action_type = ?`;
    countSql += ` AND action_type = ?`;
    params.push(action_type);
    countParams.push(action_type);
  }
  if (start_date) {
    sql += ` AND DATE(created_at) >= ?`;
    countSql += ` AND DATE(created_at) >= ?`;
    params.push(start_date);
    countParams.push(start_date);
  }
  if (end_date) {
    sql += ` AND DATE(created_at) <= ?`;
    countSql += ` AND DATE(created_at) <= ?`;
    params.push(end_date);
    countParams.push(end_date);
  }
  
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  db.query(countSql, countParams, (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.query(sql, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        data: results,
        total: countResult[0].total,
        page: req.pagination.page,
        limit
      });
    });
  });
});

module.exports = router;
