@echo off
title Klinik Pratama Doa Ibu - Stop Server
color 0C

echo.
echo ========================================================
echo   MEMATIKAN SERVER KLINIK DOA IBU
echo ========================================================
echo.

:: Matikan proses Node.js (backend + frontend)
echo [1/2] Menghentikan Backend & Frontend...
taskkill /F /FI "WINDOWTITLE eq Backend Klinik*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend Klinik*" >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
echo [OK] Semua proses Node.js dihentikan.
echo.

:: Tampilkan status
echo [2/2] Status:
echo [OK] Backend  : Berhenti
echo [OK] Frontend : Berhenti
echo.

echo ========================================================
echo   SERVER SUDAH DIMATIKAN
echo ========================================================
echo.
echo Terima kasih sudah menggunakan aplikasi Klinik Doa Ibu!
echo.
pause