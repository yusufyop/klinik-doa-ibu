const express = require('express');
const db = require('../config/database');
const logAudit = require('../utils/auditLogger');
const { clean, formatDate } = require('../utils/helpers');
const { invalidateCache } = require('../utils/cache');

const router = express.Router();

// POST /api/examination
router.post('/examination', (req, res) => {
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

// PUT /api/examination/:visitId
router.put('/examination/:visitId', async (req, res) => {
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
    
    // 3. Update obat only if obat_list is sent and not null/undefined
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

module.exports = router;
