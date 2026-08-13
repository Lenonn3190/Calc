# Powertrain · Monitor de Ausências

Painel para TV/monitor que mostra **quem está fora agora**, quem volta e quem sai nos
próximos dias, a partir da lista **"Gerenciamento de saídas"** (SharePoint) do ETG.

O painel trabalha sempre com a **data e hora reais** do PC, e **relê sozinho o arquivo de dados
a cada 1 hora** — é só salvar o CSV atualizado por cima que a tela muda. Ninguém precisa importar
nada no dia a dia.

```
powertrain-ausencias\
├── index.html             o painel (também captura o leitor RFID)
├── cadastro.html          tela para cadastrar os crachás da equipe
├── Iniciar-Painel.bat     duplo clique no PC do monitor
├── Cadastrar-Crachas.bat  abre a tela de cadastro
├── servir.ps1             servidor local (chamado pelos .bat)
└── dados\
    ├── fonte.txt       ← caminho do arquivo de saídas (aponte aqui, uma vez)
    ├── saidas.csv      ← ausências, se não usar o fonte.txt
    ├── frota.csv       ← log do leitor RFID (uma linha por tag lida)
    ├── pessoas.csv     ← cadastro crachá -> nome
    ├── veiculos.json   ← cadastro dos carros (tag, placa, modelo)
    └── historico.json  ← histórico de uso dos carros (gravado pelo painel)
```

## Colocar no monitor (27" na vertical)

1. Copie a pasta inteira para o PC ligado ao monitor (ou para uma pasta de rede).
2. Gire o monitor: **Configurações → Sistema → Vídeo → Orientação da tela → Retrato**.
3. Duplo clique em **`Iniciar-Painel.bat`**. Ele sobe o servidor e abre o painel em **modo
   quiosque do Edge, na segunda tela**. Para sair do quiosque: **Ctrl+W** ou **Alt+F4**.
4. Para subir junto com o Windows: atalho do `.bat` dentro de `shell:startup`.

Deixe a janela preta do servidor aberta — é ela que mantém o painel no ar.

**Abriu na tela errada?** A numeração que o Windows usa nem sempre bate com a ordem que o
sistema entrega para os programas. Abra o `Iniciar-Painel.bat` no Bloco de Notas e troque o
`-Monitor 2` por `1` ou `3`, na última linha. A janela preta informa em qual tela abriu e com
que tamanho, o que ajuda a acertar.

O painel usa um **perfil próprio do Edge** (em `%LOCALAPPDATA%\PowertrainMonitor`). Sem isso o
Edge reaproveitaria uma janela já aberta e ignoraria a tela escolhida — e o painel ainda mexeria
nas abas de quem usa o PC.

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

## De onde vêm os registros de saída

Aceita **.xlsx (Excel)** e **.csv** — o painel reconhece o formato pelo conteúdo do arquivo, não
pela extensão. Datas do Excel viram data de verdade, e célula deixada em branco não desloca as
colunas.

### Apontar o arquivo uma vez

Abra **`dados\fonte.txt`** no Bloco de Notas e cole numa linha o caminho completo do arquivo
onde a equipe registra as saídas:

```
C:\Users\sb026431\OneDrive - Honda\05 - ETG\Registros de saidas.xlsx
```

> Para pegar o caminho sem digitar: no Explorer, **Shift + botão direito** no arquivo →
> *"Copiar como caminho"*, cole e **tire as aspas**.

Pronto — o painel busca **sempre nesse mesmo lugar**, inclusive depois de reiniciar o PC, e sem
pedir clique nenhum (o monitor não tem mouse). Vale para caminho local ou de rede (`\\servidor\...`).

Sem preencher o `fonte.txt`, o painel usa `dados\saidas.xlsx` ou `dados\saidas.csv` da própria
pasta.

**A planilha pode ficar aberta no Excel** enquanto alguém edita: o servidor lê em modo
compartilhado. Se pegar o arquivo travado no meio de uma gravação, mantém a última leitura boa
na tela e tenta de novo no ciclo seguinte.

O painel relê de hora em hora. Precisa ver na hora? ⚙ → **Reler agora**. Para mudar o ritmo,
`recarregarSeg` no `CONFIG` (3600 = 1 h, 1800 = 30 min, 300 = 5 min).

### Alternativa: escolher pelo ⚙

