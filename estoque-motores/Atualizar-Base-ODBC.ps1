# ============================================================
#  Atualiza a base do painel consultando o ODBC DIRETO (sem Excel).
#  Usa a MESMA consulta do seu Power Query (DSN: DPN-Producao / F41021JC)
#  e grava estoque.csv, que o painel le automaticamente.
#  Rode via Agendador de Tarefas (ver Agendar-Atualizacao.bat).
#
#  PRE-REQUISITOS:
#   - DSN "DPN-Producao" configurado neste PC (de preferencia DSN de Sistema).
#   - Se o DSN nao guardar usuario/senha, preencha UID/PWD em $conn.
# ============================================================

# Conexao ODBC (mesmo DSN do Power Query). Se precisar de login:
#   $conn = "dsn=DPN-Producao;UID=usuario;PWD=senha;"
$conn = "dsn=DPN-Producao;"

# Consulta (identica a do Power Query). O filtro LIMCU <> 'TERCHABN' foi
# incorporado ao WHERE (era o Table.SelectRows do Power Query).
$sql = @"
SELECT LIMCU, IMLITM, IMDSC1, LILOCN, LILOTN, LIPQOH/10000 AS QTD, LIUPMJ
FROM JHABJDTA73.F41021JC
WHERE LIPQOH <> 0
  AND (
        TRIM(IMLITM) IN ('1220B62X M000','1220162X M000BB','1220162X M000AA',
            '1100B62H M000','1110062H M000BB','12100K2G 9000','12100KPT A004',
            '12100KRM 8400 AC','12100KWG 6001','12100K2G 9000XB','12100K2G 9000XA','12100KPT A001AA')
        OR TRIM(IMLITM) LIKE '100006%'
        OR TRIM(IMDSC1) = 'CJ TRANSMISSAO CVT -AL'
      )
  AND TRIM(LIMCU) <> 'TERCHABN'
ORDER BY LIMCU, LILOCN, IMLITM
"@
# OBS: mantenha o LIMCU 'TERCHAB3' na consulta (é a "Impregna" que o painel mostra
# à parte). Se voce alterou o SELECT no Power Query, cole aqui a versao mais recente.

# ------------------------------------------------------------
$dir     = Split-Path -Parent $MyInvocation.MyCommand.Path
$destino = Join-Path $dir "estoque.csv"
$log     = Join-Path $dir "atualizar-base.log"
function Registrar($m){ "$([DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss'))  $m" | Out-File $log -Append -Encoding utf8 }

$c = $null
try {
  $c = New-Object System.Data.Odbc.OdbcConnection $conn
  $c.Open()
  $cmd = $c.CreateCommand(); $cmd.CommandText = $sql; $cmd.CommandTimeout = 180
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
