@echo off
setlocal
cd /d "%~dp0"
title Painel de Estoque - TV (quiosque)

echo ============================================================
echo   Painel de Gestao de Estoque - modo TV / quiosque
echo ============================================================
echo.

echo [1/3] Configurando energia (nunca suspender / nao desligar a tela)...
powercfg /change monitor-timeout-ac 0   >nul 2>&1
powercfg /change standby-timeout-ac 0   >nul 2>&1
powercfg /change disk-timeout-ac 0      >nul 2>&1
powercfg /change hibernate-timeout-ac 0 >nul 2>&1
powercfg /change monitor-timeout-dc 0   >nul 2>&1
powercfg /change standby-timeout-dc 0   >nul 2>&1
if errorlevel 1 (
  echo    Aviso: nao foi possivel alterar a energia. Rode como Administrador
  echo    ou ajuste manualmente em Configuracoes ^> Sistema ^> Energia.
)

echo [2/3] Iniciando o servidor local (porta 8080)...
start "Painel Estoque - Servidor" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servir.ps1"

echo     Aguardando o servidor subir...
timeout /t 2 /nobreak >nul

echo [3/3] Abrindo o painel em tela cheia (quiosque)...
set "URL=http://localhost:8080/"

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if defined CHROME (
  start "" "%CHROME%" --kiosk --start-fullscreen --disable-session-crashed-bubble --disable-infobars --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required "%URL%"
) else (
  echo    Chrome nao encontrado. Tentando Microsoft Edge...
  start "" msedge --kiosk "%URL%" --edge-kiosk-type=fullscreen --no-first-run
)

echo.
echo Pronto! Para SAIR do modo quiosque: Alt+F4 (ou Ctrl+W).
echo Esta janela pode ser fechada; o servidor fica na janela minimizada.
timeout /t 4 /nobreak >nul
exit /b
