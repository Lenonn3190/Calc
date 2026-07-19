# CheckSync ETG

Sistema de **inspeção técnica de ativos industriais** — cadastro de equipamentos,
checklists por categoria, laudos em PDF, importação em lote via Excel e
**base de dados compartilhada** (todos usam o mesmo `base.json`).

O mesmo app funciona em três modos, detectados automaticamente:

| Modo | Quando | Onde grava |
|------|--------|------------|
| **Servidor** | Aberto pelo endereço de um PC servidor (`http://IP:8080/`) | Pasta de dados do servidor (aponte para o OneDrive/SharePoint) |
| **Pasta** | HTML aberto direto no Chrome/Edge do PC | Pasta escolhida via *File System Access API* (ex.: pasta do OneDrive) |
| **Local** | Sem servidor e sem pasta (ou navegador sem suporte) | IndexedDB, só neste aparelho |

## Conteúdo

```
CheckSync_ETG.html   App em HTML único (desktop: abrir direto e conectar pasta)
servidor/            Pacote para CELULAR + PC via rede, com dados no OneDrive
  index.html         (mesmo app)
  servir.ps1         Servidor leve em PowerShell (grava base.json, laudos/, backups/)
  Definir-Pasta-OneDrive.bat   Aponta a pasta de dados para o OneDrive/SharePoint
  Iniciar-Servidor-CheckSync.bat  Sobe o servidor (libera firewall, mostra o IP)
  manifest.json, icon-*.png, LEIA-ME.md
src/                 Código-fonte + build
  parts/  head.html, app.js, app2.js, app3.js
  server/ servir.ps1, .bat, manifest.json, LEIA-ME.md
  build.mjs          Gera CheckSync_ETG.html e o pacote servidor/
```

## Uso rápido

- **Celular / rede**: veja `servidor/LEIA-ME.md`. Resumo: `Definir-Pasta-OneDrive.bat`
  (uma vez) → `Iniciar-Servidor-CheckSync.bat` → abra o IP mostrado no celular/PC
  (mesma Wi‑Fi). Os dados ficam na pasta do OneDrive e sobem para o SharePoint.
- **Desktop direto**: abra `CheckSync_ETG.html` no Chrome/Edge → *Configurações →
  Base de Dados → Conectar pasta base* → escolha a pasta do OneDrive.

## Recursos

- Ativos com foto, TAG, categoria, setor (FND/USI/MMO/MSC) e status.
- Checklists por categoria (Empilhadeira, Ponte Rolante, Prensa, Usinagem,
  Leak Teste, Lavadoras, Nutrunner, Forno Fusor, Máquina Especial…),
  status por item, assinatura no canvas e parecer técnico.
- Laudos em **PDF** (jsPDF) — salvos automaticamente em `laudos/` na base compartilhada.
- **Importar/Exportar Excel (.xlsx) e CSV** para alimentar/atualizar em lote.
- Backups automáticos do JSON, tema claro/escuro, responsivo, PWA (instalável no celular).

## Build

```
cd src && node build.mjs
```

Gera `CheckSync_ETG.html` (raiz) e o pacote `servidor/`. As libs (fflate para
Excel, jsPDF + AutoTable para PDF) são embutidas no HTML pelo build.

## Limitações (honestas)

- **Pasta (File System Access)**: só desktop Chrome/Edge. Celular/Firefox/Safari
  não têm o seletor de pasta.
- **Celular**: acessa via o servidor, **na mesma rede** do PC servidor. Fora da
  rede (4G), só com acesso direto à nuvem (registro de app no Azure AD / Client ID).
- Gravação simultânea de duas pessoas pela pasta do OneDrive pode gerar cópia
  "em conflito" do OneDrive; pelo servidor central isso não ocorre.
