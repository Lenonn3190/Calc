/* ============================================================
   CheckSync ETG — Inspeção de Ativos Industriais
   App single-file, offline. Persistência em localStorage.
   ============================================================ */
(function(){
"use strict";

/* ---------- Ícones (Lucide-style) ---------- */
const I = {
  gauge:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>',
  box:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
  clipboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>',
  file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/><path d="M9 15h6"/><path d="M9 11h2"/></svg>',
  upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>',
  cog:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.06 12.34a1 1 0 0 1 0-.68 10.94 10.94 0 0 1 19.88 0 1 1 0 0 1 0 .68 10.94 10.94 0 0 1-19.88 0Z"/><circle cx="12" cy="12" r="3"/></svg>',
  print:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V2h12v7"/><rect width="12" height="8" x="6" y="14"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
  image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>',
  menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M4 6h16M4 18h16"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  save:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>',
  pen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>',
  factory:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1M12 18h1M7 18h1"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/></svg>',
};

/* ---------- Utils ---------- */
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const todayISO = ()=> new Date().toISOString().slice(0,10);
function fmtDate(iso){ if(!iso) return '—'; const d=new Date(iso.length<=10?iso+'T00:00:00':iso); if(isNaN(d)) return iso; return d.toLocaleDateString('pt-BR'); }
function fmtDateTime(iso){ const d=new Date(iso); if(isNaN(d)) return '—'; return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
function download(name, data, type='application/octet-stream'){
  const blob = data instanceof Blob ? data : new Blob([data],{type});
  const url = URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 400);
}
function readFileData(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }
function readFileArrayBuffer(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsArrayBuffer(file); }); }
function readFileText(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsText(file); }); }
async function shrinkImage(dataURL, max=1000, quality=0.8){
  return new Promise(res=>{ const img=new Image(); img.onload=()=>{
    let {width:w,height:h}=img; const sc=Math.min(1,max/Math.max(w,h)); w=Math.round(w*sc); h=Math.round(h*sc);
    const cv=document.createElement('canvas'); cv.width=w; cv.height=h; cv.getContext('2d').drawImage(img,0,0,w,h);
    res(cv.toDataURL('image/jpeg',quality)); }; img.onerror=()=>res(dataURL); img.src=dataURL; });
}
function toast(msg, kind='ok'){
  const ic = kind==='err'?I.alert : kind==='info'?I.gauge : I.check;
  const t=document.createElement('div'); t.className='toast '+kind; t.innerHTML=ic+'<span>'+esc(msg)+'</span>';
  $('#toasts').appendChild(t);
  setTimeout(()=>{ t.style.transition='.3s'; t.style.opacity='0'; t.style.transform='translateX(20px)'; setTimeout(()=>t.remove(),300); }, 3200);
}

/* ---------- Status maps ---------- */
const ITEM_ST = { C:{lbl:'Conforme',cls:'C'}, R:{lbl:'Restrição',cls:'R'}, NC:{lbl:'Não Conf.',cls:'NC'}, NA:{lbl:'N/A',cls:'NA'} };
const ASSET_ST = {
  operacional:{lbl:'Operacional',b:'b-ok'},
  manutencao:{lbl:'Manutenção',b:'b-warn'},
  interditado:{lbl:'Interditado',b:'b-bad'},
};
const FINAL_ST = {
  'APROVADO':{b:'b-ok', bg:'#dcfce7', fg:'#15803d'},
  'APROVADO COM RESTRIÇÕES':{b:'b-warn', bg:'#fef3c7', fg:'#b45309'},
  'REPROVADO / INTERDITADO':{b:'b-bad', bg:'#fee2e2', fg:'#b91c1c'},
};
function finalFromItems(itens){
  let hasNC=false, hasR=false, any=false;
  itens.forEach(it=>{ if(it.status==='NC'){hasNC=true;any=true;} else if(it.status==='R'){hasR=true;any=true;} else if(it.status==='C'){any=true;} });
  if(!any) return 'APROVADO';
  if(hasNC) return 'REPROVADO / INTERDITADO';
  if(hasR) return 'APROVADO COM RESTRIÇÕES';
  return 'APROVADO';
}
function laudoStats(l){
  let C=0,R=0,NC=0,NA=0,aval=0;
  l.itens.forEach(it=>{ if(it.status==='C'){C++;aval++;} else if(it.status==='R'){R++;aval++;} else if(it.status==='NC'){NC++;aval++;} else if(it.status==='NA'){NA++;} });
  const conf = aval? Math.round((C/aval)*100) : 0;
  return {C,R,NC,NA,aval,conf,acoes:R+NC};
}

/* ---------- Persistência ---------- */
const KEY='checksync_etg_db_v1';
let DB;
/* ---------- Persistência via IndexedDB (store chave-valor "kv"),
     mesmo método do app de Gestão de Pedidos; localStorage é fallback ---------- */
