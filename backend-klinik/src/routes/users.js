const express = require('express');
const db = require('../config/database');
const logAudit = require('../utils/auditLogger');
const { setCache, getCache, invalidateCache } = require('../utils/cache');

const router = express.Router();

// GET /api/users
router.get('/users', (req, res) => {
  const cached = getCache('users');
  if (cached) return res.json(cached);
  
  db.query('SELECT id, nama_lengkap, email, role FROM users ORDER BY id', (e, r) => {
    if (e) return res.status(500).json({ error: e.message });
    setCache('users', r, 120);
    res.json(r);
  });
});

// POST /api/users
router.post('/users', (req, res) => {
  const { nama_lengkap, email, password, role } = req.body;
  
  if (!nama_lengkap || !email || !password || !role) {
    return res.status(400).json({ error: 'Semua field wajib diisi!' });
  }
  
  db.query(`SELECT id FROM users WHERE email = ?`, [email], (e, existing) => {
    if (e) return res.status(500).json({ error: e.message });
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar!' });
    }
    
    db.query(
      `INSERT INTO users (nama_lengkap, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      [nama_lengkap, email, password, role],
      (e, result) => {
        if (e) return res.status(500).json({ error: e.message });
        invalidateCache('users');
        logAudit(req, 'create', 'users', result.insertId, `User baru: ${nama_lengkap} (${role})`);
        res.json({ success: true, message: 'User berhasil dibuat!' });
      }
    );
  });
});

// PUT /api/users/:id
router.put('/users/:id', (req, res) => {
  const { nama_lengkap, email, role } = req.body;
  
  db.query(
    `UPDATE users SET nama_lengkap=?, email=?, role=? WHERE id=?`,
    [nama_lengkap, email, role, req.params.id],
    (e) => {
      if (e) return res.status(500).json({ error: e.message });
      invalidateCache('users');
      logAudit(req, 'update', 'users', req.params.id, `User diupdate: ${nama_lengkap}`);
      res.json({ success: true, message: 'User diupdate!' });
    }
  );
});

// PUT /api/users/:id/password
router.put('/users/:id/password', (req, res) => {
  const { new_password } = req.body;
  const admin_role = req.headers['x-user-role'];
  
  if (admin_role !== 'admin') {
    return res.status(403).json({ error: 'Hanya admin yang bisa reset password!' });
  }
  
  if (!new_password || new_password.length < 4) {
    return res.status(400).json({ error: 'Password minimal 4 karakter!' });
  }
  
  db.query(`UPDATE users SET password_hash=? WHERE id=?`, [new_password, req.params.id], (e) => {
    if (e) return res.status(500).json({ error: e.message });
    logAudit(req, 'update', 'users', req.params.id, `Password direset untuk user ID: ${req.params.id}`);
    res.json({ success: true, message: 'Password berhasil direset!' });
  });
});

// DELETE /api/users/:id
router.delete('/users/:id', (req, res) => {
  db.query(`DELETE FROM users WHERE id=?`, [req.params.id], (e) => {
    if (e) return res.status(500).json({ error: e.message });
    invalidateCache('users');
    logAudit(req, 'delete', 'users', req.params.id, `User dihapus ID: ${req.params.id}`);
    res.json({ success: true, message: 'User dihapus!' });
  });
});

module.exports = router;
