# Powertrain · Monitor de Ausências

Painel para TV/monitor que mostra **quem está fora agora**, quem volta e quem sai nos
próximos dias, a partir da lista **"Gerenciamento de saídas"** (SharePoint) do ETG.

O painel trabalha sempre com a **data e hora reais** do PC, e **relê sozinho o arquivo de dados
a cada 1 hora** — é só salvar o CSV atualizado por cima que a tela muda. Ninguém precisa importar
nada no dia a dia.

```
powertrain-ausencias\
├── index.html          o painel
├── Iniciar-Painel.bat  duplo clique no PC do monitor
├── servir.ps1          servidor local (chamado pelo .bat)
└── dados\
    ├── saidas.csv      ← ausências (export do SharePoint)
    ├── frota.csv       ← log do leitor RFID (uma linha por tag lida)
    ├── pessoas.csv     ← cadastro crachá -> nome
    └── historico.json  ← histórico de uso dos carros (gravado pelo painel)
```

## Colocar no monitor (27" na vertical)

1. Copie a pasta inteira para o PC ligado ao monitor (ou para uma pasta de rede).
2. Gire o monitor: **Configurações → Sistema → Vídeo → Orientação da tela → Retrato**.
3. Duplo clique em **`Iniciar-Painel.bat`**. Ele sobe o servidor e abre o painel em tela cheia.
4. Para subir junto com o Windows: atalho do `.bat` dentro de `shell:startup`.

Deixe a janela preta do servidor aberta — é ela que mantém o painel no ar.

### "O fornecedor não pôde ser verificado" ao abrir o .bat

Normal na primeira vez. O Windows marca todo arquivo que veio de download, e-mail ou OneDrive
como "da internet" (*Mark of the Web*) e avisa antes de executar — não é problema do painel.

- **Agora:** clique em **Executar** e desmarque *"Sempre perguntar antes de abrir este arquivo"*.
  O próprio `.bat` já remove a marca do resto da pasta, então o aviso não volta.
- **Para não aparecer nem na primeira vez:** antes de descompactar, clique com o botão direito
  no **.zip** → **Propriedades** → marque **Desbloquear** → OK. Aí tudo sai limpo.
- **Se já descompactou e quiser limpar de uma vez:** clique com o botão direito na pasta →
  *Abrir no Terminal* (ou PowerShell) e rode:

  ```powershell
  Get-ChildItem -Recurse | Unblock-File
  ```

Se a política da empresa bloquear a execução de scripts de vez (não é o caso do aviso acima),
fale com a TI — o painel precisa apenas rodar `powershell.exe` local, sem instalar nada e sem
acesso à internet.

### Onde colocar a pasta

Prefira um caminho **local** do PC do monitor, tipo `C:\Powertrain-Monitor`. Rodar de dentro do
**OneDrive** funciona, mas tem dois incômodos: o `historico.json` e o `frota.csv` mudam o tempo
todo e ficam em sincronização constante, e se dois PCs abrirem a mesma pasta o OneDrive pode
criar cópias de conflito (`historico-DESKTOP-XX.json`). Se quiser a pasta no OneDrive para
compartilhar, tudo bem — só mantenha **um** PC rodando o `.bat`.

O layout é dimensionado para **1440 × 2560**. Quando o conteúdo passa da altura da tela, o
painel rola sozinho devagar (ida e volta) e pausa 45 s se alguém mexer no mouse.

## Atualizar os dados

**No SharePoint:** *Exportar → Exportar para CSV*. Salve por cima de `dados\saidas.csv`.
Em até 1 hora o painel se atualiza sozinho. Só isso.

Precisa ver a mudança na hora, sem esperar o ciclo? ⚙ → **Reler agora**. E para mudar o ritmo,
`recarregarSeg` no `CONFIG` (em segundos: 3600 = 1 h, 1800 = 30 min, 300 = 5 min).

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
  referência e passa a reler **aquele mesmo arquivo** de hora em hora, igual. A ressalva é que,
  **ao reabrir o navegador**, o Chrome pede um clique para devolver a permissão — aparece um
  botão vermelho *Reconectar arquivo* no cabeçalho.

## Frota — status dos carros por RFID

