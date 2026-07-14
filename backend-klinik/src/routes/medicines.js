const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const logAudit = require('../middleware/auditLogger');
const logger = require('../utils/logger');
const { medicineValidation } = require('../middleware/validators');

// Simple in-memory cache
const medicineCache = new Map();
const CACHE_TTL = 120000; // 2 minutes

/**
 * GET /api/medicines
 * Get all medicines
 */
router.get('/', async (req, res) => {
  try {
    // Check cache
    const cached = medicineCache.get('all');
    if (cached && Date.now() < cached.expiry) {
      return res.json(cached.data);
    }
    
    const [results] = await pool.execute(
      'SELECT * FROM medicines ORDER BY nama_obat'
    );
    
    // Cache the result
    medicineCache.set('all', { data: results, expiry: Date.now() + CACHE_TTL });
    
    res.json(results);
  } catch (error) {
    logger.error('Get medicines error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/medicines
 * Create new medicine
 */
router.post('/', medicineValidation.create, async (req, res) => {
  try {
    const { nama_obat, kategori, harga_satuan, stok, satuan } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO medicines (nama_obat, kategori, harga_satuan, stok, satuan) VALUES (?, ?, ?, ?, ?)`,
      [nama_obat, kategori || null, harga_satuan, stok, satuan || 'tablet']
    );
    
    // Clear cache
    medicineCache.clear();
    
    await logAudit(req, 'create', 'medicines', result.insertId, `Obat baru: ${nama_obat}`);
    logger.info(`Medicine created: ${nama_obat}`);
    
    res.json({ success: true, message: 'Obat berhasil ditambahkan!' });
  } catch (error) {
    logger.error('Create medicine error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/medicines/:id
 * Update medicine
 */
router.put('/:id', medicineValidation.update, async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_obat, kategori, harga_satuan, stok, satuan } = req.body;
    
    await pool.execute(
      `UPDATE medicines SET nama_obat=?, kategori=?, harga_satuan=?, stok=?, satuan=? WHERE id=?`,
      [nama_obat, kategori || null, harga_satuan, stok, satuan || 'tablet', id]
    );
    
    // Clear cache
    medicineCache.clear();
    
    await logAudit(req, 'update', 'medicines', id, `Obat diupdate: ${nama_obat}`);
    logger.info(`Medicine updated: ${id}`);
    
    res.json({ success: true, message: 'Data obat berhasil diupdate!' });
  } catch (error) {
    logger.error('Update medicine error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/medicines/:id
 * Delete medicine
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute(`DELETE FROM medicines WHERE id=?`, [id]);
    
    // Clear cache
    medicineCache.clear();
    
    await logAudit(req, 'delete', 'medicines', id, `Obat dihapus ID: ${id}`);
    logger.info(`Medicine deleted: ${id}`);
    
    res.json({ success: true, message: 'Obat dihapus!' });
  } catch (error) {
    logger.error('Delete medicine error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
