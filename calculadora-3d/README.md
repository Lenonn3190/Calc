# Calculadora de Precificação 3D

Calcula o preço de venda de peças impressas em 3D na **Shopee**, no **Mercado Livre**
e no **TikTok Shop**, considerando o custo real de fabricação e as taxas que cada
marketplace cobra hoje. Feita para uso no celular: uma tela, campos grandes, resultado
sempre visível na barra de baixo.

## Como usar no celular

1. Abra `index.html` (pelo GitHub Pages, por um servidor local ou pelo arquivo único).
2. No Chrome/Safari, use **Adicionar à tela de início** — vira app e funciona offline.
3. Preencha a seção **2 · Minha operação** uma vez: ela fica salva no aparelho.
4. Para cada peça, mexa só na seção **1 · A peça** e leia o comparativo.

Arquivo único, sem servidor e sem instalação:

```bash
node build-artifact.mjs          # gera calculadora-3d.html
```

O `calculadora-3d.html` é autossuficiente (HTML + CSS + JS num arquivo só): dá para
mandar por WhatsApp, salvar no Drive ou abrir direto no celular.

## O que ela calcula

**Custo de fabricação (por peça)**

| Item | Como entra na conta |
|---|---|
| Material | `gramas × preço do kg ÷ 1000` — aceita vários materiais |
| Energia | `(watts ÷ 1000) × horas × tarifa kWh` |
| Máquina | `valor da impressora ÷ vida útil em horas` + manutenção por hora |
| Custos fixos | rateio de aluguel/internet por hora de máquina |
| Mão de obra | minutos de acabamento × valor da sua hora |
| Insumos e embalagem | valor direto por peça |
| Peças por placa | divide material, tempo, energia e máquina pelo número de peças |
| Taxa de falha | `custo ÷ (1 − % falha)` — as peças boas absorvem as perdidas |

**Taxas de venda**

- Comissão e taxa fixa de cada marketplace, por faixa de preço.
- Frete pago pelo vendedor, por canal.
- Imposto, anúncios (ads) e antecipação de recebíveis, aplicados em todos os canais.

**Resultado por marketplace**

- Preço sugerido para o objetivo escolhido (margem %, markup %, lucro R$ ou preço fixo).
- Lucro por peça, margem líquida e **lucro por hora de impressora** — a métrica que
  mostra se vale a pena ocupar a máquina com aquela peça.
- Preço mínimo de equilíbrio (lucro zero).
- A conta aberta: cada taxa, linha a linha.

## O detalhe que mais dá dinheiro: o degrau de faixa

Na Shopee, R$ 79,99 paga 20% + R$ 4 (≈ R$ 20,00 de taxa) e R$ 80,00 paga 14% + R$ 16
(R$ 27,20). Um centavo a mais no anúncio custa **R$ 7,21 a mais em taxa**.

A calculadora resolve o preço faixa a faixa e escolhe o menor preço que atinge seu
objetivo — por isso ela ancora sozinha em R$ 79,99 quando isso ainda fecha a margem.
Se você digitar um preço logo acima de um degrau, ela avisa quanto você ganharia
vendendo um pouco mais barato.

## Regras de cobrança embutidas (agosto/2026)

**Shopee** — tabela única desde 01/03/2026, sem o antigo teto de R$ 100 de comissão.
O percentual já inclui o Programa de Frete Grátis (14% de comissão + 6% do programa).

| Preço do item | Comissão | Taxa fixa |
|---|---|---|
| até R$ 7,99 | 50% | — |
| R$ 8,00 a R$ 79,99 | 20% | R$ 4 |
| R$ 80,00 a R$ 99,99 | 14% | R$ 16 |
| R$ 100,00 a R$ 199,99 | 14% | R$ 20 |
| acima de R$ 200,00 | 14% | R$ 26 |

Vendedor CPF com mais de 450 pedidos em 90 dias paga R$ 3 a mais por item.

**Mercado Livre** — comissão de 11% a 14% no Clássico e 16% a 19% no Premium,
conforme a categoria (ajustável no app). Itens abaixo de R$ 79 pagam custo por unidade
vendida; desde 02/03/2026 esse valor varia por peso e dimensão da embalagem, então os
valores de referência (R$ 6,25 / R$ 6,50 / R$ 6,75, ou 50% do preço até R$ 12,49)
servem de ponto de partida — confirme no Simulador de Custos. A partir de R$ 79 o frete
é grátis para o comprador e sai do bolso do vendedor, com subsídio conforme reputação:
use o campo *Frete que você paga*.

**TikTok Shop** — estrutura vigente desde 15/07/2026: abaixo de R$ 50, 10% + R$ 4 por
item; a partir de R$ 50, 6% + R$ 6. O Programa de Frete Grátis soma 6% sobre o preço e
a comissão de afiliado é definida por você.

> As tabelas mudam. Todas ficam em `core.js` → `REGRAS`, num só lugar, com a data de
> vigência em `REGRAS.atualizadoEm`. Confira sempre o extrato do seu canal.

## Estrutura

```
calculadora-3d/
├── index.html            # Telas e campos
├── style.css             # Estilos mobile-first, claro e escuro
├── core.js               # Regras dos marketplaces e matemática (sem DOM)
├── app.js                # Interface: lê os campos, desenha o comparativo
├── tests.js / tests.html # Testes do motor (node tests.js ou abrir no navegador)
├── build-artifact.mjs    # Gera a versão de arquivo único
├── manifest.json, sw.js  # PWA: instalar na tela de início e usar offline
└── icon.svg
```

## Testes

```bash
node tests.js       # 36 casos: faixas, custos, preço reverso, degraus
```

Ou abra `tests.html` no navegador para ver o mesmo relatório.

## Fórmulas do preço reverso

Com `pv` = soma dos percentuais sobre o preço (comissão + frete grátis + afiliado +
imposto + ads + antecipação), `f` = taxas fixas + frete e `c` = custo da peça:

- Margem alvo `m` sobre a venda: `preço = (f + c) ÷ (1 − pv − m)`
- Markup alvo `k` sobre o custo: `preço = (f + c × (1 + k)) ÷ (1 − pv)`
- Lucro alvo `L` em reais: `preço = (f + c + L) ÷ (1 − pv)`

Como `pv` e `f` mudam de faixa em faixa, a conta é resolvida dentro de cada faixa e
só valem as soluções que caem na própria faixa; quando a solução fica abaixo do piso
da faixa, o piso vira candidato. Vence o menor preço que atinge o objetivo.
