/* Verifica o agendamento da releitura: 1 hora quando está tudo bem,
   1 minuto enquanto houver falha. Usa relógio virtual do Playwright para
   não esperar de verdade. */
const http=require('http'), fs=require('fs'), path=require('path'), { chromium }=require('playwright-core');
const RAIZ='/home/user/Calc/powertrain-ausencias', CSV=path.join(RAIZ,'dados/saidas.csv');
const original=fs.readFileSync(CSV,'utf8');
let servirCsv = true, leituras = 0;

const tipos={'.html':'text/html; charset=utf-8','.csv':'text/csv; charset=utf-8'};
const srv=http.createServer((q,s)=>{
  let rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'')||'index.html';
  const eraSaidas = rel === 'api/saidas';
  if (eraSaidas) rel = 'dados/saidas.csv';              // rota do servir.ps1
  const fp=path.join(RAIZ,rel);
  if (eraSaidas){          // conta SÓ a fonte de saídas:
    leituras++;                             // a frota tem ciclo próprio
    if (!servirCsv){ s.writeHead(503); return s.end('indisponivel'); }
  }
  if(!fp.startsWith(RAIZ)||!fs.existsSync(fp)){s.writeHead(404);return s.end('404');}
  s.writeHead(200,{'Content-Type':tipos[path.extname(fp)]||'application/octet-stream','Cache-Control':'no-store'});
  s.end(fs.readFileSync(fp));
});

let falhas=0;
const ok=(c,m,extra='')=>{console.log((c?'  ok  ':'FALHA ')+m+(c?'':'  << '+extra)); if(!c)falhas++;};

(async()=>{
  await new Promise(r=>srv.listen(8097,r));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:1440,height:1000}});
  const erros=[]; pg.on('pageerror',e=>erros.push(e.message));
  await pg.clock.install();                       // relógio controlado
  await pg.goto('http://localhost:8097/',{waitUntil:'load'});
  await pg.waitForTimeout(600);

  const base = leituras;
  ok(base >= 1, 'leu uma vez no arranque', 'leituras='+base);
  ok(await pg.evaluate(()=>CONFIG.recarregarSeg) === 3600, 'intervalo configurado em 3600 s');

  console.log('\n— 30 min depois: ainda NÃO deve ter relido —');
  await pg.clock.fastForward(30*60*1000);
  await pg.waitForTimeout(300);
  ok(leituras === base, 'nenhuma leitura extra em 30 min', 'leituras='+(leituras-base));

  console.log('\n— passada 1 hora: relê —');
  await pg.clock.fastForward(31*60*1000);
  await pg.waitForTimeout(400);
  ok(leituras === base+1, 'exatamente 1 releitura na virada da hora', 'extra='+(leituras-base));

  console.log('\n— servidor falhando: tenta de novo em 1 min, não em 1 h —');
  servirCsv = false;
  await pg.clock.fastForward(60*60*1000);              // provoca a próxima leitura (falha)
  await pg.waitForTimeout(400);
  const aposFalha = leituras;
  ok(await pg.evaluate(()=>!!Fonte.erro), 'painel registrou a falha');
  await pg.clock.fastForward(65*1000);                 // ~1 min
  await pg.waitForTimeout(400);
  ok(leituras > aposFalha, 'tentou de novo dentro de ~1 min', 'extra='+(leituras-aposFalha));

  console.log('\n— servidor volta: retoma e volta ao ritmo de 1 hora —');
  servirCsv = true;
  await pg.clock.fastForward(65*1000);
  await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>!Fonte.erro), 'recuperou sozinho');
  const aposVolta = leituras;
  await pg.clock.fastForward(30*60*1000);
  await pg.waitForTimeout(300);
  ok(leituras === aposVolta, 'voltou ao intervalo longo (nada em 30 min)', 'extra='+(leituras-aposVolta));

  console.log('\n— o painel continua recalculando de minuto em minuto —');
  const antes = await pg.evaluate(()=>document.getElementById('rodape').textContent);
  await pg.clock.fastForward(2*60*1000);
  await pg.waitForTimeout(300);
  const depois = await pg.evaluate(()=>document.getElementById('rodape').textContent);
  ok(antes !== depois, 'rodapé mostra recálculo recente', antes+' -> '+depois);

  ok(erros.length===0, 'nenhum erro de JS', erros.join(' | '));
  await b.close(); srv.close(); fs.writeFileSync(CSV, original);
  console.log('\n'+(falhas?falhas+' FALHA(S)':'TODOS OS TESTES DE CICLO PASSARAM'));
  process.exit(falhas?1:0);
})();
