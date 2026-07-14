const db = require('../config/database');

// Audit log function
const logAudit = (req, action_type, target_table, target_id, description) => {
  const user_id = req.headers['x-user-id'] || null;
  const user_name = req.headers['x-user-name'] || 'Guest';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  db.query(
    `INSERT INTO audit_logs (user_id, user_name, action_type, target_table, target_id, description, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user_id, user_name, action_type, target_table, target_id, description, ip],
    (err) => {
      if (err) console.error('Audit log error:', err);
    }
  );
};

module.exports = logAudit;
