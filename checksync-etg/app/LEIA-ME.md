# CheckSync ETG — Base Compartilhada

Sistema de inspeção de ativos industriais com **base compartilhada em rede**:
todos os usuários gravam no mesmo lugar, o backup do JSON é automático e os
laudos em PDF caem numa pasta.

## Como funciona a gravação

- Os dados ficam em **`dados\base.json`** (dentro desta pasta).
- A cada gravação, o servidor guarda automaticamente uma cópia com data/hora em **`dados\backups\`** (mantém as 60 mais recentes).
- Ao emitir um laudo, o PDF é salvo em **`dados\laudos\`** (ex.: `ETG-2026-0001.pdf`).

## Modo de uso recomendado (pasta de rede)

1. Copie **esta pasta inteira** para um compartilhamento acessível a todos
   (ex.: `\\servidor\checksync` ou uma unidade mapeada `Z:\checksync`).
2. Em cada computador, dê **duplo clique em `Abrir-CheckSync-da-Rede.bat`**.
   - Sobe um servidor local (porta automática) que **lê e grava a base na
     própria pasta de rede** — todos usam a MESMA base.
   - O navegador abre sozinho. Não precisa instalar nada nem ser administrador.
3. Pronto. Cadastre ativos, faça inspeções e gere laudos. Tudo é salvo na pasta
   compartilhada e sincroniza entre os computadores a cada ~15 segundos.

> Observação: se duas pessoas salvarem **exatamente** ao mesmo tempo, vale a
> última gravação. Para uma equipe fazendo inspeções no dia a dia isso é raro;
> se precisar de trava contra concorrência simultânea, use o modo servidor
> central (abaixo).

## Modo servidor central (alternativa)

Se preferir um único PC "servidor" e os outros acessando por IP:

1. No PC servidor, dê **duplo clique em `Iniciar-Servidor-CheckSync.bat`**.
2. A janela mostra endereços como `http://192.168.0.10:8080/`.
3. Nos outros PCs, abra esse endereço no navegador. Todos usam a base do
   servidor. (Pode ser necessário liberar a porta 8080 no Firewall do Windows.)

## 📱 Usar no celular / tablet

O celular acessa pelo **navegador** (não roda nada instalado). Passos:

1. Num PC da rede, dê **duplo clique em `Iniciar-Servidor-CheckSync.bat`**.
   - Ele pede permissão de administrador (UAC → **Sim**) só para liberar a porta
     no Firewall e atender a rede. Faz isso sozinho.
   - A janela mostra endereços como `http://192.168.0.10:8080/`.
2. No celular, conectado na **mesma rede Wi‑Fi**, abra o navegador (Chrome/Safari)
   e digite esse endereço (ex.: `http://192.168.0.10:8080/`).
3. Pronto — o celular usa a **mesma base** do PC. Fotos, assinatura (dá pra
   desenhar com o dedo) e laudos funcionam normalmente; os PDFs são salvos na
   pasta `dados/laudos/` do servidor.

**Instalar como app na tela inicial** (opcional, fica em tela cheia):
- **Android/Chrome**: menu ⋮ → *Adicionar à tela inicial*.
- **iPhone/Safari**: botão Compartilhar → *Adicionar à Tela de Início*.

> Dica: se o celular não abrir, verifique se está na mesma Wi‑Fi e se o Firewall
> do Windows permitiu (na 1ª vez o Windows pode perguntar — marque *Redes
> privadas* e **Permitir acesso**). O IP correto é o que aparece em verde na
> janela do servidor.

## Indicador de conexão

No rodapé do menu lateral:

- 🟢 **Base compartilhada** — conectado ao servidor (dados na pasta). Clique para
  atualizar da base na hora.
- 🔵 **Local (este aparelho)** — o app foi aberto direto como arquivo (sem
  servidor); os dados ficam só neste navegador (IndexedDB). Para compartilhar,
  use um dos `.bat` acima.

## Backup e restauração manual

Em **Configurações → Backup**: baixa/restaura toda a base em `.json` (além do
backup automático que o servidor já faz na pasta `dados\backups\`).

## Requisitos

- Windows com PowerShell (já vem no Windows). **Não precisa instalar nada.**
- Navegador moderno (Chrome, Edge ou Firefox).