const IDB = {
  db:null, ok:false,
  open(){return new Promise(res=>{ try{
    const r=indexedDB.open("checksyncETGDB",1);
    r.onupgradeneeded=()=>r.result.createObjectStore("kv");
    r.onsuccess=()=>{ IDB.db=r.result; IDB.ok=true; res(); };
    r.onerror=()=>res();
  }catch(e){ res(); } });},
  set(k,v){return new Promise((res,rej)=>{ if(!IDB.db)return rej(); const t=IDB.db.transaction("kv","readwrite"); t.objectStore("kv").put(v,k); t.oncomplete=res; t.onerror=()=>rej(t.error); });},
  get(k){return new Promise((res,rej)=>{ if(!IDB.db)return res(null); const t=IDB.db.transaction("kv","readonly"); const q=t.objectStore("kv").get(k); q.onsuccess=()=>res(q.result||null); q.onerror=()=>rej(q.error); });},
  del(k){return new Promise((res,rej)=>{ if(!IDB.db)return res(); const t=IDB.db.transaction("kv","readwrite"); t.objectStore("kv").delete(k); t.oncomplete=res; t.onerror=()=>rej(t.error); });},
};
/* ---------- Base compartilhada (servidor de rede) ----------
   Se o app for servido por http(s) e houver um servidor CheckSync (rota /api/ping),
   entra em modo "servidor": lê e grava a base em pasta compartilhada e salva PDFs.
   Caso contrário, modo "local" (IndexedDB neste aparelho). */
const Backend = {
  mode:'local', server:null, lastHash:'',
  async init(){
    if(/^https?:$/.test(location.protocol)){
      try{ const r=await fetch('api/ping',{cache:'no-store'}); if(r.ok){ Backend.server=await r.json(); Backend.mode='server'; } }catch(e){}
    }
  },
  async fetchDB(){ const r=await fetch('api/base?t='+Date.now(),{cache:'no-store'}); if(!r.ok) throw new Error('http '+r.status); const j=await r.json(); return (j&&j.meta)?j:null; },
  postDB(db){ return fetch('api/base',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(db)}); },
  postPDF(name,blob){ return fetch('api/laudo?name='+encodeURIComponent(name),{method:'POST',headers:{'content-type':'application/pdf'},body:blob}); },
};
function dbHash(db){ try{ return db.assets.length+'/'+db.laudos.length+'/'+(db.settings.seq||0)+'/'+db.assets.reduce((a,x)=>a+(x.updatedAt||''),'')+'/'+db.laudos.reduce((a,x)=>a+x.id,''); }catch(e){ return String(Math.random()); } }
let _saveTimer=null;
function save(){
  if(Backend.mode==='server'){
    if(IDB.ok) IDB.set("db",DB).catch(()=>{});                 // espelho local (cache)
    clearTimeout(_saveTimer);
    _saveTimer=setTimeout(()=>{ Backend.postDB(DB).then(r=>{ if(!r.ok) throw 0; Backend.lastHash=dbHash(DB); }).catch(()=>toast('Falha ao gravar na base compartilhada','err')); }, 300);
  } else {
    if(IDB.ok){ IDB.set("db",DB).catch(()=>{ try{ localStorage.setItem(KEY, JSON.stringify(DB)); }catch(_){}}); }
    else { try{ localStorage.setItem(KEY, JSON.stringify(DB)); }catch(e){ toast('Falha ao salvar (armazenamento cheio?)','err'); } }
  }
}
function clearStore(){
  try{ localStorage.removeItem(KEY); }catch(e){}
  if(Backend.mode==='server'){ DB=seedDB(); return Backend.postDB(DB).catch(()=>{}); }
  return IDB.ok? IDB.del("db").catch(()=>{}) : Promise.resolve();
}
async function load(){
  await Backend.init();
  await IDB.open();
  DB=null;
  if(Backend.mode==='server'){
    try{ DB=await Backend.fetchDB(); }
    catch(e){ toast('Sem conexão com a base — usando cópia local','err'); if(IDB.ok){ try{ DB=await IDB.get("db"); }catch(_){}} }
  } else {
    if(IDB.ok){ try{ DB=await IDB.get("db"); }catch(e){ DB=null; } }
    if(!DB || !DB.meta){ try{ const raw=localStorage.getItem(KEY); if(raw){ const old=JSON.parse(raw); if(old&&old.meta) DB=old; } }catch(e){} }
  }
  if(!DB || !DB.meta){ DB = seedDB(); }
  DB.assets ||= []; DB.laudos ||= []; DB.templates ||= []; DB.settings ||= {};
  seedTemplates().forEach(s=>{ if(!DB.templates.some(t=>t.categoria===s.categoria)) DB.templates.push(s); });
  save();
  Backend.lastHash=dbHash(DB);
  if(Backend.mode==='server') startSync();
}
function startSync(){
  setInterval(async()=>{
    if(document.hidden) return;
    if(state.view==='inspect') return;                              // não interrompe preenchimento
    const mr=document.getElementById('modal-root'); if(mr && mr.innerHTML) return; // nem com modal aberto
    try{
      const rem=await Backend.fetchDB(); if(!rem) return;
      const rh=dbHash(rem), ch=dbHash(DB);
      if(rh===ch){ Backend.lastHash=rh; return; }                   // já sincronizado
      if(ch!==Backend.lastHash) return;                             // temos alterações locais pendentes — não sobrescreve
      Object.keys(DB).forEach(k=>delete DB[k]); Object.assign(DB,rem); Backend.lastHash=rh; render();
    }catch(e){}
  }, 15000);
}