⚙ → **Apontar arquivo…** abre o seletor do Windows. O painel guarda a escolha e ela passa a
**ter prioridade** sobre o `fonte.txt` em todas as aberturas seguintes. A ressalva: ao reabrir o
navegador, o Chrome pede um clique para devolver a permissão — por isso, **no monitor da parede
prefira o `fonte.txt`**, que nunca pede nada.

Precisa ver a mudança na hora, sem esperar o ciclo? ⚙ → **Reler agora**. E para mudar o ritmo,
`recarregarSeg` no `CONFIG` (em segundos: 3600 = 1 h, 1800 = 30 min, 300 = 5 min).

O cabeçalho mostra o tempo todo de onde os dados vieram e a que horas foram lidos:

| Cor | Significa |
|---|---|
| 🟢 `api/saidas · lido às 14:32` | lendo normalmente |
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

## Esconder e recolher blocos

Nem todo turno precisa de tudo na tela. Duas formas, e a escolha **fica guardada** — o painel
reabre do mesmo jeito depois de reiniciar o PC:

- **Recolher:** clique no **título** do bloco. Ele vira só uma faixa, com o contador ainda à
  vista (ex.: *Frota — veículos · 2 de 2 livres*). Clique de novo para expandir.
- **Esconder:** botão de blocos no cabeçalho (ao lado do ⚙) → desmarque o bloco. Ele sai da tela
  por completo.

No mesmo menu, **Mostrar tudo** devolve tudo ao normal e **Recolher tudo** enxuga a tela de uma
vez, deixando só os títulos.

Usar o menu **não é confundido com leitura de tag** — com ele aberto, o painel para de escutar o
leitor.

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

### Ligando o leitor RFID

**Tela única, sem mouse.** O leitor USB se comporta como **teclado**: ao encostar a tag, ele
"digita" o código na janela em foco. O **próprio painel** captura isso — não há outra página
para abrir nem janela para alternar.

Basta o painel estar aberto e em foco (o `Iniciar-Painel.bat` já abre em tela cheia). Encostou a
tag, aparece um **aviso grande no topo da tela**:

| Situação | O que o painel mostra |
|---|---|
| Tag do carro lida | *"Honda HR-V lido — agora encoste o crachá do condutor"*, com contagem regressiva |
| Crachá lido primeiro | *"Fulano — agora encoste a tag do carro"*, com contagem |
| Dupla completa | *"Saída registrada — Fulano saiu com o Honda HR-V"* |
| Tag do carro em uso | *"Honda HR-V devolvido — disponível de novo"* |
| Servidor fora do ar | *"Não consegui gravar"*, em vermelho |

O aviso **some sozinho** depois de 7 segundos (`avisoLeituraSeg`) — ninguém precisa clicar em
nada. O quadro de veículos é recarregado **na hora**, sem esperar o ciclo de 20 s, e a tela rola
sozinha até o bloco Frota para quem está de pé em frente ao monitor.

**Teste sem tag nenhuma:** com o painel aberto, digite `C3FE4090` no teclado e tecle
<kbd>Enter</kbd>. Se o aviso aparecer, a cadeia inteira está funcionando.

**Se nada acontecer ao encostar a tag**, verifique nesta ordem:

| Sintoma | Causa provável |
|---|---|
| Nada acontece na tela | A janela do painel não está em foco — clique nela uma vez |
| Aviso vermelho "não consegui gravar" | O `Iniciar-Painel.bat` não está aberto |
| O leitor não digita nada em lugar nenhum | Leitor não é do tipo teclado (veja abaixo) |
| Aviso aparece mas o carro não muda de estado | A tag não está no `dados/veiculos.json` |

Para saber o tipo do seu leitor: abra o **Bloco de Notas** e encoste uma tag. Se o código
aparecer digitado, é do tipo teclado (HID) e funciona direto. Se não aparecer nada, o leitor é
serial/COM ou usa software próprio — nesse caso ele precisa gravar no `dados\frota.csv` ou
chamar a rota `POST /api/leitura` com a tag no corpo.

Digitação nos campos do ⚙ **não** é confundida com leitura. Para desligar a captura e deixar o
painel só de exibição, `capturaLeitor: false` no `CONFIG`.

### Cadastro dos carros — `dados/veiculos.json`

