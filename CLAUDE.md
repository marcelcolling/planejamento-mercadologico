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
- Leituras com **texto íntegro**, exceto as trocas de `neutralizar.py` (menções a aulas viram etapas ou entregas; os parágrafos sobre logística de aula viraram "Como usar este material no trabalho do grupo"). "Ajustar" os materiais também significou ligá-los às entregas (convite para o entregável e "pontes" dos modelos de preenchimento para a seção certa do entregável), sem mexer no texto. As listas "Ver 10 exemplos" (Aula 6) e os cartões MASDA (Aulas 7–8), que só existiam nos HTML, entraram na fonte.
- Os entregáveis usam **as mesmas chaves da Ferramenta Interativa** (`meta_*`, `b1_*` … `b7_*`, `sint_*`) para importar o JSON antigo; o que os materiais pedem e a ferramenta não tinha ganhou chaves novas.
- **Nenhuma menção a numeração ou nome de aulas/encontros** em nada que o estudante vê (o material precisa servir a outros cursos). Etapas 1 a 7 (Ponto de partida, Diagnóstico, Estratégia, Execução, Medição e ações, Identidade, Controle e entrega) e entregas E0 a E6. Nas leituras, `conteudo/neutralizar.py` troca cada menção por etapa ou entrega (e para se sobrar alguma); `ferramentas/conferir_integridade.py` confere o site inteiro (verificação 4). Nomes de arquivo também não usam "aula-N". Nome da disciplina e do curso nos PDFs vêm de `config.js`.
- **"Não se aplica"** em três níveis (entrega, seção, sub-bloco): some do PDF, do plano completo e do progresso, e a numeração seguinte se ajusta. Ver a seção "Não se aplica" abaixo.

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
materiais/a-trilha-do-plano.html  cópia do HTML original (ferramentas/preparar_materiais.py): cores, link de volta e trocas de "aula"
conteudo/ (fora do git)    fontes das leituras + preparar_conteudo.py + neutralizar.py + nomes_proibidos.txt
                           (a-logica-do-plano.fonte.md e proposta-de-valor-e-posicionamento.md são escritas à mão)
