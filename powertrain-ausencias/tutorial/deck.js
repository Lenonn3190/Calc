/* Tutorial do Powertrain Monitor — .pptx com prints reais das telas. */
const pptxgen = require('pptxgenjs');
const fs = require('fs'), path = require('path');
const P = require('path').join(__dirname,'prints');
const SAIDA = require('path').join(__dirname,'Powertrain-Monitor-Tutorial.pptx');

/* dimensões reais de cada print, para nunca distorcer imagem */
const DIM = {};
for (const f of fs.readdirSync(P)){
  const b = fs.readFileSync(path.join(P,f));
  DIM[f.replace('.png','')] = { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/* ── paleta: a do próprio sistema ── */
const NOITE='0B1220', FUNDO='F4F7FC', CARD='FFFFFF', TINTA='16233F',
      MUDO='5A6B87', AZUL='2E6BE6', TEAL='0FA396', AMBAR='C77700', VERDE='128A4C', VERM='C0392B';
const H='Arial', B='Calibri';

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';                 // 13.3 x 7.5
pres.author = 'Engine Technical Group';
pres.title  = 'Powertrain Monitor — Tutorial de uso';
const L = 0.62, DIR = 13.33 - 0.62, LARG = DIR - L;

const sombra = () => ({ type:'outer', color:'0B1220', blur:14, offset:3, angle:90, opacity:0.22 });

/** Encaixa a imagem numa caixa sem esticar; devolve x/y/w/h centralizados. */
function encaixa(nome, cx, cy, cw, ch){
  const d = DIM[nome]; if (!d) throw new Error('print faltando: ' + nome);
  const r = Math.min(cw / d.w, ch / d.h);
  const w = d.w * r, h = d.h * r;
  return { x: cx + (cw - w)/2, y: cy + (ch - h)/2, w, h };
}
/** Print com moldura arredondada e sombra — o motivo visual do deck. */
function print(s, nome, cx, cy, cw, ch, legenda, corMoldura){
  const g = encaixa(nome, cx, cy, cw, ch - (legenda ? 0.34 : 0));
  s.addShape(pres.ShapeType.roundRect, { x:g.x-0.07, y:g.y-0.07, w:g.w+0.14, h:g.h+0.14,
    rectRadius:0.06, fill:{ color:NOITE }, line:{ color:corMoldura||NOITE }, shadow:sombra() });
  s.addImage({ path:`${P}/${nome}.png`, x:g.x, y:g.y, w:g.w, h:g.h });
  if (legenda) s.addText(legenda, { x:cx, y:g.y+g.h+0.15, w:cw, h:0.28, fontFace:B, fontSize:10.5,
    color:MUDO, align:'center', italic:true, margin:0 });
  return g;
}
/** Bolinha numerada — repetida em todo o material. */
function passo(s, n, x, y, cor=AZUL, d=0.42){
  s.addShape(pres.ShapeType.ellipse, { x, y, w:d, h:d, fill:{ color:cor }, line:{ color:cor } });
  s.addText(String(n), { x, y, w:d, h:d, fontFace:H, fontSize:d>0.5?16:12.5, bold:true,
    color:'FFFFFF', align:'center', valign:'middle', margin:0 });
}
function cartao(s, x, y, w, h, cor){
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius:0.05,
    fill:{ color:cor||CARD }, line:{ color:'DFE6F2' }, shadow:sombra() });
}
/** Cabeçalho padrão das páginas claras. */
function pagina(titulo, chapeu){
  const s = pres.addSlide();
  s.background = { color:FUNDO };
  if (chapeu) s.addText(chapeu.toUpperCase(), { x:L, y:0.34, w:LARG, h:0.26, fontFace:H, fontSize:10.5,
    bold:true, color:TEAL, charSpacing:2.2, margin:0 });
  s.addText(titulo, { x:L, y:chapeu?0.62:0.44, w:LARG, h:0.62, fontFace:H, fontSize:29, bold:true,
    color:TINTA, margin:0 });
  s.addText('Powertrain · Monitor de Ausências', { x:L, y:6.98, w:6, h:0.28, fontFace:B, fontSize:9,
    color:'9AAAC4', margin:0 });
  return s;
}
/** Lista de itens com bolinha numerada, um embaixo do outro. */
function passos(s, itens, x, y, w, alturaItem=0.78, cor=AZUL){
  itens.forEach((it, i) => {
    passo(s, i+1, x, y + i*alturaItem, cor);
    s.addText([{ text: it[0] + '  ', options:{ bold:true, color:TINTA } },
               { text: it[1] || '', options:{ color:MUDO } }],
      { x:x+0.58, y:y + i*alturaItem - 0.06, w:w-0.58, h:alturaItem-0.04, fontFace:B, fontSize:13,
        valign:'top', margin:0 });
  });
}
function tabela(s, linhas, x, y, w, larguras, cabecalho){
  const rows = [];
  if (cabecalho) rows.push(cabecalho.map(t => ({ text:t,
    options:{ bold:true, color:'FFFFFF', fill:{ color:TINTA }, fontFace:H, fontSize:11 } })));
  linhas.forEach((l,i) => rows.push(l.map((c,j) => ({ text: typeof c==='string'?c:c.text,
    options:{ color: (typeof c==='object'&&c.cor)||TINTA, bold: j===0,
      fill:{ color: i%2 ? 'FFFFFF' : 'EAF0FA' }, fontFace:B, fontSize:11.5 } }))));
  s.addTable(rows, { x, y, w, colW:larguras, border:{ type:'solid', color:'DFE6F2', pt:1 },
    rowH:0.34, valign:'middle', margin:[0.06,0.1,0.06,0.1] });
}

