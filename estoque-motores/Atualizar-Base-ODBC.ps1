# ============================================================
#  Atualiza a base do painel consultando o ODBC DIRETO (sem Excel).
#  Faz o mesmo que o Power Query fazia: busca no JDE, renomeia o LILOCN
#  original para LOCAL_AS400 e cria a coluna LILOCN AJUSTADA (com os OP...).
#  Grava estoque.csv na pasta do painel.
#
#  PRE-REQUISITOS:
#   - DSN "DPN-Producao" configurado neste PC (de preferencia DSN de Sistema).
#     NAO precisa de Excel instalado.
#   - Se o DSN nao guardar usuario/senha, preencha UID/PWD em $conn abaixo.
#
#  Para VOLTAR AO EXCEL: use o Atualizar-Base.ps1 (veja Agendar-Atualizacao.bat,
#  variavel MODO=EXCEL). O painel le os dois formatos automaticamente.
# ============================================================

# Conexao ODBC (mesmo DSN do Power Query). Se precisar de login:
#   $conn = "dsn=DPN-Producao;UID=usuario;PWD=senha;"
$conn = "dsn=DPN-Producao;"

# ------------------------------------------------------------
#  A consulta. O CASE abaixo e a TRADUCAO EXATA das regras que estavam
#  no Power Query (coluna "LILOCN Ajustado"). Para incluir/alterar uma
#  regra, mexa so no bloco CASE.
# ------------------------------------------------------------
$sql = @"
SELECT
    LIMCU,
    IMLITM,
    IMDSC1,
    LILOCN AS LOCAL_AS400,
    CASE
        -- EXCECAO: ESTREJ nunca e renomeado
        WHEN TRIM(LILOCN) = 'ESTREJ' THEN TRIM(LILOCN)
        -- Regras compostas: Item + Localizacao de origem
        WHEN TRIM(IMLITM) = '1100B62H M000'   AND TRIM(LILOCN) = 'ESTUSI' THEN 'ESTUSI OP_OFF'
        WHEN TRIM(IMLITM) = '1220B62X M000'   AND TRIM(LILOCN) = 'ESTUSI' THEN 'ESTUSI OP_OFF'
        -- Regras simples: somente por Item
        WHEN TRIM(IMLITM) = '12100K2G 9000BB' THEN 'ESTUSI'
        WHEN TRIM(IMLITM) = '12100KPT A001BB' THEN 'ESTUSI'
        WHEN TRIM(IMLITM) = '12100K2G 9000XB' THEN 'ESTFND'
        WHEN TRIM(IMLITM) = '12100K2G 9000XA' THEN 'ESTFND'
        WHEN TRIM(IMLITM) = '12100KPT A001AA' THEN 'ESTFND'
        WHEN TRIM(IMLITM) = '1100C62H M000'   THEN 'ESTUSI OP140'
        WHEN TRIM(IMLITM) = '1100D62H M000'   THEN 'ESTUSI OP120'
        WHEN TRIM(IMLITM) = '1110062H T001'   THEN 'ESTUSI OP10'
        WHEN TRIM(IMLITM) = '1110062H M000BB' THEN 'ESTFND'
        WHEN TRIM(IMLITM) = '1220C62X M000'   THEN 'ESTUSI OP260'
        WHEN TRIM(IMLITM) = '1220D62X M000'   THEN 'ESTUSI OP180'
        WHEN TRIM(IMLITM) = '1220162X M000'   THEN 'ESTUSI OP10'
        WHEN TRIM(IMLITM) = '1220162X M000BB' THEN 'ESTFND'
        WHEN TRIM(IMLITM) = '1220162X M000AA' THEN 'ESTFND'
        ELSE TRIM(LILOCN)
    END AS LILOCN,
    LILOTN,
    LIPQOH/10000 AS QTD,
    LIUPMJ
