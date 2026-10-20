"""
Confere, depois de gerar as leituras:
  1. integridade: o texto visível de cada leitura (leituras/*.html) contém, palavra por palavra, o Markdown de origem
     (conteudo/*.md). Descontam-se só o que o portal acrescenta (convite para o entregável, pontes, rótulos do topo)
     e os números das listas numeradas, que viram estilo visual;
  2. links: todo link interno do site (páginas, âncoras #id) aponta para algo que existe, inclusive as referências
     das entregas para as leituras (assets/js/especificacoes.js);
  3. anonimização: nenhum nome real das empresas parceiras aparece no site publicado
     (a lista de nomes fica em conteudo/, fora do git: conteudo/nomes_proibidos.txt, um por linha);
  4. sem aulas: o texto visível do site não menciona numeração ou nome de aulas/encontros
     (decisão do professor: o material precisa servir a outros cursos).

Uso (na raiz):  python ferramentas/conferir_integridade.py      (no Git Bash: PYTHONIOENCODING=utf-8)
Sai com código 1 se algo falhar.
"""
import difflib
import html
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "ferramentas"))
from gerar_leituras import LEITURAS, desescapar  # noqa: E402

falhas = 0


def tokens(t):
    return re.findall(r"\w+", t.lower())


def texto_visivel(pagina):
    s = pagina[pagina.index('<main class="wrapper">'):pagina.index("</main>")]
    for classe in ("cta-atividade", "ponte", "hero-meta", "hero-acoes"):
        s = re.sub(r'<(aside|a|div) class="' + classe + r'[^"]*".*?</\1>', " ", s, flags=re.S)
    s = re.sub(r'<span class="exemplo-ico".*?</span>', " ", s)
    s = re.sub(r'<span class="parte-eyebrow">.*?</span>', " ", s)
    s = re.sub(r'<span class="parte-letra">.*?</span>', " ", s)
    s = re.sub(r"<[^>]+>", " ", s)
    return html.unescape(s)


def md_texto(md):
    t = desescapar(md).replace("&nbsp;", " ")
    t = re.sub(r"^\s*\d+\.\s", " ", t, flags=re.M)          # números de lista numerada viram estilo
    t = re.sub(r"^#\s+PARTE\s+[IVX]+\s*[·:—-]", " ", t, flags=re.M)  # "PARTE I ·" vira o cabeçalho da parte
    t = re.sub(r"^:::.*$", " ", t, flags=re.M)               # marcadores de bloco (o título do bloco é conferido abaixo)
    t = re.sub(r"[-*] \[[ xX]\]", " ", t)
    return t


print("== 1. Integridade das leituras")
for cfg in LEITURAS:
    md = (RAIZ / "conteudo" / cfg["fonte"]).read_text(encoding="utf-8")
    pag = (RAIZ / "leituras" / (pathlib.Path(cfg["fonte"]).stem + ".html")).read_text(encoding="utf-8")
    titulos_bloco = " ".join(re.findall(r"^:::\s*\w+\s+(.+)$", md, flags=re.M))
    a = tokens(md_texto(md) + " " + titulos_bloco)
    b = tokens(texto_visivel(pag))
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    faltam = [" ".join(a[i1:i2]) for op, i1, i2, j1, j2 in sm.get_opcodes() if op in ("delete", "replace")]
    sobram = [" ".join(b[j1:j2]) for op, i1, i2, j1, j2 in sm.get_opcodes() if op in ("insert", "replace")]
    # a ordem pode mudar (metadados do topo); o que importa é que nenhuma palavra do .md se perca
    from collections import Counter
    perdidas = Counter(a) - Counter(b)
    ok = not perdidas
    falhas += 0 if ok else 1
    print(f"{'OK ' if ok else 'FALHA'} {cfg['fonte']}: {len(a)} palavras no .md, {len(b)} na página, semelhança {sm.ratio():.4f}"
          + ("" if ok else f" — palavras perdidas: {dict(perdidas)}"))
    extra = [x for x in sobram if x]
    if extra:
        print("     a página acrescenta:", "; ".join(extra)[:300])

print("== 2. Links internos e âncoras")
paginas = sorted(p for p in RAIZ.rglob("*.html") if not any(x in p.parts for x in ("conteudo", ".git", "testes")))
ids = {}
for p in paginas:
    ids[p.resolve()] = set(re.findall(r'\sid="([^"]+)"', p.read_text(encoding="utf-8")))
