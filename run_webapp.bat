@echo off
REM MikroTik Monitoring - Quick Start Script

REM (Optional) Activate virtual environment if you use one
REM call .venv\Scripts\activate

REM Install dependencies
pip install -r requirements.txt

REM Start the Flask app in the background
start /B python app.py

REM Wait a moment for the server to start
timeout /t 3 /nobreak > nul

REM Open the web browser
start http://localhost

REM Keep the batch file running to maintain the server
echo MikroTik Monitoring is running at http://localhost
echo Press any key to stop the server...
pause > nul

REM Kill the Python process when user presses a key
taskkill /f /im python.exe > nul 2>&1 