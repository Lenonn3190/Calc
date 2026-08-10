/* Testa o modo servidor: o painel deve ler dados/saidas.csv sozinho
   e perceber alterações no arquivo sem nenhuma interação. */
const http = require('http'), fs = require('fs'), path = require('path'), { chromium } = require('playwright-core');
const RAIZ = '/home/user/Calc/powertrain-ausencias';
const CSV  = path.join(RAIZ, 'dados/saidas.csv');
const original = fs.readFileSync(CSV, 'utf8');

const tipos = { '.html':'text/html; charset=utf-8', '.csv':'text/csv; charset=utf-8' };
const srv = http.createServer((req, res) => {           // imita o servir.ps1
  let rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html';
  if (rel === 'api/saidas') rel = 'dados/saidas.csv';   // rota do servir.ps1
  const fp = path.join(RAIZ, rel);
  if (!fp.startsWith(RAIZ) || !fs.existsSync(fp)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, {
    'Content-Type': tipos[path.extname(fp)] || 'application/octet-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Last-Modified': fs.statSync(fp).mtime.toUTCString(),
  });
  res.end(fs.readFileSync(fp));
});

let falhas = 0;
const ok = (c, m, extra='') => { console.log((c?'  ok  ':'FALHA ')+m+(c?'':'  << '+extra)); if(!c) falhas++; };

(async () => {
  await new Promise(r => srv.listen(8099, r));
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const pg = await b.newPage({ viewport:{ width:1440, height:1200 } });
  const erros = [];
  pg.on('pageerror', e => erros.push(e.message));

  await pg.goto('http://localhost:8099/', { waitUntil:'load' });
  await pg.waitForTimeout(900);

  console.log('\n— lê o arquivo do caminho, sem clique nenhum —');
  let st = await pg.evaluate(() => ({ modo:Fonte.modo, caminho:Fonte.caminho, erro:Fonte.erro,
                                      qtd:estado.registros.length, status:document.getElementById('statusTxt').textContent }));
  console.log('   ', JSON.stringify(st));
  ok(st.modo === 'http', 'entrou em modo servidor');
  ok(!st.erro, 'sem erro de leitura', st.erro);
  ok(st.qtd === 21, 'carregou os 21 registros do CSV', 'veio '+st.qtd);
  ok(/api\/saidas · lido às \d\d:\d\d/.test(st.status), 'cabeçalho mostra a fonte e a hora', st.status);

  console.log('\n— o CSV muda no disco: o painel tem de perceber sozinho —');
  const novo = original.trimEnd() + '\nTeste de recarga;Projetos;Fulano Teste;I/H;Curitiba-PR;'
             + '01/01/2020 08:00;31/12/2035 17:00;1;Carro\n';
  fs.writeFileSync(CSV, novo);
  await pg.evaluate(() => atualizaDaFonte());      // o mesmo que o setInterval dispara
  await pg.waitForTimeout(400);

  st = await pg.evaluate(() => ({ qtd:estado.registros.length,
                                  temFulano:document.getElementById('listaAusentes').innerText.includes('Fulano Teste'),
                                  kpi:document.querySelector('.kpi .v').textContent }));
  console.log('   ', JSON.stringify(st));
  ok(st.qtd === 22, 'releu e passou a ver 22 registros', 'veio '+st.qtd);
  ok(st.temFulano, 'o registro novo já aparece em "Ausentes agora"');
  ok(st.kpi === '1', 'KPI recalculado com o novo ausente', 'veio '+st.kpi);

  console.log('\n— arquivo sem mudança: não reprocessa à toa —');
  const antes = await pg.evaluate(() => Fonte.carimbo);
  await pg.evaluate(() => atualizaDaFonte());
  const depois = await pg.evaluate(() => ({ carimbo:Fonte.carimbo, erro:Fonte.erro }));
  ok(antes === depois.carimbo && !depois.erro, 'carimbo estável, sem erro');

  console.log('\n— arquivo some: painel avisa e mantém o que já tinha na tela —');
  fs.unlinkSync(CSV);
  await pg.evaluate(() => atualizaDaFonte());
  await pg.waitForTimeout(300);
  st = await pg.evaluate(() => ({ erro:Fonte.erro, qtd:estado.registros.length,
                                  status:document.getElementById('statusTxt').textContent }));
  console.log('   ', JSON.stringify(st));
  ok(!!st.erro, 'registrou o erro');
  ok(st.qtd === 22, 'não apagou os dados que já estavam na tela', 'veio '+st.qtd);
  ok(st.status.includes('FALHA AO LER'), 'cabeçalho avisa a falha', st.status);

  console.log('\n— arquivo volta: recupera sozinho —');
  fs.writeFileSync(CSV, original);
  await pg.evaluate(() => atualizaDaFonte());
  await pg.waitForTimeout(300);
  st = await pg.evaluate(() => ({ erro:Fonte.erro, qtd:estado.registros.length }));
  ok(!st.erro && st.qtd === 21, 'voltou a ler normalmente', JSON.stringify(st));

  await pg.screenshot({ path:'/tmp/claude-0/-home-user/c4ebad73-ed38-57bd-ad0e-0ec4f3b99b0c/scratchpad/fonte.png' });
  ok(erros.length === 0, 'nenhum erro de JS na página', erros.join(' | '));

  await b.close(); srv.close();
  fs.writeFileSync(CSV, original);
  console.log('\n' + (falhas ? falhas + ' FALHA(S)' : 'TODOS OS TESTES DE FONTE PASSARAM'));
  process.exit(falhas ? 1 : 0);
})();
