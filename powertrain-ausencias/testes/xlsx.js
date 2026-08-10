/* O painel lê a planilha .xlsx dos registros de saída, servida pela rota
   api/saidas — o mesmo caminho que o servir.ps1 usa. */
const http=require('http'), fs=require('fs'), path=require('path'), { chromium }=require('playwright-core');
const RAIZ='/home/user/Calc/powertrain-ausencias';
const AQUI='/tmp/claude-0/-home-user/c4ebad73-ed38-57bd-ad0e-0ec4f3b99b0c/scratchpad';
const XLSX=path.join(AQUI,'registros.xlsx');

let servir='xlsx', ocupado=false, pedidos=0;
const tipos={'.html':'text/html; charset=utf-8','.csv':'text/csv; charset=utf-8','.json':'application/json; charset=utf-8'};
const srv=http.createServer((q,s)=>{
  const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'')||'index.html';
  if (rel==='api/saidas'){                       // == rota do servir.ps1 ==
    pedidos++;
    if (ocupado){ s.writeHead(503); return s.end('ocupado'); }
    if (servir==='nada'){ s.writeHead(404); return s.end('sem arquivo'); }
    const fp = servir==='xlsx' ? XLSX : path.join(RAIZ,'dados/saidas.csv');
    s.writeHead(200,{'Content-Type':'application/octet-stream','Cache-Control':'no-store'});
    return s.end(fs.readFileSync(fp));
  }
  if (rel.startsWith('api/')){ q.resume(); q.on('end',()=>{s.writeHead(200);s.end('{"ok":true}')}); return; }
  const fp=path.join(RAIZ,rel);
  if(!fs.existsSync(fp)){s.writeHead(404);return s.end('404');}
  s.writeHead(200,{'Content-Type':tipos[path.extname(fp)]||'application/octet-stream','Cache-Control':'no-store'});
  s.end(fs.readFileSync(fp));
});

let falhas=0;
const ok=(c,m,e='')=>{console.log((c?'  ok  ':'FALHA ')+m+(c?'':'  << '+e));if(!c)falhas++;};

