# Klinik Doa Ibu - Backend API

Sistem Manajemen Klinik dengan arsitektur backend yang telah ditingkatkan untuk keamanan, skalabilitas, dan keterpeliharaan.

## 🚀 Fitur Utama

### Keamanan
- ✅ **Password Hashing** menggunakan bcrypt (salt rounds: 10)
- ✅ **Rate Limiting** untuk mencegah brute force attacks
- ✅ **Helmet.js** untuk security headers
- ✅ **Input Validation** menggunakan express-validator
- ✅ **SQL Injection Prevention** dengan parameterized queries
- ✅ **CORS Configuration** yang ketat

### Performansi
- ✅ **Connection Pooling** untuk database MySQL
- ✅ **In-Memory Caching** untuk data yang sering diakses
- ✅ **Database Transactions** untuk operasi kritis (stok obat)
- ✅ **Async/Await** untuk non-blocking I/O

### Monitoring & Logging
- ✅ **Winston Logger** dengan file rotation
- ✅ **Morgan HTTP Logger** untuk request tracking
- ✅ **Audit Trail** untuk semua operasi CRUD
- ✅ **Health Check Endpoint** `/health`

## 📁 Struktur Folder

```
backend-klinik/
├── src/
│   ├── config/
│   │   ├── database.js      # Konfigurasi database
│   │   └── db.js            # Connection pool
│   ├── middleware/
│   │   ├── rateLimiter.js   # Rate limiting
│   │   ├── validators.js    # Input validation rules
│   │   └── auditLogger.js   # Audit logging
│   ├── services/
│   │   └── authService.js   # Authentication logic
│   ├── routes/
│   │   ├── auth.js          # Login endpoint
│   │   ├── users.js         # User management
│   │   ├── patients.js      # Patient management
│   │   ├── medicines.js     # Medicine management
│   │   ├── visits.js        # Visit management
│   │   ├── prescriptions.js # Prescription management
│   │   ├── finance.js       # Financial transactions
│   │   ├── dashboard.js     # Dashboard stats
│   │   └── auditLogs.js     # Audit log retrieval
│   ├── utils/
│   │   ├── logger.js        # Winston logger config
│   │   └── password.js      # Password hashing utilities
│   └── server.js            # Main entry point
├── logs/                    # Log files directory
├── .env                     # Environment variables
└── package.json
```

## 🔧 Instalasi

```bash
cd backend-klinik
npm install
```

## ⚙️ Konfigurasi Environment

Buat file `.env` dengan konfigurasi berikut:

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=klinik_doa_ibu
DB_PORT=3306
DB_SSL=false
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
LOG_LEVEL=info
```

## 🏃 Menjalankan Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | User login |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| PUT | `/api/users/:id/password` | Reset password |
| DELETE | `/api/users/:id` | Delete user |

### Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients` | Get patients (paginated) |
| POST | `/api/patients` | Create patient |
| PUT | `/api/patients/:id` | Update patient |
| DELETE | `/api/patients/:id` | Delete patient |

### Medicines
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/medicines` | Get all medicines |
| POST | `/api/medicines` | Create medicine |
| PUT | `/api/medicines/:id` | Update medicine |
| DELETE | `/api/medicines/:id` | Delete medicine |

### Visits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/visits` | Get visits (paginated) |
| POST | `/api/visits` | Create visit |
| PUT | `/api/visits/:id` | Update visit |
| DELETE | `/api/visits/:id` | Delete visit |

### Prescriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/prescriptions?visit_id=` | Get prescriptions |
| POST | `/api/prescriptions` | Create prescription |
| DELETE | `/api/prescriptions/:id` | Delete prescription |

### Finance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/finance?month=` | Get transactions |
| POST | `/api/finance/manual` | Create manual transaction |
| DELETE | `/api/finance/:id` | Delete transaction |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get dashboard statistics |

### Audit Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit-logs` | Get audit logs |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

## 🔐 Security Features

### Password Hashing
Semua password di-hash menggunakan bcrypt sebelum disimpan ke database.

```javascript
// Auto-hashing saat create user
POST /api/users
{
  "nama_lengkap": "Dr. Smith",
  "email": "smith@klinik.com",
  "password": "secure123", // Akan di-hash otomatis
  "role": "dokter"
}
```

### Rate Limiting
- **API General**: 100 requests per 15 menit per IP
- **Login**: 5 attempts per 15 menit per IP

### Input Validation
Semua input divalidasi menggunakan express-validator:
- Email format validation
- Required field checks
- Data type validation
- Custom validation rules

## 📊 Database Transaction Example

Operasi pembuatan resep menggunakan transaction untuk menjaga konsistensi stok:

```javascript
// 1. Begin transaction
// 2. Check stock with FOR UPDATE lock
// 3. Insert prescription
// 4. Update stock
// 5. Commit or rollback
```

## 📝 Logging

Log disimpan di folder `logs/`:
- `error.log` - Error level logs only
- `combined.log` - All logs

Format log: JSON dengan timestamp, level, message, dan metadata.

## 🔍 Health Check

Endpoint `/health` mengembalikan status sistem:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected",
  "uptime": 3600
}
```

## 🛠️ Migration dari Versi Lama

### Password Migration
Sistem mendukung migrasi bertahap untuk password:
- Password lama (plain text) masih bisa digunakan untuk login
- Saat reset password, password baru akan di-hash
- Disarankan reset semua password user setelah deploy

### Breaking Changes
- CORS sekarang lebih ketat (sesuaikan `FRONTEND_URL` di `.env`)
- Validasi input lebih strict (pastikan frontend mengirim data lengkap)
- Response error format mungkin berbeda

## 📞 Support

Untuk pertanyaan atau issue, silakan hubungi tim development.

---

**Version**: 2.0.0  
**Last Updated**: 2024  
**License**: Proprietary
