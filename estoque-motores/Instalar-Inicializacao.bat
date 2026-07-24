@echo off
setlocal
cd /d "%~dp0"
title Instalar inicializacao automatica - Painel de Estoque

set "TARGET=%~dp0Iniciar-Painel-TV.bat"
set "WORKDIR=%~dp0"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LNK=%STARTUP%\Painel de Estoque TV.lnk"

echo Criando atalho de inicializacao automatica...
echo   Alvo : %TARGET%
echo   Em   : %STARTUP%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$w=New-Object -ComObject WScript.Shell; $s=$w.CreateShortcut($env:LNK); $s.TargetPath=$env:TARGET; $s.WorkingDirectory=$env:WORKDIR; $s.WindowStyle=7; $s.Description='Painel de Estoque TV'; $s.Save()"

if exist "%LNK%" (
  echo.
  echo Inicializacao automatica ATIVADA.
  echo O painel abrira sozinho toda vez que este usuario fizer login no Windows.
) else (
  echo.
  echo Nao foi possivel criar o atalho. Tente rodar como Administrador.
)
echo.
pause
