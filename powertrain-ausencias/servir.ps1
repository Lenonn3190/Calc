# ============================================================
#  Powertrain - Monitor de Ausencias | Servidor local
#  PowerShell nativo do Windows: nao precisa instalar nada.
#
#  Serve a pasta do painel por http para que ele consiga LER o
#  arquivo de dados sozinho (aberto direto do .html o navegador
#  proibe essa leitura).
#
#  Uso normal: duplo clique em Iniciar-Painel.bat
#  Ou:  .\servir.ps1 -Port 8090 -OpenBrowser
# ============================================================
param(
  [int]$Port = 8090,
  [string]$Root = $PSScriptRoot,
  [switch]$LocalOnly,
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$DataDir  = Join-Path $Root "dados"
$DataFile = Join-Path $DataDir "saidas.csv"
$HistFile = Join-Path $DataDir "historico.json"
$FrotaFile = Join-Path $DataDir "frota.csv"
if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir -Force | Out-Null }

$mime = @{
  ".html"="text/html; charset=utf-8"; ".htm"="text/html; charset=utf-8";
  ".css"="text/css; charset=utf-8";   ".js"="application/javascript; charset=utf-8";
  ".json"="application/json; charset=utf-8"; ".csv"="text/csv; charset=utf-8";
  ".txt"="text/plain; charset=utf-8"; ".png"="image/png"; ".jpg"="image/jpeg";
  ".jpeg"="image/jpeg"; ".gif"="image/gif"; ".svg"="image/svg+xml"; ".ico"="image/x-icon";
}

function Test-PortFree([int]$P) {
  try { $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $P); $l.Start(); $l.Stop(); $true } catch { $false }
}
# se a porta estiver ocupada, anda para a proxima livre
$p2 = $Port; while (-not (Test-PortFree $p2) -and $p2 -lt ($Port + 20)) { $p2++ }
$Port = $p2

$hostBind = if ($LocalOnly) { "localhost" } else { "+" }
$listener = New-Object System.Net.HttpListener
try {
  $listener.Prefixes.Add("http://$hostBind`:$Port/")
  $listener.Start()
} catch {
  # escutar na rede exige admin; sem isso, cai para localhost (basta para o monitor)
  if (-not $LocalOnly) {
    Write-Host "  Sem permissao para escutar na rede (precisa admin). Usando apenas localhost." -ForegroundColor Yellow
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$Port/")
    $listener.Start()
    $LocalOnly = $true
  } else { throw }
}

function Get-LocalIPs {
  try { (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
         Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }).IPAddress } catch { @() }
}

