@echo off
REM Agendador Windows — sync Hub Official (nao altera Make / ph_metricas_source).
REM Agende este .cmd no Task Scheduler (2x/dia). Requer Node + npm no PATH e .env preenchido.

cd /d "%~dp0..\.."
if not exist "logs" mkdir logs
echo [%date% %time%] hub:sync-official --eligible >> logs\hub-sync-eligible.log
call npm run hub:sync-official -- --eligible >> logs\hub-sync-eligible.log 2>&1
echo [%date% %time%] exit=%ERRORLEVEL% >> logs\hub-sync-eligible.log
exit /b %ERRORLEVEL%