/* ══════════════════ 1 · CAPA ══════════════════ */
{
  const s = pres.addSlide(); s.background = { color:NOITE };
  s.addShape(pres.ShapeType.ellipse, { x:9.6, y:-1.7, w:5.6, h:5.6, fill:{ color:'12306B' }, line:{ color:'12306B' } });
  s.addShape(pres.ShapeType.ellipse, { x:11.4, y:4.4, w:3.4, h:3.4, fill:{ color:'0E5C55' }, line:{ color:'0E5C55' } });
  s.addShape(pres.ShapeType.roundRect, { x:L, y:0.85, w:1.02, h:1.02, rectRadius:0.28,
    fill:{ color:TEAL }, line:{ color:TEAL } });
  s.addText('ETG', { x:L, y:0.85, w:1.02, h:1.02, fontFace:H, fontSize:17, bold:true,
    color:'FFFFFF', align:'center', valign:'middle', margin:0 });
  s.addText('POWERTRAIN', { x:L, y:2.35, w:9, h:0.34, fontFace:H, fontSize:13, bold:true,
    color:TEAL, charSpacing:5, margin:0 });
  s.addText('Monitor de Ausências\ne Frota', { x:L, y:2.72, w:8.8, h:1.9, fontFace:H, fontSize:47,
    bold:true, color:'FFFFFF', lineSpacing:50, margin:0 });
  s.addText('Tutorial de uso — todas as funções, tela por tela',
    { x:L, y:4.72, w:9, h:0.4, fontFace:B, fontSize:17, color:'AFC3E4', margin:0 });
  s.addText('Engine Technical Group   ·   painel, leitor RFID, cadastro de crachás e teclado de tela',
    { x:L, y:6.5, w:11, h:0.34, fontFace:B, fontSize:11.5, color:'6E86AD', margin:0 });
  s.addNotes('Tutorial completo do sistema. Todos os prints são das telas reais em funcionamento.');
}

/* ══════════════════ 2 · AS TRÊS PEÇAS ══════════════════ */
{
  const s = pagina('O sistema tem três peças', 'Visão geral');
  const cx = [L, 5.0, 9.38], cw = 3.9;
  const dados = [
    ['Painel na parede','index.html', 'Mostra quem está fora, quem volta, quem sai e o estado dos carros. Fica ligado o dia inteiro, sem ninguém mexer.', AZUL],
    ['Leitor RFID','crachá + tag', 'Duas leituras para o carro sair, uma para voltar. O próprio painel escuta o leitor — é uma tela só.', TEAL],
    ['Cadastro de crachás','cadastro.html', 'Associa cada crachá a uma pessoa e ao telefone. É o que dá nome ao condutor e o QR de WhatsApp.', AMBAR],
  ];
  dados.forEach(([t,sub,txt,cor], i) => {
    cartao(s, cx[i], 1.5, cw, 2.55);
    passo(s, i+1, cx[i]+0.3, 1.78, cor, 0.56);
    s.addText(t, { x:cx[i]+0.3, y:2.5, w:cw-0.6, h:0.34, fontFace:H, fontSize:16, bold:true, color:TINTA, margin:0 });
    s.addText(sub, { x:cx[i]+0.3, y:2.84, w:cw-0.6, h:0.26, fontFace:'Courier New', fontSize:10.5, color:cor, margin:0 });
    s.addText(txt, { x:cx[i]+0.3, y:3.16, w:cw-0.6, h:0.85, fontFace:B, fontSize:12, color:MUDO, margin:0 });
  });
  print(s, 'frota-em-uso-qr', L, 4.35, 12.09, 2.2,
    'As três peças gravam nos mesmos arquivos da pasta dados — não existe importação nem sincronização.');
  s.addNotes('O sistema todo é uma pasta com arquivos. Nada é instalado.');
}

/* ══════════════════ 3 · INSTALAÇÃO ══════════════════ */
{
  const s = pagina('Instalar no PC do monitor', 'Passo a passo');
  passos(s, [
    ['Copie a pasta','para um caminho local, tipo C:\\Powertrain-Monitor.'],
    ['Gire o monitor','Configurações → Sistema → Vídeo → Orientação → Retrato.'],
    ['Duplo clique em Iniciar-Painel.bat','sobe o servidor e abre o painel em quiosque, na 2ª tela.'],
    ['Deixe a janela preta aberta','é ela que mantém o painel no ar.'],
    ['Para subir com o Windows','atalho do .bat dentro de shell:startup.'],
  ], L, 1.55, 6.5, 0.82);
  cartao(s, L, 5.6, 6.5, 1.28, 'FFF6E2');
  s.addText('“O fornecedor não pôde ser verificado”', { x:L+0.28, y:5.72, w:6, h:0.3,
    fontFace:H, fontSize:12.5, bold:true, color:AMBAR, margin:0 });
  s.addText('Normal na 1ª vez — é a marca de "arquivo baixado" do Windows. Clique em Executar; o .bat já limpa a marca do resto da pasta. Para evitar: botão direito no .zip → Propriedades → Desbloquear, antes de descompactar.',
    { x:L+0.28, y:6.02, w:6, h:0.78, fontFace:B, fontSize:11, color:'8A6410', margin:0 });
  print(s, 'painel-inteiro', 7.55, 1.5, 5.16, 5.4, 'O painel aberto no monitor de 27" na vertical');
  s.addNotes('Não precisa de administrador. Só rode como admin se outros PCs da rede forem abrir o painel.');
}

