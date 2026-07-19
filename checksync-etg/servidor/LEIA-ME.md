# CheckSync ETG — Servidor + OneDrive (celular e PC)

Sistema de inspeção de ativos industriais com **base compartilhada**. Esta pasta
é a versão **servidor**: um PC atende celulares e outros PCs pela rede, e grava a
base numa **pasta do OneDrive/SharePoint** (que sobe para a nuvem sozinha).

## Por que assim?

Navegador de **celular não deixa escolher pasta** direto (limitação do Chrome/Safari
mobile), e acessar o OneDrive direto exigiria um registro de app no Azure (Client ID).
Então: **um PC roda o servidor**, guarda a base numa pasta do OneDrive, e os
celulares/PCs acessam esse PC pela rede. O OneDrive cuida de mandar tudo pro SharePoint.

## Passo a passo (uma vez)

1. **Definir a pasta do OneDrive** — duplo clique em `Definir-Pasta-OneDrive.bat`
   e cole o caminho de uma pasta do OneDrive sincronizada com o SharePoint, por ex.:
   ```
   C:\Users\SEU_USUARIO\OneDrive - SUA EMPRESA\CheckSync\dados
   ```
   (Se deixar vazio, usa a pasta local `dados\` aqui do lado.)

2. **Iniciar o servidor** — duplo clique em `Iniciar-Servidor-CheckSync.bat`.
   - Pede permissão de administrador (UAC → **Sim**) só para liberar a porta 8080
     no Firewall e atender a rede.
   - A janela mostra endereços em verde, ex.: `http://192.168.0.10:8080/`.

3. **Acessar** — no **celular** (mesma Wi‑Fi) ou em outro **PC**, abra esse endereço
   no navegador. Todos usam a mesma base. Os laudos em PDF são salvos em
   `…\CheckSync\dados\laudos\` e backups automáticos em `…\dados\backups\`.

## Instalar no celular (opcional)

Abrindo o endereço no celular, dá para instalar como app:
- **Android/Chrome**: menu ⋮ → *Adicionar à tela inicial*.
- **iPhone/Safari**: Compartilhar → *Adicionar à Tela de Início*.

## E no desktop, sem servidor?

O mesmo `index.html` também funciona **aberto direto** no **Chrome/Edge** do PC:
em Configurações → *Base de Dados*, clique **Conectar pasta base** e escolha a
pasta do OneDrive. Aí grava direto nela, sem precisar do servidor. (Use isso para
quem trabalha no PC; o servidor é o que atende os celulares.)

## Onde ficam os dados

- `dados\base.json` — a base.
- `dados\laudos\` — PDFs dos laudos.
- `dados\backups\` — backups automáticos com data/hora.

Apontando `dados` para o OneDrive, tudo isso é sincronizado com o SharePoint.

## Limites honestos

- **Fora da rede do servidor** (celular no 4G longe da empresa) não acessa —
  para isso só com acesso direto à nuvem (Client ID do Azure).
- Se **duas pessoas gravarem no mesmo instante** pela pasta do OneDrive, o OneDrive
  pode criar uma cópia "em conflito". Pelo servidor central isso não ocorre (uma
  base só). Para a maioria das equipes, tranquilo.

## Requisitos

- Windows com PowerShell (já vem no Windows) — **não instala nada**.
- OneDrive sincronizando a pasta do SharePoint no PC servidor.
- Navegador moderno (Chrome/Edge; no celular, Chrome/Safari).
