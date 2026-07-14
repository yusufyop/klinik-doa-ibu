const express = require('express');
const db = require('../config/database');
const { setCache, getCache } = require('../utils/cache');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/dashboard/stats', (req, res) => {
  const { tanggal } = req.query;
  const filterDate = tanggal || new Date().toISOString().split('T')[0];
  const cacheKey = `dashboard_${filterDate}`;
  
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);
  
  db.query(`SELECT COUNT(*) as count FROM visits WHERE DATE(tanggal_kunjungan) = ?`, [filterDate], (e, pR) => {
    if (e) return res.status(500).json({ error: e.message });
    
    db.query(
      `SELECT m.nama_obat, SUM(p.jumlah) as total FROM prescriptions p JOIN medicines m ON p.medicine_id = m.id GROUP BY m.id ORDER BY total DESC LIMIT 5`,
      (e, oR) => {
        if (e) return res.status(500).json({ error: e.message });
        
        db.query(
          `SELECT u.nama_lengkap, COUNT(v.id) as total FROM visits v JOIN users u ON v.doctor_id = u.id WHERE DATE(v.tanggal_kunjungan) = ? GROUP BY u.id ORDER BY total DESC`,
          [filterDate],
          (e, dR) => {
            if (e) return res.status(500).json({ error: e.message });
            
            const result = {
              pasien_hari_ini: pR[0].count,
              obat_populer: oR,
              pasien_per_dokter: dR
            };
            
            setCache(cacheKey, result, 30);
            res.json(result);
          }
        );
      }
    );
  });
});

module.exports = router;
