@echo off
REM ============================================================
REM  Powertrain - Monitor de Ausencias
REM
REM  Duplo clique AQUI no PC ligado ao monitor. Ele:
REM    - inicia o servidor local do painel;
REM    - abre o navegador no painel, em tela cheia.
REM
REM  O painel le a planilha dados\saidas.csv sozinho, de tempos em
REM  tempos: e so salvar o CSV atualizado por cima naquela pasta
REM  que a tela muda sozinha. Nao precisa importar nada.
REM
REM  Nao precisa de administrador. Se quiser que OUTROS PCs da rede
REM  tambem abram o painel, rode este arquivo como administrador
REM  (botao direito > Executar como administrador).
REM ============================================================
setlocal
cd /d "%~dp0"

if not exist "dados" mkdir "dados"

REM --- Libera a porta no Firewall, se estiver rodando como admin ---
net session >nul 2>&1
if %errorlevel% equ 0 (
  netsh advfirewall firewall show rule name="Powertrain Ausencias 8090" >nul 2>&1
  if errorlevel 1 (
    netsh advfirewall firewall add rule name="Powertrain Ausencias 8090" dir=in action=allow protocol=TCP localport=8090 >nul 2>&1
  )
)

REM --- Abre o navegador em quiosque (tela cheia) apos o servidor subir ---
start "" powershell -NoProfile -Command ^
  "Start-Sleep -Seconds 2; " ^
  "$u='http://localhost:8090/'; " ^
  "$edge=\"$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe\"; " ^
  "if (Test-Path $edge) { Start-Process $edge -ArgumentList \"--kiosk $u --edge-kiosk-type=fullscreen --no-first-run\" } else { Start-Process $u }"

REM --- Sobe o servidor (esta janela fica aberta enquanto o painel roda) ---
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servir.ps1" -Port 8090

echo.
echo Painel encerrado.
pause
endlocal
