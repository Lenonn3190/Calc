/*
 * core.js — Motor de cálculo da Calculadora de Precificação 3D.
 *
 * Sem dependências e sem DOM: dá para rodar no navegador (window.Core)
 * e nos testes. Toda regra de marketplace vive em REGRAS, para poder
 * ser editada pelo usuário quando o marketplace mudar a tabela.
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Regras de cobrança dos marketplaces (vigentes em agosto/2026)
   * ------------------------------------------------------------------ */

  var REGRAS = {
    versao: 3,
    atualizadoEm: '2026-08',

    shopee: {
      nome: 'Shopee',
      // Tabela única desde 01/03/2026. O percentual já inclui o Programa
      // de Frete Grátis (14% de comissão + 6% do programa na 1ª faixa).
      // O teto de R$100 de comissão por item foi extinto em 28/02/2026.
      faixas: [
        { ate: 7.99, pct: 50, fixo: 0 },
        { ate: 79.99, pct: 20, fixo: 4 },
        { ate: 99.99, pct: 14, fixo: 16 },
        { ate: 199.99, pct: 14, fixo: 20 },
        { ate: Infinity, pct: 14, fixo: 26 }
      ],
      // CPF com mais de 450 pedidos em 90 dias paga R$3 a mais por item.
      adicionalCpfAltoVolume: 3
    },

    mercadolivre: {
      nome: 'Mercado Livre',
      // Comissão por tipo de anúncio; varia por categoria dentro da faixa.
      tiposAnuncio: {
        classico: { rotulo: 'Clássico', pct: 12, min: 11, max: 14 },
        premium: { rotulo: 'Premium (12x sem juros)', pct: 17, min: 16, max: 19 }
      },
      // Custo por unidade vendida, cobrado só em itens abaixo de R$79.
      // Desde 02/03/2026 varia por peso/dimensão da embalagem — estes são
      // os valores de referência; confira no Simulador de Custos do ML.
      limiteCustoUnidade: 79,
      custoPorUnidade: [
        { ate: 12.49, tipo: 'pct', valor: 50 }, // até 50% do preço
        { ate: 28.99, tipo: 'fixo', valor: 6.25 },
        { ate: 49.99, tipo: 'fixo', valor: 6.5 },
        { ate: 78.99, tipo: 'fixo', valor: 6.75 }
      ]
    },

    tiktokshop: {
      nome: 'TikTok Shop',
      // Estrutura vigente desde 15/07/2026.
      faixas: [
        { ate: 49.99, pct: 10, fixo: 4 },
        { ate: Infinity, pct: 6, fixo: 6 }
      ],
      // Programa de Frete Grátis: 6% sobre o valor do produto.
      pctFreteGratis: 6
    }
  };

  /* ------------------------------------------------------------------ *
   * Utilidades
   * ------------------------------------------------------------------ */

  function num(v, padrao) {
    var n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
    return isFinite(n) ? n : (padrao || 0);
  }

  function round2(v) {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }

  /** Arredonda para cima no centavo — usado no preço sugerido. */
  function ceil2(v) {
    return Math.ceil((v - 1e-9) * 100) / 100;
  }

  function moeda(v) {
    return (isFinite(v) ? v : 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function pct(v, casas) {
    return (isFinite(v) ? v * 100 : 0).toFixed(casas == null ? 1 : casas).replace('.', ',') + '%';
  }

  /** Converte a lista de faixas em intervalos [min, max] fechados. */
  function intervalos(faixas) {
    var min = 0.01;
    return faixas.map(function (f) {
      var faixa = { min: min, max: f.ate, pct: f.pct, fixo: f.fixo };
      min = round2(f.ate + 0.01);
      return faixa;
    });
  }

  function faixaDoPreco(faixas, preco) {
    var lista = intervalos(faixas);
    for (var i = 0; i < lista.length; i++) {
      if (preco <= lista[i].max) return lista[i];
    }
    return lista[lista.length - 1];
  }

  /* ------------------------------------------------------------------ *
   * Custo de fabricação
   * ------------------------------------------------------------------ */

  /**
   * Calcula o custo de uma peça.
   *
   * Entrada (todos os campos opcionais, com padrão 0):
   *   materiais: [{ nome, gramas, precoKg }]
   *   horas, minutos      → tempo total da impressão
   *   pecasPorImpressao   → quantas peças saem dessa impressão (padrão 1)
   *   potenciaW, tarifaKwh
   *   valorImpressora, vidaUtilHoras, manutencaoHora
   *   minutosTrabalho, valorHoraTrabalho
   *   extras, embalagem   → R$ por peça
   *   custoFixoHora       → rateio de aluguel/internet por hora de máquina
   *   taxaFalhaPct        → % de impressões perdidas
   *
   * Saída: { total, porPeca, tempoHoras, itens: [...], antesFalha, perdaFalha }
   */
  function calcularCusto(e) {
    e = e || {};
    var n = Math.max(1, num(e.pecasPorImpressao, 1));
    var tempoH = num(e.horas) + num(e.minutos) / 60;

    var materiais = (e.materiais || []).map(function (m) {
      return {
        nome: m.nome || 'Material',
        valor: (num(m.gramas) * num(m.precoKg)) / 1000
      };
    });
    var custoMaterial = materiais.reduce(function (s, m) {
      return s + m.valor;
    }, 0);

    var custoEnergia = (num(e.potenciaW) / 1000) * tempoH * num(e.tarifaKwh);

    var vidaUtil = num(e.vidaUtilHoras);
    var depreciacaoHora = vidaUtil > 0 ? num(e.valorImpressora) / vidaUtil : 0;
    var custoMaquina = (depreciacaoHora + num(e.manutencaoHora)) * tempoH;

    var custoFixo = num(e.custoFixoHora) * tempoH;

    // Mão de obra é por peça (pós-processamento), não se divide pela placa.
    var custoTrabalho = (num(e.minutosTrabalho) / 60) * num(e.valorHoraTrabalho);

    // Custos da impressão, rateados entre as peças da placa.
    var porImpressao = (custoMaterial + custoEnergia + custoMaquina + custoFixo) / n;

    var itens = [
      { chave: 'material', rotulo: 'Material', valor: custoMaterial / n },
      { chave: 'energia', rotulo: 'Energia', valor: custoEnergia / n },
      { chave: 'maquina', rotulo: 'Máquina (depreciação + manutenção)', valor: custoMaquina / n },
      { chave: 'fixo', rotulo: 'Custos fixos rateados', valor: custoFixo / n },
      { chave: 'trabalho', rotulo: 'Mão de obra', valor: custoTrabalho },
      { chave: 'extras', rotulo: 'Insumos extras', valor: num(e.extras) },
      { chave: 'embalagem', rotulo: 'Embalagem', valor: num(e.embalagem) }
    ];

    var antesFalha = porImpressao + custoTrabalho + num(e.extras) + num(e.embalagem);

    // Rateio de falhas: se p% das impressões são perdidas, cada peça boa
    // precisa absorver o custo das perdidas → custo / (1 - p).
    var falha = Math.min(0.95, Math.max(0, num(e.taxaFalhaPct) / 100));
    var total = falha > 0 ? antesFalha / (1 - falha) : antesFalha;

    return {
      antesFalha: round2(antesFalha),
      perdaFalha: round2(total - antesFalha),
      total: round2(total),
      tempoHoras: tempoH,
      tempoHorasPorPeca: tempoH / n,
      pecasPorImpressao: n,
      depreciacaoHora: round2(depreciacaoHora),
      itens: itens.map(function (i) {
        i.valor = round2(i.valor);
        return i;
      })
    };
  }

  /* ------------------------------------------------------------------ *
   * Taxas dos marketplaces
   * ------------------------------------------------------------------ */

  /**
   * Devolve as taxas do marketplace para um preço, separadas em
   * componente percentual (fração do preço) e componente fixo (R$).
   *
   * cfg.shopee        : { cpfAltoVolume }
   * cfg.mercadolivre  : { tipoAnuncio|pctComissao, custoUnidadeAuto, custoUnidade,
   *                       fretePago, freteSomenteAcimaLimite }
   * cfg.tiktokshop    : { freteGratis, pctAfiliado }
   * Todos            : { frete } → frete pago pelo vendedor por venda
   */
  function taxasMarketplace(mp, preco, cfg, regras) {
    regras = regras || REGRAS;
    cfg = cfg || {};
    var itens = [];
    var pctTotal = 0;
    var fixoTotal = 0;
    var frete = num(cfg.frete);

    if (mp === 'shopee') {
      var f = faixaDoPreco(regras.shopee.faixas, preco);
      pctTotal += f.pct / 100;
      fixoTotal += f.fixo;
      itens.push({
        rotulo: 'Comissão + frete grátis (' + f.pct + '%)',
        valor: (preco * f.pct) / 100
      });
      if (f.fixo > 0) itens.push({ rotulo: 'Taxa fixa por item', valor: f.fixo });
      if (cfg.cpfAltoVolume) {
        fixoTotal += regras.shopee.adicionalCpfAltoVolume;
        itens.push({
          rotulo: 'Adicional CPF (+450 pedidos/90 dias)',
          valor: regras.shopee.adicionalCpfAltoVolume
        });
      }
      // Na Shopee o frete do Programa de Frete Grátis não é cobrado do
      // vendedor além do percentual — mas o campo fica disponível.
    } else if (mp === 'mercadolivre') {
      var ml = regras.mercadolivre;
      var p =
        cfg.pctComissao != null
          ? num(cfg.pctComissao)
          : ml.tiposAnuncio[cfg.tipoAnuncio || 'classico'].pct;
      pctTotal += p / 100;
      itens.push({ rotulo: 'Comissão (' + p + '%)', valor: (preco * p) / 100 });

      if (preco < ml.limiteCustoUnidade) {
        var cu = 0;
        if (cfg.custoUnidadeAuto === false) {
          cu = num(cfg.custoUnidade);
          fixoTotal += cu;
        } else {
          var regra = null;
          for (var i = 0; i < ml.custoPorUnidade.length; i++) {
            if (preco <= ml.custoPorUnidade[i].ate) {
              regra = ml.custoPorUnidade[i];
              break;
            }
          }
          regra = regra || ml.custoPorUnidade[ml.custoPorUnidade.length - 1];
          if (regra.tipo === 'pct') {
            cu = (preco * regra.valor) / 100;
            pctTotal += regra.valor / 100;
          } else {
            cu = regra.valor;
            fixoTotal += cu;
          }
        }
        if (cu > 0) itens.push({ rotulo: 'Custo por unidade vendida (< R$79)', valor: cu });
      }
      if (frete > 0) {
        // Acima de R$79 o frete é grátis para o comprador e sai do bolso
        // do vendedor (com subsídio conforme a reputação da conta).
        itens.push({
          rotulo:
            preco >= ml.limiteCustoUnidade
              ? 'Frete grátis pago pelo vendedor'
              : 'Frete pago pelo vendedor',
          valor: frete
        });
      }
    } else if (mp === 'tiktokshop') {
      var tk = regras.tiktokshop;
      var ft = faixaDoPreco(tk.faixas, preco);
      pctTotal += ft.pct / 100;
      fixoTotal += ft.fixo;
      itens.push({ rotulo: 'Comissão (' + ft.pct + '%)', valor: (preco * ft.pct) / 100 });
      if (ft.fixo > 0) itens.push({ rotulo: 'Taxa fixa por item', valor: ft.fixo });
      if (cfg.freteGratis !== false) {
        pctTotal += tk.pctFreteGratis / 100;
        itens.push({
          rotulo: 'Programa de Frete Grátis (' + tk.pctFreteGratis + '%)',
          valor: (preco * tk.pctFreteGratis) / 100
        });
      }
      var afil = num(cfg.pctAfiliado);
      if (afil > 0) {
        pctTotal += afil / 100;
        itens.push({ rotulo: 'Comissão de afiliado (' + afil + '%)', valor: (preco * afil) / 100 });
      }
      if (frete > 0) itens.push({ rotulo: 'Frete pago pelo vendedor', valor: frete });
    }

    return { pct: pctTotal, fixo: fixoTotal, frete: frete, itens: itens };
  }

  /**
   * Percentuais que incidem sobre o preço em qualquer canal:
   * imposto, anúncios (ads) e antecipação de recebíveis.
   */
  function pctGlobais(v) {
    v = v || {};
    return (num(v.impostoPct) + num(v.adsPct) + num(v.antecipacaoPct)) / 100;
  }

  /* ------------------------------------------------------------------ *
   * Resultado para um preço dado
   * ------------------------------------------------------------------ */

  /**
   * Dado um preço de venda, devolve a composição completa.
   * venda: { impostoPct, adsPct, antecipacaoPct, custo }
   */
  function analisarPreco(mp, preco, custo, venda, cfgMp, regras) {
    var t = taxasMarketplace(mp, preco, cfgMp, regras);
    var g = pctGlobais(venda);

    var taxasMp = preco * t.pct + t.fixo + t.frete;
    var imposto = (preco * num(venda.impostoPct)) / 100;
    var ads = (preco * num(venda.adsPct)) / 100;
    var antecipacao = (preco * num(venda.antecipacaoPct)) / 100;

    var totalDeducoes = taxasMp + imposto + ads + antecipacao;
    var lucro = preco - totalDeducoes - custo;

    return {
      marketplace: mp,
      preco: round2(preco),
      custo: round2(custo),
      taxasMarketplace: round2(taxasMp),
      itensTaxas: t.itens.map(function (i) {
        return { rotulo: i.rotulo, valor: round2(i.valor) };
      }),
      imposto: round2(imposto),
      ads: round2(ads),
      antecipacao: round2(antecipacao),
      totalDeducoes: round2(totalDeducoes),
      lucro: round2(lucro),
      margem: preco > 0 ? lucro / preco : 0,
      markup: custo > 0 ? lucro / custo : 0,
      pctTaxasSobrePreco: preco > 0 ? (taxasMp + imposto + ads + antecipacao) / preco : 0,
      pctVariavel: t.pct + g,
      fixo: round2(t.fixo + t.frete)
    };
  }

  /* ------------------------------------------------------------------ *
   * Preço sugerido (cálculo reverso, faixa a faixa)
   * ------------------------------------------------------------------ */

  /** Faixas de preço relevantes do marketplace (para varrer na solução). */
  function faixasDoMarketplace(mp, regras) {
    regras = regras || REGRAS;
    if (mp === 'shopee') return intervalos(regras.shopee.faixas);
    if (mp === 'tiktokshop') return intervalos(regras.tiktokshop.faixas);
    if (mp === 'mercadolivre') {
      // As quebras do ML vêm do custo por unidade vendida e do limite de R$79.
      var lista = regras.mercadolivre.custoPorUnidade.map(function (c) {
        return { ate: c.ate };
      });
      lista.push({ ate: Infinity });
      return intervalos(lista);
    }
    return intervalos([{ ate: Infinity }]);
  }

  /**
   * Resolve o menor preço que atinge o objetivo.
   *
   * objetivo: { modo: 'margem' | 'markup' | 'lucro', valor }
   *   margem → % sobre o preço de venda
   *   markup → % sobre o custo
   *   lucro  → R$ de lucro por peça
   *
   * Percorre cada faixa, resolve a equação linear dentro dela e valida se a
   * solução cai na própria faixa. Quando a solução fica abaixo do piso da
   * faixa, o piso já atende ao objetivo e vira candidato — é isso que faz o
   * "vender a R$79,99 em vez de R$82" aparecer sozinho.
   */
  function precoSugerido(mp, custo, venda, cfgMp, objetivo, regras) {
    var faixas = faixasDoMarketplace(mp, regras);
    var g = pctGlobais(venda);
    var candidatos = [];

    faixas.forEach(function (faixa) {
      // Avalia no meio da faixa para capturar pct/fixo daquele patamar.
      var amostra = isFinite(faixa.max) ? (faixa.min + faixa.max) / 2 : faixa.min * 2 + 100;
      var t = taxasMarketplace(mp, amostra, cfgMp, regras);
      var pctVar = t.pct + g;
      var fixo = t.fixo + t.frete;

      var alvoMargem = 0;
      var custoAlvo = custo;
      if (objetivo.modo === 'margem') {
        alvoMargem = num(objetivo.valor) / 100;
      } else if (objetivo.modo === 'markup') {
        custoAlvo = custo * (1 + num(objetivo.valor) / 100);
      } else {
        custoAlvo = custo + num(objetivo.valor);
      }

      var denom = 1 - pctVar - alvoMargem;
      if (denom <= 0.0001) return; // objetivo impossível nesta faixa

      var p = (fixo + custoAlvo) / denom;
      var preco = ceil2(p);

      if (preco < faixa.min) preco = faixa.min; // o piso da faixa já resolve
      if (preco > faixa.max) return; // não cabe nesta faixa

      var r = analisarPreco(mp, preco, custo, venda, cfgMp, regras);
      r.faixa = faixa;
      candidatos.push(r);
    });

    if (!candidatos.length) return null;

    // Menor preço que atende; empate desempata pelo maior lucro.
    candidatos.sort(function (a, b) {
      return a.preco - b.preco || b.lucro - a.lucro;
    });
    var escolhido = candidatos[0];
    escolhido.alternativas = candidatos;
    return escolhido;
  }

  /** Preço de equilíbrio: lucro zero. */
  function precoMinimo(mp, custo, venda, cfgMp, regras) {
    return precoSugerido(mp, custo, venda, cfgMp, { modo: 'lucro', valor: 0 }, regras);
  }

  /**
   * Arredondamento comercial (…,90 / …,99) sem estourar a faixa de taxa.
   * Se o valor "bonito" acima cair em outra faixa, mantém o teto da atual.
   */
  function arredondarComercial(mp, preco, terminacao, regras) {
    if (!terminacao) return preco;
    var cent = num(terminacao) / 100; // ex.: 90 → 0,90
    var base = Math.floor(preco);
    var alvo = base + cent;
    if (alvo < preco - 1e-9) alvo = base + 1 + cent;
    var faixaAtual = null;
    var lista = faixasDoMarketplace(mp, regras);
    for (var i = 0; i < lista.length; i++) {
      if (preco <= lista[i].max) {
        faixaAtual = lista[i];
        break;
      }
    }
    if (faixaAtual && alvo > faixaAtual.max) return faixaAtual.max;
    return round2(alvo);
  }

  /**
   * Compara todos os marketplaces de uma vez.
   * Devolve lista ordenada por lucro (ou preço, se preço fixo).
   */
  function comparar(custo, venda, cfgPorMp, objetivo, regras) {
    var mps = ['shopee', 'mercadolivre', 'tiktokshop'];
    return mps.map(function (mp) {
      var cfg = (cfgPorMp || {})[mp] || {};
      var r;
      if (objetivo.modo === 'preco') {
        r = analisarPreco(mp, num(objetivo.valor), custo, venda, cfg, regras);
      } else {
        r = precoSugerido(mp, custo, venda, cfg, objetivo, regras);
        if (r && objetivo.terminacao) {
          var novo = arredondarComercial(mp, r.preco, objetivo.terminacao, regras);
          if (novo !== r.preco) {
            var alt = analisarPreco(mp, novo, custo, venda, cfg, regras);
            alt.alternativas = r.alternativas;
            alt.faixa = r.faixa;
            alt.arredondado = true;
            r = alt;
          }
        }
      }
      if (r) {
        r.nome = (regras || REGRAS)[mp].nome;
        r.minimo = precoMinimo(mp, custo, venda, cfg, regras);
      }
      return r || { marketplace: mp, nome: (regras || REGRAS)[mp].nome, inviavel: true };
    });
  }

  /**
   * Alerta de faixa: quando o preço está logo acima de uma quebra de taxa,
   * mostra quanto se ganharia vendendo no teto da faixa anterior.
   */
  function alertaFaixa(mp, preco, custo, venda, cfgMp, regras) {
    var lista = faixasDoMarketplace(mp, regras);
    var anterior = null;
    for (var i = 0; i < lista.length; i++) {
      if (preco <= lista[i].max) break;
      anterior = lista[i];
    }
    if (!anterior) return null;
    var noTeto = analisarPreco(mp, anterior.max, custo, venda, cfgMp, regras);
    var atual = analisarPreco(mp, preco, custo, venda, cfgMp, regras);
    if (noTeto.lucro > atual.lucro) {
      return {
        precoAlternativo: anterior.max,
        lucroAlternativo: noTeto.lucro,
        lucroAtual: atual.lucro,
        ganho: round2(noTeto.lucro - atual.lucro)
      };
    }
    return null;
  }

  var API = {
    REGRAS: REGRAS,
    num: num,
    round2: round2,
    ceil2: ceil2,
    moeda: moeda,
    pct: pct,
    intervalos: intervalos,
    faixaDoPreco: faixaDoPreco,
    calcularCusto: calcularCusto,
    taxasMarketplace: taxasMarketplace,
    analisarPreco: analisarPreco,
    precoSugerido: precoSugerido,
    precoMinimo: precoMinimo,
    arredondarComercial: arredondarComercial,
    faixasDoMarketplace: faixasDoMarketplace,
    comparar: comparar,
    alertaFaixa: alertaFaixa
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.Core = API;
})(typeof window !== 'undefined' ? window : globalThis);
