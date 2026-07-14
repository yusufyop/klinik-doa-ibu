const { pool } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Log audit trail to database
 */
const logAudit = async (req, action_type, target_table, target_id, description) => {
  try {
    const user_id = req.headers['x-user-id'] || null;
    const user_name = req.headers['x-user-name'] || 'Guest';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    await pool.execute(
      `INSERT INTO audit_logs (user_id, user_name, action_type, target_table, target_id, description, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, user_name, action_type, target_table, target_id, description, ip]
    );
    
    logger.info(`Audit: ${action_type} on ${target_table} by ${user_name}`);
  } catch (error) {
    logger.error('Audit log error:', error);
  }
};

module.exports = logAudit;
