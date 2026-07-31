/* Monta o pacote do painel: app/index.html (arquivo único) + servidor + ícones.
   Uso:  cd src && node build.mjs
   O Node é necessário só para o build — o painel em si é HTML puro. */
import fs from 'fs';
import path from 'path';

const S = '<'+'script>', E = '</'+'script>';
const head = fs.readFileSync('parts/head.html','utf8');
const app  = fs.readFileSync('parts/app.js','utf8');
const app2 = fs.readFileSync('parts/app2.js','utf8');

const indexHtml = head + '\n' + S + app + E + '\n' + S + app2 + E + '\n</body>\n</html>\n';

const OUT = '../app';
fs.mkdirSync(OUT, { recursive:true });
fs.writeFileSync(path.join(OUT,'index.html'), indexHtml);

for(const f of ['servir.ps1','Iniciar-Servidor-LeakTest.bat','Abrir-Painel-da-Rede.bat','Abrir-TV-Tela-Cheia.bat','manifest.json','LEIA-ME.md']){
  fs.copyFileSync(path.join('server',f), path.join(OUT,f));
}
for(const f of ['icon-192.png','icon-512.png']){
  fs.copyFileSync(f, path.join(OUT,f));
}
fs.writeFileSync(path.join(OUT,'leak-exemplo.csv'), exemploCSV());

const kb = n => (n/1024).toFixed(1)+' KB';
console.log('index.html:', kb(indexHtml.length));
console.log('pacote em :', path.resolve(OUT));
console.log('arquivos  :', fs.readdirSync(OUT).join(', '));

/* ---------- CSV de exemplo (3 dias de produção nos 4 postos) ---------- */
function exemploCSV(){
  const postos = [
    { nome:'Bloco',      key:'USI_BLOCO',    fpy:97.6, pph:46, lim:5, mot:['Galeria de água','Galeria de óleo','Camisa / cilindro','Face de fogo','Bujão de expansão'] },
    { nome:'Cabeçote',   key:'USI_CABECOTE', fpy:96.4, pph:44, lim:4, mot:['Câmara de combustão','Galeria de água','Sede de válvula','Guia de válvula','Porosidade'] },
    { nome:'Leak Zero',  key:'MON_ZERO',     fpy:99.1, pph:38, lim:3, mot:['Junta do cabeçote','Cárter','Tampa de válvulas','Bujões / sensores'] },
    { nome:'Water Leak', key:'MON_WATER',    fpy:98.2, pph:38, lim:6, mot:["Bomba d'água",'Carcaça do termostato','Junta do cabeçote','Mangueira / abraçadeira'] },
  ];
  const modelos = ['1.0','1.5','1.5 Turbo'];
  let semente = 20260731;
  const rnd = () => (semente = (semente*1103515245 + 12345) % 2147483648) / 2147483648;
  const p2 = n => String(n).padStart(2,'0');
  const fmt = d => d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())+' '+p2(d.getHours())+':'+p2(d.getMinutes())+':'+p2(d.getSeconds());
  const turno = d => { const h=d.getHours()*60+d.getMinutes(); return (h>=360&&h<860)?'1':(h>=860&&h<1360)?'2':'3'; };

  const linhas = [];
  let seq = 100000;
  const agora = Date.now();
  for(const p of postos){
    for(let h=72; h>=0; h--){
      const base = agora - h*3600e3;
      const d0 = new Date(base);
      if(d0.getDay()===0) continue;
      const carga = (d0.getHours()>=6 && d0.getHours()<22) ? 1 : 0.55;
      const qtd = Math.round(p.pph*carga*(0.8+rnd()*0.4));
      const fpyH = Math.min(100, Math.max(88, p.fpy + (rnd()*3-1.6)));
      for(let i=0;i<qtd;i++){
        const ts = new Date(base + Math.floor(rnd()*3600e3));
        const nok = rnd()*100 > fpyH;
        const serie = p.key.slice(0,3)+(++seq);
        const modelo = modelos[Math.floor(rnd()*3)];
        const val = nok ? p.lim*(1.1+rnd()*1.8) : p.lim*(0.15+rnd()*0.6);
        linhas.push([fmt(ts), p.nome, modelo, serie, nok?'NOK':'OK', val.toFixed(2).replace('.',','),
                     String(p.lim).replace('.',','), 'cc/min', nok? p.mot[Math.floor(rnd()*p.mot.length)]:'', turno(ts), 'N'].join(';'));
        if(nok && rnd()<0.7){
          const ts2 = new Date(ts.getTime()+22*60000);
          linhas.push([fmt(ts2), p.nome, modelo, serie, rnd()<0.85?'OK':'NOK', (p.lim*0.5).toFixed(2).replace('.',','),
                       String(p.lim).replace('.',','), 'cc/min', '', turno(ts2), 'S'].join(';'));
        }
      }
    }
  }
  linhas.sort();
  return 'data_hora;posto;modelo;serie;resultado;vazamento;limite;unidade;motivo;turno;reteste\n'+linhas.join('\n')+'\n';
}
