const express = require('express');
const db = require('../config/database');
const logAudit = require('../utils/auditLogger');
const paginate = require('../middlewares/pagination');
const { clean, formatDate } = require('../utils/helpers');
const { setCache, getCache, invalidateCache } = require('../utils/cache');

const router = express.Router();

// GET /api/medicines
router.get('/medicines', paginate, (req, res) => {
  const { search } = req.pagination;
  const { limit, offset } = req.pagination;
  
  const cacheKey = `medicines_${search}_${limit}_${offset}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);
  
  let sql = `SELECT * FROM medicines WHERE 1=1`;
  let countSql = `SELECT COUNT(*) as total FROM medicines WHERE 1=1`;
  const params = [];
  const countParams = [];
  
  if (search) {
    sql += ` AND nama_obat LIKE ?`;
    countSql += ` AND nama_obat LIKE ?`;
    params.push(`%${search}%`);
    countParams.push(`%${search}%`);
  }
  
  sql += ` ORDER BY nama_obat ASC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  db.query(countSql, countParams, (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.query(sql, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      const result = {
        data: results,
        total: countResult[0].total,
        page: req.pagination.page,
        limit
      };
      setCache(cacheKey, result, 30);
      res.json(result);
    });
  });
});

// POST /api/medicines
router.post('/medicines', (req, res) => {
  const { nama_obat, kategori, stok, harga_beli, harga_jual, tanggal_kedaluwarsa } = req.body;
  
  db.query('SELECT MAX(id) as max_id FROM medicines', (e, result) => {
    let nextId = 1;
    if (result[0].max_id) nextId = result[0].max_id + 1;
    const kode_obat = `OBT-${String(nextId).padStart(4, '0')}`;
    
    db.query(
      `INSERT INTO medicines (kode_obat, nama_obat, kategori, stok, harga_beli, harga_jual, tanggal_kedaluwarsa) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [kode_obat, nama_obat, clean(kategori), stok, harga_beli, harga_jual, formatDate(tanggal_kedaluwarsa)],
      (e, result) => {
        if (e) return res.status(500).json({ error: e.message });
        invalidateCache('medicines');
        logAudit(req, 'create', 'medicines', result.insertId, `Obat baru: ${nama_obat}`);
        res.json({ success: true, message: 'Obat ditambahkan!' });
      }
    );
  });
});

// PUT /api/medicines/:id
router.put('/medicines/:id', (req, res) => {
  const { nama_obat, kategori, stok, harga_beli, harga_jual, tanggal_kedaluwarsa } = req.body;
  
  db.query(
    `UPDATE medicines SET nama_obat=?, kategori=?, stok=?, harga_beli=?, harga_jual=?, tanggal_kedaluwarsa=? WHERE id=?`,
    [nama_obat, clean(kategori), stok, harga_beli, harga_jual, formatDate(tanggal_kedaluwarsa), req.params.id],
    (e) => {
      if (e) return res.status(500).json({ error: e.message });
      invalidateCache('medicines');
      logAudit(req, 'update', 'medicines', req.params.id, `Obat diupdate: ${nama_obat}`);
      res.json({ success: true, message: 'Obat diupdate!' });
    }
  );
});

// DELETE /api/medicines/:id
router.delete('/medicines/:id', (req, res) => {
  db.query(`DELETE FROM medicines WHERE id=?`, [req.params.id], (e) => {
    if (e) return res.status(500).json({ error: e.message });
    invalidateCache('medicines');
    logAudit(req, 'delete', 'medicines', req.params.id, `Obat dihapus ID: ${req.params.id}`);
    res.json({ success: true, message: 'Obat dihapus!' });
  });
});

module.exports = router;