# as páginas das entregas são montadas por JavaScript: ids das seções = "s-" + id da seção na especificação
esp = (RAIZ / "assets/js/especificacoes.js").read_text(encoding="utf-8")
blocos_esp = re.split(r"\n  var (E\d|ROTEIRO|AUDITORIA) = \{", esp)
mapa_esp = {"E0": "entregas/e0.html", "E1": "entregas/e1.html", "E2": "entregas/e2.html", "E3": "entregas/e3.html", "E4": "entregas/e4.html",
            "E5": "entregas/e5.html", "E6": "entregas/e6.html", "ROTEIRO": "atividades/roteiro.html", "AUDITORIA": "atividades/auditoria.html"}
for nome, corpo in zip(blocos_esp[1::2], blocos_esp[2::2]):
    alvo = (RAIZ / mapa_esp[nome]).resolve()
    ids.setdefault(alvo, set()).update("s-" + x for x in re.findall(r"\{ id: '([\w-]+)', n:", corpo))
ids[(RAIZ / "atividades/roteiro.html").resolve()].update("s-b" + x for x in ["0", "1", "2", "3", "4", "6", "7"])
erros = []
for p in paginas:
    for href in re.findall(r'href="([^"#:]*)(#[^"]*)?"', p.read_text(encoding="utf-8")):
        url, anc = href
        if url.startswith(("http", "mailto")) or (not url and not anc) or "'" in url + anc or "+" in url + anc:
            continue  # externos e links montados em JavaScript
        alvo = (p.parent / url).resolve() if url else p.resolve()
        if alvo.is_dir():
            alvo = alvo / "index.html"
        if not alvo.exists():
            erros.append(f"{p.relative_to(RAIZ)} → {url} (página não existe)")
        elif anc and anc[1:] and anc[1:] not in ids.get(alvo, set()) and anc not in ("#ajuda",):
            erros.append(f"{p.relative_to(RAIZ)} → {url}{anc} (âncora não existe)")
leit = dict(re.findall(r"'([\w-]+)': \{ url: '([^']+)'", esp))
for ref, anc in re.findall(r"leitura: \['([\w-]+)', '([\w-]+)'\]", esp):
    alvo = (RAIZ / leit[ref]).resolve()
    if anc not in ids.get(alvo, set()):
        erros.append(f"especificacoes.js → {leit[ref]}#{anc} (âncora não existe)")
for e in erros:
    print("FALHA", e)
falhas += len(erros)
print(("OK  " if not erros else "") + f"{len(paginas)} páginas conferidas, {len(erros)} link(s) quebrado(s)")

print("== 3. Anonimização")
proib = RAIZ / "conteudo" / "nomes_proibidos.txt"
if not proib.exists():
    print("AVISO: conteudo/nomes_proibidos.txt não existe; conferência pulada")
else:
    nomes = [n.strip().lower() for n in proib.read_text(encoding="utf-8").splitlines() if n.strip()]
    achados = []
    for p in list(paginas) + sorted((RAIZ / "assets").rglob("*.js")) + [RAIZ / "README.md", RAIZ / "CLAUDE.md"]:
        if not p.exists():
            continue
        t = p.read_text(encoding="utf-8").lower()
        achados += [f"{p.relative_to(RAIZ)}: {n}" for n in nomes if n in t]
    for a in achados:
        print("FALHA", a)
    falhas += len(achados)
    print(("OK  " if not achados else "") + f"{len(nomes)} nomes procurados, {len(achados)} ocorrência(s)")

print("== 4. Menções a aulas e encontros")
SEM_AULA = re.compile(r"\b(Aulas?|Encontros?)\s+\d|\bUnidade\s+\d|\b(desta|nesta|da|na|próxima|fechar a) aula\b|\bdeste encontro\b|\baula de hoje\b|\bsala de aula\b", re.I)
EXCECOES = ["Segmentação Aula 1"]  # título de uma obra citada nas referências
mencoes = []
for p in list(paginas) + [RAIZ / "assets/js/especificacoes.js", RAIZ / "assets/js/entrega.js", RAIZ / "assets/js/portal.js"]:
    t = p.read_text(encoding="utf-8")
    if p.suffix == ".html":
        t = html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", t, flags=re.S)))
    for e in EXCECOES:
        t = t.replace(e, "")
    for m in SEM_AULA.finditer(t):
        trecho = t[max(0, m.start() - 40):m.end() + 20].replace("\n", " ")
        if p.suffix == ".js" and ("fora da sala de aula'" in trecho or "valor antigo" in trecho):
            continue  # valor antigo guardado nas respostas; o texto exibido é outro
        mencoes.append(f"{p.relative_to(RAIZ)}: ...{trecho}...")
for x in mencoes:
    print("FALHA", x)
falhas += len(mencoes)
print(("OK  " if not mencoes else "") + f"{len(mencoes)} menção(ões) encontrada(s)")

sys.exit(1 if falhas else 0)
