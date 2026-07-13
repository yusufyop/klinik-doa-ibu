const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { requireAdmin, optionalAuth } = require('../middleware/auth');
const db = require('../config/database');
const { logAudit } = require('../utils/auditLogger');

/**
 * POST /api/login
 * Login user with rate limiting
 */
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const result = await authController.login(email, password);

    if (!result.success) {
      // Log failed login attempt
      await logAudit(
        null,
        'login_failed',
        'users',
        null,
        `Login gagal: ${email}`,
        ip
      );
      return res.status(401).json(result);
    }

    // Log successful login
    await logAudit(
      result.user.id,
      'login',
      'users',
      result.user.id,
      'Login berhasil',
      ip
    );

    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan pada server' 
    });
  }
});

/**
 * GET /api/users
 * Get all users (protected route)
 */
router.get('/users', optionalAuth, async (req, res) => {
  try {
    const users = await authController.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal mengambil data user' 
    });
  }
});

/**
 * POST /api/users
 * Create new user (admin only)
 */
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const result = await authController.createUser(req.body);
    
    await logAudit(
      req.user?.id,
      'create',
      'users',
      result.userId,
      `User baru: ${req.body.nama_lengkap} (${req.body.role})`,
      req.ip
    );

    res.json(result);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * PUT /api/users/:id
 * Update user (admin only)
 */
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const result = await authController.updateUser(req.params.id, req.body);
    
    await logAudit(
      req.user?.id,
      'update',
      'users',
      req.params.id,
      `User diupdate: ${req.body.nama_lengkap}`,
      req.ip
    );

    res.json(result);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal update user' 
    });
  }
});

/**
 * PUT /api/users/:id/password
 * Reset user password (admin only)
 */
router.put('/users/:id/password', requireAdmin, async (req, res) => {
  try {
    const { new_password } = req.body;
    const result = await authController.resetPassword(
      req.params.id, 
      new_password, 
      true
    );
    
    await logAudit(
      req.user?.id,
      'update',
      'users',
      req.params.id,
      `Password direset untuk user ID: ${req.params.id}`,
      req.ip
    );

    res.json(result);
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const result = await authController.deleteUser(req.params.id);
    
    await logAudit(
      req.user?.id,
      'delete',
      'users',
      req.params.id,
      `User dihapus ID: ${req.params.id}`,
      req.ip
    );

    res.json(result);
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal menghapus user' 
    });
  }
});

module.exports = router;
