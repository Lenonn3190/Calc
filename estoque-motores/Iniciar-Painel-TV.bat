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

REM Zoom do painel (0.67 = 67%%). Altere aqui se quiser outro zoom.
REM O zoom e aplicado pelo PROPRIO painel (parametro ?zoom= na URL), nao pela
REM flag do Chrome: a flag --force-device-scale-factor era ignorada em varias
REM situacoes (perfil com zoom salvo, escala do Windows, instancia ja aberta).
set "ZOOM=0.67"

REM ?v=%RANDOM% forca o navegador a buscar o index.html novo (sem cache antigo).
set "URL=http://localhost:8080/?zoom=%ZOOM%&v=%RANDOM%%RANDOM%"

REM ===== MONITOR onde o painel deve abrir (numero do Windows: Config ^> Sistema ^>
REM Video). Funciona mesmo que NAO seja o monitor principal. Troque se preciso.
set "MONITOR=2"

REM ===== COMO ENTRAR EM TELA CHEIA
REM   APP   = abre janela sem barras (--app) e o kiosk-monitor.ps1 joga a janela
REM           no monitor escolhido, em tela cheia sem bordas.  <-- use este
REM           O Chrome IGNORA --window-position quando esta em --kiosk: ele
REM           sempre vai para o monitor PRINCIPAL. Por isso o modo APP existe.
REM   KIOSK = modo --kiosk classico (so funciona bem se o painel for no monitor
REM           principal). Deixado como alternativa.
set "MODO_TELA=APP"
REM Descobre a posicao/tamanho desse monitor (via monitor-pos.ps1) e monta as flags.
set "POS="
for /f "usebackq tokens=1-4" %%a in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0monitor-pos.ps1" %MONITOR%`) do (
  set "MX=%%a" & set "MY=%%b" & set "MW=%%c" & set "MH=%%d"
)
if defined MX set "POS=--window-position=%MX%,%MY% --window-size=%MW%,%MH%"
echo     Monitor %MONITOR%: posicao %MX%,%MY% tamanho %MW%x%MH%

REM Perfil DEDICADO do quiosque. Sem isto, se ja houver um Chrome/Edge aberto,
REM o Windows so abre uma aba no navegador existente e IGNORA as flags (--kiosk,
REM --window-position). Com um user-data-dir proprio, o quiosque abre numa
REM instancia separada e as flags SEMPRE valem.
set "PROFILE=%LocalAppData%\PainelEstoqueKiosk"

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if /I "%MODO_TELA%"=="KIOSK" goto :abrirKiosk

REM ---- modo APP: janela sem barras, depois movida para o monitor certo ----
if defined CHROME (
  start "" "%CHROME%" --user-data-dir="%PROFILE%" %POS% --app="%URL%" --disable-session-crashed-bubble --disable-infobars --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required
) else (
  echo    Chrome nao encontrado. Tentando Microsoft Edge...
  start "" msedge --user-data-dir="%PROFILE%" %POS% --app="%URL%" --no-first-run
)
echo     Posicionando a janela no monitor %MONITOR%...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kiosk-monitor.ps1" %MONITOR%
goto :fim

:abrirKiosk
REM ---- modo KIOSK classico (o Windows decide o monitor: sempre o principal) ----
if defined CHROME (
  start "" "%CHROME%" --user-data-dir="%PROFILE%" %POS% --kiosk --start-fullscreen --disable-session-crashed-bubble --disable-infobars --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required "%URL%"
) else (
  echo    Chrome nao encontrado. Tentando Microsoft Edge...
  start "" msedge --user-data-dir="%PROFILE%" %POS% --kiosk "%URL%" --edge-kiosk-type=fullscreen --no-first-run
)

:fim
echo.
echo Pronto! Para SAIR: Alt+F4.
echo Esta janela pode ser fechada; o servidor fica na janela minimizada.
echo.
echo Se abriu na tela errada, rode para ver as coordenadas de cada monitor:
echo    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0monitor-pos.ps1" 1
echo    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0monitor-pos.ps1" 2
echo e ajuste a variavel MONITOR no comeco deste .bat.
timeout /t 6 /nobreak >nul
exit /b
