@echo off
echo Installing Eyercall Technology Desktop Application...
echo.

echo Installing root dependencies...
npm install
if %errorlevel% neq 0 (
    echo Error installing root dependencies
    pause
    exit /b 1
)

echo.
echo Installing frontend dependencies...
cd frontend
npm install
if %errorlevel% neq 0 (
    echo Error installing frontend dependencies
    pause
    exit /b 1
)

echo.
echo Installing backend dependencies...
cd ../backend
npm install
if %errorlevel% neq 0 (
    echo Error installing backend dependencies
    pause
    exit /b 1
)

cd ..
echo.
echo Installation completed successfully!
echo.
echo To start the application in development mode, run:
echo npm run dev
echo.
echo To build the application for production, run:
echo npm run build
echo.
echo To create an executable, run:
echo npm run dist:win
echo.
pause 