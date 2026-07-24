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
  - **Bloco** e **Cabeçote** contam na cobertura **apenas os locais MMO + USI**
    (o card mostra "· MMO+USI" ao lado do consumo). As demais peças usam o
    disponível total. Isso é configurável em `CONFIG` → categoria →
    `coberturaLocais: ['MMO','USI']`.
- Sempre mostra: **última atualização** (data/hora) e **próxima atualização**
  (contagem regressiva). A atualização automática ocorre **de hora em hora, no
  minuto :00** (topo de cada hora).
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
- **Consumo/dia útil** — usado para calcular a **cobertura em dias** (previsão).

O que o painel passa a mostrar:

- **Barra de progresso** em cada card (verde = meta atingida, amarelo = abaixo da
  meta, vermelho = abaixo do mínimo) e um selo de status.
- **Alerta visual** (card piscando em vermelho) quando o disponível fica abaixo do
  mínimo, quando **qualquer local** fica abaixo do mínimo dele, ou quando **qualquer
  modelo** (Cilindro) fica abaixo do mínimo. O selo indica o motivo ("Abaixo do
  mínimo" / "Local abaixo do mínimo" / "Modelo abaixo do mínimo") e o chip fica vermelho.
- **Mini-gráfico de tendência** (sparkline) por peça, com a variação desde a
  leitura anterior (▲/▼).

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
**"Pré-visualizar"**. O HTML traz uma tabela resumo (disponível, meta, %, DR e
situação por peça) e o detalhe por local e por modelo.

> Requisitos: funciona no **Chrome/Edge** servindo em **localhost** ou **https**
> (recurso *File System Access API*). A pasta escolhida fica lembrada entre
> reaberturas; se o navegador pedir, reautorize o acesso clicando em "Mapear pasta".
> O envio do e-mail em si é feito por fora (ex.: um fluxo/rotina que lê o
> `estoque_email.html` da pasta e envia) — o painel se encarrega de **gerar** o HTML.
- **Reabre já conectado:** depois que a base é lida uma vez, ela fica salva no
  próprio navegador. Ao reabrir a página (ou se o servidor/planilha ficar
  indisponível no momento), o painel mostra **na hora a última base** — sem pedir
  configuração de novo — e sincroniza sozinho assim que a base voltar.

## A planilha (`estoque.xlsx`)

Primeira linha é o cabeçalho. Colunas da base (JDE) — nomes flexíveis:

| Coluna     | Obrigatória | Descrição                                                        |
|------------|:-----------:|------------------------------------------------------------------|
| **IMDSC1** | ✅          | Descrição — classifica em Cabeçote / Bloco / Cilindro / Motor / Transmissão |
| **QTD**    | ✅          | Quantidade (aceita `1.234` ou `1234`)                            |
| **LILOCN** | ✅*         | Local: FND / MMO / USI / LMO / TRA / DLI e `ESTREJ`→DR (rejeitado)     |
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