/* ══════════════════ 4 · FONTE DE DADOS ══════════════════ */
{
  const s = pagina('De onde vêm as ausências', 'Configuração · uma vez só');
  s.addText('Abra dados\\fonte.txt no Bloco de Notas e cole o caminho completo do arquivo onde a equipe registra as saídas. Serve .xlsx ou .csv — o painel reconhece pelo conteúdo, não pela extensão.',
    { x:L, y:1.5, w:7.1, h:0.8, fontFace:B, fontSize:13.5, color:MUDO, margin:0 });
  s.addShape(pres.ShapeType.roundRect, { x:L, y:2.42, w:7.1, h:0.68, rectRadius:0.05,
    fill:{ color:NOITE }, line:{ color:NOITE } });
  s.addText('C:\\Users\\...\\05 - ETG\\Registros de saidas.xlsx', { x:L+0.22, y:2.42, w:6.7, h:0.68,
    fontFace:'Courier New', fontSize:12, color:'8AE6D8', valign:'middle', margin:0 });
  s.addText([{ text:'Dica  ', options:{ bold:true, color:TEAL } },
    { text:'no Explorer, Shift + botão direito no arquivo → “Copiar como caminho”, cole e tire as aspas.',
      options:{ color:MUDO } }], { x:L, y:3.2, w:7.1, h:0.3, fontFace:B, fontSize:11.5, margin:0 });
  s.addText('Pronto: o painel busca sempre nesse mesmo lugar, inclusive depois de reiniciar o PC, e sem pedir clique nenhum. A planilha pode ficar aberta no Excel enquanto alguém edita.',
    { x:L, y:3.62, w:7.1, h:0.7, fontFace:B, fontSize:13, color:MUDO, margin:0 });
  tabela(s, [
    ['🟢 lido às 14:32','lendo normalmente'],
    ['🔴 FALHA AO LER','segue com a última leitura boa, e tenta de novo a cada minuto'],
    ['🟡 DADOS DE EXEMPLO','nenhuma fonte definida ainda'],
  ], L, 4.5, 7.1, [2.3, 4.8], ['No cabeçalho','Significa']);
  print(s, 'painel-cabecalho', 8.0, 1.5, 4.7, 1.3);
  print(s, 'painel-kpis', 8.0, 3.05, 4.7, 1.6, 'Indicadores do dia, recalculados a cada minuto');
  s.addText('O painel relê o arquivo de hora em hora. Colunas reconhecidas pelo nome do cabeçalho — a ordem não importa.',
    { x:8.0, y:5.05, w:4.7, h:0.7, fontFace:B, fontSize:11.5, color:MUDO, margin:0 });
  s.addNotes('fonte.txt é o jeito recomendado: zero cliques, sobrevive a reinício. O ⚙ → Apontar arquivo é a alternativa.');
}

/* ══════════════════ 5 · SECÇÃO: O PAINEL ══════════════════ */
function secao(n, titulo, sub, img){
  const s = pres.addSlide(); s.background = { color:NOITE };
  s.addShape(pres.ShapeType.ellipse, { x:-1.2, y:5.2, w:4.2, h:4.2, fill:{ color:'12306B' }, line:{ color:'12306B' } });
  passo(s, n, L, 1.75, TEAL, 0.72);
  s.addText(titulo, { x:L, y:2.7, w:6.6, h:1.5, fontFace:H, fontSize:38, bold:true, color:'FFFFFF', margin:0 });
  s.addText(sub, { x:L, y:4.25, w:6.4, h:0.9, fontFace:B, fontSize:15, color:'AFC3E4', margin:0 });
  if (img) print(s, img, 7.5, 0.9, 5.2, 5.7, null, '2A4272');
  return s;
}
secao(1, 'O painel', 'O que aparece na parede o dia inteiro, e como mexer nele sem teclado.', 'painel-inteiro');

/* ══════════════════ 6 · BLOCOS DO PAINEL ══════════════════ */
{
  const s = pagina('Os sete blocos da tela', 'O painel');
  s.addText('De cima para baixo, na ordem em que aparecem no monitor. Cada bloco tem um contador no título.',
    { x:L, y:1.34, w:12.09, h:0.3, fontFace:B, fontSize:12.5, color:MUDO, margin:0 });
  const cel = (nome, img, txt, x, y, w, h) => {
    print(s, img, x, y, w, h);
    s.addText(nome, { x, y:y+h+0.08, w, h:0.26, fontFace:H, fontSize:12, bold:true, color:TINTA, margin:0 });
    s.addText(txt, { x, y:y+h+0.34, w, h:0.5, fontFace:B, fontSize:10.5, color:MUDO, margin:0 });
  };
  cel('1 · Indicadores','painel-kpis','Fora agora, presença %, férias, viagem e retornos.', L, 1.8, 5.85, 1.55);
  cel('2 · Frota','frota-em-uso-qr','Cada carro: disponível ou em uso, com quem e desde quando.', 6.86, 1.8, 5.85, 1.55);
  cel('3 · Ausentes agora','painel-ausentes','Quem está fora neste minuto, com barra de quanto já decorreu.', L, 4.2, 3.85, 1.9);
  cel('4 · Próximas saídas','painel-proximas','Os próximos 45 dias, logo abaixo dos ausentes.', 4.75, 4.2, 3.85, 1.9);
  cel('5 · Ocupação','painel-ocupacao','Quantos estarão fora em cada um dos próximos 14 dias.', 8.87, 4.2, 3.85, 1.9);
  s.addNotes('Faltam os blocos 6 e 7 — Retornos previstos e Estatísticas — que aparecem no slide seguinte.');
}

