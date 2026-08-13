/* Testa a máquina de estados da frota a partir do log de RFID. */
const els={};
function novoEl(id){return{id,innerHTML:'',textContent:'',value:'',scrollHeight:0,clientHeight:0,scrollTop:0,
  style:{setProperty(){}},classList:{add(){},remove(){},contains(){return false}},
  addEventListener(){},click(){},set onclick(v){},set onchange(v){}};}
const proxy=new Proxy({},{get:(t,k)=>t[k]||(t[k]=novoEl(k))});
global.document={getElementById:id=>proxy[id],querySelector:()=>novoEl('s'),querySelectorAll:()=>[],
  addEventListener(){},createElement:()=>novoEl('t'),title:'',body:null};
global.localStorage={_d:{},getItem(k){return this._d[k]||null},setItem(k,v){this._d[k]=v},removeItem(k){delete this._d[k]}};
global.setInterval=()=>0; global.setTimeout=()=>0; global.clearTimeout=()=>{};
global.window={addEventListener(){},scrollBy(){},scrollY:0,innerHeight:2560};
global.indexedDB=undefined; global.location={protocol:'file:'};
global.fetch=()=>Promise.reject(new Error('sem rede'));
global.URL={createObjectURL:()=>'b',revokeObjectURL(){}}; global.Blob=function(){}; global.FileReader=function(){};

const src=require('./fonte-do-painel')();
eval(src
  + '\nglobal.__f={carregaLeiturasRfid,carregaPessoas,calculaFrota,achaVeiculo,CONFIG,desenhaFrota,FonteFrota,parseTabela};');
const F=global.__f;

let falhas=0;
const ok=(c,m,extra='')=>{console.log((c?'  ok  ':'FALHA ')+m+(c?'':'  << '+extra));if(!c)falhas++;};
const T=(h,m)=>{const d=new Date();d.setHours(h,m,0,0);return d;};
const fmt=d=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
const log=(...l)=>'Data/Hora;Tag\n'+l.map(([d,t])=>`${fmt(d)};${t}`).join('\n');
const estado=(n)=>{const m={};F.calculaFrota(n).lista.forEach(e=>m[e.veiculo.tag]={s:e.status,c:e.condutor&&e.condutor.nome,desde:e.desde});return m;};
const crachaPend=(n)=>F.calculaFrota(n).cracha;

F.carregaPessoas('ID;Nome;Departamento\nCR-0421;Thiego Ferreira;NMG\nCR-0107;Jefferson Vilela;OUTSOURCE');

console.log('\n— log vazio: os dois carros livres —');
F.carregaLeiturasRfid('Data/Hora;Tag\n');
let e = estado(T(10,0));
ok(e['C3FE4090'].s==='livre' && e['13B780FA'].s==='livre', 'ambos livres sem nenhuma leitura', JSON.stringify(e));

console.log('\n— tag do carro sozinha: aguarda o crachá —');
F.carregaLeiturasRfid(log([T(9,58),'HRV']));
e = estado(T(9,59));
ok(e['C3FE4090'].s==='aguardando', 'HR-V aguardando crachá', e['C3FE4090'].s);
ok(e['13B780FA'].s==='livre', 'o outro carro não é afetado');

console.log('\n— carro + crachá: entra em uso com o condutor certo —');
F.carregaLeiturasRfid(log([T(7,0),'HRV'],[T(7,0),'CR-0421']));
e = estado(T(10,0));
ok(e['C3FE4090'].s==='uso', 'HR-V em uso', e['C3FE4090'].s);
ok(e['C3FE4090'].c==='Thiego Ferreira', 'condutor veio do cadastro', e['C3FE4090'].c);
ok(e['C3FE4090'].desde.getHours()===7, 'tempo conta desde a marcação do CARRO', String(e['C3FE4090'].desde));

console.log('\n— mesma tag de novo: encerra e libera —');
F.carregaLeiturasRfid(log([T(7,0),'HRV'],[T(7,0),'CR-0421'],[T(11,30),'HRV']));
e = estado(T(12,0));
ok(e['C3FE4090'].s==='livre', 'HR-V liberado após a 2ª passagem', e['C3FE4090'].s);
ok(e['C3FE4090'].desde.getHours()===11, 'livre desde o encerramento', String(e['C3FE4090'].desde));
const comUlt = F.calculaFrota(T(12,0)).lista.find(x=>x.veiculo.tag==='C3FE4090');
ok(comUlt.ultimoCondutor && comUlt.ultimoCondutor.nome==='Thiego Ferreira', 'guarda o último condutor');

