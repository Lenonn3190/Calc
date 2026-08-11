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
REM  O painel abre em MODO QUIOSQUE do Edge, na SEGUNDA tela.
REM  Para sair do quiosque: Ctrl+W ou Alt+F4.
REM
REM  Nao precisa de administrador. Se quiser que OUTROS PCs da rede
REM  tambem abram o painel, rode este arquivo como administrador
REM  (botao direito > Executar como administrador).
REM ============================================================
setlocal
cd /d "%~dp0"

if not exist "dados" mkdir "dados"

REM --- Tira a marca de "arquivo baixado da internet" (Mark of the Web) ---
REM  E ela que faz o Windows perguntar "O fornecedor nao pode ser verificado".
REM  Desbloqueia a pasta inteira, entao o aviso nao volta nas proximas vezes.
powershell -NoProfile -Command "Get-ChildItem -LiteralPath '%~dp0' -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue" >nul 2>&1

REM --- Libera a porta no Firewall, se estiver rodando como admin ---
net session >nul 2>&1
if %errorlevel% equ 0 (
  netsh advfirewall firewall show rule name="Powertrain Ausencias 8090" >nul 2>&1
  if errorlevel 1 (
    netsh advfirewall firewall add rule name="Powertrain Ausencias 8090" dir=in action=allow protocol=TCP localport=8090 >nul 2>&1
  )
)

REM --- Sobe o servidor; ele abre o painel em quiosque na 2a tela ---
REM  Se abrir na tela errada, troque -Monitor 2 por 1 ou 3 abaixo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servir.ps1" -Port 8090 -OpenBrowser -Monitor 2

echo.
echo Painel encerrado.
pause
endlocal
