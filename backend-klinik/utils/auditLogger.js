const db = require('../config/database');

/**
 * Log audit trail
 */
async function logAudit(userId, actionType, targetTable, targetId, description, ipAddress) {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, user_name, action_type, target_table, target_id, description, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, userId ? 'Unknown' : 'Guest', actionType, targetTable, targetId, description, ipAddress]
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

module.exports = {
  logAudit
};
