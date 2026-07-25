@echo off
setlocal
cd /d "%~dp0"
title Agendar envio do relatorio por e-mail

REM Cria tarefas que rodam Enviar-Email.ps1 nos horarios definidos abaixo.
REM Ajuste os horarios (formato 24h HH:MM) conforme sua necessidade.
REM Dica: agende ALGUNS MINUTOS APOS os horarios em que o painel gera o HTML
REM (por padrao 08:30 e 12:30) para o arquivo ja estar pronto.

set "PS1=%~dp0Enviar-Email.ps1"

REM ------- HORARIOS DE ENVIO (edite aqui) -------
set "HORA1=08:35"
set "HORA2=12:35"
REM ----------------------------------------------

echo Criando tarefa "Enviar Estoque 1" as %HORA1% ...
schtasks /Create /F /TN "Enviar Estoque 1" /SC DAILY /ST %HORA1% ^
  /TR "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%PS1%\""

echo Criando tarefa "Enviar Estoque 2" as %HORA2% ...
schtasks /Create /F /TN "Enviar Estoque 2" /SC DAILY /ST %HORA2% ^
  /TR "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%PS1%\""

if %errorlevel%==0 (
  echo.
  echo Tarefas criadas. O relatorio sera enviado por e-mail as %HORA1% e %HORA2%.
  echo Para testar AGORA:
  echo    schtasks /Run /TN "Enviar Estoque 1"
  echo Para remover:
  echo    schtasks /Delete /TN "Enviar Estoque 1" /F
  echo    schtasks /Delete /TN "Enviar Estoque 2" /F
) else (
  echo.
  echo Falhou ao criar as tarefas. Tente rodar este .bat como Administrador.
)
echo.
echo IMPORTANTE: abra o Enviar-Email.ps1 e preencha o servidor SMTP, o remetente
echo e os destinatarios ANTES de agendar. (Confira o enviar-email.log em caso de erro.)
echo.
pause