/* ---------- Templates de checklist (semente) ---------- */
function seedTemplates(){
  return [
    { id:uid(), nome:'Empilhadeira (Combustão / Elétrica)', categoria:'Empilhadeira', secoes:[
      { nome:'Movimentação de Carga', itens:['Garfos de Carga','Torre de Elevação e Garfos','Correntes de Elevação','Cilindros de Inclinação e Elevação','Freio de Carga (Içamento)'] },
      { nome:'Segurança do Operador', itens:['Estrutura de Proteção do Operador (ROPS)','Sistema de Freio (Serviço e Estacionamento)','Sirene de Movimentação e Giroflex','Iluminação Interna da Cabine'] },
      { nome:'Equipamentos e Painel', itens:['Fixação e Fechamento do Painel Elétrico','Aterramento Elétrico','Nível do Óleo do Motor (Combustão)','Filtro de Ar de Admissão'] },
    ]},
    { id:uid(), nome:'Ponte Rolante / Guindaste', categoria:'Ponte Rolante', secoes:[
      { nome:'Içamento e Carga', itens:['Anéis de Carga e Manilhas','Freio de Carga (Içamento)','Correntes de Elevação','Pintura de Identificação de Carga Máxima'] },
      { nome:'Fim de Curso e Sensores', itens:['Batentes de Fim de Curso de Translação','Dispositivo Fim de Curso de Elevação','Barreira Fotoelétrica (Cortina de Luz)'] },
      { nome:'Elétrica e Sinalização', itens:['Cabo Festoon (Alimentação)','Aterramento Elétrico','Sirene de Movimentação e Giroflex'] },
    ]},
    { id:uid(), nome:'Prensa / Injetora', categoria:'Prensa', secoes:[
      { nome:'Instrumentação e Vaso de Pressão', itens:['Válvula de Segurança Hidráulica (Duplo Canal)','Válvula de Segurança de Pressão','Válvula Reguladora de Fluxo Proporcional','Estanqueidade das Linhas de Ar'] },
      { nome:'Proteções de Segurança', itens:['Barreira Fotoelétrica (Cortina de Luz)','Fechadura de Segurança Elétrica','Sensor da Porta de Proteção'] },
      { nome:'Controle e Estrutura Elétrica', itens:['Fixação da Placa (Castanhas)','Visor do Painel Digital (Controlador)','Fixação e Fechamento do Painel Elétrico','Aterramento Elétrico'] },
    ]},
    { id:uid(), nome:'Torno / Centro de Usinagem', categoria:'Usinagem', secoes:[
      { nome:'Sistemas de Manutenção', itens:['Fixação da Placa (Castanhas)','Lubrificação das Guias Lineares','Unidade de Lubrificação Automática','Acúmulo de Lodo / Filtro de Retorno'] },
      { nome:'Pneumático e Elétrico', itens:['Filtro Regulador de Ar (Pneumático)','Controle e Estrutura Elétrica','Fixação e Fechamento do Painel Elétrico','Aterramento Elétrico'] },
    ]},
    { id:uid(), nome:'Máquina de Leak Teste (Estanqueidade)', categoria:'Leak Teste', secoes:[
      { nome:'Instrumentação e Pressão', itens:['Transdutor / Sensor de Pressão','Válvulas Solenoides de Enchimento','Regulador de Pressão de Entrada','Manômetro de Referência (Calibração)','Estanqueidade das Linhas Pneumáticas'] },
      { nome:'Vedação e Fixação da Peça', itens:['Vedações do Dispositivo (Selos / O-Rings)','Fixação / Clamps da Peça','Peça Master de Calibração','Conexões e Engates Rápidos'] },
      { nome:'Elétrica e Segurança', itens:['Fixação e Fechamento do Painel Elétrico','Aterramento Elétrico','Botão de Emergência','Proteção de Acesso / Intertravamento'] },
    ]},
    { id:uid(), nome:'Lavadora Industrial de Peças', categoria:'Lavadoras', secoes:[
      { nome:'Sistema Hidráulico', itens:['Bomba de Recirculação','Bicos de Aspersão (Jatos)','Filtro de Retorno / Decantação','Nível e Qualidade da Solução','Vazamentos / Estanqueidade'] },
      { nome:'Aquecimento e Secagem', itens:['Resistência de Aquecimento','Termostato / Controle de Temperatura','Sistema de Secagem (Soprador)','Exaustão de Vapores'] },
      { nome:'Elétrica e Segurança', itens:['Fixação e Fechamento do Painel Elétrico','Aterramento Elétrico','Intertravamento da Porta','Botão de Emergência'] },
    ]},
    { id:uid(), nome:'Nutrunner (Apertadeira Controlada)', categoria:'Nutrunner', secoes:[
      { nome:'Ferramenta e Aperto', itens:['Fuso / Soquete de Aperto','Transdutor de Torque','Verificação de Torque (Calibração)','Repetibilidade / Ângulo de Aperto'] },
      { nome:'Alimentação e Cabos', itens:['Cabo de Alimentação / Sinal','Conectores e Fixação','Mangueira Pneumática (se aplicável)'] },
      { nome:'Controlador e Segurança', itens:['Controlador / Visor Digital','Sinalização de OK / NOK','Fixação e Fechamento do Painel Elétrico','Aterramento Elétrico'] },
    ]},
    { id:uid(), nome:'Forno Fusor (Fusão)', categoria:'Forno Fusor', secoes:[
      { nome:'Câmara e Aquecimento', itens:['Revestimento Refratário / Cadinho','Resistências / Queimadores','Termopar / Controle de Temperatura','Isolamento Térmico e Vedação da Porta'] },
      { nome:'Exaustão e Gases', itens:['Sistema de Exaustão / Coifa','Válvulas de Gás e Estanqueidade','Detecção de Gás (se aplicável)'] },
      { nome:'Elétrica e Segurança', itens:['Fixação e Fechamento do Painel Elétrico','Aterramento Elétrico','Proteção Térmica de Acesso','Botão de Emergência','Sinalização de Alta Temperatura'] },
    ]},
    { id:uid(), nome:'Máquina Especial / Dedicada', categoria:'Máquina Especial', secoes:[
      { nome:'Estrutura e Movimentação', itens:['Estrutura e Fixação da Base','Guias / Atuadores Lineares','Sistema Pneumático / Hidráulico','Sensores de Posição'] },
      { nome:'Controle e Automação', itens:['CLP / Controlador','Interface (IHM / Visor)','Sensores e Fim de Curso'] },
      { nome:'Proteções de Segurança', itens:['Grades / Proteções de Segurança','Barreira Fotoelétrica (Cortina de Luz)','Botão de Emergência','Fixação e Fechamento do Painel Elétrico','Aterramento Elétrico'] },
    ]},
    { id:uid(), nome:'Checklist Genérico', categoria:'Geral', secoes:[
      { nome:'Verificações Gerais', itens:['Estrutura e Fixação','Aterramento Elétrico','Sistema de Freio / Parada de Emergência','Sinalização e Identificação','Proteções de Segurança','Vazamentos / Lubrificação'] },
    ]},
  ];
}
function seedDB(){
  return {
    meta:{version:1, createdAt:new Date().toISOString()},
    settings:{ empresa:'CheckSync ETG System', cnpj:'10.294.029/0001-90', logo:'',
      inspetorPadrao:'', cargoPadrao:'Inspetor Técnico', registroPadrao:'', theme:'dark', seq:1 },
    assets:[], laudos:[], templates: seedTemplates(),
  };
}
const CATS = ['Empilhadeira','Ponte Rolante','Prensa','Usinagem','Motor / Bomba','Vaso de Pressão','Ferramentaria','Leak Teste','Lavadoras','Nutrunner','Forno Fusor','Máquina Especial','Geral'];

