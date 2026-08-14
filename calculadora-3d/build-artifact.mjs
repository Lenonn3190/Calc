/*
 * build-artifact.mjs — gera uma versão de arquivo único da calculadora.
 *
 *   node build-artifact.mjs [saida.html]
 *
 * Junta index.html + style.css + core.js + app.js em um só arquivo, sem
 * dependências externas. Serve para publicar como Artifact, mandar por
 * e-mail/WhatsApp ou abrir direto do celular sem servidor.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const ler = (nome) => readFileSync(resolve(aqui, nome), 'utf8');

const html = ler('index.html');
const css = ler('style.css');
const core = ler('core.js');
const app = ler('app.js');

// Só o conteúdo do <body>, sem as tags <script src="...">.
const corpo = html
  .slice(html.indexOf('<body>') + '<body>'.length, html.lastIndexOf('</body>'))
  .replace(/<script src="[^"]*"><\/script>\s*/g, '')
  .trim();

const saida = `<title>Precificador 3D</title>
<style>
${css}
</style>

${corpo}

<script>
window.CALC3D_SINGLE = true;
${core}
${app}
</script>
`;

const destino = process.argv[2] || resolve(aqui, 'calculadora-3d.html');
writeFileSync(destino, saida, 'utf8');
console.log(
  `Arquivo único gerado: ${destino} (${(Buffer.byteLength(saida) / 1024).toFixed(1)} KB)`
);
