-- Tabel untuk Custom Website Settings
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_name VARCHAR(100) DEFAULT 'Klinik Sehat',
  clinic_address TEXT,
  browser_title VARCHAR(150) DEFAULT 'Sistem Informasi Klinik',
  logo_url VARCHAR(255),
  favicon_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default data jika belum ada
INSERT INTO settings (clinic_name, clinic_address, browser_title, logo_url, favicon_url)
SELECT 'Klinik Sehat', '', 'Sistem Informasi Klinik', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);
