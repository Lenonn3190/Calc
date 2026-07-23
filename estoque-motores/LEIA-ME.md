# Gestão de Estoque — Cabeçote, Bloco & Cilindro (painel para TV)

Painel web em **tela cheia (modo quiosque)** para acompanhar em uma TV quantas
peças de **Cabeçote**, **Bloco** e **Cilindro** estão disponíveis, com **gráficos
por local**. A base é uma planilha **Excel (`.xlsx`)** exportada do sistema (JDE),
e o painel se **atualiza sozinho a cada 1 hora**, mostrando a **data e hora da
última atualização** e uma **contagem regressiva** para a próxima.

## Como funciona

- O painel lê o arquivo **`estoque.xlsx`** que fica na **mesma pasta** do
  `index.html` (precisa ser servido por um servidor web — veja abaixo).
- A cada **60 minutos** ele relê a planilha automaticamente. Assim, basta
  substituir/atualizar o `estoque.xlsx` que a TV reflete sozinha no próximo ciclo.
- Cada peça é classificada pela **descrição** e o estoque é somado **por local**
  (`LILOCN`). O número em destaque é o **disponível = estoque bom − rejeitados**.
- **Rejeitados (ESTREJ = "DR"):** as peças no local `ESTREJ` são tratadas como
  rejeitadas e **descontadas do total** (mostradas em vermelho no card).
- **Gráficos com séries por local:** barras agrupadas (peça × local) e um donut
  com a distribuição do estoque por local (FND / MMO / USI / DR).
- **Cilindro dividido por modelo:** o código do modelo é extraído do **IMLITM**
  (o trecho após `12100`, ex.: `12100KPT` → **KPT**). O card do Cilindro mostra
  os modelos (**KPT / K2G / KRM**) com valor e meta, e cada modelo tem meta/mínimo
  próprios (o card pisca se algum modelo ficar abaixo do mínimo).
- Sempre mostra: **última atualização** (data/hora) e **próxima atualização**
  (contagem regressiva).

## Metas (🎯) e alertas

Clique no botão **🎯** (ou tecla **M**) para abrir o **Cadastro de Metas**. Defina,
por peça **e por local**:

- **Meta (alvo)** — quanto se quer ter em estoque;
- **Mínimo** — abaixo dele o card **pisca em vermelho** (alerta na TV);
- **DR máx.** — quantidade de rejeitados aceitável (acima disso marca ⚠).

O que o painel passa a mostrar:

- **Barra de progresso** em cada card (verde = meta atingida, amarelo = abaixo da
  meta, vermelho = abaixo do mínimo) e um selo de status.
- **Alerta visual** (card piscando em vermelho) quando o disponível fica abaixo do
  mínimo, quando **qualquer local** fica abaixo do mínimo dele, ou quando **qualquer
  modelo** (Cilindro) fica abaixo do mínimo. O selo indica o motivo ("Abaixo do
  mínimo" / "Local abaixo do mínimo" / "Modelo abaixo do mínimo") e o chip fica vermelho.
- **Mini-gráfico de tendência** (sparkline) por peça, com a variação desde a
  leitura anterior (▲/▼).
- Marca de **meta por local** (linha tracejada) no gráfico de barras.

**Salvar / carregar parâmetros:** as metas ficam salvas neste navegador e podem ser
**exportadas** (`⬇ Exportar .json`) e **importadas** (`⬆ Importar .json`). Para o
modo quiosque, basta colocar o arquivo **`metas.json`** (o exportado) na **mesma
pasta** do `index.html` — o painel carrega as metas automaticamente na primeira
abertura. Um `metas.json` de exemplo já acompanha o projeto.
- **Reabre já conectado:** depois que a base é lida uma vez, ela fica salva no
  próprio navegador. Ao reabrir a página (ou se o servidor/planilha ficar
  indisponível no momento), o painel mostra **na hora a última base** — sem pedir
  configuração de novo — e sincroniza sozinho assim que a base voltar.

## A planilha (`estoque.xlsx`)

Primeira linha é o cabeçalho. Colunas da base (JDE) — nomes flexíveis:

| Coluna     | Obrigatória | Descrição                                                        |
|------------|:-----------:|------------------------------------------------------------------|
| **IMDSC1** | ✅          | Descrição da peça — classifica em Cabeçote / Bloco / Cilindro    |
| **QTD**    | ✅          | Quantidade (aceita `1.234` ou `1234`)                            |
| **LILOCN** | ✅*         | Local: `ESTFND`→FND, `ESTMMO`→MMO, `ESTUSI`→USI, `ESTREJ`→DR     |
| IMLITM     | —           | Código do item (conta os "tipos" por peça)                       |
| LILOTN     | —           | Lote (usado nas linhas de rejeitado)                             |

> \*Sem `LILOCN` o painel ainda funciona, mas sem separação por local nem DR.
>
> **Locais e categorias** são configuráveis no início do `<script>` (bloco
> `CONFIG` → `categorias` e `locais`). Um **modelo** pode ser baixado no painel
> (**⚙ → "Baixar modelo (.xlsx)"**). O `estoque.xlsx` incluído é a sua base real —
> substitua pelo export mais recente quando quiser.

## Como colocar na TV (modo quiosque)

1. Coloque a pasta em um PC e sirva por HTTP (o `fetch` do `.xlsx` não funciona
   abrindo o arquivo direto com `file://`). Opções:
   - **Python:** dentro da pasta, `python -m http.server 8080` e acesse
     `http://localhost:8080/`.
   - Qualquer servidor web/rede simples (mesmo esquema dos outros projetos).
2. Na TV, abra o navegador no endereço e pressione **F** (ou o botão **⛶**) para
   entrar em **tela cheia**. Para quiosque de verdade, inicie o Chrome/Edge com:
   ```
   chrome --kiosk http://SEU-IP:8080/
   ```

## Atalhos

| Tecla | Ação                          |
|:-----:|-------------------------------|
| **F** | Tela cheia (quiosque)         |
| **R** | Atualizar a base agora        |
| **T** | Alternar tema claro/escuro    |
| **Esc** | Fechar a janela de configuração |

Botões no canto superior direito: **⟳** atualizar agora · **◐** tema ·
**⛶** tela cheia · **⚙** configurar / carregar planilha manualmente.

## Personalizar

Abra o `index.html` e edite o bloco `CONFIG` no início do `<script>`:

```js
const CONFIG = {
  arquivo: 'estoque.xlsx',   // nome/caminho da planilha
  intervaloMin: 60,          // minutos entre atualizações automáticas
  unidade: 'un',             // unidade exibida (un, pç, ...)
  categorias: [ ... ]        // peças acompanhadas e palavras-chave
};
```

Tudo funciona **offline** depois de carregado — sem depender de internet nem de
bibliotecas externas (a leitura de `.xlsx` é embutida na própria página).
