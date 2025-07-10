@echo off

:: MikroTik Monitoring v2 Setup and Run
echo ========================================
echo MikroTik Monitoring v2 Setup and Run
echo ========================================
echo.

:: Check if dependencies are installed
if not exist "backend\venv" (
    echo Installing backend dependencies...
    cd backend
    pip install -r requirements.txt
    cd ..
)

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    npm install
    cd ..
)

echo.
echo Starting MikroTik Monitoring v2 Development Environment...
echo.
echo Starting Flask Backend (port 80)...
start cmd /k "cd backend && python app.py"
echo.
echo Starting React Frontend (port 3000)...
start cmd /k "cd frontend && npm start"
echo.
echo Development servers are starting...
echo Backend: http://localhost:80
echo Frontend: http://localhost:3000
echo.
pause 