# Portal "Planejamento Mercadológico": guia para sessões do Claude

Portal da disciplina Planejamento Mercadológico (graduação em Administração, 2026.2, terças à noite). Cada grupo (4 grupos fixos de até 5 pessoas) constrói um plano de marketing para uma empresa parceira real. A trilha é organizada pelas **entregas E0 a E6**; cada etapa tem leituras e o **entregável**, que salva na planilha Google do professor e gera um PDF para a empresa. Trabalho **em grupo**: login com o nome do grupo + palavra-chave compartilhada.

O núcleo (sessão, salvamento, planilha, testes) veio dos portais "Vieses e Decisão" (`C:\Users\LENOVO\vieses-e-decisao`) e "Entendendo Porter" (`...\Documentos\ESTRATÉGIA\PORTER - WHAT IS STRATEGY`). Os três projetos são independentes: não altere nada nos outros a partir daqui.

## Onde está cada coisa

| Item | Local |
|---|---|
| Repositório local | `C:\Users\LENOVO\OneDrive - Biopark Educação\Documentos\BIOPARK\[2026.2] PLANEJAMENTO MERCADOLÓGICO\PLANEJAMENTO MERCADOLOGICO` (git, branch `main`) |
| Originais do professor | a pasta acima do repositório (`...\[2026.2] PLANEJAMENTO MERCADOLÓGICO`): `.md` e `.html` das aulas, trilha, cronograma, Ferramenta Interativa |
| GitHub | https://github.com/marcelcolling/planejamento-mercadologico (público) |
| Site (GitHub Pages) | https://marcelcolling.github.io/planejamento-mercadologico/ (publica sozinho a cada `git push`, cerca de 1 min) |
| Planilha de respostas | "PLANEJAMENTO MERCADOLÓGICO", id `1JTyA6T_uhDcLE4yB2dv4WWbcWWJbV38nRTIMLITLF8M` (dá para ler pelo conector do Google Drive) |
| URL do Apps Script | em `assets/js/config.js` |

## Decisões do professor (não reverter sem perguntar)

- Identidade azul-escura do portal Porter (Fraunces + Inter, amarelo de destaque).
- **Empresas parceiras anonimizadas no site público** (Empresas A, B, C e D; o detalhe da "cara da marca" foi suavizado). Os nomes reais só existem em `conteudo/` (fora do git) e nos originais. `ferramentas/conferir_integridade.py` procura os nomes de `conteudo/nomes_proibidos.txt` em todo o site, README e CLAUDE.md: **nunca escreva os nomes reais em arquivo versionado** (nem em comentário, teste ou mensagem de commit).
- `conteudo/` (fontes das leituras e `preparar_conteudo.py`, que contém a tabela de anonimização) **não vai para o GitHub**.
- Leituras com **texto íntegro**. "Ajustar" os materiais significou: ligá-los às entregas (convite para o entregável e "pontes" dos modelos de preenchimento para a seção certa do entregável), sem mexer no texto. As listas "Ver 10 exemplos" (Aula 6) e os cartões MASDA (Aulas 7–8), que só existiam nos HTML, entraram na fonte.
- Os entregáveis usam **as mesmas chaves da Ferramenta Interativa** (`meta_*`, `b1_*` … `b7_*`, `sint_*`) para importar o JSON antigo; o que os materiais pedem e a ferramenta não tinha ganhou chaves novas.
- Numeração das aulas segue a trilha (Aula 4 = TAM/SAM/SOM etc., como nos materiais), não o cronograma em docx (que tem semana acadêmica e bancas no meio).

## Arquitetura (site estático, sem build de JS)

