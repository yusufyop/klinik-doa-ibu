@echo off
title Klinik Pratama Doa Ibu - Server
color 0A

echo.
echo ========================================================
echo   KLINIK PRATAMA DOA IBU - MEMULAI SERVER
echo ========================================================
echo.

:: Cek apakah MySQL/XAMPP/Laragon sudah jalan
echo [1/4] Mengecek koneksi MySQL...
mysql -u root -e "SELECT 1" >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [!] PERINGATAN: MySQL tidak terdeteksi!
    echo [!] Pastikan XAMPP/Laragon sudah dijalankan dan MySQL Start.
    echo [!] Tekan tombol apa saja untuk lanjut...
    pause >nul
) else (
    echo [OK] MySQL terdeteksi dan berjalan.
)
echo.

:: Cek Node.js
echo [2/4] Mengecek Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [!] ERROR: Node.js tidak terinstall!
    echo [!] Download di: https://nodejs.org/
    pause
    exit /b
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js versi %NODE_VER% terinstall.
echo.

:: Ambil IP Lokal
echo [3/4] Mendeteksi IP Lokal...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do set LOCAL_IP=%%b
)
echo [OK] IP Lokal: %LOCAL_IP%
echo.

:: Jalankan Backend
echo [4/4] Menjalankan Backend...
cd backend-klinik
start "Backend Klinik - DOA IBU" cmd /k "title Backend Klinik && color 0B && echo Backend berjalan di http://localhost:5000 && echo Network: http://%LOCAL_IP%:5000 && echo. && node server.js"
cd ..

:: Tunggu sebentar biar backend siap
echo.
echo Menunggu backend siap (5 detik)...
timeout /t 5 /nobreak >nul

:: Jalankan Frontend
echo Menjalankan Frontend...
cd frontend-klinik
start "Frontend Klinik - DOA IBU" cmd /k "title Frontend Klinik && color 0E && echo Frontend berjalan di http://localhost:5173 && echo Network: http://%LOCAL_IP%:5173 && echo. && npm run dev -- --host"
cd ..

:: Tunggu frontend siap
echo.
echo Menunggu frontend siap (8 detik)...
timeout /t 8 /nobreak >nul

:: Buka browser otomatis
echo.
echo Membuka browser...
:: Buka browser otomatis
echo.
echo Membuka browser...
start http://localhost:5173

:: Tampilkan info akses network
echo.
echo ========================================================
echo   CARA AKSES DARI HP/LAPTOP LAIN:
echo ========================================================
echo.
echo   1. Pastikan device terhubung ke WiFi yang SAMA
echo   2. Buka browser, ketik:
echo      http://%LOCAL_IP%:5173
echo   3. Login dengan akun admin
echo.
echo   Kalau tidak bisa login, cek:
echo   - Firewall Windows (allow port 5000)
echo   - Backend sudah jalan (lihat jendela Backend)
echo   - Console browser (F12) untuk error detail
echo ========================================================

echo.
echo ========================================================
echo   APLIKASI BERHASIL DIJALANKAN!
echo ========================================================
echo.
echo   Akses dari komputer ini:
echo   ^> http://localhost:5173
echo.
echo   Akses dari HP/Laptop lain (WiFi sama):
echo   ^> http://%LOCAL_IP%:5173
echo.
echo   Jangan tutup jendela Backend dan Frontend!
echo   Tekan tombol apa saja untuk keluar dari menu ini...
echo   (Aplikasi tetap berjalan di background)
echo ========================================================
echo.
pause >nul