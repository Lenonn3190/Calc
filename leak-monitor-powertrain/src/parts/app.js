/* ============================================================
   Leak Test | Powertrain — Monitor de Estanqueidade
   Núcleo: configuração, leitura da base (CSV), normalização e
   agregação dos resultados (FPY, NOK, motivos, modelos, turnos).
   App single-file, funciona offline; base compartilhada opcional.
   ============================================================ */
(function(){
"use strict";

/* ---------- Ícones (Lucide-style) ---------- */
const I = {
  drop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7c3.2 4.4 6 7.9 6 11a6 6 0 0 1-12 0c0-3.1 2.8-6.6 6-11z"/></svg>',
  bloco:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M7 6V4M12 6V4M17 6V4"/><circle cx="8" cy="13" r="2"/><circle cx="16" cy="13" r="2"/></svg>',
  cabecote:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M7 7V5M17 7V5M7 19v-2M17 19v-2"/><path d="M10 12h4"/></svg>',
  zero:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m12 12 3.5-3.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 3v2M21 12h-2M12 21v-2M3 12h2"/></svg>',
  gauge:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>',
  refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>',
  target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>',
  bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/></svg>',
  bellOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/><path d="M18.6 13c.7 2.6 2.4 4 2.4 4H6"/><path d="M6 8a6 6 0 0 1 9.7-4.7"/><path d="m2 2 20 20"/></svg>',
  full:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
  cog:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/><path d="M9 15h6"/><path d="M9 11h2"/></svg>',
  upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  hour:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14M5 2h14"/><path d="M17 22v-4.2a2 2 0 0 0-.6-1.4L14 14l2.4-2.4a2 2 0 0 0 .6-1.4V6"/><path d="M7 22v-4.2a2 2 0 0 1 .6-1.4L10 14 7.6 11.6A2 2 0 0 1 7 10.2V6"/></svg>',
  alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  db:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
  sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
};

/* ---------- Utils ---------- */
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const semAcento = s => String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const nInt = n => (isFinite(n)?Math.round(n):0).toLocaleString('pt-BR');
const n1 = n => (isFinite(n)?n:0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const n2 = n => (isFinite(n)?n:0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const hhmm = d => d? d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '—';
const dtBR = d => d? d.toLocaleDateString('pt-BR')+' '+hhmm(d) : '—';

function numBR(v){
  if(v==null) return NaN;
  if(typeof v==='number') return v;
  let s=String(v).trim().replace(/\s|[a-zA-Z%/]+$/g,'');
  if(!s) return NaN;
  if(s.includes(',')&&s.includes('.')) s = s.lastIndexOf(',')>s.lastIndexOf('.') ? s.replace(/\./g,'').replace(',','.') : s.replace(/,/g,'');
  else if(s.includes(',')) s = s.replace(',','.');
  const n = parseFloat(s);
  return isFinite(n)? n : NaN;
}
function duracao(ms){
  if(!isFinite(ms)||ms<0) return '—';
  const min = ms/60000;
  if(min<1) return 'agora';
  if(min<60) return Math.round(min)+' min';
  const h = min/60;
  if(h<48) return n1(h).replace(/,0$/,'')+' h';
  return Math.round(h/24)+' dias';
}
function download(nome, txt, tipo='text/csv;charset=utf-8'){
  const blob = txt instanceof Blob ? txt : new Blob(['﻿'+txt],{type:tipo});
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href=url; a.download=nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),400);
}
function toast(msg, kind='ok'){
  const ic = kind==='err'?I.alert : kind==='info'?I.db : I.check;
  const t = document.createElement('div'); t.className='toast '+kind;
  t.innerHTML = ic+'<span>'+esc(msg)+'</span>';
  $('#toasts').appendChild(t);
  setTimeout(()=>{ t.style.transition='.3s'; t.style.opacity='0'; t.style.transform='translateX(20px)'; setTimeout(()=>t.remove(),300); },4000);
}

/* ============================================================
   POSTOS MONITORADOS
   ============================================================ */
const POSTOS = [
  { key:'USI_BLOCO',    nome:'Bloco',      area:'Usinagem',            curta:'Usinagem', icone:'bloco',    cor:'#2dd4bf' },
  { key:'USI_CABECOTE', nome:'Cabeçote',   area:'Usinagem',            curta:'Usinagem', icone:'cabecote', cor:'#f59e0b' },
  { key:'MON_ZERO',     nome:'Leak Zero',  area:'Montagem de Motores', curta:'Montagem', icone:'zero',     cor:'#a78bfa' },
  { key:'MON_WATER',    nome:'Water Leak', area:'Montagem de Motores', curta:'Montagem', icone:'drop',     cor:'#38bdf8' },
];
const POSTO_BY = Object.fromEntries(POSTOS.map(p=>[p.key,p]));

/* Motivos de reprovação típicos por posto (usados na demonstração e nas dicas) */
const MOTIVOS_PADRAO = {
  USI_BLOCO:    ['Galeria de água','Galeria de óleo','Camisa / cilindro','Face de fogo','Bujão de expansão','Porosidade'],
  USI_CABECOTE: ['Câmara de combustão','Galeria de água','Sede de válvula','Guia de válvula','Face de fogo','Porosidade'],
  MON_ZERO:     ['Junta do cabeçote','Cárter / carter inferior','Tampa de válvulas','Bujões / sensores','Tampa dianteira','Vedante de came'],
  MON_WATER:    ['Bomba d\'água','Carcaça do termostato','Junta do cabeçote','Mangueira / abraçadeira','Radiador de óleo','Tampão da galeria'],
};

/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */
const CFG_KEY = 'leakmon_cfg_v1';
const CACHE_KEY = 'leakmon_cache_v1';
const HIST_KEY = 'leakmon_hist_v1';

function cfgPadrao(){
  return {
    arquivo:'leak.csv',
    intervalo:5,                 // minutos entre leituras da base
    periodo:'turno',             // turno | hoje | 24h | 7d | tudo
    alarme:true,
    tema:'dark',
    escala:'auto',               // auto | p | m | g | gg
    lampadas:40,                 // testes exibidos no painel de lâmpadas
    inicioDia:'00:00',
    turnos:[
      { id:'1', nome:'1º turno', ini:'06:00', fim:'14:20' },
      { id:'2', nome:'2º turno', ini:'14:20', fim:'22:40' },
      { id:'3', nome:'3º turno', ini:'22:40', fim:'06:00' },
    ],
    postos:{
      USI_BLOCO:    { ativo:true, metaFpy:98, minFpy:95, maxNok:20, limite:5,  unid:'cc/min' },
      USI_CABECOTE: { ativo:true, metaFpy:98, minFpy:95, maxNok:20, limite:4,  unid:'cc/min' },
      MON_ZERO:     { ativo:true, metaFpy:99, minFpy:97, maxNok:12, limite:3,  unid:'cc/min' },
      MON_WATER:    { ativo:true, metaFpy:99, minFpy:97, maxNok:12, limite:6,  unid:'cc/min' },
    },
  };
}
let CFG = cfgPadrao();

function mescla(base, novo){
  if(!novo || typeof novo!=='object') return base;
  const out = {...base};
  for(const k of Object.keys(novo)){
    if(novo[k]==null) continue;
    if(k==='postos'){
      out.postos = {...base.postos};
      for(const p of Object.keys(novo.postos||{})) out.postos[p] = {...(base.postos[p]||{}), ...novo.postos[p]};
    } else if(k==='turnos' && Array.isArray(novo.turnos) && novo.turnos.length){
      out.turnos = novo.turnos;
    } else if(typeof novo[k]!=='object'){
      out[k] = novo[k];
    }
  }
  return out;
}
function cfgCarregarLocal(){
  try{ const raw = localStorage.getItem(CFG_KEY); if(raw) CFG = mescla(cfgPadrao(), JSON.parse(raw)); }catch(e){}
}
function cfgSalvar(){
  try{ localStorage.setItem(CFG_KEY, JSON.stringify(CFG)); }catch(e){}
  if(Backend.modo==='servidor') Backend.gravarCfg(CFG).catch(()=>{});
}

/* ============================================================
   BASE DE DADOS (servidor de rede ou arquivo local)
   ============================================================ */
const Backend = {
  modo:'local',            // local | servidor
  info:null,
  async init(){
    if(!/^https?:$/.test(location.protocol)) return;
    try{
      const r = await fetch('api/ping',{cache:'no-store'});
      if(r.ok){ Backend.info = await r.json(); Backend.modo='servidor'; }
    }catch(e){}
  },
  async lerCSV(arquivo){
    const url = 'api/dados?f='+encodeURIComponent(arquivo)+'&t='+Date.now();
    const r = await fetch(url,{cache:'no-store'});
    if(r.status===404) throw new Error('arquivo-ausente');
    if(!r.ok) throw new Error('http '+r.status);
    return { texto: await r.text(), mtime: r.headers.get('X-Mtime')||'' };
  },
  async listarArquivos(){
    try{ const r = await fetch('api/lista?t='+Date.now(),{cache:'no-store'}); if(r.ok) return await r.json(); }catch(e){}
    return [];
  },
  async lerCfg(){
    try{
      const r = await fetch('api/config?t='+Date.now(),{cache:'no-store'});
      if(r.ok){ const j = await r.json(); return (j && typeof j==='object' && Object.keys(j).length)? j : null; }
    }catch(e){}
    return null;
  },
  gravarCfg(cfg){
    return fetch('api/config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(cfg)});
  },
  enviarCSV(arquivo, texto){
    return fetch('api/dados?f='+encodeURIComponent(arquivo),{method:'POST',headers:{'content-type':'text/csv; charset=utf-8'},body:texto});
  },
};

/* ============================================================
   LEITURA DO CSV
   ============================================================ */
function detectarSep(linha){
  const cands = [';','\t','|',','];
  let melhor=';', max=-1;
  for(const c of cands){
    let n=0, dentro=false;
    for(let i=0;i<linha.length;i++){
      const ch=linha[i];
      if(ch==='"') dentro=!dentro;
      else if(ch===c && !dentro) n++;
    }
    if(n>max){ max=n; melhor=c; }
  }
  return max>0? melhor : ';';
}
function parseCSV(texto){
  let t = String(texto||'').replace(/^﻿/,'').replace(/\r\n?/g,'\n').trim();
  if(!t) return { cols:[], linhas:[] };
  const sep = detectarSep(t.split('\n')[0]);
  const linhas=[]; let campo='', linha=[], dentro=false;
  for(let i=0;i<t.length;i++){
    const ch=t[i];
    if(dentro){
      if(ch==='"'){ if(t[i+1]==='"'){ campo+='"'; i++; } else dentro=false; }
      else campo+=ch;
    } else {
      if(ch==='"') dentro=true;
      else if(ch===sep){ linha.push(campo); campo=''; }
      else if(ch==='\n'){ linha.push(campo); linhas.push(linha); linha=[]; campo=''; }
      else campo+=ch;
    }
  }
  linha.push(campo); linhas.push(linha);
  const cab = (linhas.shift()||[]).map(c=>c.trim());
  const cols = cab.map(semAcento);
  const out = [];
  for(const l of linhas){
    if(!l.length || l.every(c=>!String(c).trim())) continue;
    const o = {};
    cols.forEach((c,i)=>{ if(c) o[c] = (l[i]==null?'':String(l[i]).trim()); });
    o.__orig = cab;
    out.push(o);
  }
  return { cols, linhas:out, sep };
}

/* Aliases de colunas aceitos (sem acento, minúsculo) */
const ALIAS = {
  data:    ['data_hora','datahora','data hora','data','timestamp','date','hora','horario','momento','data_teste','inicio'],
  posto:   ['posto','estacao','estagio','station','teste','tipo_teste','tipo de teste','processo','operacao','op','banco','celula','local'],
  peca:    ['peca','pecas','item','componente','produto','tipo_peca','descricao'],
  linha:   ['linha','line','area','setor'],
  modelo:  ['modelo','model','motor','familia','versao','projeto'],
  serie:   ['serie','n_serie','numero_serie','ns','serial','id_peca','id','identificacao','chassi','rastreio'],
  res:     ['resultado','result','status','julgamento','avaliacao','ok_nok','oknok','conformidade','veredito','situacao'],
  valor:   ['vazamento','valor','valor_vazamento','leak','leak_rate','fuga','medido','medicao','queda','delta','perda','valor_medido','resultado_medido'],
  limite:  ['limite','limite_max','lim_max','spec','especificacao','tolerancia','limit','maximo'],
  unid:    ['unidade','unid','um','unit','medida'],
  motivo:  ['motivo','defeito','falha','causa','ncr','reason','local_vazamento','ponto','regiao','descricao_falha','observacao'],
  turno:   ['turno','shift','equipe'],
  operador:['operador','operator','matricula','colaborador','responsavel'],
  maquina: ['maquina','equipamento','machine','dispositivo','bancada','recurso'],
  reteste: ['reteste','retest','tentativa','ciclo','passagem','repeticao','rework','retrabalho'],
  pressao: ['pressao','pressure','bar','mbar'],
};
function pega(reg, chave){
  return pegaCampo(reg, chave).val;
}
/* devolve também qual coluna casou — usado para separar "reteste S/N" de "tentativa 1,2,3" */
function pegaCampo(reg, chave){
  for(const a of ALIAS[chave]){ if(reg[a]!=null && reg[a]!=='') return { col:a, val:reg[a] }; }
  return { col:'', val:'' };
}

function parseData(v){
  if(!v) return null;
  const s = String(v).trim();
  if(/^\d{13}$/.test(s)) return new Date(+s);
  if(/^\d{10}$/.test(s)) return new Date(+s*1000);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if(m) return new Date(+m[1], +m[2]-1, +m[3], +(m[4]||0), +(m[5]||0), +(m[6]||0));
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if(m){
    let ano = +m[3]; if(ano<100) ano += ano<70? 2000 : 1900;
    return new Date(ano, +m[2]-1, +m[1], +(m[4]||0), +(m[5]||0), +(m[6]||0));
  }
  m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if(m){ const d=new Date(); d.setHours(+m[1], +m[2], +(m[3]||0), 0); return d; }
  const d = new Date(s);
  return isNaN(d)? null : d;
}
function normPosto(txt){
  const s = semAcento(txt);
  if(!s) return '';
  if(POSTO_BY[String(txt).trim().toUpperCase()]) return String(txt).trim().toUpperCase();
  if(/water|agua|arrefec|refrig|d'?agua/.test(s)) return 'MON_WATER';
  if(/leak\s*zero|zero\s*leak|leakzero|estanqueidade\s*zero|\bzero\b/.test(s)) return 'MON_ZERO';
  if(/cabecote|cabeca|head|tampa\s*de\s*cilindro/.test(s)) return 'USI_CABECOTE';
  if(/bloco|block|monobloco|carcaca/.test(s)) return 'USI_BLOCO';
  return '';
}
function normRes(txt){
  const s = semAcento(txt);
  if(!s) return '';
  if(/^(ok|pass|passa|aprov|approved|bom|conforme|good|a|p|1|sim|s|g)$/.test(s)) return 'OK';
  if(/^(nok|ng|n\.?ok|fail|falha|reprov|rejeit|ruim|nc|nao conforme|r|f|0|nao|n|refugo)$/.test(s)) return 'NOK';
  if(/nok|ng|fail|reprov|rejeit|refug|nao conforme|vazando|vazamento alto/.test(s)) return 'NOK';
  if(/ok|pass|aprov|conforme/.test(s)) return 'OK';
  return '';
}
/* Coluna de contagem (tentativa/ciclo/passagem) só é reteste a partir da 2ª;
   coluna booleana (reteste/retrabalho) aceita S/Sim/1/X. */
function ehReteste(campo){
  if(!campo.val) return false;
  if(/tentativa|ciclo|passagem|repeticao/.test(campo.col)){ const n = numBR(campo.val); return isFinite(n)? n>1 : ehVerdade(campo.val); }
  return ehVerdade(campo.val);
}
function ehVerdade(txt){
  const s = semAcento(txt);
  if(!s) return false;
  if(/^(s|sim|y|yes|true|verdadeiro|x|1)$/.test(s)) return true;
  const n = numBR(s);
  return isFinite(n) && n>1;   // tentativa/ciclo 2, 3… = reteste
}

/* Converte as linhas cruas em registros normalizados */
function normalizar(linhas){
  const regs=[]; let ignorados=0, semData=0;
  for(const l of linhas){
    const posto = normPosto(pega(l,'posto')) || normPosto(pega(l,'peca')) || normPosto(pega(l,'maquina')) || normPosto(pega(l,'linha'));
    if(!posto){ ignorados++; continue; }
    const ts = parseData(pega(l,'data'));
    if(!ts) semData++;
    let res = normRes(pega(l,'res'));
    const valor = numBR(pega(l,'valor'));
    const limite = numBR(pega(l,'limite'));
    if(!res && isFinite(valor) && isFinite(limite)) res = valor>limite? 'NOK':'OK';   // deduz pelo valor medido
    if(!res) res = 'OK';
    const motivo = String(pega(l,'motivo')||'').trim();
    regs.push({
      ts, posto, res,
      modelo: String(pega(l,'modelo')||'').trim(),
      serie: String(pega(l,'serie')||'').trim(),
      valor: isFinite(valor)? valor : NaN,
      limite: isFinite(limite)? limite : NaN,
      unid: String(pega(l,'unid')||'').trim(),
      motivo: res==='NOK'? (motivo||'Não informado') : motivo,
      turno: String(pega(l,'turno')||'').trim(),
      operador: String(pega(l,'operador')||'').trim(),
      maquina: String(pega(l,'maquina')||'').trim(),
      reteste: ehReteste(pegaCampo(l,'reteste')),
    });
  }
  // Sem data em nenhuma linha: distribui no tempo para não esconder tudo nos filtros
  if(semData){
    const base = Date.now() - regs.length*30000;
    regs.forEach((r,i)=>{ if(!r.ts) r.ts = new Date(base + i*30000); });
  }
  regs.sort((a,b)=> a.ts - b.ts);
  return { regs, ignorados, semData };
}

/* ============================================================
   PERÍODOS E TURNOS
   ============================================================ */
function hm(str){ const m=String(str||'').match(/^(\d{1,2}):(\d{2})/); return m? (+m[1])*60 + (+m[2]) : 0; }
function turnoDe(d){
  const min = d.getHours()*60 + d.getMinutes();
  for(const t of CFG.turnos){
    const a=hm(t.ini), b=hm(t.fim);
    if(a<b){ if(min>=a && min<b) return t; }
    else   { if(min>=a || min<b) return t; }     // turno que vira o dia
  }
  return CFG.turnos[0] || {id:'1',nome:'1º turno'};
}
function janelaTurnoAtual(agora=new Date()){
  const t = turnoDe(agora);
  const a=hm(t.ini), b=hm(t.fim), min=agora.getHours()*60+agora.getMinutes();
  const ini = new Date(agora); ini.setSeconds(0,0); ini.setHours(Math.floor(a/60), a%60, 0, 0);
  if(a>=b && min<b) ini.setDate(ini.getDate()-1);          // madrugada do turno que começou ontem
  const fim = new Date(ini); fim.setMinutes(fim.getMinutes() + ((b-a+1440)%1440 || 1440));
  return { turno:t, ini, fim };
}
const PERIODOS = [
  { id:'turno', lbl:'Turno' },
  { id:'hoje',  lbl:'Hoje' },
  { id:'24h',   lbl:'24 h' },
  { id:'7d',    lbl:'7 dias' },
  { id:'tudo',  lbl:'Tudo' },
];
function janela(periodo, agora=new Date()){
  const p = periodo||'hoje';
  if(p==='turno'){ const j=janelaTurnoAtual(agora); return { ini:j.ini, fim:agora, rot:(j.turno.nome||('Turno '+j.turno.id))+' · desde '+hhmm(j.ini) }; }
  if(p==='hoje'){
    const ini=new Date(agora); ini.setHours(Math.floor(hm(CFG.inicioDia)/60), hm(CFG.inicioDia)%60, 0, 0);
    if(ini>agora) ini.setDate(ini.getDate()-1);
    return { ini, fim:agora, rot:'Hoje · desde '+hhmm(ini) };
  }
  if(p==='24h') return { ini:new Date(agora.getTime()-24*3600e3), fim:agora, rot:'Últimas 24 horas' };
  if(p==='7d')  return { ini:new Date(agora.getTime()-7*24*3600e3), fim:agora, rot:'Últimos 7 dias' };
  return { ini:new Date(0), fim:agora, rot:'Base completa' };
}

/* ============================================================
   AGREGAÇÃO — FPY, NOK, motivos, modelos, turnos e tendência
   ============================================================ */
function agregarPosto(key, regs, jan){
  const cfg = CFG.postos[key] || {};
  const lista = regs.filter(r=> r.posto===key && r.ts>=jan.ini && r.ts<=jan.fim);
  const st = {
    key, cfg, total:lista.length,
    testadas:0, ok1:0, nok1:0, fpy:0, retestes:0,
    pecas:0, aprovadas:0, refugo:0, yieldFinal:0,
    motivos:[], modelos:[], turnos:[], hist:[], ultimos:[],
    mediaVal:NaN, maxVal:NaN, limite: isFinite(numBR(cfg.limite))? numBR(cfg.limite) : NaN,
    unid: cfg.unid||'cc/min', ultimoNOK:null, ultimoTeste:null,
    cadencia:0, status:'off', atingimento:0,
  };
  if(!lista.length) return st;

  const vistos = new Set(), porPeca = new Map(), seq = [];
  const mMot = new Map(), mMod = new Map(), mTur = new Map();
  let somaVal=0, nVal=0;

  for(const r of lista){
    const idPeca = r.serie || '';
    const primeira = !r.reteste && (!idPeca || !vistos.has(idPeca));
    if(idPeca) vistos.add(idPeca);

    if(primeira){
      st.testadas++;
      seq.push(r.res);
      if(r.res==='OK') st.ok1++;
      else{
        st.nok1++;
        const mot = r.motivo || 'Não informado';
        mMot.set(mot, (mMot.get(mot)||0)+1);
      }
      const mod = r.modelo || '—';
      const om = mMod.get(mod) || {nome:mod, tot:0, nok:0};
      om.tot++; if(r.res==='NOK') om.nok++; mMod.set(mod, om);

      const tId = r.turno || turnoDe(r.ts).id;
      const ot = mTur.get(tId) || {nome:tId, tot:0, nok:0};
      ot.tot++; if(r.res==='NOK') ot.nok++; mTur.set(tId, ot);
    } else {
      st.retestes++;
      if(r.res==='NOK'){
        const mot = r.motivo || 'Não informado';
        mMot.set(mot, (mMot.get(mot)||0)+1);
      }
    }

    if(idPeca) porPeca.set(idPeca, r.res);
    if(isFinite(r.valor)){ somaVal += r.valor; nVal++; st.maxVal = isFinite(st.maxVal)? Math.max(st.maxVal, r.valor) : r.valor; }
    if(isFinite(r.limite) && !isFinite(st.limite)) st.limite = r.limite;
    if(r.unid) st.unid = r.unid;
    if(r.res==='NOK') st.ultimoNOK = r.ts;
    st.ultimoTeste = r.ts;
  }

  st.fpy = st.testadas? (st.ok1/st.testadas)*100 : 0;
  if(porPeca.size){
    st.pecas = porPeca.size;
    porPeca.forEach(v=>{ if(v==='OK') st.aprovadas++; else st.refugo++; });
  } else {
    st.pecas = st.testadas;
    st.aprovadas = st.ok1 + Math.max(0, lista.filter(r=>r.reteste && r.res==='OK').length);
    st.aprovadas = Math.min(st.aprovadas, st.pecas);
    st.refugo = Math.max(0, st.pecas - st.aprovadas);
  }
  st.yieldFinal = st.pecas? (st.aprovadas/st.pecas)*100 : 0;
  if(nVal){ st.mediaVal = somaVal/nVal; }

  const totNok = st.nok1 || 1;
  st.motivos = [...mMot.entries()].map(([nome,qtd])=>({nome, qtd, pct:(qtd/totNok)*100})).sort((a,b)=>b.qtd-a.qtd);
  st.modelos = [...mMod.values()].map(m=>({...m, fpy: m.tot? ((m.tot-m.nok)/m.tot)*100 : 0})).sort((a,b)=>b.tot-a.tot);
  st.turnos  = [...mTur.values()].map(m=>({...m, fpy: m.tot? ((m.tot-m.nok)/m.tot)*100 : 0})).sort((a,b)=>String(a.nome).localeCompare(String(b.nome)));

  const span = (st.ultimoTeste - lista[0].ts)/3600e3;
  st.cadencia = st.testadas / Math.max(0.25, span || 0.25);

  st.hist = tendencia(lista, jan);
  st.ultimos = seq.slice(-80);            // painel de lâmpadas do andon

  const meta = numBR(cfg.metaFpy) || 98, min = numBR(cfg.minFpy) || 95, maxNok = numBR(cfg.maxNok);
  st.atingimento = meta? clamp((st.fpy/meta)*100, 0, 100) : 0;
  if(!st.testadas) st.status='off';
  else if(st.fpy < min || (isFinite(maxNok) && st.nok1 > maxNok)) st.status='bad';
  else if(st.fpy < meta) st.status='warn';
  else st.status='ok';
  return st;
}
/* Tendência: FPY por bloco de tempo (12 blocos dentro da janela) */
function tendencia(lista, jan){
  if(!lista.length) return [];
  const N = 12;
  const ini = Math.max(jan.ini.getTime(), lista[0].ts.getTime());
  const fim = Math.max(jan.fim.getTime(), ini+1);
  const passo = (fim-ini)/N;
  const buckets = Array.from({length:N},()=>({tot:0,nok:0}));
  for(const r of lista){
    const i = clamp(Math.floor((r.ts.getTime()-ini)/passo), 0, N-1);
    if(r.reteste) continue;
    buckets[i].tot++; if(r.res==='NOK') buckets[i].nok++;
  }
  return buckets.map(b=>({ tot:b.tot, nok:b.nok, fpy: b.tot? ((b.tot-b.nok)/b.tot)*100 : NaN }));
}
function agregarTudo(regs, periodo){
  const jan = janela(periodo);
  const out = { jan, postos:{}, total:0, nokTotal:0 };
  for(const p of POSTOS){
    const st = agregarPosto(p.key, regs, jan);
    out.postos[p.key] = st;
    out.total += st.testadas; out.nokTotal += st.nok1;
  }
  return out;
}

/* ============================================================
   DADOS DE DEMONSTRAÇÃO (usados quando não há base ligada)
   ============================================================ */
function demoRegistros(){
  const modelos = { USI_BLOCO:['1.0','1.5','1.5 Turbo'], USI_CABECOTE:['1.0','1.5','1.5 Turbo'],
                    MON_ZERO:['1.0','1.5','1.5 Turbo'], MON_WATER:['1.0','1.5','1.5 Turbo'] };
  const perfil = { USI_BLOCO:{fpy:97.6, pph:46, lim:5},  USI_CABECOTE:{fpy:96.4, pph:44, lim:4},
                   MON_ZERO:{fpy:99.1, pph:38, lim:3},   MON_WATER:{fpy:98.2, pph:38, lim:6} };
  const regs=[]; const agora=Date.now(); const dias=7;
  let seq = 1;
  for(const p of POSTOS){
    const pf = perfil[p.key], mots = MOTIVOS_PADRAO[p.key];
    for(let h=dias*24; h>=0; h--){
      const base = agora - h*3600e3;
      const d = new Date(base);
      if(d.getDay()===0) continue;                                  // domingo sem produção
      const hora = d.getHours();
      const carga = (hora>=6 && hora<22)? 1 : 0.55;
      const qtd = Math.round(pf.pph*carga*(0.8+Math.random()*0.4));
      const fpyHora = clamp(pf.fpy + (Math.random()*3-1.6) - (h<6?1.4:0), 88, 100);
      for(let i=0;i<qtd;i++){
        const ts = new Date(base + Math.floor(Math.random()*3600e3));
        const nok = (Math.random()*100) > fpyHora;
        const val = nok? pf.lim*(1.1+Math.random()*1.8) : pf.lim*(0.15+Math.random()*0.6);
        const serie = p.key.slice(0,3)+String(100000+seq++);
        regs.push({
          ts, posto:p.key, res: nok?'NOK':'OK',
          modelo: modelos[p.key][Math.floor(Math.random()*3)],
          serie, valor: +val.toFixed(2), limite: pf.lim, unid:'cc/min',
          motivo: nok? mots[Math.floor(Math.random()*mots.length)] : '',
          turno: turnoDe(ts).id, operador:'', maquina:'', reteste:false,
        });
        if(nok && Math.random()<0.7){                                // reteste após retrabalho
          const ts2 = new Date(ts.getTime()+22*60000);
          regs.push({ ts:ts2, posto:p.key, res: Math.random()<0.85?'OK':'NOK',
            modelo: regs[regs.length-1].modelo, serie, valor:+(pf.lim*0.5).toFixed(2), limite:pf.lim, unid:'cc/min',
            motivo:'', turno:turnoDe(ts2).id, operador:'', maquina:'', reteste:true });
        }
      }
    }
  }
  regs.sort((a,b)=>a.ts-b.ts);
  return regs;
}
function regsParaCSV(regs){
  const cab = ['data_hora','posto','modelo','serie','resultado','vazamento','limite','unidade','motivo','turno','reteste'];
  const fmt = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')
                 +' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0');
  const linhas = regs.map(r=>[fmt(r.ts), r.posto, r.modelo, r.serie, r.res,
    isFinite(r.valor)? String(r.valor).replace('.',',') : '',
    isFinite(r.limite)? String(r.limite).replace('.',',') : '',
    r.unid, r.motivo, r.turno, r.reteste?'S':'N'].join(';'));
  return cab.join(';')+'\n'+linhas.join('\n');
}

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
const ST = {
  regs:[], agregado:null,
  fonte:'—',            // servidor | arquivo | demonstração | cache
  arquivo:'',
  atualizadoEm:null, proximaEm:0, carregando:false,
  erro:'', ignorados:0,
  alarmes:{},           // key -> status anterior (para disparar som só na transição)
};

/* Cache local do último CSV lido (para o painel voltar populado após reboot) */
function salvarCache(texto, fonte, arquivo){
  try{ localStorage.setItem(CACHE_KEY, JSON.stringify({texto:String(texto).slice(0,4_000_000), fonte, arquivo, em:Date.now()})); }catch(e){}
}
function lerCache(){
  try{ const raw=localStorage.getItem(CACHE_KEY); return raw? JSON.parse(raw) : null; }catch(e){ return null; }
}

function aplicarTexto(texto, fonte, arquivo){
  const {linhas} = parseCSV(texto);
  const {regs, ignorados} = normalizar(linhas);
  if(!regs.length) throw new Error('sem-registros');
  ST.regs = regs; ST.fonte = fonte; ST.arquivo = arquivo||''; ST.ignorados = ignorados;
  ST.atualizadoEm = new Date(); ST.erro='';
  return regs.length;
}

/* Exposto para a camada de interface (app2.js) */
window.LK = { I, $, $$, esc, clamp, semAcento, nInt, n1, n2, hhmm, dtBR, numBR, duracao, download, toast,
  POSTOS, POSTO_BY, MOTIVOS_PADRAO, PERIODOS, CFG_KEY, HIST_KEY,
  cfg:()=>CFG, setCfg:(c)=>{ CFG = mescla(cfgPadrao(), c); }, cfgPadrao, cfgCarregarLocal, cfgSalvar, mescla,
  Backend, parseCSV, normalizar, agregarTudo, janela, janelaTurnoAtual, turnoDe, hm,
  demoRegistros, regsParaCSV, ST, aplicarTexto, salvarCache, lerCache };
})();
