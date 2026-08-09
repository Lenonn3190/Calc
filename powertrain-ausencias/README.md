# Powertrain · Monitor de Ausências

Painel para TV/monitor que mostra **quem está fora agora**, quem volta e quem sai nos
próximos dias, a partir da lista **"Gerenciamento de saídas"** (SharePoint) do ETG.

O painel trabalha sempre com a **data e hora reais** do PC, e **relê sozinho** o arquivo de
dados — é só salvar o CSV atualizado por cima que a tela muda. Ninguém precisa importar nada
no dia a dia.

```
powertrain-ausencias\
├── index.html          o painel
├── Iniciar-Painel.bat  duplo clique no PC do monitor
├── servir.ps1          servidor local (chamado pelo .bat)
└── dados\
    └── saidas.csv      ← é ESTE arquivo que o painel fica lendo
```

## Colocar no monitor (27" na vertical)

1. Copie a pasta inteira para o PC ligado ao monitor (ou para uma pasta de rede).
2. Gire o monitor: **Configurações → Sistema → Vídeo → Orientação da tela → Retrato**.
3. Duplo clique em **`Iniciar-Painel.bat`**. Ele sobe o servidor e abre o painel em tela cheia.
4. Para subir junto com o Windows: atalho do `.bat` dentro de `shell:startup`.

Deixe a janela preta do servidor aberta — é ela que mantém o painel no ar.

O layout é dimensionado para **1440 × 2560**. Quando o conteúdo passa da altura da tela, o
painel rola sozinho devagar (ida e volta) e pausa 45 s se alguém mexer no mouse.

## Atualizar os dados

**No SharePoint:** *Exportar → Exportar para CSV*. Salve por cima de `dados\saidas.csv`.
Em até 1 minuto o painel se atualiza sozinho. Só isso.

O cabeçalho mostra o tempo todo de onde os dados vieram e a que horas foram lidos:

| Cor | Significa |
|---|---|
| 🟢 `dados/saidas.csv · lido às 14:32` | lendo normalmente |
| 🔴 `FALHA AO LER — …` | não conseguiu ler; a tela segue com a **última leitura boa** |
| 🟡 `DADOS DE EXEMPLO` | nenhuma fonte definida ainda |

Colunas reconhecidas (**pelo nome do cabeçalho**, a ordem não importa): `Descrição da Saída`,
`Motivo`, `Nome Colaborador`, `Departamento`, `Destino`, `Data de início`, `Data de término`,
`Transporte`. Datas em `dd/mm/aaaa hh:mm` ou `aaaa-mm-dd hh:mm`. Aceita `;`, `,` ou tabulação
como separador, e campos entre aspas com separador dentro.

### E se eu abrir o index.html direto, sem o .bat?

Aí o navegador **proíbe** que a página leia um caminho por conta própria — é uma trava de
segurança do Chrome/Edge, não dá para contornar por configuração. Duas saídas:

- **Recomendado:** use o `Iniciar-Painel.bat`. Zero cliques, para sempre.
- **Alternativa:** ⚙ → **Apontar arquivo…**, escolha o `saidas.csv` uma vez. O painel guarda a
  referência e passa a reler **aquele mesmo arquivo** a cada minuto, igual. A ressalva é que,
  **ao reabrir o navegador**, o Chrome pede um clique para devolver a permissão — aparece um
  botão vermelho *Reconectar arquivo* no cabeçalho.

## Ajustes

No bloco `CONFIG`, no início do `index.html`:

| Campo | O que faz |
|---|---|
| `arquivoDados` | Caminho lido continuamente. Aceita subpasta ou URL completa. |
| `recarregarSeg` | De quanto em quanto tempo reler o arquivo (padrão 60 s). |
| `efetivoTotal` | Efetivo do Powertrain — base do indicador de **Presença (%)**. Ajuste para o número real. |
| `diasTimeline` | Janela do gráfico de ocupação (padrão 14 dias). |
| `diasAgenda` | Horizonte da lista "Próximas saídas" (padrão 45 dias). |
| `atualizarSeg` | Intervalo de recálculo do painel (padrão 60 s). |
| `rolagemAuto` | `false` desliga a rolagem de quiosque. |

Cores por motivo e por departamento ficam em `CORES_MOTIVO` e `CORES_DEPTO`. Motivo não
cadastrado não quebra o painel — entra em cinza com o próprio nome.

Para outros PCs da rede abrirem o painel, rode o `.bat` **como administrador** (ele libera a
porta 8090 no firewall) e use o endereço `http://<ip-do-pc>:8090/` que aparece na janela preta.

## Observações

- O painel avisa em amarelo quando **todos os registros do arquivo já venceram** — sinal de
  que o CSV parou de ser atualizado.
- Se o arquivo sumir ou o servidor cair, a tela **não fica em branco**: mantém a última leitura
  e sinaliza a falha no cabeçalho.
- Pessoas são agrupadas pelo texto do campo *Nome Colaborador*. Se a mesma pessoa aparecer como
  `Nelton` e `Nelton M Borges`, o painel conta como duas — vale padronizar o preenchimento na
  lista de origem.
