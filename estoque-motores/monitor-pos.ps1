# Descobre a posicao e o tamanho de um monitor (numero do Windows) e imprime
# "X Y Largura Altura". Usado pelo Iniciar-Painel-TV.bat para abrir o quiosque
# no monitor certo (mesmo que nao seja o principal).
param([int]$Monitor = 1)

Add-Type -AssemblyName System.Windows.Forms
$all = [System.Windows.Forms.Screen]::AllScreens
$s = $null
foreach ($x in $all) { if ($x.DeviceName -match ("DISPLAY$Monitor" + '$')) { $s = $x } }
if ($null -eq $s) {
  $i = $Monitor - 1
  if ($i -ge 0 -and $i -lt $all.Length) { $s = $all[$i] }
}
if ($null -eq $s) { $s = [System.Windows.Forms.Screen]::PrimaryScreen }
$b = $s.Bounds
Write-Output ("{0} {1} {2} {3}" -f $b.X, $b.Y, $b.Width, $b.Height)