/* ══════════════════ 6b · RETORNOS E ESTATÍSTICAS ══════════════════ */
{
  const s = pagina('Retornos previstos e estatísticas', 'O painel · blocos 6 e 7');
  print(s, 'painel-retornos', L, 1.42, 12.09, 2.7,
    'Retornos previstos — quem volta primeiro, em ordem');
  print(s, 'painel-estatisticas', L, 4.2, 12.09, 1.85,
    'Estatísticas — distribuição por departamento e por motivo');
  cartao(s, L, 6.15, 12.09, 0.7, 'EAF0FA');
  s.addText('Tudo é recalculado a cada minuto com o relógio do PC: alguém sai da lista de ausentes na hora em que o retorno chega, sem ninguém tocar na tela.',
    { x:L+0.3, y:6.15, w:11.5, h:0.7, fontFace:B, fontSize:12, color:MUDO, valign:'middle', margin:0 });
  s.addNotes('Os blocos são os mesmos dados, olhados de ângulos diferentes.');
}

/* ══════════════════ 7 · ESCONDER / RECOLHER ══════════════════ */
{
  const s = pagina('Esconder e recolher blocos', 'O painel');
  s.addText('Nem todo turno precisa de tudo na tela. A escolha fica guardada — o painel reabre do mesmo jeito depois de reiniciar o PC.',
    { x:L, y:1.45, w:6.8, h:0.6, fontFace:B, fontSize:13.5, color:MUDO, margin:0 });
  passos(s, [
    ['Recolher','clique no título do bloco. Vira uma faixa, com o contador ainda à vista. Clique de novo para expandir.'],
    ['Esconder','botão de blocos no cabeçalho → desmarque. O bloco sai da tela por completo.'],
    ['Mostrar tudo / Recolher tudo','no mesmo menu, resolvem a tela inteira de uma vez.'],
  ], L, 2.25, 6.8, 1.05, TEAL);
  cartao(s, L, 5.7, 6.8, 1.0, 'E7F6F3');
  s.addText('Com o menu aberto, o painel para de escutar o leitor RFID — mexer no menu nunca é confundido com uma leitura de tag.',
    { x:L+0.28, y:5.86, w:6.3, h:0.7, fontFace:B, fontSize:12, color:'0B6F66', margin:0 });
  print(s, 'painel-menu-blocos', 7.75, 1.42, 4.95, 5.3, 'O menu de blocos, no cabeçalho ao lado do ⚙');
  s.addNotes('Útil quando a equipe quer só ausentes e frota na tela.');
}

/* ══════════════════ 8 · SECÇÃO: FROTA ══════════════════ */
secao(2, 'Frota e leitor RFID', 'Duas leituras para o carro sair, uma para ele voltar. Em qualquer ordem.', 'frota-em-uso-qr');

/* ══════════════════ 9 · CICLO RFID ══════════════════ */
{
  const s = pagina('Como registrar a saída de um carro', 'Frota · leitor RFID');
  const cw = 3.9, xs = [L, 4.72, 8.83];
  const et = [
    ['Carro disponível','card-livre','Card verde: pronto para uso, chave no quadro.', VERDE],
    ['Encoste a tag do carro','card-aguardando','Card azul piscando: AGUARDANDO CRACHÁ, com contagem regressiva de 2 minutos.', AZUL],
    ['Encoste o crachá','card-em-uso','Card âmbar: EM USO, com o nome do condutor, o tempo decorrido e o QR de WhatsApp.', AMBAR],
  ];
  et.forEach(([t,img,txt,cor], i) => {
    cartao(s, xs[i], 1.42, cw, 4.05);
    passo(s, i+1, xs[i]+0.26, 1.66, cor, 0.5);
    s.addText(t, { x:xs[i]+0.86, y:1.68, w:cw-1.1, h:0.46, fontFace:H, fontSize:13.5, bold:true,
      color:TINTA, valign:'middle', margin:0 });
    print(s, img, xs[i]+0.26, 2.3, cw-0.52, 2.35);
    s.addText(txt, { x:xs[i]+0.26, y:4.78, w:cw-0.52, h:0.62, fontFace:B, fontSize:11.5, color:MUDO, margin:0 });
  });
  cartao(s, L, 5.72, 12.09, 1.0, 'EAF0FA');
  s.addText([{ text:'Para devolver:  ', options:{ bold:true, color:TINTA } },
    { text:'passe a tag do MESMO carro de novo — uma leitura só, e ele volta a DISPONÍVEL.   ', options:{ color:MUDO } },
    { text:'A ordem não importa:  ', options:{ bold:true, color:TINTA } },
    { text:'dá para ler o crachá primeiro e o carro depois; uma faixa no topo avisa quem está esperando.', options:{ color:MUDO } }],
    { x:L+0.3, y:5.86, w:11.5, h:0.75, fontFace:B, fontSize:12, margin:0 });
  s.addNotes('As duas leituras precisam cair dentro de 2 minutos (esperaCrachaSeg). O relógio do uso conta a partir da leitura do carro.');
}

