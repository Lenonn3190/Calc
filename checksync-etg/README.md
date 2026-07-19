# CheckSync ETG

Sistema de **inspeção técnica de ativos industriais** — cadastro de equipamentos,
checklists por categoria, laudos em PDF, importação em lote via Excel e
**base compartilhada em rede** (todos os usuários gravam no mesmo lugar).

App web (funciona offline por aparelho) + servidor leve em PowerShell para o
modo compartilhado. Sem instalar nada além do Windows/PowerShell já existente.

## Recursos

- **Ativos**: cadastro com foto, TAG, categoria, setor (FND/USI/MMO/MSC) e status.
- **Inspeção**: checklists por categoria (Empilhadeira, Ponte Rolante, Prensa,
  Usinagem, Leak Teste, Lavadoras, Nutrunner, Forno Fusor, Máquina Especial…),
  status por item (Conforme / Restrição / Não Conforme / N/A), assinatura no
  canvas e parecer técnico.
- **Laudos em PDF** de verdade (jsPDF), página única, com status, checklist
  colorido, foto e assinaturas.
- **Importar/Exportar Excel (.xlsx) e CSV** para alimentar/atualizar a base em lote.
- **Base compartilhada em rede** com backup automático do JSON e PDFs salvos em pasta.
- **Mobile/PWA**: acessa pelo navegador e instala na tela inicial.
- Tema claro/escuro, responsivo.

## Estrutura

```
app/    Pacote pronto para rodar (index.html + libs + servidor + ícones)
src/    Código-fonte e build
        parts/    head.html, app.js, app2.js, app3.js
        server/   servir.ps1, .bat, manifest.json, LEIA-ME.md
        build.mjs Monta app/index.html a partir das partes
```

## Como usar (rede compartilhada)

Veja **`app/LEIA-ME.md`**. Resumo:

- **Servidor central (PC + celulares)**: no PC servidor, duplo clique em
  `Iniciar-Servidor-CheckSync.bat`. Outros PCs e celulares acessam pelo IP
  mostrado (ex.: `http://192.168.0.10:8080/`), na mesma rede Wi-Fi.
- **Pasta de rede**: coloque a pasta `app/` num compartilhamento e cada operador
  abre `Abrir-CheckSync-da-Rede.bat`.

## Desenvolvimento

O `index.html` é gerado a partir de `src/parts/` pelo `src/build.mjs`.

```
# na pasta src/ (requer Node.js só para o build; o app em si não precisa)
node build.mjs
```

O build também baixa/embute a lib de zip (fflate). As libs de PDF
(`jspdf.umd.min.js`, `jspdf.plugin.autotable.min.js`) ficam ao lado do
`index.html` no pacote `app/`.

## Armazenamento

- **Local (sem servidor)**: IndexedDB no navegador do aparelho.
- **Servidor**: `dados/base.json` (na pasta), com backups automáticos em
  `dados/backups/` e laudos em `dados/laudos/`.
