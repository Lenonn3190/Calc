/* Harness mínimo de DOM para exercitar o dashboard fora do navegador. */
const saidas = {};
function novoEl(id){
  return {
    id, innerHTML:'', textContent:'', value:'',
    scrollHeight:0, clientHeight:0, scrollTop:0,
    style:{ setProperty(){}, },
    classList:{ add(){}, remove(){}, contains(){return false} },
    addEventListener(){}, click(){}, set onclick(v){}, set onchange(v){},
  };
}
const els = new Proxy({}, { get:(t,k)=> t[k] || (t[k]=novoEl(k)) });
global.document = {
  getElementById: id => els[id],
  querySelector: () => novoEl('sel'),
  querySelectorAll: () => [],
  addEventListener(){}, createElement: () => novoEl('tmp'),
  title:'',
};
global.localStorage = {
  _d:{}, getItem(k){return this._d[k]||null}, setItem(k,v){this._d[k]=v}, removeItem(k){delete this._d[k]},
};
global.setInterval = () => 0;
global.window = { addEventListener(){}, scrollBy(){}, scrollY:0, innerHeight:2560 };
global.indexedDB = undefined;   // sem IndexedDB: exercita o caminho degradado
global.location = { protocol:'file:' };
global.fetch = () => Promise.reject(new Error('sem rede no teste'));
global.URL = { createObjectURL:()=> 'blob:x', revokeObjectURL(){} };
global.Blob = function(){};
global.FileReader = function(){};

const fs = require('fs');
const src = fs.readFileSync('/tmp/claude-0/-home-user/c4ebad73-ed38-57bd-ad0e-0ec4f3b99b0c/scratchpad/all.js','utf8');
// expõe o escopo interno para inspeção
eval(src + '\nglobal.__api = { importar, parseData, duracaoTxt, diasEntre, iniciais, norm, infoMotivo, parseCSV, importar, estado, render, agora, prepara };');

const A = global.__api;
let falhas = 0;
const ok = (cond, msg, extra='') => { console.log((cond?'  ok  ':'FALHA ') + msg + (cond?'':'  << '+extra)); if(!cond) falhas++; };

console.log('\n— parse de datas —');
const d1 = A.parseData('19/01/2026 06:00');
ok(d1 && d1.getDate()===19 && d1.getMonth()===0 && d1.getFullYear()===2026 && d1.getHours()===6, 'dd/mm/aaaa hh:mm', String(d1));
const d2 = A.parseData('2026-03-09');
ok(d2 && d2.getDate()===9 && d2.getMonth()===2, 'aaaa-mm-dd', String(d2));
ok(A.parseData('') === null, 'vazio -> null');
ok(A.parseData('lixo') === null, 'texto invalido -> null', String(A.parseData('lixo')));
const d3 = A.parseData('28/03/2026 23:59');
ok(d3.getHours()===23 && d3.getMinutes()===59, 'hora 23:59');

console.log('\n— durações —');
ok(A.duracaoTxt(A.parseData('27/01/2026 08:15'), A.parseData('27/01/2026 11:00'))==='2h45', 'saída curta = 2h45',
   A.duracaoTxt(A.parseData('27/01/2026 08:15'), A.parseData('27/01/2026 11:00')));
ok(A.duracaoTxt(A.parseData('19/01/2026 00:00'), A.parseData('02/02/2026 17:00'))==='14 dias', 'férias = 14 dias',
   A.duracaoTxt(A.parseData('19/01/2026 00:00'), A.parseData('02/02/2026 17:00')));
ok(A.duracaoTxt(A.parseData('16/01/2026 15:11'), A.parseData('16/01/2026 17:15'))==='2h04', 'minutos com zero à esquerda',
   A.duracaoTxt(A.parseData('16/01/2026 15:11'), A.parseData('16/01/2026 17:15')));

console.log('\n— iniciais / normalização —');
ok(A.iniciais('Nelton M Borges')==='NM', 'iniciais 2 primeiras', A.iniciais('Nelton M Borges'));
ok(A.iniciais('Tanaka; Nakahara')==='TN', 'nomes separados por ;', A.iniciais('Tanaka; Nakahara'));
ok(A.norm('Consulta médica')==='consulta medica', 'remove acentos', A.norm('Consulta médica'));
ok(A.infoMotivo('Férias').rot==='Férias', 'motivo Férias reconhecido');
ok(A.infoMotivo('Saída antecip...').rot==='Saída antecipada', 'motivo truncado do SharePoint', A.infoMotivo('Saída antecip...').rot);
ok(A.infoMotivo('Coisa nova').cor==='#94a3b8', 'motivo desconhecido usa cor padrão');

console.log('\n— registro inválido é descartado —');
ok(A.prepara({nome:'X', inicio:''}) === null, 'sem data de início -> descartado');
const inv = A.prepara({nome:'X', inicio:'10/01/2026 08:00', fim:'01/01/2026 08:00'});
ok(inv && inv.fim > inv.ini, 'fim anterior ao início é corrigido');

