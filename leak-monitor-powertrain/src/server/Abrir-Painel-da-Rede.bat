@echo off
REM ============================================================
REM  Abre o painel Leak Test direto da pasta (sem servidor).
REM  Use quando a pasta do painel esta num compartilhamento de
REM  rede e voce so quer visualizar/carregar um CSV manualmente.
REM
REM  Para o modo com base compartilhada e atualizacao automatica,
REM  use "Iniciar-Servidor-LeakTest.bat" no PC servidor.
REM ============================================================
start "" "%~dp0index.html"
