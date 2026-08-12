@echo off
REM ============================================================
REM  Powertrain - Cadastro de crachas
REM
REM  Abre a tela onde se associa o ID do cracha (e o telefone)
REM  a cada pessoa da equipe. Use no PC do painel, com teclado,
REM  mouse e o leitor RFID ligado.
REM
REM  O Iniciar-Painel.bat precisa estar aberto: e ele que grava
REM  o dados\pessoas.csv quando voce clica em "Salvar cadastro".
REM
REM  Roteiro: digite o nome > Enter > encoste o cracha > Enter >
REM  telefone (opcional) > Enter. No fim, "Salvar cadastro".
REM ============================================================
setlocal
cd /d "%~dp0"

REM --- Confere se o servidor do painel esta no ar ---
powershell -NoProfile -Command "exit (0 - [int](Test-NetConnection -ComputerName localhost -Port 8090 -InformationLevel Quiet))" >nul 2>&1
if errorlevel 1 goto :abre

echo.
echo  O servidor do painel nao esta rodando na porta 8090.
echo  Abra primeiro o Iniciar-Painel.bat e deixe a janela dele aberta,
echo  senao o botao "Salvar cadastro" nao consegue gravar o arquivo.
echo.
choice /c SN /n /m "Abrir mesmo assim? (S/N) "
if errorlevel 2 goto :fim

:abre
REM  --app abre sem barra de enderecos, como um programa
start "" msedge --app="http://localhost:8090/cadastro.html" --window-size=1500,1000
if errorlevel 1 start "" "http://localhost:8090/cadastro.html"

:fim
endlocal
