/* ============================================================
   CheckSync ETG — Parte 2: modais, inspeção, laudo/PDF, import
   (continua no mesmo IIFE via variáveis globais expostas)
   ============================================================ */
(function(){
"use strict";
const DBref = ()=>window.__CS.DB;
const save = ()=>window.__CS.save();
const render = ()=>window.__CS_render();
const go = v=>window.__CS_go(v);
const state = window.__CS.state;

/* utils reaproveitados */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const todayISO=()=>new Date().toISOString().slice(0,10);
const fmtDate=iso=>{ if(!iso) return '—'; const d=new Date(iso.length<=10?iso+'T00:00:00':iso); return isNaN(d)?iso:d.toLocaleDateString('pt-BR'); };
function toast(m,k='ok'){ window.__CS_toast(m,k); }
const topbar=window.__CS_topbar, emptyBox=window.__CS_emptyBox;
function download(name,data,type='application/octet-stream'){ const blob=data instanceof Blob?data:new Blob([data],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),400); }
function readData(f){ return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);}); }
function readBuf(f){ return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsArrayBuffer(f);}); }
function readText(f){ return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsText(f);}); }
async function shrink(dataURL,max=1000,q=0.8){ return new Promise(res=>{const img=new Image();img.onload=()=>{let w=img.width,h=img.height;const sc=Math.min(1,max/Math.max(w,h));w=Math.round(w*sc);h=Math.round(h*sc);const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(img,0,0,w,h);res(cv.toDataURL('image/jpeg',q));};img.onerror=()=>res(dataURL);img.src=dataURL;}); }

const ITEM_ST={C:'Conforme',R:'Restrição',NC:'Não Conforme',NA:'N/A'};
const FINAL_ST={'APROVADO':{bg:'#dcfce7',fg:'#15803d'},'APROVADO COM RESTRIÇÕES':{bg:'#fef3c7',fg:'#b45309'},'REPROVADO / INTERDITADO':{bg:'#fee2e2',fg:'#b91c1c'}};
function finalFromItems(itens){let nc=false,r=false,any=false;itens.forEach(it=>{if(it.status==='NC'){nc=true;any=true;}else if(it.status==='R'){r=true;any=true;}else if(it.status==='C')any=true;});if(!any)return'APROVADO';if(nc)return'REPROVADO / INTERDITADO';if(r)return'APROVADO COM RESTRIÇÕES';return'APROVADO';}
function laudoStats(l){let C=0,R=0,NC=0,NA=0,a=0;l.itens.forEach(it=>{if(it.status==='C'){C++;a++;}else if(it.status==='R'){R++;a++;}else if(it.status==='NC'){NC++;a++;}else if(it.status==='NA')NA++;});return{C,R,NC,NA,aval:a,conf:a?Math.round(C/a*100):0,acoes:R+NC};}

/* icons subset */
const I=window.__CS_ICONS;

/* ================= MODAL ================= */
function openModal(html){ const root=$('#modal-root'); root.innerHTML=`<div class="modal-bg" data-act="closeModalBg">${html}</div>`;
  root.querySelector('.modal-bg').addEventListener('mousedown',e=>{ if(e.target===e.currentTarget) closeModal(); });
  document.body.style.overflow='hidden'; return root.querySelector('.modal'); }
function closeModal(){ $('#modal-root').innerHTML=''; document.body.style.overflow=''; }
window.__CS_closeModal=closeModal;
window.__CS_photoView=function(src){ const r=$('#modal-root'); r.innerHTML=`<div class="modal-bg" style="place-items:center;padding:20px"><img src="${src}" style="max-width:96vw;max-height:92vh;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.6)"></div>`; document.body.style.overflow='hidden'; r.querySelector('.modal-bg').onclick=closeModal; };

/* ================= ACTIONS ================= */
const A={};
window.__CS_actions=A;

