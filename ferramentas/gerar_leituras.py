"""
Gera as páginas de leitura (leituras/*.html) a partir dos Markdown em conteudo/ (pasta local, fora do git).

Uso (na raiz do repositório):
    python ferramentas/gerar_leituras.py

O texto do Markdown é mantido na íntegra: o script só converte a marcação e organiza a página
(sumário lateral, citações em destaque, blocos de exemplos recolhíveis, tabelas que viram cartões no celular).
O que o portal acrescenta (sem mexer no texto): o convite para a entrega da etapa e as "pontes" que levam
dos modelos de preenchimento da leitura para a seção correspondente do entregável.

Sintaxe aceita, além do Markdown comum:
    > texto                     citação em destaque (vira caixa)
    ```  ...  ```               fórmula (bloco monoespaçado)
    ::: exemplos Título  ...  :::   bloco recolhível (lista ou parágrafos)
    # PARTE I · Título          abre uma parte
    - [ ] item  /  * \\[ ] item  lista de verificação
Escapes de editor (\\[, \\-, \\*, \\---) são desfeitos.
"""
import html
import math
import pathlib
import re
import unicodedata

RAIZ = pathlib.Path(__file__).resolve().parent.parent
CONT = RAIZ / "conteudo"

LEITURAS = [
    {"fonte": "a-logica-do-plano.md", "selo": "Leitura · Etapa 1", "curto": "A lógica do plano",
     "etapa": "Etapa 1 · E0", "entrega": ("../entregas/e0.html", "E0 · Empresa parceira e acordo"),
     "atividades": [("../atividades/auditoria.html", "Auditoria de coerência"), ("../atividades/roteiro.html", "Roteiro de entrevista")],
     "pontes": {}},
    {"fonte": "analise-de-mercado-tam-sam-som-e-tendencias.md", "selo": "Leitura · Etapa 2", "curto": "TAM, SAM, SOM e tendências",
     "etapa": "Etapa 2 · E1", "entrega": ("../entregas/e1.html", "E1 · Análise de mercado e SWOT de Marketing"),
     "pontes": {
         "1-6-modelo-para-aplicar-na-empresa-parceira": ("../entregas/e1.html#s-mercado", "E1 · 1.1 Tamanho do mercado"),
         "3-6-tendencia-fato-generico-como-escrever-a-implicacao-estrategica": ("../entregas/e1.html#s-mercado", "E1 · 1.1 Tendências de mercado"),
         "modelo-para-o-bloco-1-2": ("../entregas/e1.html#s-clientes", "E1 · 1.2 Análise de clientes atual"),
         "5-do-material-para-a-ferramenta-preenchendo-o-bloco-1-1-e-o-bloco-1-2": ("../entregas/e1.html#s-checklist", "E1 · checklist de qualidade"),
     }},
    {"fonte": "benchmarking-competitivo.md", "selo": "Leitura · Etapa 2", "curto": "Benchmarking competitivo",
     "etapa": "Etapa 2 · E1", "entrega": ("../entregas/e1.html", "E1 · Análise de mercado e SWOT de Marketing"),
     "pontes": {
         "5-2-do-benchmarking-para-a-swot-de-marketing": ("../entregas/e1.html#s-benchmarking", "E1 · 1.3 Do benchmarking para a SWOT"),
         "6-preenchendo-o-bloco-1-3-da-ferramenta": ("../entregas/e1.html#s-benchmarking", "E1 · 1.3 Benchmarking competitivo"),
         "7-exercicio-de-sintese-diferencial-fraqueza-oportunidade": ("../entregas/e1.html#s-benchmarking", "E1 · 1.3 Síntese"),
     }},
    {"fonte": "swot-de-marketing-e-tows.md", "selo": "Leitura · Etapa 2", "curto": "SWOT de Marketing e TOWS",
     "etapa": "Etapa 2 · E1", "entrega": ("../entregas/e1.html", "E1 · Análise de mercado e SWOT de Marketing"),
     "pontes": {
         "7-checklist-de-qualidade-antes-de-entregar": ("../entregas/e1.html#s-checklist", "E1 · checklist de qualidade"),
         "9-template-blocos-1-4-1-5-e-1-6-com-orientacoes-de-preenchimento": ("../entregas/e1.html#s-swot", "E1 · 1.4 a 1.6 SWOT, TOWS e síntese"),
     }},
    {"fonte": "segmentacao-e-persona.md", "selo": "Leitura · Etapa 3", "curto": "Segmentação e persona",
     "etapa": "Etapa 3 · E2", "entrega": ("../entregas/e2.html", "E2 · Segmentação, persona e posicionamento"),
     "pontes": {
         "7-preenchendo-o-bloco-2-1-da-ferramenta": ("../entregas/e2.html#s-segmentacao", "E2 · 2.1 Segmentação"),
         "16-preenchendo-o-bloco-2-2-da-ferramenta": ("../entregas/e2.html#s-personas", "E2 · 2.2 Personas"),
     }},
    {"fonte": "proposta-de-valor-e-posicionamento.md", "selo": "Leitura · Etapa 3", "curto": "Proposta de valor e posicionamento",
     "etapa": "Etapa 3 · E2", "entrega": ("../entregas/e2.html", "E2 · Segmentação, persona e posicionamento"),
     "pontes": {
         "2-6-modelo-para-o-bloco-2-3": ("../entregas/e2.html#s-vpc", "E2 · 2.3 Value Proposition Canvas"),
         "4-2-componente-por-componente-como-preencher": ("../entregas/e2.html#s-posicionamento", "E2 · 2.4 Componentes da declaração"),
         "4-8-modelo-para-o-bloco-2-4": ("../entregas/e2.html#s-posicionamento", "E2 · 2.4 Declaração de posicionamento"),
         "5-do-material-para-a-ferramenta-checklist-dos-blocos-2-3-e-2-4": ("../entregas/e2.html#s-checklist", "E2 · checklist antes de entregar"),
     }},
]


