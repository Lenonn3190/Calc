@echo off
setlocal
cd /d "%~dp0"
title Agendar atualizacao automatica da base

REM Cria uma tarefa que roda Atualizar-Base.ps1 a cada 1 hora (no minuto :50),
REM alinhado para a base ja estar pronta quando o painel reler.

REM Script usado: ODBC direto (DSN DPN-Producao). Para usar a via Excel,
REM troque para  Atualizar-Base.ps1
set "PS1=%~dp0Atualizar-Base-ODBC.ps1"
set "TAREFA=Atualizar Base Estoque"

echo Criando/atualizando a tarefa agendada "%TAREFA%"...
schtasks /Create /F /TN "%TAREFA%" /SC HOURLY /MO 1 /ST 00:50 ^
  /TR "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%PS1%\""

if %errorlevel%==0 (
  echo.
  echo Tarefa criada. A base sera atualizada automaticamente a cada 1 hora.
  echo Para rodar AGORA e testar:
  echo    schtasks /Run /TN "%TAREFA%"
  echo Para remover:
  echo    schtasks /Delete /TN "%TAREFA%" /F
) else (
  echo.
  echo Falhou ao criar a tarefa. Tente rodar este .bat como Administrador.
)
echo.
echo IMPORTANTE: abra o Atualizar-Base.ps1 e ajuste a variavel  $origem
echo com o caminho da SUA planilha de consulta (a que puxa do sistema).
echo.
pause
