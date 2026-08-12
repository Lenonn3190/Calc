/* Verifica a gravação do histórico: o painel simula o leitor RFID e o
   servidor grava dados/historico.json, igual ao handler do servir.ps1. */
const http=require('http'), fs=require('fs'), path=require('path'), { chromium }=require('playwright-core');
const RAIZ='/home/user/Calc/powertrain-ausencias';
const LOG=path.join(RAIZ,'dados/frota.csv'), HIST=path.join(RAIZ,'dados/historico.json');
const logOrig=fs.readFileSync(LOG,'utf8');
const histOrig=fs.existsSync(HIST)?fs.readFileSync(HIST,'utf8'):null;
process.on('exit',()=>{ try{ fs.writeFileSync(LOG,logOrig);
  if(histOrig!==null) fs.writeFileSync(HIST,histOrig); }catch(e){} });
['uncaughtException','unhandledRejection'].forEach(ev=>process.on(ev,e=>{console.error(e);process.exit(1);}));

let gravacoes=0, falharPost=false;
const tipos={'.html':'text/html; charset=utf-8','.csv':'text/csv; charset=utf-8','.json':'application/json; charset=utf-8'};
const srv=http.createServer((q,s)=>{
  const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'')||'index.html';
  if (rel==='api/historico' && q.method==='POST'){         // == handler do servir.ps1 ==
    if (falharPost){ s.writeHead(500); return s.end('erro'); }
    const ch=[]; q.on('data',d=>ch.push(d));
    q.on('end',()=>{
      const buf=Buffer.concat(ch);
      fs.writeFileSync(HIST+'.tmp', buf); fs.renameSync(HIST+'.tmp', HIST);   // atômico
      gravacoes++;
      s.writeHead(200,{'Content-Type':'application/json'}); s.end('{"ok":true}');
    });
    return;
  }
  const fp=path.join(RAIZ,rel);
  if(!fp.startsWith(RAIZ)||!fs.existsSync(fp)){s.writeHead(404);return s.end('404');}
  s.writeHead(200,{'Content-Type':tipos[path.extname(fp)]||'application/octet-stream','Cache-Control':'no-store'});
  s.end(fs.readFileSync(fp));
});

const fmt=d=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
const atras=min=>new Date(Date.now()-min*60000);
const escreveLog=(...l)=>fs.writeFileSync(LOG,'Data/Hora;Tag\n'+l.map(([d,t])=>`${fmt(d)};${t}`).join('\n')+'\n');
const leHist=()=>JSON.parse(fs.readFileSync(HIST,'utf8'));

let falhas=0;
const ok=(c,m,extra='')=>{console.log((c?'  ok  ':'FALHA ')+m+(c?'':'  << '+extra));if(!c)falhas++;};

