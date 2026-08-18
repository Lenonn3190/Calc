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
REM ?v=%RANDOM% forca o navegador a buscar o index.html novo (sem cache antigo).
set "URL=http://localhost:8080/?v=%RANDOM%%RANDOM%"

REM Zoom do quiosque (0.67 = 67%%). Altere aqui se quiser outro zoom.
set "ZOOM=0.67"

REM ===== MONITOR onde o painel deve abrir (numero do Windows: Config ^> Sistema ^>
REM Video). Aqui esta o monitor 1 (mesmo que NAO seja o principal). Troque se preciso.
set "MONITOR=1"
REM Descobre a posicao/tamanho desse monitor (via monitor-pos.ps1) e monta as flags.
set "POS="
for /f "usebackq tokens=1-4" %%a in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0monitor-pos.ps1" %MONITOR%`) do (
  set "MX=%%a" & set "MY=%%b" & set "MW=%%c" & set "MH=%%d"
)
if defined MX set "POS=--window-position=%MX%,%MY% --window-size=%MW%,%MH%"
echo     Monitor %MONITOR%: posicao %MX%,%MY% tamanho %MW%x%MH%

REM Perfil DEDICADO do quiosque. Sem isto, se ja houver um Chrome/Edge aberto,
REM o Windows so abre uma aba no navegador existente e IGNORA as flags
REM (--kiosk, --force-device-scale-factor). Com um user-data-dir proprio, o
REM quiosque abre numa instancia separada e as flags SEMPRE valem.
set "PROFILE=%LocalAppData%\PainelEstoqueKiosk"

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if defined CHROME (
  start "" "%CHROME%" --user-data-dir="%PROFILE%" %POS% --kiosk --start-fullscreen --force-device-scale-factor=%ZOOM% --disable-session-crashed-bubble --disable-infobars --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required "%URL%"
) else (
  echo    Chrome nao encontrado. Tentando Microsoft Edge...
  start "" msedge --user-data-dir="%PROFILE%" %POS% --kiosk "%URL%" --edge-kiosk-type=fullscreen --force-device-scale-factor=%ZOOM% --no-first-run
)

echo.
echo Pronto! Para SAIR do modo quiosque: Alt+F4 (ou Ctrl+W).
echo Esta janela pode ser fechada; o servidor fica na janela minimizada.
timeout /t 4 /nobreak >nul
exit /b
