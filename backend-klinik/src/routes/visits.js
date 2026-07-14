const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const logAudit = require('../middleware/auditLogger');
const logger = require('../utils/logger');
const { visitValidation } = require('../middleware/validators');

/**
 * GET /api/visits
 * Get visits with filters
 */
router.get('/', async (req, res) => {
  try {
    const { tanggal, patient_id, doctor_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    const countParams = [];
    
    if (tanggal) {
      whereClause += ' AND DATE(tanggal_kunjungan) = ?';
      params.push(tanggal);
      countParams.push(tanggal);
    }
    if (patient_id) {
      whereClause += ' AND patient_id = ?';
      params.push(patient_id);
      countParams.push(patient_id);
    }
    if (doctor_id) {
      whereClause += ' AND doctor_id = ?';
      params.push(doctor_id);
      countParams.push(doctor_id);
    }
    
    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM visits ${whereClause}`,
      countParams
    );
    
    // Get paginated results with joins
    params.push(parseInt(limit), offset);
    const [results] = await pool.execute(
      `SELECT v.*, p.nama_pasien, p.no_rm, u.nama_lengkap as dokter 
       FROM visits v 
       LEFT JOIN patients p ON v.patient_id = p.id 
       LEFT JOIN users u ON v.doctor_id = u.id 
       ${whereClause} 
       ORDER BY v.tanggal_kunjungan DESC, v.created_at DESC 
       LIMIT ? OFFSET ?`,
      params
    );
    
    res.json({
      data: results,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Get visits error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      success: false,
      message: 'Gagal memuat data rekam medis',
      error: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/visits
 * Create new visit
 */
router.post('/', visitValidation.create, async (req, res) => {
  try {
    const { patient_id, doctor_id, tanggal_kunjungan, keluhan, diagnosa, tindakan } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO visits (patient_id, doctor_id, tanggal_kunjungan, keluhan, diagnosa, tindakan) VALUES (?, ?, ?, ?, ?, ?)`,
      [patient_id, doctor_id, tanggal_kunjungan, keluhan || null, diagnosa || null, tindakan || null]
    );
    
    await logAudit(req, 'create', 'visits', result.insertId, `Kunjungan baru untuk patient ID: ${patient_id}`);
    logger.info(`Visit created for patient: ${patient_id}`);
    
    res.json({ success: true, message: 'Kunjungan berhasil ditambahkan!', visit_id: result.insertId });
  } catch (error) {
    logger.error('Create visit error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      success: false,
      message: 'Gagal menambahkan rekam medis',
      error: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

/**
 * PUT /api/visits/:id
 * Update visit
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { keluhan, diagnosa, tindakan, status } = req.body;
    
    await pool.execute(
      `UPDATE visits SET keluhan=?, diagnosa=?, tindakan=?, status=? WHERE id=?`,
      [keluhan || null, diagnosa || null, tindakan || null, status || 'completed', id]
    );
    
    await logAudit(req, 'update', 'visits', id, `Kunjungan diupdate ID: ${id}`);
    logger.info(`Visit updated: ${id}`);
    
    res.json({ success: true, message: 'Data kunjungan berhasil diupdate!' });
  } catch (error) {
    logger.error('Update visit error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      success: false,
      message: 'Gagal mengupdate data rekam medis',
      error: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

/**
 * DELETE /api/visits/:id
 * Delete visit
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute(`DELETE FROM visits WHERE id=?`, [id]);
    
    await logAudit(req, 'delete', 'visits', id, `Kunjungan dihapus ID: ${id}`);
    logger.info(`Visit deleted: ${id}`);
    
    res.json({ success: true, message: 'Kunjungan dihapus!' });
  } catch (error) {
    logger.error('Delete visit error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      success: false,
      message: 'Gagal menghapus rekam medis',
      error: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

module.exports = router;
