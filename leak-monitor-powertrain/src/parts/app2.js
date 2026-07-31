/* ============================================================
   Leak Test | Powertrain — camada de interface
   Painel de TV: cards por posto, relógio, atualização automática,
   alarme sonoro, metas, fonte de dados e detalhes.
   ============================================================ */
(function(){
"use strict";
const { I, $, $$, esc, clamp, nInt, n1, n2, hhmm, dtBR, numBR, duracao, download, toast,
        POSTOS, POSTO_BY, PERIODOS, cfg, cfgSalvar, cfgCarregarLocal, cfgPadrao, setCfg, mescla,
        Backend, agregarTudo, janela, demoRegistros, regsParaCSV, ST, aplicarTexto,
        salvarCache, lerCache } = window.LK;

/* ============================================================
   ALARME SONORO
   ============================================================ */
const Som = {
  ctx:null,
  liberar(){ try{ if(!Som.ctx) Som.ctx = new (window.AudioContext||window.webkitAudioContext)(); if(Som.ctx.state==='suspended') Som.ctx.resume(); }catch(e){} },
  bipe(vezes=3){
    if(!cfg().alarme) return;
    Som.liberar(); if(!Som.ctx) return;
    for(let i=0;i<vezes;i++){
      const t0 = Som.ctx.currentTime + i*0.42;
      const osc = Som.ctx.createOscillator(), g = Som.ctx.createGain();
      osc.type='square'; osc.frequency.setValueAtTime(i%2? 660:880, t0);
      g.gain.setValueAtTime(0.0001,t0);
      g.gain.exponentialRampToValueAtTime(0.16, t0+0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0+0.3);
      osc.connect(g); g.connect(Som.ctx.destination);
      osc.start(t0); osc.stop(t0+0.32);
    }
  },
};

/* ============================================================
   CARREGAMENTO DA BASE
   ============================================================ */
function reiniciarContagem(){ ST.proximaEm = Math.max(30, (numBR(cfg().intervalo)||5)*60); }

async function carregar(manual=false){
  if(ST.carregando) return;
  ST.carregando = true; pintarStatus();
  const arq = cfg().arquivo || 'leak.csv';
  try{
    if(Backend.modo==='servidor'){
      const {texto} = await Backend.lerCSV(arq);
      const n = aplicarTexto(texto, 'servidor', arq);
      salvarCache(texto, 'servidor', arq);
      if(manual) toast(nInt(n)+' registros lidos de '+arq);
    } else if(ST.fonte==='arquivo'){
      ST.atualizadoEm = new Date();                       // arquivo carregado à mão: apenas recalcula
    } else if(ST.fonte!=='demonstração'){
      throw new Error('sem-servidor');
    }
  }catch(e){
    const cache = lerCache();
    if(ST.regs.length){
      ST.erro = e.message==='arquivo-ausente' ? 'Arquivo '+arq+' não encontrado na base' : 'Falha ao ler a base';
      if(manual) toast(ST.erro,'err');
    } else if(cache && cache.texto){
      try{ aplicarTexto(cache.texto,'cache',cache.arquivo); ST.erro='Exibindo a última leitura salva neste aparelho'; }
      catch(_){ usarDemo(); }
    } else {
      usarDemo();
    }
  }
  ST.carregando = false;
  reiniciarContagem();
  render();
}
function usarDemo(){
  ST.regs = demoRegistros();
  ST.fonte = 'demonstração'; ST.arquivo = ''; ST.atualizadoEm = new Date();
  ST.erro = 'Sem base conectada — exibindo dados de demonstração';
}

/* ============================================================
   RENDER — CARDS
   ============================================================ */
function pillDe(st){
  const c = st.cfg||{}, meta = numBR(c.metaFpy)||98, min = numBR(c.minFpy)||95, maxNok = numBR(c.maxNok);
  if(st.status==='off') return {cls:'off', txt:'Sem leitura no período'};
  if(st.status==='bad'){
    if(st.fpy < min) return {cls:'bad', txt:'Crítico — abaixo do mínimo ('+n1(st.fpy)+'%)'};
    return {cls:'bad', txt:'NOK acima do limite ('+nInt(st.nok1)+' / '+nInt(maxNok)+')'};
  }
  if(st.status==='warn') return {cls:'warn', txt:'Abaixo da meta ('+Math.floor(st.atingimento)+'%)'};
  return {cls:'ok', txt:'Meta atingida'};
}
function sparkHTML(hist, min){
  const vals = hist.filter(h=>h.tot>0);
  if(vals.length<3) return '<div class="hist-vazio">Coletando histórico…</div>';
  const piso = clamp(min-6, 50, 99);
  return '<div class="spark">'+hist.map(h=>{
    if(!h.tot) return '<i class="v" style="height:12%"></i>';
    const alt = clamp(((h.fpy-piso)/(100-piso))*100, 8, 100);
    const cls = h.fpy>=min? '' : (h.fpy>=min-3? 'w':'b');
    return '<i class="'+cls+'" style="height:'+alt.toFixed(0)+'%" title="'+n1(h.fpy)+'% · '+h.tot+' peças"></i>';
  }).join('')+'</div>';
}
function chip(cor, nome, valor, extra){
  return '<span class="chip"><i style="background:'+cor+'"></i>'
    + '<span class="nm">'+esc(nome)+'</span><span class="vl">'+valor+'</span>'
    + (extra? '<span class="of">'+extra+'</span>' : '') + '</span>';
}
function cardHTML(p, st){
  const c = st.cfg||{}, meta = numBR(c.metaFpy)||98, min = numBR(c.minFpy)||95, maxNok = numBR(c.maxNok);
  const pill = pillDe(st);
  const alarme = st.status==='bad' && cfg().alarme ? ' alarme' : '';
  const topN = clamp(numBR(cfg().topMotivos)||4, 1, 8);

  let motivos = '';
  if(st.motivos.length){
    motivos = '<div data-sec="motivos"><div class="lbl-s">Motivos de reprovação</div><div class="chips">'
      + st.motivos.slice(0,topN).map((m,i)=>{
          const cor = ['#ef4444','#f59e0b','#a78bfa','#38bdf8','#22c55e','#f472b6','#facc15','#94a3b8'][i%8];
          return chip(cor, m.nome, nInt(m.qtd), Math.round(m.pct)+'%');
        }).join('')
      + '</div></div>';
  } else if(st.testadas){
    motivos = '<div data-sec="motivos"><div class="lbl-s">Motivos de reprovação</div><div class="chips">'
      + chip('#22c55e','Nenhuma reprovação','0','') + '</div></div>';
  }

  const nokAlto = isFinite(maxNok) && st.nok1 > maxNok;
  const boxNok = '<div class="box-nok'+(nokAlto?'':' calmo')+'">'
    + (nokAlto? I.alert : '')
    + '<span class="nm">NOK<br>(1ª passagem)</span>'
    + '<span class="vl">'+nInt(st.nok1)+'<small>máx '+(isFinite(maxNok)? nInt(maxNok):'—')+'</small></span></div>';

  const extras = '<div class="chips linha" data-poda="2">'
    + chip('#38bdf8','Retestes', nInt(st.retestes), st.testadas? Math.round((st.retestes/st.testadas)*100)+'%':'')
    + (st.refugo? chip('#ef4444','Refugo / retido', nInt(st.refugo), n1(st.yieldFinal)+'% final') : '')
    + (isFinite(st.mediaVal)? chip('#a78bfa','Vazamento', n2(st.mediaVal)+' '+esc(st.unid), isFinite(st.limite)? 'lim '+n1(st.limite):'') : '')
    + '</div>';

  let modelos = '';
  if(cfg().mostrarModelos && st.modelos.length && !(st.modelos.length===1 && st.modelos[0].nome==='—')){
    modelos = '<div data-poda="1"><div class="lbl-s">Modelos</div><div class="chips">'
      + st.modelos.slice(0,3).map(m=>{
          const cls = m.fpy>=meta? 'ok' : (m.fpy>=min? 'warn':'bad');
          return '<span class="chip"><i style="background:'+p.cor+'"></i><span class="nm">'+esc(m.nome)+'</span>'
               + '<span class="vl '+cls+'">'+n1(m.fpy)+'%</span><span class="of">'+nInt(m.tot)+' pç · '+nInt(m.nok)+' NOK</span></span>';
        }).join('')
      + '</div></div>';
  }

  const desdeNOK = st.ultimoNOK? Date.now()-st.ultimoNOK.getTime() : NaN;
  const semNOK = isFinite(desdeNOK)
    ? (desdeNOK < 120000 ? 'NOK neste momento' : '≈ '+duracao(desdeNOK)+' sem NOK')
    : 'período sem NOK';
  const rodape = st.testadas
    ? '<b>'+semNOK+'</b>'
      + '<small>cadência '+nInt(st.cadencia)+' pç/h · último teste '+hhmm(st.ultimoTeste)+'</small>'
    : '<b>Aguardando testes</b><small>nenhuma leitura na janela selecionada</small>';

  return '<article class="card st-'+st.status+alarme+'" style="--c:'+p.cor+'" data-posto="'+p.key+'">'
    + '<div class="c-head"><div class="c-ico">'+(I[p.icone]||I.gauge)+'</div>'
      + '<div><h2>'+esc(p.nome)+'</h2><small>'+esc(p.area)+' · leak test</small></div></div>'
    + '<span class="pill '+pill.cls+'"><i></i>'+esc(pill.txt)+'</span>'
    + '<div class="big"><b>'+(st.testadas? n1(st.fpy) : '—')+'</b><span>% FPY</span></div>'
    + '<div class="sub">aprovadas <b>'+nInt(st.ok1)+'</b> · testadas <b>'+nInt(st.testadas)+'</b>'
      + (st.nok1? ' · <span class="nok">'+nInt(st.nok1)+' NOK</span>' : '')+'</div>'
    + '<div class="meta-l"><span class="mt">Meta '+n1(meta)+'%</span><span class="mn">· mín '+n1(min)+'%</span>'
      + '<span class="pc">'+Math.floor(st.atingimento)+'%</span></div>'
    + '<div class="bar"><i style="width:'+st.atingimento.toFixed(1)+'%"></i></div>'
    + '<div data-poda="4">'+sparkHTML(st.hist, min)+'</div>'
    + motivos + boxNok + extras + modelos
    + '<div class="c-foot">'+I.hour+'<div>'+rodape+'</div></div>'
    + '</article>';
}

function render(){
  const c = cfg();
  const ag = agregarTudo(ST.regs, c.periodo);
  ST.agregado = ag;

  const ativos = POSTOS.filter(p=> (c.postos[p.key]||{}).ativo!==false );
  const cards = $('#cards');
  cards.className = 'cards' + (ativos.length<=2? ' c2' : ativos.length>=5? ' c4' : '');
  cards.innerHTML = ativos.map(p=> cardHTML(p, ag.postos[p.key])).join('')
    || '<div class="hist-vazio" style="place-self:center">Nenhum posto habilitado — abra as metas para ativar.</div>';
  $$('#cards .card').forEach(el=> el.onclick = ()=> modalDetalhes(el.dataset.posto));
  ajustarCards();

  // alarme só na transição para crítico
  ativos.forEach(p=>{
    const st = ag.postos[p.key], ant = ST.alarmes[p.key];
    if(st.status==='bad' && ant!=='bad') Som.bipe(3);
    ST.alarmes[p.key] = st.status;
  });

  pintarStatus();
  desenharBotoes();
  desenharPeriodos();
}

/* Painel de TV: se o card nao couber na altura da tela, corta primeiro o que
   e complementar (modelos, chips extras, motivos alem dos dois maiores, tendencia). */
function ajustarCards(){
  $$('#cards .card').forEach(card=>{
    let guarda = 0;
    const cabe = ()=> card.scrollHeight <= card.clientHeight + 2;
    while(!cabe() && guarda++ < 40){
      const alvo = card.querySelector('[data-poda="1"]') || card.querySelector('[data-poda="2"]');
      if(alvo){ alvo.remove(); continue; }
      const chips = $$('[data-sec="motivos"] .chip', card);
      if(chips.length > 2){ chips[chips.length-1].remove(); continue; }
      const sp = card.querySelector('[data-poda="4"]');
      if(sp){ sp.remove(); continue; }
      break;
    }
  });
}

/* ---------- Rodapé / status ---------- */
function pintarStatus(){
  const c = cfg(), ag = ST.agregado;
  const conn = $('#pfConn');
  let dot='off', txt='Local (sem base)';
  if(ST.fonte==='servidor'){ dot = ST.erro? 'err':''; txt = ST.erro? ST.erro : 'Conectado à base'; }
  else if(ST.fonte==='arquivo'){ dot=''; txt='Arquivo carregado manualmente'; }
  else if(ST.fonte==='cache'){ dot='err'; txt='Sem conexão — última leitura salva'; }
  else if(ST.fonte==='demonstração'){ dot='off'; txt='Modo demonstração'; }
  conn.innerHTML = '<i class="dot '+dot+'"></i> <b>'+esc(txt)+'</b>';
  conn.className = 'pf-i click'; conn.onclick = modalFonte;

  $('#pfUpd').innerHTML = I.clock+' Última atualização: <b>'+(ST.atualizadoEm? dtBR(ST.atualizadoEm) : '—')+'</b>';
  const mm = Math.floor(ST.proximaEm/60), ss = ST.proximaEm%60;
  $('#pfNext').innerHTML = I.refresh+' Próxima em: <b>'+(ST.carregando? 'lendo…' : String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0'))+'</b>';
  $('#pfTot').innerHTML = I.gauge+' '+esc(ag? ag.jan.rot : '—')+': <b>'+(ag? nInt(ag.total):'0')+'</b> testes · <b>'+(ag? nInt(ag.nokTotal):'0')+'</b> NOK';
  const f = $('#pfFile');
  f.innerHTML = I.file+' <b>'+esc(ST.arquivo || (ST.fonte==='demonstração'? 'demonstração' : c.arquivo))+'</b>';
  f.onclick = modalFonte;
}
function desenharBotoes(){
  const c = cfg(), box = $('#phBtns');
  if(box.dataset.pronto) { atualizarBotoes(); return; }
  box.dataset.pronto='1';
  box.innerHTML = ''
    + '<button class="ib" id="btAtualizar" title="Atualizar agora (R)">'+I.refresh+'</button>'
    + '<button class="ib" id="btMetas" title="Metas por posto (T)">'+I.target+'</button>'
    + '<button class="ib" id="btDet" title="Detalhes / registros (D)">'+I.list+'</button>'
    + '<button class="ib" id="btSom" title="Alarme sonoro (M)">'+I.bell+'</button>'
    + '<button class="ib" id="btFull" title="Tela cheia (F)">'+I.full+'</button>'
    + '<button class="ib" id="btCfg" title="Configurações (C)">'+I.cog+'</button>';
  $('#btAtualizar').onclick = ()=>{ Som.liberar(); carregar(true); };
  $('#btMetas').onclick = modalMetas;
  $('#btDet').onclick = ()=> modalDetalhes('');
  $('#btSom').onclick = ()=>{ const k=cfg(); k.alarme=!k.alarme; cfgSalvar(); if(k.alarme){ Som.liberar(); Som.bipe(1); } atualizarBotoes(); };
  $('#btFull').onclick = telaCheia;
  $('#btCfg').onclick = modalConfig;
  atualizarBotoes();
}
function atualizarBotoes(){
  const c = cfg(), s = $('#btSom');
  if(s){ s.innerHTML = c.alarme? I.bell : I.bellOff; s.className = 'ib '+(c.alarme? 'on':'off'); }
  const a = $('#btAtualizar'); if(a) a.className = 'ib'+(ST.carregando? ' spin':'');
  const f = $('#btFull'); if(f) f.className = 'ib'+(document.fullscreenElement? ' on':'');
}
function desenharPeriodos(){
  const c = cfg(), seg = $('#segPeriodo');
  seg.innerHTML = PERIODOS.map(p=>'<button data-p="'+p.id+'" class="'+(c.periodo===p.id?'on':'')+'">'+p.lbl+'</button>').join('');
  $$('#segPeriodo button').forEach(b=> b.onclick = ()=>{ cfg().periodo = b.dataset.p; cfgSalvar(); render(); });
}
function telaCheia(){
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  else document.documentElement.requestFullscreen?.().catch(()=>toast('Tela cheia bloqueada pelo navegador','err'));
  setTimeout(atualizarBotoes,150);
}

/* ============================================================
   MODAIS
   ============================================================ */
function fecharModal(){ $('#modal-root').innerHTML=''; }
function modal({titulo, icone, corpo, botoes, largura}){
  const root = $('#modal-root');
  root.innerHTML = '<div class="ov"><div class="modal"'+(largura?' style="max-width:'+largura+'"':'')+'>'
    + '<div class="modal-head">'+(icone||I.cog)+'<h3>'+esc(titulo)+'</h3>'
    + '<button class="ib" data-x="1">'+I.x+'</button></div>'
    + '<div class="modal-body">'+corpo+'</div>'
    + (botoes? '<div class="modal-foot">'+botoes+'</div>' : '')
    + '</div></div>';
  root.querySelector('[data-x]').onclick = fecharModal;
  root.querySelector('.ov').onclick = e=>{ if(e.target===root.querySelector('.ov')) fecharModal(); };
  return root;
}

/* ---------- Metas por posto ---------- */
function modalMetas(){
  const c = cfg();
  const corpo = POSTOS.map(p=>{
    const k = c.postos[p.key] || {};
    return '<div class="mgrp" data-k="'+p.key+'">'
      + '<h4><i style="background:'+p.cor+'"></i>'+esc(p.nome)+' <span style="color:var(--muted);font-weight:600">— '+esc(p.area)+'</span></h4>'
      + '<label class="sw"><input type="checkbox" data-f="ativo" '+(k.ativo!==false?'checked':'')+'>'
        + '<span>Exibir no painel<small>desmarque para ocultar este posto</small></span></label>'
      + '<div class="form-grid">'
      + '<div class="field"><label>Meta FPY (%)</label><input type="number" step="0.1" min="0" max="100" data-f="metaFpy" value="'+esc(k.metaFpy)+'"></div>'
      + '<div class="field"><label>Mínimo FPY (%)</label><input type="number" step="0.1" min="0" max="100" data-f="minFpy" value="'+esc(k.minFpy)+'"></div>'
      + '<div class="field"><label>Máx. NOK no período</label><input type="number" step="1" min="0" data-f="maxNok" value="'+esc(k.maxNok)+'"></div>'
      + '<div class="field"><label>Limite de vazamento</label><input type="number" step="0.01" min="0" data-f="limite" value="'+esc(k.limite)+'"></div>'
      + '<div class="field"><label>Unidade</label><input data-f="unid" value="'+esc(k.unid)+'" placeholder="cc/min"></div>'
      + '</div></div>';
  }).join('');
  modal({ titulo:'Metas por posto', icone:I.target, corpo,
    botoes:'<button class="btn ghost" data-c="1">Cancelar</button><button class="btn primary" data-s="1">'+I.check+'Salvar metas</button>' });
  $('[data-c]').onclick = fecharModal;
  $('[data-s]').onclick = ()=>{
    $$('.mgrp').forEach(g=>{
      const k = cfg().postos[g.dataset.k];
      $$('[data-f]', g).forEach(inp=>{
        const f = inp.dataset.f;
        if(inp.type==='checkbox') k[f] = inp.checked;
        else if(f==='unid') k[f] = inp.value.trim() || 'cc/min';
        else { const v = numBR(inp.value); if(isFinite(v)) k[f] = v; }
      });
      if(k.minFpy > k.metaFpy) k.minFpy = k.metaFpy;
    });
    cfgSalvar(); fecharModal(); render(); toast('Metas atualizadas');
  };
}

/* ---------- Configurações gerais ---------- */
function modalConfig(){
  const c = cfg();
  const corpo = ''
    + '<div class="form-grid">'
      + '<div class="field"><label>Arquivo da base</label><input id="cfArq" value="'+esc(c.arquivo)+'">'
        + '<span class="hint">CSV dentro da pasta <code class="k">dados</code> do servidor</span></div>'
      + '<div class="field"><label>Atualizar a cada (min)</label><input id="cfInt" type="number" min="1" max="120" value="'+esc(c.intervalo)+'"></div>'
      + '<div class="field"><label>Período padrão</label><select id="cfPer">'
        + PERIODOS.map(p=>'<option value="'+p.id+'"'+(c.periodo===p.id?' selected':'')+'>'+p.lbl+'</option>').join('')+'</select></div>'
      + '<div class="field"><label>Motivos exibidos por card</label><input id="cfTop" type="number" min="1" max="8" value="'+esc(c.topMotivos)+'"></div>'
      + '<div class="field"><label>Início do dia de produção</label><input id="cfDia" type="time" value="'+esc(c.inicioDia)+'"></div>'
      + '<div class="field"><label>Tamanho do painel</label><select id="cfEsc">'
        + [['auto','Automático'],['p','Pequeno'],['m','Médio'],['g','Grande (TV)'],['gg','Muito grande (TV 4K)']]
            .map(([v,l])=>'<option value="'+v+'"'+(c.escala===v?' selected':'')+'>'+l+'</option>').join('')+'</select></div>'
    + '</div>'
    + '<div class="form-grid">'
      + '<label class="sw"><input type="checkbox" id="cfAlarme" '+(c.alarme?'checked':'')+'><span>Alarme sonoro<small>bipa quando um posto fica crítico</small></span></label>'
      + '<label class="sw"><input type="checkbox" id="cfMod" '+(c.mostrarModelos?'checked':'')+'><span>Mostrar modelos<small>FPY por modelo de motor</small></span></label>'
      + '<label class="sw"><input type="checkbox" id="cfTema" '+(c.tema==='light'?'checked':'')+'><span>Tema claro<small>padrão é escuro (TV)</small></span></label>'
    + '</div>'
    + '<div class="mgrp"><h4>'+I.clock+' Turnos</h4><div class="form-grid" id="cfTurnos">'
      + c.turnos.map((t,i)=>'<div class="field"><label>'+esc(t.nome||('Turno '+t.id))+'</label>'
          + '<div style="display:flex;gap:6px;align-items:center"><input type="time" data-t="'+i+'" data-f="ini" value="'+esc(t.ini)+'">'
          + '<span style="color:var(--muted);font-weight:700">até</span>'
          + '<input type="time" data-t="'+i+'" data-f="fim" value="'+esc(t.fim)+'"></div></div>').join('')
      + '</div></div>'
    + '<div class="aviso">'+I.alert+'<span>As configurações valem para este aparelho. Com o servidor ligado elas também são gravadas na base, '
      + 'e os demais painéis passam a usar as mesmas metas na próxima leitura.</span></div>';

  modal({ titulo:'Configurações do painel', icone:I.cog, corpo,
    botoes:'<button class="btn ghost" data-r="1">Restaurar padrão</button>'
      + '<button class="btn ghost" data-c="1">Cancelar</button>'
      + '<button class="btn primary" data-s="1">'+I.check+'Salvar</button>' });

  $('[data-c]').onclick = fecharModal;
  $('[data-r]').onclick = ()=>{ if(!confirm('Restaurar todas as configurações e metas padrão?')) return;
    setCfg(cfgPadrao()); cfgSalvar(); fecharModal(); aplicarTema(); render(); toast('Configurações restauradas'); };
  $('[data-s]').onclick = ()=>{
    const k = cfg();
    k.arquivo = ($('#cfArq').value.trim() || 'leak.csv');
    k.intervalo = clamp(numBR($('#cfInt').value)||5, 1, 120);
    k.periodo = $('#cfPer').value;
    k.topMotivos = clamp(numBR($('#cfTop').value)||4, 1, 8);
    k.inicioDia = $('#cfDia').value || '00:00';
    k.escala = $('#cfEsc').value;
    k.alarme = $('#cfAlarme').checked;
    k.mostrarModelos = $('#cfMod').checked;
    k.tema = $('#cfTema').checked? 'light':'dark';
    $$('#cfTurnos input[data-t]').forEach(inp=>{ const t = k.turnos[+inp.dataset.t]; if(t && inp.value) t[inp.dataset.f] = inp.value; });
    cfgSalvar(); fecharModal(); aplicarTema(); reiniciarContagem(); render(); toast('Configurações salvas');
  };
}

/* ---------- Fonte de dados ---------- */
function modalFonte(){
  const c = cfg();
  const modoTxt = Backend.modo==='servidor'
    ? 'Servidor da base ativo — o painel lê <code class="k">'+esc(c.arquivo)+'</code> da pasta <code class="k">dados</code> a cada '+esc(c.intervalo)+' min.'
    : 'Sem servidor. Você pode carregar um CSV manualmente (fica só neste aparelho) ou usar a demonstração.';
  const corpo = ''
    + '<div class="aviso">'+I.db+'<span>'+modoTxt+'</span></div>'
    + '<div class="drop" id="dz">'+I.upload+'<div>Solte aqui o CSV de resultados do leak test<br><span style="color:var(--faint)">ou clique para escolher o arquivo</span></div></div>'
    + '<input type="file" id="fz" accept=".csv,.txt,.tsv" style="display:none">'
    + '<div class="mgrp"><h4>'+I.file+' Formato esperado</h4>'
      + '<div style="font-size:12.5px;color:var(--muted);font-weight:600;line-height:1.7">'
      + 'Uma linha por teste realizado. Separador <code class="k">;</code>, <code class="k">,</code> ou tabulação. Colunas aceitas (nomes flexíveis):<br>'
      + '<code class="k">data_hora</code> <code class="k">posto</code> <code class="k">modelo</code> <code class="k">serie</code> '
      + '<code class="k">resultado</code> <code class="k">vazamento</code> <code class="k">limite</code> <code class="k">unidade</code> '
      + '<code class="k">motivo</code> <code class="k">turno</code> <code class="k">reteste</code><br><br>'
      + '<b style="color:var(--txt)">posto</b>: Bloco / Cabeçote / Leak Zero / Water Leak (ou <code class="k">USI_BLOCO</code>, <code class="k">USI_CABECOTE</code>, <code class="k">MON_ZERO</code>, <code class="k">MON_WATER</code>).<br>'
      + '<b style="color:var(--txt)">resultado</b>: OK / NOK (também aceita Aprovado, Reprovado, PASS, FAIL). Sem essa coluna, o resultado é deduzido comparando <i>vazamento</i> com <i>limite</i>.<br>'
      + '<b style="color:var(--txt)">reteste</b>: S/N (ou o número da tentativa). O FPY conta só a 1ª passagem de cada série.'
      + '</div></div>'
    + (Backend.modo==='servidor'? '<div class="mgrp"><h4>'+I.list+' Arquivos na base</h4><div id="lstArq" style="font-size:12.5px;color:var(--muted);font-weight:700">carregando…</div></div>' : '');

  modal({ titulo:'Fonte de dados', icone:I.db, corpo,
    botoes:'<button class="btn ghost" data-demo="1">'+I.gauge+'Usar demonstração</button>'
      + '<button class="btn ghost" data-mod="1">'+I.download+'Baixar modelo CSV</button>'
      + '<button class="btn primary" data-rec="1">'+I.refresh+'Reler base agora</button>' });

  const fz = $('#fz'), dz = $('#dz');
  dz.onclick = ()=> fz.click();
  dz.ondragover = e=>{ e.preventDefault(); dz.classList.add('over'); };
  dz.ondragleave = ()=> dz.classList.remove('over');
  dz.ondrop = e=>{ e.preventDefault(); dz.classList.remove('over'); if(e.dataTransfer.files[0]) lerArquivo(e.dataTransfer.files[0]); };
  fz.onchange = ()=>{ if(fz.files[0]) lerArquivo(fz.files[0]); };
  $('[data-demo]').onclick = ()=>{ usarDemo(); fecharModal(); render(); toast('Dados de demonstração carregados','info'); };
  $('[data-mod]').onclick = ()=> download('modelo-leak.csv', regsParaCSV(demoRegistros().slice(0,300)));
  $('[data-rec]').onclick = ()=>{ fecharModal(); carregar(true); };

  if(Backend.modo==='servidor'){
    Backend.listarArquivos().then(l=>{
      const el = $('#lstArq'); if(!el) return;
      el.innerHTML = (l && l.length)
        ? l.map(a=>'<div style="padding:4px 0;border-top:1px solid var(--line)"><b style="color:var(--txt)">'+esc(a.nome||a)+'</b>'
            +(a.tamanho? ' <span style="color:var(--faint)">· '+nInt(a.tamanho/1024)+' KB</span>':'')
            +(a.mtime? ' <span style="color:var(--faint)">· '+esc(a.mtime)+'</span>':'')+'</div>').join('')
        : 'Nenhum CSV encontrado na pasta <code class="k">dados</code>.';
    });
  }
}
function lerArquivo(file){
  const r = new FileReader();
  r.onload = ()=>{
    try{
      const n = aplicarTexto(r.result, 'arquivo', file.name);
      salvarCache(r.result, 'arquivo', file.name);
      fecharModal(); render(); toast(nInt(n)+' registros carregados de '+file.name);
    }catch(e){ toast('Não foi possível ler esse arquivo — confira as colunas','err'); }
  };
  r.onerror = ()=> toast('Falha ao abrir o arquivo','err');
  r.readAsText(file, 'utf-8');
}

/* ---------- Detalhes / registros ---------- */
function modalDetalhes(postoIni){
  const c = cfg(), jan = janela(c.periodo);
  let filtro = postoIni || '';
  const corpo = ''
    + '<div class="seg" id="fPost" style="flex-wrap:wrap">'
      + '<button data-p="" class="'+(!filtro?'on':'')+'">Todos</button>'
      + POSTOS.map(p=>'<button data-p="'+p.key+'" class="'+(filtro===p.key?'on':'')+'">'+esc(p.nome)+'</button>').join('')
    + '</div>'
    + '<div id="resumo"></div>'
    + '<div class="tbl-wrap"><table class="tbl"><thead><tr>'
      + '<th>Data / hora</th><th>Posto</th><th>Modelo</th><th>Série</th><th>Resultado</th>'
      + '<th>Vazamento</th><th>Limite</th><th>Motivo</th><th>Turno</th><th>Passagem</th>'
      + '</tr></thead><tbody id="tbody"></tbody></table></div>';

  modal({ titulo:'Registros do período — '+jan.rot, icone:I.list, corpo, largura:'1100px',
    botoes:'<button class="btn ghost" data-exp="1">'+I.download+'Exportar registros (CSV)</button>'
      + '<button class="btn ghost" data-res="1">'+I.download+'Exportar resumo (CSV)</button>'
      + '<button class="btn primary" data-c="1">Fechar</button>' });
  $('[data-c]').onclick = fecharModal;

  function lista(){
    return ST.regs.filter(r=> r.ts>=jan.ini && r.ts<=jan.fim && (!filtro || r.posto===filtro));
  }
  function pinta(){
    const l = lista();
    const ag = ST.agregado;
    const alvos = filtro? [POSTO_BY[filtro]] : POSTOS;
    $('#resumo').innerHTML = '<div class="chips" style="flex-direction:row;flex-wrap:wrap;gap:6px">'
      + alvos.map(p=>{ const s = ag.postos[p.key];
          const cls = s.status==='ok'?'ok':s.status==='warn'?'warn':s.status==='bad'?'bad':'';
          return '<span class="chip"><i style="background:'+p.cor+'"></i><span class="nm">'+esc(p.nome)+'</span>'
            + '<span class="vl '+cls+'">'+n1(s.fpy)+'%</span><span class="of">'+nInt(s.testadas)+' testes · '+nInt(s.nok1)+' NOK · '
            + nInt(s.retestes)+' reteste'+(s.retestes===1?'':'s')+'</span></span>';
        }).join('') + '</div>';
    const ult = l.slice(-400).reverse();
    $('#tbody').innerHTML = ult.map(r=>'<tr>'
      + '<td>'+dtBR(r.ts)+'</td>'
      + '<td>'+esc((POSTO_BY[r.posto]||{}).nome||r.posto)+'</td>'
      + '<td>'+esc(r.modelo||'—')+'</td>'
      + '<td>'+esc(r.serie||'—')+'</td>'
      + '<td><span class="tag '+(r.res==='NOK'?'nok':'ok')+'">'+r.res+'</span></td>'
      + '<td>'+(isFinite(r.valor)? n2(r.valor)+' '+esc(r.unid||'') : '—')+'</td>'
      + '<td>'+(isFinite(r.limite)? n2(r.limite) : '—')+'</td>'
      + '<td>'+esc(r.motivo||'—')+'</td>'
      + '<td>'+esc(r.turno||'—')+'</td>'
      + '<td>'+(r.reteste? 'reteste':'1ª')+'</td>'
      + '</tr>').join('') || '<tr><td colspan="10" style="color:var(--muted)">Nenhum registro no período.</td></tr>';
  }
  $$('#fPost button').forEach(b=> b.onclick = ()=>{
    filtro = b.dataset.p; $$('#fPost button').forEach(x=>x.classList.toggle('on', x===b)); pinta();
  });
  $('[data-exp]').onclick = ()=> download('leak-registros.csv', regsParaCSV(lista()));
  $('[data-res]').onclick = ()=>{
    const ag = ST.agregado;
    const cab = 'posto;periodo;testadas;aprovadas_1a;nok_1a;fpy_%;retestes;pecas;refugo;yield_final_%;meta_%;minimo_%;max_nok;vazamento_medio;limite;unidade;principal_motivo';
    const linhas = POSTOS.map(p=>{ const s = ag.postos[p.key], k = s.cfg||{};
      return [p.nome, ag.jan.rot, s.testadas, s.ok1, s.nok1, n1(s.fpy), s.retestes, s.pecas, s.refugo, n1(s.yieldFinal),
        k.metaFpy, k.minFpy, k.maxNok, isFinite(s.mediaVal)? n2(s.mediaVal):'', isFinite(s.limite)? n1(s.limite):'', s.unid,
        (s.motivos[0]? s.motivos[0].nome+' ('+s.motivos[0].qtd+')' : '')].join(';'); });
    download('leak-resumo.csv', cab+'\n'+linhas.join('\n'));
  };
  pinta();
}

/* ============================================================
   TEMA, RELÓGIO E CICLO DE ATUALIZAÇÃO
   ============================================================ */
function aplicarTema(){
  const c = cfg();
  document.documentElement.dataset.theme = c.tema==='light'? 'light':'dark';
  if(c.escala && c.escala!=='auto') document.documentElement.dataset.esc = c.escala;
  else delete document.documentElement.dataset.esc;
}
function relogio(){
  const d = new Date();
  $('#relogio').textContent = hhmm(d);
  $('#dataHoje').textContent = d.toLocaleDateString('pt-BR',{weekday:'short', day:'2-digit', month:'2-digit', year:'numeric'})
    .replace('.','').replace(/^(\w)/, m=>m.toUpperCase());
}
function tique(){
  relogio();
  if(!ST.carregando){
    ST.proximaEm = Math.max(0, ST.proximaEm-1);
    if(ST.proximaEm===0) carregar(false);
  }
  const el = $('#pfNext');
  if(el){ const mm=Math.floor(ST.proximaEm/60), ss=ST.proximaEm%60;
    el.innerHTML = I.refresh+' Próxima em: <b>'+(ST.carregando?'lendo…':String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0'))+'</b>'; }
}

/* ---------- Atalhos de teclado ---------- */
document.addEventListener('keydown', e=>{
  if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if(k==='escape') return fecharModal();
  if(k==='r'){ Som.liberar(); carregar(true); }
  else if(k==='f') telaCheia();
  else if(k==='m'){ const c=cfg(); c.alarme=!c.alarme; cfgSalvar(); atualizarBotoes(); toast('Alarme '+(c.alarme?'ligado':'desligado'),'info'); }
  else if(k==='c') modalConfig();
  else if(k==='t') modalMetas();
  else if(k==='d') modalDetalhes('');
  else if(/^[1-5]$/.test(k)){ const p = PERIODOS[+k-1]; if(p){ cfg().periodo=p.id; cfgSalvar(); render(); } }
});
document.addEventListener('fullscreenchange', atualizarBotoes);
document.addEventListener('click', ()=> Som.liberar(), {once:true});

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
(async function iniciar(){
  $('#phLogo').innerHTML = I.drop;
  cfgCarregarLocal();
  aplicarTema();
  relogio(); setInterval(tique, 1000);

  await Backend.init();
  if(Backend.modo==='servidor'){
    const remota = await Backend.lerCfg();
    if(remota) setCfg(mescla(cfg(), remota));
    aplicarTema();
  }
  reiniciarContagem();
  await carregar(false);

  // Recarrega ao voltar para a aba se a leitura estiver vencida
  document.addEventListener('visibilitychange', ()=>{
    if(!document.hidden && ST.atualizadoEm && (Date.now()-ST.atualizadoEm.getTime()) > (numBR(cfg().intervalo)||5)*60000) carregar(false);
  });
})();
})();
