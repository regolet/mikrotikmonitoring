@echo off
echo Starting MikroTik Monitoring v2 Development Environment...
echo.
echo Starting Flask Backend (port 5000)...
start cmd /k "cd backend && python app.py"
echo.
echo Starting React Frontend (port 3000)...
start cmd /k "cd frontend && npm start"
echo.
echo Development servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause 