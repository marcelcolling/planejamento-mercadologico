# Planejamento Mercadológico

Portal da disciplina Planejamento Mercadológico (graduação em Administração). Os grupos constroem, ao longo do semestre, um plano de marketing completo para uma empresa parceira real. O portal organiza a trilha pelas **entregas E0 a E6**: em cada etapa há leituras e o **entregável** do grupo, que salva sozinho na sua planilha e vira um **PDF limpo para a empresa**.

- **Site:** https://marcelcolling.github.io/planejamento-mercadologico/
- **Repositório:** https://github.com/marcelcolling/planejamento-mercadologico
- **Planilha de respostas:** https://docs.google.com/spreadsheets/d/1JTyA6T_uhDcLE4yB2dv4WWbcWWJbV38nRTIMLITLF8M/edit

## O que tem no portal

| Etapa | Leituras | Entregável (o que o grupo preenche) |
|---|---|---|
| **E0** · Aulas 1 a 3 | A trilha (apresentação da Aula 1); A lógica do plano (Aula 2) | Perfil da empresa, como ela define o próprio negócio, acordo de trabalho e **termo de aceite** para assinatura. Atividades da Aula 2: **Auditoria de coerência** (caso Grão Nascente) e **Roteiro de entrevista**, com registro das respostas da empresa |
| **E1** · Aulas 4 a 6 | TAM/SAM/SOM e tendências; Benchmarking; SWOT de Marketing e TOWS | Bloco 1: mercado, tendências, clientes atuais, benchmarking de 3 concorrentes, SWOT com evidência, TOWS e síntese |
| **E2** · Aulas 7 a 9 | Segmentação e persona (VPC: em breve) | Bloco 2: segmentos com avaliação MASDA, 1 ou 2 personas com JTBD, Value Proposition Canvas e declaração de posicionamento (a frase se monta sozinha) |
| **E3** · Aulas 10 a 13 | em breve | Bloco 3: 7Ps (hoje × escolha estratégica), jornada com momentos de verdade, canais prioritários, mix de mídia |
| **E4** · Aulas 14 a 16 | em breve | Blocos 4 e 5: objetivos SMART, KPIs com baseline, ICE Score (calcula sozinho), 5W2H, orçamento (soma sozinho) e cronograma. O 5W2H baixa em **planilha CSV** no formato do seu modelo de plano de ação |
| **E5** · Aulas 17 e 18 | em breve | Bloco 6: identidade, tom de voz, arquitetura de mensagem, pilares, plano editorial de 10 peças, comunicação integrada |
| **E6** · Aulas 19 e 20 | em breve | Bloco 7: painel, rituais, roadmap, síntese final, checklist de coerência e preparação do pitch |

Além disso, a página **Plano completo** junta todas as entregas do grupo num documento único, pronto para salvar em PDF e enviar à empresa.

**Como os entregáveis ajudam a empresa:** cada um tem o botão **Salvar em PDF para a empresa**, que monta um relatório com capa (empresa, responsável, grupo, integrantes, data) e só o que foi preenchido, sem as orientações de aula nem o checklist interno. O E0 sai com o termo de aceite e as linhas de assinatura; o roteiro sai como roteiro impresso para levar à reunião.

**Encadeamento:** botões **↻ Trazer** reaproveitam o que o grupo já escreveu (jobs, dores e ganhos da persona no VPC; as 3 ações de maior ICE no 5W2H; os KPIs da E4 no painel da E6; os canais da E3 na comunicação integrada). As respostas do roteiro de entrevista aparecem como referência nas seções de clientes e persona.

**Ferramenta Interativa (arquivo HTML):** os campos do portal usam as mesmas chaves da ferramenta. Quem preencheu a ferramenta e exportou o JSON pode clicar em **Importar JSON da Ferramenta** em qualquer entrega: o portal distribui os campos por todas as entregas, preenchendo só o que estiver vazio.

## Empresas parceiras no site público

Por decisão sua, a leitura das Aulas 7 e 8 aparece no site com as empresas anonimizadas (Empresas A, B, C e D), e o detalhe sobre quem seria a "cara da marca" foi suavizado. Os seus arquivos originais continuam intactos na pasta acima do repositório. A versão anonimizada e o script que a produz ficam em `conteudo/`, que **não vai para o GitHub**.

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

> **Se alterar o código do Apps Script depois:** use **Implantar › Gerenciar implantações › (lápis) › Versão: Nova versão**. Assim a URL continua a mesma.

## Acompanhar a turma

| Aba | Conteúdo |
|---|---|
| **Painel** | Uma linha por grupo, com uma coluna por entrega (E0 a E6) e pelas duas atividades da Aula 2: quando salvou e quantas respostas há. O nome do grupo é um link para a aba dele. |
| **Uma aba por grupo** | Todas as respostas em formato legível: seção, campo, resposta. |
| `_alunos`, `_dados` (ocultas) | Base usada pelo portal. Não edite, exceto para redefinir palavra-chave (abaixo). |

- O menu **Portal da disciplina** (aparece ao abrir a planilha) tem **Atualizar abas e painel agora** e **Remover um grupo…** (para cadastros de teste ou duplicados).
- **Grupo esqueceu a palavra-chave:** na aba oculta `_alunos`, apague a célula `hash_chave` do grupo. A próxima palavra-chave usada passa a valer.
- Todos os membros usam o **mesmo nome de grupo e a mesma palavra-chave**. Se duas pessoas editarem a mesma entrega ao mesmo tempo, o portal avisa e pergunta qual versão manter.

## Publicar as próximas leituras

Quando tiver o material das próximas aulas (VPC e posicionamento, 7Ps, jornada, canais, SMART e KPIs, ICE e 5W2H, orçamento, identidade, conteúdo, governança), abra o Claude Code nesta pasta e use o prompt [`prompts/nova-leitura.md`](prompts/nova-leitura.md). O entregável de cada etapa já está pronto; a leitura só troca o cartão "em breve" da trilha pelo link e ganha as pontes para as seções do entregável.

## Privacidade

A palavra-chave é guardada na planilha apenas como *hash*, mas não é uma senha forte: oriente os grupos a não usar senhas pessoais. As respostas dos grupos (inclusive os dados das empresas) ficam só na sua planilha; o site publicado não contém nenhuma resposta.
