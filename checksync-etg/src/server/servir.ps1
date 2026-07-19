# ============================================================
#  CheckSync ETG - Servidor de rede (PowerShell nativo do Windows)
#  Nao precisa instalar nada. Serve o app e grava a base compartilhada.
#
#  Uso normal (duplo clique no .bat) ou:
#     .\servir.ps1
#  Parametros:
#     -Port 8080         porta de escuta (padrao 8080)
#     -Root <caminho>    pasta servida (padrao = pasta do script)
#     -DataDir <caminho> pasta de dados (padrao = <Root>\dados)
#     -LocalOnly         escuta so em localhost (sem acesso pela rede)
#     -AutoPort          escolhe porta livre 8080..8099
#     -OpenBrowser       abre o navegador ao iniciar
# ============================================================
param(
  [int]$Port = 8080,
  [string]$Root = $PSScriptRoot,
  [string]$DataDir = "",
  [switch]$LocalOnly,
  [switch]$AutoPort,
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Pasta de dados: -DataDir > config-pasta.txt > <Root>\dados
if ([string]::IsNullOrWhiteSpace($DataDir)) {
  $cfg = Join-Path $Root "config-pasta.txt"
  if (Test-Path $cfg) {
    $linha = (Get-Content $cfg -Raw -ErrorAction SilentlyContinue)
    if ($linha) { $linha = $linha.Trim().Trim('"') }
    if ($linha) { $DataDir = $linha }
  }
}
if ([string]::IsNullOrWhiteSpace($DataDir)) { $DataDir = Join-Path $Root "dados" }
$BackupDir = Join-Path $DataDir "backups"
$LaudoDir  = Join-Path $DataDir "laudos"
$BaseFile  = Join-Path $DataDir "base.json"
foreach ($d in @($DataDir, $BackupDir, $LaudoDir)) {
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}

$mime = @{
  ".html"="text/html; charset=utf-8"; ".htm"="text/html; charset=utf-8";
  ".css"="text/css; charset=utf-8"; ".js"="application/javascript; charset=utf-8";
  ".mjs"="application/javascript; charset=utf-8"; ".json"="application/json; charset=utf-8";
  ".xlsx"="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  ".csv"="text/csv; charset=utf-8"; ".png"="image/png"; ".jpg"="image/jpeg"; ".jpeg"="image/jpeg";
  ".gif"="image/gif"; ".svg"="image/svg+xml"; ".ico"="image/x-icon"; ".webp"="image/webp";
  ".woff"="font/woff"; ".woff2"="font/woff2"; ".ttf"="font/ttf"; ".txt"="text/plain; charset=utf-8";
  ".pdf"="application/pdf"; ".map"="application/json; charset=utf-8";
}

function Test-PortFree([int]$P) {
  try { $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $P); $l.Start(); $l.Stop(); return $true } catch { return $false }
}
if ($AutoPort) { $p2 = $Port; while (-not (Test-PortFree $p2) -and $p2 -lt ($Port+20)) { $p2++ }; $Port = $p2 }

$hostBind = if ($LocalOnly) { "localhost" } else { "+" }
$listener = New-Object System.Net.HttpListener
$prefix = "http://$hostBind`:$Port/"
try {
  $listener.Prefixes.Add($prefix)
  $listener.Start()
} catch {
  if (-not $LocalOnly) {
    Write-Host "Sem permissao para escutar na rede (precisa admin). Tentando apenas localhost..." -ForegroundColor Yellow
    $listener = New-Object System.Net.HttpListener
    $prefix = "http://localhost:$Port/"
    $listener.Prefixes.Add($prefix); $listener.Start()
    $LocalOnly = $true
  } else { throw }
}

function Get-LocalIPs {
  try { (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }).IPAddress } catch { @() }
}

$sep = "================================================================"
Write-Host ""
Write-Host $sep -ForegroundColor Cyan
Write-Host "  CheckSync ETG - Servidor iniciado" -ForegroundColor Cyan
Write-Host $sep -ForegroundColor Cyan
Write-Host "  App     : $Root"
Write-Host "  Base    : $BaseFile"
Write-Host "  Porta   : $Port"
Write-Host ""
Write-Host "  Acesse pelo navegador:"
Write-Host "    http://localhost:$Port/"
if (-not $LocalOnly) { foreach ($ip in Get-LocalIPs) { Write-Host "    http://$ip`:$Port/   (outros PCs da rede)" -ForegroundColor Green } }
Write-Host ""
Write-Host "  Para parar: feche esta janela ou Ctrl+C." -ForegroundColor DarkGray
Write-Host $sep -ForegroundColor Cyan
Write-Host ""

if ($OpenBrowser) { try { Start-Process "http://localhost:$Port/" } catch {} }

