/* Tira o JavaScript de dentro do index.html para rodar fora do navegador.

   Isso já foi um arquivo solto no /tmp, gerado à mão. Ele envelheceu sem
   ninguém notar e duas suítes passaram dias medindo uma cópia velha do
   painel — davam "PASSOU" para código que nem estava mais lá. Agora o
   fonte é extraído na hora, do arquivo de verdade. */
const fs = require('fs'), path = require('path');

module.exports = function fonteDoPainel(arquivo){
  const alvo = arquivo || path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(alvo, 'utf8');
  const blocos = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => m[1]);
  if (!blocos.length) throw new Error('nenhum <script> em ' + alvo);
  return blocos.join('\n');
};
