@echo off
REM ============================================================
REM  Define a PASTA DE DADOS da CheckSync ETG.
REM  Aponte para uma pasta do OneDrive sincronizada com o SharePoint,
REM  assim a base sobe para a nuvem automaticamente.
REM
REM  Exemplo de caminho:
REM    C:\Users\SEU_USUARIO\OneDrive - Empresa\CheckSync\dados
REM ============================================================
setlocal
cd /d "%~dp0"
echo.
echo Cole o caminho COMPLETO da pasta de dados (OneDrive/SharePoint):
echo (deixe vazio e ENTER para usar a pasta local  .\dados)
echo.
set "P="
set /p "P=Pasta: "
if "%P%"=="" (
  if exist "config-pasta.txt" del "config-pasta.txt"
  echo.
  echo OK - sera usada a pasta local: %~dp0dados
) else (
  > "config-pasta.txt" echo %P%
  echo.
  echo OK - pasta de dados definida como:
  echo   %P%
)
echo.
echo Agora inicie o servidor com "Iniciar-Servidor-CheckSync.bat".
pause
endlocal
