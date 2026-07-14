const express = require('express');
const db = require('../config/database');
const logAudit = require('../utils/auditLogger');
const paginate = require('../middlewares/pagination');
const { clean, formatDate } = require('../utils/helpers');

const router = express.Router();

// GET /api/patients
router.get('/patients', paginate, (req, res) => {
  const { search, search_type } = req.pagination;
  const { limit, offset } = req.pagination;
  
  let sql = `SELECT * FROM patients WHERE 1=1`;
  let countSql = `SELECT COUNT(*) as total FROM patients WHERE 1=1`;
  const params = [];
  const countParams = [];
  
  if (search) {
    if (search_type === 'nama') {
      sql += ` AND nama_pasien LIKE ?`;
      countSql += ` AND nama_pasien LIKE ?`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    } else if (search_type === 'nik') {
      sql += ` AND nik LIKE ?`;
      countSql += ` AND nik LIKE ?`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    } else if (search_type === 'telp') {
      sql += ` AND no_telepon LIKE ?`;
      countSql += ` AND no_telepon LIKE ?`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }
  }
  
  sql += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  db.query(countSql, countParams, (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.query(sql, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        data: results,
        total: countResult[0].total,
        page: req.pagination.page,
        limit
      });
    });
  });
});

// POST /api/patients
router.post('/patients', (req, res) => {
  const { nama_pasien, nik, kota_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, golongan_darah, riwayat_alergi, kontak_darurat_nama, kontak_darurat_telp } = req.body;
  
  db.query('SELECT MAX(id) as max_id FROM patients', (e, result) => {
    let nextId = 1;
    if (result[0].max_id) nextId = result[0].max_id + 1;
    const no_rm = `RM-${String(nextId).padStart(8, '0')}`;
    
    db.query(
      `INSERT INTO patients (no_rm, nama_pasien, nik, kota_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, golongan_darah, riwayat_alergi, kontak_darurat_nama, kontak_darurat_telp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [no_rm, nama_pasien, nik, clean(kota_lahir), formatDate(tanggal_lahir), jenis_kelamin, clean(alamat), clean(no_telepon), golongan_darah, clean(riwayat_alergi), clean(kontak_darurat_nama), clean(kontak_darurat_telp)],
      (e, result) => {
        if (e) return res.status(500).json({ error: e.message });
        logAudit(req, 'create', 'patients', result.insertId, `Pasien baru: ${nama_pasien} (${no_rm})`);
        res.json({ success: true, message: `Pasien didaftarkan. No RM: ${no_rm}` });
      }
    );
  });
});

// PUT /api/patients/:id
router.put('/patients/:id', (req, res) => {
  const { nama_pasien, nik, kota_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, golongan_darah, riwayat_alergi, kontak_darurat_nama, kontak_darurat_telp } = req.body;
  
  db.query(
    `UPDATE patients SET nama_pasien=?, nik=?, kota_lahir=?, tanggal_lahir=?, jenis_kelamin=?, alamat=?, no_telepon=?, golongan_darah=?, riwayat_alergi=?, kontak_darurat_nama=?, kontak_darurat_telp=? WHERE id=?`,
    [nama_pasien, nik, clean(kota_lahir), formatDate(tanggal_lahir), jenis_kelamin, clean(alamat), clean(no_telepon), golongan_darah, clean(riwayat_alergi), clean(kontak_darurat_nama), clean(kontak_darurat_telp), req.params.id],
    (e) => {
      if (e) return res.status(500).json({ error: e.message });
      logAudit(req, 'update', 'patients', req.params.id, `Profil diupdate: ${nama_pasien}`);
      res.json({ success: true, message: 'Profil diupdate!' });
    }
  );
});

// DELETE /api/patients/:id
router.delete('/patients/:id', (req, res) => {
  db.query(`DELETE FROM patients WHERE id=?`, [req.params.id], (e) => {
    if (e) return res.status(500).json({ error: e.message });
    logAudit(req, 'delete', 'patients', req.params.id, `Pasien dihapus ID: ${req.params.id}`);
    res.json({ success: true, message: 'Pasien dihapus!' });
  });
});

module.exports = router;
