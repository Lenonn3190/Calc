/* Ponta a ponta: simula o leitor RFID gravando no log e confere se o
   painel muda de estado sozinho, sem nenhuma interação. */
const http=require('http'), fs=require('fs'), path=require('path'), { chromium }=require('playwright-core');
const RAIZ='/home/user/Calc/powertrain-ausencias';
const LOG=path.join(RAIZ,'dados/frota.csv'), SAIDAS=path.join(RAIZ,'dados/saidas.csv');
const logOrig=fs.readFileSync(LOG,'utf8'), saidasOrig=fs.readFileSync(SAIDAS,'utf8');

const tipos={'.html':'text/html; charset=utf-8','.csv':'text/csv; charset=utf-8'};
const srv=http.createServer((q,s)=>{const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'')||'index.html';
 const fp=path.join(RAIZ,rel); if(!fp.startsWith(RAIZ)||!fs.existsSync(fp)){s.writeHead(404);return s.end('404');}
 s.writeHead(200,{'Content-Type':tipos[path.extname(fp)]||'application/octet-stream','Cache-Control':'no-store'});
 s.end(fs.readFileSync(fp));});

const agora=()=>new Date();
const fmt=d=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
function passaTag(tag, quandoDate){          // o leitor RFID "encosta" uma tag
  fs.appendFileSync(LOG, `${fmt(quandoDate||agora())};${tag}\n`);
}

let falhas=0;
const ok=(c,m,extra='')=>{console.log((c?'  ok  ':'FALHA ')+m+(c?'':'  << '+extra));if(!c)falhas++;};

