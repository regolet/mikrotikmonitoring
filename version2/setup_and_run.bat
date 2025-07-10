@echo off

:: MikroTik Monitoring v2 Setup and Run
:: Backend dependencies are now cleaned (no python-dotenv, no python-socketio)
echo ========================================
echo MikroTik Monitoring v2 Setup and Run
echo ========================================
echo.

echo 🔧 Installing backend dependencies...
cd backend
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Backend dependencies installation failed
    pause
    exit /b 1
)
echo ✅ Backend dependencies installed
cd ..

echo.
echo 🔧 Installing frontend dependencies...
cd frontend
npm install
if %errorlevel% neq 0 (
    echo ❌ Frontend dependencies installation failed
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed
cd ..

echo.
echo 🚀 Starting development servers...
echo.

echo Starting Flask Backend (port 80)...
start cmd /k "cd backend ; python app.py"

echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo Starting React Frontend (port 3000)...
start cmd /k "cd frontend ; npm start"

echo.
echo ========================================
echo 🎉 Development environment started!
echo ========================================
echo.
echo Backend: http://localhost:80
echo Frontend: http://localhost:3000
echo.
echo Press any key to run system tests...
pause > nul

echo.
echo 🔍 Running system tests...
python test_system.py

echo.
echo Setup complete! Check the browser at http://localhost:3000
pause 