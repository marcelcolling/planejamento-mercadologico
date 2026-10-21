# Planejamento Mercadológico

Portal da disciplina Planejamento Mercadológico (graduação em Administração). Os grupos constroem, ao longo do semestre, um plano de marketing completo para uma empresa parceira real. O portal organiza a trilha pelas **entregas E0 a E6**: em cada etapa há leituras e o **entregável** do grupo, que salva sozinho na sua planilha e vira um **PDF limpo para a empresa**.

- **Site:** https://marcelcolling.github.io/planejamento-mercadologico/
- **Repositório:** https://github.com/marcelcolling/planejamento-mercadologico
- **Planilha de respostas:** https://docs.google.com/spreadsheets/d/1JTyA6T_uhDcLE4yB2dv4WWbcWWJbV38nRTIMLITLF8M/edit

## O que tem no portal

| Etapa | Leituras | Entregável (o que o grupo preenche) |
|---|---|---|
| **1 · E0** Ponto de partida | A trilha do plano (apresentação); A lógica do plano | Perfil da empresa, como ela define o próprio negócio, acordo de trabalho e **termo de aceite** para assinatura. Atividades: **Auditoria de coerência** (caso Grão Nascente) e **Roteiro de entrevista**, com registro das respostas da empresa |
| **2 · E1** Diagnóstico | TAM/SAM/SOM e tendências; Benchmarking; SWOT de Marketing e TOWS | Bloco 1: mercado, tendências, clientes atuais, benchmarking de 3 concorrentes, SWOT com evidência, TOWS e síntese |
| **3 · E2** Estratégia | Segmentação e persona; **Proposta de valor e declaração de posicionamento** | Bloco 2: segmentos com avaliação MASDA, 1 ou 2 personas com JTBD, Value Proposition Canvas com prioridades e teste do encaixe, alternativas competitivas, pontos de paridade e de diferença, declaração de posicionamento (a frase se monta sozinha) |
| **4 · E3** Execução | em breve | Bloco 3: 7Ps (hoje × escolha estratégica), jornada com momentos de verdade, canais prioritários, mix de mídia |
| **5 · E4** Medição e ações | em breve | Blocos 4 e 5: objetivos SMART, KPIs com baseline, ICE Score (calcula sozinho), 5W2H, orçamento (soma sozinho) e cronograma. O 5W2H baixa em **planilha CSV** no formato do seu modelo de plano de ação |
| **6 · E5** Identidade | em breve | Bloco 6: identidade, tom de voz, arquitetura de mensagem, pilares, plano editorial de 10 peças, comunicação integrada |
| **7 · E6** Controle e entrega | em breve | Bloco 7: painel, rituais, roadmap, síntese final, checklist de coerência e preparação do pitch |

**Sem menção a aulas:** nenhuma página do portal cita número ou nome de aula ou encontro; tudo se refere a etapas (1 a 7) e entregas (E0 a E6). Assim o material serve a outros cursos. O nome da disciplina e do curso que aparece nos PDFs e no termo de aceite vem de `assets/js/config.js` (`NOME_DISCIPLINA` e `PROGRAMA`).

**Não se aplica:** cada entrega, cada seção e cada trecho numerado de uma seção (Persona 2, Objetivo 3, Ação 2...) tem o botão **Não se aplica**, com campo opcional para o motivo. O que não se aplica sai do PDF, do plano completo e da contagem de progresso; as seções e os trechos seguintes são renumerados (na tela, no PDF e na planilha). No plano completo, as entregas que não se aplicam saem e os blocos seguintes são renumerados. O que já estava escrito fica guardado: **Reativar** devolve tudo. Na planilha, o Painel mostra "não se aplica" e a aba do grupo registra o motivo.

**Questões de compreensão nas leituras:** como no portal sobre Porter, cada leitura tem de 5 a 6 caixas **Pausa para responder** ao fim das seções principais (33 no total). O grupo escreve a resposta, que é salva na planilha como as entregas, e só então pode abrir as **pistas de resposta** para comparar. O sumário lateral mostra quantas já foram respondidas.

**Revisão das leituras (out/2026):** os textos foram revisados para tirar repetições (por exemplo, as seções "Como usar este material no trabalho do grupo", que repetiam a abertura, e trechos que antecipavam ou repetiam outra seção) e corrigir o que estava errado ("cinco tipos" de benchmarking com quatro na tabela, a SWOT citando a persona antes de ela existir, os exemplos da SWOT que apareciam todos juntos numa seção só, entre outros). Os originais na pasta acima do repositório não foram alterados.

Além disso, a página **Plano completo** junta todas as entregas do grupo num documento único, pronto para salvar em PDF e enviar à empresa.

**Como os entregáveis ajudam a empresa:** cada um tem o botão **Salvar em PDF para a empresa**, que monta um relatório com capa (empresa, responsável, grupo, integrantes, data) e só o que foi preenchido, sem as orientações de aula nem o checklist interno. O E0 sai com o termo de aceite e as linhas de assinatura; o roteiro sai como roteiro impresso para levar à reunião.

