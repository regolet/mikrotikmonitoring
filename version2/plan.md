# Plan: Clean up version2 dependencies and update setup_and_run.bat

## Goal
Remove unnecessary dependencies from backend requirements and update setup_and_run.bat to only install what is needed.

## Steps
1. Remove python-dotenv and python-socketio from requirements.txt. **(Done)**
2. Update setup_and_run.bat to reflect the cleaned requirements. **(Done)**
3. (No changes needed for frontend dependencies.) **(Done)**
4. Commit and push changes. **(Pending)**

## Result
- Backend requirements are now minimal and correct.
- setup_and_run.bat is up to date and only installs what is needed.
- No unnecessary dependencies are installed. 