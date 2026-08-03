# Gestão de Estoque — Cabeçote, Bloco, Cilindro, Motor & Transmissão (painel para TV)

Painel web em **tela cheia (modo quiosque)** para acompanhar em uma TV quantas
peças de **Cabeçote**, **Bloco**, **Cilindro**, **Motor (conjunto)** e
**Transmissão** estão disponíveis. A base é uma planilha **Excel (`.xlsx`)** exportada do sistema (JDE),
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
- **Impregna (LIMCU = `TERCHAB3`):** linhas com esse `LIMCU` **não entram no
  disponível** — aparecem à parte, num chip **"Impregna"** logo abaixo do DR no card.
  (Configurável em `CONFIG.impregna` → `limcu` / `label`.)
- **Cilindro dividido por modelo:** o código do modelo é extraído do **IMLITM**
  (o trecho após `12100`, ex.: `12100KPT` → **KPT**). O card do Cilindro mostra
  os modelos (**KPT / K2G / KRM**) com valor e meta, e cada modelo tem meta/mínimo
  próprios (o card pisca se algum modelo ficar abaixo do mínimo).
- **Motor (conjunto) agrupado:** as variantes da descrição são agrupadas em
  **1.5 Turbo** (as que têm "TURBO") e **1.5** (as demais). O card **Motor** mostra
  os dois grupos, cada um com meta/mínimo próprios. (Os grupos são configuráveis em
  `CONFIG` → categoria Motor → `modelo.grupos`.)
- **Cobertura / previsão (dias úteis):** no **rodapé de cada card**, por quantos
  **dias úteis** o estoque atual aguenta = *base ÷ consumo por dia*. Verde
  (folgado), amarelo (baixo) e vermelho (crítico — o card pisca). O consumo/dia e os
  **limiares** (crítico e baixo) são **editáveis no cadastro de metas** (padrão:
  crítico < 1 dia, baixo < 5 dias). Ex.: 511 motores/dia em ITI, e 1 cabeçote + 1
  bloco + 1 transmissão por motor → 511/dia cada. Sem consumo definido, a peça não mostra previsão.
  - A base da cobertura é configurável por peça em `CONFIG` → categoria →
    `coberturaLocais`. Cada item pode ser um **local inteiro** (`'MMO'`) ou um
    **sublocal específico** (`'USI OP_OFF'` = só o OP_OFF de USI). Ex.: o **Bloco**
    usa `['MMO','USI OP_OFF']` (o card mostra "· MMO+USI OP_OFF"); o **Cabeçote**
    usa `['MMO','USI']`. As demais peças usam o disponível total.
- **Rodapé** — status da conexão, **última atualização** (data/hora), **próxima
  atualização** (contagem regressiva) e o arquivo da base. Ficam no rodapé para
  liberar o topo: o **título é grande** (o painel é lido de longe na TV) e os
  cards ganham altura. A atualização automática ocorre **de hora em hora, no
  minuto :00** (topo de cada hora).
- **Alerta reforçado:** quando uma peça entra em alerta, o card **pisca em
  vermelho** com anel grosso, fundo avermelhado, faixa lateral larga, o nome em
  vermelho e o selo do motivo sólido (branco no vermelho) — pensado para ser
  notado de longe. Quem tiver "reduzir animações" ligado no sistema vê o mesmo
  destaque, sem piscar.
- **Tela sempre ligada:** o painel usa o *Screen Wake Lock* para impedir que a
  tela apague/bloqueie enquanto estiver aberto (Chrome/Edge em localhost/https).
  Para garantia total, configure também o Windows para **nunca suspender** e
  **desativar o bloqueio de tela/protetor** (veja abaixo).

## Atualizar a base (`estoque.xlsx`) automaticamente

O painel relê o `estoque.xlsx` **de hora em hora, no minuto :00**, mas o
**arquivo em si** precisa ser atualizado antes disso. A tarefa agendada abaixo
regrava o arquivo no minuto **:50** (10 min antes da releitura do painel). Formas:

**A) Tarefa agendada (recomendado)** — mantém tudo automático mesmo com a TV sozinha:
1. Deixe na pasta a sua **planilha de consulta** (a que puxa do sistema/JDE) e abra
   **`Atualizar-Base.ps1`**, ajustando a variável **`$origem`** com o caminho dela.
   *(A consulta precisa atualizar sem pedir login/senha nem abrir caixas de diálogo —
   deixe as credenciais salvas na conexão.)*
