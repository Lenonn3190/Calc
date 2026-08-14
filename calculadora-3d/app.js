/*
 * app.js — Interface da Calculadora de Precificação 3D.
 * Lê os campos, chama o Core e desenha o comparativo dos marketplaces.
 */
(function () {
  'use strict';

  var CHAVE = 'calc3d.v1';
  var CHAVE_PECAS = 'calc3d.pecas.v1';

  var $ = function (id) {
    return document.getElementById(id);
  };

  var moeda = Core.moeda;
  var num = Core.num;

  /* ------------------------------------------------------------------ *
   * Campos e estado
   * ------------------------------------------------------------------ */

  // Campos simples: id → tipo ('n' número, 't' texto, 'b' booleano, 's' select)
  var CAMPOS = {
    nome: 't',
    horas: 'n', minutos: 'n', pecasPorImpressao: 'n',
    minutosTrabalho: 'n', extras: 'n', embalagem: 'n',
    potenciaW: 'n', tarifaKwh: 'n',
    valorImpressora: 'n', vidaUtilHoras: 'n', manutencaoHora: 'n',
    valorHoraTrabalho: 'n', taxaFalhaPct: 'n', custoFixoHora: 'n',
    valorObjetivo: 'n', impostoPct: 'n', adsPct: 'n', antecipacaoPct: 'n',
    terminacao: 's',
    mpShopee: 'b', shopeeFrete: 'n', shopeeCpf: 'b',
    mpMl: 'b', mlTipo: 's', mlPct: 'n', mlFrete: 'n',
    mpTiktok: 'b', tkAfiliado: 'n', tkFrete: 'n', tkFreteGratis: 'b'
  };

  var modoObjetivo = 'margem';
  var materiais = [];

  function lerCampos() {
    var o = {};
    Object.keys(CAMPOS).forEach(function (id) {
      var el = $(id);
      if (!el) return;
      o[id] = CAMPOS[id] === 'b' ? el.checked : CAMPOS[id] === 'n' ? num(el.value) : el.value;
    });
    o.modoObjetivo = modoObjetivo;
    o.materiais = materiais.slice();
    return o;
  }

  function aplicarCampos(o) {
    if (!o) return;
    Object.keys(CAMPOS).forEach(function (id) {
      if (o[id] === undefined || o[id] === null) return;
      var el = $(id);
      if (!el) return;
      if (CAMPOS[id] === 'b') el.checked = !!o[id];
      else el.value = o[id];
    });
    if (o.modoObjetivo) definirModo(o.modoObjetivo, true);
    if (o.materiais && o.materiais.length) {
      materiais = o.materiais.slice();
      desenharMateriais();
    }
  }

  /* ------------------------------------------------------------------ *
   * Materiais
   * ------------------------------------------------------------------ */

  function desenharMateriais() {
    var box = $('materiais');
    box.innerHTML = '';
    materiais.forEach(function (m, i) {
      var div = document.createElement('div');
      div.className = 'material';
      div.innerHTML =
        '<label class="campo"><span>' +
        (i === 0 ? 'Gramas usadas' : 'Gramas (material ' + (i + 1) + ')') +
        '</span><input type="number" inputmode="decimal" step="any" min="0" data-mat="gramas" data-i="' + i + '"></label>' +
        '<label class="campo"><span>Preço do kg</span>' +
        '<span class="pre" data-prefixo="R$"><input type="number" inputmode="decimal" step="any" ' +
        'min="0" data-mat="precoKg" data-i="' + i + '"></span></label>' +
        (i === 0
          ? '<span></span>'
          : '<button type="button" class="remover" data-remover="' + i + '" aria-label="Remover material">×</button>');
      box.appendChild(div);
      div.querySelector('[data-mat="gramas"]').value = m.gramas;
      div.querySelector('[data-mat="precoKg"]').value = m.precoKg;
    });
  }

  /* ------------------------------------------------------------------ *
   * Modo do objetivo
   * ------------------------------------------------------------------ */

  var ROTULOS = {
    margem: {
      rotulo: 'Margem desejada sobre a venda (%)',
      dica: 'Margem líquida: o que sobra sobre o preço final, já sem taxas e custos.',
      padrao: 30
    },
    markup: {
      rotulo: 'Markup sobre o custo (%)',
      dica: '100% = o lucro é igual ao custo da peça.',
      padrao: 100
    },
    lucro: {
      rotulo: 'Lucro desejado por peça (R$)',
      dica: 'Quanto você quer no bolso depois de todas as taxas.',
      padrao: 20
    },
    preco: {
      rotulo: 'Preço de venda no anúncio (R$)',
      dica: 'Mostra quanto sobra vendendo por esse preço em cada marketplace.',
      padrao: 79.9
    }
  };

  function definirModo(modo, semTrocarValor) {
    modoObjetivo = modo;
    Array.prototype.forEach.call($('modoObjetivo').children, function (b) {
      b.setAttribute('aria-pressed', b.dataset.modo === modo ? 'true' : 'false');
    });
    $('rotuloObjetivo').textContent = ROTULOS[modo].rotulo;
    $('dicaObjetivo').textContent = ROTULOS[modo].dica;
    $('terminacao').closest('.campo').style.display = modo === 'preco' ? 'none' : '';
    if (!semTrocarValor) $('valorObjetivo').value = ROTULOS[modo].padrao;
  }

  /* ------------------------------------------------------------------ *
   * Cálculo e desenho
   * ------------------------------------------------------------------ */

  var ultimo = null;

  function calcular() {
    var v = lerCampos();

    var custo = Core.calcularCusto({
      materiais: v.materiais,
      horas: v.horas,
      minutos: v.minutos,
      pecasPorImpressao: v.pecasPorImpressao,
      potenciaW: v.potenciaW,
      tarifaKwh: v.tarifaKwh,
      valorImpressora: v.valorImpressora,
      vidaUtilHoras: v.vidaUtilHoras,
      manutencaoHora: v.manutencaoHora,
      minutosTrabalho: v.minutosTrabalho,
      valorHoraTrabalho: v.valorHoraTrabalho,
      extras: v.extras,
      embalagem: v.embalagem,
      custoFixoHora: v.custoFixoHora,
      taxaFalhaPct: v.taxaFalhaPct
    });

    var venda = {
      impostoPct: v.impostoPct,
      adsPct: v.adsPct,
      antecipacaoPct: v.antecipacaoPct
    };

    var cfg = {
      shopee: { cpfAltoVolume: v.shopeeCpf, frete: v.shopeeFrete },
      mercadolivre: { tipoAnuncio: v.mlTipo, pctComissao: v.mlPct, frete: v.mlFrete },
      tiktokshop: { freteGratis: v.tkFreteGratis, pctAfiliado: v.tkAfiliado, frete: v.tkFrete }
    };

    var objetivo = {
      modo: v.modoObjetivo,
      valor: v.valorObjetivo,
      terminacao: v.modoObjetivo === 'preco' ? '' : v.terminacao
    };

    var ativos = { shopee: v.mpShopee, mercadolivre: v.mpMl, tiktokshop: v.mpTiktok };
    var lista = Core.comparar(custo.total, venda, cfg, objetivo).filter(function (r) {
      return ativos[r.marketplace];
    });

    lista.forEach(function (r) {
      if (r.inviavel) return;
      r.alerta = Core.alertaFaixa(r.marketplace, r.preco, custo.total, venda, cfg[r.marketplace]);
      r.lucroHora = custo.tempoHorasPorPeca > 0 ? r.lucro / custo.tempoHorasPorPeca : 0;
    });

    ultimo = { v: v, custo: custo, lista: lista };

    // Só redesenha se algo mudou de verdade. Sem isso, o evento `change`
    // disparado ao sair do campo refaz o HTML no meio de um toque e o
    // botão some antes de o clique chegar nele.
    var assinatura = JSON.stringify([
      custo.total, custo.perdaFalha, custo.tempoHoras, custo.depreciacaoHora,
      custo.itens.map(function (i) { return i.valor; }),
      v.modoObjetivo, v.valorObjetivo, v.materiais,
      lista.map(function (r) {
        return [
          r.marketplace, r.inviavel, r.preco, r.lucro, r.margem, r.lucroHora,
          r.minimo && r.minimo.preco, r.alerta && r.alerta.ganho,
          r.itensTaxas && r.itensTaxas.map(function (i) { return [i.rotulo, i.valor]; }),
          r.imposto, r.ads, r.antecipacao
        ];
      })
    ]);
    if (assinatura !== calcular._assinatura) {
      calcular._assinatura = assinatura;
      desenhar(ultimo);
    }
    salvarLocal(v);
  }

  function desenhar(dados) {
    var custo = dados.custo;
    var lista = dados.lista;
    var box = $('resultados');
    box.innerHTML = '';

    var melhorLucro = lista.reduce(function (m, r) {
      return r.inviavel ? m : Math.max(m, r.lucro);
    }, -Infinity);

    if (!lista.length) {
      box.innerHTML =
        '<div class="card"><div class="corpo"><p class="nota" style="margin-top:14px">' +
        'Ative pelo menos um marketplace na seção 4.</p></div></div>';
    }

    lista.forEach(function (r) {
      var el = document.createElement('div');
      el.className = 'resultado ' + r.marketplace;

      if (r.inviavel) {
        el.innerHTML =
          '<div class="topo"><span class="nome">' + r.nome + '</span>' +
          '<span class="preco">—</span></div>' +
          '<p class="aviso ruim">Não existe preço que atinja esse objetivo neste canal: as taxas ' +
          'consomem a margem inteira. Reduza a margem alvo ou o custo.</p>';
        box.appendChild(el);
        return;
      }

      var negativo = r.lucro < 0;
      var selo = !negativo && r.lucro === melhorLucro && lista.length > 1
        ? '<span class="selo">melhor lucro</span>' : '';

      var itens = r.itensTaxas
        .map(function (i) {
          return '<li><span>' + i.rotulo + '</span><span>− ' + moeda(i.valor) + '</span></li>';
        })
        .join('');
      if (r.imposto > 0) itens += '<li><span>Imposto</span><span>− ' + moeda(r.imposto) + '</span></li>';
      if (r.ads > 0) itens += '<li><span>Anúncios</span><span>− ' + moeda(r.ads) + '</span></li>';
      if (r.antecipacao > 0) itens += '<li><span>Antecipação</span><span>− ' + moeda(r.antecipacao) + '</span></li>';

      el.innerHTML =
        '<div class="topo">' +
          '<span class="nome">' + r.nome + '</span>' + selo +
          '<span class="preco">' + moeda(r.preco) + '</span>' +
        '</div>' +
        '<div class="metricas">' +
          '<div' + (negativo ? ' class="neg"' : '') + '><b>' + moeda(r.lucro) + '</b><span>Lucro/peça</span></div>' +
          '<div' + (negativo ? ' class="neg"' : '') + '><b>' + Core.pct(r.margem) + '</b><span>Margem</span></div>' +
          '<div><b>' + moeda(r.lucroHora) + '</b><span>Lucro/h máq.</span></div>' +
        '</div>' +
        (negativo
          ? '<p class="aviso ruim">Esse preço dá prejuízo. O mínimo para empatar aqui é ' +
            moeda(r.minimo ? r.minimo.preco : 0) + '.</p>'
          : '') +
        (r.alerta && !negativo
          ? '<p class="aviso">Degrau de taxa: vendendo a <b>' + moeda(r.alerta.precoAlternativo) +
            '</b> você lucra <b>' + moeda(r.alerta.ganho) + ' a mais</b> do que a ' + moeda(r.preco) +
            '. <button type="button" data-usar="' + r.alerta.precoAlternativo + '">usar esse preço</button></p>'
          : '') +
        '<details class="detalhe"><summary>Ver a conta desta venda</summary><ul>' +
          '<li><span>Preço de venda</span><span>' + moeda(r.preco) + '</span></li>' +
          itens +
          '<li><span>Custo da peça</span><span>− ' + moeda(r.custo) + '</span></li>' +
          '<li class="total"><span>Sobra no bolso</span><span>' + moeda(r.lucro) + '</span></li>' +
          '<li><span>Preço mínimo (lucro zero)</span><span>' + moeda(r.minimo ? r.minimo.preco : 0) + '</span></li>' +
        '</ul></details>';

      box.appendChild(el);
    });

    // Detalhamento do custo
    var lin = custo.itens
      .filter(function (i) { return i.valor > 0; })
      .map(function (i) {
        return '<li style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed var(--borda)">' +
          '<span style="color:var(--suave)">' + i.rotulo + '</span><span>' + moeda(i.valor) + '</span></li>';
      })
      .join('');
    if (custo.perdaFalha > 0) {
      lin += '<li style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed var(--borda)">' +
        '<span style="color:var(--suave)">Rateio de falhas</span><span>' + moeda(custo.perdaFalha) + '</span></li>';
    }
    lin += '<li style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700">' +
      '<span>Custo por peça</span><span>' + moeda(custo.total) + '</span></li>';
    $('detalheCusto').innerHTML = lin;

    // Resumos e barra fixa
    var g = (dados.v.materiais || []).reduce(function (s, m) { return s + num(m.gramas); }, 0);
    $('resumoPeca').textContent = g + ' g · ' + formatarTempo(custo.tempoHoras);
    $('resumoOperacao').textContent = moeda(custo.depreciacaoHora + num(dados.v.manutencaoHora)) + '/h de máquina';
    $('resumoVenda').textContent = ROTULOS[modoObjetivo].rotulo.replace(/ \(.*\)/, '') + ': ' + dados.v.valorObjetivo;
    $('resumoMp').textContent = lista.length + ' ativo' + (lista.length === 1 ? '' : 's');
    $('resumoCusto').textContent = moeda(custo.total);
    $('barraCusto').textContent = moeda(custo.total);

    var viaveis = lista.filter(function (r) { return !r.inviavel; });
    if (viaveis.length) {
      var melhor = viaveis.reduce(function (a, b) { return b.lucro > a.lucro ? b : a; });
      $('barraMelhorRotulo').textContent = melhor.nome;
      $('barraMelhor').textContent = moeda(melhor.preco);
    } else {
      $('barraMelhorRotulo').textContent = 'Melhor preço';
      $('barraMelhor').textContent = '—';
    }
  }

  function formatarTempo(h) {
    var horas = Math.floor(h);
    var min = Math.round((h - horas) * 60);
    return horas + 'h' + (min ? String(min).padStart(2, '0') : '');
  }

  /* ------------------------------------------------------------------ *
   * Persistência
   * ------------------------------------------------------------------ */

  function salvarLocal(v) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(v));
    } catch (e) { /* modo privado: segue sem salvar */ }
  }

  function carregarLocal() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE) || 'null');
    } catch (e) {
      return null;
    }
  }

  function pecasSalvas() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_PECAS) || '[]');
    } catch (e) {
      return [];
    }
  }

  function desenharSalvas() {
    var lista = pecasSalvas();
    var box = $('salvas');
    box.innerHTML = '';
    lista.forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = p.nome || 'Peça ' + (i + 1);
      b.dataset.carregar = i;
      box.appendChild(b);
    });
    if (lista.length) {
      var limpar = document.createElement('button');
      limpar.type = 'button';
      limpar.textContent = '✕ limpar';
      limpar.dataset.limpar = '1';
      box.appendChild(limpar);
    }
  }

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      t.classList.remove('on');
    }, 2200);
  }

  /* ------------------------------------------------------------------ *
   * Compartilhar
   * ------------------------------------------------------------------ */

  function textoResumo() {
    if (!ultimo) return '';
    var l = ['*' + (ultimo.v.nome || 'Peça 3D') + '*'];
    l.push('Custo por peça: ' + moeda(ultimo.custo.total));
    ultimo.lista.forEach(function (r) {
      if (r.inviavel) {
        l.push(r.nome + ': objetivo inviável');
      } else {
        l.push(
          r.nome + ': ' + moeda(r.preco) + ' → lucro ' + moeda(r.lucro) + ' (' + Core.pct(r.margem) + ')'
        );
      }
    });
    l.push('');
    l.push('Calculado com a Calculadora de Precificação 3D · regras ' + Core.REGRAS.atualizadoEm);
    return l.join('\n');
  }

  /* ------------------------------------------------------------------ *
   * Eventos
   * ------------------------------------------------------------------ */

  function ligarEventos() {
    document.addEventListener('input', function (e) {
      if (e.target.dataset && e.target.dataset.mat) {
        var i = +e.target.dataset.i;
        materiais[i][e.target.dataset.mat] = num(e.target.value);
      }
      calcular();
    });

    document.addEventListener('change', calcular);

    $('modoObjetivo').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      definirModo(b.dataset.modo);
      calcular();
    });

    $('addMaterial').addEventListener('click', function () {
      materiais.push({ nome: 'Material ' + (materiais.length + 1), gramas: 0, precoKg: materiais[0] ? materiais[0].precoKg : 120 });
      desenharMateriais();
      calcular();
    });

    $('materiais').addEventListener('click', function (e) {
      var b = e.target.closest('[data-remover]');
      if (!b) return;
      materiais.splice(+b.dataset.remover, 1);
      desenharMateriais();
      calcular();
    });

    $('resultados').addEventListener('click', function (e) {
      var b = e.target.closest('[data-usar]');
      if (!b) return;
      definirModo('preco', true);
      $('valorObjetivo').value = b.dataset.usar;
      calcular();
      toast('Preço aplicado — veja quanto sobra');
    });

    $('mlTipo').addEventListener('change', function () {
      var t = Core.REGRAS.mercadolivre.tiposAnuncio[this.value];
      if (t) $('mlPct').value = t.pct;
      calcular();
    });

    $('btnSalvar').addEventListener('click', function () {
      var v = lerCampos();
      if (!v.nome) {
        toast('Dê um nome à peça primeiro');
        $('nome').focus();
        return;
      }
      var lista = pecasSalvas().filter(function (p) { return p.nome !== v.nome; });
      lista.unshift(v);
      try {
        localStorage.setItem(CHAVE_PECAS, JSON.stringify(lista.slice(0, 30)));
      } catch (e) { /* ignora */ }
      desenharSalvas();
      toast('Peça salva');
    });

    $('salvas').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.limpar) {
        if (!confirm('Apagar todas as peças salvas?')) return;
        localStorage.removeItem(CHAVE_PECAS);
        desenharSalvas();
        return;
      }
      aplicarCampos(pecasSalvas()[+b.dataset.carregar]);
      calcular();
      toast('Peça carregada');
    });

    $('btnCompartilhar').addEventListener('click', function () {
      var txt = textoResumo();
      if (navigator.share) {
        navigator.share({ title: 'Precificação 3D', text: txt }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(txt).then(function () {
          toast('Resumo copiado');
        });
      } else {
        alert(txt);
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Início
   * ------------------------------------------------------------------ */

  function iniciar() {
    materiais = [{ nome: 'Filamento', gramas: 60, precoKg: 120 }];
    desenharMateriais();
    definirModo('margem', true);

    var salvo = carregarLocal();
    if (salvo) aplicarCampos(salvo);

    var r = Core.REGRAS;
    $('cabecalhoRegras').textContent =
      'Shopee · Mercado Livre · TikTok Shop — regras de ' + r.atualizadoEm;
    $('rodapeRegras').innerHTML =
      'Tabelas vigentes em ' + r.atualizadoEm + ': Shopee (tabela única desde 01/03/2026, sem teto de comissão), ' +
      'Mercado Livre (custo por unidade abaixo de R$79 varia por peso e dimensão desde 02/03/2026 — confira no Simulador de Custos) ' +
      'e TikTok Shop (estrutura de 15/07/2026). Confira sempre o extrato do seu canal: as taxas mudam.';

    desenharSalvas();
    ligarEventos();
    calcular();

    // No arquivo único (Artifact / abrir direto) não há sw.js para registrar.
    if (!window.CALC3D_SINGLE && 'serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
