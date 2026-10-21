/* Comportamentos das páginas de leitura: progresso, sumário, exemplos, lista de verificação
   e questões de compreensão ("Pausa para responder", salvas na planilha como as entregas). */
(function () {
  'use strict';
  var chave = 'pm_leitura_' + (document.body.dataset.chave || location.pathname);
  // barra do portal (sessão e salvamento): o sumário lateral desce para não ficar embaixo dela
  if (window.VD) document.body.classList.add('com-topbar');
  var ls = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---- progresso, sumário ativo e voltar ao topo ---- */
  var barra = document.getElementById('progress-bar');
  var topo = document.getElementById('back-to-top');
  var links = Array.prototype.slice.call(document.querySelectorAll('#sidebar a[href^="#"]'));
  var alvos = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var agendado = false;
  function aoRolar() {
    agendado = false;
    var total = document.documentElement.scrollHeight - window.innerHeight;
    barra.style.width = (total > 0 ? (window.scrollY / total) * 100 : 0) + '%';
    topo.style.display = window.scrollY > 600 ? 'flex' : 'none';
    var atual = -1;
    for (var i = 0; i < alvos.length; i++) {
      if (alvos[i] && alvos[i].getBoundingClientRect().top <= 140) atual = i;
    }
    links.forEach(function (a, i) { a.classList.toggle('active', i === atual); });
  }
  window.addEventListener('scroll', function () { if (!agendado) { agendado = true; requestAnimationFrame(aoRolar); } }, { passive: true });
  aoRolar();
  topo.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---- sumário no celular ---- */
  var toggle = document.getElementById('sidebar-toggle');
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('overlay');
  function fechar() { sidebar.classList.remove('open'); toggle.classList.remove('active'); overlay.style.display = 'none'; }
  toggle.addEventListener('click', function () {
    var aberto = sidebar.classList.toggle('open');
    toggle.classList.toggle('active', aberto);
    overlay.style.display = aberto ? 'block' : 'none';
  });
  overlay.addEventListener('click', fechar);
  sidebar.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', fechar); });

  /* ---- exemplos recolhíveis ---- */
  var exemplos = Array.prototype.slice.call(document.querySelectorAll('details.exemplo'));
  if (exemplos.length) {
    var barraEx = document.createElement('div');
    barraEx.className = 'exemplos-acoes';
    barraEx.innerHTML = '<button type="button">Abrir todos os exemplos</button>';
    exemplos[0].parentNode.insertBefore(barraEx, exemplos[0]);
    var btn = barraEx.querySelector('button');
    function rotulo() { btn.textContent = exemplos.every(function (d) { return d.open; }) ? 'Fechar todos os exemplos' : 'Abrir todos os exemplos'; }
    btn.addEventListener('click', function () {
      var abrir = !exemplos.every(function (d) { return d.open; });
      exemplos.forEach(function (d) { d.open = abrir; });
      rotulo();
    });
    exemplos.forEach(function (d) { d.addEventListener('toggle', rotulo); });
  }
  function abrirAlvo() {
    if (!location.hash) return;
    var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el && el.tagName === 'DETAILS') el.open = true;
  }
  window.addEventListener('hashchange', abrirAlvo);
  abrirAlvo();
  links.forEach(function (a) {
    a.addEventListener('click', function () {
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el && el.tagName === 'DETAILS') el.open = true;
    });
  });
  var abertosAntesDeImprimir = [];
  window.addEventListener('beforeprint', function () {
    abertosAntesDeImprimir = exemplos.map(function (d) { return d.open; });
    exemplos.forEach(function (d) { d.open = true; });
  });
  window.addEventListener('afterprint', function () {
    exemplos.forEach(function (d, i) { d.open = abertosAntesDeImprimir[i]; });
  });

  /* ---- lista de verificação (fica salva neste navegador) ---- */
  var caixas = Array.prototype.slice.call(document.querySelectorAll('ul.checklist input[type=checkbox]'));
  if (caixas.length) {
    var salvo = ls.get(chave + '_checklist', {});
    var lista = caixas[0].closest('ul.checklist');
    var prog = document.createElement('p');
    prog.className = 'checklist-progresso';
    lista.parentNode.insertBefore(prog, lista.nextSibling);
    function atualizar() {
      var n = caixas.filter(function (c) { return c.checked; }).length;
      prog.textContent = n === caixas.length
        ? '✓ Tudo marcado.'
        : n + ' de ' + caixas.length + ' itens marcados (fica salvo neste navegador).';
    }
    caixas.forEach(function (c) {
      c.checked = !!salvo[c.dataset.chk];
      c.addEventListener('change', function () {
        salvo[c.dataset.chk] = c.checked;
        ls.set(chave + '_checklist', salvo);
        atualizar();
      });
    });
    atualizar();
  }

  /* ---- questões de compreensão ---- */
  var pausas = Array.prototype.slice.call(document.querySelectorAll('.pausa'));
  var MINIMO = 20;  // caracteres escritos antes de liberar as pistas
  function campoDe(p) { return p.querySelector('textarea[data-campo]'); }
  function respondida(p) { return campoDe(p).value.trim().length >= MINIMO; }
  function contar() {
    var n = pausas.filter(function (p) { return campoDe(p).value.trim(); }).length;
    document.querySelectorAll('[data-pausas-cont]').forEach(function (el) { el.textContent = n + ' de ' + pausas.length; });
    pausas.forEach(function (p) { p.classList.toggle('pausa-ok', respondida(p)); });
  }
  pausas.forEach(function (p) {
    var det = p.querySelector('.pausa-pistas'), aviso = p.querySelector('.pausa-aviso');
    if (det) det.querySelector('summary').addEventListener('click', function (e) {
      if (det.open || respondida(p)) { aviso.hidden = true; return; }
      e.preventDefault();
      aviso.hidden = false;
      campoDe(p).focus();
    });
    campoDe(p).addEventListener('input', function () { if (respondida(p)) aviso.hidden = true; contar(); });
  });
  // na impressão, as pistas só aparecem se já estavam abertas (a resposta do grupo sai sempre)

  if (window.VD) {
    var titulo = 'Leitura · ' + (document.body.dataset.curto || document.title);
    if (pausas.length) {
      VD.ferramenta({
        id: document.body.dataset.ferramenta, titulo: titulo, crumb: titulo, pedirLogin: false,
        coletar: function () {
          var c = {};
          pausas.forEach(function (p) { var t = campoDe(p); if (t.value.trim()) c[t.dataset.campo] = t.value; });
          return { v: 1, campos: c };
        },
        aplicar: function (d) {
          var c = (d && d.campos) || {};
          pausas.forEach(function (p) { var t = campoDe(p); t.value = c[t.dataset.campo] || ''; });
          contar();
        },
        resumo: function (d) {
          var c = (d && d.campos) || {};
          return pausas.map(function (p) {
            var t = campoDe(p);
            return ['Questões de compreensão', p.querySelector('.pausa-num').textContent + ' · ' + t.dataset.rotulo, (c[t.dataset.campo] || '').trim() || '—'];
          });
        }
      });
    } else {
      VD.iniciarPagina({ crumb: titulo });
    }
  }
  contar();
})();