/* ---------- Ativo: form ---------- */
const CATS=['Empilhadeira','Ponte Rolante','Prensa','Usinagem','Motor / Bomba','Vaso de Pressão','Ferramentaria','Leak Teste','Lavadoras','Nutrunner','Forno Fusor','Máquina Especial','Geral'];
const SETORES=['FND','USI','MMO','MSC'];
A.assetForm=function(id){
  const DB=DBref();
  const a = id? Object.assign({}, DB.assets.find(x=>x.id===id)) : {id:'',nome:'',tag:'',categoria:'',setor:'',status:'operacional',foto:'',descricao:''};
  const setorOpts = SETORES.slice(); if(a.setor && !setorOpts.includes(a.setor)) setorOpts.push(a.setor);
  const opt=(v,cur)=>`<option value="${esc(v)}" ${v===cur?'selected':''}>${esc(v)}</option>`;
  openModal(`<div class="modal">
    <div class="modal-head">${I.box}<h3>${id?'Editar Ativo':'Cadastrar Ativo'}</h3><button class="btn icon ghost" data-act="closeModal">${I.x}</button></div>
    <div class="modal-body">
      <div class="grid" style="grid-template-columns:200px 1fr;align-items:start">
        <div>
          <label class="field" style="margin-bottom:6px"><span style="font-size:12px;font-weight:700;color:var(--muted)">Foto do Equipamento</span></label>
          <div class="photo-box" id="afPhotoBox">${a.foto?`<img src="${esc(a.foto)}">`:`<div class="ph">${I.image}<div>Sem foto</div></div>`}</div>
          <input type="file" id="afPhoto" accept="image/*" class="hidden">
          <div class="pill-row" style="margin-top:8px">
            <button class="btn sm" id="afPhotoBtn" style="flex:1;justify-content:center">${I.image}Foto</button>
            ${a.foto?`<button class="btn sm danger icon" id="afPhotoDel">${I.trash}</button>`:''}
          </div>
        </div>
        <div class="form-grid">
          <div class="field full"><label>Nome da Máquina <span class="req">*</span></label><input class="input" id="afNome" value="${esc(a.nome)}" placeholder="Ex.: Empilhadeira Toyota 8FG25"></div>
          <div class="field"><label>Nº do Ativo</label><input class="input" id="afTag" value="${esc(a.tag)}" placeholder="Ex.: 014 / EMP-014"></div>
          <div class="field"><label>Categoria</label><select class="input" id="afCat"><option value="">Selecione…</option>${CATS.map(c=>opt(c,a.categoria)).join('')}</select></div>
          <div class="field"><label>Setor</label><select class="input" id="afSetor"><option value="">Selecione…</option>${setorOpts.map(c=>opt(c,a.setor)).join('')}</select></div>
          <div class="field full"><label>Status Operacional</label><select class="input" id="afStatus">
            <option value="operacional" ${a.status==='operacional'?'selected':''}>Ativo / Operacional</option>
            <option value="manutencao" ${a.status==='manutencao'?'selected':''}>Em Manutenção</option>
            <option value="interditado" ${a.status==='interditado'?'selected':''}>Interditado</option></select></div>
          <div class="field full"><label>Descrição / Observações</label><textarea class="input" id="afDesc" placeholder="Opcional">${esc(a.descricao)}</textarea></div>
        </div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn primary" id="afSave">${I.save}Salvar Ativo</button></div>
  </div>`);
  let foto=a.foto;
  $('#afPhotoBtn').onclick=()=>$('#afPhoto').click();
  $('#afPhoto').onchange=async()=>{ const f=$('#afPhoto').files[0]; if(!f) return; foto=await shrink(await readData(f),1000,0.82); $('#afPhotoBox').innerHTML=`<img src="${foto}">`; };
  const del=$('#afPhotoDel'); if(del) del.onclick=()=>{ foto=''; $('#afPhotoBox').innerHTML=`<div class="ph">${I.image}<div>Sem foto</div></div>`; };
  $('#afSave').onclick=()=>{
    const nome=$('#afNome').value.trim();
    if(!nome){ toast('Informe o nome da máquina','err'); $('#afNome').focus(); return; }
    const rec={ id:id||uid(), nome,
      tag:$('#afTag').value.trim(), categoria:$('#afCat').value,
      setor:$('#afSetor').value, status:$('#afStatus').value, foto, descricao:$('#afDesc').value.trim(),
      updatedAt:new Date().toISOString() };
    if(id){ const i=DB.assets.findIndex(x=>x.id===id); rec.createdAt=DB.assets[i].createdAt; rec.ultimaInspecao=DB.assets[i].ultimaInspecao; DB.assets[i]=rec; }
    else { // dedup por TAG
      const dup = rec.tag && DB.assets.find(x=>x.tag && x.tag.toLowerCase()===rec.tag.toLowerCase());
      rec.createdAt=new Date().toISOString(); rec.ultimaInspecao=null;
      if(dup){ rec.id=dup.id; rec.createdAt=dup.createdAt; rec.ultimaInspecao=dup.ultimaInspecao; DB.assets[DB.assets.indexOf(dup)]=rec; toast('Ativo com este Nº atualizado'); }
      else DB.assets.push(rec);
    }
    save(); closeModal(); render(); toast(id?'Ativo atualizado':'Ativo cadastrado');
  };
  setTimeout(()=>$('#afNome').focus(),50);
};
A.assetDel=function(id){
  const DB=DBref(); const a=DB.assets.find(x=>x.id===id); if(!a) return;
  confirmModal('Excluir ativo?', `O ativo <b>${esc(a.nome)}</b> será removido. Os laudos já emitidos serão mantidos.`, 'Excluir', ()=>{
    DB.assets=DB.assets.filter(x=>x.id!==id); save(); closeModal(); render(); toast('Ativo excluído');
  });
};

/* ---------- Confirm modal ---------- */
function confirmModal(title,msg,okLabel,onOk,danger=true){
  openModal(`<div class="modal" style="max-width:440px">
    <div class="modal-head">${danger?I.alert:I.check}<h3>${esc(title)}</h3></div>
    <div class="modal-body"><p class="mut">${msg}</p></div>
    <div class="modal-foot"><button class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn ${danger?'danger':'primary'}" id="cfmOk">${esc(okLabel)}</button></div></div>`);
  $('#cfmOk').onclick=onOk;
}

/* ================= INSPEÇÃO ================= */
A.startInspection=function(assetId){
  const DB=DBref();
  // se nenhum ativo foi passado, usa o primeiro da lista (evita "selecione o ativo" ao gerar)
  const asset = (assetId?DB.assets.find(x=>x.id===assetId):null) || DB.assets[0] || null;
  let tpl=DB.templates[0];
  if(asset){ const m=DB.templates.find(t=>t.categoria===asset.categoria); if(m) tpl=m; }
  state.insp={
    assetId: asset?asset.id:'', templateId: tpl?tpl.id:'',
    inspetor: DB.settings.inspetorPadrao||'', cargo: DB.settings.cargoPadrao||'',
    matricula: DB.settings.matriculaPadrao||'', data: todayISO(),
    aprovadoPor:'', parecer:'', statusOverride:'', assinatura:'',
    itens: buildItens(tpl),
  };
  go('inspect');
};
function buildItens(tpl){ if(!tpl) return []; const out=[]; tpl.secoes.forEach(se=>se.itens.forEach(it=>out.push({secao:se.nome,item:it,status:'',obs:'',fotos:[]}))); return out; }

