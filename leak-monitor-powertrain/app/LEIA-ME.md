# Leak Test | Powertrain — como usar

Painel de acompanhamento dos resultados de **leak test** (estanqueidade):

- **Usinagem** — Bloco e Cabeçote
- **Montagem de Motores** — Leak Zero e Water Leak

O painel lê um arquivo **CSV** com um registro por peça testada e mostra, por posto,
o **FPY** (aprovação de primeira passagem), os NOK, o principal motivo de reprovação
e o resultado dos últimos testes. Formato **andon**: uma coluna por posto, tarja
colorida com a situação, números grandes para leitura à distância e nenhuma outra
informação na tela. Atualiza sozinho e apita quando um posto entra em situação crítica.

---

## 1) Modo servidor (recomendado — TVs, PCs e celulares na mesma rede)

No PC que vai guardar a base:

1. Duplo clique em **`Iniciar-Servidor-LeakTest.bat`**
   (ele pede permissão de administrador, libera a porta 8090 no firewall e abre o navegador).
2. Coloque o arquivo de resultados em **`dados\leak.csv`** — a pasta `dados` é criada
   automaticamente ao lado do painel.
3. Nas TVs e demais aparelhos, abra o endereço mostrado na tela, por exemplo:
   `http://192.168.0.10:8090/`

Para deixar a TV em tela cheia, use **`Abrir-TV-Tela-Cheia.bat`** (ajuste o IP dentro
do arquivo) ou pressione **F** no painel.

### O que o servidor guarda

```
dados\leak.csv        base lida pelo painel (troque por qualquer nome nas configurações)
dados\config.json     metas e configurações compartilhadas entre todos os painéis
dados\backups\        cópias automáticas a cada gravação
```

## 2) Modo pasta de rede / avulso (sem servidor)

Copie a pasta do painel para um compartilhamento e abra **`Abrir-Painel-da-Rede.bat`**
(ou o próprio `index.html`). Nesse modo o painel não lê a base sozinho: mexa o mouse
para abrir a barra de controle e use **Fonte de dados** para carregar um CSV
manualmente. O último arquivo lido fica guardado no aparelho.

---

## 3) Formato do CSV

Uma linha por teste realizado. Separador `;`, `,` ou tabulação; acentos em UTF-8.

```csv
data_hora;posto;modelo;serie;resultado;vazamento;limite;unidade;motivo;turno;reteste
2026-07-31 06:12:04;Bloco;1.5 Turbo;BLO100231;OK;1,84;5;cc/min;;1;N
2026-07-31 06:12:51;Bloco;1.5;BLO100232;NOK;7,62;5;cc/min;Galeria de água;1;N
2026-07-31 06:35:02;Bloco;1.5;BLO100232;OK;2,10;5;cc/min;;1;S
2026-07-31 06:13:20;Leak Zero;1.0;MOT550118;NOK;4,90;3;cc/min;Junta do cabeçote;1;N
2026-07-31 06:14:02;Water Leak;1.5;MOT550119;OK;1,20;6;cc/min;;1;N
```

| Coluna       | Obrigatória | Observações |
|--------------|-------------|-------------|
| `data_hora`  | recomendada | `dd/mm/aaaa hh:mm`, `aaaa-mm-dd hh:mm:ss` ou só `hh:mm` |
| `posto`      | **sim**     | Bloco / Cabeçote / Leak Zero / Water Leak (ou `USI_BLOCO`, `USI_CABECOTE`, `MON_ZERO`, `MON_WATER`) |
| `modelo`     | opcional    | alimenta o FPY por modelo na janela de registros |
| `serie`      | recomendada | número de série da peça — é o que separa 1ª passagem de reteste |
| `resultado`  | recomendada | OK/NOK, Aprovado/Reprovado, PASS/FAIL. Sem ela, o painel compara `vazamento` com `limite` |
| `vazamento`  | opcional    | valor medido (vírgula ou ponto decimal) |
| `limite`     | opcional    | limite da peça; se ausente, usa o limite configurado no painel |
| `unidade`    | opcional    | cc/min, mbar/s, Pa… |
| `motivo`     | opcional    | ponto/defeito do vazamento — alimenta o ranking de motivos |
| `turno`      | opcional    | se não vier, o painel deduz pelo horário configurado |
| `reteste`    | opcional    | `S`/`N` ou o número da tentativa (2, 3…) |

Outros nomes de coluna também são aceitos (`data`, `estacao`, `resultado_medido`,
`defeito`, `shift`, `tentativa`, `serial`…). Colunas desconhecidas são ignoradas.

### Bancadas enviando resultado direto

Cada bancada pode acrescentar uma linha ao CSV sem abrir o arquivo:

```
POST http://<ip-do-servidor>:8090/api/registro?f=leak.csv
corpo: 2026-07-31 07:41:02;Cabeçote;1.5;CAB88121;NOK;6,30;4;cc/min;Sede de válvula;2;N
```

---

## 4) Painel — o que cada número significa

| Elemento | Significado |
|---|---|
| Tarja do posto | situação: **verde** meta atingida · **amarelo** abaixo da meta · **vermelho** abaixo do mínimo ou NOK acima do limite (pisca e dispara o alarme) |
| Número grande | **FPY %** — aprovadas na 1ª passagem ÷ testadas na 1ª passagem |
| Meta / atingimento + barra | meta de FPY e quanto dela foi atingido (FPY ÷ meta) |
| Testadas · Aprov. 1ª · NOK | contagens de 1ª passagem no período; o NOK vem com o limite configurado |
| Principal reprovação | ponto de vazamento que mais reprovou e a quantidade |
| Retestes · Vazamento | peças reapresentadas e média medida contra o limite |
| Painel de lâmpadas | resultado dos últimos testes, um quadrado por peça (verde OK / vermelho NOK) |
| Rodapé da coluna | tempo desde o último NOK e cadência (pç/h) |

Fora isso a tela fica limpa: **nada aparece no topo além do título**. Só quando a
base falha, envelhece ou o painel está em demonstração é que surge uma tarja de
aviso ao lado do título. Toque a tela ou mexa o mouse para a barra de controle
aparecer (some sozinha em 5 s).

Clique em uma coluna para abrir os registros daquele posto (com o FPY por modelo de motor).

## 5) Atalhos de teclado

`R` atualizar · `F` tela cheia · `M` alarme on/off · `T` metas · `C` configurações ·
`D` registros · `1`–`5` período (turno, hoje, 24 h, 7 dias, tudo) · `Esc` fechar janela.

Qualquer tecla ou movimento do mouse também traz de volta a barra de controle.

## 6) Configurações

- **Metas** (botão alvo): meta e mínimo de FPY, máximo de NOK, limite de vazamento e
  unidade — por posto. Também dá para ocultar um posto do painel.
- **Configurações** (engrenagem): arquivo da base, intervalo de atualização, período
  padrão, quantidade de testes no painel de lâmpadas, horários dos turnos, início do
  dia de produção, tamanho do painel (TV) e alarme sonoro.

Com o servidor ligado, as metas ficam em `dados\config.json` e valem para todos os
painéis da rede.
