@echo off
echo ========================================
echo Eyercall Desktop - Build and Test Script
echo ========================================
echo.

echo [1/6] Cleaning previous builds...
call npm run clean
if %errorlevel% neq 0 (
    echo ❌ Clean failed
    pause
    exit /b 1
)
echo ✅ Clean completed

echo.
echo [2/6] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Dependencies installation failed
    pause
    exit /b 1
)
echo ✅ Dependencies installed

echo.
echo [3/6] Rebuilding native modules...
call npm run rebuild
if %errorlevel% neq 0 (
    echo ❌ Native module rebuild failed
    pause
    exit /b 1
)
echo ✅ Native modules rebuilt

echo.
echo [4/6] Building frontend...
call npm run build:frontend
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed
    pause
    exit /b 1
)
echo ✅ Frontend built

echo.
echo [5/6] Building Electron app...
call npm run dist
if %errorlevel% neq 0 (
    echo ❌ Electron build failed
    pause
    exit /b 1
)
echo ✅ Electron app built

echo.
echo [6/6] Build completed successfully!
echo.
echo 📦 Installer location: dist/
echo 🗂️  Database will be created in: %APPDATA%\Eyercall Desktop\
echo.
echo To test the app:
echo 1. Run the installer from dist/ folder
echo 2. Launch the app from Start Menu or Desktop
echo 3. Check that backend starts without errors
echo 4. Verify database creation in userData directory
echo.
echo Press any key to open the dist folder...
pause >nul
explorer dist 