window.__CS_VIEWS.inspect={
  html(){
    const DB=DBref();
    if(!DB.assets.length){
      return topbar('Nova Inspeção','Cadastre um ativo para inspecionar')+
        emptyBox(I.box,'Cadastre um ativo primeiro','A inspeção é vinculada a um equipamento registrado. Cadastre ao menos um ativo (ou importe uma planilha).',
        `<div class="pill-row" style="justify-content:center"><button class="btn primary" data-act="assetNew">${I.plus}Cadastrar Ativo</button><button class="btn" data-act="go" data-view="import">${I.upload}Importar Excel</button></div>`);
    }
    if(!state.insp) A.startInspection();
    const ins=state.insp;
    const optA=DB.assets.map(a=>`<option value="${a.id}" ${a.id===ins.assetId?'selected':''}>${esc(a.nome)}${a.tag?' — '+esc(a.tag):''}</option>`).join('');
    const optT=DB.templates.map(t=>`<option value="${t.id}" ${t.id===ins.templateId?'selected':''}>${esc(t.nome)}</option>`).join('');
    const asset=DB.assets.find(a=>a.id===ins.assetId);
    return topbar('Nova Inspeção','Preencha o checklist e gere o laudo técnico',
      `<button class="btn ghost" data-act="go" data-view="laudos">Cancelar</button><button class="btn primary" id="genLaudo">${I.file}Gerar Laudo</button>`)+
    `<div class="grid" style="grid-template-columns:340px 1fr;align-items:start">
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card pad">
          <div class="section-title" style="margin-top:0">${I.box}<span>Equipamento</span></div>
          <div class="field"><label>Ativo a inspecionar</label><select class="input" id="inAsset">${optA}</select></div>
          ${asset&&asset.foto?`<div class="photo-box" style="margin-top:12px"><img src="${esc(asset.foto)}"></div>`:''}
          <div class="field" style="margin-top:12px"><label>Template de Checklist</label><select class="input" id="inTpl">${optT}</select></div>
        </div>
        <div class="card pad">
          <div class="section-title" style="margin-top:0">${I.pen}<span>Responsável</span></div>
          <div class="field"><label>Inspetor</label><input class="input" id="inInsp" value="${esc(ins.inspetor)}" placeholder="Nome completo"></div>
          <div class="field" style="margin-top:10px"><label>Cargo</label><input class="input" id="inCargo" value="${esc(ins.cargo)}"></div>
          <div class="field" style="margin-top:10px"><label>Matrícula</label><input class="input" id="inMat" inputmode="numeric" value="${esc(ins.matricula||'')}" placeholder="Somente números"></div>
          <div class="field" style="margin-top:10px"><label>Data da Inspeção</label><input class="input" type="date" id="inData" value="${esc(ins.data)}"></div>
          <div class="field" style="margin-top:10px"><label>Aprovado Por (Coordenador)</label><input class="input" id="inAprov" value="${esc(ins.aprovadoPor)}" placeholder="Opcional"></div>
        </div>
        <div class="card pad">
          <div class="section-title" style="margin-top:0">${I.pen}<span>Assinatura do Inspetor</span></div>
          <canvas class="sig-pad" id="sigPad" height="150"></canvas>
          <div class="pill-row" style="margin-top:8px"><button class="btn sm ghost" id="sigClear">${I.refresh}Limpar</button><small class="mut">Desenhe com o mouse ou toque</small></div>
        </div>
      </div>
      <div class="card pad">
        <div class="section-title" style="margin-top:0">${I.clipboard}<span>Checklist de Inspeção</span><span class="sp"></span>
          <span id="inStatusBadge"></span></div>
        <div id="inProgress" style="margin-bottom:14px"></div>
        <div id="chkList"></div>
        <div class="divider"></div>
        <div class="field"><label>Parecer Técnico e Recomendações Gerais</label><textarea class="input" id="inParecer" style="min-height:100px" placeholder="Descreva constatações, recomendações e ações corretivas exigidas…">${esc(ins.parecer)}</textarea></div>
        <div class="field" style="margin-top:12px"><label>Status Final do Laudo</label>
          <select class="input" id="inStatus">
            <option value="">Automático (com base no checklist)</option>
            <option value="APROVADO" ${ins.statusOverride==='APROVADO'?'selected':''}>APROVADO (Operação Livre)</option>
            <option value="APROVADO COM RESTRIÇÕES" ${ins.statusOverride==='APROVADO COM RESTRIÇÕES'?'selected':''}>APROVADO COM RESTRIÇÕES</option>
            <option value="REPROVADO / INTERDITADO" ${ins.statusOverride==='REPROVADO / INTERDITADO'?'selected':''}>REPROVADO / INTERDITADO</option>
          </select></div>
      </div>
    </div>`;
  },
  mount(root){
    const ins=state.insp; if(!ins) return;
    const DB=DBref();
    // selects
    const selAsset=$('#inAsset',root), selTpl=$('#inTpl',root);
    if(selAsset) selAsset.onchange=()=>{ ins.assetId=selAsset.value; const a=DB.assets.find(x=>x.id===ins.assetId); const m=a&&DB.templates.find(t=>t.categoria===a.categoria); if(m){ ins.templateId=m.id; ins.itens=buildItens(m); } captureFields(); render(); };
    if(selTpl) selTpl.onchange=()=>{ ins.templateId=selTpl.value; ins.itens=buildItens(DB.templates.find(t=>t.id===ins.templateId)); captureFields(); render(); };
    // text fields (no rerender, capture on change)
    const bind=(sel,key)=>{ const el=$(sel,root); if(el) el.oninput=()=>ins[key]=el.value; };
    bind('#inInsp','inspetor'); bind('#inCargo','cargo'); bind('#inData','data');
    bind('#inAprov','aprovadoPor'); bind('#inParecer','parecer');
    const mat=$('#inMat',root); if(mat) mat.oninput=()=>{ mat.value=mat.value.replace(/\D/g,''); ins.matricula=mat.value; };
    const selS=$('#inStatus',root); if(selS) selS.onchange=()=>{ ins.statusOverride=selS.value; updateStatusBadge(); };
    // checklist
    renderChecklist(root);
    updateProgress(root); updateStatusBadge();
    // signature
    initSig($('#sigPad',root), ins);
    $('#sigClear',root).onclick=()=>{ clearSig(); ins.assinatura=''; };
    // gerar
    $('#genLaudo',root).onclick=()=>{ captureFields(); A.finishInspection(); };

    function captureFields(){ ['inInsp:inspetor','inCargo:cargo','inMat:matricula','inData:data','inAprov:aprovadoPor','inParecer:parecer'].forEach(p=>{const[a,b]=p.split(':');const el=$('#'+a,root);if(el)ins[b]=el.value;}); const ss=$('#inStatus',root); if(ss)ins.statusOverride=ss.value; }
    window.__CS_captureInsp=captureFields;
  }
};