/* ---------- Router / estado UI ---------- */
const state = { view:'dashboard', assetSearch:'', laudoSearch:'', navOpen:false };
const app = $('#app');

function render(){
  applyTheme();
  app.innerHTML = sidebar() + '<div class="scrim" data-act="closeNav"></div><main class="main">'+ viewHTML() +'</main>';
  const mount = VIEWS[state.view] && VIEWS[state.view].mount;
  if(mount) mount($('.main'));
}
function go(view){ state.view=view; state.navOpen=false; app.classList.remove('nav-open'); window.scrollTo(0,0); render(); }

function applyTheme(){
  const t = DB.settings.theme==='light'?'light':'dark';
  document.documentElement.setAttribute('data-theme', t);
}

/* ---------- Sidebar ---------- */
function navItem(id, icon, label, count){
  return `<button data-act="go" data-view="${id}" class="${state.view===id?'active':''}">${icon}<span>${label}</span>${count!=null?`<span class="count">${count}</span>`:''}</button>`;
}
function connBadge(){
  if(Backend.mode==='server'){
    const f=(Backend.server&&(Backend.server.data||Backend.server.folder))||'';
    return `<button class="btn ghost sm" data-act="syncNow" title="Base: ${esc(f)}\n(clique para atualizar agora)" style="justify-content:center"><span class="badge b-ok" style="border:none;background:none;padding:0;gap:6px"><span class="dot"></span></span><span style="color:var(--ok);font-weight:700">Base compartilhada</span></button>`;
  }
  return `<div class="pill-row" style="justify-content:center;padding:2px 0"><span class="badge b-info"><span class="dot"></span>Local (este aparelho)</span></div>`;
}
function sidebar(){
  const s=DB.settings;
  return `<aside class="sidebar">
    <div class="brand">
      <div class="logo">${s.logo?`<img src="${esc(s.logo)}" style="width:100%;height:100%;object-fit:contain;border-radius:11px">`:'CS'}</div>
      <div><h1>CheckSync ETG</h1><span>INSPEÇÃO INDUSTRIAL</span></div>
    </div>
    <nav class="nav">
      ${navItem('dashboard', I.gauge, 'Painel')}
      ${navItem('assets', I.box, 'Ativos', DB.assets.length)}
      ${navItem('inspect', I.clipboard, 'Nova Inspeção')}
      ${navItem('laudos', I.file, 'Laudos', DB.laudos.length)}
      ${navItem('import', I.upload, 'Importar Excel')}
      ${navItem('settings', I.cog, 'Configurações')}
    </nav>
    <div class="side-foot">
      ${connBadge()}
      <button class="btn ghost sm" data-act="toggleTheme" style="justify-content:center">${DB.settings.theme==='light'?I.moon:I.sun}<span>Tema ${DB.settings.theme==='light'?'Escuro':'Claro'}</span></button>
      <small>${esc(s.empresa||'')}<br>CNPJ ${esc(s.cnpj||'—')}</small>
    </div>
  </aside>`;
}

/* ---------- Topbar helper ---------- */
function topbar(title, sub, actions=''){
  return `<div class="topbar">
    <button class="btn icon ghost menu-toggle no-print" data-act="openNav">${I.menu}</button>
    <div class="htxt"><h2>${esc(title)}</h2>${sub?`<p>${esc(sub)}</p>`:''}</div>
    <div class="sp"></div>${actions}</div>`;
}

/* ================= VIEWS ================= */
const VIEWS = {};