(async()=>{
  // duas viagens fechadas do Civic + uma aberta do HR-V
  escreveLog([atras(400),'CIVIC'],[atras(400),'CR-0421'],[atras(310),'CIVIC'],
             [atras(240),'CIVIC'],[atras(240),'CR-0107'],[atras(60),'CIVIC'],
             [atras(90),'HRV'],[atras(90),'CR-0233']);
  if (fs.existsSync(HIST)) fs.unlinkSync(HIST);

  await new Promise(r=>srv.listen(8090,r));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:1440,height:1200}});
  const erros=[]; pg.on('pageerror',e=>erros.push(e.message));
  await pg.goto('http://localhost:8090/',{waitUntil:'load'});
  await pg.waitForTimeout(1200);

  console.log('\n— o arquivo é criado sozinho na pasta dados —');
  ok(fs.existsSync(HIST), 'dados/historico.json existe');
  let h = leHist();
  console.log('   ', JSON.stringify({v:h.total_viagens, a:h.em_andamento, leituras:h.leituras_no_log}));
  ok(h.total_viagens===2, 'duas viagens concluídas', 'veio '+h.total_viagens);
  ok(h.em_andamento===1, 'uma em andamento', 'veio '+h.em_andamento);
  ok(h.viagens.length===3, 'três registros no total', 'veio '+h.viagens.length);

  console.log('\n— cada viagem traz carro, condutor e horários —');
  const fechadas = h.viagens.filter(v=>!v.em_andamento);
  const v0 = fechadas.find(v=>v.condutor==='Thiego Ferreira');
  console.log('   ', JSON.stringify(v0));
  ok(!!v0, 'viagem do Thiego presente');
  ok(v0.veiculo==='13B780FA' && v0.placa==='GDT-9J40', 'carro e placa', JSON.stringify(v0));
  ok(v0.cracha==='CR-0421', 'número do crachá registrado', v0.cracha);
  ok(v0.departamento==='NMG', 'departamento veio do cadastro', v0.departamento);
  ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v0.saida), 'saída em ISO local', v0.saida);
  ok(v0.retorno && v0.duracao_min===90, 'retorno e duração de 90 min', String(v0.duracao_min));
  ok(v0.identificado===true, 'marcada como identificada');

  console.log('\n— a viagem em aberto fica sem retorno —');
  const aberta = h.viagens.find(v=>v.em_andamento);
  ok(aberta.veiculo==='C3FE4090', 'é a do HR-V', aberta.veiculo);
  ok(aberta.retorno===null && aberta.duracao_min===null, 'sem retorno nem duração', JSON.stringify(aberta));
  ok(aberta.condutor==='Nelton M Borges', 'com o condutor certo', aberta.condutor);

  console.log('\n— resumos por carro e por condutor —');
  console.log('   ', JSON.stringify(h.por_veiculo), JSON.stringify(h.por_condutor));
  const civ = h.por_veiculo.find(x=>x.veiculo==='13B780FA');
  ok(civ && civ.viagens===2, 'Civic com 2 viagens', JSON.stringify(civ));
  ok(civ && civ.minutos===270, 'soma dos minutos (90+180)', String(civ&&civ.minutos));
  ok(h.por_condutor.length===2, 'dois condutores com viagem fechada', String(h.por_condutor.length));
  ok(!h.por_condutor.find(x=>x.condutor==='Nelton M Borges'), 'quem está em viagem não entra no resumo fechado');

  console.log('\n— ordem: viagem mais recente primeiro —');
  const datas = h.viagens.map(v=>v.saida);
  ok(datas.join('|')===[...datas].sort().reverse().join('|'), 'ordenado por saída desc', datas.join(' , '));

  console.log('\n— sem mudança no log, não regrava à toa —');
  const antes = gravacoes;
  await pg.evaluate(()=>atualizaFrota()); await pg.waitForTimeout(300);
  await pg.evaluate(()=>atualizaFrota()); await pg.waitForTimeout(300);
  ok(gravacoes===antes, 'nenhuma gravação extra', 'extras='+(gravacoes-antes));

  console.log('\n— nova viagem no log: regrava com o registro novo —');
  fs.appendFileSync(LOG, `${fmt(atras(5))};HRV\n`);          // HR-V devolvido
  await pg.evaluate(()=>atualizaFrota()); await pg.waitForTimeout(400);
  ok(gravacoes===antes+1, 'gravou exatamente uma vez', 'extras='+(gravacoes-antes));
  h = leHist();
  ok(h.total_viagens===3, 'agora três viagens fechadas', String(h.total_viagens));
  ok(h.em_andamento===0, 'nenhuma em aberto', String(h.em_andamento));
  const nel = h.por_condutor.find(x=>x.condutor==='Nelton M Borges');
  ok(nel && nel.viagens===1, 'Nelton entrou no resumo ao devolver', JSON.stringify(nel));

  console.log('\n— o JSON gravado é válido e legível —');
  const bruto = fs.readFileSync(HIST,'utf8');
  ok(bruto.includes('\n  "'), 'indentado (dá para abrir e ler)');
  ok(JSON.parse(bruto) && true, 'JSON válido');
  ok(bruto.includes('Thiego Ferreira'), 'acentuação preservada em UTF-8');

  console.log('\n— servidor recusa a gravação: painel não quebra —');
  falharPost = true;
  fs.appendFileSync(LOG, `${fmt(atras(3))};CIVIC\n`);
  await pg.evaluate(()=>atualizaFrota()); await pg.waitForTimeout(400);
  const est = await pg.evaluate(()=>({erroHist:Historico.erro, carros:calculaFrota(new Date()).lista.map(e=>e.status)}));
  ok(!!est.erroHist, 'registrou o erro de gravação', JSON.stringify(est));
  ok(est.carros.includes('aguardando')||est.carros.includes('uso'), 'o quadro continua funcionando', JSON.stringify(est.carros));
  falharPost = false;

  ok(erros.length===0,'nenhum erro de JS', erros.join(' | '));
  await b.close(); srv.close();
  fs.writeFileSync(LOG, logOrig);
  if (histOrig!==null) fs.writeFileSync(HIST, histOrig); else if (fs.existsSync(HIST)) fs.unlinkSync(HIST);
  console.log('\n'+(falhas?falhas+' FALHA(S)':'TODOS OS TESTES DE HISTÓRICO PASSARAM'));
  process.exit(falhas?1:0);
})();
