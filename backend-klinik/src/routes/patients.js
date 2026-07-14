const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const logAudit = require('../middleware/auditLogger');
const logger = require('../utils/logger');
const { patientValidation } = require('../middleware/validators');

/**
 * GET /api/patients
 * Get patients with pagination and search
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      search_type = 'nama' 
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    const countParams = [];
    
    if (search) {
      if (search_type === 'nama') {
        whereClause += ' AND nama_pasien LIKE ?';
      } else if (search_type === 'nik') {
        whereClause += ' AND nik LIKE ?';
      } else if (search_type === 'telp') {
        whereClause += ' AND no_telepon LIKE ?';
      }
      const searchTerm = `%${search}%`;
      params.push(searchTerm);
      countParams.push(searchTerm);
    }
    
    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM patients ${whereClause}`,
      countParams
    );
    
    // Get paginated results
    params.push(parseInt(limit), offset);
    const [results] = await pool.execute(
      `SELECT * FROM patients ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      params
    );
    
    res.json({
      data: results,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Get patients error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      success: false,
      message: 'Gagal memuat data pasien',
      error: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/patients
 * Create new patient
 */
router.post('/', patientValidation.create, async (req, res) => {
  try {
    const { 
      nama_pasien, nik, kota_lahir, tanggal_lahir, jenis_kelamin, 
      alamat, no_telepon, golongan_darah, riwayat_alergi, 
      kontak_darurat_nama, kontak_darurat_telp 
    } = req.body;
    
    // Generate medical record number
    const [maxIdResult] = await pool.execute('SELECT MAX(id) as max_id FROM patients');
    const nextId = maxIdResult[0].max_id ? maxIdResult[0].max_id + 1 : 1;
    const no_rm = `RM-${String(nextId).padStart(8, '0')}`;
    
    const clean = (val) => (val === '' || val === undefined || val === null ? null : val);
    const formatDate = (date) => date ? new Date(date).toISOString().split('T')[0] : null;
    
    const [result] = await pool.execute(
      `INSERT INTO patients (no_rm, nama_pasien, nik, kota_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, golongan_darah, riwayat_alergi, kontak_darurat_nama, kontak_darurat_telp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [no_rm, nama_pasien, nik, clean(kota_lahir), formatDate(tanggal_lahir), jenis_kelamin, clean(alamat), clean(no_telepon), golongan_darah, clean(riwayat_alergi), clean(kontak_darurat_nama), clean(kontak_darurat_telp)]
    );
    
    await logAudit(req, 'create', 'patients', result.insertId, `Pasien baru: ${nama_pasien} (${no_rm})`);
    logger.info(`Patient created: ${nama_pasien}`);
    
    res.json({ success: true, message: 'Pasien berhasil ditambahkan!', no_rm });
  } catch (error) {
    logger.error('Create patient error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      success: false,
      message: 'Gagal menambahkan pasien',
      error: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

/**
 * PUT /api/patients/:id
 * Update patient
 */
router.put('/:id', patientValidation.update, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nama_pasien, nik, kota_lahir, tanggal_lahir, jenis_kelamin, 
      alamat, no_telepon, golongan_darah, riwayat_alergi, 
      kontak_darurat_nama, kontak_darurat_telp 
    } = req.body;
    
    const clean = (val) => (val === '' || val === undefined || val === null ? null : val);
    const formatDate = (date) => date ? new Date(date).toISOString().split('T')[0] : null;
    
    await pool.execute(
      `UPDATE patients SET nama_pasien=?, nik=?, kota_lahir=?, tanggal_lahir=?, jenis_kelamin=?, alamat=?, no_telepon=?, golongan_darah=?, riwayat_alergi=?, kontak_darurat_nama=?, kontak_darurat_telp=? WHERE id=?`,
      [nama_pasien, nik, clean(kota_lahir), formatDate(tanggal_lahir), jenis_kelamin, clean(alamat), clean(no_telepon), golongan_darah, clean(riwayat_alergi), clean(kontak_darurat_nama), clean(kontak_darurat_telp), id]
    );
    
    await logAudit(req, 'update', 'patients', id, `Pasien diupdate: ${nama_pasien}`);
    logger.info(`Patient updated: ${id}`);
    
    res.json({ success: true, message: 'Data pasien berhasil diupdate!' });
  } catch (error) {
    logger.error('Update patient error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      success: false,
      message: 'Gagal mengupdate data pasien',
      error: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

/**
 * DELETE /api/patients/:id
 * Delete patient
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute(`DELETE FROM patients WHERE id=?`, [id]);
    
    await logAudit(req, 'delete', 'patients', id, `Pasien dihapus ID: ${id}`);
    logger.info(`Patient deleted: ${id}`);
    
    res.json({ success: true, message: 'Pasien dihapus!' });
  } catch (error) {
    logger.error('Delete patient error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      success: false,
      message: 'Gagal menghapus pasien',
      error: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

module.exports = router;
