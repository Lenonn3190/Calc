@echo off
setlocal
cd /d "%~dp0"
title Agendar atualizacao automatica da base

REM Cria uma tarefa que atualiza a base a cada 1 hora (no minuto :50),
REM alinhado para a base ja estar pronta quando o painel reler (no minuto :00).

REM ============================================================
REM  ESCOLHA COMO A BASE E ATUALIZADA  (este e o "ponto de retorno")
REM
REM    ODBC  = consulta o banco direto (DSN DPN-Producao) e gera estoque.csv.
REM            NAO precisa de Excel instalado. A logica do LILOCN (OP_OFF,
REM            OP140, ...) esta em SQL dentro do Atualizar-Base-ODBC.ps1.
REM
REM    EXCEL = abre a planilha de consulta, roda o "Atualizar Tudo" e salva
REM            estoque.xlsx. Precisa do Excel instalado e do caminho da
REM            planilha em Atualizar-Base.ps1 ($origem).
REM
REM  Para VOLTAR AO EXCEL: troque para  set "MODO=EXCEL"  e rode este .bat de
REM  novo. O painel le os dois formatos e usa sempre o arquivo mais recente.
REM ============================================================
set "MODO=ODBC"

if /I "%MODO%"=="EXCEL" (
  set "PS1=%~dp0Atualizar-Base.ps1"
  set "DESC=via Excel (gera estoque.xlsx)"
) else (
  set "PS1=%~dp0Atualizar-Base-ODBC.ps1"
  set "DESC=ODBC direto, sem Excel (gera estoque.csv)"
)
set "TAREFA=Atualizar Base Estoque"

echo Modo escolhido: %MODO%  -  %DESC%
echo.
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
if /I "%MODO%"=="EXCEL" (
  echo IMPORTANTE ^(modo EXCEL^): abra o Atualizar-Base.ps1 e ajuste a variavel
  echo $origem com o caminho da SUA planilha de consulta.
) else (
  echo IMPORTANTE ^(modo ODBC^): o DSN "DPN-Producao" precisa existir neste PC.
  echo Se ele nao guardar usuario/senha, preencha UID/PWD em $conn no
  echo Atualizar-Base-ODBC.ps1. Confira o resultado em atualizar-base.log.
)
echo.
pause