(async()=>{
  // regenera a planilha: o próprio teste a edita mais adiante
  require('child_process').execSync(`cd ${AQUI} && python3 gerar_xlsx.py registros.xlsx`);
  await new Promise(r=>srv.listen(8083,r));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:1440,height:2000}});
  const erros=[]; pg.on('pageerror',e=>erros.push(e.message));
  await pg.goto('http://localhost:8083/',{waitUntil:'load'});
  await pg.waitForTimeout(1500);

  console.log('\n— a planilha do Excel é lida direto —');
  let st=await pg.evaluate(()=>({erro:Fonte.erro, qtd:estado.registros.length, modo:Fonte.modo}));
  console.log('   ',JSON.stringify(st));
  ok(!st.erro,'sem erro de leitura',String(st.erro));
  ok(st.qtd===6,'6 registros vindos do .xlsx','veio '+st.qtd);

  console.log('\n— datas do Excel viram data de verdade, não número —');
  const regs=await pg.evaluate(()=>estado.registros.map(r=>({n:r.nome,i:r.ini.toISOString(),f:r.fim.toISOString(),d:r.destino,t:r.transporte,m:r.motivoRot})));
  const paiva=regs.find(r=>r.n==='Paiva');
  console.log('   ',JSON.stringify(paiva));
  ok(!!paiva && !isNaN(Date.parse(paiva.i)),'data de início interpretada',JSON.stringify(paiva));
  ok(paiva.i.includes('T08:15') || paiva.i.includes('T11:15'),'hora preservada (08:15)',paiva.i);
  ok(paiva.d==='Suzuka','destino lido da planilha',paiva.d);
  ok(paiva.t==='Avião','acentuação correta',paiva.t);
  ok(paiva.m==='3YZ','motivo lido',paiva.m);

  console.log('\n— célula vazia pulada não desloca as colunas —');
  const tulio=regs.find(r=>r.n==='Tulio');
  console.log('   ',JSON.stringify(tulio));
  ok(tulio && tulio.d==='' && tulio.t==='','destino e transporte vazios, resto no lugar',JSON.stringify(tulio));
  ok(tulio && tulio.m==='Férias','motivo continua certo apesar do buraco',tulio&&tulio.m);

  console.log('\n— texto inline (não compartilhado) também é lido —');
  const lenonn=await pg.evaluate(()=>{const r=estado.registros.find(x=>x.nome==='Lenonn');return r&&r.descricao;});
  ok(lenonn==='Renovação CNH','descrição inline lida',String(lenonn));

  console.log('\n— nome com ; dentro da célula não quebra nada —');
  ok(!!regs.find(r=>r.n==='Tanaka; Nakahara'),'nome com ponto e vírgula preservado',
     JSON.stringify(regs.map(r=>r.n)));

  console.log('\n— o painel renderizou a partir da planilha —');
  const tela=await pg.evaluate(()=>({
    ausentes:document.getElementById('nAusentes').textContent,
    txt:document.getElementById('listaAusentes').innerText.slice(0,120),
    status:document.getElementById('statusTxt').textContent}));
  console.log('   ',JSON.stringify(tela));
  ok(+tela.ausentes>=3,'ausentes em curso calculados',tela.ausentes);
  ok(/Paiva|Tulio|Tanaka/.test(tela.txt),'cards na tela',tela.txt);

  console.log('\n— planilha sem mudança não é reprocessada —');
  const c1=await pg.evaluate(()=>Fonte.carimbo);
  await pg.evaluate(()=>atualizaDaFonte()); await pg.waitForTimeout(500);
  const c2=await pg.evaluate(()=>Fonte.carimbo);
  ok(c1===c2 && !!c1,'carimbo estável entre leituras',String(c1).slice(0,20));

  console.log('\n— planilha editada: o painel percebe —');
  const gerar=require('child_process');
  gerar.execSync(`cd ${AQUI} && python3 - <<'EOF'
import gerar_xlsx, datetime
hoje=datetime.datetime.now().replace(second=0,microsecond=0)
def mais(d,h=8,m=0): return (hoje+datetime.timedelta(days=d)).replace(hour=h,minute=m)
cab=['Descrição da Saída','Motivo','Nome Colaborador','Departamento','Destino','Data de início','Data de término','Transporte']
dados=[['Férias','Férias','Tulio','I/H',None,mais(-3,0,0),mais(6,17,0),None],
       ['Visita nova','Projetos','Erick','I/H','Sorocaba-SP',mais(-1,7,0),mais(1,17,0),'Carro']]
gerar_xlsx.monta('registros.xlsx',dados,cab)
EOF`);
  await pg.evaluate(()=>atualizaDaFonte()); await pg.waitForTimeout(600);
  st=await pg.evaluate(()=>({qtd:estado.registros.length,tem:estado.registros.some(r=>r.nome==='Erick')}));
  ok(st.qtd===2 && st.tem,'releu a planilha editada',JSON.stringify(st));

  console.log('\n— planilha aberta no Excel (503): mantém o que tinha —');
  ocupado=true;
  await pg.evaluate(()=>atualizaDaFonte()); await pg.waitForTimeout(400);
  st=await pg.evaluate(()=>({erro:Fonte.erro,qtd:estado.registros.length}));
  ok(!!st.erro && st.qtd===2,'avisa mas não zera a tela',JSON.stringify(st));
  ocupado=false;
  await pg.evaluate(()=>atualizaDaFonte()); await pg.waitForTimeout(400);
  ok(!(await pg.evaluate(()=>Fonte.erro)),'recupera quando o Excel solta o arquivo');

  console.log('\n— a mesma rota serve CSV sem mudar nada —');
  servir='csv';
  await pg.evaluate(()=>atualizaDaFonte()); await pg.waitForTimeout(600);
  st=await pg.evaluate(()=>({erro:Fonte.erro,qtd:estado.registros.length}));
  ok(!st.erro && st.qtd===21,'CSV lido pela mesma rota, sem extensão no caminho',JSON.stringify(st));

  ok(erros.length===0,'nenhum erro de JS',erros.join(' | '));
  await b.close(); srv.close();
  console.log('\n'+(falhas?falhas+' FALHA(S)':'LEITURA DE .XLSX FUNCIONANDO'));
  process.exit(falhas?1:0);
})();
