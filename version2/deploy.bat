@echo off
echo Creating deployment package...

REM Create deployment directory
if exist "deployment" rmdir /s /q "deployment"
mkdir "deployment"

REM Copy backend files
echo Copying backend files...
xcopy "backend" "deployment\backend\" /E /I /Y

REM Copy frontend source files (excluding node_modules)
echo Copying frontend source files...
xcopy "frontend\src" "deployment\frontend\src\" /E /I /Y
xcopy "frontend\public" "deployment\frontend\public\" /E /I /Y
copy "frontend\package.json" "deployment\frontend\"
copy "frontend\package-lock.json" "deployment\frontend\"

REM Copy other necessary files
copy "setup_and_run.bat" "deployment\"
copy "README.md" "deployment\"
copy "plan.md" "deployment\"

REM Create install script for target machine
echo Creating install script...
(
echo @echo off
echo echo Installing dependencies...
echo cd frontend
echo npm install
echo cd ..
echo echo.
echo echo Dependencies installed! Run setup_and_run.bat to start the application.
echo pause
) > "deployment\install.bat"

echo.
echo Deployment package created in 'deployment' folder!
echo Size: 
dir "deployment" /s | find "File(s)"
echo.
echo To deploy on another computer:
echo 1. Copy the 'deployment' folder to the target machine
echo 2. Run 'install.bat' to install dependencies
echo 3. Run 'setup_and_run.bat' to start the application
echo.
pause 