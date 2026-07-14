const express = require('express');
const mysql = require('mysql2');
// const cors = require('cors');
require('dotenv').config();

const app = express();

// 🌟 CORS CONFIGURATION 🌟
const cors = require('cors');

// Konfigurasi CORS yang lebih permisif
app.use(cors({
  origin: true, // Izinkan semua origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Name', 'X-User-Role']
}));

// Handle preflight request
app.options('*', cors());

app.use(express.json());

// 🌟 DATABASE CONNECTION 🌟
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 4000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false
});

db.connect(err => {
  if (err) {
    console.error('❌ Gagal konek MySQL:', err);
    process.exit(1);
  } else {
    console.log('✅ Konek MySQL Sukses!');
  }
});

// 🌟 HELPER FUNCTIONS 🌟
const clean = (val) => (val === '' || val === undefined || val === null ? null : val);
const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
};

// 🌟 AUDIT LOG FUNCTION 🌟
const logAudit = (req, action_type, target_table, target_id, description) => {
  const user_id = req.headers['x-user-id'] || null;
  const user_name = req.headers['x-user-name'] || 'Guest';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  db.query(
    `INSERT INTO audit_logs (user_id, user_name, action_type, target_table, target_id, description, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user_id, user_name, action_type, target_table, target_id, description, ip],
    (err) => {
      if (err) console.error('Audit log error:', err);
    }
  );
};

// 🌟 SIMPLE IN-MEMORY CACHE 🌟
const cache = new Map();

const setCache = (key, data, ttlSeconds = 60) => {
  cache.set(key, { data, expiry: Date.now() + (ttlSeconds * 1000) });
};

const getCache = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.data;
};

const invalidateCache = (pattern) => {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) cache.delete(key);
  }
};

// 🌟 PAGINATION HELPER 🌟
const paginate = (req, res, next) => {
  req.pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    search: req.query.search || '',
    search_type: req.query.search_type || 'nama'
  };
  req.pagination.offset = (req.pagination.page - 1) * req.pagination.limit;
  next();
};

// ============================================
// 🔐 AUTHENTICATION
// ============================================

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  db.query(`SELECT * FROM users WHERE username = ? AND password_hash = ?`, [username, password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (results.length === 0) {
      db.query(
        `INSERT INTO audit_logs (user_name, action_type, target_table, description, ip_address) VALUES (?, ?, ?, ?, ?)`,
        [username, 'login', 'users', `Login gagal: ${username}`, ip]
      );
      return res.status(401).json({ success: false, message: 'Username/Password salah!' });
    }
    
    const user = results[0];
    db.query(
      `INSERT INTO audit_logs (user_id, user_name, action_type, target_table, target_id, description, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.nama_lengkap, 'login', 'users', user.id, `Login berhasil`, ip]
    );
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.nama_lengkap,
        role: user.role
      }
    });
  });
});

// ============================================
// 📊 AUDIT LOG
// ============================================

