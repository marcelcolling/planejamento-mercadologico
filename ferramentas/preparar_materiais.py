"""
Copia para materiais/ os HTML originais que entram no portal sem conversão (texto e scripts intactos).
Só acrescenta: as cores do portal (azul no lugar do roxo) e um link de volta à trilha.

Uso (na raiz):  python ferramentas/preparar_materiais.py "<pasta dos originais>"
(a pasta dos originais é a que fica acima do repositório: ...\\[2026.2] PLANEJAMENTO MERCADOLÓGICO)
"""
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ORIG = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ.parent

MATERIAIS = [
    ("Trilha-Apresentacao-Aula1.html", "aula-1-a-trilha.html"),
]

CORES = """<style>
  /* acrescentado pelo portal: identidade azul-escura no lugar do roxo original */
  :root{ --roxo:#1F3A5F; --roxo-suave:#2E4E78; --texto:#1E2733; --texto-suave:#5E6878; }
  .pm-voltar{ font-weight:600; }
</style>
</head>"""

for origem, destino in MATERIAIS:
    s = (ORIG / origem).read_text(encoding="utf-8")
    assert s.count("</head>") == 1
    s = s.replace("</head>", CORES, 1)
    s = re.sub(r'(<ul class="nav-links">)', r'\1\n      <li><a class="pm-voltar" href="../index.html#trilha">← Voltar ao portal</a></li>', s, count=1)
    s = s.replace("<title>", "<!-- Cópia do material original do professor, preparada por ferramentas/preparar_materiais.py. Não edite à mão. -->\n<title>", 1)
    (RAIZ / "materiais").mkdir(exist_ok=True)
    (RAIZ / "materiais" / destino).write_text(s, encoding="utf-8", newline="\n")
    print("OK", "materiais/" + destino)