console.log('\n— ciclo completo de novo no mesmo dia —');
F.carregaLeiturasRfid(log([T(7,0),'HRV'],[T(7,0),'CR-0421'],[T(11,30),'HRV'],
                          [T(13,0),'HRV'],[T(13,0),'CR-0107']));
e = estado(T(14,0));
ok(e['C3FE4090'].s==='uso' && e['C3FE4090'].c==='Jefferson Vilela', 'segundo uso com outro condutor', JSON.stringify(e['C3FE4090']));

console.log('\n— os dois carros ao mesmo tempo, leituras intercaladas —');
F.carregaLeiturasRfid(log([T(8,0),'CIVIC'],[T(8,0),'CR-0107'],[T(8,5),'HRV'],[T(8,5),'CR-0421']));
e = estado(T(9,0));
ok(e['13B780FA'].s==='uso' && e['13B780FA'].c==='Jefferson Vilela', 'Civic com o condutor certo', JSON.stringify(e['13B780FA']));
ok(e['C3FE4090'].s==='uso' && e['C3FE4090'].c==='Thiego Ferreira', 'HR-V com o condutor certo', JSON.stringify(e['C3FE4090']));

console.log('\n— crachá desconhecido: não trava, e não expõe o número —');
F.carregaLeiturasRfid(log([T(8,0),'HRV'],[T(8,0),'CR-9999']));
e = estado(T(9,0));
ok(e['C3FE4090'].s==='uso', 'o carro entra em uso mesmo assim', JSON.stringify(e['C3FE4090']));
ok(!/CR-9999/.test(e['C3FE4090'].c||''), 'o número do crachá não vira o nome na tela', e['C3FE4090'].c);
ok(/não cadastrado/i.test(e['C3FE4090'].c||''), 'aparece como não cadastrado', e['C3FE4090'].c);
ok(F.calculaFrota(T(9,0)).lista.find(x=>x.veiculo.tag==='C3FE4090').condutor.cracha==='CR-9999',
   'mas o código continua disponível internamente, para o histórico');

console.log('\n— crachá solto: fica pendente, mas não abre uso sozinho —');
F.carregaLeiturasRfid(log([T(8,0),'CR-0421']));
e = estado(T(9,0));
ok(e['C3FE4090'].s==='livre' && e['13B780FA'].s==='livre', 'crachá sozinho não coloca carro nenhum em uso');

console.log('\n— crachá fora do prazo: não casa com a marcação —');
F.carregaLeiturasRfid(log([T(8,0),'HRV'],[T(8,10),'CR-0421']));   // 10 min > 120 s
e = estado(T(9,0));
ok(e['C3FE4090'].c !== 'Thiego Ferreira', 'crachá atrasado não vira condutor', String(e['C3FE4090'].c));

console.log('\n— tag do carro passada duas vezes seguidas: cancela —');
F.carregaLeiturasRfid(log([T(8,0),'HRV'],[T(8,0),'HRV']));
e = estado(T(8,1));
ok(e['C3FE4090'].s==='livre', 'marcação cancelada volta para livre', e['C3FE4090'].s);

console.log('\n— sem crachá dentro do prazo (semCrachaViraUso) —');
F.carregaLeiturasRfid(log([T(8,0),'HRV']));
F.CONFIG.semCrachaViraUso = true;
e = estado(T(9,0));
ok(e['C3FE4090'].s==='uso' && /não identificado/.test(e['C3FE4090'].c), 'vira uso sem condutor identificado', JSON.stringify(e['C3FE4090']));
F.CONFIG.semCrachaViraUso = false;
e = estado(T(9,0));
ok(e['C3FE4090'].s==='livre', 'com a chave desligada, mantém disponível', e['C3FE4090'].s);
F.CONFIG.semCrachaViraUso = true;

console.log('\n— ORDEM INVERTIDA: crachá primeiro, carro depois —');
F.carregaLeiturasRfid(log([T(7,0),'CR-0421'],[T(7,0),'HRV']));
e = estado(T(10,0));
ok(e['C3FE4090'].s==='uso', 'entra em uso mesmo com o crachá primeiro', e['C3FE4090'].s);
ok(e['C3FE4090'].c==='Thiego Ferreira', 'condutor identificado', e['C3FE4090'].c);
ok(e['C3FE4090'].desde.getHours()===7, 'tempo conta a partir da leitura do CARRO', String(e['C3FE4090'].desde));

console.log('\n— crachá primeiro e o carro só depois da janela: não pareia —');
F.carregaLeiturasRfid(log([T(7,0),'CR-0421'],[T(7,10),'HRV']));   // 10 min > 120 s
e = estado(T(7,11));
ok(e['C3FE4090'].s==='aguardando', 'carro abre marcação própria, sem herdar crachá velho', e['C3FE4090'].s);

