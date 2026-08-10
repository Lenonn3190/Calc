/* Recolher e esconder blocos, e a escolha sobrevivendo ao recarregar. */
const http=require('http'), fs=require('fs'), path=require('path'), { chromium }=require('playwright-core');
const RAIZ='/home/user/Calc/powertrain-ausencias';
const LOG=path.join(RAIZ,'dados/frota.csv');
const logOrig=fs.readFileSync(LOG,'utf8');

const tipos={'.html':'text/html; charset=utf-8','.csv':'text/csv; charset=utf-8','.json':'application/json; charset=utf-8'};
let leituras=[];
const srv=http.createServer((q,s)=>{
  const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'')||'index.html';
  if (rel==='api/saidas'){
    s.writeHead(200,{'Content-Type':'application/octet-stream','Cache-Control':'no-store'});
    return s.end(fs.readFileSync(path.join(RAIZ,'dados/saidas.csv')));
  }
  if (rel==='api/leitura'){ const c=[]; q.on('data',d=>c.push(d));
    q.on('end',()=>{ leituras.push(Buffer.concat(c).toString()); s.writeHead(200); s.end('{"ok":true}'); }); return; }
  if (rel.startsWith('api/')){ q.resume(); q.on('end',()=>{s.writeHead(200);s.end('{"ok":true}')}); return; }
  const fp=path.join(RAIZ,rel);
  if(!fs.existsSync(fp)){s.writeHead(404);return s.end('404');}
  s.writeHead(200,{'Content-Type':tipos[path.extname(fp)]||'application/octet-stream','Cache-Control':'no-store'});
  s.end(fs.readFileSync(fp));
});

let falhas=0;
const ok=(c,m,e='')=>{console.log((c?'  ok  ':'FALHA ')+m+(c?'':'  << '+e));if(!c)falhas++;};

