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
  function cadaItem(itens, f) {
    (itens || []).forEach(function (it) {
      f(it);
      if (it.t === 'grupo') cadaItem(it.itens, f);
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
  function tituloSecao(s) { return (s.n && /\d/.test(s.n) ? s.n + ' ' : '') + s.titulo; }
  function tituloEsp(esp) { return esp.codigo + ' · ' + esp.titulo; }
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
        if (it.t !== 'tabela') return;
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
    return out;
  }

  /* ================= resumo para a planilha ================= */
  function resumo(esp, campos) {
    var L = [];
    esp.secoes.forEach(function (s) {
      var sec = tituloSecao(s);
      cadaItem(s.itens, function (it) {
        if (it.k && !it.t && !vazio(campos[it.k])) L.push([sec, it.r, valorLegivel(it, campos[it.k])]);
        if (it.t === 'tabela') {
          it.linhas.forEach(function (l) {
            l.k.forEach(function (k, j) {
              if (vazio(campos[k])) return;
              var c = it.cols[j];
              var rot = (it.r ? it.r + ' · ' : '') + rotuloLinha(l, campos) + (it.cols.length > 1 ? ' · ' + rotuloColuna(c, campos) : '');
              L.push([sec, rot, valorLegivel(c, campos[k])]);
            });
          });
        }
        if (it.t === 'checklist') it.itens.forEach(function (c) { L.push([sec, c[1], campos[c[0]] ? '✓' : '—']); });
      });
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
    var h = (it.r ? '<h4 class="r-sub">' + esc(it.r) + '</h4>' : '') + '<table class="r-tab' + (cols.length > 4 ? ' r-tab-larga' : '') + '"><thead><tr><th></th>';
    if (!unica) cols.forEach(function (x) { h += '<th>' + esc(rotuloColuna(x.c, campos)) + '</th>'; });
    else h += '<th>' + esc(it.cols[0].r) + '</th>';
    h += '</tr></thead><tbody>';
    linhas.forEach(function (l) {
      h += '<tr' + (l.total ? ' class="r-total"' : '') + '><th scope="row">' + esc(rotuloLinha(l, campos)) + (l.d && !it.banco ? '<small>' + esc(l.d) + '</small>' : '') + '</th>';
      cols.forEach(function (x) { h += '<td>' + paragrafos(valorLegivel(x.c, campos[l.k[x.j]])) + '</td>'; });
      h += '</tr>';
    });
    return h + '</tbody></table>';
  }
  function relatorioItens(itens, campos, esp) {
    var h = '';
    (itens || []).forEach(function (it) {
      if (it.relatorio === false) return;
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
  function relatorioCorpo(esp, campos) {
    var h = '';
    esp.secoes.forEach(function (s) {
      if (s.id === 'checklist' && !s.itens.some(function (i) { return i.t === 'especial'; })) return;
      var dentro = relatorioItens(s.itens, campos, esp);
      if (dentro.replace(/<[^>]+>|\s/g, '')) h += '<section class="r-secao"><h2><span>' + esc(s.n && /\d/.test(s.n) ? s.n : '') + '</span>' + esc(s.titulo) + '</h2>' + dentro + '</section>';
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
      '<p class="r-capa-nota">Projeto Integrador de Planejamento Mercadológico · Curso de Administração. Proposta elaborada por estudantes, a partir das informações compartilhadas pela empresa e de fontes públicas.</p>' +
      '</header>';
  }

  /* ================= componentes especiais ================= */
  function termoTexto(c) {
    var empresa = c.meta_empresa || '[empresa parceira]';
    var resp = c.meta_responsavel_empresa || '[responsável]';
    var grupo = c.meta_grupo || (VD.sessao() ? VD.sessao().nome : '[grupo]');
    return [
      empresa + ', representada por ' + resp + ', aceita participar como empresa parceira do Projeto Integrador da disciplina de Planejamento Mercadológico do curso de Administração, com o grupo de estudantes "' + grupo + '".',
      'Ao longo do semestre, o grupo vai elaborar um plano de marketing para a empresa — análise de mercado, segmentação e posicionamento, mix de marketing, objetivos e ações, comunicação e governança — e apresentá-lo à empresa ao final da disciplina.',
      'A empresa se dispõe a receber o grupo em pelo menos duas reuniões' + (c.e0_reunioes ? ' (' + c.e0_reunioes.replace(/\n+/g, '; ') + ')' : '') + ' e a compartilhar as informações que julgar possíveis' + (c.e0_dados ? ', como: ' + c.e0_dados.replace(/\n+/g, '; ') : '') + '.',
      'Quanto ao uso das informações fora da sala de aula: ' + (c.e0_confidencial ? c.e0_confidencial.charAt(0).toLowerCase() + c.e0_confidencial.slice(1) : 'a combinar') + '.',
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
      tela: function () { return '<div class="csv-box"><div><strong>Plano de ação em planilha</strong><p>Baixa as três ações do 5W2H no formato de planilha (Status, Início, Fim, Observações), pronto para a empresa acompanhar a execução no Excel ou no Google Planilhas.</p></div><button type="button" class="btn-sec" data-csv>Baixar plano de ação (CSV)</button></div>'; }
    }
  };
  function fraseMontada(c) {
    if (!c.b2_pos_para && !c.b2_pos_oq) return '';
    var p = function (k, def) { return c[k] ? String(c[k]).trim().replace(/[.;]$/, '') : def; };
    return 'Para ' + p('b2_pos_para', '[segmento]') + ', que ' + p('b2_pos_que', '[problema]') + ', nossa oferta é ' + p('b2_pos_oq', '[categoria]') +
      ' que ' + p('b2_pos_pq', '[diferencial]') + ', diferente de ' + p('b2_pos_contra', '[alternativa]') + ', pois ' + p('b2_pos_pois', '[evidência]') + '.';
  }
  function rankingHtml(c, soLista) {
    var l = [];
    for (var i = 1; i <= 10; i++) {
      var s = Number(c['b5_ice' + i + '_imp']) * Number(c['b5_ice' + i + '_conf']) * Number(c['b5_ice' + i + '_fac']);
      if (c['b5_ice' + i + '_acao'] && s > 0) l.push({ a: c['b5_ice' + i + '_acao'], s: s, i: i });
    }
    l.sort(function (x, y) { return y.s - x.s || x.i - y.i; });
    if (!l.length) return soLista ? '' : '<p class="ranking-vazio">Pontuem as ações para ver o ranking.</p>';
    return '<span class="ranking-rot">As três ações de maior ICE</span><ol>' + l.slice(0, 3).map(function (x) {
      return '<li><span>' + esc(x.a) + '</span><b>' + x.s + '</b></li>';
    }).join('') + '</ol>';
  }
  function baixarCsv(c) {
    var cab = ['Nº', 'O que', 'Por quê', 'Onde', 'Quando', 'Quem', 'Como', 'Quanto custará', 'KPI que move', 'Status', 'Início', 'Fim', 'Observações'];
    var linhas = [cab];
    [1, 2, 3].forEach(function (n) {
      var p = 'b5_5w2h' + n + '_';
      if (!c[p + 'what']) return;
      linhas.push([String(n), c[p + 'what'], c[p + 'why'], c[p + 'where'], c[p + 'when'], c[p + 'who'], c[p + 'how'], c[p + 'howmuch'], c[p + 'kpi'], 'A INICIAR', '', '', '']);
    });
    if (linhas.length === 1) { VD.toast('Preencham ao menos o "What" de uma ação antes de baixar.'); return; }
    var csv = '﻿' + linhas.map(function (l) {
      return l.map(function (v) { v = String(v || '').replace(/"/g, '""'); return /^[=+\-@]/.test(v) ? '"\'' + v + '"' : '"' + v + '"'; }).join(';');
    }).join('\r\n');
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
    if (tipo === 'numero') return '<input type="number"' + attrs(Object.assign(base, { min: def.min, max: def.max, step: 1, placeholder: def.min ? def.min + '–' + def.max : null })) + '>';
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
  function linkLeitura(ref) {
    var l = PM.LEITURAS[ref[0]];
    if (!l) return '';
    return '<a class="link-leitura" href="' + esc(urlLeitura(ref)) + '" target="_blank" rel="noopener">📖 Na leitura: ' + esc(l.nome) + ' ↗</a>';
  }
  function htmlItens(itens, esp) {
    return (itens || []).map(function (it) {
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
      if (it.t === 'especial') return ESPECIAIS[it.nome] && ESPECIAIS[it.nome].tela ? ESPECIAIS[it.nome].tela() : '';
      return '';
    }).join('');
  }
  var SECAO_ATUAL = null;

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
        (ehAtividade ? '' : '<button type="button" class="vd-btn vd-btn-claro" id="btnImportar" title="Para quem preencheu a Ferramenta Interativa (arquivo HTML) e exportou o JSON">Importar JSON da Ferramenta</button><input type="file" id="arqImportar" accept=".json,application/json" hidden>') +
      '</div></div></header>';

    h += '<nav class="e-nav no-print" aria-label="Seções"><div class="e-wrap"><div class="e-nav-in">' + esp.secoes.map(function (s) {
      return '<a href="#s-' + esc(s.id) + '" data-sec="' + esc(s.id) + '"><b>' + esc(s.n) + '</b><span>' + esc(s.titulo.replace(/:.*$/, '')) + '</span><i class="sec-prog"></i></a>';
    }).join('') + '</div></div></nav>';

    h += '<main class="e-wrap e-main">';
    if (leit) h += '<div class="e-leituras no-print"><span class="e-leituras-rot">Leituras desta etapa</span>' + leit + '</div>';
    esp.secoes.forEach(function (s) {
      SECAO_ATUAL = s;
      h += '<section class="e-secao" id="s-' + esc(s.id) + '" data-sec="' + esc(s.id) + '">' +
        '<div class="e-secao-cab"><span class="e-secao-n">' + esc(s.n) + '</span><div><h2>' + esc(s.titulo) + '</h2>' +
        (s.alimenta ? '<span class="e-alimenta">' + esc(s.alimenta) + '</span>' : '') + '</div></div>' +
        (s.dica ? '<p class="e-dica">' + esc(s.dica) + '</p>' : '') + (s.leitura ? linkLeitura(s.leitura) : '') +
        '<div class="e-secao-corpo">' + htmlItens(s.itens, esp) + '</div></section>';
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
      progresso(c);
    }
    function progresso(c) {
      var totalG = 0, feitosG = 0;
      esp.secoes.forEach(function (s) {
        var ks = [];
        cadaItem(s.itens, function (it) {
          if (it.k && !it.t) ks.push(it.k);
          if (it.t === 'tabela' && !it.banco) it.linhas.forEach(function (l) { l.k.forEach(function (k, j) { if (it.cols[j].tipo !== 'calc' && !l.calc) ks.push(k); }); });
          if (it.t === 'tabela' && it.banco) it.linhas.forEach(function (l) { ks.push(l.k[0]); });
          if (it.t === 'checklist') it.itens.forEach(function (x) { ks.push(x[0]); });
        });
        var f = ks.filter(function (k) { return !vazio(c[k]); }).length;
        totalG += ks.length; feitosG += f;
        var a = document.querySelector('.e-nav a[data-sec="' + s.id + '"] .sec-prog');
        if (a) { a.textContent = f ? f : ''; a.parentNode.classList.toggle('tem', f > 0); }
      });
      var pg = document.getElementById('progGeral');
      if (pg) pg.textContent = feitosG ? feitosG + ' campo' + (feitosG === 1 ? '' : 's') + ' preenchido' + (feitosG === 1 ? '' : 's') : 'Nada preenchido ainda';
    }
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
      var novos = {};
      Object.keys(it.mapa).forEach(function (dest) {
        var src = it.mapa[dest];
        var v = typeof src === 'function' ? src(origem) : origem[src];
        if (!vazio(v)) novos[dest] = String(v);
      });
      var conflitos = Object.keys(novos).filter(function (k) { var el = porChave(k); return el && el.value && el.value !== novos[k]; });
      if (!Object.keys(novos).length) { VD.toast('Não há nada para trazer: os campos de origem estão vazios.'); return; }
      if (conflitos.length && !window.confirm(conflitos.length + ' campo(s) já preenchido(s) serão substituídos. Continuar?')) return;
      Object.keys(novos).forEach(function (k) { var el = porChave(k); if (el) escrever(el, novos[k]); });
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
      el.innerHTML = capa(tituloEsp(esp).replace(/^Aula 2 · /, ''), esp.relatorioTitulo || esp.bloco, esp.id === 'e0' ? c : null) +
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
        if (e.importar) e.importar(j, novos);
        var atual = id === esp.id ? lerTela() : Object.assign({}, ((VD.dados(id) || {}).campos) || {});
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
  function plano(alvo) {
    var partes = [], indice = [];
    PM.ENTREGAS.forEach(function (id) {
      var e = PM.ESPEC[id], c = ((VD.dados(id) || {}).campos) || {};
      Object.assign(c, calcular(e, c));
      var corpo = relatorioCorpo(e, c);
      indice.push('<li class="' + (corpo ? 'tem' : '') + '"><a href="#p-' + id + '"><b>' + esc(e.codigo) + '</b> ' + esc(e.titulo) + '</a><span>' + (corpo ? esc(e.bloco) : 'ainda sem respostas') + '</span></li>');
      partes.push('<section class="r-entrega" id="p-' + id + '"><div class="r-entrega-cab"><span>' + esc(e.codigo) + '</span><div><h2>' + esc(e.titulo) + '</h2><p>' + esc(e.bloco) + '</p></div></div>' +
        (corpo || '<p class="r-vazio">Esta entrega ainda não tem respostas.</p>') + '</section>');
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
})();
