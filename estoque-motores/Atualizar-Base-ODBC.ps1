# ============================================================
#  Atualiza a base do painel consultando o ODBC DIRETO (sem Excel).
#  Roda a consulta e grava estoque.csv (que o painel le automaticamente).
#  Mais robusto para rodar sozinho (nao precisa de Excel aberto/COM).
#
#  COMO USAR:
#   1) Ajuste $conn (DSN ou string de conexao) e $sql abaixo.
#   2) A consulta DEVE retornar as colunas: LIMCU, IMLITM, IMDSC1, LILOCN, LILOTN, QTD
#      (se os nomes no banco forem outros, use "AS" para renomear).
#   3) No index.html, troque:  arquivo: 'estoque.xlsx'  ->  arquivo: 'estoque.csv'
#   4) Agende este script (ver Agendar-Atualizacao.bat, trocando o nome do .ps1).
# ============================================================

# >>> AJUSTE AQUI <<<
# Opcao A: DSN ja configurado no Windows (Origens de Dados ODBC):
$conn = "DSN=SEU_DSN;UID=usuario;PWD=senha;"
# Opcao B: string completa sem DSN (exemplo generico):
# $conn = "Driver={SQL Server};Server=SEU_SERVIDOR;Database=SEU_BANCO;UID=usuario;PWD=senha;"

$sql = @"
SELECT LIMCU, IMLITM, IMDSC1, LILOCN, LILOTN, QTD
FROM  SUA_TABELA_OU_VIEW
-- WHERE ...
"@

# ------------------------------------------------------------
$dir     = Split-Path -Parent $MyInvocation.MyCommand.Path
$destino = Join-Path $dir "estoque.csv"
$log     = Join-Path $dir "atualizar-base.log"
function Registrar($m){ "$([DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss'))  $m" | Out-File $log -Append -Encoding utf8 }

$c = $null
try {
  $c = New-Object System.Data.Odbc.OdbcConnection $conn
  $c.Open()
  $cmd = $c.CreateCommand(); $cmd.CommandText = $sql; $cmd.CommandTimeout = 120
  $rdr = $cmd.ExecuteReader()
  $dt = New-Object System.Data.DataTable
  $dt.Load($rdr)
  $c.Close()

  # grava num temporario e substitui (evita leitura parcial pelo painel)
  $tmp = "$destino.tmp"
  $dt | Export-Csv -Path $tmp -NoTypeInformation -Encoding UTF8 -Delimiter ';'
  Move-Item -LiteralPath $tmp -Destination $destino -Force
  Registrar "OK: base atualizada (ODBC) -> $destino  ($($dt.Rows.Count) linhas)"
}
catch {
  Registrar "ERRO (ODBC): $($_.Exception.Message)"
  exit 1
}
finally {
  if ($c -and $c.State -eq 'Open') { $c.Close() }
}