**Encadeamento:** botões **↻ Trazer** reaproveitam o que o grupo já escreveu (jobs, dores e ganhos da persona no VPC; as 3 ações de maior ICE no 5W2H; os KPIs da E4 no painel da E6; os canais da E3 na comunicação integrada). As respostas do roteiro de entrevista aparecem como referência nas seções de clientes e persona.

**Ferramenta Interativa (arquivo HTML):** os campos do portal usam as mesmas chaves da ferramenta. Quem preencheu a ferramenta e exportou o JSON pode clicar em **Importar JSON da Ferramenta** em qualquer entrega: o portal distribui os campos por todas as entregas, preenchendo só o que estiver vazio.

## Empresas parceiras no site público

Por decisão sua, a leitura de segmentação e persona aparece no site com as empresas anonimizadas (Empresas A, B, C e D), e o detalhe sobre quem seria a "cara da marca" foi suavizado. Os seus arquivos originais continuam intactos na pasta acima do repositório. A versão anonimizada e o script que a produz ficam em `conteudo/`, que **não vai para o GitHub**.

## Ligar a planilha (uma vez, cerca de 10 minutos)

1. Abra a planilha de respostas (link acima).
2. Vá em **Extensões › Apps Script**. Apague o que estiver no editor e cole todo o conteúdo de [`apps-script/Codigo.gs`](apps-script/Codigo.gs). Salve (ícone de disquete).
3. No alto do editor, escolha a função **`configurar`** e clique em **Executar**. Autorize o acesso quando o Google pedir (*Avançado › Acessar o projeto*, se aparecer o aviso de app não verificado: o script é seu e só acessa esta planilha). Ela cria as abas `Painel`, `_alunos` e `_dados` e um gatilho que atualiza as abas a cada 5 minutos.
4. Clique em **Implantar › Nova implantação**. Em "Selecionar tipo" (engrenagem), escolha **App da Web** e configure:
   - **Executar como:** Eu
   - **Quem pode acessar:** Qualquer pessoa
5. Clique em **Implantar** e copie a **URL do app da Web** (termina em `/exec`).
6. Envie essa URL ao Claude. Ele a coloca em `assets/js/config.js`, publica e faz um teste com um grupo "Teste (apagar)".

Enquanto a URL não estiver configurada, o portal funciona em "modo local": as respostas ficam só no navegador do grupo.

> **Se alterar o código do Apps Script depois:** cole o `Codigo.gs` novo, salve e use **Implantar › Gerenciar implantações › (lápis) › Versão: Nova versão**. Assim a URL continua a mesma.
>
> **Atualização de 20/10/2026 (coluna das leituras no Painel):** cole o `Codigo.gs` novo e salve. Como só mudou a montagem do Painel e das abas (feita pelo gatilho de 5 minutos), isso já basta; criar a nova versão é recomendado, mas não muda nada para os grupos. Sem colar, as respostas das leituras são salvas do mesmo jeito e aparecem na aba do grupo; só o Painel fica sem a coluna nova.

## Acompanhar a turma

| Aba | Conteúdo |
|---|---|
| **Painel** | Uma linha por grupo, com uma coluna por entrega (E0 a E6) e pelas duas atividades da etapa inicial: quando salvou e quantas respostas há (ou "não se aplica"). A coluna **Leituras · questões de compreensão** mostra quantas leituras o grupo já respondeu e quantas respostas há. O nome do grupo é um link para a aba dele. |
| **Uma aba por grupo** | Todas as respostas em formato legível: seção, campo, resposta. As questões de cada leitura aparecem antes da entrega da etapa. |
| `_alunos`, `_dados` (ocultas) | Base usada pelo portal. Não edite, exceto para redefinir palavra-chave (abaixo). |

- O menu **Portal da disciplina** (aparece ao abrir a planilha) tem **Atualizar abas e painel agora** e **Remover um grupo…** (para cadastros de teste ou duplicados).
- **Grupo esqueceu a palavra-chave:** na aba oculta `_alunos`, apague a célula `hash_chave` do grupo. A próxima palavra-chave usada passa a valer.
- Todos os membros usam o **mesmo nome de grupo e a mesma palavra-chave**. Se duas pessoas editarem a mesma entrega ao mesmo tempo, o portal avisa e pergunta qual versão manter.

## Publicar as próximas leituras

Quando tiver os próximos materiais (7Ps, jornada, canais, SMART e KPIs, ICE e 5W2H, orçamento, identidade, conteúdo, governança), abra o Claude Code nesta pasta e use o prompt [`prompts/nova-leitura.md`](prompts/nova-leitura.md). O entregável de cada etapa já está pronto; a leitura só troca o cartão "em breve" da trilha pelo link e ganha as pontes para as seções do entregável.

## Privacidade

A palavra-chave é guardada na planilha apenas como *hash*, mas não é uma senha forte: oriente os grupos a não usar senhas pessoais. As respostas dos grupos (inclusive os dados das empresas) ficam só na sua planilha; o site publicado não contém nenhuma resposta.
