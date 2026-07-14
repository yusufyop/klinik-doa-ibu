const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const logAudit = require('../middleware/auditLogger');
const logger = require('../utils/logger');

/**
 * GET /api/prescriptions
 * Get prescriptions for a visit
 */
router.get('/', async (req, res) => {
  try {
    const { visit_id } = req.query;
    
    if (!visit_id) {
      return res.status(400).json({ error: 'Visit ID is required' });
    }
    
    const [results] = await pool.execute(
      `SELECT pr.*, m.nama_obat, m.harga_satuan 
       FROM prescriptions pr 
       JOIN medicines m ON pr.medicine_id = m.id 
       WHERE pr.visit_id = ?`,
      [visit_id]
    );
    
    res.json(results);
  } catch (error) {
    logger.error('Get prescriptions error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      success: false,
      message: 'Gagal memuat data resep',
      error: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/prescriptions
 * Create prescription with transaction for stock update
 */
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { visit_id, medicine_id, jumlah, dosis } = req.body;
    
    // Validate input
    if (!visit_id || !medicine_id || !jumlah) {
      return res.status(400).json({ error: 'Visit ID, Medicine ID, and quantity are required' });
    }
    
    await connection.beginTransaction();
    
    // Check medicine stock
    const [medicineRows] = await connection.execute(
      `SELECT stok, harga_satuan FROM medicines WHERE id = ? FOR UPDATE`,
      [medicine_id]
    );
    
    if (medicineRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Obat tidak ditemukan' });
    }
    
    const currentStock = medicineRows[0].stok;
    if (currentStock < jumlah) {
      await connection.rollback();
      return res.status(400).json({ error: 'Stok obat tidak mencukupi' });
    }
    
    // Insert prescription
    const [result] = await connection.execute(
      `INSERT INTO prescriptions (visit_id, medicine_id, jumlah, dosis) VALUES (?, ?, ?, ?)`,
      [visit_id, medicine_id, jumlah, dosis || null]
    );
    
    // Update medicine stock (atomic operation within transaction)
    await connection.execute(
      `UPDATE medicines SET stok = stok - ? WHERE id = ?`,
      [jumlah, medicine_id]
    );
    
    await connection.commit();
    
    await logAudit(req, 'create', 'prescriptions', result.insertId, `Resep dibuat untuk visit ID: ${visit_id}`);
    logger.info(`Prescription created for visit: ${visit_id}`);
    
    res.json({ success: true, message: 'Resep berhasil ditambahkan!', prescription_id: result.insertId });
  } catch (error) {
    await connection.rollback();
    logger.error('Create prescription error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      success: false,
      message: 'Gagal menambahkan resep',
      error: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/prescriptions/:id
 * Delete prescription and restore stock
 */
router.delete('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    
    await connection.beginTransaction();
    
    // Get prescription details
    const [prescriptionRows] = await connection.execute(
      `SELECT medicine_id, jumlah FROM prescriptions WHERE id = ?`,
      [id]
    );
    
    if (prescriptionRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Resep tidak ditemukan' });
    }
    
    const { medicine_id, jumlah } = prescriptionRows[0];
    
    // Restore medicine stock
    await connection.execute(
      `UPDATE medicines SET stok = stok + ? WHERE id = ?`,
      [jumlah, medicine_id]
    );
    
    // Delete prescription
    await connection.execute(`DELETE FROM prescriptions WHERE id = ?`, [id]);
    
    await connection.commit();
    
    await logAudit(req, 'delete', 'prescriptions', id, `Resep dihapus ID: ${id}`);
    logger.info(`Prescription deleted: ${id}`);
    
    res.json({ success: true, message: 'Resep dihapus!' });
  } catch (error) {
    await connection.rollback();
    logger.error('Delete prescription error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      success: false,
      message: 'Gagal menghapus resep',
      error: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
