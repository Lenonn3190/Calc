# Powertrain · Monitor de Ausências

Painel para TV/monitor que mostra **quem está fora agora**, quem volta e quem sai nos
próximos dias, a partir da lista **"Gerenciamento de saídas"** (SharePoint) do ETG.

Arquivo único: `index.html`. Não precisa de servidor, internet ou instalação —
é só abrir no navegador.

## Colocar no monitor (27" na vertical)

1. Copie `index.html` para o PC ligado ao monitor (ou para uma pasta de rede).
2. Gire o monitor na configuração de vídeo do Windows: **Configurações → Sistema →
   Vídeo → Orientação da tela → Retrato**.
3. Abra o arquivo no Edge/Chrome e entre em tela cheia com **F11**.
4. Opcional — abrir sozinho ao ligar o PC: atalho na pasta `shell:startup` com
   `msedge.exe --kiosk "C:\caminho\index.html" --edge-kiosk-type=fullscreen`.

O layout foi dimensionado para **1440 × 2560**. Quando o conteúdo passa da altura da
tela, o painel rola sozinho devagar (ida e volta) para nada ficar escondido — e pausa
por 45 s se alguém mexer no mouse.

## Atualizar os dados

Pelo botão **⚙** no canto superior direito:

- **Arraste o CSV** exportado da lista (no SharePoint: *Exportar → Exportar para CSV*),
  ou cole o conteúdo no campo de texto.
- As colunas são localizadas **pelo nome do cabeçalho**, então a ordem não importa.
  Reconhecidas: `Descrição da Saída`, `Motivo`, `Nome Colaborador`, `Departamento`,
  `Destino`, `Data de início`, `Data de término`, `Transporte`.
- Datas em `dd/mm/aaaa hh:mm` ou `aaaa-mm-dd hh:mm`.

Os dados ficam salvos no navegador (localStorage), então o painel reabre com a última
carga quando o PC é reiniciado.

Alternativa sem importação: editar a lista `DADOS` no topo do `index.html`.

## Ajustes

No bloco `CONFIG`, no início do `index.html`:

| Campo | O que faz |
|---|---|
| `efetivoTotal` | Efetivo do Powertrain — base do indicador de **Presença (%)**. Ajuste para o número real. |
| `diasTimeline` | Tamanho da janela do gráfico de ocupação (padrão 14 dias). |
| `diasAgenda` | Horizonte da lista "Próximas saídas" (padrão 45 dias). |
| `atualizarSeg` | Intervalo de recálculo automático (padrão 60 s). |
| `rolagemAuto` | `false` desliga a rolagem de quiosque. |

Cores por motivo e por departamento ficam em `CORES_MOTIVO` e `CORES_DEPTO`. Motivo não
cadastrado não quebra o painel — entra em cinza com o próprio nome.

## Observações

- **Data de referência** (no ⚙) permite conferir o painel numa data específica, para
  planejar a semana. Em branco = data/hora reais (modo monitor).
- O painel avisa em amarelo quando **todos os registros carregados já venceram** —
  sinal de que o CSV precisa ser reexportado.
- Pessoas são agrupadas pelo texto do campo *Nome Colaborador*. Se a mesma pessoa
  aparecer como `Nelton` e `Nelton M Borges`, o painel conta como duas — vale
  padronizar o preenchimento na lista de origem.
