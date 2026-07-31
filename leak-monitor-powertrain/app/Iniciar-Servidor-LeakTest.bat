@echo off
REM ============================================================
REM  SERVIDOR do painel Leak Test | Powertrain
REM
REM  Rode ISTO no PC que guarda a base (pasta dados\leak.csv). Ele:
REM    - se eleva (UAC) para poder atender a rede;
REM    - libera a porta 8090 no Firewall do Windows;
REM    - inicia o servidor e mostra os enderecos de acesso.
REM
REM  Nas TVs / celulares / PCs, abra no navegador o endereco que
REM  aparecer (ex: http://192.168.0.10:8090/) na MESMA rede.
REM ============================================================
setlocal

REM --- Auto-elevacao (UAC) ---
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Solicitando permissao de administrador para liberar o acesso pela rede...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

cd /d "%~dp0"

REM --- Regra de firewall (idempotente) ---
netsh advfirewall firewall show rule name="Leak Test Powertrain 8090" >nul 2>&1
if %errorlevel% neq 0 (
  echo Liberando a porta 8090 no Firewall do Windows...
  netsh advfirewall firewall add rule name="Leak Test Powertrain 8090" dir=in action=allow protocol=TCP localport=8090 >nul 2>&1
)

REM --- Inicia o servidor (rede + abre navegador) ---
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servir.ps1" -Port 8090 -OpenBrowser

echo.
echo Servidor encerrado.
pause
endlocal
