/* QR do condutor no card do carro: gera no painel, decodifica com jsQR
   (decodificador de verdade) e confere que abre a conversa certa. */
const http=require('http'), fs=require('fs'), path=require('path'), { chromium }=require('playwright-core');
const jsQR=require('jsqr');
const RAIZ='/home/user/Calc/powertrain-ausencias';
const LOG=path.join(RAIZ,'dados/frota.csv'), PESSOAS=path.join(RAIZ,'dados/pessoas.csv');
const logOrig=fs.readFileSync(LOG,'utf8'), pesOrig=fs.readFileSync(PESSOAS,'utf8');

const tipos={'.html':'text/html; charset=utf-8','.csv':'text/csv; charset=utf-8','.json':'application/json; charset=utf-8'};
const srv=http.createServer((q,s)=>{
  const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'')||'index.html';
  if (rel==='api/saidas'){
    s.writeHead(200,{'Content-Type':'application/octet-stream','Cache-Control':'no-store'});
    return s.end(fs.readFileSync(path.join(RAIZ,'dados/saidas.csv')));
  }
  if (rel.startsWith('api/')){ q.resume(); q.on('end',()=>{s.writeHead(200);s.end('{"ok":true}')}); return; }
  const fp=path.join(RAIZ,rel);
  if(!fs.existsSync(fp)){s.writeHead(404);return s.end('404');}
  s.writeHead(200,{'Content-Type':tipos[path.extname(fp)]||'application/octet-stream','Cache-Control':'no-store'});
  s.end(fs.readFileSync(fp));
});