function renderChecklist(root){
  const ins=state.insp; const box=$('#chkList',root); if(!box) return;
  // group by section preserving order
  const sections=[]; const map={};
  ins.itens.forEach((it,idx)=>{ if(!map[it.secao]){ map[it.secao]={nome:it.secao,items:[]}; sections.push(map[it.secao]); } map[it.secao].items.push({it,idx}); });
  box.innerHTML=sections.map(se=>`<div class="chk-section"><h4>${esc(se.nome)}</h4>`+
    se.items.map(({it,idx})=>segRow(it,idx)).join('')+`</div>`).join('');
  box.querySelectorAll('.seg button').forEach(b=>{ b.onclick=()=>{ const idx=+b.dataset.idx, v=b.dataset.on;
    ins.itens[idx].status = ins.itens[idx].status===v?'':v;
    // update seg buttons in this row
    b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('on', x.dataset.on===ins.itens[idx].status));
    updateProgress(root); updateStatusBadge();
  }; });
  box.querySelectorAll('textarea[data-obs]').forEach(t=>{ t.oninput=()=>{ ins.itens[+t.dataset.obs].obs=t.value; }; });
  // adicionar foto ao item (usa câmera no celular)
  box.querySelectorAll('button[data-addph]').forEach(btn=>{ btn.onclick=()=>{
    const idx=+btn.dataset.addph;
    const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.capture='environment';
    inp.onchange=async()=>{ const f=inp.files[0]; if(!f) return; const d=await shrink(await readData(f),1000,0.72); (ins.itens[idx].fotos ||= []).push(d); renderChecklist(root); updateProgress(root); };
    inp.click();
  }; });
  box.querySelectorAll('button[data-rmph]').forEach(btn=>{ btn.onclick=()=>{ const [i,j]=btn.dataset.rmph.split(':').map(Number); ins.itens[i].fotos.splice(j,1); renderChecklist(root); }; });
  box.querySelectorAll('.thumb-sm img[data-view]').forEach(im=>{ im.onclick=()=>window.__CS_photoView(im.src); });
}
function segRow(it,idx){
  const seg=v=>`<button data-on="${v}" data-idx="${idx}" class="${it.status===v?'on':''}">${v==='NA'?'N/A':ITEM_ST[v].split(' ')[0]+(v==='NC'?' Conf.':'')}</button>`;
  const fotos=it.fotos||[];
  const phs=fotos.map((f,j)=>`<div class="thumb-sm"><img src="${f}" data-view><button class="rm" data-rmph="${idx}:${j}" title="Remover">×</button></div>`).join('');
  return `<div class="chk-item">
    <div class="it-name">${esc(it.item)}</div>
    <div class="seg">${seg('C')}${seg('R')}${seg('NC')}${seg('NA')}</div>
    <textarea class="input obs" data-obs="${idx}" placeholder="Observação / constatação (opcional)" style="min-height:0;padding:7px 10px;font-size:12.5px">${esc(it.obs)}</textarea>
    <div class="chk-photos">${phs}<button class="btn sm addph" data-addph="${idx}">${I.image} Foto${fotos.length?' ('+fotos.length+')':''}</button></div>
  </div>`;
}
function updateProgress(root){
  const ins=state.insp; const st=laudoStats({itens:ins.itens});
  const total=ins.itens.length; const done=st.aval+st.NA;
  const el=$('#inProgress',root); if(!el) return;
  el.innerHTML=`<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <div class="bar" style="flex:1;min-width:120px"><i style="width:${total?Math.round(done/total*100):0}%"></i></div>
    <span class="sm mut">${done}/${total} avaliados</span>
    <span class="pill-row" style="gap:6px">
      <span class="badge b-ok"><span class="dot"></span>${st.C}</span>
      <span class="badge b-warn"><span class="dot"></span>${st.R}</span>
      <span class="badge b-bad"><span class="dot"></span>${st.NC}</span>
    </span></div>`;
}
function updateStatusBadge(){
  const ins=state.insp; const s=ins.statusOverride||finalFromItems(ins.itens);
  const map={'APROVADO':'b-ok','APROVADO COM RESTRIÇÕES':'b-warn','REPROVADO / INTERDITADO':'b-bad'};
  const el=$('#inStatusBadge'); if(el) el.innerHTML=`<span class="badge ${map[s]}"><span class="dot"></span>${esc(s)}</span>`;
}

/* signature pad */
let sigCtx=null, sigDrawing=false, sigCanvas=null, sigHasInk=false, sigRef=null;
function initSig(cv, ins){
  if(!cv) return; sigCanvas=cv; sigRef=ins; sigHasInk=!!ins.assinatura;
  const resize=()=>{ const w=cv.clientWidth; cv.width=w; cv.height=150; sigCtx=cv.getContext('2d'); sigCtx.lineWidth=2.2; sigCtx.lineCap='round'; sigCtx.lineJoin='round'; sigCtx.strokeStyle='#111';
    if(ins.assinatura){ const img=new Image(); img.onload=()=>sigCtx.drawImage(img,0,0,w,150); img.src=ins.assinatura; } };
  resize();
  const pos=e=>{ const r=cv.getBoundingClientRect(); const p=e.touches?e.touches[0]:e; return {x:p.clientX-r.left,y:p.clientY-r.top}; };
  const start=e=>{ e.preventDefault(); sigDrawing=true; const {x,y}=pos(e); sigCtx.beginPath(); sigCtx.moveTo(x,y); };
  const move=e=>{ if(!sigDrawing) return; e.preventDefault(); const {x,y}=pos(e); sigCtx.lineTo(x,y); sigCtx.stroke(); sigHasInk=true; };
  const end=()=>{ if(sigDrawing && sigHasInk && sigRef){ sigRef.assinatura=cv.toDataURL('image/png'); } sigDrawing=false; };
  cv.onmousedown=start; cv.onmousemove=move; window.addEventListener('mouseup',end);
  cv.ontouchstart=start; cv.ontouchmove=move; cv.ontouchend=end;
}
function clearSig(){ if(sigCtx&&sigCanvas){ sigCtx.clearRect(0,0,sigCanvas.width,sigCanvas.height); sigHasInk=false; } }

