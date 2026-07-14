const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');

const router = express.Router();

// Konfigurasi multer untuk upload file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'settings-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|ico|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Hanya file gambar yang diperbolehkan (jpeg, jpg, png, ico, gif, webp)'));
        }
    }
});

// GET /api/settings - Get all settings
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM settings LIMIT 1');
        if (rows.length === 0) {
            return res.json({
                clinic_name: 'Klinik Sehat',
                clinic_address: '',
                browser_title: 'Sistem Informasi Klinik',
                logo_url: null,
                favicon_url: null
            });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Gagal mengambil pengaturan', error: error.message });
    }
});

// PUT /api/settings - Update settings dengan upload file
router.put('/', upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 }
]), async (req, res) => {
    const { clinic_name, clinic_address, browser_title, existing_logo, existing_favicon } = req.body;
    
    let logo_url = existing_logo || null;
    let favicon_url = existing_favicon || null;

    try {
        // Handle logo upload
        if (req.files.logo && req.files.logo[0]) {
            logo_url = `/uploads/${req.files.logo[0].filename}`;
        }

        // Handle favicon upload
        if (req.files.favicon && req.files.favicon[0]) {
            favicon_url = `/uploads/${req.files.favicon[0].filename}`;
        }

        // Cek apakah data sudah ada
        const [existing] = await db.query('SELECT id FROM settings LIMIT 1');

        if (existing.length > 0) {
            await db.query(
                `UPDATE settings SET 
                clinic_name = ?, 
                clinic_address = ?, 
                browser_title = ?, 
                logo_url = ?, 
                favicon_url = ? 
                WHERE id = ?`,
                [clinic_name, clinic_address, browser_title, logo_url, favicon_url, existing[0].id]
            );
        } else {
            await db.query(
                `INSERT INTO settings (clinic_name, clinic_address, browser_title, logo_url, favicon_url) 
                VALUES (?, ?, ?, ?, ?)`,
                [clinic_name, clinic_address, browser_title, logo_url, favicon_url]
            );
        }

        res.json({ 
            message: 'Pengaturan berhasil diperbarui',
            logo_url,
            favicon_url
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Gagal memperbarui pengaturan', error: error.message });
    }
});

module.exports = router;
