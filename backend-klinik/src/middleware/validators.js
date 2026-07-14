const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }
  next();
};

// User validation rules
const userValidation = {
  create: [
    body('nama_lengkap').trim().notEmpty().withMessage('Nama lengkap wajib diisi'),
    body('email').isEmail().normalizeEmail().withMessage('Email tidak valid'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    body('role').isIn(['admin', 'dokter', 'perawat', 'staff']).withMessage('Role tidak valid'),
    handleValidationErrors
  ],
  update: [
    param('id').isInt().withMessage('ID harus angka'),
    body('nama_lengkap').optional().trim().notEmpty().withMessage('Nama lengkap wajib diisi'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Email tidak valid'),
    body('role').optional().isIn(['admin', 'dokter', 'perawat', 'staff']).withMessage('Role tidak valid'),
    handleValidationErrors
  ],
  passwordReset: [
    param('id').isInt().withMessage('ID harus angka'),
    body('new_password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    handleValidationErrors
  ]
};

// Patient validation rules
const patientValidation = {
  create: [
    body('nama_pasien').trim().notEmpty().withMessage('Nama pasien wajib diisi'),
    body('jenis_kelamin').isIn(['L', 'P']).withMessage('Jenis kelamin harus L atau P'),
    body('no_telepon').optional().matches(/^[0-9+\-\s()]+$/).withMessage('Nomor telepon tidak valid'),
    body('golongan_darah').optional().isIn(['A', 'B', 'AB', 'O']).withMessage('Golongan darah tidak valid'),
    handleValidationErrors
  ],
  update: [
    param('id').isInt().withMessage('ID harus angka'),
    body('nama_pasien').optional().trim().notEmpty().withMessage('Nama pasien wajib diisi'),
    body('jenis_kelamin').optional().isIn(['L', 'P']).withMessage('Jenis kelamin harus L atau P'),
    handleValidationErrors
  ]
};

// Medicine validation rules
const medicineValidation = {
  create: [
    body('nama_obat').trim().notEmpty().withMessage('Nama obat wajib diisi'),
    body('kategori').optional().trim(),
    body('harga_satuan').isFloat({ min: 0 }).withMessage('Harga harus angka positif'),
    body('stok').isInt({ min: 0 }).withMessage('Stok harus angka non-negatif'),
    handleValidationErrors
  ],
  update: [
    param('id').isInt().withMessage('ID harus angka'),
    body('nama_obat').optional().trim().notEmpty().withMessage('Nama obat wajib diisi'),
    body('harga_satuan').optional().isFloat({ min: 0 }).withMessage('Harga harus angka positif'),
    body('stok').optional().isInt({ min: 0 }).withMessage('Stok harus angka non-negatif'),
    handleValidationErrors
  ]
};

// Visit validation rules
const visitValidation = {
  create: [
    body('patient_id').isInt().withMessage('Patient ID harus angka'),
    body('doctor_id').isInt().withMessage('Doctor ID harus angka'),
    body('tanggal_kunjungan').isISO8601().withMessage('Tanggal tidak valid'),
    body('keluhan').optional().trim(),
    handleValidationErrors
  ]
};

// Transaction validation rules
const transactionValidation = {
  create: [
    body('tipe').isIn(['pemasukan', 'pengeluaran']).withMessage('Tipe harus pemasukan atau pengeluaran'),
    body('kategori').trim().notEmpty().withMessage('Kategori wajib diisi'),
    body('jumlah').isFloat({ min: 0 }).withMessage('Jumlah harus angka positif'),
    body('tanggal').isISO8601().withMessage('Tanggal tidak valid'),
    handleValidationErrors
  ]
};

module.exports = {
  handleValidationErrors,
  userValidation,
  patientValidation,
  medicineValidation,
  visitValidation,
  transactionValidation
};
