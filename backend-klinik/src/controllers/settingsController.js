const db = require('../config/database');

// Get all settings
exports.getSettings = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM settings LIMIT 1');
        if (rows.length === 0) {
            // Return default jika belum ada data
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
};

// Update settings
exports.updateSettings = async (req, res) => {
    const { clinic_name, clinic_address, browser_title, logo_url, favicon_url } = req.body;

    try {
        // Cek apakah data sudah ada
        const [existing] = await db.query('SELECT id FROM settings LIMIT 1');

        if (existing.length > 0) {
            // Update data yang ada
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
            // Insert data baru jika belum ada
            await db.query(
                `INSERT INTO settings (clinic_name, clinic_address, browser_title, logo_url, favicon_url) 
                VALUES (?, ?, ?, ?, ?)`,
                [clinic_name, clinic_address, browser_title, logo_url, favicon_url]
            );
        }

        res.json({ message: 'Pengaturan berhasil diperbarui' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Gagal memperbarui pengaturan', error: error.message });
    }
};
