const express = require('express');
const router = express.Router();
const { loginLimiter } = require('../middleware/rateLimiter');
const { loginUser } = require('../services/authService');
const logAudit = require('../middleware/auditLogger');
const logger = require('../utils/logger');

/**
 * POST /api/login
 * Authenticate user
 */
router.post('/', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email dan password wajib diisi!' 
      });
    }
    
    const result = await loginUser(email, password);
    
    if (!result.success) {
      // Log failed login attempt
      await logAudit(req, 'login', 'users', null, `Login gagal: ${email}`, ip);
      logger.warn(`Failed login attempt for: ${email} from IP: ${ip}`);
      return res.status(401).json(result);
    }
    
    // Log successful login
    await logAudit(req, 'login', 'users', result.user.id, 'Login berhasil', ip);
    logger.info(`Successful login: ${result.user.name} (${result.user.role})`);
    
    res.json(result);
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan pada server' 
    });
  }
});

module.exports = router;