console.log('\n— crachá sozinho fica pendente e some depois da janela —');
F.carregaLeiturasRfid(log([T(8,0),'CR-0421']));
let cp = crachaPend(T(8,1));
ok(cp && cp.nome==='Thiego Ferreira', 'painel mostra o crachá aguardando carro', JSON.stringify(cp));
ok(crachaPend(T(9,0)) === null, 'passou a janela, some do painel');

console.log('\n— crachá primeiro para cada carro, alternando —');
F.carregaLeiturasRfid(log([T(8,0),'CR-0107'],[T(8,0),'CIVIC'],[T(8,5),'CR-0421'],[T(8,5),'HRV']));
e = estado(T(9,0));
ok(e['13B780FA'].c==='Jefferson Vilela', 'Civic com quem passou o crachá antes dele', String(e['13B780FA'].c));
ok(e['C3FE4090'].c==='Thiego Ferreira', 'HR-V com o crachá correspondente', String(e['C3FE4090'].c));

console.log('\n— um crachá não vaza para o carro seguinte —');
F.carregaLeiturasRfid(log([T(8,0),'CR-0421'],[T(8,0),'HRV'],[T(8,1),'CIVIC']));
e = estado(T(8,2));
ok(e['C3FE4090'].s==='uso' && e['C3FE4090'].c==='Thiego Ferreira','primeiro carro ficou com o crachá');
ok(e['13B780FA'].s==='aguardando','segundo carro não reaproveita o crachá já usado', e['13B780FA'].s);

console.log('\n— retorno: crachá e depois o carro em uso encerram, sem reabrir —');
F.carregaLeiturasRfid(log([T(7,0),'HRV'],[T(7,0),'CR-0421'],[T(11,0),'CR-0421'],[T(11,0),'HRV']));
e = estado(T(12,0));
ok(e['C3FE4090'].s==='livre','2ª passagem encerra mesmo com crachá antes', e['C3FE4090'].s);
ok(crachaPend(T(12,0))===null,'o crachá do retorno não fica pendente');

console.log('\n— variações da tag do carro (caixa, hífen, apelido) —');
ok(F.achaVeiculo('hrv') && F.achaVeiculo('hrv').tag==='C3FE4090', 'minúsculo');
ok(F.achaVeiculo('HR-V') && F.achaVeiculo('HR-V').tag==='C3FE4090', 'com hífen');
ok(F.achaVeiculo('civic9') && F.achaVeiculo('civic9').tag==='13B780FA', 'apelido civic9');
ok(F.achaVeiculo('FIESTA') === null, 'tag desconhecida não é veículo');

console.log('\n— leitura com data futura é ignorada —');
const amanha=new Date(); amanha.setDate(amanha.getDate()+1); amanha.setHours(8,0,0,0);
F.carregaLeiturasRfid(log([amanha,'HRV'],[amanha,'CR-0421']));
e = estado(T(10,0));
ok(e['C3FE4090'].s==='livre', 'não antecipa evento futuro', e['C3FE4090'].s);

console.log('\n— formatos tolerados no log —');
ok(F.carregaLeiturasRfid('data,tag\n09/08/2026 07:00,HRV')===1, 'vírgula como separador');
ok(F.carregaLeiturasRfid('Timestamp\tID\n2026-08-09 07:00\tHRV')===1, 'tabulação + ISO + cabeçalhos alternativos');
ok(F.carregaLeiturasRfid('Data/Hora;Tag\n;\nlixo;HRV')===0, 'linhas sem data válida são descartadas');

console.log('\n— render não quebra em nenhum estado —');
F.FonteFrota.erro=null;
['livre','uso','aguardando'].forEach(()=>{});
// desenhaFrota usa o relógio real, então as leituras precisam ser passadas
const atras = h => new Date(Date.now() - h*3600000);
F.carregaLeiturasRfid(log([atras(3),'HRV'],[atras(3),'CR-0421'],[atras(0.01),'CIVIC']));
F.desenhaFrota();
const html = proxy.listaFrota.innerHTML;
ok(html.includes('Honda HR-V') && html.includes('Honda Civic'), 'os dois carros renderizados');
ok(html.includes('EM USO'), 'selo de em uso presente');
ok(proxy.nFrota.textContent.includes('de 2'), 'contador do cabeçalho', proxy.nFrota.textContent);

console.log('\n'+(falhas?falhas+' FALHA(S)':'TODOS OS TESTES DE RFID PASSARAM'));
process.exit(falhas?1:0);
