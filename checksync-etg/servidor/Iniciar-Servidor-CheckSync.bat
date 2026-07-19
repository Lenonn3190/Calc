@echo off
REM ============================================================
REM  SERVIDOR CENTRAL da CheckSync ETG (PC + celulares na rede)
REM
REM  Rode ISTO no PC que vai guardar a base. Ele:
REM    - se eleva (UAC) para poder atender a rede;
REM    - libera a porta 8080 no Firewall do Windows;
REM    - inicia o servidor e mostra os enderecos de acesso.
REM
REM  Nos celulares/PCs, abra no navegador o endereco que aparecer
REM  (ex: http://192.168.0.10:8080/) estando na MESMA rede Wi-Fi.
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
netsh advfirewall firewall show rule name="CheckSync ETG 8080" >nul 2>&1
if %errorlevel% neq 0 (
  echo Liberando a porta 8080 no Firewall do Windows...
  netsh advfirewall firewall add rule name="CheckSync ETG 8080" dir=in action=allow protocol=TCP localport=8080 >nul 2>&1
)

REM --- Inicia o servidor (rede + abre navegador) ---
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servir.ps1" -Port 8080 -OpenBrowser

echo.
echo Servidor encerrado.
pause
endlocal
