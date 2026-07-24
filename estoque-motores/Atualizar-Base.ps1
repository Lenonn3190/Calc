# ============================================================
#  Atualiza a base do painel automaticamente.
#  Abre a planilha de CONSULTA (a que tem a conexao com o sistema/JDE),
#  atualiza os dados (RefreshAll) e salva como estoque.xlsx na pasta do painel.
#  Pensado para rodar via Agendador de Tarefas do Windows (ver Agendar-Atualizacao.bat).
#
#  PRE-REQUISITOS:
#   - Microsoft Excel instalado neste PC.
#   - A planilha de consulta deve atualizar SEM pedir login/senha
#     (credenciais salvas na conexao) e SEM caixas de dialogo.
# ============================================================

# >>> AJUSTE AQUI: caminho da SUA planilha de consulta (origem dos dados) <<<
$origem  = "C:\PainelEstoque\consulta_estoque.xlsx"

# Destino lido pelo painel (por padrao, o estoque.xlsx nesta mesma pasta)
$destino = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "estoque.xlsx"

# Log simples ao lado do script
$log = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "atualizar-base.log"
function Registrar($msg){ "$([DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss'))  $msg" | Out-File -FilePath $log -Append -Encoding utf8 }

if (-not (Test-Path -LiteralPath $origem)) {
  Registrar "ERRO: planilha de origem nao encontrada: $origem  (ajuste a variavel \$origem)"
  exit 1
}

$excel = $null
try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $excel.AskToUpdateLinks = $false

  # abre a origem (UpdateLinks=3 atualiza vinculos, ReadOnly=$false)
  $wb = $excel.Workbooks.Open($origem, 3, $false)

  # força as consultas a rodarem de forma SINCRONA (sem 'background')
  foreach ($c in $wb.Connections) {
    try { $c.OLEDBConnection.BackgroundQuery = $false } catch {}
    try { $c.ODBCConnection.BackgroundQuery  = $false } catch {}
  }

  $wb.RefreshAll()
  try { $excel.CalculateUntilAsyncQueriesDone() } catch {}
  Start-Sleep -Seconds 5   # folga extra para consultas longas

  # salva primeiro num temporario e depois substitui (evita leitura parcial pelo painel)
  $tmp = "$destino.tmp.xlsx"
  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
  $wb.SaveAs($tmp, 51)     # 51 = .xlsx
  $wb.Close($false)

  Move-Item -LiteralPath $tmp -Destination $destino -Force
  Registrar "OK: base atualizada -> $destino"
}
catch {
  Registrar "ERRO: $($_.Exception.Message)"
  exit 1
}
finally {
  if ($excel) { $excel.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
