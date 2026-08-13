/* ══════════════════════════════════════════════════════════════════════
   TECLADO VIRTUAL — para o PC do painel, que não tem teclado físico.

   Toca num campo, o teclado sobe da parte de baixo da tela. As teclas são
   grandes de propósito: o alvo é dedo em tela, não cursor de mouse.

   Duas coisas que ele NÃO pode atrapalhar:
    - o leitor RFID, que é um teclado de verdade e digita sozinho no campo
      em foco. Por isso o teclado da tela nunca rouba o foco do campo;
    - o encadeamento por Enter que as telas já usam (crachá → telefone →
      salvar). A tecla OK dispara um Enter de verdade no campo, então quem
      trata Enter continua sendo a página, não o teclado.

   Carregado pelo index.html e pelo cadastro.html. O CSS vem junto, aqui
   dentro, para não ter que manter a mesma folha em dois arquivos.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

const LINHAS_TEXTO = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l','ç'],
  ['á','à','â','ã','é','ê','í','ó','ô','õ','ú'],
  [{t:'⇧',a:'shift',c:'esp'},'z','x','c','v','b','n','m','-','.',
   {t:'⌫',a:'apaga',c:'esp apaga'}],
];
const LINHAS_NUM = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  [{t:'⌫',a:'apaga',c:'esp apaga'},'0',{t:'-',v:'-'}],
];

const CSS = `
.tecl{position:fixed;left:0;right:0;bottom:0;z-index:9000;display:none;
  padding:.7rem .8rem 1rem;background:rgba(9,16,32,.985);
  border-top:1px solid #2c3d63;box-shadow:0 -18px 50px -12px rgba(0,0,0,.75);
  font-family:'Segoe UI',system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif}
.tecl.on{display:block}
.tecl .cab{display:flex;align-items:center;gap:.7rem;margin-bottom:.6rem}
.tecl .rot{font-size:.78rem;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:#9fb0cc}
.tecl .eco{flex:1;min-width:0;padding:.5rem .8rem;border-radius:.5rem;background:#080e1b;
  border:1px solid #2c3d63;color:#eaf0fb;font-size:1.05rem;font-weight:700;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:2.3rem}
.tecl .eco:empty::before{content:attr(data-vazio);color:#6f83a5;font-weight:600}
.tecl .fechar{width:2.6rem;height:2.6rem;border-radius:.6rem;flex:none;font-size:1.1rem;
  background:#152341;border:1px solid #2c3d63;color:#9fb0cc;cursor:pointer;font-weight:800}
.tecl .linha{display:flex;gap:.4rem;justify-content:center;margin-bottom:.4rem}
.tecl button.k{flex:1 1 0;min-width:0;height:3rem;border-radius:.6rem;cursor:pointer;
  background:#1b2c50;border:1px solid #33477280;color:#eaf0fb;
  font-size:1.35rem;font-weight:700;line-height:1;
  display:flex;align-items:center;justify-content:center;
  -webkit-tap-highlight-color:transparent;user-select:none;transition:transform .06s,filter .1s}
.tecl button.k:active,.tecl button.k.batendo{transform:translateY(2px);filter:brightness(1.5)}
.tecl button.k.esp{font-size:1.1rem;font-weight:800;background:#152341;color:#9fb0cc}
.tecl button.k.apaga{background:#3a1f2b;border-color:#7f2c3f;color:#fca5a5}
.tecl button.k.shift-on{background:#14b8a6;border-color:#14b8a6;color:#04211f}
.tecl button.k.espaco{flex:4 1 0}
.tecl button.k.ok{flex:2 1 0;background:#3b82f6;border-color:#3b82f6;color:#fff;font-weight:800;font-size:1.1rem}
.tecl button.k.limpa{flex:1.6 1 0;font-size:1rem;overflow:hidden;font-weight:800;background:#152341;color:#9fb0cc}
/* largura explícita: com left:50% e right:auto, sem width o bloco encolhe
   para caber no conteúdo e a última fileira transborda */
