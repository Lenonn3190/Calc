@echo off
setlocal
title Remover inicializacao automatica - Painel de Estoque

set "LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Painel de Estoque TV.lnk"

if exist "%LNK%" (
  del "%LNK%"
  echo Inicializacao automatica REMOVIDA.
) else (
  echo A inicializacao automatica nao estava configurada.
)
echo.
pause