/* ══════════════════ 10 · AVISOS ══════════════════ */
{
  const s = pagina('O painel avisa a cada leitura', 'Frota · leitor RFID');
  s.addText('O leitor USB se comporta como teclado: encostou a tag, ele digita o código e o painel captura. Um aviso grande aparece no topo da tela e some sozinho em 7 segundos — ninguém precisa clicar em nada.',
    { x:L, y:1.4, w:12.09, h:0.6, fontFace:B, fontSize:13.5, color:MUDO, margin:0 });
  const av = [['aviso-carro-lido','Tag do carro lida — falta o crachá'],
              ['aviso-saida-registrada','Dupla fechada: saída registrada'],
              ['aviso-devolvido','Mesma tag de novo: carro devolvido']];
  av.forEach(([img,txt], i) => {
    print(s, img, L, 2.15 + i*1.42, 12.09, 0.95);
    s.addText(txt, { x:L, y:3.12 + i*1.42, w:12.09, h:0.28, fontFace:B, fontSize:11.5,
      color:MUDO, italic:true, margin:0 });
  });
  cartao(s, L, 6.4, 12.09, 0.72, 'E7F6F3');
  s.addText([{ text:'Teste sem tag nenhuma:  ', options:{ bold:true, color:'0B6F66' } },
    { text:'com o painel aberto e em foco, digite C3FE4090 e tecle Enter. Se o aviso aparecer, a cadeia inteira está funcionando.',
      options:{ color:'0B6F66' } }], { x:L+0.3, y:6.5, w:11.5, h:0.5, fontFace:B, fontSize:12, valign:'middle', margin:0 });
  s.addNotes('Digitação nos campos do ⚙ e no menu de blocos não é confundida com leitura.');
}

/* ══════════════════ 11 · QR ══════════════════ */
{
  const s = pagina('QR de WhatsApp do condutor', 'Frota · falar com quem está com o carro');
  print(s, 'card-em-uso', L, 1.45, 5.5, 3.0);
  s.addText('Com o carro em uso, o card mostra um QR. Quem apontar a câmera do celular cai direto na conversa do WhatsApp com o condutor, já com a mensagem escrita.',
    { x:L, y:4.65, w:5.5, h:0.8, fontFace:B, fontSize:13, color:MUDO, margin:0 });
  s.addShape(pres.ShapeType.roundRect, { x:L, y:5.5, w:5.5, h:0.72, rectRadius:0.05,
    fill:{ color:'E7F6F3' }, line:{ color:'C6E9E3' } });
  s.addText('“Olá Thiego Ferreira, sobre o Honda HR-V (FQK-2B71)”',
    { x:L+0.25, y:5.5, w:5.0, h:0.72, fontFace:B, fontSize:12, italic:true, color:'0B6F66',
      valign:'middle', margin:0 });
  print(s, 'qr-zoom', 6.5, 1.45, 2.0, 2.9);
  s.addText('O telefone vem da coluna Telefone do dados\\pessoas.csv. Pode escrever como preferir:',
    { x:8.8, y:1.5, w:3.9, h:0.6, fontFace:B, fontSize:12.5, color:MUDO, margin:0 });
  ['19991234567','(19) 99123-4567','+55 19 99123-4567'].forEach((t,i)=>{
    s.addShape(pres.ShapeType.roundRect, { x:8.8, y:2.2+i*0.52, w:3.9, h:0.42, rectRadius:0.05,
      fill:{ color:'FFFFFF' }, line:{ color:'DFE6F2' } });
    s.addText(t, { x:9.0, y:2.2+i*0.52, w:3.6, h:0.42, fontFace:'Courier New', fontSize:11.5,
      color:TINTA, valign:'middle', margin:0 });
  });
  s.addText('Os três dão o mesmo link — o painel joga fora tudo que não é dígito e acrescenta o 55 do Brasil.',
    { x:8.8, y:3.85, w:3.9, h:0.7, fontFace:B, fontSize:11.5, color:MUDO, margin:0 });
  s.addText('Para desligar o QR: qrCondutor: false no CONFIG. Para mudar o texto da mensagem: mensagemWhats.',
    { x:8.8, y:4.6, w:3.9, h:0.8, fontFace:B, fontSize:11, color:'9AAAC4', margin:0 });
  s.addNotes('O QR é gerado na hora, dentro da página. Não usa internet nem serviço externo.');
}

/* ══════════════════ 12 · QR NÃO APARECEU ══════════════════ */
{
  const s = pagina('Quando o QR não aparece', 'Frota · diagnóstico');
  s.addText('O QR exige as três coisas juntas: carro EM USO, crachá do condutor no cadastro, e telefone preenchido. Faltando alguma, o card diz qual — é só ler o que está no lugar do QR.',
    { x:L, y:1.42, w:12.09, h:0.6, fontFace:B, fontSize:13.5, color:MUDO, margin:0 });
  print(s, 'frota-sem-telefone', L, 2.15, 6.0, 2.15, 'Cadastrado, mas sem telefone');
  print(s, 'card-fora-do-cadastro', 6.95, 2.15, 5.75, 2.15, 'Crachá que não está no pessoas.csv');
  tabela(s, [
    ['sem telefone no cadastro','A pessoa está cadastrada, mas sem número','Cadastro → escolher → preencher telefone → Salvar'],
    ['crachá fora do cadastro','O crachá lido não está no pessoas.csv','Cadastro → escolher a pessoa → encostar o crachá'],
    ['card verde, DISPONÍVEL','Nenhum carro em uso — não há QR a mostrar','Nada a fazer'],
  ], L, 4.9, 12.09, [3.1, 4.5, 4.49], ['No lugar do QR','O que falta','Como resolver']);
  s.addNotes('Parênteses, espaços e hífen no telefone não atrapalham. O que tira o QR é o campo vazio.');
}

/* ══════════════════ 13 · SECÇÃO: CADASTRO ══════════════════ */
secao(3, 'Cadastro de crachás', 'Sem isso o painel não sabe o nome de quem pegou o carro, nem tem telefone para o QR.', 'cadastro-editor');