O bloco **Frota** mostra se cada carro está **disponível** ou **em uso**, e com quem. A fonte é
o leitor RFID, que só precisa **anexar uma linha** por tag lida em `dados\frota.csv`:

```
Data/Hora;Tag
09/08/2026 07:02;HRV
09/08/2026 07:02;CR-0421
09/08/2026 11:30;HRV
```

**A regra são duas leituras para sair e uma para voltar:**

1. Encosta a tag do carro (`HRV` ou `CIVIC`) **e** o crachá — **em qualquer ordem**.
2. Fechada a dupla, o carro vira **EM USO** com o nome do condutor, tirado de `pessoas.csv`.
3. Passa a tag **do mesmo carro** de novo → **encerra** e volta a **DISPONÍVEL**.

**A ordem não importa.** Quem estiver esperando aparece na tela enquanto isso:

- Carro primeiro → o card fica **AGUARDANDO CRACHÁ** (azul, piscando), com contagem regressiva.
- Crachá primeiro → uma faixa no topo do bloco avisa *"Fulano passou o crachá às 09:34 — encoste
  agora a tag do carro"*, também com contagem.

As duas leituras precisam cair dentro da janela de `esperaCrachaSeg` (padrão 2 min). O relógio do
uso conta sempre a partir da leitura **do carro**, que é quando ele saiu — não importa se veio
antes ou depois do crachá.

A barra embaixo é o **tempo decorrido desde a marcação**, na escala de `usoReferenciaHoras`
(padrão 8 h). Passando disso, o card fica **vermelho** com "fora há mais de 8 h" — serve para
enxergar de longe carro que não voltou.

`dados\pessoas.csv` — cadastro dos crachás:

```
ID;Nome;Departamento
CR-0421;Thiego Ferreira;NMG
```

O log é **append-only**: o leitor só acrescenta linhas, nunca reescreve o arquivo. O painel
reprocessa o log inteiro a cada ciclo e chega no estado atual — então reiniciar o PC, recarregar
a página ou trocar de monitor **não perde nem inventa estado**. O ciclo da frota é curto
(20 s por padrão), separado do ciclo de 1 hora das ausências, porque carro saindo do pátio muda
na hora.

### Casos que o painel já trata

| Situação | O que acontece |
|---|---|
| Crachá que não está no cadastro | Entra em uso mostrando o número do crachá e a marca "crachá fora do cadastro" |
| Crachá lido antes da tag do carro | Fica pendente e pareia quando o carro for lido (dentro da janela) |
| Crachá sozinho, sem carro nenhum na sequência | Some do painel ao vencer a janela, sem abrir uso |
| Crachá já usado numa dupla | Não é reaproveitado pelo carro seguinte |
| Tag do carro passada e crachá não vem em 2 min | Vira **EM USO · condutor não identificado** (configurável em `semCrachaViraUso`) |
| Tag do mesmo carro duas vezes seguidas | Cancela a marcação, carro segue disponível |
| Tag escrita como `hrv`, `HR-V`, `HRV2020` | Todas reconhecidas (veja `apelidos` em `CONFIG.veiculos`) |
| Linha corrompida no log | Descartada; o resto do log continua valendo |
| Log some ou o leitor para | Mantém o último estado na tela e avisa no bloco |

> O bloco de frota **exige o painel servido** (`Iniciar-Painel.bat`). Aberto direto do arquivo, o
> navegador não deixa a página ler o log — nesse caso o bloco explica isso na tela.

### Histórico de uso — `dados/historico.json`

O painel grava sozinho o histórico das viagens nesse arquivo, na mesma pasta, sempre que algo
muda. Serve para relatório mensal, rateio de custo ou conferência de quem estava com o carro.

```json
{
  "gerado_em": "2026-08-10T09:45:53",
  "total_viagens": 1,
  "em_andamento": 1,
  "por_veiculo":  [ { "veiculo": "CIVIC", "viagens": 1, "minutos": 90, "horas": 1.5 } ],
  "por_condutor": [ { "condutor": "Thiego Ferreira", "viagens": 1, "minutos": 90, "horas": 1.5 } ],
  "viagens": [
    {
      "id": "CIVIC-2026-08-10T03:05:00",
      "veiculo": "CIVIC", "modelo": "Honda Civic", "placa": "GDT-9J40",
      "condutor": "Thiego Ferreira", "cracha": "CR-0421", "departamento": "NMG",
      "identificado": true,
      "saida": "2026-08-10T03:05:00", "retorno": "2026-08-10T04:35:00",
      "duracao_min": 90, "em_andamento": false
    }
  ]
}
```

