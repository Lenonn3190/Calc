/* Tela de cadastro de crachás: carrega a lista de nomes, filtra digitando,
   lê o crachá pelo leitor (que é um teclado) e grava em dados/pessoas.csv. */
const http=require('http'), fs=require('fs'), path=require('path'), os=require('os');
const { execFileSync }=require('child_process');
const { chromium }=require('playwright-core');
const RAIZ='/home/user/Calc/powertrain-ausencias';
const PESSOAS=path.join(RAIZ,'dados/pessoas.csv'), LOG=path.join(RAIZ,'dados/frota.csv');
const pesOrig=fs.readFileSync(PESSOAS,'utf8'), logOrig=fs.readFileSync(LOG,'utf8');
// devolve os arquivos do repositório mesmo se o teste morrer no meio:
// um teste interrompido já deixou o dados/ estragado para os outros
process.on('exit',()=>{ try{ fs.writeFileSync(PESSOAS,pesOrig); fs.writeFileSync(LOG,logOrig); }catch(e){} });
['uncaughtException','unhandledRejection'].forEach(ev=>process.on(ev,e=>{console.error(e);process.exit(1);}));
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'cad-'));

const tipos={'.html':'text/html; charset=utf-8','.csv':'text/csv; charset=utf-8','.json':'application/json; charset=utf-8'};
let gravado=null;                                   // último corpo que chegou em /api/pessoas
const srv=http.createServer((q,s)=>{
  const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\//,'')||'index.html';
  if (rel==='api/pessoas'){
    const c=[]; q.on('data',d=>c.push(d));
    q.on('end',()=>{ gravado=Buffer.concat(c).toString('utf8');
      // o servidor de verdade grava o arquivo: aqui também, senão o
      // recarregar da página não provaria nada
      fs.writeFileSync(PESSOAS,gravado);
      s.writeHead(200); s.end('{"ok":true}'); });
    return;
  }
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

let falhas=0;
const ok=(c,m,e='')=>{console.log((c?'  ok  ':'FALHA ')+m+(c?'':'  << '+e));if(!c)falhas++;};

/** Gera um .xlsx de verdade com uma lista de nomes (mesma máquina do gerar_xlsx). */
function planilhaDeNomes(destino){
  const py=`
import sys; sys.path.insert(0,${JSON.stringify(path.join(RAIZ,'testes'))})
from gerar_xlsx import monta
cab=['Nome Colaborador','Departamento']
dados=[['Thiego Ferreira','NMG'],['Agenor Rodrigo','I/H'],['Jefferson Vilela','OUTSOURCE'],
       ['William Nakahara','I/H'],['Douglas Marciano','OUTSOURCE'],['Marco Antônio','OUTSOURCE'],
       ['Nelton M Borges','I/H'],['Érick Paiva','I/H']]
monta(${JSON.stringify(destino)}, dados, cab)
`;
  execFileSync('python3',['-c',py]);
  return destino;
}

/** Digita como o leitor RFID digita: caracteres seguidos e um Enter no fim. */
async function passaCracha(pg, codigo){
  await pg.keyboard.type(codigo,{delay:12});
  await pg.keyboard.press('Enter');
}
const p2=n=>String(n).padStart(2,'0');
const fmt=d=>`${p2(d.getDate())}/${p2(d.getMonth()+1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
const atras=min=>new Date(Date.now()-min*60000);
const linhasCSV = t => t.replace(/^﻿/,'').trim().split(/\r?\n/);
const campo = (t,nome) => {                       // valor de uma coluna, por pessoa
  const l=linhasCSV(t), cab=l[0].split(';');
  const iN=cab.indexOf('Nome'), iC=cab.indexOf(nome);
  const m={}; l.slice(1).forEach(x=>{const c=x.split(';'); m[c[iN]]=c[iC];});
  return m;
};

(async()=>{
  // começa do zero: ninguém cadastrado ainda, como no dia da implantação
  fs.writeFileSync(PESSOAS,'ID;Nome;Departamento;Telefone\r\n');
  const xlsx=planilhaDeNomes(path.join(TMP,'equipe.xlsx'));
  await new Promise(r=>srv.listen(8083,r));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:1500,height:1000}});
  const erros=[]; pg.on('pageerror',e=>erros.push(e.message));
  pg.on('dialog',d=>d.accept());
  await pg.goto('http://localhost:8083/cadastro.html',{waitUntil:'load'});
  await pg.waitForTimeout(400);

  const nomesNaTela=()=>pg.evaluate(()=>[...document.querySelectorAll('.pessoa .nm')].map(e=>e.textContent));
  const placar=()=>pg.evaluate(()=>document.getElementById('placar').innerText.replace(/\n/g,' | '));

  console.log('\n— começa vazia e pede a lista —');
  ok((await nomesNaTela()).length===0,'nenhuma pessoa ainda');
  ok(/carregue uma lista/i.test(await pg.innerText('#lista')),'a tela diz o que fazer',await pg.innerText('#lista'));

  console.log('\n— carrega a lista de nomes de um .xlsx —');
  await pg.setInputFiles('#arq',xlsx);
  await pg.waitForTimeout(600);
  let nomes=await nomesNaTela();
  console.log('   ',JSON.stringify(nomes));
  ok(nomes.length===8,'oito nomes na lista','vieram '+nomes.length);
  ok(nomes.includes('Thiego Ferreira'),'nome da planilha apareceu',nomes.join(', '));
  ok(nomes[0]==='Agenor Rodrigo','lista em ordem alfabética',nomes[0]);
  ok(/8 sem crachá/.test(await placar()),'placar conta quem falta',await placar());
  ok(await pg.evaluate(()=>document.querySelectorAll('.pessoa .id.sem').length===8),'todos marcados como sem crachá');

  console.log('\n— digitar no campo vai filtrando —');
  await pg.fill('#busca','jef'); await pg.waitForTimeout(200);
  nomes=await nomesNaTela();
  ok(nomes.length===1 && nomes[0]==='Jefferson Vilela','filtra pelo pedaço do nome',JSON.stringify(nomes));
  ok(/1 de 8/i.test(await pg.innerText('#contaLista')),'contador acompanha o filtro',await pg.innerText('#contaLista'));
  await pg.fill('#busca','marco anto'); await pg.waitForTimeout(200);
  ok((await nomesNaTela())[0]==='Marco Antônio','acha sem acento também',JSON.stringify(await nomesNaTela()));
  await pg.fill('#busca','ERICK'); await pg.waitForTimeout(200);
  ok((await nomesNaTela())[0]==='Érick Paiva','não liga para maiúsculas nem acento no nome');
  await pg.fill('#busca','zzz'); await pg.waitForTimeout(200);
  ok((await nomesNaTela()).length===0 && /Nenhum nome/.test(await pg.innerText('#lista')),'texto sem resultado');

  console.log('\n— escolher o nome abre o campo do crachá, já com o cursor lá —');
  await pg.fill('#busca','thiego'); await pg.waitForTimeout(200);
  await pg.click('.pessoa'); await pg.waitForTimeout(250);
  ok(await pg.evaluate(()=>document.getElementById('editor').classList.contains('on')),'editor aberto');
  ok(await pg.innerText('#edNome')==='Thiego Ferreira','mostra de quem é',await pg.innerText('#edNome'));
  ok(await pg.evaluate(()=>document.activeElement.id)==='edId','cursor já no campo do crachá',
     await pg.evaluate(()=>document.activeElement.id));
  ok(await pg.evaluate(()=>document.getElementById('edId').classList.contains('esperando')),'campo piscando, esperando a leitura');

  console.log('\n— o leitor passa o crachá e o telefone é opcional —');
  await passaCracha(pg,'CR-0421');                      // Enter leva ao telefone
  await pg.waitForTimeout(200);
  ok(await pg.evaluate(()=>document.activeElement.id)==='edFone','depois do crachá o cursor vai para o telefone',
     await pg.evaluate(()=>document.activeElement.id));
  await pg.keyboard.type('19991234567');
  await pg.keyboard.press('Enter');                     // Enter no telefone salva
  await pg.waitForTimeout(300);
  ok(!(await pg.evaluate(()=>document.getElementById('editor').classList.contains('on'))),'editor fechou depois de salvar');
  let linha=await pg.evaluate(()=>{const b=[...document.querySelectorAll('.pessoa')]
    .find(x=>x.querySelector('.nm').textContent==='Thiego Ferreira'); return b&&b.innerText.replace(/\n/g,' | ');});
  console.log('   ',JSON.stringify(linha));
  ok(/CR-0421/.test(linha||''),'o ID aparece ao lado do nome',String(linha));
  ok(/\(19\) 99123-4567/.test(linha||''),'telefone formatado ao lado',String(linha));
  ok(await pg.evaluate(()=>document.getElementById('busca').value==='')," a busca limpa sozinha para o próximo nome");

  console.log('\n— segunda pessoa, só pelo teclado, sem telefone —');
  await pg.click('#busca');
  await pg.keyboard.type('nelton'); await pg.waitForTimeout(200);
  await pg.keyboard.press('Enter');                     // Enter na busca escolhe o primeiro
  await pg.waitForTimeout(250);
  ok(await pg.innerText('#edNome')==='Nelton M Borges','Enter na busca escolheu o primeiro da lista',await pg.innerText('#edNome'));
  await passaCracha(pg,'CR-0555');
  await pg.keyboard.press('Enter');                     // telefone em branco: salva assim mesmo
  await pg.waitForTimeout(300);
  ok(!(await pg.evaluate(()=>document.getElementById('editor').classList.contains('on'))),'salvou sem telefone');
  linha=await pg.evaluate(()=>{const b=[...document.querySelectorAll('.pessoa')]
    .find(x=>x.querySelector('.nm').textContent==='Nelton M Borges'); return b&&b.innerText.replace(/\n/g,' | ');});
  ok(/CR-0555/.test(linha||''),'crachá guardado sem telefone',String(linha));
  ok(/6 sem crachá/.test(await placar()),'placar desceu para 6',await placar());

  console.log('\n— o mesmo crachá em duas pessoas é recusado —');
  await pg.fill('#busca','william'); await pg.waitForTimeout(200);
  await pg.click('.pessoa'); await pg.waitForTimeout(200);
  await passaCracha(pg,'cr-0421');                      // o de outra pessoa, em minúsculas
  await pg.keyboard.press('Enter');
  await pg.waitForTimeout(300);
  const aviso=await pg.evaluate(()=>{const a=document.getElementById('edAviso');
    return a.classList.contains('on') ? a.textContent : '';});
  console.log('   ',JSON.stringify(aviso));
  ok(/Thiego Ferreira/.test(aviso),'avisa de quem é o crachá',aviso);
  ok(await pg.evaluate(()=>document.getElementById('editor').classList.contains('on')),'continua aberto para corrigir');
  ok(await pg.evaluate(()=>{const b=[...document.querySelectorAll('.pessoa')]
    .find(x=>x.querySelector('.nm').textContent==='William Nakahara');
    return /sem crachá/.test(b.innerText);}),'nada foi gravado para o William');
  // corrige com um crachá livre
  await pg.fill('#edId','CR-0777');
  await pg.click('#edSalvar'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>{const b=[...document.querySelectorAll('.pessoa')]
    .find(x=>x.querySelector('.nm').textContent==='William Nakahara');
    return /CR-0777/.test(b.innerText);}),'crachá livre entra normalmente');

  console.log('\n— telefone pela metade não passa —');
  await pg.fill('#busca','agenor'); await pg.waitForTimeout(200);
  await pg.click('.pessoa'); await pg.waitForTimeout(200);
  await pg.fill('#edId','CR-0900'); await pg.fill('#edFone','9912');
  await pg.click('#edSalvar'); await pg.waitForTimeout(250);
  ok(/incompleto/i.test(await pg.innerText('#edAviso')),'recusa o telefone truncado',await pg.innerText('#edAviso'));
  await pg.fill('#edFone','');                           // em branco é permitido
  await pg.click('#edSalvar'); await pg.waitForTimeout(250);
  ok(!(await pg.evaluate(()=>document.getElementById('editor').classList.contains('on'))),'com o telefone vazio, salva');

  console.log('\n— tirar o crachá de alguém —');
  await pg.fill('#busca','nelton'); await pg.waitForTimeout(200);
  await pg.click('.pessoa'); await pg.waitForTimeout(200);
  await pg.click('#edLimpar'); await pg.waitForTimeout(150);
  ok(await pg.inputValue('#edId')==='','campo esvaziou');
  await pg.click('#edSalvar'); await pg.waitForTimeout(250);
  ok(await pg.evaluate(()=>{const b=[...document.querySelectorAll('.pessoa')]
    .find(x=>x.querySelector('.nm').textContent==='Nelton M Borges');
    return /sem crachá/.test(b.innerText);}),'voltou a ficar sem crachá');
  // e agora o CR-0555 está livre para outra pessoa
  await pg.fill('#busca','douglas'); await pg.waitForTimeout(200);
  await pg.click('.pessoa'); await pg.waitForTimeout(200);
  await pg.fill('#edId','CR-0555'); await pg.click('#edSalvar'); await pg.waitForTimeout(250);
  ok(await pg.evaluate(()=>{const b=[...document.querySelectorAll('.pessoa')]
    .find(x=>x.querySelector('.nm').textContent==='Douglas Marciano');
    return /CR-0555/.test(b.innerText);}),'crachá liberado pode ser reaproveitado');

  console.log('\n— gravar manda o cadastro para o servidor —');
  ok(await pg.evaluate(()=>!document.getElementById('btnSalvar').disabled),'botão salvar habilitado com mudanças pendentes');
  ok(/não salvas/.test(await pg.innerText('#rodape')),'rodapé avisa das mudanças',await pg.innerText('#rodape'));
  await pg.click('#btnSalvar'); await pg.waitForTimeout(500);
  ok(!!gravado,'servidor recebeu o cadastro');
  console.log('   ',JSON.stringify(gravado));
  ok(gravado.charCodeAt(0)===0xFEFF,'com BOM, para o Excel abrir com acento certo');
  const cab=linhasCSV(gravado)[0];
  ok(cab==='ID;Nome;Departamento;Telefone','cabeçalho igual ao que o painel lê',cab);
  ok(linhasCSV(gravado).length===9,'oito pessoas gravadas','linhas: '+linhasCSV(gravado).length);
  const ids=campo(gravado,'ID'), fones=campo(gravado,'Telefone'), deps=campo(gravado,'Departamento');
  ok(ids['Thiego Ferreira']==='CR-0421','ID do Thiego no arquivo',ids['Thiego Ferreira']);
  ok(fones['Thiego Ferreira']==='(19) 99123-4567','telefone gravado',fones['Thiego Ferreira']);
  ok(deps['Thiego Ferreira']==='NMG','departamento veio da planilha',deps['Thiego Ferreira']);
  ok(ids['Nelton M Borges']==='','quem não tem crachá fica com a coluna vazia',JSON.stringify(ids['Nelton M Borges']));
  ok(fones['Agenor Rodrigo']==='','telefone em branco é gravado em branco');
  ok(await pg.evaluate(()=>document.getElementById('btnSalvar').disabled),'botão volta a ficar desabilitado');
  ok(/sincronizado/.test(await pg.innerText('#rodape')),'rodapé confirma',await pg.innerText('#rodape'));

  console.log('\n— recarregando, o cadastro continua lá —');
  await pg.reload({waitUntil:'load'}); await pg.waitForTimeout(500);
  nomes=await nomesNaTela();
  ok(nomes.length===8,'as oito pessoas voltaram','vieram '+nomes.length);
  ok(/4 com crachá/.test(await placar()),'quatro crachás relidos do arquivo',await placar());
  linha=await pg.evaluate(()=>{const b=[...document.querySelectorAll('.pessoa')]
    .find(x=>x.querySelector('.nm').textContent==='Thiego Ferreira'); return b.innerText.replace(/\n/g,' | ');});
  ok(/CR-0421/.test(linha) && /\(19\) 99123-4567/.test(linha),'crachá e telefone relidos',linha);

  console.log('\n— carregar a lista de novo não apaga o que já foi cadastrado —');
  const csv=path.join(TMP,'equipe2.csv');
  fs.writeFileSync(csv,'﻿Nome;Departamento\r\nThiego Ferreira;NMG\r\nLenonn;I/H\r\nCarlos Eduardo;NMG\r\n');
  await pg.setInputFiles('#arq',csv); await pg.waitForTimeout(500);
  nomes=await nomesNaTela();
  console.log('   ',JSON.stringify(nomes));
  ok(nomes.length===10,'dois nomes novos entraram, um já existia','vieram '+nomes.length);
  ok(nomes.includes('Lenonn') && nomes.includes('Carlos Eduardo'),'nomes novos na lista');
  ok(nomes.filter(n=>n==='Thiego Ferreira').length===1,'ninguém duplicado');
  linha=await pg.evaluate(()=>{const b=[...document.querySelectorAll('.pessoa')]
    .find(x=>x.querySelector('.nm').textContent==='Thiego Ferreira'); return b.innerText.replace(/\n/g,' | ');});
  ok(/CR-0421/.test(linha),'o crachá de quem já estava cadastrado foi preservado',linha);
  ok(/2 nome\(s\) novo\(s\)/.test(await pg.innerText('#recado')),'recado conta o que entrou',await pg.innerText('#recado'));

  console.log('\n— uma planilha de coluna única também serve —');
  const so=path.join(TMP,'so-nomes.csv');
  fs.writeFileSync(so,'Renato Bueno\r\nSilvia Prado\r\n');
  await pg.setInputFiles('#arq',so); await pg.waitForTimeout(500);
  nomes=await nomesNaTela();
  ok(nomes.includes('Renato Bueno') && nomes.includes('Silvia Prado'),'lista sem cabeçalho vira nomes',JSON.stringify(nomes));

  console.log('\n— o painel enxerga esse cadastro —');
  await pg.click('#btnSalvar'); await pg.waitForTimeout(400);
  const pg2=await b.newPage({viewport:{width:1440,height:2560}});
  await pg2.goto('http://localhost:8083/cadastro.html',{waitUntil:'load'});   // reusa o leitor do painel
  const visto=await pg2.evaluate(async u=>{
    const t=await (await fetch(u)).text();
    return matrizDeCSV(t).length;
  },'dados/pessoas.csv?t='+Date.now());
  ok(visto===13,'o arquivo gravado é lido de volta inteiro (cabeçalho + 12)','linhas: '+visto);
  await pg2.close();

  console.log('\n— trazer os nomes direto do arquivo de saídas —');
  fs.writeFileSync(PESSOAS,'ID;Nome;Departamento;Telefone\r\nCR-0421;Thiego Ferreira;NMG;(19) 99123-4567\r\n');
  await pg.reload({waitUntil:'load'}); await pg.waitForTimeout(400);
  ok((await nomesNaTela()).length===1,'começa só com quem já estava cadastrado');
  await pg.click('#btnDasSaidas'); await pg.waitForTimeout(700);
  nomes=await nomesNaTela();
  console.log('   ',JSON.stringify(nomes));
  ok(nomes.length>=15,'a equipe inteira das saídas entrou','vieram '+nomes.length);
  ok(nomes.includes('Tanaka') && nomes.includes('Nakahara'),
     'saída lançada para dois ("Tanaka; Nakahara") virou duas pessoas',JSON.stringify(nomes.slice(0,4)));
  ok(!nomes.some(n=>/;/.test(n)),'nenhum nome ficou com o ponto e vírgula colado');
  ok(nomes.filter(n=>n==='Thiego Ferreira').length===1,'quem já existia não duplicou');
  linha=await pg.evaluate(()=>{const b=[...document.querySelectorAll('.pessoa')]
    .find(x=>x.querySelector('.nm').textContent==='Thiego Ferreira'); return b.innerText.replace(/\n/g,' | ');});
  ok(/CR-0421/.test(linha),'e manteve o crachá que já tinha',linha);
  await pg.fill('#busca','jefferson vilela'); await pg.waitForTimeout(200);
  await pg.click('.pessoa'); await pg.waitForTimeout(200);
  const dep=await pg.innerText('#edSub');
  ok(/OUTSOURCE/.test(dep),'departamento veio junto das saídas',dep);
  await pg.click('#edFechar'); await pg.waitForTimeout(150);
  ok(/nome\(s\) novo\(s\)/.test(await pg.innerText('#recado')),'recado confirma',await pg.innerText('#recado'));

  console.log('\n— cadastrar aqui alimenta o painel que já está aberto —');
  // painel aberto ANTES do cadastro, com a HR-V em uso por um crachá desconhecido
  fs.writeFileSync(LOG,'Data/Hora;Tag\r\n'+
    `${fmt(atras(30))};C3FE4090\r\n${fmt(atras(30))};CR-9001\r\n`);
  const painel=await b.newPage({viewport:{width:1440,height:2560}});
  const errosP=[]; painel.on('pageerror',e=>errosP.push(e.message));
  await painel.goto('http://localhost:8083/',{waitUntil:'load'});
  await painel.waitForTimeout(1200);
  const antes=await painel.evaluate(()=>{const e=calculaFrota(new Date()).lista
    .find(x=>x.veiculo.tag==='C3FE4090'); return {status:e.status, condutor:e.condutor&&e.condutor.nome,
    conhecido:!!(e.condutor&&!e.condutor.naoCadastrado)};});
  console.log('   antes:',JSON.stringify(antes));
  ok(antes.status==='uso' && !antes.conhecido,'o painel mostra o crachá cru, fora do cadastro',JSON.stringify(antes));

  // sem tocar no painel, cadastra esse crachá na outra tela e salva
  await pg.fill('#busca','erick'); await pg.waitForTimeout(200);
  await pg.click('.pessoa'); await pg.waitForTimeout(200);
  const escolhido=await pg.innerText('#edNome');   // o nome como está na lista de saídas
  await passaCracha(pg,'CR-9001'); await pg.keyboard.press('Enter');
  await pg.waitForTimeout(250);
  await pg.click('#btnSalvar'); await pg.waitForTimeout(500);
  ok(/próximo ciclo/.test(await pg.innerText('#recado')),'a tela diz que o painel vai pegar sozinho',
     await pg.innerText('#recado'));

  // o painel relê o pessoas.csv no ciclo da frota, sem recarregar a página
  await painel.evaluate(()=>atualizaFrota()); await painel.waitForTimeout(600);
  const depois=await painel.evaluate(()=>{const e=calculaFrota(new Date()).lista
    .find(x=>x.veiculo.tag==='C3FE4090'); return {status:e.status, condutor:e.condutor&&e.condutor.nome,
    conhecido:!!(e.condutor&&!e.condutor.naoCadastrado)};});
  console.log('   depois:',JSON.stringify(depois));
  ok(depois.conhecido,'o crachá passou a ser reconhecido',JSON.stringify(depois));
  ok(depois.condutor===escolhido,'o nome cadastrado aparece na viagem em curso',
     `${depois.condutor} != ${escolhido}`);
  ok(await painel.evaluate(n=>{const c=document.querySelector('.veic.uso');
     return !!c && c.innerText.includes(n);},escolhido),'e o card do carro na tela mostra o nome');
  ok(errosP.length===0,'nenhum erro de JS no painel',errosP.join(' | '));

  console.log('\n— o botão do painel leva ao cadastro, e o de lá volta —');
  ok(await painel.evaluate(()=>{const b=document.getElementById('btnCadastro');
    return !!b && b.offsetWidth>0;}),'botão visível no cabeçalho do painel');
  // o terceiro botão já empurrou o ⚙ para uma segunda linha uma vez,
  // abrindo uma faixa vazia no meio do cabeçalho
  const cabec=await painel.evaluate(()=>{
    const h=document.querySelector('header.top');
    const y=e=>{const r=e.getBoundingClientRect();return Math.round(r.top+r.height/2);};
    const bs=['btnCadastro','btnBlocos','btnCfg'].map(i=>y(document.getElementById(i)));
    const t=document.querySelector('.brand h1');
    return {bs, meio:y(h), alt:Math.round(h.getBoundingClientRect().height),
            cortado:t.scrollWidth>t.clientWidth+1, titulo:t.textContent};
  });
  console.log('   ',JSON.stringify(cabec));
  ok(new Set(cabec.bs).size===1,'os três botões na mesma linha',JSON.stringify(cabec.bs));
  ok(cabec.bs.every(v=>Math.abs(v-cabec.meio)<=2),'na mesma linha do relógio, sem faixa vazia',
     `${JSON.stringify(cabec.bs)} vs meio ${cabec.meio}`);
  ok(!cabec.cortado,'o título continua inteiro',cabec.titulo);
  await painel.click('#btnCadastro');
  await painel.waitForURL(/cadastro\.html$/,{timeout:5000});
  ok(/cadastro\.html/.test(painel.url()),'abriu o cadastro na mesma janela (quiosque não tem aba)',painel.url());
  await painel.waitForTimeout(500);
  ok((await painel.evaluate(()=>document.querySelectorAll('.pessoa').length))>=15,
     'o cadastro abriu já com a equipe gravada');
  await painel.click('#btnVoltar');
  await painel.waitForURL(u=>!/cadastro/.test(u.toString()),{timeout:5000});
  await painel.waitForTimeout(1200);
  ok(await painel.evaluate(()=>!!document.getElementById('kpis')),'voltou para o painel',painel.url());
  await painel.waitForSelector('.veic.uso',{timeout:8000}).catch(()=>{});
  ok(await painel.evaluate(n=>{const c=document.querySelector('.veic.uso');
     return !!c && c.innerText.includes(n);},escolhido),
     'a viagem em curso continua lá — o estado vive no frota.csv',
     await painel.evaluate(()=>{const c=document.querySelector('[data-bloco=\"frota\"]');
       return c ? c.innerText.replace(/\n/g,' | ').slice(0,160) : 'bloco de frota ausente';}));

  console.log('\n— voltar com cadastro pendente grava antes de sair —');
  await painel.click('#btnCadastro'); await painel.waitForURL(/cadastro\.html$/,{timeout:5000});
  await painel.waitForTimeout(500);
  await painel.fill('#busca','douglas'); await painel.waitForTimeout(200);
  await painel.click('.pessoa'); await painel.waitForTimeout(200);
  await painel.fill('#edId','CR-0644'); await painel.waitForTimeout(100);
  gravado=null;
  await painel.click('#edSalvar'); await painel.waitForTimeout(250);
  await painel.click('#btnVoltar');
  await painel.waitForURL(u=>!/cadastro/.test(u.toString()),{timeout:5000});
  ok(!!gravado && /CR-0644/.test(gravado),'gravou sozinho ao voltar, sem perder o que foi digitado',
     String(gravado).slice(0,80));
  await painel.close();

  ok(erros.length===0,'nenhum erro de JS',erros.join(' | '));
  await pg.fill('#busca',''); await pg.waitForTimeout(200);
  await pg.click('.pessoa'); await pg.waitForTimeout(300);
  await pg.screenshot({path:'/tmp/claude-0/-home-user/c4ebad73-ed38-57bd-ad0e-0ec4f3b99b0c/scratchpad/cadastro.png',
    clip:{x:0,y:0,width:1500,height:820}});

  await b.close(); srv.close();
  fs.writeFileSync(PESSOAS,pesOrig); fs.writeFileSync(LOG,logOrig);
  fs.rmSync(TMP,{recursive:true,force:true});
  console.log('\n'+(falhas?falhas+' FALHA(S)':'CADASTRO DE CRACHÁS FUNCIONANDO'));
  process.exit(falhas?1:0);
})();
