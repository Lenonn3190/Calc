/* ============================================================
   CheckSync ETG — Parte 3: geração de PDF real do laudo (jsPDF)
   e integração com a base compartilhada (salvar PDF na pasta).
   ============================================================ */
(function(){
"use strict";
const esc=s=>String(s==null?'':s);
const IST={C:'Conforme',R:'Restrição',NC:'Não Conf.',NA:'N/A'};
const FST={'APROVADO':['#dcfce7','#15803d'],'APROVADO COM RESTRIÇÕES':['#fef3c7','#b45309'],'REPROVADO / INTERDITADO':['#fee2e2','#b91c1c']};
function stats(l){let C=0,R=0,NC=0,NA=0,a=0;l.itens.forEach(it=>{if(it.status==='C'){C++;a++;}else if(it.status==='R'){R++;a++;}else if(it.status==='NC'){NC++;a++;}else if(it.status==='NA')NA++;});return{C,R,NC,NA,aval:a,conf:a?Math.round(C/a*100):0};}
function fmtDate(iso){ if(!iso) return '—'; const d=new Date(iso.length<=10?iso+'T00:00:00':iso); return isNaN(d)?iso:d.toLocaleDateString('pt-BR'); }
function hx(h){ h=(h||'').replace('#',''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
function hasPDF(){ return !!(window.jspdf && window.jspdf.jsPDF); }

function buildDoc(l){
  const { jsPDF }=window.jspdf; const doc=new jsPDF({unit:'mm',format:'a4'});
  const W=210, M=12, R=W-M, cw=R-M;
  const st=stats(l);
  const navy=[18,32,60], ink=[13,21,38], mut=[107,122,149], line=[201,212,230];
  let y=15;
  // ---- Cabeçalho ----
  if(l.logo){ try{ doc.addImage(l.logo,'PNG',M,y-3,14,14); }catch(e){} }
  const tx=l.logo?M+18:M;
  doc.setTextColor(...navy); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text('CheckSync ETG',tx,y+3);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...mut);
  doc.text(((l.empresa||'')+'  •  CNPJ '+(l.cnpj||'')).slice(0,70),tx,y+8);
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...navy); doc.text(String(l.numero),R,y-1,{align:'right'});
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...mut);
  doc.text('Emitido: '+fmtDate(l.createdAt.slice(0,10)),R,y+3.5,{align:'right'});
  doc.text('Conformidade: '+st.conf+'%',R,y+7.5,{align:'right'});
  y+=13; doc.setDrawColor(...navy); doc.setLineWidth(0.7); doc.line(M,y,R,y); y+=6;
  // ---- Título ----
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...navy);
  doc.text('RELATÓRIO DE INSPEÇÃO TÉCNICO-OPERACIONAL',W/2,y,{align:'center'}); y+=4;
  // ---- Faixa de status ----
  const f=FST[l.statusFinal]||FST['APROVADO']; const bg=hx(f[0]), fg=hx(f[1]);
  doc.setFillColor(...bg); doc.roundedRect(M,y,cw,8,1.5,1.5,'F');
  doc.setTextColor(...fg); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(String(l.statusFinal),W/2,y+5.4,{align:'center'}); y+=12;
  // ---- Dados do equipamento ----
  const boxY=y, boxH=27, hasFoto=!!l.assetSnapshot.foto, photoW=hasFoto?34:0;
  doc.setDrawColor(...line); doc.setLineWidth(0.3); doc.roundedRect(M,boxY,cw,boxH,1.5,1.5);
  if(hasFoto){ try{ doc.addImage(l.assetSnapshot.foto,'JPEG',R-photoW-2,boxY+2.5,photoW,boxH-5);}catch(e){} }
  const kv=[['Equipamento',l.assetSnapshot.nome],['TAG',l.assetSnapshot.tag],['Categoria',l.assetSnapshot.categoria],['Setor',l.assetSnapshot.setor],['Data da Vistoria',fmtDate(l.data)],['Inspetor',l.inspetor]];
  const leftW=cw-photoW-6, colW=leftW/2, rowH=(boxH-4)/3;
  kv.forEach((p,i)=>{ const col=i%2,row=Math.floor(i/2); const cx=M+3+col*colW, cy=boxY+5.5+row*rowH;
    doc.setFont('helvetica','bold'); doc.setFontSize(6.4); doc.setTextColor(...mut); doc.text(String(p[0]).toUpperCase(),cx,cy);
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...ink);
    doc.text(doc.splitTextToSize(String(p[1]||'—'),colW-3)[0],cx,cy+4);
  });
  y=boxY+boxH+5;
  // ---- Checklist (autoTable) ----
  const body=[]; let lastSec='';
  l.itens.forEach(it=>{ if(it.secao!==lastSec){ body.push([{content:it.secao,colSpan:3,styles:{fillColor:[221,231,245],textColor:navy,fontStyle:'bold',fontSize:7.4}}]); lastSec=it.secao; }
    body.push([it.item, it.status?IST[it.status]:'—', it.obs||'']); });
  const stMap={'Conforme':[21,128,61],'Restrição':[180,83,9],'Não Conf.':[185,28,28]};
  doc.autoTable({ startY:y, head:[['Item de Verificação','Status','Observação / Constatação']], body,
    theme:'grid', styles:{fontSize:8,cellPadding:1.4,lineColor:line,lineWidth:0.1,textColor:ink,valign:'middle'},
    headStyles:{fillColor:navy,textColor:[255,255,255],fontSize:7.4,fontStyle:'bold'},
    alternateRowStyles:{fillColor:[247,250,253]},
    columnStyles:{0:{cellWidth:94},1:{cellWidth:24,halign:'center'},2:{cellWidth:'auto'}},
    margin:{left:M,right:M},
    didParseCell:(d)=>{ if(d.section==='body'&&d.column.index===1){ const c=stMap[d.cell.raw]; if(c){ d.cell.styles.textColor=c; d.cell.styles.fontStyle='bold'; } } }
  });
  y=doc.lastAutoTable.finalY+5;
  // Nova página se faltar espaço para parecer+assinaturas
  if(y>250){ doc.addPage(); y=15; }
  // ---- Parecer ----
  doc.setFillColor(238,243,251); doc.rect(M,y,cw,5,'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(7.4); doc.setTextColor(...navy); doc.text('PARECER TÉCNICO E RECOMENDAÇÕES',M+2,y+3.4); y+=5;
  const par=doc.splitTextToSize(l.parecer||'Sem observações adicionais.',cw-4);
  const parH=Math.max(14,par.length*4+4);
  doc.setDrawColor(...line); doc.setLineWidth(0.3); doc.rect(M,y,cw,parH);
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...ink); doc.text(par,M+2,y+4.5); y+=parH+5;
  // ---- Assinaturas ----
  const sw=(cw-4)/2;
  doc.setDrawColor(...line); doc.rect(M,y,sw,22); doc.rect(M+sw+4,y,sw,22);
  if(l.assinatura){ try{ doc.addImage(l.assinatura,'PNG',M+5,y+2,sw-10,12);}catch(e){} }
  doc.setDrawColor(...navy); doc.setLineWidth(0.3); doc.line(M+4,y+15,M+sw-4,y+15); doc.line(M+sw+8,y+15,M+2*sw,y+15);
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...ink);
  doc.text(String(l.inspetor||'—'),M+sw/2,y+18.5,{align:'center'});
  doc.text(String(l.aprovadoPor||'—'),M+sw+4+sw/2,y+18.5,{align:'center'});
  doc.setFont('helvetica','normal'); doc.setFontSize(6.6); doc.setTextColor(...mut);
  doc.text(((l.cargo||'Inspetor')+(l.registro?' • '+l.registro:'')).slice(0,44),M+sw/2,y+21,{align:'center'});
  doc.text('Aprovado por (Gerência)',M+sw+4+sw/2,y+21,{align:'center'});
  // ---- Rodapé em todas as páginas ----
  const np=doc.internal.getNumberOfPages();
  for(let i=1;i<=np;i++){ doc.setPage(i); doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(150,160,175);
    doc.text('CheckSync ETG System — Documento gerado eletronicamente',M,290);
    doc.text(('Laudo '+l.numero+' • '+l.assetSnapshot.nome).slice(0,70),R,290,{align:'right'}); }
  return doc;
}

window.__CS_pdfAvailable = hasPDF;
window.__CS_makeLaudoBlob = function(l){ try{ if(!hasPDF()) return null; return buildDoc(l).output('blob'); }catch(e){ console.error(e); return null; } };
window.__CS_downloadLaudoPDF = function(l){
  try{ if(!hasPDF()){ window.print(); return; } buildDoc(l).save((l.numero||'laudo')+'.pdf'); }
  catch(e){ console.error(e); window.print(); }
};
})();
