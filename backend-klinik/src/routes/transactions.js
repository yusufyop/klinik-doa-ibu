const express = require('express');
const db = require('../config/database');
const logAudit = require('../utils/auditLogger');
const { invalidateCache } = require('../utils/cache');

const router = express.Router();

// POST /api/transactions
router.post('/transactions', (req, res) => {
  const { visit_id, total_biaya_konsultasi, total_biaya_obat, grand_total, metode_bayar } = req.body;
  
  db.query(
    `INSERT INTO transactions (visit_id, tipe, kategori, total_biaya_konsultasi, total_biaya_obat, grand_total, status_pembayaran, metode_bayar, tanggal_transaksi) VALUES (?, 'pemasukan', 'Rekam Medis', ?, ?, ?, 'lunas', ?, CURDATE())`,
    [visit_id, total_biaya_konsultasi, total_biaya_obat, grand_total, metode_bayar],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.query(`UPDATE visits SET status='sudah_bayar' WHERE id=?`, [visit_id], () => {
        invalidateCache('finance');
        logAudit(req, 'create', 'transactions', visit_id, `Pembayaran RM: Rp ${grand_total}`);
        res.json({ success: true, message: 'Pembayaran berhasil!' });
      });
    }
  );
});

module.exports = router;
