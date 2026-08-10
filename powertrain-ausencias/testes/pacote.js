/* Testa o pacote como o usuário vai receber: serve a PASTA EXTRAÍDA do zip
   e exercita o painel inteiro em cima dela. */
const http=require('http'), fs=require('fs'), path=require('path'), { chromium }=require('playwright-core');
const RAIZ='/tmp/claude-0/-home-user/c4ebad73-ed38-57bd-ad0e-0ec4f3b99b0c/scratchpad/extraido/Powertrain-Monitor';
const LOG=path.join(RAIZ,'dados/frota.csv'), HIST=path.join(RAIZ,'dados/historico.json');

let gravou=0;
const tipos={'.html':'text/html; charset=utf-8','.csv':'text/csv; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
const srv=http.createServer((q,s)=>{
  const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'')||'index.html';
  if (rel==='api/saidas'){                       // rota do servir.ps1
    const fp=path.join(RAIZ,'dados/saidas.csv');
    if(!fs.existsSync(fp)){s.writeHead(404);return s.end('404');}
    s.writeHead(200,{'Content-Type':'application/octet-stream','Cache-Control':'no-store'});
    return s.end(fs.readFileSync(fp));
  }
  if (rel==='api/historico' && q.method==='POST'){
    const c=[]; q.on('data',d=>c.push(d));
    q.on('end',()=>{ fs.writeFileSync(HIST,Buffer.concat(c)); gravou++;
      s.writeHead(200,{'Content-Type':'application/json'}); s.end('{"ok":true}'); });
    return;
  }
  const fp=path.join(RAIZ,rel);
  if(!fp.startsWith(RAIZ)||!fs.existsSync(fp)){s.writeHead(404);return s.end('404');}
  s.writeHead(200,{'Content-Type':tipos[path.extname(fp)]||'application/octet-stream','Cache-Control':'no-store'});
  s.end(fs.readFileSync(fp));
});

const fmt=d=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
const passa=t=>fs.appendFileSync(LOG,`${fmt(new Date())};${t}\r\n`);   // leitor escreve CRLF

let falhas=0;
const ok=(c,m,e='')=>{console.log((c?'  ok  ':'FALHA ')+m+(c?'':'  << '+e));if(!c)falhas++;};

(async()=>{
  // zera o log do pacote extraído: senão as execuções vão se somando
  fs.writeFileSync(LOG,'Data/Hora;Tag\r\n');
  await new Promise(r=>srv.listen(8088,r));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:1440,height:2560}});
  const erros=[]; pg.on('pageerror',e=>erros.push(e.message));
  const req404=[]; pg.on('response',r=>{ if(r.status()>=400) req404.push(r.status()+' '+r.url()); });

  await pg.goto('http://localhost:8088/',{waitUntil:'load'});
  await pg.waitForTimeout(1200);

  console.log('\n— o painel abre e lê os arquivos do pacote —');
  let st=await pg.evaluate(()=>({
    titulo:document.title, saidas:estado.registros.length,
    fonteErro:Fonte.erro, frotaErro:FonteFrota.erro,
    pessoas:pessoas.size, carros:calculaFrota(new Date()).lista.length,
  }));
  console.log('   ',JSON.stringify(st));
  ok(/Powertrain/.test(st.titulo),'título correto', st.titulo);
  ok(st.saidas===21,'21 ausências lidas do CSV com BOM','veio '+st.saidas);
  ok(!st.fonteErro,'sem erro na fonte de saídas', String(st.fonteErro));
  ok(!st.frotaErro,'sem erro na fonte da frota', String(st.frotaErro));
  ok(st.pessoas===10,'10 crachás no cadastro','veio '+st.pessoas);
  ok(st.carros===2,'dois veículos configurados','veio '+st.carros);
  ok(req404.length===0,'nenhum arquivo faltando (404)', req404.join(' | '));

  console.log('\n— ciclo completo de RFID sobre o pacote —');
  passa('C3FE4090'); passa('CR-0318');                    // Lenonn pega a HR-V
  await pg.evaluate(()=>atualizaFrota()); await pg.waitForTimeout(400);
  let f=await pg.evaluate(()=>{const m={};calculaFrota(new Date()).lista.forEach(e=>m[e.veiculo.tag]=[e.status,e.condutor&&e.condutor.nome]);return m;});
  ok(f['C3FE4090'][0]==='uso' && f['C3FE4090'][1]==='Lenonn','HR-V em uso com Lenonn', JSON.stringify(f['C3FE4090']));
  passa('C3FE4090');                                      // devolve
  await pg.evaluate(()=>atualizaFrota()); await pg.waitForTimeout(400);
  f=await pg.evaluate(()=>{const m={};calculaFrota(new Date()).lista.forEach(e=>m[e.veiculo.tag]=e.status);return m;});
  ok(f['C3FE4090']==='livre','HR-V devolvido', f['C3FE4090']);

  console.log('\n— histórico gravado na pasta do pacote —');
  ok(gravou>0,'servidor recebeu a gravação','gravacoes='+gravou);
  const h=JSON.parse(fs.readFileSync(HIST,'utf8'));
  ok(h.total_viagens===1,'uma viagem no histórico','veio '+h.total_viagens);
  ok(h.viagens[0].condutor==='Lenonn','condutor certo no arquivo', h.viagens[0].condutor);

  console.log('\n— layout no monitor vertical —');
  const lay=await pg.evaluate(()=>({
    overflowX:document.documentElement.scrollWidth>window.innerWidth,
    altura:document.documentElement.scrollHeight,
    blocos:document.querySelectorAll('section.panel').length,
  }));
  console.log('   ',JSON.stringify(lay));
  ok(!lay.overflowX,'sem rolagem horizontal');
  ok(lay.blocos>=6,'todos os blocos presentes','veio '+lay.blocos);
  await pg.screenshot({path:'/tmp/claude-0/-home-user/c4ebad73-ed38-57bd-ad0e-0ec4f3b99b0c/scratchpad/pacote.png'});

  ok(erros.length===0,'nenhum erro de JS', erros.join(' | '));
  await b.close(); srv.close();
  console.log('\n'+(falhas?falhas+' FALHA(S)':'O PACOTE FUNCIONA COMO ENTREGUE'));
  process.exit(falhas?1:0);
})();