- Viagem **em aberto** entra na lista com `retorno: null` e `em_andamento: true`, e só entra nos
  resumos quando o carro é devolvido.
- Datas em **hora local**, sem fuso — batem com o que aparece na tela.
- Ordenado da viagem **mais recente para a mais antiga**.
- `identificado: false` marca a viagem em que ninguém passou o crachá.

**Duas coisas importantes sobre esse arquivo:**

1. Ele é **derivado** do `frota.csv`: o painel recalcula tudo do zero a cada mudança e regrava.
   Se o log for apagado ou truncado, **o histórico encolhe junto**. Para guardar período longo,
   arquive o `frota.csv` (ex.: `frota-2026-08.csv` no fim do mês) — ou copie o `historico.json`
   antes de zerar o log.
2. Quem grava é o **servidor** (`Iniciar-Painel.bat`), porque página de navegador não escreve em
   disco. Sem o `.bat`, o quadro de frota não funciona e o histórico não é gerado.

## Ajustes

No bloco `CONFIG`, no início do `index.html`:

| Campo | O que faz |
|---|---|
| `arquivoDados` | Caminho das ausências, lido continuamente. Aceita subpasta ou URL completa. |
| `arquivoFrota` / `arquivoPessoas` | Log do leitor RFID e cadastro de crachás. |
| `apiHistorico` | Rota do servidor que grava `dados/historico.json`. |
| `frotaRecarregarSeg` | Ciclo do quadro de veículos (padrão 20 s). |
| `esperaCrachaSeg` | Janela entre as duas leituras, em qualquer ordem (padrão 120 s). |
| `usoReferenciaHoras` | Escala da barra de tempo; acima disso o card fica vermelho (padrão 8 h). |
| `semCrachaViraUso` | Sem crachá no prazo: `true` marca em uso sem condutor, `false` mantém disponível. |
| `veiculos` | Cadastro dos carros: tag, modelo, ano, cor, placa, tipo (`suv`/`sedan`) e apelidos de tag. |
| `recarregarSeg` | De quanto em quanto tempo reler o arquivo (padrão 3600 s = 1 hora). |
| `tentarDeNovoSeg` | Prazo curto para tentar de novo quando a leitura falha (padrão 60 s). |
| `efetivoTotal` | Efetivo do Powertrain — base do indicador de **Presença (%)**. Ajuste para o número real. |
| `diasTimeline` | Janela do gráfico de ocupação (padrão 14 dias). |
| `diasAgenda` | Horizonte da lista "Próximas saídas" (padrão 45 dias). |
| `atualizarSeg` | Recálculo do painel com o relógio andando — sem ler arquivo (padrão 60 s). É o que tira alguém de "ausente" na hora em que o retorno chega, então não convém aumentar. |
| `rolagemAuto` | `false` desliga a rolagem de quiosque. |

Cores por motivo e por departamento ficam em `CORES_MOTIVO` e `CORES_DEPTO`. Motivo não
cadastrado não quebra o painel — entra em cinza com o próprio nome.

Para outros PCs da rede abrirem o painel, rode o `.bat` **como administrador** (ele libera a
porta 8090 no firewall) e use o endereço `http://<ip-do-pc>:8090/` que aparece na janela preta.

## Observações

- O painel avisa em amarelo quando **todos os registros do arquivo já venceram** — sinal de
  que o CSV parou de ser atualizado.
- Se o arquivo sumir ou o servidor cair, a tela **não fica em branco**: mantém a última leitura
  e sinaliza a falha no cabeçalho. Enquanto durar a falha ele tenta de novo a cada minuto, em vez
  de esperar a hora cheia — assim uma queda rápida de rede não deixa o painel parado.
- Pessoas são agrupadas pelo texto do campo *Nome Colaborador*. Se a mesma pessoa aparecer como
  `Nelton` e `Nelton M Borges`, o painel conta como duas — vale padronizar o preenchimento na
  lista de origem.