2. Dê duplo clique em **`Agendar-Atualizacao.bat`** (se pedir, rode como Administrador).
   Ele cria uma tarefa no Windows que roda o script **a cada 1 hora** (no minuto :50),
   abre a consulta, atualiza (`RefreshAll`) e **regrava o `estoque.xlsx`** de forma segura.
3. O painel pega a base nova sozinho no próximo ciclo. (Log em `atualizar-base.log`.)

**B) Só dentro do Excel** — se o PC ficar com o Excel aberto: em *Dados → Consultas e
Conexões → Propriedades*, marque **"Atualizar a cada N minutos"** e **"Atualizar ao abrir"**.
(Menos robusto: o Excel precisa ficar aberto e pode travar o arquivo.)

> Notas:
> - A planilha de consulta precisa atualizar **sem pedir login/senha** (deixe as
>   credenciais salvas na conexão), senão a atualização trava.
> - A tarefa agendada deve rodar **com um usuário que enxergue a conexão** (no PC do
>   quiosque, logado no mesmo usuário, funciona bem).
> - Confira a **bitagem** do Excel/driver (32 vs 64 bits) se a conexão usar ODBC por baixo.

## Metas (🎯) e alertas

Clique no botão **🎯** (ou tecla **M**) para abrir o **Cadastro de Metas**. Defina,
por peça **e por local**:

- **Meta (alvo)** — quanto se quer ter em estoque;
- **Mínimo** — abaixo dele o card **pisca em vermelho** (alerta na TV);
- **DR máx.** — quantidade de rejeitados aceitável (acima disso marca ⚠);
- **Consumo/dia útil** — usado para calcular a **cobertura em dias** (previsão);
- **Decremento** — quando preenchido, **subtrai esse valor do disponível** (ajuste
  manual), **por peça** (seção Total) e/ou **por local** (coluna *Decr.* na seção
  Por local). Entra apenas **no cálculo**: reflete no número do card, na %, no
  alarme, na cobertura e no e-mail, **sem aparecer como texto** em nenhum lugar.
  Deixe 0 para nenhum.

O alerta de cor segue a **% da meta**: abaixo do **mínimo** = vermelho; acima do
mínimo mas abaixo de **95%** da meta = laranja; a partir de 95% = sem alarme.

O que o painel passa a mostrar:

- **Barra de progresso** em cada card (verde = meta atingida, amarelo = abaixo da
  meta, vermelho = abaixo do mínimo) e um selo de status.
