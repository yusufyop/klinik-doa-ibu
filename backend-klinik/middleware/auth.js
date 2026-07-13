/**
 * Authentication middleware to verify user sessions
 */

const { sanitizeString } = require('../utils/sanitizer');

/**
 * Optional authentication - extracts user info from headers if present
 */
function optionalAuth(req, res, next) {
  const userId = req.headers['x-user-id'];
  const userName = req.headers['x-user-name'];
  const userRole = req.headers['x-user-role'];

  if (userId) {
    req.user = {
      id: sanitizeString(userId),
      name: sanitizeString(userName) || 'Unknown',
      role: sanitizeString(userRole) || 'user'
    };
  }

  next();
}

/**
 * Require authentication - user must be logged in
 */
function requireAuth(req, res, next) {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login.'
    });
  }

  req.user = {
    id: sanitizeString(userId),
    name: sanitizeString(req.headers['x-user-name']) || 'Unknown',
    role: sanitizeString(userRole) || 'user'
  };

  next();
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
  const userRole = req.headers['x-user-role'];

  if (!userRole || userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
}

/**
 * Require specific roles
 * @param {Array<string>} allowedRoles - Array of allowed roles
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'];

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

module.exports = {
  optionalAuth,
  requireAuth,
  requireAdmin,
  requireRoles
};