/* ---------- Finish / gerar laudo ---------- */
A.finishInspection=function(){
  const DB=DBref(); const ins=state.insp;
  // rede de segurança: se o id estiver vazio, usa o valor atual do seletor ou o primeiro ativo
  if(!ins.assetId){ const sel=$('#inAsset'); ins.assetId = (sel&&sel.value) || (DB.assets[0]&&DB.assets[0].id) || ''; }
  const asset=DB.assets.find(a=>a.id===ins.assetId);
  if(!asset){ toast('Cadastre um ativo antes de gerar o laudo','err'); return; }
  if(!ins.inspetor.trim()){ toast('Informe o nome do inspetor','err'); $('#inInsp')&&$('#inInsp').focus(); return; }
  const evaluated=ins.itens.some(it=>it.status);
  if(!evaluated){ toast('Avalie ao menos um item do checklist','err'); return; }
  const s=DB.settings; const seq=(s.seq||1);
  const numero=`ETG-${new Date().getFullYear()}-${String(seq).padStart(4,'0')}`;
  const laudo={
    id:uid(), numero, assetId:asset.id,
    assetSnapshot:{nome:asset.nome,tag:asset.tag,categoria:asset.categoria,setor:asset.setor,foto:asset.foto},
    templateNome:(DB.templates.find(t=>t.id===ins.templateId)||{}).nome||'',
    inspetor:ins.inspetor.trim(), cargo:ins.cargo.trim(), matricula:(ins.matricula||'').trim(),
    data:ins.data||todayISO(), aprovadoPor:ins.aprovadoPor.trim(), parecer:ins.parecer.trim(),
    statusFinal: ins.statusOverride || finalFromItems(ins.itens),
    itens: ins.itens.map(it=>({secao:it.secao,item:it.item,status:it.status,obs:it.obs,fotos:(it.fotos||[]).slice()})),
    assinatura: ins.assinatura, empresa:s.empresa, logo:s.logo,
    createdAt:new Date().toISOString(),
  };
  DB.laudos.push(laudo); DB.settings.seq=seq+1;
  asset.ultimaInspecao=laudo.data; asset.updatedAt=new Date().toISOString();
  // reflete status no ativo
  if(laudo.statusFinal==='REPROVADO / INTERDITADO') asset.status='interditado';
  else if(laudo.statusFinal==='APROVADO COM RESTRIÇÕES' && asset.status==='interditado') asset.status='manutencao';
  else if(laudo.statusFinal==='APROVADO') asset.status='operacional';
  save(); state.insp=null; go('laudos'); toast('Laudo '+numero+' gerado com sucesso');
  // Gera o PDF e, com base compartilhada (servidor ou pasta), salva em laudos/
  try{
    const B=window.__CS.backend;
    if(window.__CS_makeLaudoBlob && B && B.isRemote && B.isRemote()){
      const blob=window.__CS_makeLaudoBlob(laudo);
      if(blob) Promise.resolve(B.remotePDF(numero+'.pdf',blob)).then(()=>toast('PDF salvo em laudos/')).catch(()=>{});
    }
  }catch(e){}
  setTimeout(()=>A.viewLaudo(laudo.id),350);
};

/* ================= LAUDO SHEET / PDF ================= */
function evidHTML(l){
  const its=(l.itens||[]).filter(it=>it.fotos&&it.fotos.length);
  if(!its.length) return '';
  const blocks=its.map(it=>`<div class="ld-ev-item"><div class="ld-ev-cap">${esc(it.item)}${it.status?` — <b>${esc(ITEM_ST[it.status]||'')}</b>`:''}</div><div class="ld-ev-imgs">${it.fotos.map(f=>`<img src="${esc(f)}">`).join('')}</div></div>`).join('');
  return `<div class="ld-sect ld-ev"><div class="h">Evidências Fotográficas</div><div class="ld-ev-body">${blocks}</div></div>`;
}
function sheetHTML(l){
  const st=laudoStats(l); const f=FINAL_ST[l.statusFinal]||FINAL_ST['APROVADO'];
  const kv=(k,v)=>`<div><div class="k">${esc(k)}</div><div class="v">${esc(v||'—')}</div></div>`;
  // itens agrupados
  let rows=''; let lastSec='';
  l.itens.forEach(it=>{
    if(it.secao!==lastSec){ rows+=`<tr><td colspan="3" class="ld-sect-h">${esc(it.secao)}</td></tr>`; lastSec=it.secao; }
    const cls=it.status||'NA'; const lbl=it.status?ITEM_ST[it.status]:'—';
    rows+=`<tr><td style="width:52%">${esc(it.item)}</td><td style="width:14%"><span class="ld-st ${it.status||''}">${esc(lbl)}</span></td><td>${esc(it.obs||'')}</td></tr>`;
  });
  const logo=l.logo?`<img class="ld-logo-img" src="${esc(l.logo)}">`:`<div class="ld-logo">CS</div>`;
  return `<div id="laudo-sheet">
    <div class="ld-head">
      ${logo}
      <div><h1>CheckSync ETG</h1><div class="ld-co">${esc(l.empresa||'')}</div></div>
      <div class="ld-meta"><b>${esc(l.numero)}</b><br>Emitido: ${fmtDate(l.createdAt.slice(0,10))}<br>Conformidade: <b>${st.conf}%</b></div>
    </div>
    <div class="ld-title">Relatório de Inspeção Técnico-Operacional</div>
    <div class="ld-status-band" style="background:${f.bg};color:${f.fg}">${esc(l.statusFinal)}</div>

    <div class="ld-flex">
      <div class="ld-photo">${l.assetSnapshot.foto?`<img src="${esc(l.assetSnapshot.foto)}">`:'<div class="noph">Sem foto</div>'}</div>
      <div class="ld-sect" style="flex:1"><div class="h">Dados do Equipamento</div>
        <div class="ld-kv">
          ${kv('Equipamento', l.assetSnapshot.nome)}
          ${kv('Nº Ativo', l.assetSnapshot.tag)}
          ${kv('Categoria', l.assetSnapshot.categoria)}
          ${kv('Setor', l.assetSnapshot.setor)}
          ${kv('Data da Vistoria', fmtDate(l.data))}
          ${kv('Inspetor', l.inspetor)}
        </div>
      </div>
    </div>

    <div class="ld-sect"><div class="h">Checklist — ${esc(l.templateNome||'Inspeção')} (${st.aval} avaliados • ${st.C} conformes • ${st.R} restrições • ${st.NC} não conf.)</div>
      <table class="ld-tbl"><thead><tr><th>Item de Verificação</th><th>Status</th><th>Observação / Constatação</th></tr></thead><tbody>${rows}</tbody></table>
    </div>

    <div class="ld-sect"><div class="h">Parecer Técnico e Recomendações</div>
      <div class="ld-parecer">${esc(l.parecer||'Sem observações adicionais.')}</div>
    </div>
    ${evidHTML(l)}
    <div class="ld-sign">
      <div class="box"><div class="sig-img">${l.assinatura?`<img src="${esc(l.assinatura)}">`:''}</div>
        <div class="who">${esc(l.inspetor||'—')}</div><div class="role">${esc(l.cargo||'Inspetor')}${l.matricula?' • Matrícula '+esc(l.matricula):''}</div></div>
      <div class="box"><div class="sig-img"></div>
        <div class="who">${esc(l.aprovadoPor||'—')}</div><div class="role">Aprovado por (Coordenador)</div></div>
    </div>
    <div class="ld-foot"><span>CheckSync ETG System — Documento gerado eletronicamente</span><span>Laudo ${esc(l.numero)} • ${esc(l.assetSnapshot.nome)}</span></div>
  </div>`;
}

