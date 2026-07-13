const db = require('../config/database');
const { hashPassword, comparePassword, validatePasswordStrength } = require('../utils/password');
const { sanitizeString, isValidEmail } = require('../utils/sanitizer');

/**
 * Login user
 */
async function login(email, password) {
  try {
    // Validate email format
    if (!isValidEmail(email)) {
      return { success: false, message: 'Invalid email format' };
    }

    const sanitizedEmail = sanitizeString(email);

    // Get user from database
    const [users] = await db.query(
      `SELECT * FROM users WHERE email = ?`,
      [sanitizedEmail]
    );

    if (users.length === 0) {
      return { success: false, message: 'Email/Password salah!' };
    }

    const user = users[0];

    // Compare password with hash
    const isMatch = await comparePassword(password, user.password_hash);
    
    if (!isMatch) {
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
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Get all users
 */
async function getAllUsers() {
  try {
    const [users] = await db.query(
      `SELECT id, nama_lengkap, email, role FROM users ORDER BY id`
    );
    return users;
  } catch (error) {
    console.error('Get users error:', error);
    throw error;
  }
}

/**
 * Create new user
 */
async function createUser(userData) {
  try {
    const { nama_lengkap, email, password, role } = userData;

    // Validate required fields
    if (!nama_lengkap || !email || !password || !role) {
      throw new Error('Semua field wajib diisi!');
    }

    // Validate email format
    if (!isValidEmail(email)) {
      throw new Error('Format email tidak valid!');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    const sanitizedEmail = sanitizeString(email);
    const sanitizedName = sanitizeString(nama_lengkap);

    // Check if email already exists
    const [existing] = await db.query(
      `SELECT id FROM users WHERE email = ?`,
      [sanitizedEmail]
    );

    if (existing.length > 0) {
      throw new Error('Email sudah terdaftar!');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert user
    const [result] = await db.query(
      `INSERT INTO users (nama_lengkap, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      [sanitizedName, sanitizedEmail, hashedPassword, role]
    );

    return { 
      success: true, 
      message: 'User berhasil dibuat!',
      userId: result.insertId
    };
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}

/**
 * Update user
 */
async function updateUser(userId, userData) {
  try {
    const { nama_lengkap, email, role } = userData;

    const sanitizedName = sanitizeString(nama_lengkap);
    const sanitizedEmail = sanitizeString(email);

    await db.query(
      `UPDATE users SET nama_lengkap=?, email=?, role=? WHERE id=?`,
      [sanitizedName, sanitizedEmail, role, userId]
    );

    return { success: true, message: 'User diupdate!' };
  } catch (error) {
    console.error('Update user error:', error);
    throw error;
  }
}

/**
 * Reset user password (admin only)
 */
async function resetPassword(userId, newPassword, isAdmin) {
  try {
    if (!isAdmin) {
      throw new Error('Hanya admin yang bisa reset password!');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    await db.query(
      `UPDATE users SET password_hash=? WHERE id=?`,
      [hashedPassword, userId]
    );

    return { success: true, message: 'Password berhasil direset!' };
  } catch (error) {
    console.error('Reset password error:', error);
    throw error;
  }
}

/**
 * Delete user
 */
async function deleteUser(userId) {
  try {
    await db.query(`DELETE FROM users WHERE id=?`, [userId]);
    return { success: true, message: 'User dihapus!' };
  } catch (error) {
    console.error('Delete user error:', error);
    throw error;
  }
}

module.exports = {
  login,
  getAllUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser
};
