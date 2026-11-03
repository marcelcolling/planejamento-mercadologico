/*
 * Motor das entregas: monta a página de uma entrega (ou atividade) a partir de PM.ESPEC (especificacoes.js).
 * Formato salvo: { v: 1, campos: { chave: texto | true } }. Só os campos preenchidos são guardados.
 *
 * Também exporta PM.relatorio(esp, campos), usado pelo PDF de cada entrega e pela página "Plano completo",
 * e PM.resumo(esp, campos), que gera as linhas legíveis da aba do grupo na planilha.
 */
(function () {
  'use strict';
  var PM = window.PM;
  var esc = function (s) { return window.VD ? VD.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ================= utilidades sobre a especificação ================= */
  /* ocultarSe: { k, v } tira o item da tela, do PDF e do resumo enquanto o campo k valer v (a resposta fica guardada) */
  function oculto(it, campos) { return !!(it.ocultarSe && campos && campos[it.ocultarSe.k] === it.ocultarSe.v); }
  /* Com "campos", pula o que está oculto; sem "campos", percorre tudo (lista de chaves, importação). */
  function cadaItem(itens, f, campos) {
    (itens || []).forEach(function (it) {
      if (oculto(it, campos)) return;
      f(it);
      if (it.t === 'grupo') cadaItem(it.itens, f, campos);
    });
  }
  function chavesDe(esp) {
    var ks = [];
    esp.secoes.forEach(function (s) {
      cadaItem(s.itens, function (it) {
        if (it.k && !it.t) ks.push(it.k);
        if (it.t === 'tabela') it.linhas.forEach(function (l) { l.k.forEach(function (k) { ks.push(k); }); });
        if (it.t === 'checklist') it.itens.forEach(function (c) { ks.push(c[0]); });
      });
    });
    return ks;
  }
  function opcoes(op) { return (op || []).map(function (o) { return Array.isArray(o) ? o : [o, o]; }); }
  function rotuloOpcao(op, v) {
    var o = opcoes(op).filter(function (x) { return x[0] === v; })[0];
    return o ? o[1] : v;
  }
  function vazio(v) { return v === undefined || v === null || v === '' || v === false; }
  function valorLegivel(col, v) {
    if (vazio(v)) return '';
    if (v === true) return 'Sim';
    if (col && col.tipo === 'opcoes') return rotuloOpcao(col.op, v);
    if (col && col.tipo === 'data') return dataBR(v);
    return String(v);
  }
  function dataBR(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ''));
    return m ? m[3] + '/' + m[2] + '/' + m[1] : String(v || '');
  }
  function rotuloLinha(l, campos) {
    return (l.rotuloDe && campos[l.rotuloDe]) ? l.r + ' · ' + campos[l.rotuloDe] : l.r;
  }
  function rotuloColuna(c, campos) { return (c.rotuloDe && campos[c.rotuloDe]) ? campos[c.rotuloDe] : c.r; }
  function tituloSecao(s, num) {
    var n = num ? num.sec[s.id] : s.n;
    return (n && /\d/.test(n) ? n + ' ' : '') + s.titulo;
  }
  function tituloEsp(esp) { return esp.codigo + ' · ' + esp.titulo; }

  /* ================= "Não se aplica" e numeração =================
   * Chaves (guardadas junto com as respostas):
   *   na__entrega / na__entrega_motivo           a entrega inteira
   *   na__s_<seção> / na__s_<seção>_motivo        uma seção
   *   na__b_<seção>__<sub> / ..._motivo           um sub-bloco (o trecho que começa num subtítulo da seção)
   * O que não se aplica sai do PDF, do plano completo e do progresso, e a numeração seguinte se ajusta.
   * As respostas já escritas continuam guardadas: reativar devolve tudo. */
  function ehEntrega(esp) { return esp.tipo !== 'atividade'; }
  function podeNA(esp, s) { return ehEntrega(esp) && !/^(checklist|coerencia|pitch)$/.test(s.id); }
  function slugJs(t) {
    var s = String(t || '');
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function subId(s, sub) { return s.id + '__' + slugJs(sub.r); }
  /* Divide os itens de uma seção em trechos: cada subtítulo (t:'sub') abre um trecho; itens "soltos" fecham o trecho. */
  function segmentos(s) {
    var out = [{ sub: null, itens: [] }];
    (s.itens || []).forEach(function (it) {
      if (it.t === 'sub') out.push({ sub: it, itens: [] });
      else if (it.solto) out.push({ sub: null, itens: [it] });
      else out[out.length - 1].itens.push(it);
    });
    return out.filter(function (g) { return g.sub || g.itens.length; });
  }
  function naEntrega(esp, c) { return ehEntrega(esp) && !!c.na__entrega; }
  function naSecao(esp, s, c) { return podeNA(esp, s) && (naEntrega(esp, c) || !!c['na__s_' + s.id]); }
  function naSub(esp, s, sub, c) { return podeNA(esp, s) && !!c['na__b_' + subId(s, sub)]; }
  /* Números exibidos: seções "1.3" renumeradas dentro do bloco; subtítulos "Objetivo 3" renumerados entre os iguais.
   * mapaBloco (opcional, plano completo) troca o número do bloco: { '4': '3' }. */
  function numeracao(esp, c, mapaBloco) {
    var cont = {}, sec = {}, sub = {};
    esp.secoes.forEach(function (s) {
      var m = /^(\d+)\.(\d+)$/.exec(s.n || '');
      if (m && naSecao(esp, s, c)) sec[s.id] = '—';
      else if (m) {
        cont[m[1]] = (cont[m[1]] || 0) + 1;
        sec[s.id] = (mapaBloco && mapaBloco[m[1]] != null ? mapaBloco[m[1]] : m[1]) + '.' + cont[m[1]];
      } else sec[s.id] = s.n;
      var iguais = {};
      segmentos(s).forEach(function (g) {
        if (!g.sub) return;
        // só subtítulos "Nome N" (com parêntese opcional no fim) são uma sequência: "Objetivo 3 (opcional)", "Ação 2"
        var id = subId(s, g.sub), mm = /^(.*?\S\s)(\d+)(\s*\([^)]*\))?$/.exec(g.sub.r);
        if (naSub(esp, s, g.sub, c) || !mm) { sub[id] = g.sub.r; return; }
        iguais[mm[1]] = (iguais[mm[1]] || 0) + 1;
        sub[id] = mm[1] + iguais[mm[1]] + (mm[3] || '');
      });
    });
    return { sec: sec, sub: sub };
  }
  /* Itens de uma seção que se aplicam (subtítulos já renumerados) e a lista dos sub-blocos marcados. */
  function itensDaSecao(esp, s, c, num) {
    var itens = [], naSubs = [];
    segmentos(s).forEach(function (g) {
      if (g.sub) {
        var id = subId(s, g.sub);
        if (naSub(esp, s, g.sub, c)) { naSubs.push({ r: g.sub.r, motivo: c['na__b_' + id + '_motivo'] }); return; }
        itens.push({ t: 'sub', r: num.sub[id] || g.sub.r });
      }
      itens = itens.concat(g.itens);
    });
    return { itens: itens, naSubs: naSubs };
  }
  function cfgPortal() { return window.VD_CONFIG || {}; }
  function urlLeitura(ref) {
    var l = PM.LEITURAS[ref[0]];
    return l ? (window.VD ? VD.raiz : '') + l.url + (ref[1] ? '#' + ref[1] : '') : '';
  }

  /* ================= números (ICE e orçamento) ================= */
  function numBR(v) {
    if (vazio(v)) return 0;
    var s = String(v).replace(/R\$\s*/g, '').replace(/\s/g, '');
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/[.,](?=\d{3}(\D|$))/g, '');
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }
  function moeda(n) {
    return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+,)/g, '.');
  }
  /* Recalcula os campos "calc" a partir dos demais. Devolve um objeto { chave: valor }. */
  function calcular(esp, campos) {
    var out = {};
    esp.secoes.forEach(function (s) {
      cadaItem(s.itens, function (it) {
        if (it.t !== 'tabela' || it.calculada) return;  // tabela "calculada": quem preenche é CALCULOS, abaixo
        var iCalc = it.cols.map(function (c) { return c.tipo; }).indexOf('calc');
        if (iCalc < 0) return;
        if (it.moeda) {
          var somaCol = it.cols.map(function () { return 0; }), algum = it.cols.map(function () { return false; });
          it.linhas.forEach(function (l) {
            if (l.calc) return;
            var tot = 0, tem = false;
            it.cols.forEach(function (c, j) {
              if (c.tipo !== 'moeda') return;
              var n = numBR(campos[l.k[j]]);
              if (!vazio(campos[l.k[j]])) { tem = true; algum[j] = true; }
              tot += n; somaCol[j] += n;
            });
            out[l.k[iCalc]] = tem ? moeda(tot) : '';
            if (tem) { somaCol[iCalc] += tot; algum[iCalc] = true; }
          });
          it.linhas.forEach(function (l) {
            if (!l.calc) return;
            l.k.forEach(function (k, j) { out[k] = algum[j] ? moeda(somaCol[j]) : ''; });
          });
        } else {
          it.linhas.forEach(function (l) {
            var prod = 1, todos = true, n = 0;
            it.cols.forEach(function (c, j) {
              if (c.tipo !== 'numero') return;
              var v = Number(campos[l.k[j]]); n++;
              if (!(v > 0)) todos = false; else prod *= v;
            });
            out[l.k[iCalc]] = (todos && n) ? String(prod) : '';
          });
        }
      });
    });
    if (CALCULOS[esp.id]) CALCULOS[esp.id](campos, out);
    return out;
  }

  /* ================= E4: ações, orçamento e cronograma saem dos cartões do plano ================= */
  var N_ACOES = 8;
  function chaveNaAcao(n) { return 'na__b_5w2h__acao-' + n; }
  /* As ações que se aplicam, com os valores já convertidos. Quem está em "Não se aplica" não entra em nada. */
  function acoesE4(c) {
    if (c.na__s_5w2h) return [];
    var l = [];
    for (var n = 1; n <= N_ACOES; n++) {
      if (c[chaveNaAcao(n)]) continue;
      var p = 'b5_a' + n + '_', tri = [0, 0, 0, 0], custos = [], temValor = false;
      ['c1_', 'c2_'].forEach(function (lin) {
        var vals = [1, 2, 3, 4].map(function (t) { return c[p + lin + 't' + t]; });
        var tem = vals.some(function (v) { return !vazio(v); });
        if (tem) temValor = true;
        var nums = vals.map(numBR);
        if (tem || c[p + lin + 'cat']) custos.push({ cat: c[p + lin + 'cat'] || '', tri: nums, tem: tem });
        if (c[p + lin + 'cat']) nums.forEach(function (x, i) { tri[i] += x; });
      });
      l.push({
        n: n, p: p, what: c[p + 'what'] || '', why: c[p + 'why'] || '', kpi: c[p + 'kpi'] || '', dec: c[p + 'dec'] || '',
        who: c[p + 'who'] || '', where: c[p + 'where'] || '', ini: c[p + 'ini'] || '', fim: c[p + 'fim'] || '', when: c[p + 'when'] || '',
        how: c[p + 'how'] || '', premissa: c[p + 'premissa'] || '', horas: c[p + 'horas'] || '', recursos: c[p + 'recursos'] || '',
        score: Number(c[p + 'imp']) * Number(c[p + 'conf']) * Number(c[p + 'fac']) || 0,
        custos: custos, tri: tri, total: tri[0] + tri[1] + tri[2] + tri[3], temValor: temValor
      });
    }
    return l;
  }
  /* Ações do ciclo na ordem do cronograma: primeiro as que começam antes; no empate, a de maior ICE. */
  function acoesCiclo(c) {
    return acoesE4(c).filter(function (a) { return a.dec === 'Ciclo'; }).sort(function (x, y) {
      if (x.ini !== y.ini) return !x.ini ? 1 : !y.ini ? -1 : (x.ini < y.ini ? -1 : 1);
      return y.score - x.score || x.n - y.n;
    });
  }
  /* Ano do plano: o informado na 5.2 ou, se estiver vazio, o da primeira data de início do ciclo. */
  function anoDoPlano(c) {
    var ano = Number(c.b5_ano_plano);
    if (ano) return ano;
    var com = acoesCiclo(c).filter(function (a) { return a.ini; });
    return com.length ? Number(com[0].ini.slice(0, 4)) : 0;
  }
  /* Trimestres (1 a 4) do ano do plano cobertos pela ação; sem data de fim, só o trimestre em que ela começa. */
  function trimestresAcao(a, c) {
    var ano = anoDoPlano(c), trim = function (d) { return Math.ceil(Number(d.slice(5, 7)) / 3); };
    if (!a.ini || !ano) return [];
    var ai = Number(a.ini.slice(0, 4)), de = ai < ano ? 1 : ai > ano ? 0 : trim(a.ini);
    if (!de) return [];
    var ate = de;
    if (a.fim) {
      var af = Number(a.fim.slice(0, 4));
      if (af < ano) return [];
      ate = af > ano ? 4 : trim(a.fim);
    }
    var l = [];
    for (var q = de; q <= ate; q++) l.push(q);
    return l;
  }
  function pctReserva(c) { return vazio(c.b5_orc_reserva_pct) ? 12 : numBR(c.b5_orc_reserva_pct); }
  var CALCULOS = {
    e4: function (campos, out) {
      var c = Object.assign({}, campos, out), i, q;
      for (i = 1; i <= N_ACOES; i++) {
        var p = 'b5_a' + i + '_', a = Number(c[p + 'imp']), b = Number(c[p + 'conf']), d = Number(c[p + 'fac']);
        out[p + 'score'] = (a > 0 && b > 0 && d > 0) ? String(a * b * d) : '';
      }
      /* orçamento: soma o How much das ações do ciclo, por categoria e por trimestre */
      var cats = PM.CAT_ACAO, mat = cats.map(function () { return [0, 0, 0, 0]; }), tem = cats.map(function () { return false; });
      acoesE4(c).filter(function (x) { return x.dec === 'Ciclo'; }).forEach(function (x) {
        x.custos.forEach(function (l) {
          var ic = cats.indexOf(l.cat);
          if (ic < 0 || !l.tem) return;
          tem[ic] = true;
          l.tri.forEach(function (v, t) { mat[ic][t] += v; });
        });
      });
      var algum = tem.some(Boolean), sub = [0, 0, 0, 0], res = [0, 0, 0, 0], pct = pctReserva(c);
      var celula = function (pre, vals, mostra) {
        vals.forEach(function (v, t) { out[pre + '_t' + (t + 1)] = mostra ? moeda(v) : ''; });
        out[pre + '_total'] = mostra ? moeda(vals[0] + vals[1] + vals[2] + vals[3]) : '';
      };
      cats.forEach(function (x, ic) {
        celula('b5_orc' + (ic + 1), mat[ic], tem[ic]);
        mat[ic].forEach(function (v, t) { sub[t] += v; });
      });
      sub.forEach(function (v, t) { res[t] = Math.round(v * pct / 100); });
      celula('b5_orc_sub', sub, algum);
      celula('b5_orc7', res, algum);
      var tot = sub.map(function (v, t) { return v + res[t]; });
      celula('b5_orc_tot', tot, algum);
      var totalAno = tot[0] + tot[1] + tot[2] + tot[3], receita = numBR(c.b5_orc_receita_anual);
      out.b5_orc_pct_calc = (algum && receita > 0) ? (totalAno / receita * 100).toFixed(1).replace('.', ',') + '%' : '';
      /* cronograma: frentes novas = ações cujo primeiro trimestre preenchido é aquele */
      var novas = [0, 0, 0, 0], linhas = 0;
      for (i = 1; i <= 5; i++) {
        for (q = 1; q <= 4; q++) {
          if (!vazio(c['b5_cron' + i + '_q' + q])) { novas[q - 1]++; linhas++; break; }
        }
      }
      novas.forEach(function (v, t) { out['b5_cron_novas_q' + (t + 1)] = linhas ? String(v) : ''; });
    }
  };
  /* Avisos: faixa discreta no topo da seção. Orientam e não impedem o salvamento. */
  function nomeSub(sec, sub, c) {
    var n = numeracao(PM.ESPEC.e4, c).sub[sec + '__' + sub];
    return String(n || sub).replace(/\s*\(.*?\)\s*$/, '');
  }
  var AVISOS = {
    kpis: function (c) {
      var av = [], lista = [];
      for (var i = 1; i <= 5; i++) {
        if (c['b4_kpi' + i + '_nome'] && !c['na__b_kpis__kpi-' + i]) lista.push(i);
      }
      if (!lista.length) return av;
      var campo = function (i, s) { return c['b4_kpi' + i + '_' + s]; };
      var rot = function (i) { return nomeSub('kpis', 'kpi-' + i, c); };
      var conta = function (s, v) { return lista.filter(function (i) { return campo(i, s) === v; }).length; };
      var nomes = function (f) { return lista.filter(f).map(rot).join(', '); };
      if (lista.length < 3) av.push('O dashboard tem ' + lista.length + ' KPI' + (lista.length === 1 ? '' : 's') + ': o plano pede de 3 a 5.');
      if (lista.length >= 2 && !conta('tipo', 'Resultado')) av.push('Falta ao menos um KPI de Resultado: é o número que o dono acompanha.');
      if (lista.length >= 2 && !conta('tipo', 'Processo')) av.push('Falta ao menos um KPI de Processo: é o que mostra à equipe o que fazer.');
      var semObj = nomes(function (i) { return !campo(i, 'obj'); });
      if (semObj) av.push('Sem objetivo vinculado: ' + semObj + '. Todo KPI serve a um objetivo.');
      [1, 2, 3].forEach(function (m) {
        if (c['b4_obj_mktg' + m] && !conta('obj', 'Objetivo ' + m)) av.push('O Objetivo ' + m + ' (4.1) ainda não tem KPI no dashboard.');
      });
      var semFonte = nomes(function (i) { return campo(i, 'base') && !campo(i, 'fonte'); });
      if (semFonte) av.push('Baseline sem data e fonte: ' + semFonte + '.');
      if (conta('origem', 'Hipótese') > lista.length / 2) av.push('Mais da metade dos baselines é hipótese: vale pedir dados à empresa ou medir por 4 semanas.');
      return av;
    },
    '5w2h': function (c) {
      var av = [];
      acoesE4(c).filter(function (a) { return a.dec === 'Ciclo'; }).forEach(function (a) {
        var f = [];
        if (!a.what) f.push('What');
        if (!a.why) f.push('Why');
        if (!a.kpi) f.push('KPI que move');
        if (!a.who) f.push('Who');
        if (!a.where) f.push('Where');
        if (!a.ini || !a.fim) f.push('When (início e fim)');
        if (!a.how) f.push('How');
        if (!a.temValor && !a.horas && !a.premissa && !a.recursos) f.push('How much');
        if (f.length) av.push(nomeSub('5w2h', 'acao-' + a.n, c) + ' está no ciclo e ainda falta: ' + f.join(', ') + '.');
      });
      return av;
    },
    orcamento: function (c) {
      var av = [], ciclo = acoesE4(c).filter(function (a) { return a.dec === 'Ciclo'; });
      var rot = function (a) { return nomeSub('5w2h', 'acao-' + a.n, c); };
      var pct = pctReserva(c);
      if (pct < 10 || pct > 15) av.push('A reserva está em ' + pct + '%: o recomendado é de 10% a 15%.');
      ciclo.forEach(function (a) {
        if (a.custos.some(function (l) { return l.tem && !l.cat; })) av.push(rot(a) + ' tem valor sem categoria: esse valor não entrou na soma.');
        else if (!a.temValor && !a.horas && !a.premissa) av.push(rot(a) + ' está no ciclo sem valor no How much. Se custa R$ 0, digite 0 e registre as horas.');
      });
      var teto = numBR(c.b5_teto_caixa);
      var pico = Math.max.apply(null, [1, 2, 3, 4].map(function (t) { return numBR(c['b5_orc_tot_t' + t]); }));
      if (teto > 0 && pico / 3 > teto) av.push('O trimestre mais caro dá ' + moeda(pico / 3) + ' por mês, acima do teto de caixa de ' + moeda(teto) + ' por mês.');
      var comVerba = ciclo.filter(function (a) { return a.total > 0; });
      if (comVerba.length >= 2) {
        var maior = comVerba.slice().sort(function (x, y) { return y.total - x.total; })[0];
        var ordem = ciclo.slice().sort(function (x, y) { return y.score - x.score; });
        if (maior.score > 0 && ordem.indexOf(maior) >= ordem.length / 2) {
          av.push('A maior verba (' + moeda(maior.total) + ') está em ' + rot(maior) + ', uma ação de ICE baixo no ciclo. Se for um teste com gatilho, explique em "De onde vieram os valores".');
        }
      }
      return av;
    },
    cronograma: function (c) {
      var av = [], ciclo = acoesCiclo(c);
      var alem = [1, 2, 3, 4].filter(function (q) { return Number(c['b5_cron_novas_q' + q]) > 2; });
      if (alem.length) av.push('Mais de duas frentes novas em ' + alem.map(function (q) { return 'T' + q; }).join(', ') + ': em equipes pequenas, o limite é de duas por trimestre.');
      var semData = ciclo.filter(function (a) { return !a.ini; }).map(function (a) { return nomeSub('5w2h', 'acao-' + a.n, c); });
      if (semData.length) av.push('Sem data de início na 5.1: ' + semData.join(', ') + '. O botão não consegue marcar os trimestres dessas ações.');
      if (ciclo.length > 5) av.push('O ciclo tem ' + ciclo.length + ' ações, e a tabela traz as 5 primeiras. O plano pede de 3 a 5.');
      return av;
    }
  };

  /* ================= resumo para a planilha ================= */
  function resumo(esp, campos) {
    var L = [];
    if (naEntrega(esp, campos)) return [['Entrega', 'Não se aplica', campos.na__entrega_motivo || '—']];
    var num = numeracao(esp, campos);
    esp.secoes.forEach(function (s) {
      var sec = tituloSecao(s, num);
      if (naSecao(esp, s, campos)) { L.push([sec, 'Seção não se aplica', campos['na__s_' + s.id + '_motivo'] || '—']); return; }
      var r = itensDaSecao(esp, s, campos, num);
      r.naSubs.forEach(function (x) { L.push([sec, x.r, 'Não se aplica' + (x.motivo ? ': ' + x.motivo : '')]); });
      // rotularSub: cartões com os mesmos campos ("KPI 2 · Meta"); sem isso, a planilha não diz de qual cartão é a resposta
      var pre = '';
      cadaItem(r.itens, function (it) {
        if (it.t === 'sub' && s.rotularSub) { pre = it.r.replace(/\s*\(.*?\)\s*$/, '') + ' · '; return; }
        if (it.solto) pre = '';
        if (it.k && !it.t && !vazio(campos[it.k])) L.push([sec, pre + it.r, valorLegivel(it, campos[it.k])]);
        if (it.t === 'tabela') {
          it.linhas.forEach(function (l) {
            l.k.forEach(function (k, j) {
              if (vazio(campos[k])) return;
              var c = it.cols[j];
              var rot = pre + (it.r ? it.r + ' · ' : '') + rotuloLinha(l, campos) + (it.cols.length > 1 ? ' · ' + rotuloColuna(c, campos) : '');
              L.push([sec, rot, valorLegivel(c, campos[k])]);
            });
          });
        }
        if (it.t === 'checklist') it.itens.forEach(function (c) { L.push([sec, c[1], campos[c[0]] ? '✓' : '—']); });
      }, campos);
    });
    return L;
  }

  /* ================= relatório (PDF para a empresa) ================= */
  function paragrafos(v) {
    return esc(v).replace(/\n/g, '<br>');
  }
  function relatorioTabela(it, campos) {
    if (it.relatorio === false) return '';
    var cols = it.cols.map(function (c, j) { return { c: c, j: j }; }).filter(function (x) { return x.c.relatorio !== false; });
    var linhas = it.linhas.filter(function (l) {
      if (it.banco) return campos[l.k[0]] || !vazio(campos[l.k[2]]);
      return cols.some(function (x) { return !vazio(campos[l.k[x.j]]) && x.c.tipo !== 'calc'; }) || (l.calc && cols.some(function (x) { return !vazio(campos[l.k[x.j]]); }));
    });
    if (!linhas.length) return '';
    cols = cols.filter(function (x) { return linhas.some(function (l) { return !vazio(campos[l.k[x.j]]); }) || it.banco; });
    var unica = it.cols.length === 1;
    // linhas numeradas (1, 2, 3...): no relatório, a numeração segue só as linhas preenchidas
    var numerada = !it.banco && it.linhas.every(function (l) { return /^\d+$/.test(l.r); });
    var h = (it.r ? '<h4 class="r-sub">' + esc(it.r) + '</h4>' : '') + '<table class="r-tab' + (cols.length > 4 ? ' r-tab-larga' : '') + '"><thead><tr><th></th>';
    if (!unica) cols.forEach(function (x) { h += '<th>' + esc(rotuloColuna(x.c, campos)) + '</th>'; });
    else h += '<th>' + esc(it.cols[0].r) + '</th>';
    h += '</tr></thead><tbody>';
    linhas.forEach(function (l, i) {
      h += '<tr' + (l.total ? ' class="r-total"' : '') + '><th scope="row">' + esc(numerada ? String(i + 1) : rotuloLinha(l, campos)) + (l.d && !it.banco ? '<small>' + esc(l.d) + '</small>' : '') + '</th>';
      cols.forEach(function (x) { h += '<td>' + paragrafos(valorLegivel(x.c, campos[l.k[x.j]])) + '</td>'; });
      h += '</tr>';
    });
    return h + '</tbody></table>';
  }
  function relatorioItens(itens, campos, esp) {
    var h = '';
    (itens || []).forEach(function (it) {
      if (it.relatorio === false || oculto(it, campos)) return;
      if (!it.t && it.k) {
        if (!vazio(campos[it.k])) h += '<div class="r-campo"><h4>' + esc(it.r) + '</h4><p>' + paragrafos(valorLegivel(it, campos[it.k])) + '</p></div>';
      } else if (it.t === 'grupo') {
        var dentro = relatorioItens(it.itens.filter(function (x) { return x.t !== 'sub'; }), campos, esp);
        if (dentro) {
          var subs = it.itens.filter(function (x) { return x.t === 'sub'; });
          if (subs.length && subs.length === it.cols) {
            // colunas com subtítulo (ex.: lado do cliente × lado da empresa; Paid/Owned/Earned): mantém a ordem por coluna
            h += '<div class="r-colunas r-cols-' + it.cols + '">';
            var resto = it.itens.filter(function (x) { return x.t !== 'sub'; });
            subs.forEach(function (sb, ci) {
              var col = resto.filter(function (x, i) { return i % it.cols === ci; });
              var conteudo = relatorioItens(col, campos, esp);
              if (conteudo) h += '<div><h4 class="r-sub">' + esc(sb.r) + '</h4>' + conteudo + '</div>';
            });
            h += '</div>';
          } else {
            h += '<div class="r-grade">' + dentro + '</div>';
          }
        }
      } else if (it.t === 'tabela') {
        h += relatorioTabela(it, campos);
      } else if (it.t === 'sub') {
        h += '<!--sub:' + esc(it.r) + '-->';
      } else if (it.t === 'especial' && ESPECIAIS[it.nome] && ESPECIAIS[it.nome].relatorio) {
        h += ESPECIAIS[it.nome].relatorio(campos, esp);
      }
    });
    // subtítulos só aparecem se houver conteúdo depois deles
    return h.replace(/<!--sub:(.*?)-->((?:(?!<!--sub:)[\s\S])*)/g, function (m, t, resto) {
      return resto.replace(/\s/g, '') ? '<h3 class="r-subtitulo">' + t + '</h3>' + resto : '';
    });
  }
  function relatorioCorpo(esp, campos, mapaBloco) {
    if (naEntrega(esp, campos)) {
      return '<div class="r-na"><strong>Esta entrega não se aplica a esta empresa.</strong>' +
        (campos.na__entrega_motivo ? '<p>' + paragrafos(campos.na__entrega_motivo) + '</p>' : '') + '</div>';
    }
    var h = '', num = numeracao(esp, campos, mapaBloco);
    esp.secoes.forEach(function (s) {
      if (s.id === 'checklist' && !s.itens.some(function (i) { return i.t === 'especial'; })) return;
      if (naSecao(esp, s, campos)) return;
      var dentro = relatorioItens(itensDaSecao(esp, s, campos, num).itens, campos, esp);
      var n = num.sec[s.id];
      if (dentro.replace(/<[^>]+>|\s/g, '')) h += '<section class="r-secao"><h2><span>' + esc(n && /\d/.test(n) ? n : '') + '</span>' + esc(s.titulo) + '</h2>' + dentro + '</section>';
    });
    return h;
  }
  function capa(titulo, subtitulo, meta) {
    var m = meta || ((VD.dados('e0') || {}).campos) || {};
    var s = VD.sessao();
    var integr = String(m.meta_integrantes || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    var hoje = new Date();
    return '<header class="r-capa">' +
      '<div class="r-capa-topo">Plano de marketing' + (m.meta_empresa ? ' · ' + esc(m.meta_empresa) : '') + '</div>' +
      '<h1>' + esc(titulo) + '</h1>' + (subtitulo ? '<p class="r-capa-sub">' + esc(subtitulo) + '</p>' : '') +
      '<dl class="r-capa-dados">' +
        (m.meta_empresa ? '<div><dt>Empresa parceira</dt><dd>' + esc(m.meta_empresa) + (m.meta_setor ? ' · ' + esc(m.meta_setor) : '') + '</dd></div>' : '') +
        (m.meta_responsavel_empresa ? '<div><dt>Responsável na empresa</dt><dd>' + esc(m.meta_responsavel_empresa) + '</dd></div>' : '') +
        '<div><dt>Grupo</dt><dd>' + esc(m.meta_grupo || (s ? s.nome : '')) + '</dd></div>' +
        (integr.length ? '<div><dt>Integrantes</dt><dd>' + integr.map(esc).join(' · ') + '</dd></div>' : '') +
        '<div><dt>Data</dt><dd>' + String(hoje.getDate()).padStart(2, '0') + '/' + String(hoje.getMonth() + 1).padStart(2, '0') + '/' + hoje.getFullYear() + '</dd></div>' +
      '</dl>' +
      '<p class="r-capa-nota">Projeto integrador · ' + esc(cfgPortal().NOME_DISCIPLINA || 'Planejamento Mercadológico') + (cfgPortal().PROGRAMA ? ' · ' + esc(cfgPortal().PROGRAMA) : '') +
        '. Proposta elaborada por estudantes, a partir das informações compartilhadas pela empresa e de fontes públicas.</p>' +
      '</header>';
  }

  /* ================= componentes especiais ================= */
  function termoTexto(c) {
    var empresa = c.meta_empresa || '[empresa parceira]';
    var resp = c.meta_responsavel_empresa || '[responsável]';
    var grupo = c.meta_grupo || (VD.sessao() ? VD.sessao().nome : '[grupo]');
    var cfg = cfgPortal();
    var disciplina = 'da disciplina ' + (cfg.NOME_DISCIPLINA || 'Planejamento Mercadológico') + (cfg.PROGRAMA ? ' (' + cfg.PROGRAMA + ')' : '');
    // o valor antigo dizia "sala de aula"; o texto exibido é o rótulo atual
    var conf = c.e0_confidencial === 'Manter a empresa anônima fora da sala de aula' ? 'Manter a empresa anônima fora do ambiente acadêmico' : c.e0_confidencial;
    return [
      empresa + ', representada por ' + resp + ', aceita participar como empresa parceira do projeto integrador ' + disciplina + ', com o grupo de estudantes "' + grupo + '".',
      'Ao longo da disciplina, o grupo vai elaborar um plano de marketing para a empresa — análise de mercado, segmentação e posicionamento, mix de marketing, objetivos e ações, comunicação e governança — e apresentá-lo à empresa ao final.',
      'A empresa se dispõe a receber o grupo em pelo menos duas reuniões' + (c.e0_reunioes ? ' (' + c.e0_reunioes.replace(/\n+/g, '; ') + ')' : '') + ' e a compartilhar as informações que julgar possíveis' + (c.e0_dados ? ', como: ' + c.e0_dados.replace(/\n+/g, '; ') : '') + '.',
      'Quanto ao uso das informações fora do ambiente acadêmico: ' + (conf ? conf.charAt(0).toLowerCase() + conf.slice(1) : 'a combinar') + '.',
      'O plano é uma proposta acadêmica, elaborada por estudantes sob orientação do professor. Não se trata de consultoria remunerada e não há garantia de resultado; cabe à empresa decidir o que aplicar.'
    ];
  }
  var ESPECIAIS = {
    termo: {
      tela: function () { return '<div class="termo" data-esp="termo"></div>'; },
      atualizar: function (el, c) {
        el.innerHTML = termoTexto(c).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
          '<p class="termo-nota">No PDF, o termo sai com espaço para as assinaturas.</p>';
      },
      relatorio: function (c) {
        return '<div class="r-termo">' + termoTexto(c).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
          '<div class="r-assin"><div><span></span>' + esc(c.meta_responsavel_empresa || 'Responsável pela empresa') + '<br><small>' + esc(c.meta_empresa || 'Empresa parceira') + '</small></div>' +
          '<div><span></span>Representante do grupo<br><small>' + esc(c.meta_grupo || '') + '</small></div></div>' +
          '<p class="r-local">Local e data: ________________________________</p></div>';
      }
    },
    frase: {
      tela: function () { return '<div class="frase-pos" data-esp="frase"><span class="frase-rot">A frase montada com os componentes</span><p class="frase-txt"></p><button type="button" class="btn-sec" data-usar-frase>Usar como Versão 1</button></div>'; },
      atualizar: function (el, c) {
        var t = fraseMontada(c);
        el.querySelector('.frase-txt').textContent = t || 'Preencha os componentes acima para ver a frase se montar.';
        el.classList.toggle('vazia', !t);
      }
    },
    contador: {
      tela: function () { return '<div class="contador" data-esp="contador"></div>'; },
      atualizar: function (el, c) {
        var n = Object.keys(c).filter(function (k) { return /^rt_b\d+_\d+_usar$/.test(k) && c[k]; }).length;
        var livres = [1, 2, 3].filter(function (i) { return c['rt_livre' + i + '_perg']; }).length;
        var t = n + livres;
        el.className = 'contador ' + (t >= 15 && t <= 18 ? 'ok' : t > 18 ? 'alto' : '');
        el.innerHTML = '<strong>' + t + '</strong> pergunta' + (t === 1 ? '' : 's') + ' selecionada' + (t === 1 ? '' : 's') + ' para a conversa <span>(meta: de 15 a 18' + (livres ? '; inclui ' + livres + ' do grupo' : '') + ')</span>';
      }
    },
    ranking: {
      tela: function () { return '<div class="ranking" data-esp="ranking"></div>'; },
      atualizar: function (el, c) { el.innerHTML = rankingHtml(c); },
      relatorio: function (c) { var h = rankingHtml(c, true); return h ? '<div class="r-ranking">' + h + '</div>' : ''; }
    },
    csv5w2h: {
      tela: function () { return '<div class="csv-box"><div><strong>Plano de ação em planilha</strong><p>Baixa as ações do ciclo em formato de planilha (Status, Início, Fim, Observações), pronto para a empresa acompanhar a execução no Excel ou no Google Planilhas.</p></div><button type="button" class="btn-sec" data-csv>Baixar plano de ação (CSV)</button></div>'; }
    },
    avisos: {
      tela: function (it) { return '<div class="e-avisos no-print" data-esp="avisos" data-avisos="' + esc(it.secao) + '" role="status" hidden></div>'; },
      atualizar: function (el, c) {
        var l = AVISOS[el.dataset.avisos] ? AVISOS[el.dataset.avisos](c) : [];
        el.hidden = !l.length;
        el.innerHTML = l.length ? '<span class="e-avisos-rot">Para conferir</span><ul>' + l.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '';
      }
    }
  };
  function fraseMontada(c) {
    if (!c.b2_pos_para && !c.b2_pos_oq) return '';
    var p = function (k, def) { return c[k] ? String(c[k]).trim().replace(/[.;]$/, '') : def; };
    return 'Para ' + p('b2_pos_para', '[segmento]') + ', que ' + p('b2_pos_que', '[problema]') + ', nossa oferta é ' + p('b2_pos_oq', '[categoria]') +
      ' que ' + p('b2_pos_pq', '[diferencial]') + ', diferente de ' + p('b2_pos_contra', '[alternativa]') + ', pois ' + p('b2_pos_pois', '[evidência]') + '.';
  }
  function rankingHtml(c, soLista) {
    var todas = acoesE4(c).filter(function (a) { return a.what && a.score > 0; });
    todas.sort(function (x, y) { return y.score - x.score || x.n - y.n; });
    if (!todas.length) return soLista ? '' : '<p class="ranking-vazio">Pontuem as ações para ver o ranking.</p>';
    var h = '<span class="ranking-rot">Ranking das ações pelo ICE</span><ol>' + todas.map(function (a) {
      var selo = a.dec ? '<em class="selo selo-' + (a.dec === 'Ciclo' ? 'ciclo' : 'banco') + '">' + esc(a.dec) + '</em>' : (soLista ? '' : '<em class="selo">Sem decisão</em>');
      return '<li><span>' + esc(a.what) + '</span>' + selo + '<b>' + a.score + '</b></li>';
    }).join('') + '</ol>';
    if (soLista) return h;
    var ciclo = acoesE4(c).filter(function (a) { return a.dec === 'Ciclo'; }).length;
    var algumaDecisao = acoesE4(c).some(function (a) { return a.dec; });
    if (algumaDecisao) {
      h += '<p class="ranking-nota' + (ciclo < 3 || ciclo > 5 ? ' ranking-aviso' : '') + '">' + ciclo + ' aç' + (ciclo === 1 ? 'ão' : 'ões') + ' no ciclo (o plano pede de 3 a 5).</p>';
    }
    if (todas.slice(0, 3).some(function (a) { return a.dec === 'Banco'; }) && !c.b5_corte_just) {
      h += '<p class="ranking-nota ranking-aviso">Uma das três ações de maior ICE ficou no Banco: registrem o motivo em "Trocas na ordem do ranking".</p>';
    }
    return h;
  }
  /* Só as ações do ciclo, na ordem de início. Texto iniciado por = + - @ vai protegido, para o Excel não executar como fórmula. */
  function csvTexto(c) {
    if (c.na__entrega) return null;
    var cab = ['Nº', 'O que', 'Por quê', 'Quem', 'Onde', 'Início', 'Fim', 'Marcos', 'Como', 'Financeiro (R$ total e por trimestre)', 'Horas e recursos', 'KPI', 'ICE', 'Status', 'Observações'];
    var acoes = acoesCiclo(c).filter(function (a) { return a.what; });
    if (!acoes.length) return null;
    var linhas = [cab].concat(acoes.map(function (a, i) {
      var porTri = a.tri.map(function (v, t) { return v ? 'T' + (t + 1) + ' ' + moeda(v) : ''; }).filter(Boolean).join('; ');
      var rec = [a.horas, a.recursos].filter(Boolean).join('; ');
      return [String(i + 1), a.what, a.why, a.who, a.where, dataBR(a.ini), dataBR(a.fim), a.when, a.how, moeda(a.total) + (porTri ? ' (' + porTri + ')' : ''), rec, a.kpi, a.score ? String(a.score) : '', 'A INICIAR', ''];
    }));
    return '﻿' + linhas.map(function (l) {
      return l.map(function (v) { v = String(v || '').replace(/"/g, '""'); return /^[=+\-@]/.test(v) ? '"\'' + v + '"' : '"' + v + '"'; }).join(';');
    }).join('\r\n');
  }
  function baixarCsv(c) {
    var csv = csvTexto(c);
    if (!csv) { VD.toast('Marquem ao menos uma ação como Ciclo, com o "What" preenchido, antes de baixar.'); return; }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'plano-de-acao-5w2h.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ================= montagem da página ================= */
  function attrs(o) { return Object.keys(o).map(function (k) { return o[k] == null ? '' : ' ' + k + '="' + esc(o[k]) + '"'; }).join(''); }
  function controle(k, def, ph, rotulo) {
    var tipo = def.tipo || 'texto';
    var base = { 'data-k': k, 'aria-label': rotulo || null };
    if (tipo === 'linha' || tipo === 'moeda') return '<input type="text"' + attrs(Object.assign(base, { placeholder: ph || (tipo === 'moeda' ? 'R$' : null), inputmode: tipo === 'moeda' ? 'decimal' : null })) + '>';
    if (tipo === 'numero') return '<input type="number"' + attrs(Object.assign(base, { min: def.min, max: def.max, step: 1, placeholder: ph || (def.min ? def.min + '–' + def.max : null) })) + '>';
    if (tipo === 'data') return '<input type="date"' + attrs(base) + '>';
    if (tipo === 'calc') return '<input type="text" readonly tabindex="-1" class="calc"' + attrs(base) + '>';
    if (tipo === 'check') return '<label class="chk-cel"><input type="checkbox"' + attrs(base) + '><span aria-hidden="true"></span></label>';
    if (tipo === 'opcoes') return '<select' + attrs(base) + '><option value="">—</option>' + opcoes(def.op).map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    return '<textarea rows="2"' + attrs(Object.assign(base, { placeholder: ph || null })) + '></textarea>';
  }
  function htmlCampo(it) {
    return '<div class="campo' + (it.tipo === 'check' ? ' campo-check' : '') + '"><label><span class="campo-rot">' + esc(it.r) + '</span>' +
      (it.d ? '<span class="campo-dica">' + esc(it.d) + '</span>' : '') + controle(it.k, it, it.ph, it.r) + '</label></div>';
  }
  function htmlTabela(it) {
    var h = (it.r ? '<h4 class="tab-titulo">' + esc(it.r) + '</h4>' : '') + (it.leitura ? linkLeitura(it.leitura) : '');
    var numerada = it.linhas.every(function (l) { return /^\d+$/.test(l.r) && !l.d; });
    h += '<div class="tab-wrap' + (it.largo ? ' largo' : '') + '"><table class="tab' + (it.banco ? ' tab-banco' : '') + (numerada ? ' tab-num' : '') + '"><thead><tr><th class="tab-canto"></th>';
    it.cols.forEach(function (c) {
      h += '<th' + (c.w ? ' style="width:' + c.w + '"' : '') + '>' + (c.rotuloDe ? '<span data-rotulo-de="' + esc(c.rotuloDe) + '" data-padrao="' + esc(c.r) + '">' + esc(c.r) + '</span>' : esc(c.r)) + '</th>';
    });
    h += '</tr></thead><tbody>';
    it.linhas.forEach(function (l) {
      h += '<tr' + (l.total ? ' class="linha-total"' : '') + '><th scope="row"><span class="lin-rot">' +
        (l.rotuloDe ? '<span data-rotulo-de="' + esc(l.rotuloDe) + '" data-padrao="' + esc(l.r) + '" data-prefixo="1">' + esc(l.r) + '</span>' : esc(l.r)) + '</span>' +
        (l.tag ? '<span class="tag tag-' + (l.tag === 'Essencial' ? 'e' : 'c') + '">' + esc(l.tag) + '</span>' : '') +
        (l.d ? '<span class="lin-dica">' + esc(l.d) + '</span>' : '') + '</th>';
      it.cols.forEach(function (c, j) {
        var tipo = l.calc ? { tipo: 'calc' } : c;
        h += '<td data-label="' + esc(c.r) + '">' + controle(l.k[j], tipo, (l.ph && l.ph[j]) || c.ph, (l.r + ' · ' + c.r)) + '</td>';
      });
      h += '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  /* ref: [chave da leitura, âncora, trecho (opcional, para quando a seção aponta para dois pontos da leitura)] */
  function linkLeitura(ref) {
    var l = PM.LEITURAS[ref[0]];
    if (!l) return '';
    return '<a class="link-leitura" href="' + esc(urlLeitura(ref)) + '" target="_blank" rel="noopener">📖 Na leitura: ' + esc(ref[2] || l.nome) + ' ↗</a>';
  }
  function htmlItens(itens, esp) {
    return (itens || []).map(function (it) {
      if (it.ocultarSe) {
        var semCond = Object.assign({}, it);
        delete semCond.ocultarSe;
        return '<div data-ocultar-k="' + esc(it.ocultarSe.k) + '" data-ocultar-v="' + esc(it.ocultarSe.v) + '">' + htmlItens([semCond], esp) + '</div>';
      }
      if (!it.t) return htmlCampo(it);
      if (it.t === 'grupo') return '<div class="grade grade-' + (it.cols || 2) + '">' + htmlItens(it.itens, esp) + '</div>';
      if (it.t === 'sub') return '<h3 class="sub">' + esc(it.r) + '</h3>';
      if (it.t === 'nota') return '<div class="nota">' + it.html + '</div>';
      if (it.t === 'html') return it.html;
      if (it.t === 'tabela') return htmlTabela(it);
      if (it.t === 'espelho') return '<div class="espelho" data-espelho-de="' + esc(it.de) + '" data-espelho-k="' + esc(it.k) + '"><span class="espelho-rot">' + esc(it.r) + '</span><p></p></div>';
      if (it.t === 'trazer') return '<div class="trazer"><button type="button" class="btn-trazer" data-trazer="' + esc(JSON.stringify([esp.id, esp.secoes.indexOf(SECAO_ATUAL), (SECAO_ATUAL.itens || []).indexOf(it)])) + '">' + esc(it.r) + '</button></div>';
      if (it.t === 'referencia') return '<details class="referencia" data-ref-de="' + esc(it.de) + '" data-ref-blocos="' + esc(it.blocos.join(',')) + '"><summary>' + esc(it.r) + '</summary><div class="ref-corpo"></div></details>';
      if (it.t === 'checklist') return '<ul class="chk-lista">' + it.itens.map(function (c) {
        return '<li><label><input type="checkbox" data-k="' + esc(c[0]) + '"><span class="chk-caixa" aria-hidden="true"></span><span>' + esc(c[1]) + '</span></label></li>';
      }).join('') + '</ul>';
      if (it.t === 'especial') return ESPECIAIS[it.nome] && ESPECIAIS[it.nome].tela ? ESPECIAIS[it.nome].tela(it) : '';
      return '';
    }).join('');
  }
  var SECAO_ATUAL = null;

  function painelNA(chave, texto) {
    return '<div class="na-painel" data-na-painel hidden><p>' + texto + '</p>' +
      '<label><span class="campo-rot">Por que não se aplica (opcional)</span><textarea rows="2" data-k="' + esc(chave) + '_motivo" placeholder="Ex.: a empresa ainda não vende pela internet."></textarea></label></div>';
  }
  function botaoNA(alvo, chave, classe) {
    return '<button type="button" class="btn-na' + (classe ? ' ' + classe : '') + '" data-na="' + esc(alvo) + '" aria-pressed="false">Não se aplica</button>' +
      '<input type="checkbox" hidden data-k="' + esc(chave) + '">';
  }
  /* Corpo da seção: em entregas, cada subtítulo vira um sub-bloco com o próprio botão "Não se aplica". */
  function htmlCorpoSecao(esp, s) {
    if (!podeNA(esp, s)) return htmlItens(s.itens, esp);
    return segmentos(s).map(function (g) {
      if (!g.sub) return htmlItens(g.itens, esp);
      var id = subId(s, g.sub);
      return '<div class="e-bloco" data-bloco="' + esc(id) + '"><div class="sub-cab"><h3 class="sub" data-sub-tit="' + esc(id) + '">' + esc(g.sub.r) + '</h3>' +
        botaoNA('b:' + id, 'na__b_' + id, 'btn-na-sub') + '</div>' +
        '<div class="e-bloco-corpo">' + htmlItens(g.itens, esp) + '</div>' +
        painelNA('na__b_' + id, 'Este trecho foi marcado como não aplicável: sai do PDF e a numeração dos trechos seguintes se ajusta. O que já estava escrito fica guardado.') +
        '</div>';
    }).join('');
  }

  function montar(esp) {
    var raiz = VD.raiz;
    var ehAtividade = esp.tipo === 'atividade';
    var idx = PM.ORDEM.indexOf(esp.id);
    var ant = PM.ESPEC[PM.ORDEM[idx - 1]], prox = PM.ESPEC[PM.ORDEM[idx + 1]];
    function urlDe(e) { return raiz + (e.tipo === 'atividade' ? 'atividades/' : 'entregas/') + e.id + '.html'; }

    var leit = (esp.leituras || []).map(function (r) {
      var l = PM.LEITURAS[r];
      return '<a class="lt" href="' + esc(raiz + l.url) + '"><span class="lt-ico">📖</span>' + esc(l.nome) + '</a>';
    }).join('') + (esp.leiturasEmBreve || []).map(function (n) { return '<span class="lt lt-breve"><span class="lt-ico">⏳</span>' + esc(n) + ' <em>· em breve</em></span>'; }).join('');

    var h = '<header class="e-hero"><div class="e-wrap">' +
      '<span class="e-tag"><i></i>' + esc(esp.etapa) + '</span>' +
      '<h1><span class="e-cod">' + esc(esp.codigo) + '</span>' + esc(esp.titulo) + '</h1>' +
      '<p class="e-perg">' + esc(esp.pergunta) + '</p>' +
      '<p class="e-resumo">' + esc(esp.resumo) + '</p>' +
      '<div class="e-meta"><span>' + esc(esp.bloco) + '</span><span class="e-prog" id="progGeral"></span></div>' +
      '<div class="e-acoes no-print">' +
        '<button type="button" class="vd-btn vd-btn-amarelo" data-vd-salvar>Salvar respostas</button>' +
        '<button type="button" class="vd-btn vd-btn-claro" id="btnPdf">Salvar em PDF' + (ehAtividade ? '' : ' para a empresa') + '</button>' +
        (ehAtividade ? '' : '<button type="button" class="vd-btn vd-btn-claro" id="btnImportar" title="Para quem preencheu a Ferramenta Interativa (arquivo HTML) e exportou o JSON">Importar JSON da Ferramenta</button><input type="file" id="arqImportar" accept=".json,application/json" hidden>' +
          '<button type="button" class="vd-btn vd-btn-claro btn-na-entrega" data-na="entrega" aria-pressed="false" title="Para quando esta entrega inteira não fizer sentido para a empresa parceira">Esta entrega não se aplica</button><input type="checkbox" hidden data-k="na__entrega">') +
      '</div></div></header>';

    h += '<nav class="e-nav no-print" aria-label="Seções"><div class="e-wrap"><div class="e-nav-in">' + esp.secoes.map(function (s) {
      return '<a href="#s-' + esc(s.id) + '" data-sec="' + esc(s.id) + '"><b>' + esc(s.n) + '</b><span>' + esc(s.titulo.replace(/:.*$/, '')) + '</span><i class="sec-prog"></i></a>';
    }).join('') + '</div></div></nav>';

    h += '<main class="e-wrap e-main">';
    if (leit) h += '<div class="e-leituras no-print"><span class="e-leituras-rot">Leituras desta etapa</span>' + leit + '</div>';
    if (!ehAtividade) {
      h += '<div class="na-entrega" hidden><strong>Esta entrega foi marcada como não aplicável à empresa parceira.</strong>' +
        '<p>Ela sai do PDF e do plano completo, e a numeração dos blocos seguintes se ajusta no plano completo. O que já estava escrito fica guardado: reativar devolve tudo.</p>' +
        '<label><span class="campo-rot">Por que não se aplica (opcional)</span><textarea rows="2" data-k="na__entrega_motivo"></textarea></label>' +
        '<button type="button" class="vd-btn vd-btn-roxo" data-na="entrega">Reativar a entrega</button></div>';
    }
    esp.secoes.forEach(function (s) {
      SECAO_ATUAL = s;
      var na = podeNA(esp, s);
      h += '<section class="e-secao" id="s-' + esc(s.id) + '" data-sec="' + esc(s.id) + '">' +
        '<div class="e-secao-cab"><span class="e-secao-n">' + esc(s.n) + '</span><div class="e-secao-tit"><h2>' + esc(s.titulo) + '</h2>' +
        (s.alimenta ? '<span class="e-alimenta">' + esc(s.alimenta) + '</span>' : '') + '</div>' +
        (na ? botaoNA('s:' + s.id, 'na__s_' + s.id) : '') + '</div>' +
        (na ? painelNA('na__s_' + s.id, 'Esta seção foi marcada como não aplicável: sai do PDF e a numeração das seções seguintes se ajusta. O que já estava escrito fica guardado.') : '') +
        '<div class="e-secao-conteudo">' +
        (s.dica ? '<p class="e-dica">' + esc(s.dica) + '</p>' : '') + (s.leitura ? linkLeitura(s.leitura) : '') + (s.leitura2 ? ' ' + linkLeitura(s.leitura2) : '') +
        '<div class="e-secao-corpo">' + htmlCorpoSecao(esp, s) + '</div></div></section>';
    });
    SECAO_ATUAL = null;
    h += '<nav class="e-rodape no-print">' +
      (ant ? '<a href="' + esc(urlDe(ant)) + '">← ' + esc(ant.codigo + ' · ' + ant.titulo) + '</a>' : '<span></span>') +
      '<a class="e-plano" href="' + esc(raiz + 'plano.html') + '">Ver o plano completo</a>' +
      (prox ? '<a href="' + esc(urlDe(prox)) + '">' + esc(prox.codigo + ' · ' + prox.titulo) + ' →</a>' : '<span></span>') +
      '</nav></main>';

    document.getElementById('app').innerHTML = h;
    // o relatório fica fora de #app: na impressão, #app some e só ele aparece
    var rel = document.createElement('div');
    rel.id = 'relatorio'; rel.className = 'relatorio'; rel.setAttribute('aria-hidden', 'true');
    document.body.appendChild(rel);
  }

  /* ================= comportamento ================= */
  function iniciar(id) {
    var esp = PM.ESPEC[id];
    document.title = tituloEsp(esp) + ' — Planejamento Mercadológico';
    montar(esp);
    var campos = function () { return lerTela(); };
    var ctrl;

    function els() { return Array.prototype.slice.call(document.querySelectorAll('#app [data-k]')); }
    function lerTela() {
      var c = {};
      els().forEach(function (el) {
        var v = el.type === 'checkbox' ? el.checked : el.value;
        if (!vazio(v)) c[el.dataset.k] = el.type === 'checkbox' ? true : v;
      });
      return c;
    }
    function porChave(k) { return document.querySelector('#app [data-k="' + k + '"]'); }
    function escrever(el, v) {
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = vazio(v) ? '' : String(v);
    }
    function recalcular() {
      var c = lerTela(), r = calcular(esp, c);
      Object.keys(r).forEach(function (k) { var el = porChave(k); if (el && el.value !== r[k]) el.value = r[k]; });
      return Object.assign(c, r);
    }
    function atualizarVisual() {
      var c = recalcular();
      document.querySelectorAll('[data-rotulo-de]').forEach(function (el) {
        var v = c[el.dataset.rotuloDe];
        el.textContent = v ? (el.dataset.prefixo ? el.dataset.padrao + ' · ' + v : v) : el.dataset.padrao;
      });
      document.querySelectorAll('[data-esp]').forEach(function (el) {
        var e = ESPECIAIS[el.dataset.esp];
        if (e && e.atualizar) e.atualizar(el, c);
      });
      document.querySelectorAll('[data-ocultar-k]').forEach(function (el) { el.hidden = c[el.dataset.ocultarK] === el.dataset.ocultarV; });
      estadoNA(c);
      progresso(c);
    }
    /* mostra/esconde o que não se aplica e atualiza a numeração na tela */
    function marcarBotao(b, ativo, textoAtivo, textoNormal) {
      b.setAttribute('aria-pressed', ativo ? 'true' : 'false');
      b.classList.toggle('ativo', ativo);
      b.textContent = ativo ? textoAtivo : textoNormal;
    }
    function estadoNA(c) {
      if (!ehEntrega(esp)) return;
      var num = numeracao(esp, c), naE = naEntrega(esp, c);
      var painelE = document.querySelector('.na-entrega');
      if (painelE) painelE.hidden = !naE;
      var be = document.querySelector('.btn-na-entrega');
      if (be) marcarBotao(be, naE, 'Reativar a entrega', 'Esta entrega não se aplica');
      var nav = document.querySelector('.e-nav');
      if (nav) nav.hidden = naE;
      esp.secoes.forEach(function (s) {
        var el = document.getElementById('s-' + s.id);
        if (!el) return;
        el.hidden = naE;
        var naS = !naE && naSecao(esp, s, c);
        el.classList.toggle('na', naS);
        var b = el.querySelector('.e-secao-cab [data-na]'), painel = el.querySelector(':scope > [data-na-painel]'), cont = el.querySelector('.e-secao-conteudo');
        if (b) marcarBotao(b, naS, 'Reativar seção', 'Não se aplica');
        if (painel) painel.hidden = !naS;
        if (cont) cont.hidden = naS;
        el.querySelector('.e-secao-n').textContent = num.sec[s.id];
        var chip = document.querySelector('.e-nav a[data-sec="' + s.id + '"]');
        if (chip) { chip.querySelector('b').textContent = num.sec[s.id]; chip.classList.toggle('na', naS); }
        segmentos(s).forEach(function (g) {
          if (!g.sub) return;
          var id = subId(s, g.sub), bl = el.querySelector('[data-bloco="' + id + '"]');
          if (!bl) return;
          var naB = naSub(esp, s, g.sub, c);
          bl.classList.toggle('na', naB);
          marcarBotao(bl.querySelector('[data-na]'), naB, 'Reativar', 'Não se aplica');
          bl.querySelector('.e-bloco-corpo').hidden = naB;
          bl.querySelector('[data-na-painel]').hidden = !naB;
          // marcado: nome original riscado, para não confundir com o trecho seguinte, que herda o número
          bl.querySelector('[data-sub-tit]').innerHTML = naB ? '<s>' + esc(g.sub.r.replace(/\s*\(.*?\)\s*$/, '')) + '</s> · não se aplica' : esc(num.sub[id]);
        });
      });
    }
    function progresso(c) {
      var totalG = 0, feitosG = 0, num = numeracao(esp, c);
      esp.secoes.forEach(function (s) {
        var ks = [];
        var itens = naSecao(esp, s, c) ? [] : itensDaSecao(esp, s, c, num).itens;  // o que não se aplica não conta
        cadaItem(itens, function (it) {
          if (it.k && !it.t && it.tipo !== 'calc') ks.push(it.k);
          if (it.t === 'tabela' && !it.banco) it.linhas.forEach(function (l) { l.k.forEach(function (k, j) { if (it.cols[j].tipo !== 'calc' && !l.calc) ks.push(k); }); });
          if (it.t === 'tabela' && it.banco) it.linhas.forEach(function (l) { ks.push(l.k[0]); });
          if (it.t === 'checklist') it.itens.forEach(function (x) { ks.push(x[0]); });
        }, c);
        var f = ks.filter(function (k) { return !vazio(c[k]); }).length;
        totalG += ks.length; feitosG += f;
        var a = document.querySelector('.e-nav a[data-sec="' + s.id + '"] .sec-prog');
        if (a) { a.textContent = f ? f : ''; a.parentNode.classList.toggle('tem', f > 0); }
      });
      var pg = document.getElementById('progGeral');
      if (pg) pg.textContent = naEntrega(esp, c) ? 'Não se aplica a esta empresa' : feitosG ? feitosG + ' campo' + (feitosG === 1 ? '' : 's') + ' preenchido' + (feitosG === 1 ? '' : 's') : 'Nada preenchido ainda';
    }

    /* ---- botões "Não se aplica" (marcam a caixa escondida correspondente) ---- */
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-na]');
      if (!b) return;
      var alvo = b.dataset.na;
      var chave = alvo === 'entrega' ? 'na__entrega' : alvo.charAt(0) === 's' ? 'na__s_' + alvo.slice(2) : 'na__b_' + alvo.slice(2);
      var cx = porChave(chave);
      if (!cx) return;
      cx.checked = !cx.checked;
      cx.dispatchEvent(new Event('change', { bubbles: true }));
      if (cx.checked && alvo === 'entrega') window.scrollTo({ top: 0 });
    });
    function espelhos() {
      document.querySelectorAll('[data-espelho-de]').forEach(function (el) {
        var de = el.dataset.espelhoDe, k = el.dataset.espelhoK;
        var v = de === esp.id ? lerTela()[k] : (((VD.dados(de) || {}).campos) || {})[k];
        var p = el.querySelector('p');
        if (v) { p.textContent = v; el.classList.remove('vazio'); }
        else { p.innerHTML = 'Ainda não preenchido na ' + esc(PM.ESPEC[de].codigo) + '. <a href="' + esc(VD.raiz + 'entregas/' + de + '.html') + '">Abrir a ' + esc(PM.ESPEC[de].codigo) + '</a>'; el.classList.add('vazio'); }
      });
      document.querySelectorAll('[data-ref-de]').forEach(function (el) {
        var rot = PM.ESPEC.roteiro, c = ((VD.dados('roteiro') || {}).campos) || {};
        var blocos = el.dataset.refBlocos.split(',');
        var h = '';
        rot.secoes.forEach(function (s) {
          if (blocos.indexOf(s.id.replace(/^b/, '')) < 0) return;
          s.itens[0].linhas.forEach(function (l) {
            if (c[l.k[2]]) h += '<div class="ref-item"><span class="ref-q">' + esc(l.r) + '</span><p>' + paragrafos(c[l.k[2]]) + '</p></div>';
          });
        });
        el.querySelector('.ref-corpo').innerHTML = h || '<p class="ref-vazio">Nenhuma resposta registrada ainda. <a href="' + esc(VD.raiz + 'atividades/roteiro.html') + '">Abrir o roteiro de entrevista</a> e preencher a coluna "Resposta da empresa".</p>';
      });
    }

    function aplicar(d) {
      var c = (d && d.campos) || {};
      els().forEach(function (el) { escrever(el, c[el.dataset.k]); });
      atualizarVisual();
      espelhos();
    }
    function coletar() { return { v: 1, campos: recalcular() }; }

    ctrl = VD.ferramenta({
      id: esp.id, titulo: tituloEsp(esp), crumb: tituloEsp(esp),
      coletar: coletar, aplicar: aplicar,
      resumo: function (d) { return resumo(esp, (d && d.campos) || {}); }
    });

    document.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('#app')) atualizarVisual(); });
    document.addEventListener('change', function (e) { if (e.target.closest && e.target.closest('#app')) atualizarVisual(); });
    VD.onSessao(function () { espelhos(); });

    /* ---- botões "Trazer" ---- */
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-trazer]');
      if (!b) return;
      var ref = JSON.parse(b.dataset.trazer);
      var it = PM.ESPEC[ref[0]].secoes[ref[1]].itens[ref[2]];
      var origem = it.de === esp.id ? lerTela() : ((VD.dados(it.de) || {}).campos || null);
      if (!origem || !Object.keys(origem).length) {
        VD.toast('A ' + PM.ESPEC[it.de].codigo + ' ainda não tem respostas' + (VD.sessao() ? '' : '. Entre com o grupo para trazer o que está na planilha') + '.');
        return;
      }
      var novos = {}, limpar = [];  // substituir: o que ficou vazio na origem também é apagado no destino (ex.: datas que mudaram)
      Object.keys(it.mapa).forEach(function (dest) {
        var src = it.mapa[dest];
        var v = typeof src === 'function' ? src(origem) : origem[src];
        if (!vazio(v)) novos[dest] = String(v);
        else if (it.substituir) limpar.push(dest);
      });
      if (!Object.keys(novos).length) { VD.toast('Não há nada para trazer: os campos de origem estão vazios.'); return; }
      var conflitos = Object.keys(novos).filter(function (k) { var el = porChave(k); return el && el.value && el.value !== novos[k]; })
        .concat(limpar.filter(function (k) { var el = porChave(k); return el && el.value; }));
      if (conflitos.length && !window.confirm(conflitos.length + ' campo(s) já preenchido(s) serão substituídos. Continuar?')) return;
      Object.keys(novos).forEach(function (k) { var el = porChave(k); if (el) escrever(el, novos[k]); });
      limpar.forEach(function (k) { var el = porChave(k); if (el) escrever(el, ''); });
      atualizarVisual();
      VD.alterado();
      VD.toast('Pronto: ' + Object.keys(novos).length + ' campo(s) preenchido(s).');
    });

    /* ---- frase de posicionamento → Versão 1 ---- */
    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-usar-frase]')) return;
      var t = fraseMontada(lerTela()), el = porChave('b2_pos_v1');
      if (!t) { VD.toast('Preencham os componentes primeiro.'); return; }
      if (el.value && el.value !== t && !window.confirm('Substituir o texto da Versão 1?')) return;
      escrever(el, t); el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    document.addEventListener('click', function (e) { if (e.target.closest('[data-csv]')) baixarCsv(lerTela()); });

    /* ---- PDF ---- */
    function prepararRelatorio() {
      var c = recalcular();
      var el = document.getElementById('relatorio');
      el.innerHTML = capa(tituloEsp(esp).replace(/^Atividade · /, ''), esp.relatorioTitulo || esp.bloco, esp.id === 'e0' ? c : null) +
        (relatorioCorpo(esp, c) || '<p class="r-vazio">Nenhuma resposta preenchida ainda.</p>');
    }
    window.addEventListener('beforeprint', prepararRelatorio);
    document.getElementById('btnPdf').onclick = function () { prepararRelatorio(); window.print(); };

    /* ---- importação do JSON da Ferramenta Interativa ---- */
    var bi = document.getElementById('btnImportar'), arq = document.getElementById('arqImportar');
    if (bi) {
      bi.onclick = function () { arq.value = ''; arq.click(); };
      arq.onchange = function () {
        var f = arq.files && arq.files[0];
        if (!f) return;
        var leitor = new FileReader();
        leitor.onload = function () {
          var j;
          try { j = JSON.parse(leitor.result); } catch (err) { VD.toast('Este arquivo não é um JSON válido.'); return; }
          j = (j && j.data && typeof j.data === 'object') ? j.data : j;
          if (!j || typeof j !== 'object') { VD.toast('Este arquivo não é um JSON da Ferramenta.'); return; }
          var feito = VD.emPlanilha() ? VD.sincronizar() : Promise.resolve();
          feito.then(function () { importar(j); });
        };
        leitor.readAsText(f, 'utf-8');
      };
    }
    function importar(j) {
      var relat = [];
      PM.ENTREGAS.forEach(function (id) {
        var e = PM.ESPEC[id], ks = chavesDe(e), conj = {};
        ks.forEach(function (k) { conj[k] = 1; });
        var novos = {};
        ks.forEach(function (k) { if (!vazio(j[k]) && typeof j[k] !== 'object') novos[k] = j[k] === true ? true : String(j[k]); });
        var atual = id === esp.id ? lerTela() : Object.assign({}, ((VD.dados(id) || {}).campos) || {});
        if (e.importar) e.importar(j, novos, atual);
        var n = 0;
        Object.keys(novos).forEach(function (k) {
          if (!conj[k] || !vazio(atual[k])) return;
          atual[k] = novos[k]; n++;
        });
        if (!n) return;
        Object.assign(atual, calcular(e, atual));
        if (id === esp.id) { aplicar({ v: 1, campos: atual }); VD.alterado(); }
        else VD.gravarOutra(id, tituloEsp(e), { v: 1, campos: atual }, resumo(e, atual));
        relat.push(e.codigo + ': ' + n + ' campo' + (n === 1 ? '' : 's'));
      });
      if (!relat.length) { VD.toast('Nada foi importado: o arquivo não tem campos novos (os já preenchidos no portal são mantidos).'); return; }
      espelhos();
      window.alert('Importação concluída. Campos vazios preenchidos com o arquivo:\n\n' + relat.join('\n') + '\n\nO que já estava preenchido no portal não foi alterado.');
    }

    /* ---- navegação: seção ativa ---- */
    var secs = Array.prototype.slice.call(document.querySelectorAll('.e-secao'));
    var links = Array.prototype.slice.call(document.querySelectorAll('.e-nav a'));
    function ativa() {
      var at = 0;
      secs.forEach(function (s, i) { if (s.getBoundingClientRect().top < 160) at = i; });
      links.forEach(function (a, i) { a.classList.toggle('ativo', i === at); });
      var l = links[at];
      if (l && l.parentNode.scrollWidth > l.parentNode.clientWidth) {
        var p = l.parentNode, alvo = l.offsetLeft - p.clientWidth / 2 + l.clientWidth / 2;
        if (Math.abs(p.scrollLeft - alvo) > 40) p.scrollLeft = alvo;
      }
    }
    var ag = false;
    window.addEventListener('scroll', function () { if (!ag) { ag = true; requestAnimationFrame(function () { ag = false; ativa(); }); } }, { passive: true });
    ativa();
    return ctrl;
  }

  /* ================= página "Plano completo" ================= */
  /* Plano completo: as entregas que não se aplicam saem do documento; partes e blocos são renumerados na sequência. */
  function plano(alvo) {
    var partes = [], indice = [], dados = {}, ordemBlocos = [];
    PM.ENTREGAS.forEach(function (id) {
      var e = PM.ESPEC[id], c = ((VD.dados(id) || {}).campos) || {};
      Object.assign(c, calcular(e, c));
      dados[id] = c;
      if (naEntrega(e, c)) return;
      e.secoes.forEach(function (s) {
        var m = /^(\d+)\./.exec(s.n || '');
        if (m && !naSecao(e, s, c) && ordemBlocos.indexOf(m[1]) < 0) ordemBlocos.push(m[1]);
      });
    });
    var mapaBloco = {};
    ordemBlocos.forEach(function (b, i) { mapaBloco[b] = String(ordemBlocos[0] === '0' ? i : i + 1); });
    var n = 0;
    PM.ENTREGAS.forEach(function (id) {
      var e = PM.ESPEC[id], c = dados[id];
      if (naEntrega(e, c)) return;
      n++;
      var corpo = relatorioCorpo(e, c, mapaBloco);
      indice.push('<li class="' + (corpo ? 'tem' : '') + '"><a href="#p-' + id + '"><b>' + n + '</b> ' + esc(e.titulo) + '</a><span>' + (corpo ? '' : 'ainda sem respostas') + '</span></li>');
      partes.push('<section class="r-entrega" id="p-' + id + '"><div class="r-entrega-cab"><span>' + n + '</span><div><h2>' + esc(e.titulo) + '</h2></div></div>' +
        (corpo || '<p class="r-vazio">Esta parte ainda não tem respostas.</p>') + '</section>');
    });
    alvo.innerHTML = capa('Plano de marketing', 'Plano completo, da análise de mercado à governança') +
      '<nav class="r-indice"><h2>Conteúdo</h2><ol>' + indice.join('') + '</ol></nav>' + partes.join('');
  }

  PM.iniciar = iniciar;
  PM.plano = plano;
  PM.resumo = resumo;
  PM.calcular = calcular;
  PM.chavesDe = chavesDe;
  PM.relatorioCorpo = relatorioCorpo;
  PM.numeracao = numeracao;
  PM.acoesCiclo = acoesCiclo;
  PM.trimestresAcao = trimestresAcao;
})();