apps-script/Codigo.gs      back-end na planilha (doPost entrar/salvar, abas legíveis, Painel com uma coluna por entrega)
ferramentas/               gerar_leituras, conferir_integridade, preparar_materiais, capturar_telas, testes/
```

## Como funciona o salvamento (não alterar sem necessidade)

- Igual aos outros portais: `VD.entrar` (nome + palavra-chave), `VD.ferramenta({ id, titulo, coletar, aplicar, resumo })`, `localStorage` na hora e Apps Script alguns segundos depois, conflito por timestamp, `[data-vd-salvar]` = "Salvar respostas".
- **Prefixos próprios no navegador:** `pm_sessao_v1`, `pm_dados_v1::`, `pm_leitura_` (os portais do professor dividem o domínio `marcelcolling.github.io`). Há teste para isso.
- **Ids das ferramentas (estáveis):** `e0`, `roteiro`, `auditoria`, `e1`, `e2`, `e3`, `e4`, `e5`, `e6`. Chaves das leituras em `PM.LEITURAS`: `trilha`, `logica`, `mercado`, `benchmarking`, `swot`, `segmentacao`, `vpc`. Formato salvo: `{ v: 1, campos: { chave: texto | true } }`, só com os campos preenchidos. Campos calculados (`*_score`, `b5_orc*_total`, `b5_orc_tot_*`) são recalculados em `coletar`.
- **Chaves (`k`) em `especificacoes.js` não podem mudar** depois que os grupos começarem. Para acrescentar, chave nova; para tirar, apague o item (a resposta antiga continua guardada no JSON).
- `VD.gravarOutra(id, titulo, data, resumo)` (acréscimo deste portal) grava e envia uma entrega sem a página dela aberta. Usado pela importação do JSON da Ferramenta, que preenche só campos vazios. Os ganchos `importar(j, out)` da especificação mapeiam campos antigos (SWOT em texto único → linhas; Persona 2; `__checkStates` → situação dos blocos na E6).
- `resumo` gera `[seção, campo, resposta]` só com o que foi preenchido (checklist sempre, com ✓ ou —). Colunas com `rotuloDe` usam o nome digitado (ex.: o nome do concorrente).
- Todo texto do grupo que entra em `innerHTML` passa por `esc`; valores em campos vão por `.value`.

## "Não se aplica"

- Chaves guardadas junto com as respostas: `na__entrega` (+ `_motivo`), `na__s_<id da seção>` (+ `_motivo`), `na__b_<id da seção>__<slug do subtítulo>` (+ `_motivo`). O slug ignora o trecho entre parênteses do subtítulo: **não renomeie subtítulos em uso**.
- Não têm o botão: atividades e as seções `checklist`, `coerencia` e `pitch`.
- Um subtítulo (`t:'sub'`) no nível da seção abre um sub-bloco; um item com `solto: true` fecha o sub-bloco (CSV do 5W2H e pergunta sobre o número de personas).
- Numeração: `numeracao(esp, campos, mapaBloco)` em `entrega.js`. Seções "N.M" são renumeradas dentro do bloco; subtítulos "Nome N (opcional)" são renumerados entre os de mesmo nome (o regex exige "Nome N" no fim, para não mexer em "Tendências (de 2 a 4)"); no relatório, tabelas com linhas só numéricas seguem as linhas preenchidas. No plano completo, entregas que não se aplicam saem, as partes são numeradas 1..n e os blocos seguintes recebem número novo (`mapaBloco`).
- Resumo da planilha: entrega → uma linha `['Entrega', 'Não se aplica', motivo]` (o Painel mostra "não se aplica"); seção → `[seção, 'Seção não se aplica', motivo]`; sub-bloco → `[seção, subtítulo, 'Não se aplica: motivo']`.

## Receitas

### Nova leitura (ex.: material dos 7Ps)
1. Copie o `.md` original para `conteudo/` (se o HTML tiver conteúdo a mais, inclua-o em `conteudo/preparar_conteudo.py`, como em SWOT e segmentação; se citar empresas parceiras reais, anonimize lá e acrescente os nomes em `conteudo/nomes_proibidos.txt`). Se o texto citar aulas ou encontros, acrescente as trocas em `conteudo/neutralizar.py`. Nome de arquivo pelo tema, sem "aula-N".
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
2. `.\ferramentas\testes\rodar_testes.ps1` → `FAIL/ERRO: 0` (59 verificações: prefixos, login, rascunho anônimo, salvamento, resumo, relatório, termo, roteiro, referências, "Trazer", cálculos, importação do JSON, "não se aplica" em seção, sub-bloco e entrega com renumeração na tela, no PDF, na planilha e no plano completo, outro computador, conflito, home sem menção a aulas).
3. `python ferramentas/capturar_telas.py <pasta>` e olhar as capturas (1366px e 520px).
4. Se mexeu no back-end ou na URL: teste contra o Apps Script real com um grupo "Teste (apagar)" e leia a planilha pelo conector do Drive; depois peça ao professor para removê-lo (**Portal da disciplina › Remover um grupo…**).
5. `git add -A; git commit; git push` e confira o site (cache: `?x=aleatório`).

## Pendências conhecidas

- Leituras das etapas 4 a 7 ainda não existem (cartões "em breve"); os entregáveis E3 a E6 já estão prontos.
- `proposta-de-valor-e-posicionamento.md` foi escrito pelo Claude (out/2026), com referências conferidas na web. Os campos da E2 foram ampliados para segui-lo: `b2_vpc_top`, `b2_vpc_teste`, `b2_pos_alternativas`, `b2_pos_paridade`, `b2_pos_diferenca`, `e2_chk9`, `e2_chk10`.
- Peer review estruturado (10% da nota) não está no portal: hoje é feito em sala.
