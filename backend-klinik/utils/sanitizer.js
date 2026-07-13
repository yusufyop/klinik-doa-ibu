/**
 * Input sanitization utilities to prevent XSS and SQL injection
 */

/**
 * Sanitize string input to prevent XSS
 */
function sanitizeString(input) {
  if (!input || typeof input !== 'string') {
    return input;
  }
  
  // Remove potential script tags and dangerous characters
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Sanitize object with multiple fields
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Indonesian format)
 */
function isValidPhone(phone) {
  const phoneRegex = /^(\+62|62|0)[0-9]{8,15}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate Indonesian NIK (16 digits)
 */
function isValidNIK(nik) {
  const nikRegex = /^[0-9]{16}$/;
  return nikRegex.test(nik);
}

/**
 * Escape special characters for SQL LIKE queries
 */
function escapeLikeString(str) {
  return str.replace(/[%_]/g, '\\$&');
}

module.exports = {
  sanitizeString,
  sanitizeObject,
  isValidEmail,
  isValidPhone,
  isValidNIK,
  escapeLikeString
};
