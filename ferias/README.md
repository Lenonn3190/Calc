# Painel Gerencial de Férias — HTML para e-mail

Mapa de calor das ausências por quinzena, picos de risco, fila de apontamento e
pendências — pronto para colar no corpo de um e-mail.

Mesma arquitetura do painel de estoque: o **gerador** roda no navegador e lê a
sua base; a **saída** é HTML de e-mail com tabelas e estilo inline, que é o que
Outlook e Gmail realmente renderizam. A pré-visualização usa o mesmo
renderizador da exportação.

## O mapa de calor

Cada mês vira duas linhas — **1ª quinzena (dias 1–15)** e **2ª quinzena (dia 16
até o fim do mês)**. As colunas são as áreas, mais o total do time e quem está
fora:

```
MÊS      DIAS    I/H  NMG  CTRL  FND/USI  GESTAO  TOTAL  QUEM ESTÁ DE FÉRIAS
ago/26   1–15     2    ·     2      1        ·      5    Carol, Davi, Guilherme, Nishida +1
         16–31    1    3     3      1        ·      8    Carol, Erick, Jefferson, Jessica +4
```

Uma pessoa conta **uma vez** em cada quinzena em que fica ausente ao menos um
dia. Quem sai dia 10 e volta dia 24 aparece nas duas quinzenas do mês — é isso
que mostra a cobertura real da equipe, e não a soma de dias.

### A escala de cor

Escalonada no limite, não proporcional:

| Faixa | Cor | Significado |
|---|---|---|
| 0 | cinza | ninguém fora |
| até metade do limite | verde | folgado |
| abaixo do limite | amarelo | ocupado |
| exatamente o limite | âmbar | no limite |
| até 1,5× o limite | vermelho claro | acima do limite |
| acima disso | vermelho | crítico |

Proporcional não funciona aqui: com limite de 2 por área, uma escala linear
pintaria **uma única pessoa** de amarelo e alarmaria o mapa inteiro. Escalonado,
só esquenta quem encostou de fato no limite.

As colunas de área usam `limitePorArea`; a coluna Total usa `limiteTotal`. Por
isso uma linha pode ter área laranja e total verde — duas pessoas na mesma área
saturam a cobertura daquela área mesmo com o time inteiro tranquilo. É
exatamente o risco que o painel existe para mostrar.

## Como usar

1. Abra `gerador-dash-ferias.html` no navegador.
2. Arraste a planilha de férias — `.xlsx`, `.csv` ou `.json`.
   Sem base ainda? **Baixar modelo (.csv)** mostra o formato e
   **Ver com dados de exemplo** mostra o resultado.
3. Confira o mapeamento das colunas.
4. **Gerar painel** → **Copiar para colar no e-mail** → `Ctrl+V` no Outlook.

## Apontando a base pelo próprio HTML

Bloco `CONFIG` no topo do `<script>`:

```js
const CONFIG = {
  fonte: 'dados/base_ferias.xlsx',   // caminho ou URL da base
  titulo:  'Painel Gerencial de Férias',
  unidade: 'ETG 103ki',
  ciclo:   '',        // vazio = deduz do intervalo da base
  regras: {
    limiteTotal:     6,   // ausências simultâneas toleradas no time
    limitePorArea:   2,   // ausências simultâneas toleradas por área
    diasApontamento: 40,  // regra N-40: lançar até 40 dias antes do retorno
    topPicos:        8,
    mesInicio: '', mesFim: ''   // 'aaaa-mm' para recortar o mapa
  },
  colunas: null      // null = detecção automática
};
```

`limiteTotal` e `limitePorArea` são o coração do painel — são eles que definem o
que é pico e o que é folga. Ajuste ao tamanho real da equipe antes de enviar.

> O carregamento por `fonte` só funciona servido por **http**. Abrindo o HTML
> direto do disco (`file://`) o navegador bloqueia a leitura — use o seletor de
> arquivo, que funciona sempre.

## Formato 1 — o plano de férias em matriz (Planejamento de HC)