# ---------------------------------------------------------------- utilidades
def slug(texto, usados):
    s = unicodedata.normalize("NFD", texto_puro(texto))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:70].strip("-") or "secao"
    base, n = s, 2
    while s in usados:
        s = f"{base}-{n}"
        n += 1
    usados.add(s)
    return s


def desescapar(s):
    return re.sub(r"\\([\[\]\*\-_&#.()!|>+`~=])", r"\1", s)


def inline(texto):
    s = desescapar(texto).replace("&nbsp;", " ")
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", s)
    s = re.sub(r"(https?://[^\s<]+?)([.,;)]?(?:\s|$))", r'<a href="\1" target="_blank" rel="noopener">\1</a>\2', s)
    return s


def texto_puro(texto):
    return re.sub(r"\*+", "", desescapar(texto))


def celulas(linha):
    linha = linha.strip()
    if linha.startswith("|"):
        linha = linha[1:]
    if linha.endswith("|"):
        linha = linha[:-1]
    return [c.strip() for c in linha.split("|")]


# ---------------------------------------------------------------- blocos
INICIO = re.compile(r"^(#{1,6}\s|\||[-*] |\d+\.\s|>|```|:::|\\?-{3,}\s*$)")
CHK = re.compile(r"^[-*] \\?\[[ xX]\\?\]\s+")


def blocos(linhas):
    i, n = 0, len(linhas)
    while i < n:
        s = linhas[i].strip()
        if not s:
            i += 1
            continue
        if re.fullmatch(r"\\?-{3,}", s):
            yield ("hr",); i += 1; continue
        if s.startswith("```"):
            corpo = []
            i += 1
            while i < n and not linhas[i].strip().startswith("```"):
                corpo.append(linhas[i].rstrip()); i += 1
            i += 1
            yield ("code", "\n".join(corpo)); continue
        if s.startswith(":::") and len(s) > 3:
            m = re.match(r"^:::\s*(\w+)\s*(.*)$", s)
            corpo = []
            i += 1
            while i < n and linhas[i].strip() != ":::":
                corpo.append(linhas[i]); i += 1
            i += 1
            yield ("bloco", m.group(1), m.group(2), corpo); continue
        m = re.match(r"^(#{1,6})\s+(.*)$", s)
        if m:
            yield ("h", len(m.group(1)), m.group(2).strip()); i += 1; continue
        if s.startswith(">"):
            par = []
            while i < n and linhas[i].strip().startswith(">"):
                par.append(re.sub(r"^>\s?", "", linhas[i].strip())); i += 1
            yield ("quote", par); continue
        if s.startswith("|"):
            t = []
            while i < n and linhas[i].strip().startswith("|"):
                t.append(linhas[i].strip()); i += 1
            yield ("table", t); continue
        if CHK.match(s):
            itens = []
            while i < n and CHK.match(linhas[i].strip()):
                itens.append(CHK.sub("", linhas[i].strip())); i += 1
            yield ("check", itens); continue
        if re.match(r"^[-*] ", s):
            itens = []
            while i < n and re.match(r"^[-*] ", linhas[i].strip()):
                itens.append(linhas[i].strip()[2:]); i += 1
            yield ("ul", itens); continue
        if re.match(r"^\d+\.\s", s):
            itens = []
            while i < n and re.match(r"^\d+\.\s", linhas[i].strip()):
                itens.append(re.sub(r"^\d+\.\s+", "", linhas[i].strip())); i += 1
            yield ("ol", itens); continue
        par = [s]
        i += 1
        while i < n and linhas[i].strip() and not INICIO.match(linhas[i].strip()):
            par.append(linhas[i].strip()); i += 1
        yield ("p", " ".join(par))


