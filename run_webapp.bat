@echo off
REM MikroTik Monitoring - Quick Start Script

REM (Optional) Activate virtual environment if you use one
REM call .venv\Scripts\activate

REM Install dependencies
pip install -r requirements.txt

REM Run the Flask app
python app.py

pause 