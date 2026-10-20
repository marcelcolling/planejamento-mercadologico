# Prompt: publicar uma nova leitura no portal "Planejamento Mercadológico"

Como usar: abra uma conversa nova no Claude Code **na pasta do repositório**
(`...\[2026.2] PLANEJAMENTO MERCADOLÓGICO\PLANEJAMENTO MERCADOLOGICO`), deixe o material da aula na pasta acima
(junto com os outros originais) e cole o texto abaixo, preenchendo os campos entre colchetes.

---

Quero publicar a leitura sobre **[tema]**, no portal "Planejamento Mercadológico", que já está no ar e em uso pelos grupos.

**Material:** [nome do arquivo .md e/ou .html na pasta acima do repositório]
**Etapa / entregável:** [ex.: E3 · seção 3.1 Os 7Ps do mix de marketing]
**Pedidos específicos (opcional):** [ex.: "o modelo da seção 6 deve levar para a 2.4 do entregável", ou "nenhum"]

## Antes de tudo
1. Leia o `CLAUDE.md` inteiro (decisões do professor, salvamento, armadilhas, como validar) e o `README.md`.
2. `git status` e `git log --oneline -5`: tudo limpo e sincronizado.
3. **Os grupos já estão respondendo.** Não mude chaves (`k`) existentes em `assets/js/especificacoes.js`, nem `assets/js/portal.js` ou `apps-script/Codigo.gs`, a menos que eu peça.
4. Se o material citar as empresas parceiras reais, anonimize como na leitura de segmentação (Empresas A, B, C e D) em `conteudo/preparar_conteudo.py` e confirme que os nomes estão em `conteudo/nomes_proibidos.txt`. Se citar aulas ou encontros, troque por etapas e entregas em `conteudo/neutralizar.py`: o portal não menciona numeração nem nome de aulas.
5. Me apresente um plano curto: onde a leitura entra na trilha, que pontes ligam o texto às seções do entregável e se algo do entregável deveria mudar por causa do material (campos novos com chaves novas). Pergunte só o que for decisão minha.

## O que fazer
Siga a receita "Nova leitura" do `CLAUDE.md`: fonte em `conteudo/`, entrada em `LEITURAS` (`ferramentas/gerar_leituras.py`) e em `L` (`especificacoes.js`), leitura na entrega (sai de `leiturasEmBreve`), links `leitura: [...]` nas seções, cartão na home.

## Validação antes de publicar
1. `python ferramentas/gerar_leituras.py` e `python ferramentas/conferir_integridade.py` (Git Bash: `PYTHONIOENCODING=utf-8`): integridade OK, 0 links quebrados, 0 nomes reais.
2. `.\ferramentas\testes\rodar_testes.ps1`: `FAIL/ERRO: 0`.
3. Capturas (1366px e 520px) da leitura nova, da home e do entregável.
4. Commit, push e conferência do site no ar. **Não grave dados de teste na planilha real** sem me perguntar.
5. Atualize o `CLAUDE.md` e o `README.md`.

## O que me entregar no fim
Link da leitura, o que mudou, o resultado de cada verificação e qualquer decisão que tomou por conta própria.
