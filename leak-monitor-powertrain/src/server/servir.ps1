# ============================================================
#  Leak Test | Powertrain - Servidor da base (PowerShell nativo)
#  Nao precisa instalar nada. Serve o painel e le/grava o CSV
#  de resultados do leak test na pasta compartilhada.
#
#  Uso normal (duplo clique no .bat) ou:
#     .\servir.ps1
#  Parametros:
#     -Port 8090         porta de escuta (padrao 8090)
#     -Root <caminho>    pasta servida (padrao = pasta do script)
#     -DataDir <caminho> pasta de dados (padrao = <Root>\dados)
#     -LocalOnly         escuta so em localhost (sem acesso pela rede)
#     -AutoPort          escolhe porta livre 8090..8109
#     -OpenBrowser       abre o navegador ao iniciar
#
#  Rotas da API:
#     GET  /api/ping            estado do servidor e pasta de dados
#     GET  /api/dados?f=x.csv   conteudo do CSV (cabecalho X-Mtime)
#     POST /api/dados?f=x.csv   substitui o CSV (com backup)
#     POST /api/registro?f=...  acrescenta uma linha ao CSV (bancadas)
#     GET  /api/lista           CSVs disponiveis na pasta de dados
#     GET  /api/config          metas/configuracao compartilhada
#     POST /api/config          grava metas/configuracao compartilhada
# ============================================================
param(
  [int]$Port = 8090,
  [string]$Root = $PSScriptRoot,
  [string]$DataDir = "",
  [switch]$LocalOnly,
  [switch]$AutoPort,
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if ([string]::IsNullOrWhiteSpace($DataDir)) { $DataDir = Join-Path $Root "dados" }
$BackupDir  = Join-Path $DataDir "backups"
$ConfigFile = Join-Path $DataDir "config.json"
foreach ($d in @($DataDir, $BackupDir)) {
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}
# Se a pasta de dados estiver vazia, copia o CSV de exemplo que veio no pacote
$exemplo = Join-Path $Root "leak-exemplo.csv"
$destCsv = Join-Path $DataDir "leak.csv"
if ((Test-Path $exemplo) -and -not (Test-Path $destCsv)) { Copy-Item $exemplo $destCsv }

$mime = @{
  ".html"="text/html; charset=utf-8"; ".htm"="text/html; charset=utf-8";
  ".css"="text/css; charset=utf-8"; ".js"="application/javascript; charset=utf-8";
  ".json"="application/json; charset=utf-8"; ".csv"="text/csv; charset=utf-8";
  ".png"="image/png"; ".jpg"="image/jpeg"; ".jpeg"="image/jpeg"; ".svg"="image/svg+xml";
  ".ico"="image/x-icon"; ".webp"="image/webp"; ".txt"="text/plain; charset=utf-8";
  ".woff"="font/woff"; ".woff2"="font/woff2"; ".map"="application/json; charset=utf-8";
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
Write-Host "  Leak Test | Powertrain - Servidor iniciado" -ForegroundColor Cyan
Write-Host $sep -ForegroundColor Cyan
Write-Host "  Painel  : $Root"
Write-Host "  Dados   : $DataDir  (coloque aqui o leak.csv)"
Write-Host "  Porta   : $Port"
Write-Host ""
Write-Host "  Acesse pelo navegador:"
Write-Host "    http://localhost:$Port/"
if (-not $LocalOnly) { foreach ($ip in Get-LocalIPs) { Write-Host "    http://$ip`:$Port/   (TVs e outros PCs da rede)" -ForegroundColor Green } }
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
function Get-Query($ctx, [string]$nome) {
  $qs = $ctx.Request.Url.Query.TrimStart("?")
  foreach ($pair in $qs.Split("&")) {
    $kv = $pair.Split("=",2)
    if ($kv[0] -eq $nome -and $kv.Length -eq 2) { return [System.Uri]::UnescapeDataString($kv[1].Replace("+"," ")) }
  }
  return ""
}
function Safe-Csv([string]$n) {
  if ([string]::IsNullOrWhiteSpace($n)) { return "leak.csv" }
  $n = [System.IO.Path]::GetFileName($n)
  foreach ($c in [System.IO.Path]::GetInvalidFileNameChars()) { $n = $n.Replace($c, '_') }
  $ext = [System.IO.Path]::GetExtension($n).ToLower()
  if ($ext -ne ".csv" -and $ext -ne ".txt" -and $ext -ne ".tsv") { $n = "$n.csv" }
  return $n
}
function Json-Escape([string]$s) {
  if ($null -eq $s) { return "" }
  return $s.Replace('\','\\').Replace('"','\"').Replace("`r",'').Replace("`n",'\n')
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
      $j = '{"app":"Leak Test Powertrain","versao":"1.0","dados":"' + (Json-Escape $DataDir) + '"}'
      Send-Text $ctx 200 "application/json; charset=utf-8" $j
      continue
    }

    if ($path -eq "/api/lista" -and $method -eq "GET") {
      $itens = @()
      Get-ChildItem $DataDir -File | Where-Object { $_.Extension -match '^\.(csv|txt|tsv)$' } | Sort-Object LastWriteTime -Descending | ForEach-Object {
        $itens += '{"nome":"' + (Json-Escape $_.Name) + '","tamanho":' + $_.Length + ',"mtime":"' + $_.LastWriteTime.ToString("dd/MM/yyyy HH:mm") + '"}'
      }
      Send-Text $ctx 200 "application/json; charset=utf-8" ("[" + ($itens -join ",") + "]")
      continue
    }

    if ($path -eq "/api/dados" -and ($method -eq "GET" -or $method -eq "HEAD")) {
      $nome = Safe-Csv (Get-Query $ctx "f")
      $fp = Join-Path $DataDir $nome
      if (Test-Path $fp -PathType Leaf) {
        $ctx.Response.Headers["X-Mtime"] = (Get-Item $fp).LastWriteTime.ToString("dd/MM/yyyy HH:mm:ss")
        Send-Bytes $ctx 200 "text/csv; charset=utf-8" ([System.IO.File]::ReadAllBytes($fp))
        Write-Host "[$now] leitura de $nome" -ForegroundColor DarkGray
      } else {
        Send-Text $ctx 404 "text/plain; charset=utf-8" "arquivo nao encontrado: $nome"
        Write-Host "[$now] AUSENTE: $nome" -ForegroundColor Yellow
      }
      continue
    }

    if ($path -eq "/api/dados" -and ($method -eq "POST" -or $method -eq "PUT")) {
      $nome = Safe-Csv (Get-Query $ctx "f")
      $fp = Join-Path $DataDir $nome
      $bytes = Read-Body $ctx
      if (Test-Path $fp -PathType Leaf) {
        $stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
        Copy-Item $fp (Join-Path $BackupDir ("{0}_{1}.csv" -f [System.IO.Path]::GetFileNameWithoutExtension($nome), $stamp)) -Force
        Get-ChildItem $BackupDir -Filter "*.csv" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 40 | Remove-Item -Force -ErrorAction SilentlyContinue
      }
      $tmp = "$fp.tmp"
      [System.IO.File]::WriteAllBytes($tmp, $bytes)
      Move-Item -Force $tmp $fp
      Send-Text $ctx 200 "application/json; charset=utf-8" '{"ok":true}'
      Write-Host "[$now] $nome gravado ($($bytes.Length) b)" -ForegroundColor Green
      continue
    }

    # Bancadas de teste podem empurrar uma linha por peca testada
    if ($path -eq "/api/registro" -and $method -eq "POST") {
      $nome = Safe-Csv (Get-Query $ctx "f")
      $fp = Join-Path $DataDir $nome
      $linha = [System.Text.Encoding]::UTF8.GetString((Read-Body $ctx)).Trim()
      if ([string]::IsNullOrWhiteSpace($linha)) { Send-Text $ctx 400 "application/json; charset=utf-8" '{"ok":false,"erro":"linha vazia"}'; continue }
      if (-not (Test-Path $fp -PathType Leaf)) {
        [System.IO.File]::WriteAllText($fp, "data_hora;posto;modelo;serie;resultado;vazamento;limite;unidade;motivo;turno;reteste`r`n", [System.Text.Encoding]::UTF8)
      }
      Add-Content -Path $fp -Value $linha -Encoding UTF8
      Send-Text $ctx 200 "application/json; charset=utf-8" '{"ok":true}'
      Write-Host "[$now] registro acrescentado em $nome" -ForegroundColor Green
      continue
    }

    if ($path -eq "/api/config" -and $method -eq "GET") {
      if (Test-Path $ConfigFile) { Send-Bytes $ctx 200 "application/json; charset=utf-8" ([System.IO.File]::ReadAllBytes($ConfigFile)) }
      else { Send-Text $ctx 200 "application/json; charset=utf-8" "{}" }
      continue
    }
    if ($path -eq "/api/config" -and ($method -eq "POST" -or $method -eq "PUT")) {
      $bytes = Read-Body $ctx
      $tmp = "$ConfigFile.tmp"
      [System.IO.File]::WriteAllBytes($tmp, $bytes)
      Move-Item -Force $tmp $ConfigFile
      Send-Text $ctx 200 "application/json; charset=utf-8" '{"ok":true}'
      Write-Host "[$now] configuracao compartilhada atualizada" -ForegroundColor Green
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
