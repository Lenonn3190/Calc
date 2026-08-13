# Testes do painel

Não entram no `.zip` de distribuição (veja a lista em `empacota.py`).

```
node testes/test.js         regras de data, duração, CSV e classificação
node testes/xlsx.js         leitura da planilha .xlsx (gera a própria amostra)
node testes/rfid.js         máquina de estados da frota
node testes/e2e-frota.js    leitor gravando no log, painel reagindo
node testes/historico.js    geração do historico.json
node testes/fonte.js        releitura do arquivo, falha e recuperação
node testes/ciclo.js        ritmo de 1 h e retentativa em 1 min
node testes/qr.js           QR do condutor, decodificado da tela com jsQR
node testes/blocos.js       recolher/esconder blocos e a memória da escolha
node testes/cadastro.js    tela de cadastro de crachás (lista, filtro, leitor, gravação)
node testes/teclado.js     teclado virtual (o teste inteiro é só toque, sem teclado físico)
node testes/pacote.js       o .zip extraído, como o usuário recebe
python3 testes/servidor.py  estrutura do servir.ps1 (não há PowerShell aqui)
```

`fonte-do-painel.js` tira o JavaScript de dentro do `index.html` na hora de rodar.
Antes isso era um arquivo gerado à mão no `/tmp`: ele envelheceu sem ninguém notar e o
`test.js` e o `rfid.js` passaram dias medindo uma cópia velha do painel — davam "PASSOU"
para código que nem estava mais lá.

`servidor.py` existe porque não dá para executar o `servir.ps1` neste
ambiente: ele confere que as rotas que o painel chama continuam no script.
Uma rota inteira já se perdeu numa edição sem ninguém notar, porque os
testes de navegador usam um servidor Node equivalente e não tocam no `.ps1`.

Precisam de `playwright-core` e do Chromium do ambiente. O `qr.js` também usa `jsqr`
(`npm i jsqr`): ele **decodifica** o QR desenhado na tela, provando que um celular consegue ler
— gerar um QR sem conferir a leitura seria entregar às cegas.
