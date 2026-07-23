# Gestão de Estoque — Cabeçote & Bloco (painel para TV)

Painel web em **tela cheia (modo quiosque)** para acompanhar em uma TV quantas
peças de **Cabeçote** e **Bloco** estão disponíveis. A base é uma planilha
**Excel (`.xlsx`)**, no mesmo estilo dos outros projetos, e o painel se
**atualiza sozinho a cada 1 hora**, mostrando a **data e hora da última
atualização** e uma **contagem regressiva** para a próxima.

## Como funciona

- O painel lê o arquivo **`estoque.xlsx`** que fica na **mesma pasta** do
  `index.html` (precisa ser servido por um servidor web — veja abaixo).
- A cada **60 minutos** ele relê a planilha automaticamente. Assim, basta
  substituir/atualizar o `estoque.xlsx` que a TV reflete sozinha no próximo ciclo.
- Sempre mostra: **última atualização** (data/hora), **próxima atualização**
  (contagem regressiva), total por peça e os tipos abaixo do estoque mínimo (em vermelho).
- **Reabre já conectado:** depois que a base é lida uma vez, ela fica salva no
  próprio navegador. Ao reabrir a página (ou se o servidor/planilha ficar
  indisponível no momento), o painel mostra **na hora a última base** — sem pedir
  configuração de novo — e sincroniza sozinho assim que a base voltar.

## A planilha (`estoque.xlsx`)

Primeira linha é o cabeçalho. Colunas aceitas (nomes flexíveis, com/sem acento):

| Coluna         | Obrigatória | Descrição                                             |
|----------------|:-----------:|-------------------------------------------------------|
| **Peça**       | ✅          | Contém "Cabeçote" ou "Bloco" (classifica o item)      |
| **Quantidade** | ✅          | Quantidade disponível (aceita `1.234` ou `1234`)      |
| Modelo         | —           | Descrição/variação do item (ex.: "Cabeçote 1.6 4cil") |
| Mínimo         | —           | Estoque mínimo — abaixo disso o item fica em vermelho |
| Local          | —           | Prateleira/posição                                    |

> Um **modelo pronto** pode ser baixado direto no painel: botão **⚙ → "Baixar
> modelo (.xlsx)"**. O arquivo **`estoque.xlsx`** já incluído aqui é um exemplo —
> substitua pelos seus dados.

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
