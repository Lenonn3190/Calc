@echo off
title Liberar acesso pela rede (porta 8080) - Painel de Estoque

REM Precisa ser executado como ADMINISTRADOR (uma unica vez).
net session >nul 2>&1
if errorlevel 1 (
  echo.
  echo  >>> Clique com o botao direito neste arquivo e "Executar como administrador". <<<
  echo.
  pause
  exit /b
)

set PORT=8080
echo Liberando a porta %PORT% para a rede (reserva de URL)...
netsh http add urlacl url=http://+:%PORT%/ user=Todos    >nul 2>&1
netsh http add urlacl url=http://+:%PORT%/ user=Everyone >nul 2>&1

echo Criando regra de firewall (entrada TCP %PORT%)...
netsh advfirewall firewall delete rule name="Painel Estoque %PORT%" >nul 2>&1
netsh advfirewall firewall add rule name="Painel Estoque %PORT%" dir=in action=allow protocol=TCP localport=%PORT% >nul 2>&1

echo.
echo Pronto! Agora rode o Iniciar-Painel-TV.bat novamente.
echo No celular (mesma rede), abra:  http://IP-DO-PC:%PORT%/
echo (O servidor mostra o IP certo ao iniciar.)
echo.
pause