const p2=n=>String(n).padStart(2,'0');
const fmt=d=>`${p2(d.getDate())}/${p2(d.getMonth()+1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
const atras=min=>new Date(Date.now()-min*60000);

let falhas=0;
const ok=(c,m,e='')=>{console.log((c?'  ok  ':'FALHA ')+m+(c?'':'  << '+e));if(!c)falhas++;};

/** Lê o QR que está na tela, do jeito que uma câmera leria. */
async function leQRdaTela(pg, seletor){
  const el=await pg.$(seletor); if(!el) return null;
  const buf=await el.screenshot();                     // PNG do bloco do QR
  const { width, height, data } = await pg.evaluate(async b64=>{
    const img=new Image();
    await new Promise(r=>{img.onload=r;img.src='data:image/png;base64,'+b64;});
    const cv=document.createElement('canvas'); cv.width=img.width; cv.height=img.height;
    const cx=cv.getContext('2d'); cx.drawImage(img,0,0);
    const d=cx.getImageData(0,0,cv.width,cv.height);
    return { width:d.width, height:d.height, data:Array.from(d.data) };
  }, buf.toString('base64'));
  const r=jsQR(new Uint8ClampedArray(data), width, height);
  return r && r.data;
}

(async()=>{
  // Civic em uso com o Thiego, que tem telefone no cadastro
  fs.writeFileSync(LOG,'Data/Hora;Tag\r\n'+
    `${fmt(atras(120))};13B780FA\r\n${fmt(atras(120))};CR-0421\r\n`);
  await new Promise(r=>srv.listen(8079,r));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:1440,height:2560},deviceScaleFactor:2});
  const erros=[]; pg.on('pageerror',e=>erros.push(e.message));
  await pg.goto('http://localhost:8079/',{waitUntil:'load'});
  await pg.waitForTimeout(1400);

  console.log('\n— ordem dos blocos: próximas saídas logo abaixo de ausentes —');
  const ordem=await pg.evaluate(()=>[...document.querySelectorAll('[data-bloco]')].map(s=>s.dataset.bloco));
  console.log('   ',ordem.join(' → '));
  ok(ordem[ordem.indexOf('ausentes')+1]==='proximas','próximas vem logo depois de ausentes',ordem.join(' → '));
  ok(ordem.indexOf('ocupacao')>ordem.indexOf('proximas'),'ocupação foi para depois');

  console.log('\n— o card do carro em uso mostra o QR —');
  const temQR=await pg.evaluate(()=>!!document.querySelector('.veic.uso .qr .cod svg'));
  ok(temQR,'QR desenhado no card');
  const rot=await pg.evaluate(()=>{const e=document.querySelector('.veic.uso .qr .rot');return e&&e.innerText.trim();});
  const num=await pg.evaluate(()=>{const e=document.querySelector('.veic.uso .qr .num');return e&&e.innerText.trim();});
  console.log('   ',JSON.stringify({rot,num}));
  ok(/Falar com o condutor/.test(rot||''),'legenda presente',String(rot));
  ok(num==='(19) 99123-4567','telefone formatado na tela',String(num));

  console.log('\n— um leitor de celular consegue ler o QR da tela —');
  const lido=await leQRdaTela(pg,'.veic.uso .qr .cod');
  console.log('   ',String(lido));
  ok(!!lido,'QR decodificado a partir da tela',String(lido));
  ok(String(lido).startsWith('https://wa.me/5519991234567'),'aponta para o WhatsApp do condutor',String(lido));
  ok(/[?&]text=/.test(String(lido)),'abre já na tela de mensagem, com texto pronto',String(lido));
  ok(decodeURIComponent(String(lido).split('text=')[1]||'').includes('Thiego'),
     'mensagem cita o condutor',decodeURIComponent(String(lido).split('text=')[1]||''));
  ok(decodeURIComponent(String(lido).split('text=')[1]||'').includes('Civic'),'e o carro');

  console.log('\n— carro disponível não mostra QR —');
  ok(await pg.evaluate(()=>!document.querySelector('.veic.livre .qr')),'sem QR no card livre');

  console.log('\n— condutor sem telefone: avisa em vez de QR quebrado —');
  fs.writeFileSync(PESSOAS,'ID;Nome;Departamento;Telefone\nCR-0421;Thiego Ferreira;NMG;\n');
  await pg.evaluate(()=>{FonteFrota.carimboPessoas=null;});
  await pg.evaluate(()=>atualizaFrota()); await pg.waitForTimeout(600);
  const semFone=await pg.evaluate(()=>{const e=document.querySelector('.veic.uso .qr.vazio');return e&&e.innerText.trim();});
  console.log('   ',JSON.stringify(semFone));
  ok(/sem telefone/.test(semFone||''),'card avisa a falta do telefone',String(semFone));
  ok(await pg.evaluate(()=>!document.querySelector('.veic.uso .qr .cod')),'nenhum QR desenhado');
  fs.writeFileSync(PESSOAS,pesOrig);

  console.log('\n— telefone em formatos variados —');
  const formatos=await pg.evaluate(()=>['19991234567','(19) 99123-4567','+55 19 99123-4567',
    '55 19 99123 4567','0019991234567'].map(f=>foneWhats(f)));
  console.log('   ',JSON.stringify(formatos));
  ok(formatos.every(f=>f==='5519991234567'),'todos viram 5519991234567',JSON.stringify(formatos));
  ok(await pg.evaluate(()=>foneWhats('123')===''),'número curto demais é descartado');
  ok(await pg.evaluate(()=>foneWhats('')===''),'vazio não vira telefone');

  ok(erros.length===0,'nenhum erro de JS',erros.join(' | '));
  await pg.evaluate(()=>{FonteFrota.carimboPessoas=null;});
  await pg.evaluate(()=>atualizaFrota()); await pg.waitForTimeout(500);
  const sec=await pg.$('[data-bloco="frota"]');
  if (sec) await sec.screenshot({path:'/tmp/claude-0/-home-user/c4ebad73-ed38-57bd-ad0e-0ec4f3b99b0c/scratchpad/qr-card.png'});

  await b.close(); srv.close();
  fs.writeFileSync(LOG,logOrig); fs.writeFileSync(PESSOAS,pesOrig);
  console.log('\n'+(falhas?falhas+' FALHA(S)':'QR DO CONDUTOR FUNCIONANDO'));
  process.exit(falhas?1:0);
})();
