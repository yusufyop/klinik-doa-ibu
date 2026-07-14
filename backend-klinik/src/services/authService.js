const { hashPassword, comparePassword } = require('../utils/password');

/**
 * Authenticate user login
 */
const loginUser = async (email, password) => {
  const { pool } = require('../config/db');
  
  try {
    const [results] = await pool.execute(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    );
    
    if (results.length === 0) {
      return { success: false, message: 'Email/Password salah!' };
    }
    
    const user = results[0];
    
    // Check if password is already hashed (for migration from plain text)
    let isValidPassword = false;
    if (user.password_hash && user.password_hash.startsWith('$2')) {
      // Password is hashed with bcrypt
      isValidPassword = await comparePassword(password, user.password_hash);
    } else {
      // Legacy: plain text password (for backward compatibility during migration)
      isValidPassword = password === user.password_hash;
    }
    
    if (!isValidPassword) {
      return { success: false, message: 'Email/Password salah!' };
    }
    
    return {
      success: true,
      user: {
        id: user.id,
        name: user.nama_lengkap,
        role: user.role
      }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Create new user with hashed password
 */
const createUser = async (userData) => {
  const { pool } = require('../config/db');
  
  try {
    const hashedPassword = await hashPassword(userData.password);
    
    const [result] = await pool.execute(
      `INSERT INTO users (nama_lengkap, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      [userData.nama_lengkap, userData.email, hashedPassword, userData.role]
    );
    
    return { success: true, insertId: result.insertId };
  } catch (error) {
    throw error;
  }
};

/**
 * Reset user password with hashing
 */
const resetPassword = async (userId, newPassword) => {
  const { pool } = require('../config/db');
  
  try {
    const hashedPassword = await hashPassword(newPassword);
    
    await pool.execute(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [hashedPassword, userId]
    );
    
    return { success: true };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  loginUser,
  createUser,
  resetPassword
};