/* ══════════════════ 14 · CARREGAR LISTA ══════════════════ */
{
  const s = pagina('Primeiro: trazer a lista de nomes', 'Cadastro · uma vez só');
  s.addText('Abra pelo botão do crachá no cabeçalho do painel, ou pelo Cadastrar-Crachas.bat. Duas formas de trazer a equipe:',
    { x:L, y:1.42, w:12.09, h:0.4, fontFace:B, fontSize:13.5, color:MUDO, margin:0 });
  cartao(s, L, 2.0, 5.9, 2.2);
  passo(s, 1, L+0.28, 2.24, TEAL, 0.5);
  s.addText('Trazer nomes das saídas', { x:L+0.88, y:2.26, w:4.8, h:0.46, fontFace:H, fontSize:14,
    bold:true, color:TINTA, valign:'middle', margin:0 });
  s.addText('Puxa a equipe do MESMO arquivo de saídas que o painel já lê — não precisa montar outra planilha. Saída lançada para dois (“Tanaka; Nakahara”) entra como duas pessoas: crachá é individual.',
    { x:L+0.28, y:2.85, w:5.34, h:1.2, fontFace:B, fontSize:12, color:MUDO, margin:0 });
  cartao(s, 6.8, 2.0, 5.9, 2.2);
  passo(s, 2, 7.08, 2.24, AZUL, 0.5);
  s.addText('Arrastar uma planilha', { x:7.68, y:2.26, w:4.8, h:0.46, fontFace:H, fontSize:14,
    bold:true, color:TINTA, valign:'middle', margin:0 });
  s.addText('.xlsx ou .csv na área tracejada. O nome sai da coluna Nome (ou Colaborador); com uma coluna só, ela vira o nome. Departamento e Telefone, se existirem, são aproveitados.',
    { x:7.08, y:2.85, w:5.34, h:1.2, fontFace:B, fontSize:12, color:MUDO, margin:0 });
  print(s, 'cadastro-carregar-lista', L, 4.45, 12.09, 1.55);
  cartao(s, L, 6.2, 12.09, 0.75, 'E7F6F3');
  s.addText('Carregar a lista de novo não apaga nada: quem já tem crachá mantém crachá e telefone, e só os nomes novos entram. Pode repetir sempre que entrar alguém na equipe.',
    { x:L+0.3, y:6.28, w:11.5, h:0.6, fontFace:B, fontSize:12, color:'0B6F66', valign:'middle', margin:0 });
  s.addNotes('A tela de cadastro grava o mesmo dados/pessoas.csv que o painel lê a cada 20 segundos.');
}

/* ══════════════════ 15 · ROTEIRO POR PESSOA ══════════════════ */
{
  const s = pagina('Depois: cadastrar pessoa por pessoa', 'Cadastro · rotina');
  passos(s, [
    ['Digite parte do nome','a lista filtra enquanto você digita — não liga para acento nem maiúscula.'],
    ['Enter (ou OK)','escolhe o primeiro da lista. O cursor já cai no campo do crachá, piscando.'],
    ['Encoste o crachá no leitor','ele digita o código sozinho e manda Enter, indo para o telefone.'],
    ['Telefone','opcional, mas é ele que gera o QR. Enter em branco salva do mesmo jeito.'],
    ['Departamento','opcional, para quem foi cadastrado à mão.'],
    ['Salvar cadastro','grava o dados\\pessoas.csv. O anterior fica guardado como pessoas.csv.bak.'],
  ], L, 1.5, 5.6, 0.78);
  print(s, 'cadastro-editor', 6.55, 1.45, 6.15, 4.0);
  cartao(s, L, 6.05, 12.09, 0.8, 'FFF6E2');
  s.addText([{ text:'Crachá repetido é recusado, ', options:{ bold:true, color:AMBAR } },
    { text:'dizendo de quem ele já é. Para transferir: abra a outra pessoa, “Tirar crachá”, salve — aí o código fica livre.',
      options:{ color:'8A6410' } }], { x:L+0.3, y:6.05, w:11.5, h:0.8, fontFace:B, fontSize:12, valign:'middle', margin:0 });
  s.addNotes('O roteiro inteiro é feito sem tirar a mão do leitor. Salvou, o painel pega no ciclo seguinte, sem reiniciar.');
}

/* ══════════════════ 16 · PESSOA NOVA ══════════════════ */
{
  const s = pagina('Quem não está em lista nenhuma', 'Cadastro · gente nova');
  s.addText('Alguém que acabou de entrar, ou um nome grafado diferente do que está nas saídas: digite o nome na busca e a tela oferece cadastrar. Enter faz o mesmo.',
    { x:L, y:1.42, w:12.09, h:0.55, fontFace:B, fontSize:13.5, color:MUDO, margin:0 });
  print(s, 'cadastro-nome-novo', L, 2.1, 12.09, 2.85);
  const its = [
    ['Entra na lista já com o campo do crachá aberto', TEAL],
    ['Nome repetido não cria duplicata — abre quem já existe', AZUL],
    ['Departamento pode ser preenchido ali mesmo', AMBAR],
  ];
  its.forEach(([t,cor], i) => {
    const x = L + i*4.03;
    cartao(s, x, 5.3, 3.85, 1.15);
    s.addShape(pres.ShapeType.ellipse, { x:x+0.26, y:5.55, w:0.26, h:0.26, fill:{ color:cor }, line:{ color:cor } });
    s.addText(t, { x:x+0.62, y:5.46, w:3.0, h:0.85, fontFace:B, fontSize:12, color:TINTA, margin:0 });
  });
  s.addNotes('Evita ter que voltar ao SharePoint para incluir alguém antes de dar o crachá.');
}