def render_tabela(t):
    cab = celulas(t[0])
    corpo = [celulas(l) for l in t[1:] if not re.fullmatch(r"\|?[\s:\-|]+\|?", l)]
    classes = "tabela" + (" tabela-cards" if len(cab) >= 3 else "")
    out = [f'<div class="tabela-wrap"><table class="{classes}"><thead><tr>']
    out += [f"<th>{inline(c)}</th>" for c in cab]
    out.append("</tr></thead><tbody>")
    for linha in corpo:
        out.append("<tr>")
        for j, c in enumerate(linha):
            rot = html.escape(texto_puro(cab[j]) if j < len(cab) else "", quote=True)
            out.append(f'<td data-label="{rot}">{inline(c)}</td>')
        out.append("</tr>")
    out.append("</tbody></table></div>")
    return "".join(out)


def render_quote(linhas):
    pars, atual = [], []
    for l in linhas:
        if not l.strip():
            if atual:
                pars.append(" ".join(atual)); atual = []
        else:
            atual.append(l.strip())
    if atual:
        pars.append(" ".join(atual))
    ico = ""
    m = re.match(r"^([🧭💭🧵⚠️❌✅🗝️]+)\s*", pars[0]) if pars else None
    classe = "citacao"
    if m:
        ico = m.group(1)
        classe += " citacao-reflexao" if "💭" in ico else ""
    return f'<blockquote class="{classe}">' + "".join(f"<p>{inline(p)}</p>" for p in pars) + "</blockquote>"


def render_lista(tipo, itens):
    tag = "ol" if tipo == "ol" else "ul"
    classe = ' class="numerada"' if tipo == "ol" else ""
    return f"<{tag}{classe}>" + "".join(f"<li>{inline(x)}</li>" for x in itens) + f"</{tag}>"


def render_bloco(nome, titulo, linhas, chk):
    corpo = []
    for b in blocos(linhas):
        if b[0] == "p":
            corpo.append(f"<p>{inline(b[1])}</p>")
        elif b[0] in ("ul", "ol"):
            corpo.append(render_lista(b[0], b[1]))
        elif b[0] == "table":
            corpo.append(render_tabela(b[1]))
    return (f'<details class="exemplo bloco-{nome}"><summary><span class="exemplo-titulo">{inline(titulo)}</span>'
            f'<span class="exemplo-ico" aria-hidden="true">+</span></summary><div class="exemplo-corpo">{"".join(corpo)}</div></details>')