```
index.html                 home: hero + cartão do grupo (progresso E0–E6), trilha em 7 etapas, avaliação
entregas/e0..e6.html       cascas: chamam PM.iniciar('eN'); a página é montada pelo motor
atividades/roteiro.html    idem (Aula 2: roteiro de entrevista + registro das respostas)
atividades/auditoria.html  idem (Aula 2: auditoria de coerência, caso Grão Nascente)
plano.html                 "Plano completo": junta os relatórios de E0 a E6 (PM.plano)
assets/js/especificacoes.js  ESPECIFICAÇÃO de cada entrega/atividade: seções, campos, tabelas, checklists, botões "Trazer"
assets/js/entrega.js       MOTOR: monta a página, coletar/aplicar/resumo, cálculos (ICE, orçamento), "Trazer",
                           espelhos e referências entre entregas, frase de posicionamento, termo de aceite,
                           CSV do 5W2H, importação do JSON da Ferramenta, relatório (PDF) e plano completo
assets/js/portal.js        núcleo: sessão, login, salvamento, sincronização, conflito, barra, guia de uso (+ VD.gravarOutra)
assets/css/entrega.css     entregas, atividades, relatório de impressão e plano completo
leituras/*.html            GERADO por ferramentas/gerar_leituras.py a partir de conteudo/*.md (não editar à mão)
materiais/aula-1-a-trilha.html  cópia do HTML original (ferramentas/preparar_materiais.py): só cores e link de volta
conteudo/ (fora do git)    fontes das leituras + preparar_conteudo.py + nomes_proibidos.txt
apps-script/Codigo.gs      back-end na planilha (doPost entrar/salvar, abas legíveis, Painel com uma coluna por entrega)
ferramentas/               gerar_leituras, conferir_integridade, preparar_materiais, capturar_telas, testes/
```

## Como funciona o salvamento (não alterar sem necessidade)

- Igual aos outros portais: `VD.entrar` (nome + palavra-chave), `VD.ferramenta({ id, titulo, coletar, aplicar, resumo })`, `localStorage` na hora e Apps Script alguns segundos depois, conflito por timestamp, `[data-vd-salvar]` = "Salvar respostas".
- **Prefixos próprios no navegador:** `pm_sessao_v1`, `pm_dados_v1::`, `pm_leitura_` (os portais do professor dividem o domínio `marcelcolling.github.io`). Há teste para isso.
- **Ids das ferramentas (estáveis):** `e0`, `roteiro`, `auditoria`, `e1`, `e2`, `e3`, `e4`, `e5`, `e6`. Formato salvo: `{ v: 1, campos: { chave: texto | true } }`, só com os campos preenchidos. Campos calculados (`*_score`, `b5_orc*_total`, `b5_orc_tot_*`) são recalculados em `coletar`.
- **Chaves (`k`) em `especificacoes.js` não podem mudar** depois que os grupos começarem. Para acrescentar, chave nova; para tirar, apague o item (a resposta antiga continua guardada no JSON).
- `VD.gravarOutra(id, titulo, data, resumo)` (acréscimo deste portal) grava e envia uma entrega sem a página dela aberta. Usado pela importação do JSON da Ferramenta, que preenche só campos vazios. Os ganchos `importar(j, out)` da especificação mapeiam campos antigos (SWOT em texto único → linhas; Persona 2; `__checkStates` → situação dos blocos na E6).
- `resumo` gera `[seção, campo, resposta]` só com o que foi preenchido (checklist sempre, com ✓ ou —). Colunas com `rotuloDe` usam o nome digitado (ex.: o nome do concorrente).
- Todo texto do grupo que entra em `innerHTML` passa por `esc`; valores em campos vão por `.value`.

## Receitas

