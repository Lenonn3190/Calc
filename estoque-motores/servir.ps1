# Servidor web estático simples (sem instalar nada) para o Painel de Estoque.
# Serve os arquivos desta pasta na porta 8080, ACESSÍVEL PELA REDE (celular/outra TV).
# Necessário porque o painel lê estoque.csv / estoque.xlsx via fetch (não funciona em file://).

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8080

function Get-LanIPs {
  try {
    [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
      Where-Object { $_.AddressFamily -eq 'InterNetwork' } |
      ForEach-Object { $_.IPAddressToString } |
      Where-Object { $_ -ne '127.0.0.1' -and $_ -notlike '169.254*' }
  } catch { @() }
}

$listener = New-Object System.Net.HttpListener
$rede = $true
$listener.Prefixes.Add("http://+:$port/")     # todas as interfaces (rede)
try {
  $listener.Start()
} catch {
  $rede = $false
  Write-Host "AVISO: nao consegui abrir para a REDE na porta $port." -ForegroundColor Yellow
  Write-Host "       Rode 'Liberar-Rede.bat' como ADMINISTRADOR uma vez (libera porta+firewall)." -ForegroundColor Yellow
  Write-Host "       Iniciando apenas neste PC (localhost)..." -ForegroundColor Yellow
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://localhost:$port/")
  $listener.Prefixes.Add("http://127.0.0.1:$port/")
  $listener.Start()
}

Write-Host "Painel de Estoque servindo:" -ForegroundColor Green
Write-Host "  Pasta: $root"
$idx = Join-Path $root 'index.html'
if (Test-Path -LiteralPath $idx) {
  $fi = Get-Item -LiteralPath $idx
  Write-Host ("  index.html: {0}  ({1:N0} bytes)" -f $fi.LastWriteTime.ToString('yyyy-MM-dd HH:mm'), $fi.Length) -ForegroundColor Yellow
} else {
  Write-Host "  ATENCAO: nao existe index.html nesta pasta!" -ForegroundColor Red
}
Write-Host "  Neste PC:      http://localhost:$port/"
if ($rede) {
  foreach ($ip in Get-LanIPs) { Write-Host "  Na rede (cel): http://$ip`:$port/" -ForegroundColor Cyan }
}
Write-Host "  (feche esta janela para parar)"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.xlsx' = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  '.csv'  = 'text/csv; charset=utf-8'
  '.png'  = 'image/png'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $rel = [uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
    $rel = $rel.Split('?')[0].Replace('..','')
    $path = Join-Path $root $rel

    if (Test-Path -LiteralPath $path -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($path)
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $ctx.Response.Headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
      $ctx.Response.Headers['Pragma'] = 'no-cache'
      $ctx.Response.Headers['Expires'] = '0'
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - nao encontrado: $rel")
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.OutputStream.Close()
  } catch { }
}
