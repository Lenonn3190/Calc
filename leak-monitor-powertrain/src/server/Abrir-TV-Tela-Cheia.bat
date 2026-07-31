@echo off
REM ============================================================
REM  Abre o painel em TELA CHEIA (modo quiosque) na TV da area.
REM  Ajuste o endereco abaixo para o IP do PC servidor.
REM ============================================================
setlocal
set URL=http://localhost:8090/

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --kiosk --incognito --disable-session-crashed-bubble --noerrdialogs %URL%
  goto :fim
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --kiosk --incognito --disable-session-crashed-bubble --noerrdialogs %URL%
  goto :fim
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk %URL% --edge-kiosk-type=fullscreen --no-first-run
  goto :fim
)
echo Chrome/Edge nao encontrado. Abrindo no navegador padrao...
start "" %URL%

:fim
endlocal
