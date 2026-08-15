/* Tira TODOS os prints do tutorial, do sistema rodando de verdade.
   A agenda de saídas é calculada em torno de HOJE: com as datas de exemplo
   do repositório (já vencidas) o painel apareceria vazio no material. */
const http=require('http'),fs=require('fs'),path=require('path'),{chromium}=require('playwright-core');
const RAIZ=require('path').join(__dirname,'..');
const OUT=require('path').join(__dirname,'prints');
fs.mkdirSync(OUT,{recursive:true});
const PES=path.join(RAIZ,'dados/pessoas.csv'), LOG=path.join(RAIZ,'dados/frota.csv');
const pesOrig=fs.readFileSync(PES,'utf8'), logOrig=fs.readFileSync(LOG,'utf8');
process.on('exit',()=>{try{fs.writeFileSync(PES,pesOrig);fs.writeFileSync(LOG,logOrig)}catch(e){}});
['uncaughtException','unhandledRejection'].forEach(ev=>process.on(ev,e=>{console.error(e);process.exit(1)}));

const p2=n=>String(n).padStart(2,'0');
const d0=new Date(); d0.setSeconds(0,0);
const dia=(n,h=8,m=0)=>{const d=new Date(d0);d.setDate(d.getDate()+n);d.setHours(h,m,0,0);return d;};
const fd=d=>`${p2(d.getDate())}/${p2(d.getMonth()+1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
const fmt=fd, atras=m=>new Date(Date.now()-m*60000);

/* agenda de demonstração, sempre relativa a hoje */
const SAIDAS='Descrição da Saída;Motivo;Nome Colaborador;Departamento;Destino;Data de início;Data de término;Transporte\r\n'+[
 ['Férias','Férias','Tulio','I/H','',dia(-4,0,0),dia(6,17,0),''],
 ['JPN - Trip for foundry tryout verification','3YZ','Paiva','NMG','Suzuka',dia(-11,8,15),dia(9,18,0),'Avião'],
 ['Treinamento KUKA','Treinamento','"Tanaka; Nakahara"','I/H','KUKA Systems',dia(-1,6,0),dia(2,17,0),'Carro'],
 ['VT-MAHLE','Visita técnica','Jefferson Vilela','OUTSOURCE','Mogi Guaçu-SP',dia(0,8,15),dia(0,17,30),'Carro'],
 ['Consulta médica (Ortopedista)','Consulta médica','Marco Antonio','OUTSOURCE','',dia(0,10,0),dia(0,15,26),''],
 ['Visita Atlas','Projetos','Thiego Ferreira','NMG','Atlas Copco',dia(0,7,0),dia(0,16,0),'Carro'],
 ['Viagem internacional','Projetos','Nelton M Borges','I/H','Japão',dia(-2,0,0),dia(4,0,0),'Avião'],
 ['Renovação CNH','Saída antecipada','Lenonn','I/H','',dia(1,14,0),dia(1,17,0),''],
 ['Assunto particular','Saída antecipada','Carlos Eduardo','NMG','',dia(2,13,0),dia(2,17,26),''],
 ['Cartório / Poupa Tempo','Atraso','Douglas Marciano','OUTSOURCE','',dia(3,8,15),dia(3,11,0),''],
 ['Instalação Apertadeira Eletrônica','Projetos','Thiego','I/H','Fornecedor',dia(5,8,0),dia(12,17,0),'Avião'],
 ['Férias','Férias','Gatto','I/H','',dia(7,8,15),dia(11,17,26),''],
 ['Visita ferramentarias Joinville','Visita técnica','Jefferson','OUTSOURCE','Joinville-SC',dia(9,8,0),dia(13,17,0),'Avião'],
 ['Férias','Férias','Agenor Rodrigo','I/H','',dia(14,0,0),dia(33,23,59),''],
 ['Particular','Saída antecipada','William Nakahara','I/H','',dia(16,13,0),dia(16,17,26),''],
 ['Visita no fornecedor Maquistorno','Expansão MSC','Erick','I/H','',dia(21,14,30),dia(21,15,50),'Carro'],
 ['Visita na G/O JPN','Projetos','Nelton','I/H','Japão',dia(25,0,0),dia(38,0,0),'Avião'],
 ['Férias','Férias','Dutra','OUTSOURCE','',dia(-8,0,0),dia(-1,17,0),''],
].map(l=>[l[0],l[1],l[2],l[3],l[4],fd(l[5]),fd(l[6]),l[7]].join(';')).join('\r\n')+'\r\n';

const EQUIPE='ID;Nome;Departamento;Telefone\r\n'+
 'CR-0421;Thiego Ferreira;NMG;(19) 99123-4567\r\nCR-0107;Jefferson Vilela;OUTSOURCE;(19) 99234-5678\r\n'+
 'CR-0233;Nelton M Borges;I/H;(19) 99345-6789\r\nCR-0318;Lenonn;I/H;(19) 99456-7890\r\n'+
 'CR-0092;Marco Túlio;I/H;\r\nCR-0455;Carlos Eduardo;NMG;\r\n'+
 'CR-0501;William Nakahara;I/H;(19) 99789-0123\r\n;Douglas Marciano;OUTSOURCE;\r\n';

const tipos={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.csv':'text/csv; charset=utf-8','.json':'application/json; charset=utf-8'};
const srv=http.createServer((q,s)=>{
  const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'')||'index.html';
  if(rel==='api/saidas'){s.writeHead(200);return s.end(SAIDAS);}          // agenda de demonstração
  if(rel==='api/leitura'){const c=[];q.on('data',d=>c.push(d));
    q.on('end',()=>{const t=Buffer.concat(c).toString().trim();
      fs.appendFileSync(LOG,`${fd(new Date())};${t}\r\n`);s.writeHead(200);s.end('{}')});return;}
  if(rel.startsWith('api/')){q.resume();q.on('end',()=>{s.writeHead(200);s.end('{}')});return;}
  const fp=path.join(RAIZ,rel); if(!fs.existsSync(fp)){s.writeHead(404);return s.end('404');}
  s.writeHead(200,{'Content-Type':tipos[path.extname(fp)]||'application/octet-stream','Cache-Control':'no-store'});
  s.end(fs.readFileSync(fp));
});
const shot=async(a,n,o={})=>{await a.screenshot({path:`${OUT}/${n}.png`,...o});console.log('  ->',n);};

(async()=>{
  fs.writeFileSync(PES,EQUIPE); fs.writeFileSync(LOG,'Data/Hora;Tag\r\n');
  await new Promise(r=>srv.listen(8112,r));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:1440,height:2560},deviceScaleFactor:2});
  pg.on('pageerror',e=>console.log('ERRO',e.message));
  await pg.goto('http://localhost:8112/',{waitUntil:'load'}); await pg.waitForTimeout(1800);
  console.log('  registros lidos:', await pg.evaluate(()=>estado.registros.length));

  await shot(await pg.$('[data-bloco="indicadores"]'),'painel-kpis');
  await shot(await pg.$('[data-bloco="ausentes"]'),'painel-ausentes');
  await shot(await pg.$('[data-bloco="proximas"]'),'painel-proximas');
  await shot(await pg.$('[data-bloco="ocupacao"]'),'painel-ocupacao');
  await shot(await pg.$('[data-bloco="retornos"]'),'painel-retornos');
  await shot(await pg.$('[data-bloco="estatisticas"]'),'painel-estatisticas');
  await shot(await pg.$('header.top'),'painel-cabecalho');
  await shot(pg,'painel-inteiro');

  /* card de um carro só, para o passo a passo */
  await shot(await pg.$('.veic'),'card-livre');
  await pg.keyboard.type('C3FE4090'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(900);
  await shot(await pg.$('#aviso'),'aviso-carro-lido');
  await pg.evaluate(()=>escondeAviso()); await pg.waitForTimeout(300);
  await shot(await pg.$('.veic'),'card-aguardando');
  await pg.keyboard.type('CR-0421'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(1000);
  await shot(await pg.$('#aviso'),'aviso-saida-registrada');
  await pg.evaluate(()=>escondeAviso()); await pg.waitForTimeout(400);
  await shot(await pg.$('.veic.uso'),'card-em-uso');
  await shot(await pg.$('[data-bloco="frota"]'),'frota-em-uso-qr');
  await pg.keyboard.type('C3FE4090'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(1000);
  await shot(await pg.$('#aviso'),'aviso-devolvido');

  /* janela de configuração, o elemento inteiro */
  await pg.evaluate(()=>escondeAviso()); await pg.waitForTimeout(300);
  await pg.click('#btnCfg'); await pg.waitForTimeout(600);
  await shot(await pg.$('#cfgModal > *'),'painel-config');
  await pg.evaluate(()=>fechaCfg()); await pg.waitForTimeout(300);
  await pg.click('#btnBlocos'); await pg.waitForTimeout(400);
  await shot(pg,'painel-menu-blocos',{clip:{x:760,y:0,width:680,height:800}});


  /* ═══ estados sem QR ═══ */
  fs.writeFileSync(PES, EQUIPE);
  fs.writeFileSync(LOG,'Data/Hora;Tag\r\n'+
    `${fd(atras(20))};C3FE4090\r\n${fd(atras(20))};CR-0421\r\n`+
    `${fd(atras(50))};13B780FA\r\n${fd(atras(50))};CR-0092\r\n`);   // Marco Túlio não tem telefone
  await pg.evaluate(()=>{FonteFrota.carimboLog=null;FonteFrota.carimboPessoas=null;});
  await pg.evaluate(()=>atualizaFrota()); await pg.waitForTimeout(900);
  await shot(await pg.$('[data-bloco="frota"]'),'frota-sem-telefone');
  await shot(await pg.$('.veic.uso .qr'),'qr-zoom');

  fs.writeFileSync(LOG,'Data/Hora;Tag\r\n'+`${fd(atras(25))};C3FE4090\r\n${fd(atras(25))};CR-8888\r\n`);
  await pg.evaluate(()=>{FonteFrota.carimboLog=null;});
  await pg.evaluate(()=>atualizaFrota()); await pg.waitForTimeout(900);
  await shot(await pg.$('.veic.uso'),'card-fora-do-cadastro');
  await pg.close();

  /* ═══ CADASTRO ═══ */
  fs.writeFileSync(PES, EQUIPE);
  const c=await b.newPage({viewport:{width:1500,height:980},deviceScaleFactor:2,hasTouch:true});
  c.on('pageerror',e=>console.log('ERRO cad',e.message));
  await c.goto('http://localhost:8112/cadastro.html',{waitUntil:'load'}); await c.waitForTimeout(700);
  await shot(c,'cadastro-inicio',{clip:{x:0,y:0,width:1500,height:900}});
  await shot(await c.$('header.topo'),'cadastro-cabecalho');
  await shot((await c.$$('.corpo .cartao')).slice(-1)[0],'cadastro-carregar-lista');

  await c.click('.pessoa'); await c.waitForTimeout(500);
  await shot(c,'cadastro-editor',{clip:{x:0,y:0,width:1500,height:900}});

  await c.click('#edFechar'); await c.waitForTimeout(200);
  await c.fill('#busca','Renata Y Kobayashi'); await c.waitForTimeout(400);
  await shot(c,'cadastro-nome-novo',{clip:{x:0,y:150,width:1500,height:620}});
  await c.fill('#busca',''); await c.waitForTimeout(300);

  await c.click('#chipSemFone'); await c.waitForTimeout(400);
  await shot(c,'cadastro-sem-telefone',{clip:{x:0,y:0,width:1500,height:760}});
  await c.click('#chipSemFone'); await c.waitForTimeout(300);

  await c.click('#busca'); await c.waitForTimeout(400);
  for (const ch of 'thi') await c.click(`#tecladoVirtual button.k[data-valor="${ch}"]`);
  await c.waitForTimeout(400);
  await shot(c,'teclado-texto',{clip:{x:0,y:0,width:1500,height:980}});
  await shot(await c.$('#tecladoVirtual'),'teclado-texto-zoom');

  await c.click('#tecladoVirtual .fechar'); await c.waitForTimeout(200);
  await c.fill('#busca','marco'); await c.waitForTimeout(300);
  await c.click('.pessoa'); await c.waitForTimeout(400);
  await c.click('#edFone'); await c.waitForTimeout(500);
  for (const d of '1999') await c.click(`#tecladoVirtual button.k[data-valor="${d}"]`);
  await c.waitForTimeout(400);
  await shot(c,'teclado-numerico',{clip:{x:0,y:0,width:1500,height:980}});
  await c.close();

  await b.close(); srv.close();
  fs.writeFileSync(PES,pesOrig); fs.writeFileSync(LOG,logOrig);
  console.log('ok');
})();
