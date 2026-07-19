@echo off
REM ============================================================
REM  Abre a CheckSync ETG a partir de uma PASTA DE REDE.
REM
REM  Coloque a pasta da CheckSync num compartilhamento
REM  (ex: \\servidor\checksync ou Z:\checksync). Cada operador
REM  da duplo clique NESTE arquivo (na pasta de rede). Sobe um
REM  servidor local que le e grava a base (dados\base.json) na
REM  propria pasta de rede - todos usam a MESMA base.
REM
REM  Nao precisa instalar nada nem ser admin. Porta automatica.
REM ============================================================
setlocal
set "PASTA=%~dp0"
pushd "%PASTA%" 2>nul
if errorlevel 1 (
  echo ERRO: sem acesso a pasta: %PASTA%
  echo Verifique permissao de leitura/gravacao no compartilhamento.
  pause
  exit /b 1
)
echo Iniciando CheckSync ETG a partir de:
echo   %PASTA%
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servir.ps1" -AutoPort -LocalOnly -OpenBrowser
popd
echo.
echo Servidor encerrado. Voce ja pode fechar esta janela.
pause >nul
endlocal
