# Painel Gerencial de Estoque — HTML para e-mail

Gera um painel de estoque no mesmo estilo visual do `DASH_FERIAS`, pronto para
colar no corpo de um e-mail. Você aponta a base de dados e o painel se monta
sozinho.

## Por que são dois passos (e não um HTML só)

Cliente de e-mail **não executa JavaScript**, e o Outlook ignora CSS grid,
gradiente e variáveis CSS — que é justamente o que o painel de férias usa. Então:

| Camada | Arquivo | Onde roda |
|---|---|---|
| **Gerador** | `gerador-dash-estoque.html` | No seu navegador. Lê a base, calcula e monta o painel. |
| **Saída** | HTML exportado | No e-mail. Só tabelas e estilo inline — o que Outlook e Gmail realmente renderizam. |

A pré-visualização na tela usa o **mesmo renderizador** da exportação, então o
que você vê é literalmente o que chega no e-mail.

## Como usar

1. Abra `gerador-dash-estoque.html` no navegador (duplo clique já serve).
2. Arraste a planilha de estoque para a área tracejada — aceita `.xlsx`, `.csv` e `.json`.
   Se não tiver a base ainda, clique em **Baixar modelo (.csv)** para ver o formato,
   ou em **Ver com dados de exemplo** para conhecer o resultado.
3. Confira o mapeamento de colunas (ele detecta sozinho, mas você pode corrigir).
4. Clique em **Gerar painel**.
5. Clique em **Copiar para colar no e-mail**, abra uma nova mensagem no Outlook
   e cole no corpo com `Ctrl+V`.

No Gmail, use **Abrir em nova aba** → `Ctrl+A` → `Ctrl+C` → colar na mensagem.

## Apontando a base pelo próprio HTML

No topo do `<script>` existe um bloco `CONFIG`. É o único lugar que você precisa
mexer:

```js
const CONFIG = {
  fonte: 'dados/base_estoque.xlsx',   // caminho ou URL da base
  titulo:  'Painel Gerencial de Estoque',
  unidade: 'ETG 103ki',
  moeda:   'R$',
  regras: {
    coberturaCriticaDias: 15,
    coberturaAtencaoDias: 30,
    diasSemGiro:          90,
    topReposicao:         10,
    topExcesso:            8
  },
  colunas: null      // null = detecção automática
};
```

Com `fonte` preenchida o painel carrega a base sozinho ao abrir.

> **Atenção:** o carregamento por `fonte` só funciona se o arquivo estiver sendo
> servido por **http**. Abrindo o HTML direto do disco (`file://`) o navegador
> bloqueia a leitura por segurança — nesse caso use o seletor de arquivo, que
> funciona sempre. Para servir por http, o mesmo
> `Iniciar-Servidor-CheckSync.bat` do CheckSync ETG resolve.

Para fixar as colunas manualmente em vez de deixar na automática:

```js
colunas: {
  codigo:    'CÓD. MATERIAL',
  descricao: 'DESCRIÇÃO DO ITEM',
  categoria: 'FAMÍLIA',
  saldo:     'SALDO ATUAL',
  minimo:    'ESTOQUE MÍNIMO',
  custo:     'CUSTO UNITÁRIO'
}
```

## Colunas da base

Só **Código**, **Descrição** e **Saldo** são obrigatórias. Cada coluna a mais
liga um pedaço do painel:

| Campo | Obrigatório | O que habilita |
|---|:--:|---|
| Código / SKU | ✅ | identificação do item |
| Descrição | ✅ | identificação do item |
| Saldo atual | ✅ | tudo |
| Categoria / Área | | os dois gráficos de barras |
| Estoque mínimo | | classificação crítico/atenção e quantidade a repor |
| Estoque máximo | | detecção de excesso e cálculo de reposição |
| Custo unitário | | valor imobilizado e capital parado |
| Consumo médio mensal | | cobertura em dias e ordem da fila de reposição |
| Unidade | | exibição junto ao saldo |
| Localização | | leitura auxiliar |
| Última movimentação | | itens sem giro |

Os nomes das colunas são reconhecidos por sinônimo, ignorando acento e caixa —
`SALDO ATUAL`, `Qtde`, `Estoque`, `Disponível` caem todos em *Saldo atual*.

Números aceitam formato brasileiro (`1.234,56`) e americano (`1,234.56`).
Datas aceitam `dd/mm/aaaa`, `aaaa-mm-dd` e o serial numérico do Excel.

## Como o painel classifica cada item

Avaliado nesta ordem, o primeiro que bater vence:

| Status | Regra |
|---|---|
| **Ruptura** | saldo ≤ 0 |
| **Repor agora** | saldo < mínimo, **ou** cobertura < `coberturaCriticaDias` |
| **Excesso** | saldo > máximo |
| **Atenção** | saldo ≤ mínimo × 1,2, **ou** cobertura < `coberturaAtencaoDias` |
| **Normal** | nenhuma das anteriores |

Os cinco quadros de *Situação do estoque* são exclusivos entre si e somam o
total de itens da base.

- **Cobertura (dias)** = saldo ÷ consumo médio mensal × 30.
- **Repor** = (estoque máximo, ou mínimo × 2 quando não houver máximo) − saldo.
- **Capital parado** = itens em excesso + itens com saldo parados há mais de
  `diasSemGiro` dias, ordenados por valor.

## Sem dependências

O gerador não usa nenhuma biblioteca externa — nem CDN, nem arquivo ao lado.
A leitura de `.xlsx` descompacta o arquivo com o `DecompressionStream` nativo do
navegador. Funciona offline e em rede fechada.

Requer um navegador atual (Chrome/Edge 103+, Firefox 113+, Safari 16.4+). Em
navegador mais antigo o `.xlsx` não abre — salve a planilha como `.csv`, que
funciona em qualquer um.