# ---------------------------------------------------------------- página
def gerar(cfg):
    fonte = CONT / cfg["fonte"]
    md = fonte.read_text(encoding="utf-8")
    palavras = len(re.findall(r"\w+", md))
    minutos = max(1, math.ceil(palavras / 220))
    linhas = md.splitlines()

    usados = set()
    titulo, rotulo_titulo, meta = "", "", []
    toc, corpo = [], []
    estado = {"parte": False, "secao": False}
    chk = [0]

    def fechar_secao():
        if estado["secao"]:
            corpo.append("</section>"); estado["secao"] = False

    def fechar_parte():
        fechar_secao()
        if estado["parte"]:
            corpo.append("</div>"); estado["parte"] = False

    def ponte(sid):
        if sid in cfg["pontes"]:
            url, nome = cfg["pontes"][sid]
            corpo.append(f'<a class="ponte" href="{url}"><span class="ponte-ico" aria-hidden="true">✎</span>'
                         f'<span><span class="ponte-rot">No portal, este modelo está no entregável</span><strong>{html.escape(nome)} →</strong></span></a>')

    antes_do_corpo = True
    for b in blocos(linhas):
        tipo = b[0]
        if tipo == "hr":
            antes_do_corpo = False
            continue
        if tipo == "h":
            nivel, txt = b[1], desescapar(b[2])
            if nivel == 1 and not titulo:
                m = re.match(r"^(.+?)\s+[—–·-]\s+(.+)$", txt)
                rotulo_titulo, titulo = (m.group(1), m.group(2)) if m else ("", txt)
                continue
            antes_do_corpo = False
            m_parte = re.match(r"^PARTE\s+([IVX]+)\s*[·:—-]\s*(.+)$", txt, re.I)
            if nivel == 1 and m_parte:
                fechar_parte()
                pid = slug("parte-" + m_parte.group(1), usados)
                nome = m_parte.group(2)
                toc.append((0, pid, f"Parte {m_parte.group(1)} · {texto_puro(nome).capitalize() if nome.isupper() else texto_puro(nome)}"))
                corpo.append(f'<div class="parte" id="{pid}"><header class="parte-cab"><span class="parte-letra">{m_parte.group(1)}</span>'
                             f'<div><span class="parte-eyebrow">{inline(b[2].split(m_parte.group(1))[0].strip())} {m_parte.group(1)}</span>'
                             f'<h2 class="parte-titulo">{inline(nome)}</h2></div></header>')
                estado["parte"] = True
                continue
            if nivel <= 2:
                fechar_secao()
                sid = slug(txt, usados)
                toc.append((1, sid, texto_puro(txt)))
                m_k = re.match(r"^(\d\d · [^—]+?)\s+—\s+(.+)$", txt)
                if m_k:  # "01 · Fundamentação — Da fotografia ao roteiro"
                    h = f'<span class="secao-kicker">{inline(m_k.group(1))}</span><h2 class="secao-titulo">{inline(m_k.group(2))}</h2>'
                else:
                    h = f'<h2 class="secao-titulo">{inline(txt)}</h2>'
                classe = "secao secao-fontes" if re.match(r"^(\d+\\?\.\s*)?Refer[êe]ncias", txt) else "secao"
                corpo.append(f'<section class="{classe}" id="{sid}">{h}')
                estado["secao"] = True
                ponte(sid)
                continue
            if nivel == 3:
                sid = slug(txt, usados)
                toc.append((2, sid, texto_puro(txt)))
                corpo.append(f'<h3 class="sub3" id="{sid}">{inline(txt)}</h3>')
                ponte(sid)
                continue
            corpo.append(f'<h4 class="sub">{inline(txt)}</h4>')
            continue
        if antes_do_corpo and not titulo == "" and tipo == "p" and not corpo:
            # linhas de metadados logo abaixo do título (etapa, tema central, alimenta...)
            meta.extend(x for x in re.split(r"\s(?=\*\*)", b[1]) if x.strip())
            continue
        if tipo == "p":
            corpo.append(f"<p>{inline(b[1])}</p>")
        elif tipo == "quote":
            corpo.append(render_quote(b[1]))
        elif tipo == "code":
            corpo.append(f'<pre class="formula">{html.escape(desescapar(b[1]))}</pre>')
        elif tipo == "table":
            corpo.append(render_tabela(b[1]))
        elif tipo in ("ul", "ol"):
            corpo.append(render_lista(tipo, b[1]))
        elif tipo == "check":
            itens = []
            for x in b[1]:
                itens.append(f'<li><label><input type="checkbox" data-chk="{chk[0]}"><span class="chk-caixa" aria-hidden="true"></span><span>{inline(x)}</span></label></li>')
                chk[0] += 1
            corpo.append('<ul class="checklist">' + "".join(itens) + "</ul>")
        elif tipo == "bloco":
            corpo.append(render_bloco(b[1], b[2], b[3], chk))
    fechar_parte()

    nav = []
    for nivel, sid, rot in toc:
        classe = "nav-item" + (" sub" if nivel == 2 else "") + (" nav-parte" if nivel == 0 else "")
        nav.append(f'<a class="{classe}" href="#{sid}">{html.escape(rot)}</a>')

    url_e, nome_e = cfg["entrega"]
    ativ = "".join(f'<a class="cta-sec" href="{u}">✎ {html.escape(n)}</a>' for u, n in cfg.get("atividades", []))
    cta = ('<aside class="cta-atividade"><div><span class="cta-eyebrow">Hora de aplicar à empresa parceira</span>'
           f'<h3>{html.escape(nome_e)}</h3><p>Os modelos desta leitura estão no entregável do portal, com salvamento automático na planilha e PDF pronto para a empresa.</p>'
           f'{("<div class=cta-secs>" + ativ + "</div>") if ativ else ""}</div>'
           f'<a class="cta-btn" href="{url_e}">Abrir o entregável →</a></aside>')
    corpo_html = "\n".join(corpo)
    m_f = re.search(r'<section class="secao secao-fontes"', corpo_html)
    corpo_html = (corpo_html[:m_f.start()] + cta + "\n" + corpo_html[m_f.start():]) if m_f else corpo_html + cta

    meta_html = "".join(f'<p class="hero-linha">{inline(x)}</p>' for x in meta)
    pagina = MODELO.format(
        titulo=html.escape(texto_puro(titulo)), titulo_h1=inline(titulo), rotulo=inline(rotulo_titulo) or html.escape(cfg["selo"]),
        meta=meta_html, selo=html.escape(cfg["selo"]), curto=html.escape(cfg["curto"]), etapa=html.escape(cfg["etapa"]),
        minutos=minutos, nav="\n  ".join(nav), corpo=corpo_html, url_e=url_e, nome_e=html.escape(nome_e),
        chave=pathlib.Path(cfg["fonte"]).stem)
    destino = RAIZ / "leituras" / (pathlib.Path(cfg["fonte"]).stem + ".html")
    destino.parent.mkdir(exist_ok=True)
    destino.write_text(pagina, encoding="utf-8", newline="\n")
    print(f"OK  leituras/{destino.name}  ({palavras} palavras, ~{minutos} min)")
    return destino