/* ══════════════════ 17 · SEM TELEFONE ══════════════════ */
{
  const s = pagina('Quem ficou sem telefone', 'Cadastro · antes de sair da tela');
  s.addText('O telefone é opcional e o roteiro por Enter passa direto por ele — dá para cadastrar a equipe inteira sem número nenhum, e a falta só apareceria no painel, com o carro já na rua.',
    { x:L, y:1.42, w:12.09, h:0.55, fontFace:B, fontSize:13.5, color:MUDO, margin:0 });
  print(s, 'cadastro-sem-telefone', L, 2.1, 12.09, 3.4);
  const its = [
    ['Contador no cabeçalho','conta só quem já tem crachá — quem nem foi cadastrado não deve nada.'],
    ['Clicar no contador','filtra a lista só para essas pessoas, para corrigir uma atrás da outra.'],
    ['Marca em âmbar na lista','quem tem crachá e não tem telefone, igual ao “sem crachá”.'],
  ];
  its.forEach(([t,d], i) => {
    const x = L + i*4.03;
    cartao(s, x, 5.65, 3.85, 1.25);
    s.addText(t, { x:x+0.26, y:5.78, w:3.35, h:0.3, fontFace:H, fontSize:12.5, bold:true, color:AMBAR, margin:0 });
    s.addText(d, { x:x+0.26, y:6.08, w:3.35, h:0.72, fontFace:B, fontSize:11, color:MUDO, margin:0 });
  });
  s.addNotes('Sem telefone não há QR de WhatsApp no painel. Vale conferir esse contador antes de sair da tela.');
}

/* ══════════════════ 18 · TECLADO VIRTUAL ══════════════════ */
{
  const s = pagina('Teclado da tela, sem teclado físico', 'Todas as telas');
  s.addText('Toque num campo e o teclado sobe da parte de baixo, com teclas grandes para dedo. Vale no cadastro e nos campos do ⚙ do painel.',
    { x:L, y:1.36, w:12.09, h:0.34, fontFace:B, fontSize:12.5, color:MUDO, margin:0 });
  print(s, 'teclado-texto-zoom', L, 1.82, 7.5, 2.35, 'Texto: ç e uma fileira inteira de acentos');
  print(s, 'teclado-numerico', 8.35, 1.82, 4.35, 2.9, 'Telefone: numérico, colado no campo');
  const its = [
    ['Maiúscula automática','na primeira letra e depois de cada espaço — é assim que se digita nome de gente. O ⇧ força quando precisar.'],
    ['OK vale como Enter','escolhe a pessoa, passa para o campo seguinte, ou salva. O teclado acompanha o foco.'],
    ['⌫ apaga, limpar esvazia','✕ ou tocar fora fecha. O campo em uso fica espelhado no alto do teclado.'],
    ['Não atrapalha o leitor','o teclado nunca rouba o foco do campo, e fechar solta o foco de volta.'],
  ];
  its.forEach(([t,d], i) => {
    const x = L + (i%2)*6.1, y = 4.95 + Math.floor(i/2)*1.0;
    s.addShape(pres.ShapeType.ellipse, { x, y:y+0.06, w:0.28, h:0.28, fill:{ color:AZUL }, line:{ color:AZUL } });
    s.addText([{ text:t + '  ', options:{ bold:true, color:TINTA } }, { text:d, options:{ color:MUDO } }],
      { x:x+0.4, y, w:5.5, h:0.92, fontFace:B, fontSize:11.5, margin:0 });
  });
  s.addNotes('O leitor RFID também é um teclado — por isso o teclado da tela nunca tira o foco do campo.');
}

/* ══════════════════ 19 · PRIVACIDADE ══════════════════ */
{
  const s = pagina('O número do crachá não aparece na tela', 'Segurança');
  s.addText('O painel fica exposto num monitor de parede e o número do crachá é o que abre porta e catraca — quem passa na frente não deve conseguir anotá-lo.',
    { x:L, y:1.42, w:6.6, h:0.6, fontFace:B, fontSize:13.5, color:MUDO, margin:0 });
  passos(s, [
    ['No cadastro','o campo de leitura é mascarado (o leitor digita, aparecem pontinhos) e a lista mostra só “crachá cadastrado”.'],
    ['No painel','crachá fora do cadastro aparece como “Condutor não cadastrado”, sem o código.'],
    ['Nos arquivos','o número continua gravado no pessoas.csv, no frota.csv e no historico.json — quem precisar confere lá.'],
  ], L, 2.2, 6.6, 1.1, VERM);
  cartao(s, L, 5.75, 6.6, 1.0, 'FDEBEA');
  s.addText('Não há como ver um crachá pela tela. Para trocar o de alguém: “Tirar crachá” e ler o novo.',
    { x:L+0.28, y:5.88, w:6.1, h:0.75, fontFace:B, fontSize:12, color:'922C20', margin:0 });
  print(s, 'card-fora-do-cadastro', 7.6, 1.5, 5.1, 2.5);
  print(s, 'cadastro-cabecalho', 7.6, 4.3, 5.1, 1.0, 'A lista nunca mostra o código — só o estado');
  s.addNotes('Decisão de segurança: o número do crachá é credencial física.');
}

