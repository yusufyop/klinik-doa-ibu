const express = require('express');
const db = require('../config/database');
const logAudit = require('../utils/auditLogger');

const router = express.Router();

// POST /api/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  db.query(`SELECT * FROM users WHERE email = ? AND password_hash = ?`, [email, password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (results.length === 0) {
      db.query(
        `INSERT INTO audit_logs (user_name, action_type, target_table, description, ip_address) VALUES (?, ?, ?, ?, ?)`,
        [email, 'login', 'users', `Login gagal: ${email}`, ip]
      );
      return res.status(401).json({ success: false, message: 'Email/Password salah!' });
    }
    
    const user = results[0];
    db.query(
      `INSERT INTO audit_logs (user_id, user_name, action_type, target_table, target_id, description, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.nama_lengkap, 'login', 'users', user.id, `Login berhasil`, ip]
    );
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.nama_lengkap,
        role: user.role
      }
    });
  });
});

module.exports = router;