Tag, placa, modelo e cor ficam **só nesse arquivo**, lido pelas duas telas. Para trocar uma tag
ou incluir um carro, edite ele e pronto — nada para sincronizar:

```json
[
  { "tag": "C3FE4090", "modelo": "Honda HR-V", "ano": "2020", "cor": "Branca",
    "tipo": "suv", "placa": "FQK-2B71", "lugares": 5, "apelidos": ["HRV"] }
]
```

`tipo` muda só o desenho do carro (`suv` ou `sedan`). `apelidos` são outros códigos que devem
valer para o mesmo veículo. Se o arquivo faltar ou estiver com erro de digitação, as telas caem
na lista de reserva embutida e continuam funcionando.

## Cadastrando os crachás

O `pessoas.csv` que veio no pacote tem códigos de exemplo (`CR-0421`…). Para trocar pelos números
reais **sem editar CSV na mão**, use a tela de cadastro. Dois caminhos para chegar nela:

- **Pelo próprio painel:** botão do **crachá**, no canto superior direito (ao lado do ⚙). Abre na
  mesma janela — em quiosque não existe aba nem barra de endereço — e o botão **← Voltar ao
  painel** traz de volta. Voltar **grava o cadastro sozinho** se tiver algo pendente, e o painel
  remonta tudo do zero ao reabrir: nenhuma viagem em curso se perde, porque o estado da frota vive
  no `frota.csv`, não na página.
- **Direto, sem passar pelo painel:** duplo clique em **`Cadastrar-Crachas.bat`** (com o
  `Iniciar-Painel.bat` já aberto — é ele que grava o arquivo).

**Uma vez só, no começo: traga a lista de nomes.** Duas opções:

- **"Trazer nomes das saídas"** — puxa a equipe do **mesmo arquivo de saídas que o painel já lê**,
  então não é preciso montar uma segunda planilha. Saída lançada para mais de uma pessoa
  (`Tanaka; Nakahara`) entra como **duas** pessoas, que é o certo aqui: crachá é individual.
- **Arrastar uma planilha** para a área tracejada — **.xlsx** ou **.csv**. O nome sai da coluna
  `Nome` (ou `Colaborador`); se a planilha tiver uma coluna só, ela vira o nome. Colunas
  `Departamento` e `Telefone`, se existirem, são aproveitadas.

**Quem não estiver em lista nenhuma** — gente que acabou de entrar, ou nome grafado diferente do
que está nas saídas — é só digitar o nome na busca: aparece o botão *"Cadastrar «Fulano» como
pessoa nova"*, e <kbd>Enter</kbd> faz o mesmo. Ela entra na lista já com o campo do crachá aberto.

**Depois, para cada pessoa** — o roteiro é todo pelo teclado, sem tirar a mão do leitor:

1. **Digite parte do nome.** A lista vai filtrando enquanto você digita (não liga para acento nem
   maiúscula: `erick` acha *Érick Paiva*).
2. **<kbd>Enter</kbd>** escolhe o primeiro da lista — ou clique no nome. O cursor já cai no campo
   do crachá, que fica piscando esperando a leitura.
3. **Encoste o crachá no leitor.** Ele digita o código sozinho e manda <kbd>Enter</kbd>, o que
   leva o cursor para o telefone. Sem leitor à mão, dá para digitar o número e teclar Enter.
4. **Telefone é opcional** — é o que alimenta o QR de WhatsApp do painel. Deixe em branco e tecle
   <kbd>Enter</kbd>: salva do mesmo jeito. Vale escrever como quiser (`19991234567`,
   `(19) 99123-4567`, `+55 19 99123-4567`); a tela padroniza.
5. **Departamento** também é opcional, e serve para quem foi cadastrado à mão. Quem veio de
   planilha ou das saídas já chega com o departamento preenchido.
6. A coluna ao lado do nome passa a dizer **"crachá cadastrado"** e a busca se limpa sozinha,
   pronta para o próximo.

No fim, **"Salvar cadastro"** grava o `dados\pessoas.csv` (o arquivo anterior fica guardado como
`pessoas.csv.bak`). Enquanto houver mudança pendente, o rodapé avisa e o botão fica aceso.

