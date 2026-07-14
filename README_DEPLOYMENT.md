# 📋 Panduan Deployment - Klinik Doa Ibu

## 🏗️ Arsitektur Aplikasi

- **Frontend**: React + Vite (Deploy di Vercel)
- **Backend**: Node.js + Express (Deploy di Railway)
- **Database**: TiDB Cloud (MySQL-compatible)

---

## 🚀 Deploy Backend ke Railway

### 1. Persiapan Environment Variables di Railway

Buka Railway Dashboard → Project Anda → Variables → Tambahkan:

```bash
DB_HOST=<host-tidb-anda>
DB_USER=<username-tidb>
DB_PASS=<password-tidb>
DB_NAME=klinik_doa_ibu
DB_PORT=4000
DB_SSL=true
PORT=5000
FRONTEND_URL=https://your-app.vercel.app
```

### 2. Deploy

```bash
cd backend-klinik
railway up
```

Atau connect GitHub repository ke Railway untuk auto-deploy.

---

## 🎨 Deploy Frontend ke Vercel

### 1. Persiapan Environment Variables di Vercel

Buka Vercel Dashboard → Project Anda → Settings → Environment Variables → Tambahkan:

```bash
VITE_API_URL=https://your-backend.railway.app/api
```

### 2. Deploy

```bash
cd frontend-klinik
vercel --prod
```

Atau connect GitHub repository ke Vercel untuk auto-deploy.

---

## 🔧 Konfigurasi TiDB Cloud

Pastikan connection string Anda memiliki format:
- Host: `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` (contoh)
- Port: `4000`
- SSL: `true`
- User & Password dari TiDB Cloud Console

---

## ✅ Checklist Post-Deployment

- [ ] Backend berhasil start di Railway
- [ ] Database connection sukses (cek logs Railway)
- [ ] Frontend bisa akses API dari Vercel
- [ ] CORS sudah dikonfigurasi dengan benar
- [ ] Login berfungsi
- [ ] Semua fitur teruji

---

## 🛠️ Troubleshooting

### CORS Error
Pastikan `FRONTEND_URL` di Railway berisi URL Vercel Anda.

### Database Connection Failed
- Cek SSL setting (`DB_SSL=true` untuk TiDB)
- Pastikan port `4000` (bukan 3306)
- Verifikasi credentials di TiDB Console

### API Tidak Terhubung
- Cek `VITE_API_URL` di Vercel
- Pastikan backend Railway sudah running
- Test endpoint manual: `https://your-backend.railway.app/api/dashboard/stats`

---

## 📊 Monitoring

- **Railway Logs**: Dashboard → Logs
- **Vercel Analytics**: Dashboard → Analytics
- **Database**: TiDB Cloud Console → Monitoring

---

## 🔐 Security Best Practices

1. Jangan commit file `.env` ke Git
2. Gunakan environment variables untuk semua sensitive data
3. Enable rate limiting (sudah terpasang: 1000 req/15min)
4. Audit logging aktif untuk semua aksi penting

---

**Happy Deploying! 🎉**