MODELO = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{titulo} — Planejamento Mercadológico</title>
<!-- Página gerada por ferramentas/gerar_leituras.py a partir do Markdown em conteudo/. Não edite à mão. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/leitura.css">
</head>
<body data-chave="{chave}">

<div id="progress-bar"></div>
<button id="sidebar-toggle" aria-label="Abrir sumário"><span></span><span></span><span></span></button>
<div id="overlay"></div>

<nav id="sidebar" aria-label="Sumário">
  <div class="sidebar-badge"><span class="dot"></span><span>{selo}</span></div>
  <div class="sidebar-title">{curto}</div>
  <a class="nav-item nav-voltar" href="../index.html#trilha">← Voltar à trilha</a>
  <a class="nav-item" href="#intro">Início</a>
  {nav}
  <a class="nav-item nav-atividade" href="{url_e}">✎ Ir para o entregável</a>
</nav>

<main class="wrapper">

  <section class="hero" id="intro">
    <div class="hero-tag"><span class="dot"></span>{rotulo}</div>
    <h1>{titulo_h1}</h1>
    <div class="hero-linhas">{meta}</div>
    <div class="hero-meta">
      <div class="meta-item"><span class="meta-label">Tempo de leitura</span><span class="meta-value">{minutos} min</span></div>
      <div class="meta-item"><span class="meta-label">Etapa</span><span class="meta-value">{etapa}</span></div>
      <div class="meta-item"><span class="meta-label">Entregável</span><span class="meta-value">{nome_e}</span></div>
    </div>
    <div class="hero-acoes">
      <a class="hero-btn" href="{url_e}">Abrir o entregável</a>
      <button type="button" class="hero-btn hero-btn-ghost" onclick="window.print()">Imprimir / salvar PDF</button>
    </div>
  </section>

{corpo}

</main>

<button id="back-to-top" title="Voltar ao topo" aria-label="Voltar ao topo">&#8593;</button>
<script src="../assets/js/leitura.js"></script>
</body>
</html>
"""


if __name__ == "__main__":
    for cfg in LEITURAS:
        gerar(cfg)