console.log('\n— importação CSV (formato SharePoint) —');
const csv = [
 'Descrição da Saída;Motivo;Nome Colaborador;Departamento;Destino;Data de início;Data de término;Duração da viagem;Transporte',
 'Treinamento KUKA;Treinamento;Tanaka;I/H;KUKA Systems;19/01/2026 06:00;23/01/2026 17:00;4;Carro',
 '"Instalação; Apertadeira";Projetos;Thiego;I/H;;05/02/2026 08:00;13/02/2026 17:00;8;Avião',
 'Férias;Férias;Dutra;OUTSOURCE;;05/01/2026 00:00;19/01/2026 17:00;14;',
].join('\n');
const linhas = A.parseCSV(csv);
ok(linhas.length===3, 'lê 3 linhas', 'leu '+linhas.length);
ok(linhas[1].descricao==='Instalação; Apertadeira', 'respeita aspas com separador dentro', linhas[1].descricao);
ok(linhas[0].transporte==='Carro', 'coluna transporte mapeada');
ok(linhas[2].depto==='OUTSOURCE', 'coluna departamento mapeada');

// cabeçalho em ordem trocada + vírgula como separador
const csv2 = 'Nome Colaborador,Data de início,Data de término,Motivo\nPaiva,07/01/2026 08:15,05/02/2026 18:00,3YZ';
const l2 = A.parseCSV(csv2);
ok(l2.length===1 && l2[0].nome==='Paiva' && l2[0].motivo==='3YZ', 'ordem de colunas indiferente + separador vírgula');

let erro=null; try{ A.parseCSV('a;b\n1;2'); }catch(e){ erro=e.message; }
ok(!!erro, 'CSV sem coluna de data gera erro claro', erro);

console.log('\n— o painel usa sempre a data real (sem data de referência) —');
ok(A.estado.dataRef === undefined, 'estado não tem mais dataRef');
const antes = Date.now(), n0 = A.agora();
ok(Math.abs(n0 - antes) < 2000, 'agora() devolve o relógio do PC', String(n0));

console.log('\n— cenário montado em cima de HOJE —');
const hoje = new Date();
const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
const maisDias = k => { const d = new Date(hoje); d.setDate(d.getDate()+k); return d; };
A.importar(JSON.stringify([
  // em curso: começou há 3 dias, volta daqui a 4
  { descricao:'Férias', motivo:'Férias', nome:'Fulano Ferias', depto:'I/H',
    inicio:fmt(maisDias(-3)), fim:fmt(maisDias(4)) },
  // em curso, viagem com destino
  { descricao:'Visita fornecedor', motivo:'Visita técnica', nome:'Beltrano Viagem', depto:'NMG',
    destino:'Joinville-SC', transporte:'Avião', inicio:fmt(maisDias(-1)), fim:fmt(maisDias(2)) },
  // futura, dentro da janela
  { descricao:'Treinamento', motivo:'Treinamento', nome:'Ciclano Futuro', depto:'OUTSOURCE',
    inicio:fmt(maisDias(5)), fim:fmt(maisDias(6)) },
  // já encerrada
  { descricao:'Antiga', motivo:'Projetos', nome:'Passado', depto:'I/H',
    inicio:fmt(maisDias(-30)), fim:fmt(maisDias(-25)) },
]));
const n = A.agora();
const fora = A.estado.registros.filter(r => r.ini <= n && n <= r.fim);
console.log('  ausentes agora:', fora.map(r=>r.nome).join(' | '));
ok(fora.length === 2, 'dois em curso', 'achou '+fora.length);
ok(els.nAusentes.textContent == '2', 'contador do painel bate');
ok(els.listaAusentes.innerHTML.includes('Fulano Ferias'), 'card do ausente renderizado');
ok(!els.listaAusentes.innerHTML.includes('Passado'), 'ausência encerrada fica fora dos cards');
ok(els.listaProximas.innerHTML.includes('Ciclano Futuro'), 'saída futura entra na agenda');
ok(!els.listaProximas.innerHTML.includes('Fulano Ferias'), 'quem já está fora não repete na agenda');
ok(els.timeline.innerHTML.includes('tl-bar'), 'timeline gerou barras');
ok(els.kpis.innerHTML.includes('Presença'), 'KPIs renderizados');
ok(els.kpis.innerHTML.includes('Joinville') === false, 'KPIs não vazam dados de card');

console.log('\n— cenário sem nenhuma ausência —');
A.importar(JSON.stringify([
  { descricao:'Antiga', motivo:'Projetos', nome:'Passado', depto:'I/H',
    inicio:fmt(maisDias(-40)), fim:fmt(maisDias(-35)) },
]));
ok(els.listaAusentes.innerHTML.includes('Equipe completa'), 'estado vazio tratado');
ok(els.listaAusentes.innerHTML.includes('anteriores a hoje'), 'avisa que a base está vencida');
ok(els.timeline.innerHTML.includes('Sem ausências previstas'), 'timeline vazia tratada');

console.log('\n' + (falhas ? falhas+' FALHA(S)' : 'TODOS OS TESTES PASSARAM'));
process.exit(falhas?1:0);