**É o mesmo arquivo que o painel usa** — não existe importação nem sincronização. Salvou, o painel
relê no ciclo seguinte da frota (20 s) e passa a reconhecer o crachá **sem reiniciar nada**: um
carro que estava em uso marcado como *"crachá fora do cadastro"* passa a mostrar o nome da pessoa,
com o QR de WhatsApp, na mesma viagem que já estava em curso.

Detalhes que evitam dor de cabeça:

- **Crachá repetido é recusado**, dizendo de quem ele já é. Para transferir, abra a outra pessoa,
  clique em **Tirar crachá**, salve — aí o código fica livre.
- **Carregar a lista de novo não apaga nada**: quem já estava cadastrado mantém crachá e telefone,
  e só os nomes novos entram. Vale tanto para a planilha quanto para "Trazer nomes das saídas" —
  dá para repetir quando entrar alguém na equipe.
- **Telefone pela metade** não passa: ou completo com DDD, ou em branco.
- Sem o servidor no ar, o botão **Baixar CSV** salva o arquivo em Downloads para você copiar por
  cima do `dados\pessoas.csv`.

Enquanto um crachá não estiver cadastrado, o painel não trava: o carro entra em uso como
**"Condutor não cadastrado"**, marcado com *"crachá fora do cadastro"*.

### O número do crachá não aparece em tela nenhuma

Nem no painel, nem na tela de cadastro. O painel fica exposto num monitor de parede e o número do
crachá é o que abre porta e catraca — quem passar na frente não deve conseguir anotá-lo. Por isso:

- No cadastro, o campo de leitura vem **mascarado** (o leitor digita, aparecem pontinhos) e a
  lista mostra só *"crachá cadastrado"* ou *"sem crachá"*.
- No painel, crachá fora do cadastro aparece como *"Condutor não cadastrado"*, e o aviso de
  leitura não repete mais o código lido.

O número continua gravado normalmente no `dados\pessoas.csv`, no `frota.csv` e no
`historico.json` — quem precisar conferir abre o arquivo. **Não há como ver um crachá pela tela:**
para trocar o de alguém, use *"Tirar crachá"* e leia o novo.

### QR do condutor — falar por WhatsApp

Quando um carro está **em uso**, o card mostra um **QR code**. Quem apontar a câmera do celular
cai direto na **conversa do WhatsApp com o condutor**, já com uma mensagem escrita:

> Olá Thiego Ferreira, sobre o Honda Civic (GDT-9J40)

O telefone vem da coluna **Telefone** do `dados/pessoas.csv`:

```
ID;Nome;Departamento;Telefone
CR-0421;Thiego Ferreira;NMG;19 99123-4567
```

Pode digitar como preferir — `19991234567`, `(19) 99123-4567`, `+55 19 99123-4567` — o painel
normaliza. Números de 10 ou 11 dígitos ganham o **55** do Brasil automaticamente; para outro
país, escreva o DDI.

Sem telefone cadastrado, o card avisa *"sem telefone no cadastro"* em vez de mostrar um QR que
não levaria a lugar nenhum.

Para desligar o QR, `qrCondutor: false` no `CONFIG`. Para mudar a mensagem, `mensagemWhats` —
`{nome}`, `{modelo}` e `{placa}` são trocados na hora; deixe vazio para abrir a conversa sem
texto nenhum.

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
| `arquivoDados` | Onde buscar as saídas. `api/saidas` deixa o servidor resolver pelo `fonte.txt`. |
| `arquivoFrota` / `arquivoPessoas` | Log do leitor RFID e cadastro de crachás. |
| `apiHistorico` | Rota do servidor que grava `dados/historico.json`. |
| `frotaRecarregarSeg` | Ciclo do quadro de veículos (padrão 20 s). |
| `esperaCrachaSeg` | Janela entre as duas leituras, em qualquer ordem (padrão 120 s). |
| `usoReferenciaHoras` | Escala da barra de tempo; acima disso o card fica vermelho (padrão 8 h). |
| `semCrachaViraUso` | Sem crachá no prazo: `true` marca em uso sem condutor, `false` mantém disponível. |
| `veiculos` | Cadastro dos carros: tag, modelo, ano, cor, placa, tipo (`suv`/`sedan`) e apelidos de tag. |
| `qrCondutor` | `false` tira o QR de WhatsApp do card do carro. |
| `mensagemWhats` | Texto já preenchido na conversa. Aceita `{nome}`, `{modelo}` e `{placa}`. |
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