A.viewLaudo=function(id){
  const l=DBref().laudos.find(x=>x.id===id); if(!l) return;
  const canPdf = window.__CS_pdfAvailable && window.__CS_pdfAvailable();
  openModal(`<div class="modal lg">
    <div class="modal-head">${I.file}<h3>Laudo ${esc(l.numero)}</h3>
      ${canPdf?`<button class="btn sm primary" id="mPdf">${I.download}Baixar PDF</button>`:''}
      <button class="btn sm ${canPdf?'ghost':'primary'}" id="mPrint">${I.print}Imprimir</button>
      <button class="btn icon ghost" data-act="closeModal">${I.x}</button></div>
    <div class="modal-body" style="background:var(--panel-2)"><div class="laudo-preview">${sheetHTML(l)}</div></div>
  </div>`);
  $('#mPrint').onclick=()=>window.print();
  const pb=$('#mPdf'); if(pb) pb.onclick=()=>window.__CS_downloadLaudoPDF(l);
};
A.printLaudo=function(id){
  const l=DBref().laudos.find(x=>x.id===id); if(!l) return;
  closeModal();
  const holder=document.createElement('div'); holder.id='__printHolder'; holder.innerHTML=sheetHTML(l);
  document.body.appendChild(holder);
  const cleanup=()=>{ holder.remove(); window.removeEventListener('afterprint',cleanup); };
  window.addEventListener('afterprint',cleanup);
  setTimeout(()=>{ window.print(); setTimeout(cleanup,1500); },60);
};
A.laudoDel=function(id){
  const DB=DBref(); const l=DB.laudos.find(x=>x.id===id); if(!l) return;
  confirmModal('Excluir laudo?', `O laudo <b>${esc(l.numero)}</b> de <b>${esc(l.assetSnapshot.nome)}</b> será removido permanentemente.`, 'Excluir', ()=>{
    DB.laudos=DB.laudos.filter(x=>x.id!==id); save(); closeModal(); render(); toast('Laudo excluído');
  });
};

/* ================= IMPORT / EXPORT XLSX ================= */
const IMPORT_COLS=['nome','tag','categoria','setor','status','descricao'];
const HEADER=['Nome','Nº Ativo','Categoria','Setor','Status','Descricao'];
const COL_ALIAS={nome:['nome','maquina','equipamento'],tag:['n ativo','no ativo','num ativo','numero ativo','tag','ativo','numero','num'],categoria:['categoria','cat'],setor:['setor','area'],status:['status','situacao'],descricao:['descricao','observacao','obs']};
function xmlEsc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])); }
function xmlDec(s){ return String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(m,n)=>String.fromCharCode(+n)).replace(/&amp;/g,'&'); }
function colName(i){ let s=''; i++; while(i){ const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26); } return s; }
function colIdx(ref){ let n=0; for(const ch of ref){ if(ch<'A'||ch>'Z') break; n=n*26+(ch.charCodeAt(0)-64); } return n-1; }