app.get('/api/audit-logs', paginate, (req, res) => {
  const { user_id, action_type, start_date, end_date } = req.query;
  const { limit, offset } = req.pagination;
  
  let sql = `SELECT * FROM audit_logs WHERE 1=1`;
  let countSql = `SELECT COUNT(*) as total FROM audit_logs WHERE 1=1`;
  const params = [];
  const countParams = [];
  
  if (user_id) {
    sql += ` AND user_id = ?`;
    countSql += ` AND user_id = ?`;
    params.push(user_id);
    countParams.push(user_id);
  }
  if (action_type) {
    sql += ` AND action_type = ?`;
    countSql += ` AND action_type = ?`;
    params.push(action_type);
    countParams.push(action_type);
  }
  if (start_date) {
    sql += ` AND DATE(created_at) >= ?`;
    countSql += ` AND DATE(created_at) >= ?`;
    params.push(start_date);
    countParams.push(start_date);
  }
  if (end_date) {
    sql += ` AND DATE(created_at) <= ?`;
    countSql += ` AND DATE(created_at) <= ?`;
    params.push(end_date);
    countParams.push(end_date);
  }
  
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
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

// ============================================
// 👥 USER MANAGEMENT
// ============================================

app.get('/api/users', (req, res) => {
  // 🌟 CACHE USERS (TTL 2 menit) 🌟
  const cached = getCache('users');
  if (cached) return res.json(cached);
  
  db.query('SELECT id, nama_lengkap, username, role FROM users ORDER BY id', (e, r) => {
    if (e) return res.status(500).json({ error: e.message });
    setCache('users', r, 120);
    res.json(r);
  });
});

app.post('/api/users', (req, res) => {
  const { nama_lengkap, username, password, role } = req.body;
  
  if (!nama_lengkap || !username || !password || !role) {
    return res.status(400).json({ error: 'Semua field wajib diisi!' });
  }
  
  db.query(`SELECT id FROM users WHERE username = ?`, [username], (e, existing) => {
    if (e) return res.status(500).json({ error: e.message });
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username sudah terdaftar!' });
    }
    
    db.query(
      `INSERT INTO users (nama_lengkap, username, password_hash, role) VALUES (?, ?, ?, ?)`,
      [nama_lengkap, username, password, role],
      (e, result) => {
        if (e) return res.status(500).json({ error: e.message });
        invalidateCache('users');
        logAudit(req, 'create', 'users', result.insertId, `User baru: ${nama_lengkap} (${role})`);
        res.json({ success: true, message: 'User berhasil dibuat!' });
      }
    );
  });
});

app.put('/api/users/:id', (req, res) => {
  const { nama_lengkap, username, role } = req.body;
  
  db.query(
    `UPDATE users SET nama_lengkap=?, username=?, role=? WHERE id=?`,
    [nama_lengkap, username, role, req.params.id],
    (e) => {
      if (e) return res.status(500).json({ error: e.message });
      invalidateCache('users');
      logAudit(req, 'update', 'users', req.params.id, `User diupdate: ${nama_lengkap}`);
      res.json({ success: true, message: 'User diupdate!' });
    }
  );
});

app.put('/api/users/:id/password', (req, res) => {
  const { new_password } = req.body;
  const admin_role = req.headers['x-user-role'];
  
  if (admin_role !== 'admin') {
    return res.status(403).json({ error: 'Hanya admin yang bisa reset password!' });
  }
  
  if (!new_password || new_password.length < 4) {
    return res.status(400).json({ error: 'Password minimal 4 karakter!' });
  }
  
  db.query(`UPDATE users SET password_hash=? WHERE id=?`, [new_password, req.params.id], (e) => {
    if (e) return res.status(500).json({ error: e.message });
    logAudit(req, 'update', 'users', req.params.id, `Password direset untuk user ID: ${req.params.id}`);
    res.json({ success: true, message: 'Password berhasil direset!' });
  });
});

app.delete('/api/users/:id', (req, res) => {
  db.query(`DELETE FROM users WHERE id=?`, [req.params.id], (e) => {
    if (e) return res.status(500).json({ error: e.message });
    invalidateCache('users');
    logAudit(req, 'delete', 'users', req.params.id, `User dihapus ID: ${req.params.id}`);
    res.json({ success: true, message: 'User dihapus!' });
  });
});

// ============================================
// 📊 DASHBOARD STATS
// ============================================

app.get('/api/dashboard/stats', (req, res) => {
  const { tanggal } = req.query;
  const filterDate = tanggal || new Date().toISOString().split('T')[0];
  const cacheKey = `dashboard_${filterDate}`;
  
  // 🌟 CACHE DASHBOARD (TTL 30 detik) 🌟
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

// ============================================
// 💰 KEUANGAN
// ============================================

app.get('/api/finance', (req, res) => {
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

app.post('/api/finance/manual', (req, res) => {
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

app.delete('/api/finance/:id', (req, res) => {
  db.query(`DELETE FROM transactions WHERE id=?`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    invalidateCache('finance');
    logAudit(req, 'delete', 'transactions', req.params.id, `Transaksi dihapus ID: ${req.params.id}`);
    res.json({ success: true, message: 'Transaksi dihapus!' });
  });
});

// ============================================
// 🏥 PASIEN
// ============================================

app.get('/api/patients', paginate, (req, res) => {
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

app.post('/api/patients', (req, res) => {
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

app.put('/api/patients/:id', (req, res) => {
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

app.delete('/api/patients/:id', (req, res) => {
  db.query(`DELETE FROM patients WHERE id=?`, [req.params.id], (e) => {
    if (e) return res.status(500).json({ error: e.message });
    logAudit(req, 'delete', 'patients', req.params.id, `Pasien dihapus ID: ${req.params.id}`);
    res.json({ success: true, message: 'Pasien dihapus!' });
  });
});

// ============================================
// 📋 MEDICAL RECORDS
// ============================================

app.get('/api/all-medical-records', paginate, (req, res) => {
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
        const d = new Date(row.tanggal_kunjungan);
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
        row.tanggal_formatted = formatted;
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

app.get('/api/patients/:id/history', (req, res) => {
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
        const d = new Date(row.tanggal_kunjungan);
        const options = { 
          timeZone: 'Asia/Jakarta', 
          day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit', hour12: false 
        };
        let formatted = new Intl.DateTimeFormat('en-GB', options).format(d);
        formatted = formatted.replace(',', '').replace(':', '.') + ' WIB';
        
        map[row.visit_id] = {
          visit_id: row.visit_id,
          tanggal: formatted,
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
      
      // 🌟 TAMBAHKAN medicine_id KE RESPONSE 🌟
      if (row.prescription_id) {
        map[row.visit_id].obat.push({
          medicine_id: row.medicine_id, // ← INI YANG HILANG!
          nama: row.nama_obat,
          jumlah: row.jumlah,
          aturan: row.aturan_pakai
        });
      }
    });
    
    res.json(Object.values(map));
  });
});

app.post('/api/examination', (req, res) => {
  const { patient_id, dokter_id, keluhan, tensi, suhu, nadi, napas, berat, tinggi, catatan_fisik, diagnosa, catatan, obat_list, status } = req.body;
  const pid = parseInt(patient_id);
  const did = parseInt(dokter_id) || 1;
  const wibDate = new Date();
  
  db.query(
    `INSERT INTO visits (patient_id, doctor_id, tanggal_kunjungan, keluhan_utama, status) VALUES (?, ?, ?, ?, ?)`,
    [pid, did, wibDate, clean(keluhan), status || 'mengantri'],
    (err, visitRes) => {
      if (err) return res.status(500).json({ error: err.message });
      const visitId = visitRes.insertId;
      
      db.query(
        `INSERT INTO medical_records (visit_id, dokter_id, diagnosa_utama, tensi_darah, suhu_badan, nadi, pernapasan, berat_badan, tinggi_badan, catatan_fisik, catatan_dokter) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [visitId, did, clean(diagnosa), clean(tensi), clean(suhu), clean(nadi), clean(napas), clean(berat), clean(tinggi), clean(catatan_fisik), clean(catatan)],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          logAudit(req, 'create', 'visits', visitId, `Rekam medis baru untuk pasien ID ${pid}`);
          
          if (obat_list && obat_list.length > 0) {
            const insertPromises = obat_list.map(o => new Promise((resolve) => {
              const medId = parseInt(o.medicine_id);
              const jumlah = parseInt(o.jumlah) || 1;
              
              db.query(`SELECT id FROM medicines WHERE id = ?`, [medId], (err, medResult) => {
                if (err || medResult.length === 0) return resolve();
                
                db.query(
                  `INSERT INTO prescriptions (visit_id, medicine_id, jumlah, aturan_pakai) VALUES (?, ?, ?, ?)`,
                  [visitId, medId, jumlah, clean(o.aturan)],
                  (err) => {
                    if (err) return resolve();
                    db.query(`UPDATE medicines SET stok = stok - ? WHERE id = ?`, [jumlah, medId], () => {
                      invalidateCache('medicines');
                      resolve();
                    });
                  }
                );
              });
            }));
            
            Promise.all(insertPromises).then(() => {
              res.json({ success: true, message: 'Rekam medis disimpan!', visit_id: visitId });
            });
          } else {
            res.json({ success: true, message: 'Rekam medis disimpan!', visit_id: visitId });
          }
        }
      );
    }
  );
});

app.put('/api/examination/:visitId', async (req, res) => {
  try {
    const visitId = req.params.visitId;
    const { keluhan, tensi, suhu, nadi, napas, berat, tinggi, catatan_fisik, diagnosa, catatan, obat_list, status } = req.body;
    
    console.log('Updating examination:', { visitId, obat_list });
    
    // 1. Update visit
    await db.promise().query(
      `UPDATE visits SET keluhan_utama=?, status=? WHERE id=?`,
      [clean(keluhan), status || 'diperiksa', visitId]
    );
    
    // 2. Update medical record
    await db.promise().query(
      `UPDATE medical_records SET diagnosa_utama=?, tensi_darah=?, suhu_badan=?, nadi=?, pernapasan=?, berat_badan=?, tinggi_badan=?, catatan_fisik=?, catatan_dokter=? WHERE visit_id=?`,
      [clean(diagnosa), clean(tensi), clean(suhu), clean(nadi), clean(napas), clean(berat), clean(tinggi), clean(catatan_fisik), clean(catatan), visitId]
    );
    
    // 3. 🌟 HANYA UPDATE OBAT JIKA obat_list DIKIRIM & TIDAK KOSONG 🌟
    if (obat_list !== undefined && obat_list !== null) {
      console.log('Processing obat_list for update:', obat_list);
      
      // Restore stok obat lama
      const [oldPrescriptions] = await db.promise().query(
        `SELECT medicine_id, jumlah FROM prescriptions WHERE visit_id=?`,
        [visitId]
      );
      
      for (const p of oldPrescriptions) {
        await db.promise().query(
          `UPDATE medicines SET stok = stok + ? WHERE id = ?`,
          [p.jumlah, p.medicine_id]
        );
      }
      
      // Hapus prescriptions lama
      await db.promise().query(
        `DELETE FROM prescriptions WHERE visit_id=?`,
        [visitId]
      );
      
      // Insert prescriptions baru (hanya kalau ada)
      if (obat_list.length > 0) {
        for (const o of obat_list) {
          const medId = parseInt(o.medicine_id);
          const jumlah = parseInt(o.jumlah) || 1;
          
          if (!medId) {
            console.warn('Skip obat tanpa medicine_id:', o);
            continue;
          }
          
          // Cek obat ada
          const [medResult] = await db.promise().query(
            `SELECT id FROM medicines WHERE id = ?`,
            [medId]
          );
          
          if (medResult.length === 0) {
            console.warn(`Obat ID ${medId} tidak ditemukan, skip`);
            continue;
          }
          
          // Insert prescription
          await db.promise().query(
            `INSERT INTO prescriptions (visit_id, medicine_id, jumlah, aturan_pakai) VALUES (?, ?, ?, ?)`,
            [visitId, medId, jumlah, clean(o.aturan)]
          );
          
          // Update stok
          await db.promise().query(
            `UPDATE medicines SET stok = stok - ? WHERE id = ?`,
            [jumlah, medId]
          );
        }
      }
      
      invalidateCache('medicines');
    }
    
    logAudit(req, 'update', 'visits', visitId, `Rekam medis dikoreksi`);
    
    res.json({ success: true, message: 'Rekam medis dikoreksi!' });
    
  } catch (err) {
    console.error('Error updating examination:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 💳 TRANSACTIONS
// ============================================

app.post('/api/transactions', (req, res) => {
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

// ============================================
// 💊 MEDICINES
// ============================================

app.get('/api/medicines', paginate, (req, res) => {
  const { search } = req.pagination;
  const { limit, offset } = req.pagination;
  
  // 🌟 CACHE LIST OBAT (TTL 30 detik) 🌟
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

app.post('/api/medicines', (req, res) => {
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

app.put('/api/medicines/:id', (req, res) => {
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

app.delete('/api/medicines/:id', (req, res) => {
  db.query(`DELETE FROM medicines WHERE id=?`, [req.params.id], (e) => {
    if (e) return res.status(500).json({ error: e.message });
    invalidateCache('medicines');
    logAudit(req, 'delete', 'medicines', req.params.id, `Obat dihapus ID: ${req.params.id}`);
    res.json({ success: true, message: 'Obat dihapus!' });
  });
});

// ============================================
// ⚙️ SETTINGS
// ============================================

app.get('/api/settings', (req, res) => {
  db.query('SELECT * FROM settings LIMIT 1', (err, results) => {
    if (err) return res.status(500).json({ message: 'Gagal mengambil pengaturan', error: err.message });
    
    if (results.length === 0) {
      // Return default jika belum ada data
      return res.json({
        clinic_name: 'Klinik Sehat',
        clinic_address: '',
        browser_title: 'Sistem Informasi Klinik',
        logo_url: null,
        favicon_url: null
      });
    }
    res.json(results[0]);
  });
});

app.put('/api/settings', (req, res) => {
  const { clinic_name, clinic_address, browser_title, logo_url, favicon_url } = req.body;

  db.query('SELECT id FROM settings LIMIT 1', (err, existing) => {
    if (err) return res.status(500).json({ message: 'Gagal memperbarui pengaturan', error: err.message });

    if (existing.length > 0) {
      // Update data yang ada
      db.query(
        `UPDATE settings SET 
        clinic_name = ?, 
        clinic_address = ?, 
        browser_title = ?, 
        logo_url = ?, 
        favicon_url = ? 
        WHERE id = ?`,
        [clinic_name, clinic_address, browser_title, logo_url, favicon_url, existing[0].id],
        (err) => {
          if (err) return res.status(500).json({ message: 'Gagal memperbarui pengaturan', error: err.message });
          res.json({ message: 'Pengaturan berhasil diperbarui' });
        }
      );
    } else {
      // Insert data baru jika belum ada
      db.query(
        `INSERT INTO settings (clinic_name, clinic_address, browser_title, logo_url, favicon_url) 
        VALUES (?, ?, ?, ?, ?)`,
        [clinic_name, clinic_address, browser_title, logo_url, favicon_url],
        (err) => {
          if (err) return res.status(500).json({ message: 'Gagal memperbarui pengaturan', error: err.message });
          res.json({ message: 'Pengaturan berhasil diperbarui' });
        }
      );
    }
  });
});

// ============================================
// 🚀 START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend jalan di port ${PORT}`);
  console.log(`📊 Cache aktif dengan TTL bervariasi`);
  console.log(`🔒 CORS enabled untuk localhost & IP lokal`);
});

// 🌟 CACHE MONITORING 🌟
app.get('/api/cache-stats', (req, res) => {
  res.json({
    cacheSize: cache.size,
    cacheKeys: Array.from(cache.keys())
  });
});


