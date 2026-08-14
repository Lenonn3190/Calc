/*
 * tests.js — Testes do motor de cálculo.
 * Roda no Node (`node tests.js`) e no navegador (tests.html).
 */
(function (global) {
  'use strict';

  var Core = global.Core || (typeof require !== 'undefined' ? require('./core.js') : null);
  var resultados = [];

  function ok(nome, condicao, detalhe) {
    resultados.push({ nome: nome, passou: !!condicao, detalhe: detalhe || '' });
  }

  function perto(a, b, tol) {
    return Math.abs(a - b) <= (tol == null ? 0.01 : tol);
  }

  function run() {
    resultados = [];
    var vendaZero = { impostoPct: 0, adsPct: 0, antecipacaoPct: 0 };

    /* ---------------- Custo de fabricação ---------------- */

    var custo = Core.calcularCusto({
      materiais: [{ nome: 'PLA', gramas: 100, precoKg: 120 }],
      horas: 5,
      minutos: 0,
      pecasPorImpressao: 1,
      potenciaW: 150,
      tarifaKwh: 0.95,
      valorImpressora: 3000,
      vidaUtilHoras: 6000,
      manutencaoHora: 0,
      minutosTrabalho: 10,
      valorHoraTrabalho: 30,
      extras: 2,
      embalagem: 1.5,
      taxaFalhaPct: 0
    });
    // material 12,00 | energia 0,15*5*0,95 = 0,7125 | máquina 0,5*5 = 2,50
    // trabalho 5,00 | extras 2,00 | embalagem 1,50 => 23,71
    ok('Custo básico soma os componentes', perto(custo.total, 23.71), 'total=' + custo.total);
    ok('Depreciação por hora = valor / vida útil', perto(custo.depreciacaoHora, 0.5));

    var custoFalha = Core.calcularCusto({
      materiais: [{ gramas: 100, precoKg: 100 }],
      taxaFalhaPct: 20
    });
    // 10,00 / (1 - 0,20) = 12,50
    ok('Taxa de falha redistribui o custo das perdas', perto(custoFalha.total, 12.5), 'total=' + custoFalha.total);

    var custoPlaca = Core.calcularCusto({
      materiais: [{ gramas: 200, precoKg: 100 }],
      horas: 10,
      pecasPorImpressao: 4,
      potenciaW: 100,
      tarifaKwh: 1
    });
    // material 20,00 + energia 0,1 kW * 10 h * 1,00 = 1,00 → 21,00 / 4 = 5,25
    ok('Peças por impressão rateiam material e tempo', perto(custoPlaca.total, 5.25), 'total=' + custoPlaca.total);

    /* ---------------- Shopee: faixas ---------------- */

    var s79 = Core.analisarPreco('shopee', 79.99, 0, vendaZero, {});
    var s80 = Core.analisarPreco('shopee', 80.0, 0, vendaZero, {});
    ok('Shopee R$79,99 = 20% + R$4 ≈ R$20,00', perto(s79.taxasMarketplace, 20.0), 'taxa=' + s79.taxasMarketplace);
    ok('Shopee R$80,00 = 14% + R$16 = R$27,20', perto(s80.taxasMarketplace, 27.2), 'taxa=' + s80.taxasMarketplace);
    ok('Degrau de R$0,01 custa mais de R$7', s80.taxasMarketplace - s79.taxasMarketplace > 7);

    var s250 = Core.analisarPreco('shopee', 250, 0, vendaZero, {});
    ok('Shopee acima de R$200 = 14% + R$26', perto(s250.taxasMarketplace, 61), 'taxa=' + s250.taxasMarketplace);
    ok('Shopee não tem mais teto de R$100 de comissão', s250.taxasMarketplace > 0 && Core.analisarPreco('shopee', 2000, 0, vendaZero, {}).taxasMarketplace > 100);

    var s5 = Core.analisarPreco('shopee', 5, 0, vendaZero, {});
    ok('Shopee abaixo de R$8 = 50% do preço', perto(s5.taxasMarketplace, 2.5), 'taxa=' + s5.taxasMarketplace);

    var sCpf = Core.analisarPreco('shopee', 50, 0, vendaZero, { cpfAltoVolume: true });
    ok('Shopee CPF alto volume soma R$3', perto(sCpf.taxasMarketplace, 10 + 4 + 3), 'taxa=' + sCpf.taxasMarketplace);

    /* ---------------- TikTok Shop ---------------- */

    var t40 = Core.analisarPreco('tiktokshop', 40, 0, vendaZero, { freteGratis: false });
    ok('TikTok abaixo de R$50 = 10% + R$4', perto(t40.taxasMarketplace, 8), 'taxa=' + t40.taxasMarketplace);

    var t100 = Core.analisarPreco('tiktokshop', 100, 0, vendaZero, { freteGratis: false });
    ok('TikTok a partir de R$50 = 6% + R$6', perto(t100.taxasMarketplace, 12), 'taxa=' + t100.taxasMarketplace);

    var t100f = Core.analisarPreco('tiktokshop', 100, 0, vendaZero, { freteGratis: true });
    ok('TikTok com Frete Grátis soma 6%', perto(t100f.taxasMarketplace, 18), 'taxa=' + t100f.taxasMarketplace);

    var t100a = Core.analisarPreco('tiktokshop', 100, 0, vendaZero, { freteGratis: true, pctAfiliado: 10 });
    ok('TikTok soma comissão de afiliado', perto(t100a.taxasMarketplace, 28), 'taxa=' + t100a.taxasMarketplace);

    /* ---------------- Mercado Livre ---------------- */

    var ml100 = Core.analisarPreco('mercadolivre', 100, 0, vendaZero, { tipoAnuncio: 'classico' });
    ok('ML clássico R$100 = 12% sem custo por unidade', perto(ml100.taxasMarketplace, 12), 'taxa=' + ml100.taxasMarketplace);

    var mlPrem = Core.analisarPreco('mercadolivre', 100, 0, vendaZero, { tipoAnuncio: 'premium' });
    ok('ML premium usa 17%', perto(mlPrem.taxasMarketplace, 17), 'taxa=' + mlPrem.taxasMarketplace);

    var ml60 = Core.analisarPreco('mercadolivre', 60, 0, vendaZero, { tipoAnuncio: 'classico' });
    ok('ML abaixo de R$79 cobra custo por unidade', perto(ml60.taxasMarketplace, 7.2 + 6.75), 'taxa=' + ml60.taxasMarketplace);

    var ml10 = Core.analisarPreco('mercadolivre', 10, 0, vendaZero, { tipoAnuncio: 'classico' });
    ok('ML até R$12,49 cobra 50% do preço', perto(ml10.taxasMarketplace, 1.2 + 5), 'taxa=' + ml10.taxasMarketplace);

    var mlFrete = Core.analisarPreco('mercadolivre', 120, 0, vendaZero, { tipoAnuncio: 'classico', frete: 20 });
    ok('ML acima de R$79 soma o frete do vendedor', perto(mlFrete.taxasMarketplace, 14.4 + 20), 'taxa=' + mlFrete.taxasMarketplace);

    /* ---------------- Preço reverso ---------------- */

    var r = Core.precoSugerido('shopee', 20, vendaZero, {}, { modo: 'margem', valor: 30 });
    var conf = Core.analisarPreco('shopee', r.preco, 20, vendaZero, {});
    ok('Margem alvo de 30% é atingida na Shopee', conf.margem >= 0.2999, 'preço=' + r.preco + ' margem=' + conf.margem);
    ok('Preço sugerido não exagera (margem próxima do alvo)', conf.margem < 0.35, 'margem=' + conf.margem);

    var rMk = Core.precoSugerido('tiktokshop', 20, vendaZero, { freteGratis: true }, { modo: 'markup', valor: 100 });
    var confMk = Core.analisarPreco('tiktokshop', rMk.preco, 20, vendaZero, { freteGratis: true });
    ok('Markup de 100% dobra o custo em lucro', confMk.lucro >= 20 - 0.02, 'lucro=' + confMk.lucro);

    var rLucro = Core.precoSugerido('mercadolivre', 30, vendaZero, { tipoAnuncio: 'classico' }, { modo: 'lucro', valor: 25 });
    var confLucro = Core.analisarPreco('mercadolivre', rLucro.preco, 30, vendaZero, { tipoAnuncio: 'classico' });
    ok('Objetivo de lucro em R$ é atingido', confLucro.lucro >= 24.99, 'lucro=' + confLucro.lucro);

    // Com imposto e ads o preço tem de subir.
    var comImposto = Core.precoSugerido('shopee', 20, { impostoPct: 6, adsPct: 5 }, {}, { modo: 'margem', valor: 30 });
    ok('Imposto e ads elevam o preço sugerido', comImposto.preco > r.preco, comImposto.preco + ' > ' + r.preco);

    /* ---------------- Ancoragem na quebra de faixa ---------------- */

    // Com custo de R$40 e 24% de margem a faixa até R$79,99 ainda fecha a
    // conta: a solução tem de ficar nela em vez de saltar para R$80+.
    var ancora = Core.precoSugerido('shopee', 40, vendaZero, {}, { modo: 'margem', valor: 24 });
    ok(
      'Fica na faixa barata quando ela ainda entrega a margem',
      ancora.preco <= 79.99 && ancora.margem >= 0.2399,
      'preço=' + ancora.preco + ' margem=' + ancora.margem
    );

    // Acima disso a faixa de 20% não fecha 25% de margem e o preço salta.
    var salto = Core.precoSugerido('shopee', 40, vendaZero, {}, { modo: 'margem', valor: 25 });
    ok('Salta de faixa quando a margem não cabe mais', salto.preco >= 80, 'preço=' + salto.preco);

    // O piso da faixa vira candidato quando a solução cai abaixo dele.
    var comPiso = Core.precoSugerido('shopee', 30, vendaZero, {}, { modo: 'margem', valor: 25 });
    var temPiso80 = (comPiso.alternativas || []).some(function (a) { return perto(a.preco, 80); });
    ok('Piso da faixa entra como candidato', temPiso80 && comPiso.preco < 80, 'preço=' + comPiso.preco);

    var alerta = Core.alertaFaixa('shopee', 82, 40, vendaZero, {});
    ok('Alerta de faixa aponta ganho ao vender a R$79,99', alerta && alerta.precoAlternativo === 79.99 && alerta.ganho > 0,
      alerta ? 'ganho=' + alerta.ganho : 'sem alerta');

    var semAlerta = Core.alertaFaixa('shopee', 200, 40, vendaZero, {});
    ok('Sem alerta quando o preço alto compensa', !semAlerta || semAlerta.ganho > 0);

    /* ---------------- Break-even e arredondamento ---------------- */

    var minimo = Core.precoMinimo('shopee', 20, vendaZero, {});
    var confMin = Core.analisarPreco('shopee', minimo.preco, 20, vendaZero, {});
    ok('Preço mínimo tem lucro ~zero e não negativo', confMin.lucro >= -0.01 && confMin.lucro < 0.5, 'lucro=' + confMin.lucro);

    var arred = Core.arredondarComercial('shopee', 74.32, 90);
    ok('Arredondamento comercial vai para ,90', perto(arred, 74.9), 'valor=' + arred);

    var arredFaixa = Core.arredondarComercial('shopee', 79.5, 90);
    ok('Arredondamento não pula a faixa de R$79,99', arredFaixa <= 79.99, 'valor=' + arredFaixa);

    /* ---------------- Comparativo ---------------- */

    var comp = Core.comparar(25, vendaZero, {}, { modo: 'margem', valor: 30 });
    ok('Comparativo devolve os três marketplaces', comp.length === 3);
    ok('Comparativo traz nome e preço', comp.every(function (c) { return c.nome && c.preco > 0; }));

    var compPreco = Core.comparar(25, vendaZero, {}, { modo: 'preco', valor: 99.9 });
    ok('Modo preço fixo usa o mesmo preço em todos', compPreco.every(function (c) { return perto(c.preco, 99.9); }));

    return resultados;
  }

  var API = { run: run };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.Tests = API;

  // Execução direta no Node.
  if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    var res = run();
    var falhas = res.filter(function (r) { return !r.passou; });
    res.forEach(function (r) {
      console.log((r.passou ? '  ok  ' : ' FALHA') + ' | ' + r.nome + (r.detalhe ? '  → ' + r.detalhe : ''));
    });
    console.log('\n' + (res.length - falhas.length) + '/' + res.length + ' testes passaram.');
    if (falhas.length) process.exit(1);
  }
})(typeof window !== 'undefined' ? window : globalThis);
