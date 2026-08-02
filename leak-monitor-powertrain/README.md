# Leak Test | Powertrain — Monitor de Estanqueidade

Painel de acompanhamento dos resultados de **leak test** (teste de estanqueidade) em
formato **andon / SCADA**: uma coluna por posto, tarja colorida com a situação, números
grandes para leitura à distância, leitura automática de uma base compartilhada, metas
configuráveis e alarme sonoro. Fora o título, a tela não tem nenhum outro elemento fixo.

Postos monitorados:

| Área | Posto | O que mostra |
|---|---|---|
| Usinagem | **Bloco** | FPY, testadas/aprovadas/NOK, principal reprovação, lâmpadas dos últimos testes |
| Usinagem | **Cabeçote** | idem |
| Montagem de Motores | **Leak Zero** | idem |
| Montagem de Motores | **Water Leak** | idem |

App web em **arquivo único** (funciona offline, instalável como PWA) + servidor leve
em PowerShell para o modo compartilhado. Sem instalar nada além do Windows/PowerShell
já existente.

## Recursos

- **Coluna por posto** com FPY (aprovação de 1ª passagem), testadas/aprovadas/NOK,
  atingimento da meta, principal motivo de reprovação, retestes, vazamento médio ×
  limite e o **painel de lâmpadas** com o resultado dos últimos testes (verde/vermelho).
- **Cores por situação** na tarja do posto: verde (meta atingida), amarelo (abaixo da
  meta), vermelho (abaixo do mínimo ou NOK acima do limite) — a tarja pisca e o
  **alarme sonoro** dispara na virada para crítico.
- **Tela limpa**: só o cabeçalho do título. A barra de controle (período, atualizar,
  metas, registros, alarme, tela cheia, configurações) aparece ao mexer o mouse e some
  sozinha; avisos de base offline/desatualizada surgem ao lado do título.
- **Períodos**: turno atual, dia de produção, 24 h, 7 dias ou base completa.
- **Base compartilhada** em `dados\leak.csv`, relida automaticamente (intervalo configurável),
  com metas em `dados\config.json` valendo para todos os painéis da rede.
- **Leitor de CSV tolerante**: separador `;`, `,` ou tabulação, nomes de coluna
  flexíveis, datas em formato BR ou ISO, decimal com vírgula. Sem a coluna de
  resultado, deduz OK/NOK comparando o vazamento medido com o limite.
- **Registros e exportação**: clique em uma coluna para ver os testes do período, o
  FPY por modelo de motor e exportar registros e resumo por posto em CSV.
- **Modo TV**: tela cheia, escala ajustável, colunas dimensionadas para a altura da
  tela, atalhos de teclado e `.bat` de quiosque.
- **Sem servidor**: dá para carregar um CSV à mão (fica no aparelho) ou usar dados de
  demonstração para treinar/apresentar.

## Como o painel aparece

![Painel com dados simulados](docs/painel-exemplo.png)

Exemplo acima com a base simulada de `docs/leak-simulado.csv` (~1.200 testes em 6 h):
Bloco na meta, Cabeçote abaixo da meta, Leak Zero crítico e Water Leak na meta.

O quadro de referência com todas as condições possíveis — estados dos postos, avisos
de base e a regra de classificação — está em **`docs/condicoes-painel.png`**, bom para
imprimir e deixar ao lado da TV.

![Condições do painel](docs/condicoes-painel.png)

## Estrutura

```
app/    Pacote pronto para rodar (index.html + servidor + ícones + CSV de exemplo)
docs/   Imagens de referência do painel e uma base simulada para testes
src/    Código-fonte e build
        parts/    head.html (layout/CSS), app.js (dados), app2.js (interface)
        server/   servir.ps1, .bat, manifest.json, LEIA-ME.md
        build.mjs Monta app/index.html a partir das partes
        gerar-icones.py  Gera icon-192.png / icon-512.png
```

## Como usar

Veja **`app/LEIA-ME.md`**. Resumo:

- **Servidor central (PC + TVs + celulares)**: no PC servidor, duplo clique em
  `Iniciar-Servidor-LeakTest.bat`, coloque o arquivo em `dados\leak.csv` e acesse pelo
  IP mostrado (ex.: `http://192.168.0.10:8090/`).
- **TV**: `Abrir-TV-Tela-Cheia.bat` (ajuste o IP dentro do arquivo) ou tecla **F**.
- **Pasta de rede / avulso**: abra `index.html` e carregue o CSV pela barra de controle → Fonte de dados.

### Formato do CSV (uma linha por peça testada)

```csv
data_hora;posto;modelo;serie;resultado;vazamento;limite;unidade;motivo;turno;reteste
2026-07-31 06:12:04;Bloco;1.5 Turbo;BLO100231;OK;1,84;5;cc/min;;1;N
2026-07-31 06:12:51;Bloco;1.5;BLO100232;NOK;7,62;5;cc/min;Galeria de água;1;N
2026-07-31 06:35:02;Bloco;1.5;BLO100232;OK;2,10;5;cc/min;;1;S
2026-07-31 06:13:20;Leak Zero;1.0;MOT550118;NOK;4,90;3;cc/min;Junta do cabeçote;1;N
2026-07-31 06:14:02;Water Leak;1.5;MOT550119;OK;1,20;6;cc/min;;1;N
```

As bancadas também podem empurrar uma linha por peça direto no servidor:
`POST /api/registro?f=leak.csv` com a linha no corpo.

## Desenvolvimento

O `app/index.html` é gerado a partir de `src/parts/` pelo `src/build.mjs`.

```
cd src
node build.mjs        # requer Node só no build; o painel em si é HTML puro
python3 gerar-icones.py   # só quando quiser regerar os ícones
```

## Cálculos

- **FPY** = aprovadas na 1ª passagem ÷ testadas na 1ª passagem. Uma peça só conta como
  1ª passagem uma vez: repetições da mesma série (ou linhas marcadas como reteste)
  entram em *retestes*.
- **Yield final** = peças com resultado final OK ÷ peças distintas do período.
- **Refugo / retido** = peças cujo último teste no período continua NOK.
- **Atingimento** = FPY ÷ meta (barra e percentual ao lado da meta).
- **Cadência** = testes de 1ª passagem ÷ horas decorridas entre o primeiro e o último
  teste do período.