$sep = "================================================================"
Write-Host ""
Write-Host $sep -ForegroundColor Cyan
Write-Host "  Powertrain - Monitor de Ausencias" -ForegroundColor Cyan
Write-Host $sep -ForegroundColor Cyan
Write-Host "  Painel : $Root"
Write-Host "  Dados  : $DataFile"
Write-Host "  Frota  : $(Join-Path $DataDir 'frota.csv')"
Write-Host "  Histor.: $HistFile"
if (-not (Test-Path $DataFile)) {
  Write-Host "           (ainda nao existe - exporte o CSV da lista para ai)" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  Abra no monitor:"
Write-Host "    http://localhost:$Port/" -ForegroundColor Green
if (-not $LocalOnly) { foreach ($ip in Get-LocalIPs) { Write-Host "    http://$ip`:$Port/   (outros PCs da rede)" -ForegroundColor Green } }
Write-Host ""
Write-Host "  Leitor RFID: http://localhost:$Port/leitor.html" -ForegroundColor Green
Write-Host ""
Write-Host "  O painel rele o CSV sozinho: salve por cima que a tela atualiza." -ForegroundColor DarkGray
Write-Host "  Para parar: feche esta janela." -ForegroundColor DarkGray
Write-Host $sep -ForegroundColor Cyan
Write-Host ""

if ($OpenBrowser) { try { Start-Process "http://localhost:$Port/" } catch {} }

$rootFull = [System.IO.Path]::GetFullPath($Root)

while ($listener.IsListening) {
  try {
    $ctx  = $listener.GetContext()
    $req  = $ctx.Request
    $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
    $now  = (Get-Date).ToString("HH:mm:ss")

    # ---------- API: registra uma leitura do RFID ----------
    # A pagina leitor.html captura o que o leitor "digita" e manda a tag
    # aqui. O carimbo de hora e do servidor, para nao depender do relogio
    # do PC do leitor. So acrescenta linha: nunca reescreve o log.
    if ($path -eq "/api/leitura" -and $req.HttpMethod -eq "POST") {
      $sr = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
      $tag = $sr.ReadToEnd(); $sr.Close()
      # tira separador e quebra de linha: leitura torta nao pode corromper o CSV
      $tag = ($tag -replace "[\r\n;]", "").Trim()
      if ($tag.Length -gt 64) { $tag = $tag.Substring(0, 64) }
      if ($tag -eq "") {
        $ctx.Response.StatusCode = 400
      } else {
        if (-not (Test-Path $FrotaFile)) {
          Set-Content -LiteralPath $FrotaFile -Value "Data/Hora;Tag" -Encoding UTF8
        }
        $linha = (Get-Date).ToString("dd/MM/yyyy HH:mm:ss") + ";" + $tag
        Add-Content -LiteralPath $FrotaFile -Value $linha -Encoding UTF8
        $ctx.Response.StatusCode = 200
        Write-Host "[$now] leitura: $tag" -ForegroundColor Cyan
      }
      $ctx.Response.ContentType = "application/json; charset=utf-8"
      $okMsg = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
      $ctx.Response.OutputStream.Write($okMsg, 0, $okMsg.Length)
      $ctx.Response.OutputStream.Close()
      continue
    }

    # ---------- API: grava o historico de uso dos carros ----------
    # O painel monta o JSON e manda por POST; pagina de navegador nao
    # escreve em disco sozinha. Gravacao atomica (.tmp + move) para o
    # arquivo nunca ficar pela metade se alguem abrir no meio da escrita.
    if ($path -eq "/api/historico" -and ($req.HttpMethod -eq "POST" -or $req.HttpMethod -eq "PUT")) {
      $ms = New-Object System.IO.MemoryStream
      $req.InputStream.CopyTo($ms)
      $bytes = $ms.ToArray()
      $tmp = "$HistFile.tmp"
      [System.IO.File]::WriteAllBytes($tmp, $bytes)
      Move-Item -Force $tmp $HistFile
      $ctx.Response.StatusCode = 200
      $ctx.Response.ContentType = "application/json; charset=utf-8"
      $okMsg = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
      $ctx.Response.OutputStream.Write($okMsg, 0, $okMsg.Length)
      $ctx.Response.OutputStream.Close()
      Write-Host "[$now] historico gravado ($($bytes.Length) b)" -ForegroundColor Green
      continue
    }

    if ($req.HttpMethod -ne "GET" -and $req.HttpMethod -ne "HEAD") {
      $ctx.Response.StatusCode = 405; $ctx.Response.OutputStream.Close(); continue
    }

    $rel = $path.TrimStart("/"); if ($rel -eq "") { $rel = "index.html" }
    $full = [System.IO.Path]::GetFullPath((Join-Path $Root $rel))
    # nao deixa sair da pasta do painel
    if (-not $full.StartsWith($rootFull)) {
      $ctx.Response.StatusCode = 403; $ctx.Response.OutputStream.Close(); continue
    }
    if (Test-Path $full -PathType Container) { $full = Join-Path $full "index.html" }

    if (Test-Path $full -PathType Leaf) {
      $ext   = [System.IO.Path]::GetExtension($full).ToLower()
      $ct    = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ctx.Response.StatusCode  = 200
      $ctx.Response.ContentType = $ct
      # sem cache: o painel precisa enxergar o CSV recem-salvo
      $ctx.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
      $ctx.Response.Headers["Last-Modified"] = (Get-Item $full).LastWriteTimeUtc.ToString("R")
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      if ($ext -eq ".csv") { Write-Host "[$now] dados lidos pelo painel ($($bytes.Length) b)" -ForegroundColor DarkGray }
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404: $rel")
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
      Write-Host "[$now] 404 $rel" -ForegroundColor Yellow
    }
    $ctx.Response.OutputStream.Close()
  } catch {
    try { $ctx.Response.StatusCode = 500; $ctx.Response.OutputStream.Close() } catch {}
  }
}