FROM JHABJDTA73.F41021JC
WHERE LIPQOH <> 0
  AND (
        TRIM(IMLITM) IN (
            '12100K2G 9000',
            '12100KPT A004',
            '12100KRM 8400 AC',
            '12100KWG 6001',
            '12100K2G 9000BB',
            '12100KPT A001BB',
            '12100K2G 9000XB',
            '12100K2G 9000XA',
            '12100KPT A001AA',
            '1100B62H M000',
            '1100C62H M000',
            '1100D62H M000',
            '1110062H T001',
            '1110062H M000BB',
            '1220B62X M000',
            '1220C62X M000',
            '1220D62X M000',
            '1220162X M000',
            '1220162X M000BB',
            '1220162X M000AA'
        )
        OR TRIM(IMLITM) LIKE '100006%'
        OR TRIM(IMDSC1) = 'CJ TRANSMISSAO CVT -AL'
      )
  AND TRIM(LIMCU) <> 'TERCHABN'
ORDER BY 1, 4, 2
"@
# OBS: o LIMCU 'TERCHAB3' fica na consulta de proposito - e a "Impregna", que o
# painel mostra a parte. So o 'TERCHABN' e excluido (igual ao Power Query).

# ------------------------------------------------------------
$dir     = Split-Path -Parent $MyInvocation.MyCommand.Path
$destino = Join-Path $dir "estoque.csv"
$log     = Join-Path $dir "atualizar-base.log"
function Registrar($m){ "$([DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss'))  $m" | Out-File $log -Append -Encoding utf8 }

# Escapa um valor para CSV com separador ';' (aspas so quando precisa)
function CsvVal($v){
  $s = [string]$v
  if ($null -eq $v) { $s = "" }
  $s = $s.Trim()
  if ($s -match '[;"\r\n]') { return '"' + $s.Replace('"','""') + '"' }
  return $s
}

$c = $null
try {
  $c = New-Object System.Data.Odbc.OdbcConnection $conn
  $c.Open()
  $cmd = $c.CreateCommand(); $cmd.CommandText = $sql; $cmd.CommandTimeout = 180
  $rdr = $cmd.ExecuteReader()

  $inv = [System.Globalization.CultureInfo]::InvariantCulture
  $sb  = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine('LIMCU;IMLITM;IMDSC1;LOCAL_AS400;LILOCN;LILOTN;QTD;LIUPMJ')

  $linhas = 0
  while ($rdr.Read()) {
    # QTD sempre com VIRGULA decimal e sem separador de milhar (o painel le assim)
    $qtd = 0
    try { $qtd = [decimal]$rdr['QTD'] } catch { $qtd = 0 }
    $qtxt = $qtd.ToString('0.####', $inv).Replace('.', ',')

    $campos = @(
      (CsvVal $rdr['LIMCU']),
      (CsvVal $rdr['IMLITM']),
      (CsvVal $rdr['IMDSC1']),
      (CsvVal $rdr['LOCAL_AS400']),
      (CsvVal $rdr['LILOCN']),
      (CsvVal $rdr['LILOTN']),
      $qtxt,
      (CsvVal $rdr['LIUPMJ'])
    )
    [void]$sb.AppendLine([string]::Join(';', $campos))
    $linhas++
  }
  $rdr.Close(); $c.Close()

  if ($linhas -eq 0) {
    Registrar "AVISO: a consulta nao retornou linhas. Mantido o arquivo anterior."
    exit 2
  }

  # grava num temporario e substitui (evita o painel ler pela metade)
  $tmp = "$destino.tmp"
  [System.IO.File]::WriteAllText($tmp, $sb.ToString(), (New-Object System.Text.UTF8Encoding($true)))
  Move-Item -LiteralPath $tmp -Destination $destino -Force
  Registrar "OK: base atualizada (ODBC) -> $destino  ($linhas linhas)"
}
catch {
  Registrar "ERRO (ODBC): $($_.Exception.Message)"
  exit 1
}
finally {
  if ($c -and $c.State -eq 'Open') { $c.Close() }
}
