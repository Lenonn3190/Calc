# ============================================================
#  Envia por e-mail o relatorio HTML gerado pelo painel
#  (estoque_email.html) COMO CORPO da mensagem (HTML), via SMTP.
#  Agende nos horarios desejados com Agendar-Email.bat.
#
#  Como funciona: o painel (aberto no PC do quiosque) grava o arquivo
#  estoque_email.html na PASTA MAPEADA (botao "Mapear pasta" nas Metas).
#  Este script le esse arquivo e manda o conteudo no corpo do e-mail.
# ============================================================

# ---------------------- CONFIGURACAO ------------------------
# Pasta onde o painel grava o estoque_email.html (a pasta que voce MAPEOU no painel).
# Por padrao, usa a mesma pasta deste script. Ajuste se a pasta mapeada for outra.
$Pasta      = Split-Path -Parent $MyInvocation.MyCommand.Path
$Arquivo    = Join-Path $Pasta "estoque_email.html"

# Servidor de e-mail (SMTP) da empresa.
# >>> Configurado para RELAY INTERNO na porta 25, SEM login (seu caso). <<<
# So falta preencher o nome/IP do servidor SMTP interno abaixo:
$SmtpServer = "SEU-SERVIDOR-SMTP"      # <<< AJUSTE: nome ou IP do relay interno (ex.: mailrelay.honda.local)
$SmtpPort   = 25                       # relay interno
$UsarTLS    = $false                   # relay interno na 25 nao usa TLS

# Sem login (relay anonimo). Deixe VAZIO.
$Usuario    = ""
$Senha      = ""

# Remetente e destinatarios.
$De         = "painel.estoque@suaempresa.com"          # <<< AJUSTE
$Para       = @("fulano@suaempresa.com","ciclano@suaempresa.com")  # <<< AJUSTE (1 ou varios)
$Cc         = @()                                       # opcional
$Assunto    = "Gestao de Estoque | Powertrain - " + (Get-Date -Format "dd/MM/yyyy HH:mm")
# ------------------------------------------------------------

$log = Join-Path $Pasta "enviar-email.log"
function Registrar($m){ "$([DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss'))  $m" | Out-File $log -Append -Encoding utf8 }

try {
  if (-not (Test-Path -LiteralPath $Arquivo)) {
    Registrar "ERRO: arquivo nao encontrado: $Arquivo  (o painel precisa estar aberto e com a pasta mapeada para gerar o relatorio)."
    exit 1
  }

  # Le o HTML gerado pelo painel (UTF-8, com os acentos corretos).
  $html = [System.IO.File]::ReadAllText($Arquivo, [System.Text.Encoding]::UTF8)

  $msg = New-Object System.Net.Mail.MailMessage
  $msg.From = New-Object System.Net.Mail.MailAddress($De)
  foreach ($p in $Para) { if ($p) { $msg.To.Add($p) } }
  foreach ($c in $Cc)   { if ($c) { $msg.CC.Add($c) } }
  $msg.Subject = $Assunto
  $msg.SubjectEncoding = [System.Text.Encoding]::UTF8
  $msg.Body = $html
  $msg.BodyEncoding = [System.Text.Encoding]::UTF8
  $msg.IsBodyHtml = $true

  $smtp = New-Object System.Net.Mail.SmtpClient($SmtpServer, $SmtpPort)
  $smtp.EnableSsl = $UsarTLS
  if ($Usuario -ne "") {
    $smtp.Credentials = New-Object System.Net.NetworkCredential($Usuario, $Senha)
  } else {
    $smtp.UseDefaultCredentials = $false   # relay anonimo
  }

  $smtp.Send($msg)
  Registrar "OK: e-mail enviado para $($Para -join ', ')  (arquivo: $Arquivo)"
  $msg.Dispose()
}
catch {
  Registrar "ERRO ao enviar: $($_.Exception.Message)"
  exit 1
}