/* ---------- DASHBOARD ---------- */
VIEWS.dashboard = {
  html(){
    const assets=DB.assets, laudos=DB.laudos;
    const byStatus={operacional:0,manutencao:0,interditado:0};
    assets.forEach(a=>{ byStatus[a.status]=(byStatus[a.status]||0)+1; });
    const stats = laudos.map(laudoStats);
    const avgConf = stats.length? Math.round(stats.reduce((s,x)=>s+x.conf,0)/stats.length) : 0;
    const totalAcoes = stats.reduce((s,x)=>s+x.acoes,0);
    const semInsp = assets.filter(a=>!a.ultimaInspecao).length;
    const recent = [...laudos].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,6);

    const kpi=(icon,lbl,val,sub,color)=>`<div class="card kpi">
      <div class="lbl">${icon}${lbl}</div><div class="val" style="${color?`color:${color}`:''}">${val}</div><div class="sub">${sub}</div></div>`;

    let recentHTML;
    if(!recent.length){
      recentHTML = emptyBox(I.file,'Nenhum laudo emitido','Crie sua primeira inspeção para ver o histórico aqui.',
        `<button class="btn primary" data-act="go" data-view="inspect">${I.plus}Nova Inspeção</button>`);
    } else {
      recentHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Laudo</th><th>Ativo</th><th>Data</th><th>Conformidade</th><th>Status</th><th></th></tr></thead><tbody>`+
        recent.map(l=>{ const st=laudoStats(l); const f=FINAL_ST[l.statusFinal]||FINAL_ST['APROVADO'];
          return `<tr>
            <td><span class="tag-chip">${esc(l.numero)}</span></td>
            <td><b>${esc(l.assetSnapshot.nome)}</b>${l.assetSnapshot.tag?`<br><small class="mut">${esc(l.assetSnapshot.tag)}</small>`:''}</td>
            <td class="mut">${fmtDate(l.data)}</td>
            <td><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="width:70px"><i style="width:${st.conf}%"></i></div><b class="sm">${st.conf}%</b></div></td>
            <td><span class="badge ${f.b}"><span class="dot"></span>${esc(shortStatus(l.statusFinal))}</span></td>
            <td class="row-actions"><button class="btn sm ghost" data-act="viewLaudo" data-id="${l.id}">${I.eye}</button></td>
          </tr>`; }).join('')+
        `</tbody></table></div>`;
    }

    // status breakdown bars
    const total=assets.length||1;
    const sb=(k)=>{ const v=byStatus[k]||0; const st=ASSET_ST[k]; const pct=Math.round(v/total*100);
      return `<div class="stat-row"><span class="badge ${st.b}"><span class="dot"></span>${st.lbl}</span><div class="bar" style="flex:1"><i style="width:${assets.length?pct:0}%;background:${k==='operacional'?'var(--ok)':k==='manutencao'?'var(--warn)':'var(--bad)'}"></i></div><b>${v}</b></div>`; };

    return topbar('Painel de Controle','Visão geral do parque de ativos e das inspeções')+
    `<div class="grid kpis">
      ${kpi(I.box,'Ativos Cadastrados', assets.length, `${semInsp} nunca inspecionado(s)`)}
      ${kpi(I.file,'Laudos Emitidos', laudos.length, 'Relatórios técnicos gerados')}
      ${kpi(I.gauge,'Conformidade Média', avgConf+'%', 'Média geral dos checklists', avgConf>=85?'var(--ok)':avgConf>=60?'var(--warn)':'var(--bad)')}
      ${kpi(I.alert,'Ações Corretivas', totalAcoes, 'Itens com restrição / não conf.', totalAcoes?'var(--warn)':'var(--ok)')}
    </div>
    <div class="grid" style="grid-template-columns:1.6fr 1fr;margin-top:16px;align-items:start">
      <div class="card pad"><div class="section-title" style="margin-top:0">${I.file}<span>Laudos Recentes</span><span class="sp"></span><button class="btn sm ghost" data-act="go" data-view="laudos">Ver todos</button></div>${recentHTML}</div>
      <div class="card pad"><div class="section-title" style="margin-top:0">${I.factory}<span>Situação dos Ativos</span></div>
        ${assets.length?'':'<p class="mut sm" style="margin-bottom:8px">Nenhum ativo cadastrado ainda.</p>'}
        <div class="mini-list">${sb('operacional')}${sb('manutencao')}${sb('interditado')}</div>
        <div class="divider"></div>
        <button class="btn primary" data-act="go" data-view="inspect" style="width:100%;justify-content:center">${I.clipboard}Iniciar Nova Inspeção</button>
        <button class="btn ghost" data-act="go" data-view="assets" style="width:100%;justify-content:center;margin-top:8px">${I.plus}Cadastrar Ativo</button>
      </div>
    </div>`;
  }
};
function shortStatus(s){ return s==='APROVADO COM RESTRIÇÕES'?'C/ Restrições' : s==='REPROVADO / INTERDITADO'?'Reprovado' : 'Aprovado'; }
function emptyBox(icon,title,txt,action=''){ return `<div class="empty">${icon}<h3>${esc(title)}</h3><p>${esc(txt)}</p>${action}</div>`; }

/* ---------- ATIVOS ---------- */
VIEWS.assets = {
  html(){
    const q=state.assetSearch.toLowerCase();
    let list=DB.assets;
    if(q) list=list.filter(a=>[a.nome,a.tag,a.categoria,a.setor].some(v=>(v||'').toLowerCase().includes(q)));
    list=[...list].sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
    const actions=`<button class="btn primary" data-act="assetNew">${I.plus}Novo Ativo</button>`;
    let body;
    if(!DB.assets.length){
      body=emptyBox(I.box,'Nenhum ativo cadastrado','Cadastre equipamentos manualmente ou importe uma planilha Excel em lote.',
        `<div class="pill-row" style="justify-content:center"><button class="btn primary" data-act="assetNew">${I.plus}Cadastrar Ativo</button><button class="btn" data-act="go" data-view="import">${I.upload}Importar Excel</button></div>`);
    } else if(!list.length){
      body=emptyBox(I.search,'Nada encontrado','Nenhum ativo corresponde à sua busca.');
    } else {
      body=`<div class="asset-grid">`+list.map(a=>{ const st=ASSET_ST[a.status]||ASSET_ST.operacional;
        const nInsp=DB.laudos.filter(l=>l.assetId===a.id).length;
        return `<div class="card asset-card">
          <div class="thumb">${a.foto?`<img src="${esc(a.foto)}" alt="">`:`<div class="noimg">${I.factory}</div>`}
            <div class="st"><span class="badge ${st.b}"><span class="dot"></span>${st.lbl}</span></div></div>
          <div class="body">
            <h4>${esc(a.nome)}</h4>
            <div class="meta">
              ${a.tag?`<span>TAG <b>${esc(a.tag)}</b></span>`:''}
              ${a.categoria?`<span>${esc(a.categoria)}</span>`:''}
              ${a.setor?`<span>${esc(a.setor)}</span>`:''}
            </div>
            <div class="meta"><span>${nInsp} laudo(s)</span><span>Últ.: ${a.ultimaInspecao?fmtDate(a.ultimaInspecao):'—'}</span></div>
            <div class="foot">
              <button class="btn sm primary" data-act="inspectAsset" data-id="${a.id}" style="flex:1;justify-content:center">${I.clipboard}Inspecionar</button>
              <button class="btn sm icon ghost" title="Editar" data-act="assetEdit" data-id="${a.id}">${I.edit}</button>
              <button class="btn sm icon danger" title="Excluir" data-act="assetDel" data-id="${a.id}">${I.trash}</button>
            </div>
          </div></div>`; }).join('')+`</div>`;
    }
    return topbar('Ativos Cadastrados', DB.assets.length+' equipamento(s) no sistema', actions)+
      `<div class="topbar" style="margin-bottom:16px"><div class="search">${I.search}<input class="input" id="assetSearch" placeholder="Buscar por nome, TAG, setor..." value="${esc(state.assetSearch)}"></div></div>`+
      body;
  },
  mount(root){
    const inp=$('#assetSearch',root);
    if(inp) inp.oninput=()=>{ state.assetSearch=inp.value; const html=VIEWS.assets.html(); /* re-render only list part */ render(); const ni=$('#assetSearch'); if(ni){ni.focus(); ni.setSelectionRange(ni.value.length,ni.value.length);} };
  }
};

/* ---------- IMPORTAR (xlsx/csv) ---------- */
const IMPORT_COLS=['nome','tag','categoria','setor','status','descricao'];
const COL_LABELS={nome:'Nome da Máquina*',tag:'TAG',categoria:'Categoria',setor:'Setor (FND/USI/MMO/MSC)',status:'Status',descricao:'Descrição'};
VIEWS.import = {
  html(){
    const n=DB.assets.length;
    return topbar('Alimentar Base via Planilha','Baixe, edite e envie um arquivo .xlsx ou .csv para cadastrar ou atualizar ativos em lote')+
    `<div class="grid" style="grid-template-columns:1fr 1fr;align-items:start">
      <div class="card pad">
        <div class="section-title" style="margin-top:0">${I.download}<span>1. Baixar Planilha</span></div>
        <div class="card pad" style="background:var(--panel-2);box-shadow:none;margin-bottom:12px">
          <b style="font-size:13px">Modelo em branco</b>
          <p class="mut sm" style="margin:4px 0 10px">Planilha com as colunas e alguns exemplos — use para o <b>primeiro cadastro</b>.</p>
          <div class="pill-row">
            <button class="btn primary" data-act="tplXlsx">${I.file}Modelo (.xlsx)</button>
            <button class="btn" data-act="tplCsv">${I.file}Modelo (.csv)</button>
          </div>
        </div>
        <div class="card pad" style="background:var(--panel-2);box-shadow:none">
          <b style="font-size:13px">Base atual ${n?`<span class="tag-chip" style="margin-left:4px">${n} ativo(s)</span>`:''}</b>
          <p class="mut sm" style="margin:4px 0 10px">Exporta os ativos <b>já cadastrados</b> para você editar no Excel e reenviar com as <b>novas informações</b>.</p>
          <div class="pill-row">
            <button class="btn primary" data-act="expXlsx" ${n?'':'disabled'}>${I.download}Exportar base (.xlsx)</button>
            <button class="btn" data-act="expCsv" ${n?'':'disabled'}>${I.download}Exportar (.csv)</button>
          </div>
          ${n?'':'<p class="hint" style="margin-top:8px">Nenhum ativo cadastrado ainda — comece pelo modelo em branco.</p>'}
        </div>
        <div class="divider"></div>
        <div class="section-title" style="margin-top:0">${I.clipboard}<span>Colunas</span></div>
        <div class="pill-row">${IMPORT_COLS.map(c=>`<span class="tag-chip">${esc(COL_LABELS[c])}</span>`).join('')}</div>
        <p class="hint" style="margin-top:10px">Status aceitos: <b>operacional</b>, <b>manutencao</b>, <b>interditado</b>. Ativos com a mesma <b>TAG</b> (ou mesmo nome) são <b>atualizados</b> em vez de duplicados — por isso o ciclo exportar → editar → reenviar funciona sem gerar cópias.</p>
      </div>
      <div class="card pad">
        <div class="section-title" style="margin-top:0">${I.upload}<span>2. Enviar Planilha Preenchida</span></div>
        <p class="mut sm" style="margin-bottom:12px">Novos ativos são <b>cadastrados</b> e os existentes (mesma TAG/nome) são <b>atualizados</b> automaticamente.</p>
        <div class="dropzone" id="dz">
          ${I.upload}
          <b>Arraste seu arquivo aqui</b>
          <small>ou clique para selecionar — .xlsx, .xls ou .csv</small>
          <input type="file" id="fileImp" accept=".xlsx,.xls,.csv" class="hidden">
        </div>
        <div id="impResult" style="margin-top:16px"></div>
      </div>
    </div>`;
  },
  mount(root){
    const dz=$('#dz',root), inp=$('#fileImp',root);
    dz.onclick=()=>inp.click();
    dz.ondragover=e=>{e.preventDefault();dz.classList.add('drag');};
    dz.ondragleave=()=>dz.classList.remove('drag');
    dz.ondrop=e=>{e.preventDefault();dz.classList.remove('drag'); if(e.dataTransfer.files[0]) window.__CS_handleImport(e.dataTransfer.files[0]); };
    inp.onchange=()=>{ if(inp.files[0]) window.__CS_handleImport(inp.files[0]); };
  }
};

/* ---------- LAUDOS ---------- */
VIEWS.laudos = {
  html(){
    const q=state.laudoSearch.toLowerCase();
    let list=[...DB.laudos].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    if(q) list=list.filter(l=>[l.numero,l.assetSnapshot.nome,l.assetSnapshot.tag,l.inspetor,l.statusFinal].some(v=>(v||'').toLowerCase().includes(q)));
    let body;
    if(!DB.laudos.length){
      body=emptyBox(I.file,'Nenhum laudo emitido','Os relatórios técnicos que você gerar aparecerão aqui, prontos para visualizar e imprimir em PDF.',
        `<button class="btn primary" data-act="go" data-view="inspect">${I.plus}Nova Inspeção</button>`);
    } else if(!list.length){
      body=emptyBox(I.search,'Nada encontrado','Nenhum laudo corresponde à sua busca.');
    } else {
      body=`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Laudo</th><th>Ativo</th><th>Inspetor</th><th>Data</th><th>Conform.</th><th>Status Final</th><th></th></tr></thead><tbody>`+
        list.map(l=>{ const st=laudoStats(l); const f=FINAL_ST[l.statusFinal]||FINAL_ST['APROVADO'];
          return `<tr>
            <td><span class="tag-chip">${esc(l.numero)}</span></td>
            <td><b>${esc(l.assetSnapshot.nome)}</b>${l.assetSnapshot.tag?`<br><small class="mut">${esc(l.assetSnapshot.tag)}</small>`:''}</td>
            <td>${esc(l.inspetor||'—')}</td>
            <td class="mut">${fmtDate(l.data)}</td>
            <td><b>${st.conf}%</b> <small class="mut">(${st.aval})</small></td>
            <td><span class="badge ${f.b}"><span class="dot"></span>${esc(shortStatus(l.statusFinal))}</span></td>
            <td class="row-actions">
              <button class="btn sm ghost icon" title="Visualizar" data-act="viewLaudo" data-id="${l.id}">${I.eye}</button>
              <button class="btn sm ghost icon" title="Imprimir/PDF" data-act="printLaudo" data-id="${l.id}">${I.print}</button>
              <button class="btn sm danger icon" title="Excluir" data-act="laudoDel" data-id="${l.id}">${I.trash}</button>
            </td></tr>`; }).join('')+`</tbody></table></div>`;
    }
    return topbar('Laudos Emitidos','Histórico de relatórios de inspeção técnica',
      DB.laudos.length?`<button class="btn primary" data-act="go" data-view="inspect">${I.plus}Nova Inspeção</button>`:'')+
      (DB.laudos.length?`<div class="topbar" style="margin-bottom:16px"><div class="search">${I.search}<input class="input" id="laudoSearch" placeholder="Buscar laudo, ativo, inspetor..." value="${esc(state.laudoSearch)}"></div></div>`:'')+
      body;
  },
  mount(root){
    const inp=$('#laudoSearch',root);
    if(inp) inp.oninput=()=>{ state.laudoSearch=inp.value; render(); const ni=$('#laudoSearch'); if(ni){ni.focus(); ni.setSelectionRange(ni.value.length,ni.value.length);} };
  }
};

/* ---------- SETTINGS ---------- */
VIEWS.settings = {
  html(){
    const s=DB.settings;
    return topbar('Configurações','Dados da empresa, backup e templates')+
    `<div class="grid" style="grid-template-columns:1fr 1fr;align-items:start">
      <div class="card pad">
        <div class="section-title" style="margin-top:0">${I.shield}<span>Identificação da Empresa</span></div>
        <div class="form-grid">
          <div class="field full"><label>Nome / Razão Social</label><input class="input" id="setEmpresa" value="${esc(s.empresa||'')}"></div>
          <div class="field"><label>CNPJ</label><input class="input" id="setCnpj" value="${esc(s.cnpj||'')}"></div>
          <div class="field"><label>Logo (aparece no laudo)</label><input type="file" id="setLogo" accept="image/*" class="input"></div>
          <div class="field"><label>Inspetor padrão</label><input class="input" id="setInsp" value="${esc(s.inspetorPadrao||'')}" placeholder="Nome do inspetor"></div>
          <div class="field"><label>Cargo padrão</label><input class="input" id="setCargo" value="${esc(s.cargoPadrao||'')}"></div>
          <div class="field full"><label>Registro Técnico padrão (RE / CREA)</label><input class="input" id="setReg" value="${esc(s.registroPadrao||'')}"></div>
        </div>
        <div class="pill-row" style="margin-top:14px">
          ${s.logo?`<div class="photo-box" style="width:90px;aspect-ratio:1"><img src="${esc(s.logo)}"></div><button class="btn sm danger" data-act="setLogoDel">Remover logo</button>`:''}
          <span class="sp" style="flex:1"></span>
          <button class="btn primary" data-act="setSave">${I.save}Salvar</button>
        </div>
      </div>
      <div class="card pad">
        <div class="section-title" style="margin-top:0">${I.save}<span>Backup & Restauração</span></div>
        <p class="mut sm" style="margin-bottom:12px">Os dados ficam salvos no navegador via <b>IndexedDB</b> (suporta muitas fotos). Faça backup para não perder e para migrar de computador.</p>
        <div class="pill-row">
          <button class="btn primary" data-act="backupExport">${I.download}Baixar Backup (.json)</button>
          <button class="btn" data-act="backupImport">${I.upload}Restaurar Backup</button>
          <input type="file" id="restoreFile" accept=".json" class="hidden">
        </div>
        <div class="divider"></div>
        <div class="section-title" style="margin-top:0">${I.clipboard}<span>Templates de Checklist</span></div>
        <div class="mini-list">${DB.templates.map(t=>`<div class="stat-row"><span class="nm">${esc(t.nome)}</span><span class="tag-chip">${t.secoes.reduce((n,se)=>n+se.itens.length,0)} itens</span></div>`).join('')||'<p class="mut sm">Nenhum template.</p>'}</div>
        <div class="divider"></div>
        <div class="section-title" style="margin-top:0;color:var(--bad)">${I.alert}<span>Zona de Risco</span></div>
        <button class="btn danger" data-act="wipe">${I.trash}Apagar todos os dados</button>
      </div>
    </div>`;
  },
  mount(root){
    const lf=$('#setLogo',root);
    if(lf) lf.onchange=async()=>{ const f=lf.files[0]; if(!f) return; const d=await readFileData(f); DB.settings.logo=await shrinkImage(d,300,0.9); save(); render(); toast('Logo atualizado'); };
    const rf=$('#restoreFile',root);
    if(rf) rf.onchange=()=>{ if(rf.files[0]) window.__CS_restore(rf.files[0]); };
  }
};

/* view dispatcher */
function viewHTML(){ return (VIEWS[state.view]||VIEWS.dashboard).html(); }

/* expose (compartilhado com a parte 2) */
window.__CS = { get DB(){return DB;}, save, render, go, state, clearStore, backend:Backend };
window.__CS_render = render;
window.__CS_go = go;
window.__CS_ICONS = I;
window.__CS_VIEWS = VIEWS;
window.__CS_topbar = topbar;
window.__CS_emptyBox = emptyBox;
window.__CS_toast = toast;

/* boot */
wireGlobalEvents();
app.innerHTML='<div style="display:grid;place-items:center;height:100vh;color:var(--muted);font-weight:600">Carregando…</div>';
load().then(render).catch(()=>{ DB=DB||seedDB(); render(); });

/* ================= EVENTOS GLOBAIS ================= */
function wireGlobalEvents(){
  document.addEventListener('click', e=>{
    const t=e.target.closest('[data-act]'); if(!t) return;
    const act=t.dataset.act, id=t.dataset.id, view=t.dataset.view;
    const A=window.__CS_actions;
    switch(act){
      case 'go': go(view); break;
      case 'openNav': app.classList.add('nav-open'); break;
      case 'closeNav': app.classList.remove('nav-open'); break;
      case 'toggleTheme': DB.settings.theme = DB.settings.theme==='light'?'dark':'light'; save(); render(); break;
      case 'syncNow': (async()=>{ try{ const rem=await Backend.fetchDB(); if(rem){ Object.keys(DB).forEach(k=>delete DB[k]); Object.assign(DB,rem); Backend.lastHash=dbHash(DB); render(); toast('Base atualizada'); } else toast('Base vazia'); }catch(e){ toast('Não foi possível atualizar a base','err'); } })(); break;
      case 'assetNew': A.assetForm(); break;
      case 'assetEdit': A.assetForm(id); break;
      case 'assetDel': A.assetDel(id); break;
      case 'inspectAsset': A.startInspection(id); break;
      case 'inspectNew': A.startInspection(); break;
      case 'viewLaudo': A.viewLaudo(id); break;
      case 'printLaudo': A.printLaudo(id); break;
      case 'laudoDel': A.laudoDel(id); break;
      case 'tplXlsx': A.downloadTemplateXlsx(); break;
      case 'tplCsv': A.downloadTemplateCsv(); break;
      case 'expXlsx': A.exportAssetsXlsx(); break;
      case 'expCsv': A.exportAssetsCsv(); break;
      case 'setSave': A.settingsSave(); break;
      case 'setLogoDel': DB.settings.logo=''; save(); render(); break;
      case 'backupExport': A.backupExport(); break;
      case 'backupImport': $('#restoreFile').click(); break;
      case 'wipe': A.wipe(); break;
      case 'closeModal': window.__CS_closeModal && window.__CS_closeModal(); break;
    }
  });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && window.__CS_closeModal) window.__CS_closeModal(); });
}

})();
