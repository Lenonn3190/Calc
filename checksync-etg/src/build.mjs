import fs from 'fs';
import path from 'path';

const S='<'+'script>', E='</'+'script>';
const head=fs.readFileSync('parts/head.html','utf8');
const fflate=fs.readFileSync('package/umd/index.js','utf8');
const jspdf=fs.readFileSync('jspdf/package/dist/jspdf.umd.min.js','utf8');
const autotable=fs.readFileSync('jsat/package/dist/jspdf.plugin.autotable.min.js','utf8');
const app=fs.readFileSync('parts/app.js','utf8');
const app2=fs.readFileSync('parts/app2.js','utf8');
const app3=fs.readFileSync('parts/app3.js','utf8');

// HTML ÚNICO, tudo embutido: libs (fflate, jsPDF, autotable) + app
const indexHtml =
  head+'\n'+
  S+fflate+E+'\n'+ S+jspdf+E+'\n'+ S+autotable+E+'\n'+
  S+app+E+'\n'+ S+app2+E+'\n'+ S+app3+E+'\n'+
  '</body>\n</html>\n';

// 1) HTML único (desktop: abrir direto e conectar pasta; ou servir)
fs.writeFileSync('CheckSync_ETG.html', indexHtml);
fs.writeFileSync('checksync_etg.html', indexHtml);  // cópia p/ testes

// 2) Pacote servidor (celular + PC via rede, dados no OneDrive)
const OUT='dist/CheckSync ETG (Servidor)';
fs.rmSync('dist',{recursive:true,force:true});
fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(path.join(OUT,'index.html'), indexHtml);
fs.copyFileSync('server/servir.ps1', path.join(OUT,'servir.ps1'));
fs.copyFileSync('server/Iniciar-Servidor-CheckSync.bat', path.join(OUT,'Iniciar-Servidor-CheckSync.bat'));
fs.copyFileSync('server/Definir-Pasta-OneDrive.bat', path.join(OUT,'Definir-Pasta-OneDrive.bat'));
fs.copyFileSync('server/LEIA-ME.md', path.join(OUT,'LEIA-ME.md'));
fs.copyFileSync('server/manifest.json', path.join(OUT,'manifest.json'));
fs.copyFileSync('icon-192.png', path.join(OUT,'icon-192.png'));
fs.copyFileSync('icon-512.png', path.join(OUT,'icon-512.png'));

console.log('HTML único:', (indexHtml.length/1024).toFixed(0)+' KB');
console.log('pacote servidor:', OUT);
console.log('arquivos:', fs.readdirSync(OUT).join(', '));
