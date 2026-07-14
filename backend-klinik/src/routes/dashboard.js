const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const logger = require('../utils/logger');

// Simple in-memory cache
const dashboardCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const filterDate = req.query.tanggal || new Date().toISOString().split('T')[0];
    const cacheKey = `dashboard_${filterDate}`;
    
    // Check cache
    const cached = dashboardCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return res.json(cached.data);
    }
    
    // Get patient count for today
    const [patientCount] = await pool.execute(
      `SELECT COUNT(*) as count FROM visits WHERE DATE(tanggal_kunjungan) = ?`,
      [filterDate]
    );
    
    // Get top medicines
    const [topMedicines] = await pool.execute(
      `SELECT m.nama_obat, SUM(p.jumlah) as total 
       FROM prescriptions p 
       JOIN medicines m ON p.medicine_id = m.id 
       GROUP BY m.id 
       ORDER BY total DESC 
       LIMIT 5`
    );
    
    // Get patients per doctor
    const [doctorsStats] = await pool.execute(
      `SELECT u.nama_lengkap, COUNT(v.id) as total 
       FROM visits v 
       JOIN users u ON v.doctor_id = u.id 
       WHERE DATE(v.tanggal_kunjungan) = ? 
       GROUP BY u.id 
       ORDER BY total DESC`,
      [filterDate]
    );
    
    const result = {
      pasien_hari_ini: patientCount[0].count,
      obat_populer: topMedicines,
      pasien_per_dokter: doctorsStats
    };
    
    // Cache the result
    dashboardCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
    
    res.json(result);
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