### Nova leitura (ex.: material de VPC e posicionamento, Aula 9)
1. Copie o `.md` original para `conteudo/` (se o HTML tiver conteúdo a mais, inclua-o em `conteudo/preparar_conteudo.py`, como nas Aulas 6 e 7–8; se citar empresas parceiras reais, anonimize lá e acrescente os nomes em `conteudo/nomes_proibidos.txt`).
2. Acrescente uma entrada em `LEITURAS` em `ferramentas/gerar_leituras.py` (selo, título curto, etapa, entregável, `pontes` de seções do texto para âncoras `#s-<id da seção>` do entregável) e em `L` no topo de `especificacoes.js`. Ponha a leitura em `leituras` da entrega (e tire o item de `leiturasEmBreve`), e use `leitura: ['aula-N', 'ancora']` nas seções do entregável.
3. `python ferramentas/gerar_leituras.py` e `python ferramentas/conferir_integridade.py` (Git Bash: `PYTHONIOENCODING=utf-8`). Integridade OK, 0 links quebrados, 0 nomes.
4. Na home, troque o cartão `rec-breve` da etapa pelo `rec-leitura`.

### Mudar um entregável
Edite a seção em `especificacoes.js` (tipos de item documentados no topo do arquivo). Componentes com lógica própria ficam em `ESPECIAIS` no `entrega.js`. Acrescente verificações no teste se criar comportamento novo.

### Mudanças no Apps Script
O professor cola o `Codigo.gs` novo no editor, salva e vai em **Implantar › Gerenciar implantações › lápis › Versão: Nova versão** (a URL se mantém). O Painel tem as colunas na ordem de `ORDEM`.

## Armadilhas já encontradas

- **Planilha em pt-BR:** não gravar fórmulas; links por `RichTextValue`; todo texto passa por `texto()`.
- **Edge headless trava no carregamento** (página parada em `loading`): é da aba fora de foco, não do site. As ferramentas usam CDP com `Page.bringToFront`/foco e recarregam; o teste espera a barra do portal aparecer em vez de tempo fixo.
- **Testar PDF:** `Page.printToPDF` respeita `Emulation.setEmulatedMedia`; zere a mídia antes (`media=''`), senão sai o layout de tela. O relatório (`#relatorio`) precisa ficar **fora** de `#app`, porque a impressão esconde `#app`. Para ver o PDF: `pymupdf` (`python -m pip install pymupdf`; já instalado).
- **Heredoc + Python no Git Bash:** `"\n"` dentro de `python - <<'EOF'` vira quebra real se o heredoc não for com aspas; prefira editar arquivos com a ferramenta de edição.
- **`.ps1` com acentos:** grave em UTF-8 **com BOM** (`publicar.ps1` já está). Sem BOM, o PowerShell 5.1 estraga os acentos (foi o que aconteceu com a descrição dos repositórios dos outros dois portais no GitHub).
- **`bytes` com acento no Python** (`b"...ó..."`) é erro de sintaxe: use `"...".encode("utf-8")` (servidor simulado).
- As leituras não carregam `portal.js` (o sumário lateral fixo colidiria com a barra); só as entregas, atividades, home e plano têm a barra.

## Como validar antes de publicar

1. `python ferramentas/gerar_leituras.py` e `python ferramentas/conferir_integridade.py` → tudo OK.
2. `.\ferramentas\testes\rodar_testes.ps1` → `FAIL/ERRO: 0` (48 verificações: prefixos, login, rascunho anônimo, salvamento, resumo, relatório, termo, roteiro, referências, "Trazer", cálculos, importação do JSON, plano completo, outro computador, conflito, home).
3. `python ferramentas/capturar_telas.py <pasta>` e olhar as capturas (1366px e 520px).
4. Se mexeu no back-end ou na URL: teste contra o Apps Script real com um grupo "Teste (apagar)" e leia a planilha pelo conector do Drive; depois peça ao professor para removê-lo (**Portal da disciplina › Remover um grupo…**).
5. `git add -A; git commit; git push` e confira o site (cache: `?x=aleatório`).

## Pendências conhecidas

- Leituras das Aulas 9 a 19 ainda não existem (cartões "em breve"); os entregáveis E2 a E6 já estão prontos.
- Peer review estruturado (10% da nota) não está no portal: hoje é feito em sala.
