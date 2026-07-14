const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const logAudit = require('../middleware/auditLogger');
const logger = require('../utils/logger');
const { userValidation } = require('../middleware/validators');
const { createUser, resetPassword } = require('../services/authService');

// Simple in-memory cache for users
const userCache = new Map();
const CACHE_TTL = 120000; // 2 minutes

/**
 * GET /api/users
 * Get all users
 */
router.get('/', async (req, res) => {
  try {
    // Check cache first
    const cached = userCache.get('all');
    if (cached && Date.now() < cached.expiry) {
      return res.json(cached.data);
    }
    
    const [results] = await pool.execute(
      'SELECT id, nama_lengkap, email, role FROM users ORDER BY id'
    );
    
    // Cache the result
    userCache.set('all', { data: results, expiry: Date.now() + CACHE_TTL });
    
    res.json(results);
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/users
 * Create new user
 */
router.post('/', userValidation.create, async (req, res) => {
  const { nama_lengkap, email, password, role } = req.body;
  
  try {
    // Check if email already exists
    const [existing] = await pool.execute(
      `SELECT id FROM users WHERE email = ?`,
      [email]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar!' });
    }
    
    // Create user with hashed password
    const result = await createUser({ nama_lengkap, email, password, role });
    
    // Clear cache
    userCache.clear();
    
    await logAudit(req, 'create', 'users', result.insertId, `User baru: ${nama_lengkap} (${role})`);
    logger.info(`User created: ${nama_lengkap}`);
    
    res.json({ success: true, message: 'User berhasil dibuat!' });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id', userValidation.update, async (req, res) => {
  const { nama_lengkap, email, role } = req.body;
  const { id } = req.params;
  
  try {
    await pool.execute(
      `UPDATE users SET nama_lengkap=?, email=?, role=? WHERE id=?`,
      [nama_lengkap, email, role, id]
    );
    
    // Clear cache
    userCache.clear();
    
    await logAudit(req, 'update', 'users', id, `User diupdate: ${nama_lengkap}`);
    logger.info(`User updated: ${id}`);
    
    res.json({ success: true, message: 'User diupdate!' });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/users/:id/password
 * Reset user password
 */
router.put('/:id/password', userValidation.passwordReset, async (req, res) => {
  const { new_password } = req.body;
  const { id } = req.params;
  const admin_role = req.headers['x-user-role'];
  
  if (admin_role !== 'admin') {
    return res.status(403).json({ error: 'Hanya admin yang bisa reset password!' });
  }
  
  try {
    await resetPassword(id, new_password);
    
    await logAudit(req, 'update', 'users', id, `Password direset untuk user ID: ${id}`);
    logger.info(`Password reset for user: ${id}`);
    
    res.json({ success: true, message: 'Password berhasil direset!' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.execute(`DELETE FROM users WHERE id=?`, [id]);
    
    // Clear cache
    userCache.clear();
    
    await logAudit(req, 'delete', 'users', id, `User dihapus ID: ${id}`);
    logger.info(`User deleted: ${id}`);
    
    res.json({ success: true, message: 'User dihapus!' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