function buildXlsx(rows){
  const sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+
    rows.map((r,ri)=>'<row r="'+(ri+1)+'">'+r.map((c,ci)=>'<c r="'+colName(ci)+(ri+1)+'" t="inlineStr"><is><t xml:space="preserve">'+xmlEsc(c)+'</t></is></c>').join('')+'</row>').join('')+
    '</sheetData></worksheet>';
  const ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
  const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const wb='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Ativos" sheetId="1" r:id="rId1"/></sheets></workbook>';
  const wbRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';
  const enc=fflate.strToU8;
  const zip=fflate.zipSync({
    '[Content_Types].xml':enc(ct), '_rels/.rels':enc(rels),
    'xl/workbook.xml':enc(wb), 'xl/_rels/workbook.xml.rels':enc(wbRels),
    'xl/worksheets/sheet1.xml':enc(sheet),
  },{level:0});
  return new Blob([zip],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function templateRows(){
  return [ HEADER,
    ['Empilhadeira Toyota 8FG25','EMP-014','Empilhadeira','USI','operacional','Empilhadeira a gás 2,5t'],
    ['Ponte Rolante 5t Galpão A','PR-002','Ponte Rolante','FND','operacional','Vão de 12m'],
    ['Máquina de Leak Teste L3','LK-003','Leak Teste','MMO','manutencao','Aguardando calibração'],
    ['Nutrunner Atlas NR-7','NR-07','Nutrunner','MSC','operacional','Aperto controlado'],
  ];
}
A.downloadTemplateXlsx=function(){ download('modelo_ativos_checksync.xlsx', buildXlsx(templateRows())); toast('Modelo Excel baixado'); };
A.downloadTemplateCsv=function(){ download('modelo_ativos_checksync.csv','﻿'+rowsToCsv(templateRows()),'text/csv'); toast('Modelo CSV baixado'); };

/* exporta a base atual de ativos (para editar e reenviar) */
function assetRows(){ return [ HEADER ].concat(DBref().assets.map(a=>[a.nome||'',a.tag||'',a.categoria||'',a.setor||'',a.status||'operacional',a.descricao||''])); }
function rowsToCsv(rows){ return rows.map(r=>r.map(c=>/[";\n\r]/.test(c)?'"'+String(c).replace(/"/g,'""')+'"':c).join(';')).join('\r\n'); }
A.exportAssetsXlsx=function(){ const n=DBref().assets.length; if(!n){ toast('Nenhum ativo para exportar','err'); return; } download('ativos_checksync_'+todayISO()+'.xlsx', buildXlsx(assetRows())); toast(n+' ativo(s) exportado(s) em Excel'); };
A.exportAssetsCsv=function(){ const n=DBref().assets.length; if(!n){ toast('Nenhum ativo para exportar','err'); return; } download('ativos_checksync_'+todayISO()+'.csv','﻿'+rowsToCsv(assetRows()),'text/csv'); toast(n+' ativo(s) exportado(s) em CSV'); };

/* ---------- CHECKLISTS (templates) via planilha ---------- */
const CHK_HEADER=['Template','Categoria','Secao','Item'];
function errBox(m){ return `<div class="badge b-bad" style="padding:8px 12px"><span class="dot"></span>${esc(m)}</div>`; }
function chkModelRows(){
  return [ CHK_HEADER,
    ['Empilhadeira (Combustão / Elétrica)','Empilhadeira','Movimentação de Carga','Garfos de Carga'],
    ['Empilhadeira (Combustão / Elétrica)','Empilhadeira','Movimentação de Carga','Freio de Carga (Içamento)'],
    ['Empilhadeira (Combustão / Elétrica)','Empilhadeira','Segurança do Operador','Sistema de Freio (Serviço e Estacionamento)'],
    ['Empilhadeira (Combustão / Elétrica)','Empilhadeira','Equipamentos e Painel','Aterramento Elétrico'],
    ['Prensa / Injetora','Prensa','Proteções de Segurança','Barreira Fotoelétrica (Cortina de Luz)'],
    ['Prensa / Injetora','Prensa','Proteções de Segurança','Sensor da Porta de Proteção'],
  ];
}
function chkRows(){ const out=[CHK_HEADER]; DBref().templates.forEach(t=>t.secoes.forEach(s=>s.itens.forEach(it=>out.push([t.nome, t.categoria||'', s.nome, it])))); return out; }
A.downloadChkTemplateXlsx=function(){ download('modelo_checklists_checksync.xlsx', buildXlsx(chkModelRows())); toast('Modelo Excel baixado'); };
A.downloadChkTemplateCsv=function(){ download('modelo_checklists_checksync.csv','﻿'+rowsToCsv(chkModelRows()),'text/csv'); toast('Modelo CSV baixado'); };
A.exportChkXlsx=function(){ if(!DBref().templates.length){ toast('Nenhum checklist','err'); return; } download('checklists_checksync_'+todayISO()+'.xlsx', buildXlsx(chkRows())); toast('Checklists exportados em Excel'); };
A.exportChkCsv=function(){ if(!DBref().templates.length){ toast('Nenhum checklist','err'); return; } download('checklists_checksync_'+todayISO()+'.csv','﻿'+rowsToCsv(chkRows()),'text/csv'); toast('Checklists exportados em CSV'); };
A.templateDel=function(id){ const DB=DBref(); const t=DB.templates.find(x=>x.id===id); if(!t) return; confirmModal('Excluir checklist?',`O template <b>${esc(t.nome)}</b> e seus itens serão removidos.`,'Excluir',()=>{ DB.templates=DB.templates.filter(x=>x.id!==id); save(); closeModal(); render(); toast('Checklist excluído'); }); };
window.__CS_handleImportChk=async function(file){
  const box=$('#impResult'); const setBox=h=>{ if(box) box.innerHTML=h; };
  try{
    setBox('<p class="mut sm">Lendo arquivo…</p>');
    let rows; if(/\.csv$/i.test(file.name)) rows=parseCsv(await readText(file)); else rows=parseXlsx(await readBuf(file));
    rows=rows.filter(r=>r&&r.some(c=>(c||'').trim()!==''));
    if(rows.length<2){ setBox(errBox('Nenhuma linha de dados encontrada')); return; }
    const head=rows[0].map(h=>norm(h)); const idx={};
    ['template','categoria','secao','item'].forEach(c=>{ idx[c]=head.findIndex(h=>h===c||h.startsWith(c.slice(0,4))); });
    if(idx.template<0 || idx.item<0){ setBox(errBox('Colunas "Template" e "Item" são obrigatórias. Use o modelo.')); return; }
    const order=[], map={};
    for(let r=1;r<rows.length;r++){
      const g=k=>idx[k]>=0?(rows[r][idx[k]]||'').trim():'';
      const tname=g('template'), item=g('item'); if(!tname||!item) continue;
      const key=tname.toLowerCase();
      if(!map[key]){ map[key]={nome:tname, categoria:g('categoria'), secOrder:[], sec:{}}; order.push(key); }
      const T=map[key]; if(!T.categoria && g('categoria')) T.categoria=g('categoria');
      const sname=g('secao')||'Verificações Gerais';
      if(!T.sec[sname]){ T.sec[sname]=[]; T.secOrder.push(sname); }
      T.sec[sname].push(item);
    }
    if(!order.length){ setBox(errBox('Nenhum item válido (precisa de Template + Item).')); return; }
    const DB=DBref(); let created=0, updated=0, items=0;
    order.forEach(key=>{ const T=map[key];
      const secoes=T.secOrder.map(sn=>({nome:sn, itens:T.sec[sn]})); items+=secoes.reduce((a,s)=>a+s.itens.length,0);
      const rec={ id:uid(), nome:T.nome, categoria:matchCat(T.categoria), secoes };
      const dup=DB.templates.find(x=>x.nome.toLowerCase()===T.nome.toLowerCase());
      if(dup){ rec.id=dup.id; DB.templates[DB.templates.indexOf(dup)]=rec; updated++; } else { DB.templates.push(rec); created++; }
    });
    save();
    setBox(`<div class="card pad" style="border-color:var(--ok)"><div class="section-title" style="margin-top:0;color:var(--ok)">${I.check}<span>Importação concluída</span></div>
      <div class="pill-row"><span class="badge b-ok"><span class="dot"></span>${created} novo(s)</span><span class="badge b-info"><span class="dot"></span>${updated} atualizado(s)</span><span class="badge b-muted"><span class="dot"></span>${items} itens</span></div>
      <button class="btn primary" data-act="go" data-view="inspect" style="margin-top:14px">${I.clipboard}Nova Inspeção</button></div>`);
    toast(`${created} criado(s), ${updated} atualizado(s)`);
  }catch(err){ console.error(err); setBox(errBox('Erro ao ler o arquivo. Verifique se é um .xlsx/.csv válido.')); }
};

function parseXlsx(buf){
  const files=fflate.unzipSync(new Uint8Array(buf)); const dec=fflate.strFromU8;
  let shared=[];
  if(files['xl/sharedStrings.xml']){
    const xml=dec(files['xl/sharedStrings.xml']);
    shared=[...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m=>[...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x=>xmlDec(x[1])).join(''));
  }
  const name=Object.keys(files).find(f=>/^xl\/worksheets\/sheet1\.xml$/i.test(f)) || Object.keys(files).find(f=>/^xl\/worksheets\/.*\.xml$/i.test(f));
  if(!name) return [];
  const sxml=dec(files[name]); const rows=[];
  for(const rm of sxml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)){
    const row=[];
    for(const cm of rm[1].matchAll(/<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)){
      const attrs=cm[1]||'', inner=cm[2]||'';
      const ref=(attrs.match(/r="([A-Z]+)\d+"/)||[])[1];
      const ci=ref?colIdx(ref):row.length;
      const t=(attrs.match(/t="([^"]+)"/)||[])[1];
      let val=''; const v=inner.match(/<v>([\s\S]*?)<\/v>/); const isr=inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
      if(t==='s'&&v) val=shared[+v[1]]||''; else if((t==='inlineStr'||t==='str')&&isr) val=xmlDec(isr[1]); else if(v) val=xmlDec(v[1]); else if(isr) val=xmlDec(isr[1]);
      row[ci]=val;
    }
    rows.push(row);
  }
  return rows;
}
function parseCsv(text){
  text=text.replace(/^﻿/,''); const rows=[]; let row=[],cur='',q=false;
  const delim = (text.split('\n')[0].match(/;/g)||[]).length >= (text.split('\n')[0].match(/,/g)||[]).length ? ';' : ',';
  for(let i=0;i<text.length;i++){ const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=c; }
    else { if(c==='"') q=true; else if(c===delim){ row.push(cur); cur=''; } else if(c==='\n'){ row.push(cur); rows.push(row); row=[]; cur=''; } else if(c==='\r'){} else cur+=c; }
  }
  if(cur!==''||row.length){ row.push(cur); rows.push(row); }
  return rows;
}

window.__CS_handleImport=async function(file){
  const box=$('#impResult'); const setBox=h=>{ if(box) box.innerHTML=h; };
  try{
    setBox('<p class="mut sm">Lendo arquivo…</p>');
    let rows;
    if(/\.csv$/i.test(file.name)) rows=parseCsv(await readText(file));
    else rows=parseXlsx(await readBuf(file));
    rows=rows.filter(r=>r&&r.some(c=>(c||'').trim()!==''));
    if(rows.length<2){ setBox(`<div class="badge b-bad" style="padding:8px 12px"><span class="dot"></span>Nenhuma linha de dados encontrada</div>`); return; }
    // mapear cabeçalho
    const head=rows[0].map(h=>norm(h));
    const idx={};
    IMPORT_COLS.forEach(c=>{ const al=COL_ALIAS[c]||[c]; idx[c]=head.findIndex(h=>al.includes(h)); if(idx[c]<0) idx[c]=head.findIndex(h=>al.some(a=>h.startsWith(a))); });
    if(idx.nome<0){ setBox(`<div class="badge b-bad" style="padding:8px 12px"><span class="dot"></span>Coluna "Nome" não encontrada. Use o modelo.</div>`); return; }
    const DB=DBref(); let added=0, updated=0, skipped=0;
    for(let r=1;r<rows.length;r++){
      const g=k=>idx[k]>=0?(rows[r][idx[k]]||'').trim():'';
      const nome=g('nome'); if(!nome){ skipped++; continue; }
      let status=norm(g('status')); if(!['operacional','manutencao','interditado'].includes(status)) status='operacional';
      const rec={ id:uid(), nome, tag:g('tag'), categoria:matchCat(g('categoria')), setor:matchSetor(g('setor')), status, foto:'', descricao:g('descricao'), createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), ultimaInspecao:null };
      const dup = (rec.tag && DB.assets.find(x=>x.tag&&x.tag.toLowerCase()===rec.tag.toLowerCase())) || DB.assets.find(x=>x.nome.toLowerCase()===rec.nome.toLowerCase());
      if(dup){ rec.id=dup.id; rec.createdAt=dup.createdAt; rec.ultimaInspecao=dup.ultimaInspecao; rec.foto=dup.foto; DB.assets[DB.assets.indexOf(dup)]=rec; updated++; }
      else { DB.assets.push(rec); added++; }
    }
    save();
    setBox(`<div class="card pad" style="border-color:var(--ok)">
      <div class="section-title" style="margin-top:0;color:var(--ok)">${I.check}<span>Importação concluída</span></div>
      <div class="pill-row">
        <span class="badge b-ok"><span class="dot"></span>${added} novo(s)</span>
        <span class="badge b-info"><span class="dot"></span>${updated} atualizado(s)</span>
        ${skipped?`<span class="badge b-muted"><span class="dot"></span>${skipped} ignorado(s)</span>`:''}
      </div>
      <button class="btn primary" data-act="go" data-view="assets" style="margin-top:14px">${I.box}Ver Ativos</button>
    </div>`);
    toast(`${added} adicionado(s), ${updated} atualizado(s)`);
  }catch(err){ console.error(err); setBox(`<div class="badge b-bad" style="padding:8px 12px"><span class="dot"></span>Erro ao ler o arquivo. Verifique se é um .xlsx/.csv válido.</div>`); }
};
function norm(s){ return String(s||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[º°ª.]/g,'').replace(/\s+/g,' ').trim(); }
function matchCat(v){ if(!v) return ''; const n=norm(v); const hit=CATS.find(c=>norm(c)===n||norm(c).startsWith(n.slice(0,5))); return hit||v; }
function matchSetor(v){ if(!v) return ''; const n=norm(v); const hit=SETORES.find(s=>norm(s)===n); return hit||v.toUpperCase(); }

/* ================= SETTINGS / BACKUP ================= */
A.settingsSave=function(){
  const DB=DBref();
  DB.settings.empresa=$('#setEmpresa').value.trim();
  DB.settings.inspetorPadrao=$('#setInsp').value.trim();
  DB.settings.cargoPadrao=$('#setCargo').value.trim();
  DB.settings.matriculaPadrao=($('#setMat')?$('#setMat').value:'').replace(/\D/g,'');
  save(); render(); toast('Configurações salvas');
};
A.backupExport=function(){ download('checksync_backup_'+todayISO()+'.json', JSON.stringify(DBref(),null,2),'application/json'); toast('Backup gerado'); };
window.__CS_restore=function(file){
  confirmModal('Restaurar backup?','Isto substitui TODOS os dados atuais pelo conteúdo do arquivo. Faça um backup antes se necessário.','Restaurar', async()=>{
    try{ const obj=JSON.parse(await readText(file)); if(!obj.meta||!obj.assets){ throw new Error('inválido'); }
      Object.keys(window.__CS.DB).forEach(k=>delete window.__CS.DB[k]);
      Object.assign(window.__CS.DB,obj); save(); closeModal(); render(); toast('Backup restaurado');
    }catch(e){ closeModal(); toast('Arquivo de backup inválido','err'); }
  }, false);
};
A.wipe=function(){ confirmModal('Apagar tudo?','Todos os ativos, laudos e configurações serão apagados permanentemente deste navegador.','Apagar tudo', ()=>{
  const done=()=>{ closeModal(); location.reload(); };
  (window.__CS.clearStore? window.__CS.clearStore(): Promise.resolve()).then(done,done);
}); };

/* extra close on X inside confirm/asset (data-act closeModal already handled globally) */
document.addEventListener('click',e=>{ const t=e.target.closest('[data-act]'); if(t&&t.dataset.act==='closeModal') closeModal(); });

})();
