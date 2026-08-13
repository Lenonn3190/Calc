/* Teclado virtual: o PC do painel não tem teclado físico, então TUDO aqui é
   feito só com toques na tela. Nenhum pg.keyboard.type() neste arquivo — se
   um passo só funcionar com teclado de verdade, o teste tem que quebrar. */
const http=require('http'), fs=require('fs'), path=require('path'), { chromium }=require('playwright-core');
const RAIZ='/home/user/Calc/powertrain-ausencias';
const PESSOAS=path.join(RAIZ,'dados/pessoas.csv'), LOG=path.join(RAIZ,'dados/frota.csv');
const pesOrig=fs.readFileSync(PESSOAS,'utf8'), logOrig=fs.readFileSync(LOG,'utf8');
process.on('exit',()=>{ try{ fs.writeFileSync(PESSOAS,pesOrig); fs.writeFileSync(LOG,logOrig); }catch(e){} });
['uncaughtException','unhandledRejection'].forEach(ev=>process.on(ev,e=>{console.error(e);process.exit(1);}));

const tipos={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.csv':'text/csv; charset=utf-8','.json':'application/json; charset=utf-8'};
let gravado=null;
const srv=http.createServer((q,s)=>{
  const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'')||'index.html';
  if (rel==='api/pessoas'){ const c=[]; q.on('data',d=>c.push(d));
    q.on('end',()=>{ gravado=Buffer.concat(c).toString('utf8'); fs.writeFileSync(PESSOAS,gravado);
      s.writeHead(200); s.end('{"ok":true}'); }); return; }
  if (rel==='api/saidas'){ s.writeHead(200); return s.end(fs.readFileSync(path.join(RAIZ,'dados/saidas.csv'))); }
  if (rel==='api/leitura'){                    // grava de verdade, como o servir.ps1
    const c=[]; q.on('data',d=>c.push(d));
    q.on('end',()=>{ const tag=Buffer.concat(c).toString('utf8').trim();
      const d=new Date(), p2=n=>String(n).padStart(2,'0');
      fs.appendFileSync(LOG,`${p2(d.getDate())}/${p2(d.getMonth()+1)}/${d.getFullYear()} `+
        `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())};${tag}\r\n`);
      s.writeHead(200); s.end('{"ok":true}'); });
    return;
  }
  if (rel.startsWith('api/')){ q.resume(); q.on('end',()=>{s.writeHead(200);s.end('{"ok":true}')}); return; }
  const fp=path.join(RAIZ,rel);
  if(!fs.existsSync(fp)){s.writeHead(404);return s.end('404');}
  s.writeHead(200,{'Content-Type':tipos[path.extname(fp)]||'application/octet-stream','Cache-Control':'no-store'});
  s.end(fs.readFileSync(fp));
});

let falhas=0;
const ok=(c,m,e='')=>{console.log((c?'  ok  ':'FALHA ')+m+(c?'':'  << '+e));if(!c)falhas++;};

