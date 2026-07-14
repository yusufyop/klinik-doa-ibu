const express = require('express');
const db = require('../config/database');
const logAudit = require('../utils/auditLogger');
const paginate = require('../middlewares/pagination');
const { clean } = require('../utils/helpers');

const router = express.Router();

// Helper function to format date to WIB
const formatToWIB = (dateString) => {
  const d = new Date(dateString);
  const options = { 
    timeZone: 'Asia/Jakarta', 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  };
  let formatted = new Intl.DateTimeFormat('en-GB', options).format(d);
  formatted = formatted.replace(',', '').replace(':', '.') + ' WIB';
  return formatted;
};

// GET /api/all-medical-records
router.get('/all-medical-records', paginate, (req, res) => {
  const { status, doctor_id, start_date, end_date, sort_by = 'tanggal_kunjungan', sort_order = 'DESC' } = req.query;
  const { limit, offset } = req.pagination;
  
  let sql = `SELECT 
    v.id as visit_id, v.tanggal_kunjungan, v.keluhan_utama, v.status, v.doctor_id,
    p.nama_pasien, p.no_rm,
    u.nama_lengkap as nama_dokter,
    mr.diagnosa_utama, mr.tensi_darah, mr.suhu_badan, mr.nadi, mr.pernapasan, 
    mr.berat_badan, mr.tinggi_badan, mr.catatan_fisik, mr.catatan_dokter
    FROM visits v 
    JOIN patients p ON v.patient_id = p.id 
    JOIN users u ON v.doctor_id = u.id
    LEFT JOIN medical_records mr ON v.id = mr.visit_id 
    WHERE 1=1`;
  
  let countSql = `SELECT COUNT(*) as total FROM visits v WHERE 1=1`;
  const params = [];
  const countParams = [];
  
  if (status) {
    sql += ` AND v.status = ?`;
    countSql += ` AND v.status = ?`;
    params.push(status);
    countParams.push(status);
  }
  if (doctor_id) {
    sql += ` AND v.doctor_id = ?`;
    countSql += ` AND v.doctor_id = ?`;
    params.push(doctor_id);
    countParams.push(doctor_id);
  }
  if (start_date) {
    sql += ` AND DATE(v.tanggal_kunjungan) >= ?`;
    countSql += ` AND DATE(v.tanggal_kunjungan) >= ?`;
    params.push(start_date);
    countParams.push(start_date);
  }
  if (end_date) {
    sql += ` AND DATE(v.tanggal_kunjungan) <= ?`;
    countSql += ` AND DATE(v.tanggal_kunjungan) <= ?`;
    params.push(end_date);
    countParams.push(end_date);
  }
  
  const validSortColumns = ['tanggal_kunjungan', 'nama_pasien', 'nama_dokter', 'status', 'diagnosa_utama'];
  const sortColumn = validSortColumns.includes(sort_by) 
    ? (sort_by === 'nama_pasien' ? 'p.nama_pasien' 
      : sort_by === 'nama_dokter' ? 'u.nama_lengkap' 
      : sort_by === 'diagnosa_utama' ? 'mr.diagnosa_utama' 
      : `v.${sort_by}`)
    : 'v.tanggal_kunjungan';
  
  const order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${sortColumn} ${order} LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  db.query(countSql, countParams, (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.query(sql, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      
      results.forEach(row => {
        row.tanggal_formatted = formatToWIB(row.tanggal_kunjungan);
      });
      
      res.json({
        data: results,
        total: countResult[0].total,
        page: req.pagination.page,
        limit
      });
    });
  });
});

// GET /api/patients/:id/history
router.get('/patients/:id/history', (req, res) => {
  const sql = `SELECT 
    v.id as visit_id, v.tanggal_kunjungan, v.keluhan_utama, v.status, v.doctor_id,
    mr.diagnosa_utama, mr.tensi_darah, mr.suhu_badan, mr.nadi, mr.pernapasan, 
    mr.berat_badan, mr.tinggi_badan, mr.catatan_fisik, mr.catatan_dokter,
    p.id as prescription_id, p.medicine_id, m.nama_obat, p.jumlah, p.aturan_pakai,
    t.grand_total as total_pembayaran
    FROM visits v 
    LEFT JOIN medical_records mr ON v.id = mr.visit_id 
    LEFT JOIN prescriptions p ON v.id = p.visit_id 
    LEFT JOIN medicines m ON p.medicine_id = m.id
    LEFT JOIN transactions t ON v.id = t.visit_id
    WHERE v.patient_id = ? 
    ORDER BY v.tanggal_kunjungan DESC`;
  
  db.query(sql, [req.params.id], (e, results) => {
    if (e) return res.status(500).json({ error: e.message });
    
    const map = {};
    results.forEach(row => {
      if (!map[row.visit_id]) {
        map[row.visit_id] = {
          visit_id: row.visit_id,
          tanggal: formatToWIB(row.tanggal_kunjungan),
          keluhan: row.keluhan_utama,
          status: row.status,
          doctor_id: row.doctor_id,
          diagnosa: row.diagnosa_utama,
          tensi: row.tensi_darah,
          suhu: row.suhu_badan,
          nadi: row.nadi,
          napas: row.pernapasan,
          berat: row.berat_badan,
          tinggi: row.tinggi_badan,
          catatan_fisik: row.catatan_fisik,
          catatan: row.catatan_dokter,
          obat: [],
          total_pembayaran: row.total_pembayaran
        };
      }
      
      if (row.prescription_id) {
        map[row.visit_id].obat.push({
          medicine_id: row.medicine_id,
          nama: row.nama_obat,
          jumlah: row.jumlah,
          aturan: row.aturan_pakai
        });
      }
    });
    
    res.json(Object.values(map));
  });
});

module.exports = router;