- **Alerta visual** (card piscando em vermelho) quando o disponível fica abaixo do
  mínimo, quando **qualquer local** fica abaixo do mínimo dele, ou quando **qualquer
  modelo** (Cilindro) fica abaixo do mínimo. O selo indica o motivo ("Abaixo do
  mínimo" / "Local abaixo do mínimo" / "Modelo abaixo do mínimo") e o chip fica vermelho.
- **Mini-gráfico de tendência** (sparkline) por peça, com as leituras do dia e a
  variação desde a leitura anterior (▲/▼). *(A evolução dos 5 dias fica no
  relatório de e-mail.)*

**Salvar / carregar parâmetros:** as metas ficam salvas neste navegador e podem ser
**exportadas** (`⬇ Exportar .json`) e **importadas** (`⬆ Importar .json`). Para o
modo quiosque, basta colocar o arquivo **`metas.json`** (o exportado) na **mesma
pasta** do `index.html` — o painel carrega as metas automaticamente na primeira
abertura. Um `metas.json` de exemplo já acompanha o projeto.

## Pasta mapeada & relatório por e-mail (📁)

No cadastro de metas (🎯), seção **"Pasta & Relatório por e-mail"**, clique em
**"Mapear pasta"** e escolha uma pasta no PC. A partir daí o painel grava nessa pasta:

- **`metas.json`** — a configuração (sempre que você salvar as metas);
- **`estoque_email.html`** — o **relatório mais recente**, pronto para o **corpo de
  um e-mail** (documento autônomo, com acentos corretos);
- **`estoque_email_AAAAMMDD_HHMM.html`** — uma cópia com carimbo de data/hora.

O relatório é gerado **automaticamente nos horários configurados** (por padrão
**08:30** e **12:30**), e também pelos botões **"Gerar relatório agora"** e
**"Pré-visualizar"**. Formato **executivo**, de cima para baixo:

1. **KPIs** — disponível total (com a variação do dia), peças em alerta, menor
   cobertura e DR total;
2. **Pontos de atenção** — uma linha por peça em alerta, com o motivo e os números;
3. **Cards por peça** — número grande, selo de situação, % da meta, cobertura e um
   **mini-gráfico (sparkline) dos 5 dias** (a leitura rápida do gerente);
4. **Detalhe por peça** — distribuição por local, sublocais, cobertura e modelos.

**Sparkline de 5 dias (n-5), dentro de cada card:** mostra o **fechamento (23:59)
dos 5 dias anteriores** mais o valor atual, com **rótulo de dados em todos os
dias**, a data de cada ponto e a variação do período (▲/▼). Os cards ficam em
**2 por linha** justamente para caber esses rótulos sem se sobrepor. O painel grava
esse fechamento sozinho (`estoque-hist-dia` no navegador): a cada leitura o valor
do dia é sobrescrito, então ao virar o dia sobra a última leitura daquele dia. O
gráfico usa **marcadores posicionados** (não barras) com **escala ampliada na
faixa dos dados** — a variação diária costuma ser pequena (~15%) e, com posição em
vez de comprimento, a escala ampliada mostra a evolução sem distorcer a leitura.
O histórico se forma com o uso: com o painel aberto todo dia, em 5 dias o gráfico
fica completo (até lá o relatório avisa no lugar do gráfico).

> Requisitos: funciona no **Chrome/Edge** servindo em **localhost** ou **https**
> (recurso *File System Access API*). A pasta escolhida fica lembrada entre
> reaberturas; se o navegador pedir, reautorize o acesso clicando em "Mapear pasta".
> O envio do e-mail em si é feito por fora (o painel se encarrega de **gerar** o
> HTML) — veja abaixo o script pronto de envio.

### Enviar o relatório por e-mail automaticamente (horário definido)

O painel **gera** o `estoque_email.html`; quem **envia** é um script no Windows
(o navegador não envia e-mail sozinho, por segurança). Já vem pronto:

1. Abra **`Enviar-Email.ps1`** e preencha no topo:
   - `$Pasta` — a pasta que você **mapeou** no painel (onde nasce o `estoque_email.html`).
     Por padrão usa a pasta do próprio script; ajuste se for outra.
   - `$SmtpServer` / `$SmtpPort` / `$UsarTLS` — o servidor de e-mail. Em fábrica é
     comum um **relay interno na porta 25 sem login** (deixe `$Usuario`/`$Senha` vazios).
     Para Office 365/Exchange com login, use porta **587**, `$UsarTLS = $true` e preencha usuário/senha.
   - `$De` (remetente) e `$Para` (um ou vários destinatários).
2. Dê duplo clique em **`Agendar-Email.bat`** para criar as tarefas de envio. Os
   horários padrão são **08:35** e **12:35** (5 min após o painel gerar o HTML às
   08:30/12:30) — edite `HORA1`/`HORA2` no `.bat` como quiser.
3. Testar na hora: `schtasks /Run /TN "Enviar Estoque 1"` (erros vão para `enviar-email.log`).

> Requisitos: o **PC do quiosque precisa estar ligado e com o painel aberto** nos
> horários (para o `estoque_email.html` estar atualizado). Segurança: evite senha em
> texto puro — prefira o **relay anônimo interno** ou uma conta de serviço dedicada.
> O envio precisa de permissão de rede até o servidor SMTP.
>
> Alternativa: um fluxo do **Power Automate** que observa a pasta e envia o
> `estoque_email.html` — mesma ideia, sem PowerShell.
- **Reabre já conectado:** depois que a base é lida uma vez, ela fica salva no
  próprio navegador. Ao reabrir a página (ou se o servidor/planilha ficar
  indisponível no momento), o painel mostra **na hora a última base** — sem pedir
  configuração de novo — e sincroniza sozinho assim que a base voltar.

## A planilha (`estoque.xlsx`)

Primeira linha é o cabeçalho. Colunas da base (JDE) — nomes flexíveis. A **ordem
das colunas não importa**: o painel localiza cada uma pelo nome do cabeçalho
(pode mover o `LILOCN` para o fim, por exemplo).

| Coluna     | Obrigatória | Descrição                                                        |
|------------|:-----------:|------------------------------------------------------------------|
| **IMDSC1** | ✅          | Descrição — classifica em Cabeçote / Bloco / Cilindro / Motor / Transmissão |
| **QTD**    | ✅          | Quantidade (aceita `1.234` ou `1234`)                            |
| **LILOCN** | ✅*         | Local: FND / MMO / USI / LMO / TRA / DLI e `ESTREJ`→DR (rejeitado)     |
| ↳ sublocal | —           | `ESTUSI OP140` conta **dentro de USI** e aparece detalhado abaixo do chip de USI |

> Se a base tiver **duas colunas** de local (ex.: `LOCAL_AS400` original + `LILOCN`
> ajustada com os OP), o painel usa **sempre a `LILOCN`** (nome exato) e ignora a
> `LOCAL_AS400`.
| IMLITM     | —           | Código do item (conta os "tipos" por peça)                       |
| LILOTN     | —           | Lote (usado nas linhas de rejeitado)                             |

> \*Sem `LILOCN` o painel ainda funciona, mas sem separação por local nem DR.
>
> **Locais e categorias** são configuráveis no início do `<script>` (bloco
> `CONFIG` → `categorias` e `locais`). Um **modelo** pode ser baixado no painel
> (**⚙ → "Baixar modelo (.xlsx)"**). O `estoque.xlsx` incluído é a sua base real —
> substitua pelo export mais recente quando quiser.

## Como colocar na TV (modo quiosque)

**Jeito fácil (Windows):** dê **duplo clique em `Iniciar-Painel-TV.bat`**. Ele:
1. configura a energia para **nunca suspender / não desligar a tela**;
2. sobe o **servidor local** (`servir.ps1`, sem instalar nada) na porta 8080;
3. abre o **Chrome/Edge em tela cheia (quiosque)** apontando para o painel, já
   com **zoom de 67%** (para caber mais conteúdo na TV).

> **Zoom:** o quiosque abre com **67%** (`--force-device-scale-factor=0.67`). Para
> mudar, edite a linha `set "ZOOM=0.67"` no `Iniciar-Painel-TV.bat` (ex.: `0.75`,
> `0.9`, `1.0`).

> Para sair do quiosque: **Alt+F4**. Deixe todos os arquivos na **mesma pasta**
> (`index.html`, `estoque.xlsx`, `metas.json`, `servir.ps1`, `Iniciar-Painel-TV.bat`).
> Se a energia não mudar, rode o `.bat` como **Administrador**.

**Abrir sozinho quando o PC liga:** dê duplo clique em **`Instalar-Inicializacao.bat`**
(cria um atalho na pasta *Inicializar* do Windows — o painel abre no login).
Para desativar, use **`Remover-Inicializacao.bat`**.

**Manual (qualquer SO):** sirva a pasta por HTTP (o `fetch` do `.xlsx`/`.csv` não
funciona em `file://`). Ex.: `python -m http.server 8080` e acesse `http://localhost:8080/`.
Na TV, pressione **F** (ou **⛶**) para tela cheia, ou inicie com `chrome --kiosk http://localhost:8080/`.

> ⚠️ **Não abra pelo `Arquivo Z:\...\index.html` (file://)** — assim o painel só
> funciona no modo "manual" e **não atualiza sozinho**. Sempre use o **servidor**
> (`http://localhost:8080/` no PC).

## Acessar pelo celular / outra TV (na mesma rede)

1. **Uma vez**, no PC, execute **`Liberar-Rede.bat` como Administrador** (libera a
   porta 8080 e cria a regra de firewall).
2. Rode o **`Iniciar-Painel-TV.bat`** (ou `servir.ps1`). Ao iniciar, o servidor
   **mostra o endereço de rede**, algo como `http://192.168.0.10:8080/`.
3. No **celular** (na **mesma rede/Wi-Fi**), abra esse endereço no navegador:
   **`http://IP-DO-PC:8080/`**.

> - PC e celular precisam estar na **mesma rede** e o roteador não pode isolar os
>   dispositivos (redes corporativas às vezes bloqueiam — se não abrir, fale com a TI).
> - No celular é só **visualização** (mapear pasta/relatório só funcionam no PC).
3. **Impedir suspensão/bloqueio (Windows):** o painel já mantém a tela ligada via
   *Wake Lock*, mas para o PC nunca dormir/bloquear configure também no Windows:
   - **Configurações → Sistema → Energia**: "Tela desligar" e "Suspender" = **Nunca**
     (ou plano de energia de **Alto desempenho**).
   - **Configurações → Contas → Opções de entrada**: bloqueio automático/protetor de
     tela **desativado** (em rede corporativa pode depender de política de TI/GPO).

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