.tecl.num{width:min(30rem,94vw);left:50%;right:auto;transform:translateX(-50%);
  border:1px solid #2c3d63;border-radius:1rem;padding-bottom:.8rem}
.tecl.num button.k{height:3.6rem;font-size:1.6rem}
@media (max-width:900px){ .tecl button.k{height:3rem;font-size:1.15rem} }
`;

/* Um único teclado vive na página, escondido enquanto não serve. Já houve
   um bug aqui: fechar largava o elemento no DOM e abrir criava outro, então
   iam se empilhando teclados invisíveis — e os toques caíam no errado. */
let el = null, modo = null;           // o elemento e o layout que ele tem
let cx = null;                        // { el, eco, alvo, modo, shift } enquanto aberto
let corpoPad = '';

const criaEl = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

function estilo(){
  if (document.getElementById('teclCSS')) return;
  const s = criaEl('style'); s.id = 'teclCSS'; s.textContent = CSS;
  document.head.appendChild(s);
}

/** Qual teclado o campo pede: numérico para telefone, texto para o resto. */
function modoDe(alvo){
  if (alvo.dataset.teclado) return alvo.dataset.teclado;
  if (alvo.type === 'number' || alvo.inputMode === 'tel' || alvo.inputMode === 'numeric') return 'numero';
  return 'texto';
}

function monta(modo){
  const el = criaEl('div', 'tecl' + (modo === 'numero' ? ' num' : ''));
  el.id = 'tecladoVirtual';
  el.setAttribute('role','group');
  el.setAttribute('aria-label','Teclado virtual');

  const cab = criaEl('div','cab');
  const rot = criaEl('div','rot'); rot.id = 'teclRot';
  const eco = criaEl('div','eco'); eco.id = 'teclEco';
  const fechar = criaEl('button','fechar'); fechar.type='button';
  fechar.textContent = '✕'; fechar.title = 'Fechar o teclado';
  fechar.addEventListener('click', () => fecha());
  cab.append(rot, eco, fechar);
  el.appendChild(cab);

  const linhas = modo === 'numero' ? LINHAS_NUM : LINHAS_TEXTO;
  linhas.forEach(ls => {
    const ln = criaEl('div','linha');
    ls.forEach(k => {
      const def = typeof k === 'string' ? { t:k, v:k } : k;
      const b = criaEl('button','k' + (def.c ? ' ' + def.c : ''));
      b.type = 'button';
      b.textContent = def.t;
      b.dataset.acao = def.a || 'letra';
      b.dataset.valor = def.v != null ? def.v : def.t;
      ln.appendChild(b);
    });
    el.appendChild(ln);
  });

  // última linha: espaço, limpar e OK
  const fim = criaEl('div','linha');
  if (modo !== 'numero'){
    const esp = criaEl('button','k espaco esp'); esp.type='button';
    esp.textContent = 'espaço'; esp.dataset.acao='letra'; esp.dataset.valor=' ';
    fim.appendChild(esp);
  }
  const lim = criaEl('button','k limpa'); lim.type='button';
  lim.textContent = 'limpar'; lim.dataset.acao = 'limpa';
  const ok = criaEl('button','k ok'); ok.type='button';
  ok.textContent = 'OK'; ok.dataset.acao = 'ok';
  fim.append(lim, ok);
  el.appendChild(fim);

  // pointerdown com preventDefault: sem isso o campo perde o foco no toque,
  // e aí o texto não teria para onde ir
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    const b = e.target.closest('button.k');
    if (b){ b.classList.add('batendo'); setTimeout(()=>b.classList.remove('batendo'), 90); aperta(b); }
  });
  el.addEventListener('mousedown', e => e.preventDefault());   // navegadores sem pointer events
  el.addEventListener('click', e => {
    const b = e.target.closest('button.k');
    if (b && !('PointerEvent' in window)) aperta(b);
  });

  document.body.appendChild(el);
  return el;
}

/** Rótulo do campo, para a pessoa saber o que está preenchendo. */
function rotuloDe(alvo){
  if (alvo.dataset.rotulo) return alvo.dataset.rotulo;
  const lb = alvo.id && document.querySelector('label[for="' + alvo.id + '"]');
  if (lb) return lb.textContent.replace(/\(opcional\)/i,'').trim();
  return alvo.placeholder || 'Digite';
}

/** Espelho do que está sendo digitado — o campo pode estar coberto ou
    mascarado, e sem isso a pessoa digita às cegas. */
function pintaEco(){
  if (!cx) return;
  const v = cx.alvo.value || '';
  cx.eco.textContent = cx.alvo.type === 'password' ? '•'.repeat(v.length) : v;
  cx.eco.dataset.vazio = cx.alvo.placeholder || '';
  const sh = cx.el.querySelector('[data-acao="shift"]');
  if (sh) sh.classList.toggle('shift-on', cx.shift);
  cx.el.querySelectorAll('[data-acao="letra"]').forEach(b => {
    const v0 = b.dataset.valor;
    if (v0.length === 1 && v0 !== ' ' && v0.toLowerCase() !== v0.toUpperCase())
      b.textContent = cx.shift ? v0.toUpperCase() : v0;
  });
}

function insere(txt){
  const a = cx.alvo;
  const i = a.selectionStart == null ? a.value.length : a.selectionStart;
  const f = a.selectionEnd == null ? a.value.length : a.selectionEnd;
  a.value = a.value.slice(0, i) + txt + a.value.slice(f);
  const p = i + txt.length;
  try{ a.setSelectionRange(p, p); }catch(e){ /* type=number não aceita seleção */ }
  a.dispatchEvent(new Event('input', { bubbles:true }));
}

function apaga(){
  const a = cx.alvo;
  const i = a.selectionStart == null ? a.value.length : a.selectionStart;
  const f = a.selectionEnd == null ? a.value.length : a.selectionEnd;
  if (i !== f){ a.value = a.value.slice(0,i) + a.value.slice(f); try{a.setSelectionRange(i,i)}catch(e){} }
  else if (i > 0){ a.value = a.value.slice(0,i-1) + a.value.slice(i); try{a.setSelectionRange(i-1,i-1)}catch(e){} }
  a.dispatchEvent(new Event('input', { bubbles:true }));
}

function aperta(b){
  if (!cx) return;
  const acao = b.dataset.acao;
  if (acao === 'shift'){ cx.shift = !cx.shift; pintaEco(); return; }
  if (acao === 'apaga'){ apaga(); pintaEco(); return; }
  if (acao === 'limpa'){
    cx.alvo.value = '';
    cx.alvo.dispatchEvent(new Event('input', { bubbles:true }));
    cx.shift = cx.modo === 'texto';        // campo vazio de novo: volta a maiúscula
    pintaEco(); return;
  }
  if (acao === 'ok'){ confirma(); return; }

  let v = b.dataset.valor;
  if (cx.shift && v.length === 1) v = v.toUpperCase();
  insere(v);
  // maiúscula automática só na primeira letra e depois de espaço: é assim
  // que se digita nome de gente, que é o que mais se digita aqui
  cx.shift = /(^|\s)$/.test(cx.alvo.value);
  pintaEco();
}

/** OK dispara um Enter de verdade: quem decide o que fazer é a página. */
function confirma(){
  const antes = cx.alvo;
  antes.dispatchEvent(new KeyboardEvent('keydown',
    { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, cancelable:true }));
  antes.dispatchEvent(new Event('change', { bubbles:true }));
  // a página costuma mandar o foco para o campo seguinte: o teclado segue
  setTimeout(() => {
    const dep = document.activeElement;
    if (dep && dep !== antes && ehCampo(dep)) abre(dep);
    else if (dep !== antes || !document.contains(antes)) fecha();
    else fecha();
  }, 30);
}

const ehCampo = el => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
  && !['checkbox','radio','file','button','submit','range','hidden'].includes(el.type)
  && el.dataset.teclado !== 'nao' && !el.readOnly && !el.disabled;

function abre(alvo){
  if (!ehCampo(alvo)) return;
  estilo();
  const m = modoDe(alvo);
  if (!el || modo !== m){ if (el) el.remove(); el = monta(m); modo = m; }
  cx = { el, eco:el.querySelector('#teclEco'), alvo, modo:m, shift:false };
  cx.el.querySelector('#teclRot').textContent = rotuloDe(alvo);
  cx.shift = !alvo.value && modo === 'texto';
  cx.el.classList.add('on');

  // reserva espaço embaixo e traz o campo para a área visível: com o
  // teclado aberto, metade da tela some
  if (!corpoPad) corpoPad = document.body.style.paddingBottom || '0px';
  document.body.style.paddingBottom = (cx.el.offsetHeight + 24) + 'px';
  // a página pode encolher listas e painéis para não ficarem atrás do teclado
  document.documentElement.style.setProperty('--tecl-alt', cx.el.offsetHeight + 'px');
  document.body.classList.add('tecl-aberto');
  pintaEco();

  const r = alvo.getBoundingClientRect();
  const alt = cx.el.offsetHeight;
  if (m === 'numero'){
    // o teclado numérico é pequeno: vale a pena colar embaixo do campo, em
    // vez de mandar a pessoa até o pé de uma tela de 2560 px
    let topo = r.bottom + 14;
    if (topo + alt > window.innerHeight - 8) topo = window.innerHeight - alt - 8;
    cx.el.style.top = Math.max(8, topo) + 'px';
    cx.el.style.bottom = 'auto';
  } else {
    // o de texto fica ancorado embaixo, que é onde todo mundo espera achar
    cx.el.style.top = 'auto'; cx.el.style.bottom = '0';
    const limite = window.innerHeight - alt - 12;
    if (r.bottom > limite) window.scrollBy({ top: r.bottom - limite + 16, behavior:'smooth' });
  }
}

function fecha(){
  if (el) el.classList.remove('on');       // fica no DOM, escondido e reaproveitável
  if (!cx) return;
  // solta o foco do campo: com o cursor parado dentro de um input, o leitor
  // RFID digitaria a tag ali em vez de o painel registrar a leitura
  if (document.activeElement === cx.alvo && cx.alvo.blur) cx.alvo.blur();
  document.body.classList.remove('tecl-aberto');
  document.body.style.paddingBottom = corpoPad;
  cx = null;
}

function ligar(){
  // pointerdown e não click: assim o teclado já está no ar quando o campo
  // recebe o foco, e nada pisca
  document.addEventListener('pointerdown', e => {
    const alvo = e.target.closest && e.target.closest('input,textarea');
    if (alvo && ehCampo(alvo)){ setTimeout(() => abre(alvo), 0); return; }
    if (cx && !e.target.closest('#tecladoVirtual')) fecha();
  }, true);
  // teclado físico, quando houver: Esc fecha
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecha(); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar);
else ligar();

window.TecladoVirtual = { abre, fecha, ligar, aberto: () => !!cx, campo: () => cx && cx.alvo };
})();
