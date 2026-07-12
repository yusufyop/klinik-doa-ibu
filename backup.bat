@echo off
title Klinik Pratama Doa Ibu - Backup Database
color 0E

echo.
echo ========================================================
echo   BACKUP DATABASE - KLINIK DOA IBU
echo ========================================================
echo.

:: Buat folder backup kalau belum ada
if not exist "backup" mkdir backup

:: Ambil tanggal & jam
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set TGL=%%c%%b%%a
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set JAM=%%a%%b

set FILENAME=backup\klinik_doa_ibu_%TGL%_%JAM%.sql

echo [1/2] Mengecek MySQL...
mysql -u root -e "SELECT 1" >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [!] ERROR: MySQL tidak berjalan!
    echo [!] Pastikan XAMPP/Laragon sudah Start MySQL.
    pause
    exit /b
)
echo [OK] MySQL berjalan.
echo.

echo [2/2] Melakukan backup database...
mysqldump -u root klinik_doa_ibu > "%FILENAME%"

if errorlevel 1 (
    color 0C
    echo [!] ERROR: Backup gagal!
    pause
    exit /b
)

:: Cek ukuran file
for %%A in ("%FILENAME%") do set SIZE=%%~zA
set /a SIZE_KB=%SIZE%/1024

echo.
echo ========================================================
echo   BACKUP BERHASIL!
echo ========================================================
echo.
echo File: %FILENAME%
echo Ukuran: %SIZE_KB% KB
echo Lokasi: %CD%\%FILENAME%
echo.
echo Tips:
echo   - Backup rutin setiap hari sebelum tutup klinik
echo   - Simpan file backup di Google Drive / USB
echo   - File ini bisa di-import ke MySQL lain kalau perlu
echo.
pause