(async()=>{
  fs.writeFileSync(LOG,'Data/Hora;Tag\n');
  await new Promise(r=>srv.listen(8095,r));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:1440,height:1400}});
  const erros=[]; pg.on('pageerror',e=>erros.push(e.message));
  await pg.goto('http://localhost:8095/',{waitUntil:'load'});
  await pg.waitForTimeout(900);

  const ler = () => pg.evaluate(() => {
    const m={}; calculaFrota(new Date()).lista.forEach(e=>m[e.veiculo.tag]={s:e.status,c:e.condutor&&e.condutor.nome});
    return { est:m, txt:document.getElementById('listaFrota').innerText, cont:document.getElementById('nFrota').textContent };
  });
  const cicloFrota = () => pg.evaluate(()=>atualizaFrota());   // o mesmo que o timer dispara

  console.log('\n— estado inicial: log vazio —');
  let r = await ler();
  ok(r.est['C3FE4090'].s==='livre' && r.est['13B780FA'].s==='livre','os dois disponíveis');
  ok(r.cont==='2 de 2 livres','contador diz 2 de 2', r.cont);
  ok(/DISPON[ÍI]VEL/.test(r.txt),'selo DISPONÍVEL na tela');

  console.log('\n— encosta a tag do Civic: painel pede o crachá —');
  passaTag('CIVIC');
  await cicloFrota(); await pg.waitForTimeout(200);
  r = await ler();
  ok(r.est['13B780FA'].s==='aguardando','Civic aguardando crachá', r.est['13B780FA'].s);
  ok(/AGUARDANDO CRACH/.test(r.txt),'selo de aguardando aparece');
  ok(r.est['C3FE4090'].s==='livre','HR-V segue livre');

  console.log('\n— encosta o crachá: entra em uso com o nome do cadastro —');
  passaTag('CR-0421');
  await cicloFrota(); await pg.waitForTimeout(200);
  r = await ler();
  ok(r.est['13B780FA'].s==='uso','Civic em uso', r.est['13B780FA'].s);
  ok(r.est['13B780FA'].c==='Thiego Ferreira','condutor identificado pelo crachá', r.est['13B780FA'].c);
  ok(r.txt.includes('Thiego Ferreira'),'nome do condutor na tela');
  ok(r.cont==='1 de 2 livres','contador caiu para 1 de 2', r.cont);

  console.log('\n— o outro carro sai também —');
  passaTag('HRV'); passaTag('CR-0107');
  await cicloFrota(); await pg.waitForTimeout(200);
  r = await ler();
  ok(r.est['C3FE4090'].s==='uso' && r.est['C3FE4090'].c==='Jefferson Vilela','HR-V com Jefferson', JSON.stringify(r.est['C3FE4090']));
  ok(r.cont==='0 de 2 livres','nenhum carro livre', r.cont);

  console.log('\n— Civic volta: segunda passagem encerra e libera —');
  passaTag('CIVIC');
  await cicloFrota(); await pg.waitForTimeout(200);
  r = await ler();
  ok(r.est['13B780FA'].s==='livre','Civic disponível de novo', r.est['13B780FA'].s);
  ok(r.est['C3FE4090'].s==='uso','HR-V continua em uso (não se mexeu)', r.est['C3FE4090'].s);
  ok(r.cont==='1 de 2 livres','contador voltou a 1 de 2', r.cont);
  ok(r.txt.includes('Último condutor: Thiego Ferreira'),'mostra quem usou por último');

  console.log('\n— ORDEM INVERTIDA: crachá primeiro, carro depois —');
  passaTag('CR-0233');                       // Nelton encosta o crachá antes
  await cicloFrota(); await pg.waitForTimeout(200);
  r = await ler();
  ok(/passou o crach/.test(r.txt), 'painel pede a tag do carro', r.txt.split('\n')[1]||'');
  ok(r.est['13B780FA'].s==='livre', 'nenhum carro entra em uso só com o crachá');
  passaTag('CIVIC');                         // e só então a tag do carro
  await cicloFrota(); await pg.waitForTimeout(200);
  r = await ler();
  ok(r.est['13B780FA'].s==='uso' && r.est['13B780FA'].c==='Nelton M Borges','Civic em uso com Nelton', JSON.stringify(r.est['13B780FA']));
  ok(!/passou o crach/.test(r.txt),'o aviso de crachá pendente some depois de parear');
  passaTag('CIVIC');                         // devolve
  await cicloFrota(); await pg.waitForTimeout(200);
  r = await ler();
  ok(r.est['13B780FA'].s==='livre','Civic devolvido');

  console.log('\n— log corrompido no meio: não derruba o quadro —');
  fs.appendFileSync(LOG,'linha;quebrada;demais\n;;\n');
  await cicloFrota(); await pg.waitForTimeout(200);
  r = await ler();
  ok(r.est['C3FE4090'].s==='uso','estado preservado apesar do lixo no arquivo', r.est['C3FE4090'].s);

  console.log('\n— log some: mantém o que estava e avisa —');
  fs.unlinkSync(LOG);
  await cicloFrota(); await pg.waitForTimeout(200);
  r = await ler();
  ok(r.est['C3FE4090'].s==='uso','não zera o quadro quando o arquivo some', r.est['C3FE4090'].s);
  ok(/Falha ao ler o log/.test(r.txt),'avisa a falha no bloco', r.txt.slice(0,80));

  console.log('\n— log volta: recupera sozinho —');
  fs.writeFileSync(LOG,'Data/Hora;Tag\n');
  await cicloFrota(); await pg.waitForTimeout(200);
  r = await ler();
  ok(r.est['C3FE4090'].s==='livre' && r.cont==='2 de 2 livres','voltou a ler e recalculou', r.cont);

  await pg.screenshot({path:'e2e-frota.png'});
  ok(erros.length===0,'nenhum erro de JS', erros.join(' | '));

  await b.close(); srv.close();
  fs.writeFileSync(LOG,logOrig); fs.writeFileSync(SAIDAS,saidasOrig);
  console.log('\n'+(falhas?falhas+' FALHA(S)':'TODOS OS TESTES PONTA A PONTA PASSARAM'));
  process.exit(falhas?1:0);
})();
