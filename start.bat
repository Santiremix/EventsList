@echo off
echo Iniciando backend...
start "Backend" cmd /k "cd backend && node server.js"
timeout /t 2 /nobreak >nul
echo Iniciando frontend...
start "Frontend" cmd /k "cd frontend && npx ng serve --open"
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:4200