/** Toca numa tecla pelo que está escrito nela. Só toque — nada de teclado. */
async function toca(pg, rotulo){
  const b=pg.locator('#tecladoVirtual button.k', { hasText:new RegExp('^'+rotulo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$') }).first();
  await b.click();
  await pg.waitForTimeout(45);
}
/** Toca a tecla de um caractere. Procura pelo valor da tecla, não pelo que
    está escrito nela: o rótulo muda de caixa conforme o ⇧. */
async function tecla(pg, ch){
  if (ch === ' ') return toca(pg,'espaço');
  await pg.click(`#tecladoVirtual button.k[data-valor="${ch.toLowerCase()}"]`);
  await pg.waitForTimeout(45);
}
/** Digita SEM mexer no ⇧ — quem decide a caixa é o teclado. É assim que a
    pessoa vai usar: ela só toca as letras. */
async function digitaSolto(pg, txt){ for (const ch of txt) await tecla(pg, ch); }
/** Digita controlando o ⇧, para sair exatamente o texto pedido. */
async function digita(pg, txt){
  for (const ch of txt){
    if (ch === ' '){ await toca(pg,'espaço'); continue; }
    const querMaiusc = ch !== ch.toLowerCase();
    const estaMaiusc = await pg.evaluate(()=>document.querySelector('#tecladoVirtual [data-acao="shift"]')
      .classList.contains('shift-on'));
    if (querMaiusc !== estaMaiusc) await toca(pg,'⇧');
    await tecla(pg, ch);
  }
}
const val = (pg,sel)=>pg.inputValue(sel);
const visivel = pg=>pg.evaluate(()=>{const t=document.getElementById('tecladoVirtual');
  return !!t && t.classList.contains('on') && t.offsetHeight>0;});

(async()=>{
  fs.writeFileSync(PESSOAS,'ID;Nome;Departamento;Telefone\r\nCR-0421;Thiego Ferreira;NMG;(19) 99123-4567\r\n');
  fs.writeFileSync(LOG,'Data/Hora;Tag\r\n');
  await new Promise(r=>srv.listen(8085,r));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:1500,height:1000}, hasTouch:true});
  const erros=[]; pg.on('pageerror',e=>erros.push(e.message));
  await pg.goto('http://localhost:8085/cadastro.html',{waitUntil:'load'});
  await pg.waitForTimeout(400);

  console.log('\n— o teclado só aparece quando se toca num campo —');
  ok(!(await visivel(pg)),'não fica no caminho antes de precisar');
  await pg.click('#busca'); await pg.waitForTimeout(250);
  ok(await visivel(pg),'tocou no campo, o teclado subiu');
  ok(await pg.evaluate(()=>document.activeElement.id)==='busca',
     'o campo continua com o foco (senão o leitor RFID não teria onde digitar)',
     await pg.evaluate(()=>document.activeElement.id));
  ok(/nome/i.test(await pg.innerText('#teclRot')),'o teclado diz qual campo está preenchendo',
     await pg.innerText('#teclRot'));

  console.log('\n— teclas grandes o bastante para o dedo —');
  const tam=await pg.evaluate(()=>{
    const ks=[...document.querySelectorAll('#tecladoVirtual button.k')].map(k=>k.getBoundingClientRect());
    return {n:ks.length, minL:Math.round(Math.min(...ks.map(r=>r.width))),
            minA:Math.round(Math.min(...ks.map(r=>r.height)))};
  });
  console.log('   ',JSON.stringify(tam));
  ok(tam.minA>=44,'altura mínima de alvo de toque','altura '+tam.minA);
  ok(tam.minL>=44,'largura mínima de alvo de toque','largura '+tam.minL);

  console.log('\n— digitando o nome só com toques —');
  await digitaSolto(pg,'thi');
  ok(await val(pg,'#busca')==='Thi','maiúscula automática na primeira letra, sem ninguém pedir',
     await val(pg,'#busca'));
  ok((await pg.evaluate(()=>[...document.querySelectorAll('.pessoa .nm')].map(e=>e.textContent))).length===1,
     'a lista foi filtrando enquanto o dedo digitava');
  ok(await pg.innerText('#teclEco')==='Thi','o teclado mostra o que já foi digitado',await pg.innerText('#teclEco'));
  await toca(pg,'⌫');
  ok(await val(pg,'#busca')==='Th','apagar tira uma letra',await val(pg,'#busca'));
  await toca(pg,'limpar');
  ok(await val(pg,'#busca')==='','limpar esvazia o campo',await val(pg,'#busca'));

  console.log('\n— letras com acento e ç, que nome brasileiro precisa —');
  await digitaSolto(pg,'ção');
  ok(await val(pg,'#busca')==='Ção','ç e acentos disponíveis, com maiúscula',await val(pg,'#busca'));
  await toca(pg,'limpar');

  console.log('\n— OK vale como Enter: escolhe a pessoa da lista —');
  await digitaSolto(pg,'thiego');
  ok(await val(pg,'#busca')==='Thiego','nome inteiro digitado no toque',await val(pg,'#busca'));
  await toca(pg,'OK');
  await pg.waitForTimeout(350);
  ok(await pg.innerText('#edNome')==='Thiego Ferreira','OK abriu a pessoa, como o Enter faria',
     await pg.innerText('#edNome'));

  console.log('\n— o campo do crachá é mascarado, e o teclado não denuncia o número —');
  await pg.click('#edId'); await pg.waitForTimeout(250);
  ok(await visivel(pg),'teclado aberto no campo do crachá');
  await toca(pg,'limpar');
  await digita(pg,'CR'); await toca(pg,'-'); await digitaSolto(pg,'0421');
  ok(await val(pg,'#edId')==='CR-0421','o código foi digitado inteiro',await val(pg,'#edId'));
  const eco=await pg.innerText('#teclEco');
  console.log('   eco:',JSON.stringify(eco));
  ok(/^•+$/.test(eco),'o espelho do teclado mostra pontinhos, não o código',eco);
  ok(!(await pg.evaluate(()=>document.body.innerText.includes('CR-0421'))),
     'o número não aparece em canto nenhum da tela');

  console.log('\n— OK leva o teclado junto para o campo seguinte —');
  await toca(pg,'OK');
  await pg.waitForTimeout(250);
  ok(await pg.evaluate(()=>document.activeElement.id)==='edFone','foco foi para o telefone',
     await pg.evaluate(()=>document.activeElement.id));
  ok(await visivel(pg),'e o teclado continua aberto, sem precisar tocar de novo');
  ok(/telefone/i.test(await pg.innerText('#teclRot')),'já rotulado como telefone',await pg.innerText('#teclRot'));

  console.log('\n— telefone abre o teclado numérico —');
  const num=await pg.evaluate(()=>{
    const t=document.getElementById('tecladoVirtual');
    const ks=[...t.querySelectorAll('button.k')].map(k=>k.textContent);
    return {num:t.classList.contains('num'), letras:ks.filter(k=>/^[a-z]$/.test(k)).length, teclas:ks};
  });
  console.log('   ',JSON.stringify(num.teclas));
  ok(num.num,'layout numérico');
  ok(num.letras===0,'sem letras para atrapalhar','letras: '+num.letras);
  // já saiu torto aqui: sem largura própria o bloco encolhia e a fileira de
  // baixo escapava para fora dele
  const cabe=await pg.evaluate(()=>{
    const t=document.getElementById('tecladoVirtual').getBoundingClientRect();
    const fora=[...document.querySelectorAll('#tecladoVirtual button.k')]
      .filter(k=>{const r=k.getBoundingClientRect(); return r.left<t.left-1 || r.right>t.right+1;})
      .map(k=>k.textContent);
    const l=document.querySelector('#tecladoVirtual .limpa');
    return {larg:Math.round(t.width), fora, limpaCoube:l.scrollWidth<=l.clientWidth+1};
  });
  console.log('   ',JSON.stringify(cabe));
  ok(cabe.larg>=300,'o bloco tem largura de verdade','largura '+cabe.larg);
  ok(cabe.fora.length===0,'nenhuma tecla escapa do bloco',JSON.stringify(cabe.fora));
  ok(cabe.limpaCoube,'o rótulo "limpar" cabe no botão');
  await toca(pg,'limpar');
  for (const d of '19991234567') await tecla(pg,d);
  ok(await val(pg,'#edFone')==='19991234567','número digitado no teclado numérico',await val(pg,'#edFone'));

  console.log('\n— e o OK do telefone salva a pessoa —');
  await toca(pg,'OK');
  await pg.waitForTimeout(400);
  ok(!(await pg.evaluate(()=>document.getElementById('editor').classList.contains('on'))),'a pessoa foi salva');
  ok(await visivel(pg),'o teclado continua no ar, já no campo do próximo nome');
  ok(await pg.evaluate(()=>TecladoVirtual.campo().id)==='busca','apontando para a busca',
     await pg.evaluate(()=>TecladoVirtual.campo().id));
  ok(await pg.evaluate(()=>document.querySelectorAll('#tecladoVirtual').length===1),
     'existe um único teclado na página, nunca dois empilhados',
     String(await pg.evaluate(()=>document.querySelectorAll('#tecladoVirtual').length)));
  const linha=await pg.evaluate(()=>{const b=[...document.querySelectorAll('.pessoa')]
    .find(x=>x.querySelector('.nm').textContent==='Thiego Ferreira'); return b.innerText.replace(/\n/g,' | ');});
  ok(/\(19\) 99123-4567/.test(linha),'telefone formatado na lista',linha);

  console.log('\n— o teclado nunca cobre o campo que está sendo preenchido —');
  await pg.click('#busca'); await pg.waitForTimeout(400);
  const tapa=await pg.evaluate(()=>{
    const t=document.getElementById('tecladoVirtual').getBoundingClientRect();
    const c=document.getElementById('busca').getBoundingClientRect();
    return {campoBase:Math.round(c.bottom), tecladoTopo:Math.round(t.top),
            alturaTela:window.innerHeight, sobra:Math.round(t.top-c.bottom)};
  });
  console.log('   ',JSON.stringify(tapa));
  ok(tapa.campoBase <= tapa.tecladoTopo,'o campo fica acima do teclado',JSON.stringify(tapa));
  ok(await pg.evaluate(()=>{
    const c=document.getElementById('busca').getBoundingClientRect();
    return c.top>=0 && c.bottom<=window.innerHeight;}),'e continua dentro da tela');

  console.log('\n— tocar fora e o ✕ fecham o teclado —');
  await pg.click('.cartao h2'); await pg.waitForTimeout(250);
  ok(!(await visivel(pg)),'tocar fora fecha');
  await pg.click('#busca'); await pg.waitForTimeout(250);
  await pg.click('#tecladoVirtual .fechar'); await pg.waitForTimeout(250);
  ok(!(await visivel(pg)),'o ✕ fecha');
  ok(await pg.evaluate(()=>document.body.style.paddingBottom==='0px'||!document.body.style.paddingBottom),
     'a página volta ao tamanho normal ao fechar',
     await pg.evaluate(()=>document.body.style.paddingBottom));

  console.log('\n— cadastro inteiro de uma pessoa nova, sem tocar em teclado físico —');
  await pg.click('#busca'); await pg.waitForTimeout(250);
  await toca(pg,'limpar');
  await digita(pg,'Ana Célia Rocha');
  ok(await val(pg,'#busca')==='Ana Célia Rocha','nome com espaço e acento, tudo no dedo',await val(pg,'#busca'));
  ok((await pg.evaluate(()=>[...document.querySelectorAll('.pessoa .nm')].map(e=>e.textContent))).length===0,
     'ninguém com esse nome ainda');
  await pg.click('#btnNovo'); await pg.waitForTimeout(300);
  ok(await pg.innerText('#edNome')==='Ana Célia Rocha','pessoa nova criada pelo botão',await pg.innerText('#edNome'));
  await pg.click('#edId'); await pg.waitForTimeout(250);
  await digita(pg,'CR'); await toca(pg,'-'); await digitaSolto(pg,'0777');
  await toca(pg,'OK'); await pg.waitForTimeout(250);            // vai para o telefone
  await toca(pg,'OK'); await pg.waitForTimeout(400);            // telefone em branco: salva
  ok((await pg.evaluate(()=>[...document.querySelectorAll('.pessoa .nm')].map(e=>e.textContent)))
     .includes('Ana Célia Rocha'),'a pessoa nova está na lista');
  await pg.click('#btnSalvar'); await pg.waitForTimeout(500);
  ok(!!gravado && /Ana Célia Rocha/.test(gravado),'e foi gravada no arquivo',String(gravado).slice(0,140));
  ok(/CR-0777/.test(gravado),'com o crachá que foi digitado no toque');

  console.log('\n— no painel, o teclado atende os campos do ⚙ —');
  const painel=await b.newPage({viewport:{width:1440,height:2560}, hasTouch:true});
  const errosP=[]; painel.on('pageerror',e=>errosP.push(e.message));
  await painel.goto('http://localhost:8085/',{waitUntil:'load'});
  await painel.waitForTimeout(1200);
  ok(!(await visivel(painel)),'nada de teclado na tela normal do painel');
  await painel.click('#btnCfg'); await painel.waitForTimeout(400);
  await painel.click('#inpEfetivo'); await painel.waitForTimeout(300);
  ok(await visivel(painel),'abriu no campo do efetivo');
  ok(await painel.evaluate(()=>{
      const t=document.getElementById('tecladoVirtual'), m=document.getElementById('cfgModal');
      return getComputedStyle(t).zIndex*1 > (getComputedStyle(m).zIndex*1||0);
    }),'e fica por cima da janela de configuração');
  // numa tela de 2560 px de altura, teclado no pé seria um exagero de distância
  const perto=await painel.evaluate(()=>{
    const t=document.getElementById('tecladoVirtual').getBoundingClientRect();
    const c=document.getElementById('inpEfetivo').getBoundingClientRect();
    return {campo:Math.round(c.bottom), teclado:Math.round(t.top),
            dist:Math.round(t.top-c.bottom), tela:window.innerHeight};
  });
  console.log('   ',JSON.stringify(perto));
  ok(perto.dist>=0 && perto.dist<=60,'o teclado numérico encosta logo abaixo do campo',
     JSON.stringify(perto));
  await toca(painel,'limpar');
  for (const d of '32') await tecla(painel,d);
  ok(await val(painel,'#inpEfetivo')==='32','número digitado no toque',await val(painel,'#inpEfetivo'));

  console.log('\n— usar o teclado da tela não vira leitura de tag —');
  const antesLog=fs.readFileSync(LOG,'utf8');
  await toca(painel,'OK'); await painel.waitForTimeout(400);
  ok(fs.readFileSync(LOG,'utf8')===antesLog,'nenhuma linha foi parar no log do leitor');
  ok(errosP.length===0,'nenhum erro de JS no painel',errosP.join(' | '));

  console.log('\n— fechada a configuração, o leitor RFID volta a ser ouvido —');
  await painel.click('#btnFechar');
  await painel.waitForTimeout(400);
  ok(!(await visivel(painel)),'o teclado se recolhe junto com a janela');
  const foco=await painel.evaluate(()=>document.activeElement.tagName);
  ok(foco!=='INPUT' && foco!=='TEXTAREA',
     'o cursor não fica preso num campo (senão a tag seria digitada lá dentro)',foco);
  await painel.keyboard.type('C3FE4090');            // é o LEITOR, não uma pessoa
  await painel.keyboard.press('Enter');
  await painel.waitForTimeout(600);
  ok(/C3FE4090/.test(fs.readFileSync(LOG,'utf8')),'a tag lida entrou no log',
     fs.readFileSync(LOG,'utf8').replace(/\r?\n/g,' | '));

  console.log('\n— aberto pelo arquivo, sem servidor, o teclado ainda carrega —');
  const solto=await b.newPage({viewport:{width:1500,height:1000}, hasTouch:true});
  await solto.goto('file://'+path.join(RAIZ,'cadastro.html'),{waitUntil:'load'});
  await solto.waitForTimeout(400);
  await solto.click('#busca'); await solto.waitForTimeout(300);
  ok(await visivel(solto),'teclado disponível também em file://');
  await solto.close();

  ok(erros.length===0,'nenhum erro de JS',erros.join(' | '));
  await pg.click('#busca'); await pg.waitForTimeout(300);
  await pg.evaluate(()=>{document.getElementById('busca').value='Ana Cé';
    document.getElementById('busca').dispatchEvent(new Event('input',{bubbles:true}));
    TecladoVirtual.abre(document.getElementById('busca'));});
  await pg.waitForTimeout(300);
  await pg.screenshot({path:'/tmp/claude-0/-home-user/c4ebad73-ed38-57bd-ad0e-0ec4f3b99b0c/scratchpad/teclado.png'});
  await painel.click('#btnCfg').catch(()=>{});
  await painel.waitForTimeout(300);
  await painel.click('#inpEfetivo').catch(()=>{});
  await painel.waitForTimeout(300);

  await b.close(); srv.close();
  fs.writeFileSync(PESSOAS,pesOrig); fs.writeFileSync(LOG,logOrig);
  console.log('\n'+(falhas?falhas+' FALHA(S)':'TECLADO VIRTUAL FUNCIONANDO — SEM TECLADO FÍSICO'));
  process.exit(falhas?1:0);
})();
