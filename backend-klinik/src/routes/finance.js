const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const logAudit = require('../middleware/auditLogger');
const logger = require('../utils/logger');
const { transactionValidation } = require('../middleware/validators');

// Simple in-memory cache
const financeCache = new Map();
const CACHE_TTL = 60000; // 1 minute

/**
 * GET /api/finance
 * Get financial transactions
 */
router.get('/', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: 'Month is required' });
    }
    
    const cacheKey = `finance_${month}`;
    
    // Check cache
    const cached = financeCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return res.json(cached.data);
    }
    
    const sql = `SELECT 
      t.id, t.tipe, t.kategori, t.keterangan, t.tanggal_transaksi,
      t.total_biaya_konsultasi, t.total_biaya_obat, t.grand_total, t.metode_bayar,
      v.tanggal_kunjungan, v.id as visit_id,
      p.nama_pasien, p.no_rm
      FROM transactions t
      LEFT JOIN visits v ON t.visit_id = v.id
      LEFT JOIN patients p ON v.patient_id = p.id
      WHERE DATE_FORMAT(COALESCE(t.tanggal_transaksi, v.tanggal_kunjungan), '%Y-%m') = ?
      ORDER BY COALESCE(t.tanggal_transaksi, v.tanggal_kunjungan) DESC`;
    
    const [results] = await pool.execute(sql, [month]);
    
    // Calculate summaries
    const pemasukan = results.filter(r => r.tipe === 'pemasukan');
    const pengeluaran = results.filter(r => r.tipe === 'pengeluaran');
    const totalPemasukan = pemasukan.reduce((sum, r) => sum + parseFloat(r.grand_total || 0), 0);
    const totalPengeluaran = pengeluaran.reduce((sum, r) => sum + parseFloat(r.grand_total || 0), 0);
    
    // Build calendar data
    const calendarData = {};
    results.forEach(r => {
      const tanggal = new Date(r.tanggal_transaksi || r.tanggal_kunjungan).toISOString().split('T')[0];
      if (!calendarData[tanggal]) calendarData[tanggal] = { pemasukan: 0, pengeluaran: 0 };
      if (r.tipe === 'pemasukan') {
        calendarData[tanggal].pemasukan += parseFloat(r.grand_total || 0);
      } else {
        calendarData[tanggal].pengeluaran += parseFloat(r.grand_total || 0);
      }
    });
    
    const result = {
      data: results,
      pemasukan,
      pengeluaran,
      calendar: calendarData,
      total_pemasukan: totalPemasukan,
      total_pengeluaran: totalPengeluaran,
      saldo: totalPemasukan - totalPengeluaran,
      total: results.length,
      page: 1,
      limit: results.length
    };
    
    // Cache the result
    financeCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
    
    res.json(result);
  } catch (error) {
    logger.error('Get finance error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/finance/manual
 * Create manual transaction
 */
router.post('/manual', transactionValidation.create, async (req, res) => {
  try {
    const { tipe, kategori, keterangan, jumlah, tanggal } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO transactions (tipe, kategori, keterangan, grand_total, tanggal_transaksi, status_pembayaran, metode_bayar) VALUES (?, ?, ?, ?, ?, 'lunas', '-')`,
      [tipe, kategori, keterangan || null, jumlah, tanggal]
    );
    
    // Clear cache
    financeCache.clear();
    
    await logAudit(req, 'create', 'transactions', result.insertId, `${tipe}: ${kategori} - Rp ${jumlah}`);
    logger.info(`Manual transaction created: ${tipe} ${kategori}`);
    
    res.json({ success: true, message: 'Transaksi berhasil ditambahkan!' });
  } catch (error) {
    logger.error('Create transaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/finance/:id
 * Delete transaction
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute(`DELETE FROM transactions WHERE id=?`, [id]);
    
    // Clear cache
    financeCache.clear();
    
    await logAudit(req, 'delete', 'transactions', id, `Transaksi dihapus ID: ${id}`);
    logger.info(`Transaction deleted: ${id}`);
    
    res.json({ success: true, message: 'Transaksi dihapus!' });
  } catch (error) {
    logger.error('Delete transaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