(async()=>{
  fs.writeFileSync(LOG,'Data/Hora;Tag\r\n');
  await new Promise(r=>srv.listen(8082,r));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:1440,height:2560}});
  const erros=[]; pg.on('pageerror',e=>erros.push(e.message));
  await pg.goto('http://localhost:8082/',{waitUntil:'load'});
  await pg.waitForTimeout(1000);

  const estado=()=>pg.evaluate(()=>{
    const m={};
    document.querySelectorAll('[data-bloco]').forEach(s=>m[s.dataset.bloco]={
      oculto:s.classList.contains('oculto'), fechado:s.classList.contains('fechado')});
    return m;
  });
  // soma dos blocos visíveis: a página tem piso de uma tela, então
  // scrollHeight esconde a redução quando tudo cabe
  const altura=()=>pg.evaluate(()=>[...document.querySelectorAll('[data-bloco]')]
    .reduce((t,s)=>t+s.offsetHeight,0));

  console.log('\n— começa com tudo visível —');
  let e=await estado();
  console.log('   ',Object.keys(e).join(', '));
  ok(Object.keys(e).length===7,'sete blocos identificados','veio '+Object.keys(e).length);
  ok(Object.values(e).every(x=>!x.oculto&&!x.fechado),'nenhum escondido nem recolhido');
  const altInicial=await altura();

  console.log('\n— clicar no título recolhe o bloco —');
  await pg.click('[data-bloco="ocupacao"] h2'); await pg.waitForTimeout(300);
  e=await estado();
  ok(e.ocupacao.fechado,'ocupação recolhida');
  ok(!e.ocupacao.oculto,'recolhido não é o mesmo que escondido');
  const visivel=await pg.evaluate(()=>{
    const s=document.querySelector('[data-bloco="ocupacao"]');
    return {titulo:s.querySelector('h2').offsetHeight>0, corpo:s.querySelector('.tl').offsetHeight>0};
  });
  ok(visivel.titulo && !visivel.corpo,'título continua na tela, conteúdo some',JSON.stringify(visivel));
  ok(await altura() < altInicial,'a página encurtou');

  console.log('\n— clicar de novo expande —');
  await pg.click('[data-bloco="ocupacao"] h2'); await pg.waitForTimeout(300);
  e=await estado();
  ok(!e.ocupacao.fechado,'voltou a expandir');

  console.log('\n— o menu esconde o bloco por completo —');
  await pg.click('#btnBlocos'); await pg.waitForTimeout(250);
  ok(await pg.evaluate(()=>document.getElementById('menuBlocos').classList.contains('aberto')),'menu abriu');
  const nomes=await pg.evaluate(()=>[...document.querySelectorAll('#listaBlocos button[data-alvo]')].map(b=>b.textContent.trim()));
  console.log('   ',JSON.stringify(nomes));
  ok(nomes.length===7,'menu lista os sete blocos','veio '+nomes.length);
  ok(nomes.some(n=>/Frota/.test(n)),'nomes legíveis no menu',nomes.join(' | '));

  // getBoundingClientRect NÃO enxerga recorte de ancestral (overflow:hidden),
  // então checa clicabilidade real: o que está no ponto é a própria lista?
  const recorte=await pg.evaluate(()=>{
    const l=document.getElementById('listaBlocos');
    const r=l.getBoundingClientRect();
    const pontos=[[r.left+20,r.top+20],[r.left+20,r.bottom-20],[r.right-20,r.bottom-20]];
    const dentro=pontos.map(([x,y])=>l.contains(document.elementFromPoint(x,y)));
    return {alt:Math.round(r.height), dentroDaTela:r.bottom<=window.innerHeight, dentro};
  });
  console.log('   ',JSON.stringify(recorte));
  ok(recorte.alt>200,'lista tem altura de menu de verdade','alt='+recorte.alt);
  ok(recorte.dentroDaTela,'cabe na tela');
  ok(recorte.dentro.every(Boolean),'nenhum canto recortado (topo, base e direita clicáveis)',
     JSON.stringify(recorte.dentro));

  await pg.click('#listaBlocos button[data-alvo="retornos"]'); await pg.waitForTimeout(300);
  e=await estado();
  ok(e.retornos.oculto,'retornos escondido');
  ok(await pg.evaluate(()=>document.querySelector('[data-bloco="retornos"]').offsetHeight===0),'sumiu da tela');

  console.log('\n— a escolha sobrevive ao recarregar —');
  await pg.reload({waitUntil:'load'}); await pg.waitForTimeout(1000);
  e=await estado();
  ok(e.retornos.oculto,'continua escondido depois do reload');
  ok(!e.ocupacao.fechado,'o que estava expandido continua expandido');

  console.log('\n— recolher tudo e mostrar tudo —');
  await pg.click('#btnBlocos'); await pg.waitForTimeout(200);
  await pg.click('#listaBlocos button[data-tudo="recolher"]'); await pg.waitForTimeout(300);
  e=await estado();
  const paineis=await pg.evaluate(()=>[...document.querySelectorAll('.panel[data-bloco]')].map(s=>s.dataset.bloco));
  ok(paineis.every(id=>e[id].fechado),'todos os painéis recolhidos',JSON.stringify(e));
  const altRecolhida=await altura();
  ok(altRecolhida < altInicial*0.7,'tela ficou bem mais curta',`${altRecolhida} vs ${altInicial}`);

  ok(!(await pg.evaluate(()=>document.getElementById('menuBlocos').classList.contains('aberto'))),
     'menu fecha sozinho depois de "recolher tudo"');
  await pg.click('#btnBlocos'); await pg.waitForTimeout(200);
  await pg.click('#listaBlocos button[data-tudo="mostrar"]'); await pg.waitForTimeout(300);
  e=await estado();
  ok(Object.values(e).every(x=>!x.oculto&&!x.fechado),'mostrar tudo restaura','ainda: '+JSON.stringify(e));

  console.log('\n— clicar fora fecha o menu —');
  await pg.click('#btnBlocos'); await pg.waitForTimeout(200);
  await pg.click('footer'); await pg.waitForTimeout(250);
  ok(!(await pg.evaluate(()=>document.getElementById('menuBlocos').classList.contains('aberto'))),'menu fechou');

  console.log('\n— usar o menu não vira leitura de tag —');
  leituras=[];
  await pg.click('#btnBlocos'); await pg.waitForTimeout(200);
  await pg.keyboard.press('Enter');              // alguém teclando com o menu aberto
  await pg.keyboard.type('ABC'); await pg.waitForTimeout(400);
  ok(leituras.length===0,'nada gravado com o menu aberto',JSON.stringify(leituras));
  await pg.click('footer'); await pg.waitForTimeout(250);

  console.log('\n— com o menu fechado, o leitor volta a funcionar —');
  await pg.keyboard.type('C3FE4090'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(500);
  ok(leituras.includes('C3FE4090'),'tag registrada normalmente',JSON.stringify(leituras));

  ok(erros.length===0,'nenhum erro de JS',erros.join(' | '));
  await pg.click('#btnBlocos'); await pg.waitForTimeout(300);
  await pg.screenshot({path:'/tmp/claude-0/-home-user/c4ebad73-ed38-57bd-ad0e-0ec4f3b99b0c/scratchpad/blocos.png',
    clip:{x:0,y:0,width:1440,height:900}});

  await b.close(); srv.close(); fs.writeFileSync(LOG,logOrig);
  console.log('\n'+(falhas?falhas+' FALHA(S)':'BLOCOS RECOLHEM, ESCONDEM E LEMBRAM'));
  process.exit(falhas?1:0);
})();