/* ══════════════════ 20 · CONFIGURAÇÕES ══════════════════ */
{
  const s = pagina('Ajustes e histórico', 'Manutenção');
  print(s, 'painel-config', L, 1.45, 4.3, 5.15, 'Botão ⚙ no cabeçalho do painel');
  tabela(s, [
    ['recarregarSeg','De quanto em quanto tempo reler as saídas (3600 = 1 h)'],
    ['frotaRecarregarSeg','Ciclo do quadro de veículos (padrão 20 s)'],
    ['esperaCrachaSeg','Janela entre as duas leituras (padrão 120 s)'],
    ['usoReferenciaHoras','Acima disso o card fica vermelho (padrão 8 h)'],
    ['efetivoTotal','Base do indicador de presença (%)'],
    ['qrCondutor','false tira o QR do card'],
    ['veiculos.json','Tag, placa, modelo e cor dos carros'],
  ], 5.6, 1.45, 7.1, [2.5, 4.6], ['No CONFIG do index.html','O que faz']);
  cartao(s, 5.6, 4.65, 7.1, 2.05, 'EAF0FA');
  s.addText('dados\\historico.json', { x:5.88, y:4.78, w:6.5, h:0.3, fontFace:H, fontSize:13,
    bold:true, color:TINTA, margin:0 });
  s.addText('O painel grava sozinho o histórico das viagens — veículo, condutor, saída, retorno e duração — sempre que algo muda. Serve para relatório mensal e rateio.\n\nEle é derivado do frota.csv: se o log for apagado, o histórico encolhe junto. Para guardar período longo, arquive o frota.csv no fim do mês (ex.: frota-2026-08.csv).',
    { x:5.88, y:5.12, w:6.55, h:1.5, fontFace:B, fontSize:11.5, color:MUDO, margin:0 });
  s.addNotes('O ⚙ também tem "Reler agora" e "Apontar arquivo…".');
}

/* ══════════════════ 21 · PROBLEMAS ══════════════════ */
{
  const s = pagina('Se alguma coisa não funcionar', 'Solução de problemas');
  tabela(s, [
    ['Encostei a tag e não aconteceu nada','A janela do painel não está em foco — clique nela uma vez'],
    ['Aviso vermelho “não consegui gravar”','O Iniciar-Painel.bat não está aberto'],
    ['O leitor não digita em lugar nenhum','Teste no Bloco de Notas. Se não digitar, o leitor não é do tipo teclado'],
    ['O aviso aparece mas o carro não muda','A tag não está no dados\\veiculos.json'],
    ['O carro aparece com “Condutor não cadastrado”','O crachá não está no pessoas.csv — cadastre pela tela de crachás'],
    ['Sem QR no card','Telefone em branco no cadastro'],
    ['O painel abriu na tela errada','Troque -Monitor 2 por 1 ou 3, na última linha do .bat'],
    ['Bloco de frota diz “sem servidor”','O painel foi aberto direto do arquivo — use o .bat'],
    ['Cabeçalho vermelho, FALHA AO LER','Caminho do fonte.txt mudou, ou a rede caiu. Ele tenta de novo a cada minuto'],
  ], L, 1.5, 12.09, [5.4, 6.69], ['Sintoma','Causa provável']);
  cartao(s, L, 5.5, 12.09, 1.1, 'E7F6F3');
  s.addText('A tela nunca fica em branco: se o arquivo sumir ou o servidor cair, o painel mantém a última leitura boa e sinaliza a falha em vermelho no cabeçalho, tentando de novo a cada minuto.',
    { x:L+0.3, y:5.65, w:11.5, h:0.85, fontFace:B, fontSize:12.5, color:'0B6F66', margin:0 });
  s.addNotes('O LEIA-ME.md dentro da pasta tem a versão longa de todos estes casos.');
}

/* ══════════════════ 22 · FECHO ══════════════════ */
{
  const s = pres.addSlide(); s.background = { color:NOITE };
  s.addShape(pres.ShapeType.ellipse, { x:10.4, y:-1.4, w:5.0, h:5.0, fill:{ color:'12306B' }, line:{ color:'12306B' } });
  s.addText('O dia a dia, em três linhas', { x:L, y:0.85, w:9, h:0.7, fontFace:H, fontSize:32,
    bold:true, color:'FFFFFF', margin:0 });
  const its = [
    ['Ninguém precisa fazer nada','O painel relê a planilha de saídas sozinho, de hora em hora, e o quadro de carros a cada 20 segundos.', TEAL],
    ['Para pegar um carro','encoste a tag do carro e o crachá — em qualquer ordem. Para devolver, a tag do carro de novo.', AZUL],
    ['Uma vez por pessoa','cadastre o crachá e o telefone na tela de crachás. É o que dá nome ao condutor e o QR de WhatsApp.', AMBAR],
  ];
  its.forEach(([t,d,cor], i) => {
    const y = 2.0 + i*1.42;
    s.addShape(pres.ShapeType.roundRect, { x:L, y, w:12.09, h:1.15, rectRadius:0.05,
      fill:{ color:'132241' }, line:{ color:'1E3358' } });
    passo(s, i+1, L+0.35, y+0.36, cor, 0.44);
    s.addText(t, { x:L+1.0, y:y+0.16, w:10.6, h:0.36, fontFace:H, fontSize:15, bold:true, color:'FFFFFF', margin:0 });
    s.addText(d, { x:L+1.0, y:y+0.55, w:10.6, h:0.5, fontFace:B, fontSize:12.5, color:'AFC3E4', margin:0 });
  });
  s.addText('O LEIA-ME.md, dentro da pasta do sistema, traz a versão longa de tudo que está aqui.',
    { x:L, y:6.5, w:11.5, h:0.4, fontFace:B, fontSize:12, color:'6E86AD', margin:0 });
  s.addNotes('Fim do tutorial.');
}

pres.writeFile({ fileName: SAIDA }).then(() => console.log('gerado:', SAIDA));
