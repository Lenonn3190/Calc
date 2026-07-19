import fs from 'fs';
import path from 'path';

const S='<'+'script>', E='</'+'script>';
const head=fs.readFileSync('parts/head.html','utf8');
const fflate=fs.readFileSync('package/umd/index.js','utf8');
const app=fs.readFileSync('parts/app.js','utf8');
const app2=fs.readFileSync('parts/app2.js','utf8');
const app3=fs.readFileSync('parts/app3.js','utf8');

// index.html = head (com <script src> de jspdf/autotable) + fflate + app + app2 + app3 inline
const indexHtml = head+'\n'+S+fflate+E+'\n'+S+app+E+'\n'+S+app2+E+'\n'+S+app3+E+'\n</body>\n</html>\n';

// pasta do pacote
const OUT='dist/CheckSync ETG';
fs.rmSync('dist',{recursive:true,force:true});
fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(path.join(OUT,'index.html'), indexHtml);
fs.copyFileSync('jspdf/package/dist/jspdf.umd.min.js', path.join(OUT,'jspdf.umd.min.js'));
fs.copyFileSync('jsat/package/dist/jspdf.plugin.autotable.min.js', path.join(OUT,'jspdf.plugin.autotable.min.js'));
fs.copyFileSync('server/servir.ps1', path.join(OUT,'servir.ps1'));
fs.copyFileSync('server/Iniciar-Servidor-CheckSync.bat', path.join(OUT,'Iniciar-Servidor-CheckSync.bat'));
fs.copyFileSync('server/Abrir-CheckSync-da-Rede.bat', path.join(OUT,'Abrir-CheckSync-da-Rede.bat'));
fs.copyFileSync('server/LEIA-ME.md', path.join(OUT,'LEIA-ME.md'));
fs.copyFileSync('server/manifest.json', path.join(OUT,'manifest.json'));
fs.copyFileSync('icon-192.png', path.join(OUT,'icon-192.png'));
fs.copyFileSync('icon-512.png', path.join(OUT,'icon-512.png'));

// também mantém um index.html "solto" + libs para os testes locais file://
fs.writeFileSync('checksync_etg.html', indexHtml);
fs.copyFileSync('jspdf/package/dist/jspdf.umd.min.js', 'jspdf.umd.min.js');
fs.copyFileSync('jsat/package/dist/jspdf.plugin.autotable.min.js', 'jspdf.plugin.autotable.min.js');
fs.copyFileSync('server/manifest.json', 'manifest.json');

const kb=n=>(n/1024).toFixed(1)+' KB';
console.log('index.html:', kb(indexHtml.length));
console.log('pacote em:', OUT);
console.log('arquivos:', fs.readdirSync(OUT).join(', '));