function Send-Bytes($ctx, [int]$code, [string]$ctype, [byte[]]$bytes) {
  $ctx.Response.StatusCode = $code
  $ctx.Response.ContentType = $ctype
  $ctx.Response.Headers["Cache-Control"] = "no-cache, no-store"
  if ($bytes) { $ctx.Response.ContentLength64 = $bytes.Length; $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length) }
  $ctx.Response.OutputStream.Close()
}
function Send-Text($ctx, [int]$code, [string]$ctype, [string]$text) {
  Send-Bytes $ctx $code $ctype ([System.Text.Encoding]::UTF8.GetBytes($text))
}
function Read-Body($ctx) {
  $ms = New-Object System.IO.MemoryStream
  $ctx.Request.InputStream.CopyTo($ms); return $ms.ToArray()
}
function Safe-Name([string]$n) {
  if ([string]::IsNullOrWhiteSpace($n)) { return "laudo.pdf" }
  $n = [System.IO.Path]::GetFileName($n)
  foreach ($c in [System.IO.Path]::GetInvalidFileNameChars()) { $n = $n.Replace($c, '_') }
  if (-not $n.ToLower().EndsWith(".pdf")) { $n = "$n.pdf" }
  return $n
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
    $method = $req.HttpMethod
    $now = (Get-Date).ToString("HH:mm:ss")

    # ---------------- API ----------------
    if ($path -eq "/api/ping") {
      Send-Text $ctx 200 "application/json; charset=utf-8" ('{"app":"CheckSync ETG","data":' + (ConvertTo-Json $DataDir) + '}')
      Write-Host "[$now] ping" -ForegroundColor DarkGray
      continue
    }
    if ($path -eq "/api/base" -and $method -eq "GET") {
      if (Test-Path $BaseFile) {
        Send-Bytes $ctx 200 "application/json; charset=utf-8" ([System.IO.File]::ReadAllBytes($BaseFile))
      } else { Send-Text $ctx 200 "application/json; charset=utf-8" "{}" }
      continue
    }
    if ($path -eq "/api/base" -and ($method -eq "POST" -or $method -eq "PUT")) {
      $bytes = Read-Body $ctx
      $tmp = "$BaseFile.tmp"
      [System.IO.File]::WriteAllBytes($tmp, $bytes)
      Move-Item -Force $tmp $BaseFile
      # backup automatico com carimbo de data/hora
      $stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
      [System.IO.File]::WriteAllBytes((Join-Path $BackupDir "base_$stamp.json"), $bytes)
      # mantem apenas os 60 backups mais recentes
      Get-ChildItem $BackupDir -Filter "base_*.json" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 60 | Remove-Item -Force -ErrorAction SilentlyContinue
      Send-Text $ctx 200 "application/json; charset=utf-8" '{"ok":true}'
      Write-Host "[$now] base salva ($($bytes.Length) b) + backup" -ForegroundColor Green
      continue
    }
    if ($path -eq "/api/laudo" -and $method -eq "POST") {
      $rawName = ""
      $qs = $req.Url.Query.TrimStart("?")
      foreach ($pair in $qs.Split("&")) { $kv = $pair.Split("=",2); if ($kv[0] -eq "name" -and $kv.Length -eq 2) { $rawName = [System.Uri]::UnescapeDataString($kv[1]) } }
      $name = Safe-Name $rawName
      $bytes = Read-Body $ctx
      [System.IO.File]::WriteAllBytes((Join-Path $LaudoDir $name), $bytes)
      Send-Text $ctx 200 "application/json; charset=utf-8" '{"ok":true}'
      Write-Host "[$now] laudo salvo: $name ($($bytes.Length) b)" -ForegroundColor Green
      continue
    }

    # ---------------- Arquivos estaticos ----------------
    if ($method -ne "GET" -and $method -ne "HEAD") { Send-Text $ctx 405 "text/plain; charset=utf-8" "405"; continue }
    $rel = $path.TrimStart("/"); if ($rel -eq "") { $rel = "index.html" }
    $fp = Join-Path $Root $rel
    $full = [System.IO.Path]::GetFullPath($fp)
    if (-not $full.StartsWith([System.IO.Path]::GetFullPath($Root))) { Send-Text $ctx 403 "text/plain; charset=utf-8" "403"; continue }
    if (Test-Path $full -PathType Container) { $full = Join-Path $full "index.html" }
    if (Test-Path $full -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $ct = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
      Send-Bytes $ctx 200 $ct ([System.IO.File]::ReadAllBytes($full))
    } else {
      Send-Text $ctx 404 "text/plain; charset=utf-8" "404: $rel"
    }
  } catch {
    try { Send-Text $ctx 500 "text/plain; charset=utf-8" ("Erro: " + $_.Exception.Message) } catch {}
  }
}