O gerador **reconhece sozinho** a planilha `Planejamento_de_HCNC.xlsm` e não
exige nenhuma preparação: arraste e pronto. Ele entende o layout:

- bloco de identificação à esquerda (`AREA`, `NOME`, `IT`, `MAT.`,
  `VENCIMENTO`, `DIAS VENCIDO`, `PERÍODO AQUISITIVO`, `DIAS PROPORCIONAIS`);
- calendário à direita com uma linha de anos, uma de meses e quatro colunas
  (semanas) por mês;
- duas linhas por pessoa, marcadas `PLANO` e `REAL`.

Dentro do calendário os números são **dias do mês**, lidos em pares
início/fim. As três grafias usadas na planilha funcionam:

| Na planilha | Vira |
|---|---|
| `13~17` numa célula só | 13/07 a 17/07 |
| `21` … `8` em células separadas | 21/12 a 08/01 |
| `21` \| `~` \| `8` com o til numa célula própria | 21/12 a 08/01 |

As linhas `REAL` viram períodos com status *Realizado*; as `PLANO`,
*Planejado*. Quem não tem nenhum dia lançado entra como **pendente de
agendamento**, levando junto o vencimento.

O botão **Baixar base normalizada (.csv)** achata a matriz em uma linha por
período — serve para conferir a leitura e para alimentar outras ferramentas.

## Formato 2 — tabela simples

## Colunas da base

| Campo | Obrigatório | O que habilita |
|---|:--:|---|
| Colaborador | ✅ | tudo |
| Data de início | ✅ | posição no mapa de calor |
| Data de fim **ou** Dias | ✅ (uma das duas) | até quando a pessoa fica fora |
| Área / Setor | | colunas do mapa e limite por área |
| Status do período | | leitura auxiliar |
| Apontado no sistema | | fila de apontamento N-40 |
| Limite / vencimento | | alerta de período vencido nos pendentes |

Uma linha por **período**, não por pessoa — quem parte as férias em três blocos
ocupa três linhas. Linhas sem data de início entram como *pendentes de
agendamento*.

Sinônimos são reconhecidos ignorando acento e caixa: `INÍCIO FÉRIAS`, `Saída`,
`Dt Inicio` e `Começo` caem todos em *Data de início*. Datas aceitam
`dd/mm/aaaa`, `aaaa-mm-dd` e o serial numérico do Excel.

Se só houver **Dias**, o fim é calculado como `início + dias − 1` (dias
corridos, como manda a CLT). Se houver as duas colunas, **Data de fim** manda.

## Conferência da base

A cada geração o painel revisa a base e lista o que encontrou de errado, com a
**referência da célula** para você corrigir direto na planilha:

- `VENCIMENTO` que não é data;
- pessoa sem `VENCIMENTO` ou sem `DIAS VENCIDO`;
- dia que não existe no mês (ex.: 31 em abril);
- término anterior ao início;
- dia sem par de término no calendário;
- valor não reconhecido dentro do calendário;
- mais dias agendados do que o direito (`DIAS VENCIDO` + `DIAS PROPORCIONAIS`).

Períodos com data inválida ficam **fora** do mapa de calor — não são chutados.

## Os outros blocos

- **Picos de ausência** — só as quinzenas que ultrapassam algum limite, com
  selos mostrando onde estourou (`Time 8/6`, `NMG 3/2`) e quem está fora.
- **Fila de apontamento N-40** — períodos futuros ainda não lançados no sistema,
  ordenados pela data limite (retorno − 40 dias). Aparece só se a base tiver a
  coluna *Apontado*.
- **Pendentes de agendamento** — quem ainda não tem período marcado, com o
  vencimento, seguido das **quinzenas com folga** para encaixar essas pessoas.

## Sem dependências

Nenhuma biblioteca externa, nem CDN. O `.xlsx` é descompactado com o
`DecompressionStream` nativo do navegador — funciona offline e em rede fechada.
Requer Chrome/Edge 103+, Firefox 113+ ou Safari 16.4+; em navegador mais antigo,
salve a planilha como `.csv`.
