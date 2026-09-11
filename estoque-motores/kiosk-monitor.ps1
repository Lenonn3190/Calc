# ============================================================
#  Move a janela do painel para o monitor escolhido e a deixa em TELA CHEIA
#  sem bordas (aparencia de quiosque).
#
#  Por que isso existe: o Chrome IGNORA --window-position quando esta em
#  --kiosk; ele sempre entra em tela cheia no monitor PRINCIPAL. Entao o
#  Iniciar-Painel-TV.bat abre em modo --app (janela sem barras) e chama este
#  script, que posiciona a janela no monitor certo pela API do Windows.
#
#  Uso:  kiosk-monitor.ps1 [numeroDoMonitor] [pedacoDoTitulo] [segundosDeEspera]
# ============================================================
param(
  [int]$Monitor = 2,
  [string]$Titulo = 'Powertrain',
  [int]$EsperaSeg = 30
)

$src = @'
using System;
using System.Runtime.InteropServices;
public class PainelWin {
  [DllImport("user32.dll")] public static extern int  GetWindowLong(IntPtr hWnd, int nIndex);
  [DllImport("user32.dll")] public static extern int  SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
}
'@
Add-Type -TypeDefinition $src -ErrorAction Stop

# Coordenadas em pixels REAIS mesmo com monitores em escalas diferentes
# (PER_MONITOR_AWARE_V2 = -4). Em Windows antigo a API nao existe: ignora.
try { [void][PainelWin]::SetProcessDpiAwarenessContext([IntPtr](-4)) } catch { }

Add-Type -AssemblyName System.Windows.Forms

# --- 1) espera a janela do painel aparecer ---
$h = [IntPtr]::Zero
$limite = (Get-Date).AddSeconds($EsperaSeg)
while ((Get-Date) -lt $limite -and $h -eq [IntPtr]::Zero) {
  foreach ($nome in @('chrome','msedge')) {
    $proc = Get-Process -Name $nome -ErrorAction SilentlyContinue |
            Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero -and $_.MainWindowTitle -like "*$Titulo*" } |
            Select-Object -First 1
    if ($proc) { $h = $proc.MainWindowHandle; break }
  }
  if ($h -eq [IntPtr]::Zero) { Start-Sleep -Milliseconds 500 }
}
if ($h -eq [IntPtr]::Zero) {
  Write-Host "AVISO: nao encontrei a janela do painel (titulo contendo '$Titulo')." -ForegroundColor Yellow
  Write-Host "       O painel deve estar aberto; a janela ficou no monitor padrao." -ForegroundColor Yellow
  exit 1
}

# --- 2) descobre o monitor pedido ---
$todos = [System.Windows.Forms.Screen]::AllScreens
$tela = $null
foreach ($x in $todos) { if ($x.DeviceName -match ("DISPLAY$Monitor" + '$')) { $tela = $x } }
if ($null -eq $tela) {
  $i = $Monitor - 1
  if ($i -ge 0 -and $i -lt $todos.Length) { $tela = $todos[$i] }
}
if ($null -eq $tela) { $tela = [System.Windows.Forms.Screen]::PrimaryScreen }
$b = $tela.Bounds

# --- 3) tira as bordas e cobre o monitor inteiro ---
$GWL_STYLE     = -16
$WS_CAPTION    = 0x00C00000
$WS_THICKFRAME = 0x00040000
$WS_MINIMIZE   = 0x20000000
$WS_MAXIMIZE   = 0x01000000
$WS_SYSMENU    = 0x00080000
$SW_RESTORE    = 9
$SWP_FRAMECHANGED = 0x0020
$SWP_SHOWWINDOW   = 0x0040

[void][PainelWin]::ShowWindow($h, $SW_RESTORE)   # se estiver maximizada/minimizada
$estilo = [PainelWin]::GetWindowLong($h, $GWL_STYLE)
$estilo = $estilo -band (-bnot ($WS_CAPTION -bor $WS_THICKFRAME -bor $WS_MINIMIZE -bor $WS_MAXIMIZE -bor $WS_SYSMENU))
[void][PainelWin]::SetWindowLong($h, $GWL_STYLE, $estilo)
[void][PainelWin]::SetWindowPos($h, [IntPtr]::Zero, $b.X, $b.Y, $b.Width, $b.Height, ($SWP_FRAMECHANGED -bor $SWP_SHOWWINDOW))
[void][PainelWin]::SetForegroundWindow($h)

$msg = "OK: painel no monitor $Monitor ($($tela.DeviceName)) - $($b.X),$($b.Y) $($b.Width)x$($b.Height)"
Write-Host $msg -ForegroundColor Green

# Dica: se abriu na tela errada, rode  .\monitor-pos.ps1 1 / 2 / 3  para ver as
# coordenadas de cada monitor e ajuste a variavel MONITOR no Iniciar-Painel-TV.bat.
