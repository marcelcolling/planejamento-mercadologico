"""
Copia para materiais/ os HTML originais que entram no portal sem conversão (scripts intactos).
Acrescenta as cores do portal (azul no lugar do roxo) e um link de volta à trilha, e troca as menções
a aulas por etapas e entregas (decisão do professor: o material precisa servir a outros cursos).

Uso (na raiz):  python ferramentas/preparar_materiais.py "<pasta dos originais>"
(a pasta dos originais é a que fica acima do repositório: ...\\[2026.2] PLANEJAMENTO MERCADOLÓGICO)
"""
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ORIG = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ.parent

MATERIAIS = [
    ("Trilha-Apresentacao-Aula1.html", "a-trilha-do-plano.html"),
]

CORES = """<style>
  /* acrescentado pelo portal: identidade azul-escura no lugar do roxo original */
  :root{ --roxo:#1F3A5F; --roxo-suave:#2E4E78; --texto:#1E2733; --texto-suave:#5E6878; }
  .pm-voltar{ font-weight:600; }
</style>
</head>"""

SEM_AULAS = [
    ("Aula 1 · Abertura de semestre", "Abertura · O caminho do plano"),
    ("Vinte aulas, sete blocos e uma empresa real esperando pelo resultado.", "Sete blocos, sete entregas e uma empresa real esperando pelo resultado."),
    ("vamos usar essas ideias no fim da aula.", "vamos usar essas ideias no fim da apresentação."),
    ("Nosso exemplo para hoje", "Nosso exemplo"),
    ("usada só para percorrermos a trilha juntos hoje.", "usada só para percorrermos a trilha juntos."),
    ("20 aulas · 7 blocos · 1 plano completo", "7 blocos · 7 entregas · 1 plano completo"),
    ('<span class="trail-aulas">Aulas 1–2</span>', '<span class="trail-aulas">Ponto de partida</span>'),
    ('<span class="trail-aulas">Aula 3</span>', '<span class="trail-aulas">Visão do todo</span>'),
    ('<span class="trail-aulas">Aulas 4–6</span>', '<span class="trail-aulas">Diagnóstico</span>'),
    ('<span class="trail-aulas">Aulas 7–9</span>', '<span class="trail-aulas">Estratégia</span>'),
    ('<span class="trail-aulas">Aulas 10–13</span>', '<span class="trail-aulas">Execução</span>'),
    ('<span class="trail-aulas">Aulas 14–16</span>', '<span class="trail-aulas">Medição e ações</span>'),
    ('<span class="trail-aulas">Aulas 17–18</span>', '<span class="trail-aulas">Identidade</span>'),
    ('<span class="trail-aulas">Aulas 19–20</span>', '<span class="trail-aulas">Controle e entrega</span>'),
    ("Para fechar a Aula 1", "Para fechar a abertura"),
    ("até a Aula 20", "até o pitch final"),
    ("Próxima aula: formalizar o acordo com a empresa parceira", "Próximo passo: formalizar o acordo com a empresa parceira"),
    ("Planejamento Mercadológico — Curso de Administração", "Planejamento Mercadológico"),
    ("trazem gente para experimentar uma aula?", "trazem gente para experimentar um treino?"),
]

for origem, destino in MATERIAIS:
    s = (ORIG / origem).read_text(encoding="utf-8")
    assert s.count("</head>") == 1
    s = s.replace("</head>", CORES, 1)
    for velho, novo in SEM_AULAS:
        assert velho in s, velho
        s = s.replace(velho, novo)
    s = re.sub(r'(<ul class="nav-links">)', r'\1\n      <li><a class="pm-voltar" href="../index.html#trilha">← Voltar ao portal</a></li>', s, count=1)
    s = s.replace("<title>", "<!-- Cópia do material original do professor, preparada por ferramentas/preparar_materiais.py. Não edite à mão. -->\n<title>", 1)
    (RAIZ / "materiais").mkdir(exist_ok=True)
    (RAIZ / "materiais" / destino).write_text(s, encoding="utf-8", newline="\n")
    print("OK", "materiais/" + destino)
