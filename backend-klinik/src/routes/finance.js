const express = require('express');
const db = require('../config/database');
const logAudit = require('../utils/auditLogger');
const { setCache, getCache, invalidateCache } = require('../utils/cache');
const { clean } = require('../utils/helpers');

const router = express.Router();

// GET /api/finance
router.get('/finance', (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'Month is required' });
  
  const cacheKey = `finance_${month}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);
  
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
  
  db.query(sql, [month], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const pemasukan = results.filter(r => r.tipe === 'pemasukan');
    const pengeluaran = results.filter(r => r.tipe === 'pengeluaran');
    const totalPemasukan = pemasukan.reduce((sum, r) => sum + parseFloat(r.grand_total || 0), 0);
    const totalPengeluaran = pengeluaran.reduce((sum, r) => sum + parseFloat(r.grand_total || 0), 0);
    
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
    
    setCache(cacheKey, result, 60);
    res.json(result);
  });
});

// POST /api/finance/manual
router.post('/finance/manual', (req, res) => {
  const { tipe, kategori, keterangan, jumlah, tanggal } = req.body;
  
  if (!tipe || !kategori || !jumlah || !tanggal) {
    return res.status(400).json({ error: 'Semua field wajib diisi!' });
  }
  
  db.query(
    `INSERT INTO transactions (tipe, kategori, keterangan, grand_total, tanggal_transaksi, status_pembayaran, metode_bayar) VALUES (?, ?, ?, ?, ?, 'lunas', '-')`,
    [tipe, kategori, clean(keterangan), jumlah, tanggal],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      invalidateCache('finance');
      logAudit(req, 'create', 'transactions', result.insertId, `${tipe}: ${kategori} - Rp ${jumlah}`);
      res.json({ success: true, message: 'Transaksi berhasil ditambahkan!' });
    }
  );
});

// DELETE /api/finance/:id
router.delete('/finance/:id', (req, res) => {
  db.query(`DELETE FROM transactions WHERE id=?`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    invalidateCache('finance');
    logAudit(req, 'delete', 'transactions', req.params.id, `Transaksi dihapus ID: ${req.params.id}`);
    res.json({ success: true, message: 'Transaksi dihapus!' });
  });
});

module.exports = router;
