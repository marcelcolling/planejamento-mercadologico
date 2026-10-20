/*
 * Especificação das entregas (E0 a E6) e das atividades da Aula 2.
 * O motor (entrega.js) monta o formulário, o salvamento, o resumo da planilha e o relatório em PDF a partir daqui.
 *
 * AS CHAVES (k) NÃO PODEM MUDAR depois que os grupos começarem: as respostas salvas dependem delas.
 * As chaves que começam com meta_, b1_ ... b7_ e sint_ são as mesmas da Ferramenta Interativa de Plano de
 * Marketing (arquivo HTML usado antes do portal), para que o JSON exportado por ela possa ser importado.
 * Para acrescentar um campo, use uma chave nova. Para tirar, apague o item (a resposta antiga fica guardada).
 *
 * Itens de uma seção:
 *   campo   { k, r: rótulo, tipo: 'texto' (padrão) | 'linha' | 'numero' | 'data' | 'opcoes' | 'check', ph, d: dica, op: [...] }
 *   grupo   { t:'grupo', cols: 2|3, itens: [campos ou {t:'sub', r}] }
 *   tabela  { t:'tabela', r: título, cols: [{ r, tipo, op, ph, w, relatorio:false }], linhas: [{ r, d, k: [chaves], rotuloDe }] }
 *   sub     { t:'sub', r: subtítulo }
 *   nota    { t:'nota', html } (orientação; não vai para o relatório)
 *   html    { t:'html', html } (conteúdo fixo, ex.: o caso da Auditoria; não vai para o relatório)
 *   espelho { t:'espelho', de: entrega, k, r } (mostra, sem editar, uma resposta de outra entrega)
 *   trazer  { t:'trazer', r: texto do botão, de: entrega, mapa: { destino: origem | [origens] | função(campos) } }
 *   referencia { t:'referencia', de:'roteiro', blocos: [...], r } (respostas registradas na entrevista)
 *   checklist  { t:'checklist', itens: [[k, texto]] } (autoavaliação; não vai para o relatório)
 *   especial   { t:'especial', nome } (componentes com lógica própria em entrega.js)
 */
(function () {
  'use strict';

  /* ---------------- leituras (caminhos a partir da raiz do portal) ---------------- */
  var L = {
    'aula-1': { url: 'materiais/aula-1-a-trilha.html', nome: 'A trilha do semestre (apresentação da Aula 1)' },
    'aula-2': { url: 'leituras/aula-2-a-logica-do-plano.html', nome: 'A lógica do plano: de onde parte, onde chega, o que conecta' },
    'aula-4': { url: 'leituras/aula-4-tam-sam-som-e-tendencias.html', nome: 'Análise de mercado: TAM, SAM, SOM e tendências' },
    'aula-5': { url: 'leituras/aula-5-benchmarking-competitivo.html', nome: 'Benchmarking competitivo' },
    'aula-6': { url: 'leituras/aula-6-swot-de-marketing-e-tows.html', nome: 'SWOT de Marketing e TOWS' },
    'aula-7-8': { url: 'leituras/aulas-7-8-segmentacao-e-persona.html', nome: 'Segmentação, persona e comportamento do consumidor' }
  };

  /* ---------------- auxiliares ---------------- */
  function seq(n) { var a = []; for (var i = 1; i <= n; i++) a.push(i); return a; }
  var SIM_NAO = ['Sim', 'Não'];
  var COERENCIA = ['Sim', 'Em parte', 'Não'];
  var CAT_INTERNAS = ['Reconhecimento de marca', 'Base de clientes', 'Canais de distribuição', 'Qualidade percebida do produto', 'Capacidade de comunicação', 'Precificação'];
  var CAT_EXTERNAS = ['Comportamento do consumidor', 'Tendências de canal', 'Concorrência', 'Sazonalidade', 'Regulação do setor'];
  var ETAPAS_DECISAO = ['Consciência', 'Consideração', 'Decisão', 'Retenção', 'Indicação'];
  var FONTES_PERSONA = ['Entrevista com cliente real', 'Entrevista com potencial comprador', 'Dado interno da empresa', 'Observação de redes sociais', 'Dado secundário de mercado', 'Hipótese a validar'];
  var STATUS_CRON = [['planejada', '📋 Planejada'], ['em_execucao', '🔄 Em execução'], ['concluida', '✅ Concluída']];
  var STATUS_BLOCO = [['empty', '⬜ Pendente'], ['progress', '🔄 Em andamento'], ['complete', '✅ Concluído']];

  /* =====================================================================
   * E0 · Empresa parceira e acordo
   * ===================================================================== */
  var E0 = {
    id: 'e0', codigo: 'E0', titulo: 'Empresa parceira e acordo',
    etapa: 'Etapa 0 · Aulas 1 e 2', bloco: 'Perfil da empresa e termo de aceite',
    pergunta: 'Com quem vamos trabalhar e o que combinamos?',
    resumo: 'Registra quem é a empresa parceira, como ela se enxerga e o que foi combinado com ela. Gera o termo de aceite para assinatura.',
    leituras: ['aula-1', 'aula-2'],
    secoes: [
      { id: 'id', n: '0.1', titulo: 'Identificação do plano',
        dica: 'Estas informações aparecem na capa de todos os PDFs do plano.',
        itens: [
          { t: 'grupo', cols: 2, itens: [
            { k: 'meta_grupo', r: 'Grupo', tipo: 'linha', ph: 'Ex.: Grupo 3' },
            { k: 'meta_data', r: 'Data', tipo: 'data' },
            { k: 'meta_empresa', r: 'Empresa parceira', tipo: 'linha', ph: 'Nome da empresa parceira' },
            { k: 'meta_setor', r: 'Setor / segmento', tipo: 'linha', ph: 'Ex.: varejo alimentício, serviços, agronegócio...' },
            { k: 'meta_responsavel_empresa', r: 'Responsável na empresa (nome e cargo)', tipo: 'linha', ph: 'Ex.: Maria Silva, sócia-diretora' },
            { k: 'e0_contato', r: 'Contato do responsável', tipo: 'linha', ph: 'E-mail ou telefone' }
          ] },
          { k: 'meta_integrantes', r: 'Integrantes do grupo', ph: 'Nome completo de cada integrante, um por linha.' }
        ] },
      { id: 'perfil', n: '0.2', titulo: 'Perfil da empresa',
        dica: 'O retrato inicial, nas palavras da própria empresa. O diagnóstico aprofundado vem no Bloco 1.',
        leitura: ['aula-2', '05-o-terreno-real-por-que-isso-muda-quando-existe-uma-empresa-esperand'],
        itens: [
          { k: 'e0_historia', r: 'Como a empresa surgiu e que problema queria resolver' },
          { k: 'e0_oferta', r: 'Produtos e serviços principais' },
          { k: 'e0_porte', r: 'Porte e estrutura', ph: 'Tempo de mercado, número de pessoas, unidades, faturamento aproximado (se a empresa quiser informar).' },
          { k: 'e0_clientes', r: 'Quem são os clientes hoje', ph: 'Pessoa física ou empresa, perfil aproximado, região.' },
          { k: 'e0_canais', r: 'Onde vende e como se comunica hoje', ph: 'Loja física, site, redes sociais, marketplace, indicação...' },
          { k: 'e0_concorrentes', r: 'Quem a empresa considera concorrente' },
          { k: 'e0_marketing_hoje', r: 'Quem cuida do marketing hoje', ph: 'Quem é, quanto tempo por semana dedica, quanto se investe por mês (aproximado).' }
        ] },
      { id: 'negocio', n: '0.3', titulo: 'Como a empresa define o próprio negócio',
        dica: 'O primeiro teste de coerência do semestre (miopia em marketing, de Levitt): a empresa se descreve pelo que produz ou pelo problema que resolve?',
        leitura: ['aula-2', '01-fundamentacao-da-fotografia-ao-roteiro'],
        itens: [
          { t: 'grupo', cols: 2, itens: [
            { k: 'e0_def_produto', r: 'Definição por produto', ph: 'Ex.: "Alugamos carros."' },
            { k: 'e0_def_mercado', r: 'Definição por mercado', ph: 'Ex.: "Resolvemos a mobilidade de quem está sem carro próprio."' }
          ] },
          { k: 'e0_def_leitura', r: 'Como a empresa se descreveu na conversa?', tipo: 'opcoes', op: ['Pela definição de produto', 'Pela definição de mercado', 'Misturando as duas'] }
        ] },
      { id: 'expectativa', n: '0.4', titulo: 'O que a empresa espera do plano',
        itens: [
          { k: 'e0_desafio', r: 'Principal desafio de mercado, na visão da empresa' },
          { k: 'e0_expectativa', r: 'O que a empresa espera receber ao final' },
          { k: 'e0_restricoes', r: 'Limites a respeitar', ph: 'Orçamento disponível, tamanho da equipe, temas sensíveis, decisões que não estão em jogo.' }
        ] },
      { id: 'acordo', n: '0.5', titulo: 'Acordo de trabalho',
        dica: 'O plano é uma proposta acadêmica, não uma consultoria paga. Não prometam prazo de resultado nem uso comercial imediato.',
        itens: [
          { k: 'e0_reunioes', r: 'Reuniões previstas com a empresa (ao menos duas presenciais)', ph: 'Datas ou períodos combinados.' },
          { k: 'e0_canal', r: 'Como o grupo vai manter contato', ph: 'E-mail, WhatsApp, reunião curta no meio do semestre...' },
          { k: 'e0_dados', r: 'Dados e documentos que a empresa vai compartilhar', ph: 'Faturamento, número de clientes, ticket médio, materiais de marca...' },
          { t: 'grupo', cols: 2, itens: [
            { k: 'e0_confidencial', r: 'Uso das informações fora da sala de aula', tipo: 'opcoes', op: ['Pode citar o nome da empresa e os dados', 'Pode citar o nome, sem números internos', 'Manter a empresa anônima fora da sala de aula'] },
            { k: 'e0_pitch', r: 'Quem da empresa vai assistir ao pitch final', tipo: 'linha' }
          ] },
          { k: 'e0_conflito', r: 'Algum integrante tem vínculo com a empresa?', ph: 'Se sim, descreva. O professor avalia se há conflito de interesse.' },
          { k: 'e0_combinados', r: 'Outros combinados' }
        ] },
      { id: 'termo', n: '0.6', titulo: 'Termo de aceite',
        dica: 'O texto abaixo é montado com as informações desta entrega e sai no PDF com espaço para as assinaturas. Imprima, colha a assinatura do responsável e guarde uma cópia.',
        itens: [ { t: 'especial', nome: 'termo' } ] },
      { id: 'checklist', n: '✓', titulo: 'Antes de entregar',
        itens: [ { t: 'checklist', itens: [
          ['e0_chk1', 'A empresa tem clientes reais e um responsável disponível para pelo menos duas reuniões presenciais.'],
          ['e0_chk2', 'O responsável quer o plano, não apenas tolera a presença do grupo.'],
          ['e0_chk3', 'Ficou claro para a empresa que o plano é uma proposta acadêmica, sem prazo de resultado nem consultoria paga.'],
          ['e0_chk4', 'O grupo declarou qualquer vínculo de integrante com a empresa.'],
          ['e0_chk5', 'O termo de aceite foi impresso e assinado pelo responsável.']
        ] } ] }
    ]
  };

  /* =====================================================================
   * Atividade da Aula 2 · Roteiro de entrevista
   * ===================================================================== */
  var BANCO = [
    { b: 0, titulo: 'Bloco 0 · Perfil e contexto do negócio', alimenta: 'Aquecimento · E0',
      porque: 'Aprofunda o que a Entrega E0 registrou e testa se a empresa se descreve pela definição de produto ou de mercado.',
      q: [['E', 'Como surgiu a empresa? Que problema vocês queriam resolver quando começaram?'],
          ['E', 'Se tivessem que descrever, numa frase, o que a empresa faz — vocês diriam pelo que produzem ou pelo problema que resolvem para o cliente?'],
          ['C', 'O que mudou no negócio desde a fundação até hoje — algo que vocês fariam diferente se começassem de novo?']] },
    { b: 1, titulo: 'Bloco 1 · Diagnóstico de mercado', alimenta: 'Entrega E1',
      porque: 'É o bloco mais urgente: sem ele, nada do que vier depois tem chão.',
      q: [['E', 'Como está o movimento do negócio nos últimos 12 meses — crescendo, estável, encolhendo? A que vocês atribuem isso?'],
          ['E', 'Quem vocês apontariam como concorrente mais direto? E o mais parecido em porte com vocês?'],
          ['E', 'O que esse concorrente faz melhor que vocês? Onde vocês acham que ganham dele?'],
          ['C', 'Existe alguma tendência do setor, recente, que preocupa ou anima vocês?'],
          ['E', 'Vocês têm faturamento, número de clientes ativos ou ticket médio dos últimos 12 meses que possam compartilhar, mesmo que aproximado?'],
          ['C', 'Existe algum relatório de associação ou sindicato do setor que vocês acompanham ou já receberam?']] },
    { b: 2, titulo: 'Bloco 2 · Público, persona e posicionamento', alimenta: 'Entrega E2',
      porque: 'As respostas de hoje evitam que o grupo construa uma persona de fantasia por falta de matéria-prima real.',
      q: [['E', 'Quem compra hoje, na prática? (perfil, idade aproximada, se é pessoa física ou empresa)'],
          ['E', 'Existe um tipo de cliente que vocês gostariam de ter mais? O que ele tem de diferente do cliente médio de hoje?'],
          ['E', 'Por que vocês acham que esse cliente escolhe a empresa de vocês, e não o concorrente mais próximo?'],
          ['C', 'Como vocês descreveriam, em uma frase, como gostariam de ser vistos pelo mercado?'],
          ['C', 'Algum cliente já elogiou algo específico da empresa de um jeito que surpreendeu vocês? E alguma reclamação recorrente?']] },
    { b: 3, titulo: 'Bloco 3 · Mix e jornada do cliente', alimenta: 'Entrega E3',
      porque: 'Registra a versão da empresa sobre o próprio processo, para comparar depois com o que a persona realmente faz.',
      q: [['E', 'Como o cliente normalmente descobre a empresa pela primeira vez?'],
          ['E', 'Quais canais vocês usam hoje para vender e para se comunicar? (loja física, site, redes sociais, marketplace, indicação)'],
          ['C', 'Como é definido o preço hoje? Existe alguma lógica clara ou é mais intuição e comparação com o concorrente?'],
          ['C', 'O que acontece depois que alguém compra pela primeira vez — existe algum contato de pós-venda?'],
          ['C', 'Existe algo no atendimento que vocês consideram o diferencial da empresa, algo que o cliente comenta espontaneamente?']] },
    { b: 4, titulo: 'Blocos 4 e 5 · Objetivos, KPIs e ações', alimenta: 'Entrega E4',
      porque: 'Sem saber o que a empresa já tentou e o orçamento real que ela movimenta, o grupo corre o risco de sugerir ações inviáveis.',
      q: [['E', 'Se pudessem escolher uma única coisa para melhorar no negócio nos próximos 12 meses, qual seria?'],
          ['C', 'Existe alguma meta de vendas, crescimento ou número de clientes que vocês já perseguem hoje, formal ou informalmente?'],
          ['E', 'Quanto, aproximadamente, é investido em marketing por mês hoje — somando mídia paga, materiais, eventos, o que for?'],
          ['E', 'Alguma ação de marketing que vocês já tentaram e não funcionou? O que vocês acham que deu errado?'],
          ['C', 'Existe algum evento, sazonalidade ou data importante para o negócio que devemos ter em mente ao longo do semestre?']] },
    { b: 6, titulo: 'Bloco 6 · Comunicação e marca', alimenta: 'Entrega E5',
      porque: 'Saber o que já existe evita retrabalho e mostra respeito pelo que a empresa já construiu.',
      q: [['C', 'Quem produz o conteúdo das redes sociais hoje? É alguém da empresa, é terceirizado, ou não existe uma rotina definida?'],
          ['C', 'Como vocês descreveriam o "jeito de falar" da marca, para alguém que nunca ouviu falar dela?'],
          ['E', 'Existe algum material de marca já pronto — logotipo, manual de identidade, paleta de cores — que possam compartilhar com o grupo?'],
          ['C', 'Existe algum concorrente ou marca de outro setor cuja comunicação vocês admiram, mesmo que por um motivo específico?']] },
    { b: 7, titulo: 'Bloco 7 · Governança', alimenta: 'Entrega E6',
      porque: 'Um plano só sobrevive depois da disciplina se alguém, de fato, tomar posse dele.',
      q: [['E', 'Hoje, quem dentro da empresa cuida de marketing, mesmo que não seja a função principal dessa pessoa?'],
          ['C', 'Quanto tempo por semana essa pessoa consegue dedicar a marketing, de forma realista?'],
          ['C', 'Depois que a disciplina terminar, existe intenção de continuar aplicando o que for entregue? Alguém já está pensando em quem tocaria isso?']] }
  ];
  var FECHAMENTO = [
    'Existe mais alguém na empresa que valeria a pena conversarmos ao longo do projeto?',
    'Tem algum documento, planilha ou relatório que vocês poderiam compartilhar depois desta conversa?',
    'Podemos voltar com dúvidas pontuais por WhatsApp ou e-mail ao longo do semestre?',
    'Como vocês preferem acompanhar o andamento do projeto — por e-mail, uma reunião curta no meio do semestre, mensagem?'
  ];
  var FORA = [
    'Presença e atividade nas redes sociais — frequência de postagem, engajamento aparente, tom da comunicação',
    'Avaliações públicas em Google Meu Negócio, marketplaces ou aplicativos de entrega',
    'Preços praticados hoje, quando disponíveis publicamente (site, prateleira, cardápio)',
    'Site ou catálogo digital, se existir — o que ele comunica sobre a empresa sem que ninguém precise explicar'
  ];
  var COLS_PERGUNTA = [
    { r: 'Usar na conversa', tipo: 'check', w: '9%', relatorio: false },
    { r: 'Quem pergunta', tipo: 'linha', w: '17%', ph: 'Nome' },
    { r: 'Resposta da empresa', ph: 'Registro da resposta (preencha depois da conversa).' }
  ];
  var secoesBanco = BANCO.map(function (bl) {
    return { id: 'b' + bl.b, n: bl.b === 4 ? '4–5' : String(bl.b), titulo: bl.titulo, alimenta: bl.alimenta, dica: bl.porque,
      itens: [ { t: 'tabela', banco: true, cols: COLS_PERGUNTA,
        linhas: bl.q.map(function (q, i) {
          var p = 'rt_b' + bl.b + '_' + (i + 1);
          return { r: q[1], tag: q[0] === 'E' ? 'Essencial' : 'Complementar', k: [p + '_usar', p + '_quem', p + '_resp'] };
        }) } ] };
  });
  var ROTEIRO = {
    id: 'roteiro', codigo: 'Aula 2', tipo: 'atividade', titulo: 'Roteiro de entrevista com a empresa parceira',
    etapa: 'Etapa 0 · Aula 2', bloco: 'Preparação de campo · alimenta os Blocos 1 a 7',
    pergunta: 'O que só a empresa sabe e precisa ser perguntado agora?',
    resumo: 'Escolham de 15 a 18 perguntas do banco, distribuam quem pergunta e, depois da conversa, registrem as respostas aqui. Elas aparecem como referência nas entregas seguintes. O PDF sai como roteiro impresso para levar à reunião.',
    leituras: ['aula-2'],
    relatorioTitulo: 'Roteiro e registro da entrevista',
    secoes: [
      { id: 'por-que', n: '·', titulo: 'Por que um roteiro tão completo',
        itens: [ { t: 'nota', html: '<p>A trilha garante apenas duas reuniões presenciais com a empresa parceira ao longo do semestre. Por isso a primeira conversa precisa ser a mais densa em informação de todo o projeto, cobrindo, de forma proporcional, cada uma das entregas.</p><p><strong>O que só a empresa sabe</strong> (percepções, histórico, números internos, opiniões da direção) precisa ser perguntado agora, enquanto há acesso. <strong>O que pode ser observado por fora</strong> (redes sociais, site, avaliações públicas, preços de prateleira) fica para o grupo levantar sozinho depois.</p><p>Do banco abaixo, escolham <strong>de 15 a 18 perguntas</strong>, priorizando os Blocos 0, 1 e 2 e garantindo pelo menos duas ou três perguntas dos blocos restantes. <strong>Essencial</strong> é o que não pode ficar sem resposta hoje; <strong>complementar</strong> enriquece, mas pode esperar um contato por e-mail ou WhatsApp.</p>' } ] },
      { id: 'antes', n: '·', titulo: 'Antes de entrar: papéis e combinados',
        itens: [
          { t: 'grupo', cols: 3, itens: [
            { k: 'rt_conduz', r: 'Quem conduz as perguntas', tipo: 'linha' },
            { k: 'rt_registra', r: 'Quem registra as respostas', tipo: 'linha' },
            { k: 'rt_tempo', r: 'Quem observa o tempo', tipo: 'linha' }
          ] },
          { t: 'grupo', cols: 2, itens: [
            { k: 'rt_abertura', r: 'Como vamos abrir a conversa', ph: 'Quem o grupo é, o que é o projeto (acadêmico, não uma consultoria paga) e quanto tempo a conversa deve durar.' },
            { k: 'rt_nao_prometer', r: 'O que não vamos prometer', ph: 'Prazo de entrega específico, resultado financeiro garantido, uso comercial imediato do plano...' }
          ] },
          { k: 'rt_gravacao', r: 'Gravação de áudio', tipo: 'opcoes', op: ['Vamos gravar, com permissão pedida no início', 'Não vamos gravar'] }
        ] }
    ].concat(secoesBanco).concat([
      { id: 'livres', n: '+', titulo: 'Perguntas próprias do grupo',
        dica: 'Podem entrar perguntas do grupo, desde que se encaixem em algum bloco do fluxo do plano.',
        itens: [ { t: 'tabela', cols: [
          { r: 'Pergunta', w: '30%' }, { r: 'Bloco', tipo: 'opcoes', op: ['Bloco 0', 'Bloco 1', 'Bloco 2', 'Bloco 3', 'Blocos 4–5', 'Bloco 6', 'Bloco 7'], w: '12%' },
          { r: 'Quem pergunta', tipo: 'linha', w: '14%' }, { r: 'Resposta da empresa' }],
          linhas: seq(3).map(function (i) { return { r: 'Pergunta ' + i, k: ['rt_livre' + i + '_perg', 'rt_livre' + i + '_bloco', 'rt_livre' + i + '_quem', 'rt_livre' + i + '_resp'] }; }) } ] },
      { id: 'fechamento', n: '·', titulo: 'Fechando a conversa: os últimos cinco minutos',
        dica: 'Estas quatro perguntas garantem que o grupo saia com um caminho aberto para o resto do semestre.',
        itens: [ { t: 'tabela', cols: [{ r: 'Resposta da empresa' }],
          linhas: FECHAMENTO.map(function (q, i) { return { r: q, k: ['rt_fech' + (i + 1)] }; }) } ] },
      { id: 'fora', n: '·', titulo: 'Fora da reunião: o que buscar por conta própria',
        dica: 'Parte da informação é pública e pode ser levantada antes ou depois do encontro, sem gastar tempo de conversa.',
        itens: [ { t: 'tabela', cols: [{ r: 'O que o grupo encontrou (com link ou fonte)' }],
          linhas: FORA.map(function (q, i) { return { r: q, k: ['rt_fora' + (i + 1)] }; }) } ] },
      { id: 'registro', n: '·', titulo: 'Registro da conversa',
        dica: 'Passem as respostas a limpo de preferência nas primeiras 24 horas.',
        itens: [
          { t: 'grupo', cols: 3, itens: [
            { k: 'rt_data', r: 'Data da conversa', tipo: 'data' },
            { k: 'rt_participantes', r: 'Quem participou pela empresa', tipo: 'linha' },
            { k: 'rt_duracao', r: 'Duração', tipo: 'linha', ph: 'Ex.: 55 min' }
          ] },
          { k: 'rt_impressoes', r: 'Impressões gerais e surpresas' },
          { k: 'rt_pendencias', r: 'O que ficou para perguntar depois' }
        ] },
      { id: 'checklist', n: '✓', titulo: 'Checklist final do roteiro',
        itens: [ { t: 'especial', nome: 'contador' }, { t: 'checklist', itens: [
          ['rt_chk1', 'O roteiro tem entre 15 e 18 perguntas selecionadas, distribuídas pelos blocos, com pelo menos uma de cada.'],
          ['rt_chk2', 'Está combinado quem pergunta, quem registra e quem observa o tempo.'],
          ['rt_chk3', 'As quatro perguntas de fechamento estão incluídas no fim do roteiro.'],
          ['rt_chk4', 'Nenhuma promessa de prazo, resultado ou entrega específica será feita durante a conversa.'],
          ['rt_chk5', 'Ficou combinado como o grupo vai passar as respostas a limpo logo depois — de preferência, nas primeiras 24 horas.']
        ] } ] }
    ])
  };

  /* =====================================================================
   * Atividade da Aula 2 · Auditoria de coerência (caso Grão Nascente)
   * ===================================================================== */
  var CASO = '<div class="caso">' +
    '<div class="caso-ficha"><span class="caso-rot">Ficha da empresa</span><p>Grão Nascente é uma torrefação de café artesanal fundada há quatro anos em Belo Horizonte (MG). Vende por três canais: prateleiras de supermercados de bairro, um perfil no Instagram e um quiosque aos sábados em uma feira de produtores.</p></div>' +
    '<div class="caso-grade">' +
    '<div class="caso-card"><span class="caso-rot">Bloco 1 — Diagnóstico (resumo)</span><p>O mercado brasileiro de café especial cresce em ritmo mais acelerado que o mercado de café tradicional, puxado por consumidores urbanos dispostos a pagar mais por origem, torra artesanal e informação de procedência. O setor é disputado por dois perfis de concorrente: as grandes torrefadoras industriais, que competem por preço e disponibilidade em qualquer supermercado do país, e um número crescente de pequenos torrefadores locais, que competem por experiência, narrativa de origem e proximidade com o consumidor final.</p></div>' +
    '<div class="caso-card"><span class="caso-rot">Bloco 2 — Persona (Renata)</span><p>34 anos, gerente de projetos em empresa de tecnologia, Belo Horizonte. Ganha bem, trabalha em home office três dias por semana. Valoriza produtos com história por trás e prefere pagar mais por algo cuja origem conhece. Descobre marcas novas por indicação de amigos e por perfis de café que já segue no Instagram. Compra café em cafeterias de bairro e lojas especializadas; raramente faz compra de mercearia em supermercado, prefere aplicativo de entrega para isso.</p></div>' +
    '<div class="caso-card"><span class="caso-rot">Bloco 2 — Posicionamento declarado</span><p>"Para consumidores urbanos exigentes que querem redescobrir o café como experiência sensorial, o Grão Nascente é o torrefador artesanal que rastreia cada lote até a fazenda de origem — ao contrário dos grandes torrefadores industriais, que padronizam o sabor em nome da escala."</p></div>' +
    '<div class="caso-card"><span class="caso-rot">Bloco 3 — Mix (resumo dos 4Ps)</span><p><strong>Produto:</strong> cada pacote traz o nome da fazenda, a altitude de cultivo e a nota de degustação do lote; torra em pequenos lotes, toda semana.</p><p><strong>Preço:</strong> o preço de tabela é 40% mais alto que o café industrial de prateleira — mas a marca roda promoções de "compre 2 pague 1" quase todo mês, para girar o estoque antes que os grãos percam frescor.</p><p><strong>Praça:</strong> distribuição concentrada em supermercados de bairro de classe média-baixa, ao lado das marcas industriais mais baratas da categoria; presença online limitada a um link de pedido pelo WhatsApp da própria torrefação.</p><p><strong>Promoção:</strong> o Instagram da marca publica majoritariamente peças com preço em destaque e frases como "café bom e barato pra sua semana" — poucas menções à fazenda de origem ou à história de cada lote.</p></div>' +
    '<div class="caso-card"><span class="caso-rot">Bloco 3.2 — Jornada do cliente (resumo)</span><p>O mapeamento da empresa assume que o cliente descobre a marca comparando preços no corredor do supermercado, decide pela embalagem mais chamativa entre as opções de valor parecido, e se torna recorrente por hábito de compra no mesmo mercado.</p></div>' +
    '<div class="caso-card"><span class="caso-rot">Bloco 5.3 — Orçamento de marketing (resumo)</span><p>Do orçamento mensal de marketing, 80% é destinado a cupons de desconto e encartes de supermercado; os 20% restantes cobrem a produção de conteúdo para redes sociais.</p></div>' +
    '</div>' +
    '<p class="caso-fio">🧭 Pensem no posicionamento como um fio que deveria atravessar cada um desses blocos. A tarefa não é apontar o que "está errado" de forma isolada — é verificar, par a par, se um bloco reconhece o que o outro decidiu.</p></div>';
  var PARES = ['Persona × Praça (onde ela compra)', 'Persona × Preço (o que ela valoriza pagar)', 'Posicionamento × Promoção (o que se comunica)',
    'Persona × Jornada (como ela realmente descobre e decide)', 'Posicionamento × Orçamento (para onde vai o dinheiro)', 'Posicionamento × Produto'];
  var AUDITORIA = {
    id: 'auditoria', codigo: 'Aula 2', tipo: 'atividade', titulo: 'Auditoria de coerência: o caso Grão Nascente',
    etapa: 'Etapa 0 · Aula 2', bloco: 'Treino de coerência, antes de auditar o próprio plano',
    pergunta: 'Onde o fio do posicionamento permanece inteiro e onde ele se rompe?',
    resumo: 'Sete blocos de um plano de marketing fictício, mas verossímil. Decidam, par a par, se os blocos estão conectados, com evidência tirada do próprio texto, não de opinião.',
    leituras: ['aula-2'],
    secoes: [
      { id: 'caso', n: '1', titulo: 'O caso: Grão Nascente, torrefação de café artesanal',
        dica: 'Leiam os sete blocos com atenção. Eles vêm de partes diferentes do plano de marketing dessa empresa — exatamente como cada grupo vai produzir para a própria empresa parceira.',
        itens: [ { t: 'html', html: CASO } ] },
      { id: 'planilha', n: '2', titulo: 'Planilha de auditoria',
        dica: 'Para cada par de blocos, decidam se estão conectados e registrem a evidência retirada do próprio texto — não da impressão geral que ficou da leitura.',
        leitura: ['aula-2', '04-o-risco-o-erro-mais-comum-um-plano-em-pedacos-nao-em-sistema'],
        itens: [ { t: 'tabela', cols: [
          { r: 'Conectado?', tipo: 'opcoes', op: SIM_NAO, w: '12%' }, { r: 'Evidência no texto' }, { r: 'Se quebrado, o que precisaria mudar?' }],
          linhas: PARES.map(function (p, i) { var n = i + 1; return { r: p, k: ['au_par' + n + '_con', 'au_par' + n + '_evid', 'au_par' + n + '_mudar'] }; }) } ] },
      { id: 'decidir', n: '3', titulo: 'Antes de encerrar, decidam em grupo',
        itens: [
          { k: 'au_grave', r: 'Qual das quebras encontradas é a mais grave — a que, se não corrigida, mais compromete o resultado da empresa?' },
          { k: 'au_coerente', r: 'Existe algum bloco que está coerente e que vale reconhecer explicitamente, não só apontar defeito?' },
          { k: 'au_primeira', r: 'Se vocês tivessem que resolver só uma quebra, com o orçamento mais apertado possível, qual seria a primeira?' }
        ] },
      { id: 'frase', n: '4', titulo: 'Encerramento: preparem uma frase',
        dica: 'Em uma frase, a quebra de coerência mais grave que o grupo encontrou e por quê. O mesmo raciocínio — par a par, com evidência — é o que vocês vão aplicar ao plano da empresa parceira ao longo do semestre.',
        itens: [ { k: 'au_frase', r: 'A frase do grupo' } ] }
    ]
  };

  /* =====================================================================
   * E1 · Análise de mercado e SWOT de Marketing (Bloco 1)
   * ===================================================================== */
  function camadaMercado(sigla, nome) {
    var s = sigla.toLowerCase();
    return { r: sigla, d: nome, k: ['b1_' + s + '_formula', 'b1_' + s + '_def', 'b1_' + s + '_fonte', 'b1_' + s + '_premissa'] };
  }
  var BENCH = [
    ['pos', 'Posicionamento declarado', 'Frase ou promessa central, em até 20 palavras (site, bio das redes).'],
    ['port', 'Portfólio e variedade', 'Número aproximado de linhas ou categorias de produto.'],
    ['preco', 'Preço percebido', 'Faixa observada; mais caro, equivalente ou mais barato que a empresa parceira.'],
    ['can', 'Praça e canais de venda', 'Loja física, e-commerce, marketplace, distribuidores...'],
    ['dig', 'Presença institucional digital', 'Site, posição nas buscas, tráfego e origem predominante (SimilarWeb).'],
    ['rep', 'Perfil local e reputação', 'Nota e volume de avaliações no Google; índice de solução no Reclame Aqui.'],
    ['cont', 'Redes sociais: frequência e engajamento', 'Seguidores, publicações por semana, taxa de engajamento estimada.'],
    ['tom', 'Tom de comunicação', 'Três adjetivos que resumem o tom.'],
    ['midia', 'Mídia paga', 'Está anunciando? Quantos anúncios ativos? Que oferta? (Biblioteca de Anúncios da Meta)'],
    ['base', 'Sinais de base de clientes', 'Perfil aparente do cliente e o que ele valoriza, nas palavras dele.'],
    ['seg', 'Segmento-alvo principal', ''],
    ['fort', 'Pontos fortes percebidos', ''],
    ['frac', 'Pontos fracos percebidos', ''],
    ['dif', 'Diferenciais claros', ''],
    ['fonte', 'Fonte de cada observação', 'Ferramenta, print ou link de onde veio cada dado.']
  ];
  function swotQuadrante(pref, titulo, categorias) {
    return { t: 'tabela', r: titulo, cols: [
      { r: titulo.replace(/s$/, '') + ' (frase específica)', w: '38%' },
      { r: 'Evidência (de onde veio)' },
      { r: 'Categoria', tipo: 'opcoes', op: categorias, w: '19%' }],
      linhas: seq(5).map(function (i) { var k = 'b1_swot_' + pref + i; return { r: String(i), k: [k, k + '_evid', k + '_cat'] }; }) };
  }
  var E1 = {
    id: 'e1', codigo: 'E1', titulo: 'Análise de mercado e SWOT de Marketing',
    etapa: 'Etapa 2 · Aulas 4 a 6', bloco: 'Bloco 1 · Análise situacional',
    pergunta: 'Como está o mercado e onde estamos?',
    resumo: 'Tamanho do mercado, tendências, clientes atuais, três concorrentes, a SWOT de marketing e os cruzamentos TOWS, fechando com a principal oportunidade e o principal risco.',
    leituras: ['aula-4', 'aula-5', 'aula-6'],
    secoes: [
      { id: 'mercado', n: '1.1', titulo: 'Análise de mercado: TAM, SAM, SOM e tendências',
        dica: 'Declare a premissa de cada camada, não só o resultado. O SOM, e não o TAM, é o número que vai orientar os objetivos SMART da E4.',
        leitura: ['aula-4', '1-6-modelo-para-aplicar-na-empresa-parceira'],
        itens: [
          { t: 'sub', r: 'Tamanho do mercado' },
          { t: 'tabela', cols: [
            { r: 'Fórmula usada', ph: 'Ex.: clientes potenciais × receita média anual' },
            { r: 'Valor estimado', ph: 'Valor e unidade' },
            { r: 'Fonte(s): pesquisa e ano', ph: 'Não apenas "IBGE": a pesquisa e o ano.' },
            { r: 'Premissa assumida', ph: 'O que foi assumido e por quê.' }],
            linhas: [camadaMercado('TAM', 'Mercado total endereçável'), camadaMercado('SAM', 'Mercado disponível: o recorte da estratégia real'), camadaMercado('SOM', 'Mercado obtível no horizonte definido')] },
          { t: 'grupo', cols: 2, itens: [
            { k: 'b1_mercado_rota', r: 'Rota de cálculo', tipo: 'opcoes', op: ['Bottom-up', 'Top-down', 'As duas rotas, comparadas'] },
            { k: 'b1_som_horizonte', r: 'Horizonte do SOM', tipo: 'linha', ph: 'Sugestão: 12 a 24 meses' }
          ] },
          { k: 'b1_mercado_validacao', r: 'Validação cruzada e cuidados com os dados', ph: 'As duas rotas convergem? Qual a defasagem dos dados usados? Algum número veio de fonte com viés?' },
          { t: 'sub', r: 'Tendências de mercado (de 2 a 4)' },
          { t: 'nota', html: '<p>Uma tendência registrável tem três elementos: <strong>o sinal observado, com fonte e data</strong>; <strong>a conexão específica com a empresa parceira</strong>; e <strong>a implicação prática</strong> — o que muda, ou o que vale testar. Antes de registrar, passe pelo filtro: faz sentido para o público da empresa? Combina com o posicionamento que começa a aparecer? A empresa tem condição real de testar em pequena escala?</p>' },
          { t: 'tabela', leitura: ['aula-4', '3-6-tendencia-fato-generico-como-escrever-a-implicacao-estrategica'], cols: [
            { r: 'Sinal observado', w: '20%' }, { r: 'Fonte e data', w: '13%' },
            { r: 'Camada', tipo: 'opcoes', op: ['Macrotendência', 'Mercado e consumo', 'Microtendência'], w: '12%' },
            { r: 'Conexão com a empresa' }, { r: 'Implicação prática' },
            { r: 'Decisão', tipo: 'opcoes', op: ['Agir agora', 'Testar em pequena escala', 'Monitorar', 'Registrar como alerta'], w: '13%' }],
            linhas: seq(4).map(function (i) { var p = 'b1_tend' + i; return { r: 'Tendência ' + i, k: [p + '_nome', p + '_fonte', p + '_camada', p + '_conexao', p + '_impl', p + '_decisao'] }; }) }
        ] },
      { id: 'clientes', n: '1.2', titulo: 'Análise de clientes atual',
        dica: 'Sobre o cliente que a empresa já tem hoje, não o que gostaria de ter. Separe o que é fato relatado pela empresa do que é percepção do grupo a validar.',
        leitura: ['aula-4', 'modelo-para-o-bloco-1-2'],
        itens: [
          { t: 'referencia', de: 'roteiro', blocos: [2, 3], r: 'Respostas registradas na entrevista (Blocos 2 e 3 do roteiro)' },
          { t: 'tabela', cols: [
            { r: 'Fato relatado pela empresa' }, { r: 'Percepção do grupo (a validar)' }, { r: 'Fonte', w: '16%' }],
            linhas: [
              ['b1_cliente_atual', 'Quem compra hoje?', 'Perfil descritivo: idade aproximada, pessoa física ou empresa, região, padrões que a empresa já reconhece.'],
              ['b1_motivos_compra', 'Por que compra?', 'Motivo funcional, emocional e social, nas palavras da empresa ou dos clientes. Evite "qualidade" e "preço bom" sem contexto.'],
              ['b1_pontos_contato', 'Onde compra?', 'Canal de descoberta × canal de compra × canal de recompra.'],
              ['b1_razoes_perda', 'Por que para de comprar?', 'Padrões de abandono e objeções. Se a empresa não souber, registre o que foi possível construir na conversa.'],
              ['b1_decisao_compra', 'Como decide a compra?', 'Quem participa da decisão, quanto tempo leva, o que pesa.'],
              ['b1_clientes_valor', 'Quem são os clientes de maior valor?', 'Os 10 ou 20 clientes que a empresa mais gostaria de replicar.']
            ].map(function (l) { return { r: l[1], d: l[2], k: [l[0], l[0] + '_perc', l[0] + '_fonte'] }; }) }
        ] },
      { id: 'benchmarking', n: '1.3', titulo: 'Benchmarking competitivo',
        dica: 'Três concorrentes diretos, com papéis diferentes. Anote o dado observável separado da interpretação do grupo, e registre a fonte de cada observação.',
        leitura: ['aula-5', '6-preenchendo-o-bloco-1-3-da-ferramenta'],
        itens: [
          { t: 'sub', r: 'Os três concorrentes escolhidos' },
          { t: 'tabela', cols: [
            { r: 'Nome', tipo: 'linha', w: '18%' },
            { r: 'Papel na análise', tipo: 'opcoes', op: ['Porte semelhante', 'O que a empresa mais teme ou admira', 'Faz algo visivelmente diferente'], w: '22%' },
            { r: 'Direto ou indireto', tipo: 'opcoes', op: ['Direto', 'Indireto'], w: '14%' },
            { r: 'Por que foi escolhido' }],
            linhas: ['a', 'b', 'c'].map(function (x) { return { r: 'Concorrente ' + x.toUpperCase(), k: ['b1_conc_nome_' + x, 'b1_conc_papel_' + x, 'b1_conc_tipo_' + x, 'b1_conc_porque_' + x] }; }) },
          { t: 'sub', r: 'Checklist de 10 pontos, comparado' },
          { t: 'tabela', largo: true, cols: [
            { r: 'Empresa parceira' },
            { r: 'Concorrente A', rotuloDe: 'b1_conc_nome_a' }, { r: 'Concorrente B', rotuloDe: 'b1_conc_nome_b' }, { r: 'Concorrente C', rotuloDe: 'b1_conc_nome_c' },
            { r: 'Notas', w: '14%' }],
            linhas: BENCH.map(function (b) { var p = 'b1_conc_' + b[0]; return { r: b[1], d: b[2], k: [p + '_sua', p + '_a', p + '_b', p + '_c', p + '_notas'] }; }) },
          { t: 'sub', r: 'Síntese: diferencial × fraqueza × oportunidade' },
          { k: 'b1_conc_sint_dif', r: 'Principal diferencial dos concorrentes', d: 'O que, entre os três, a empresa parceira deveria genuinamente aprender ou imitar?' },
          { k: 'b1_conc_sint_frac', r: 'Principal fraqueza comum', d: 'Existe algum ponto fraco que se repete nos três (ou em pelo menos dois) concorrentes?' },
          { k: 'b1_conc_sint_oport', r: 'Oportunidade de posicionamento', d: 'Dado o que foi observado, que espaço relevante para o segmento da empresa parceira parece estar livre?' },
          { t: 'sub', r: 'Do benchmarking para a SWOT' },
          { t: 'tabela', leitura: ['aula-5', '5-2-do-benchmarking-para-a-swot-de-marketing'], cols: [
            { r: 'Concorrente', tipo: 'linha', w: '15%' }, { r: 'O que foi observado' },
            { r: 'Aponta para', tipo: 'opcoes', op: ['Ameaça', 'Oportunidade'], w: '13%' }, { r: 'Frase pronta para a SWOT de marketing' }],
            linhas: seq(3).map(function (i) { var p = 'b1_trad' + i; return { r: String(i), k: [p + '_conc', p + '_obs', p + '_tipo', p + '_frase'] }; }) }
        ] },
      { id: 'swot', n: '1.4', titulo: 'SWOT de Marketing',
        dica: 'Substantivo solto não é SWOT. Cada linha: substantivo específico + evidência de onde veio + por que importa para o marketing da empresa. Preencham primeiro a evidência, revisitando as anotações das Aulas 3 a 5.',
        leitura: ['aula-6', '4-a-regra-de-ouro-substantivo-solto-nao-e-swot'],
        itens: [
          swotQuadrante('for', 'Forças', CAT_INTERNAS),
          swotQuadrante('fra', 'Fraquezas', CAT_INTERNAS),
          swotQuadrante('opo', 'Oportunidades', CAT_EXTERNAS),
          swotQuadrante('ame', 'Ameaças', CAT_EXTERNAS)
        ] },
      { id: 'tows', n: '1.5', titulo: 'TOWS: dos quadrantes às hipóteses de ação',
        dica: 'Cada cruzamento nomeia qual força ou fraqueza está sendo cruzada com qual oportunidade ou ameaça e termina em um verbo de ação: lançar, redirecionar, suspender, comunicar, testar.',
        leitura: ['aula-6', '5-tows-dos-quadrantes-as-hipoteses-de-acao'],
        itens: [ { t: 'tabela', cols: [
          { r: 'Força ou fraqueza usada', w: '24%' }, { r: 'Oportunidade ou ameaça usada', w: '24%' }, { r: 'Frase de ação' }],
          linhas: [['so', 'SO', 'Forças + oportunidades: aproveitar'], ['st', 'ST', 'Forças + ameaças: neutralizar'], ['wo', 'WO', 'Fraquezas + oportunidades: desenvolver'], ['wt', 'WT', 'Fraquezas + ameaças: evitar']]
            .map(function (c) { return { r: c[1], d: c[2], k: ['b1_tows_' + c[0] + '_int', 'b1_tows_' + c[0] + '_ext', 'b1_tows_' + c[0]] }; }) } ] },
      { id: 'sintese', n: '1.6', titulo: 'Síntese da análise situacional',
        dica: 'Escrevam como se estivessem explicando por telefone ao gestor da empresa, sem usar as palavras SWOT, TOWS ou posicionamento. Duas ou três frases cada.',
        leitura: ['aula-6', '6-a-sintese-da-analise-situacional-bloco-1-6'],
        itens: [
          { k: 'b1_sintese_oport', r: 'Principal oportunidade' },
          { k: 'b1_sintese_risco', r: 'Principal risco' },
          { k: 'b1_sintese_conclusao', r: 'Conclusão estratégica para o plano (opcional)' }
        ] },
      { id: 'checklist', n: '✓', titulo: 'Checklist de qualidade antes de entregar',
        itens: [ { t: 'checklist', itens: [
          ['e1_chk1', 'TAM calculado por pelo menos uma rota, com fórmula explícita; SAM com pelo menos um filtro justificado; SOM como fração do SAM, com horizonte de tempo definido.'],
          ['e1_chk2', 'Cada camada (TAM, SAM, SOM) tem fonte nomeada — não apenas "IBGE", mas a pesquisa específica e o ano.'],
          ['e1_chk3', 'Ao menos duas tendências registradas com sinal + fonte + implicação prática, e ao menos uma passou pelo filtro de relevância.'],
          ['e1_chk4', 'Cada resposta da análise de clientes está identificada como fato relatado pela empresa ou como percepção do grupo a validar.'],
          ['e1_chk5', 'Cada observação do benchmarking tem fonte identificável, e dado observado e interpretação do grupo não aparecem misturados.'],
          ['e1_chk6', 'Cada item da SWOT tem uma frase de justificativa, com evidência de origem, não apenas um substantivo solto.'],
          ['e1_chk7', 'A SWOT de marketing é visivelmente diferente da SWOT estratégica da disciplina anterior.'],
          ['e1_chk8', 'Ao menos uma força ou fraqueza vem da entrevista; ao menos uma oportunidade ou ameaça vem de uma tendência; ao menos uma vem do benchmarking.'],
          ['e1_chk9', 'Os quatro cruzamentos do TOWS nomeiam o que está sendo cruzado e terminam em uma frase de ação.'],
          ['e1_chk10', 'A síntese está em linguagem que o gestor entenderia e é específica da empresa parceira.']
        ] } ] }
    ],
    importar: function (j, out) {
      // a Ferramenta guardava cada quadrante da SWOT num texto só, um item por linha
      [['b1_swot_forcas', 'for'], ['b1_swot_fraquezas', 'fra'], ['b1_swot_oport', 'opo'], ['b1_swot_ameacas', 'ame']].forEach(function (q) {
        var linhas = String(j[q[0]] || '').split(/\n+/).map(function (s) { return s.replace(/^\s*[-•*\d.)]+\s*/, '').trim(); }).filter(Boolean);
        linhas.slice(0, 5).forEach(function (l, i) { out['b1_swot_' + q[1] + (i + 1)] = l; });
        if (linhas.length > 5) out['b1_swot_' + q[1] + '5'] = linhas.slice(4).join('\n');
      });
    }
  };

  /* =====================================================================
   * E2 · Segmentação, persona e posicionamento (Bloco 2)
   * ===================================================================== */
  function persona(n) {
    var P = 'b2_persona' + n + '_', p = 'b2_p' + n + '_';
    return [
      { t: 'sub', r: 'Persona ' + n + (n === 2 ? ' (se aplicável)' : '') },
      { t: 'grupo', cols: 3, itens: [
        { k: P + 'nome', r: 'Nome', tipo: 'linha', ph: n === 1 ? 'Ex.: Camila' : 'Ex.: Carlos' },
        { k: P + 'cargo', r: 'Cargo / papel na decisão', tipo: 'linha' },
        { k: P + 'idade', r: 'Idade', tipo: 'linha' },
        { k: P + 'empresa', r: 'Contexto (ocupação, empresa, família)', tipo: 'linha' },
        { k: P + 'local', r: 'Localização', tipo: 'linha' },
        { k: p + 'estagio', r: 'Estágio em que entra em contato com a categoria', tipo: 'opcoes', op: ETAPAS_DECISAO }
      ] },
      { k: p + 'resumo', r: 'Frase que resume quem ela é', tipo: 'linha' },
      { k: P + 'citacao', r: 'Citação representativa', ph: 'Como esta persona descreveria o problema principal, com as palavras dela.' },
      { t: 'grupo', cols: 3, itens: [
        { k: p + 'job_func', r: 'Job funcional', ph: 'O problema prático que precisa resolver.' },
        { k: p + 'job_emoc', r: 'Job emocional', ph: 'Como quer se sentir.' },
        { k: p + 'job_soc', r: 'Job social', ph: 'Como quer ser visto pelos outros.' }
      ] },
      { t: 'tabela', r: 'Dores específicas da categoria', cols: [{ r: 'Dor' }, { r: 'Intensidade (1 a 5)', tipo: 'numero', min: 1, max: 5, w: '16%' }],
        linhas: seq(5).map(function (i) { return { r: 'Dor ' + i, k: [p + 'pain' + i, p + 'pain' + i + '_int'] }; }) },
      { t: 'grupo', cols: 3, itens: [
        { k: p + 'gain_req', r: 'Ganhos requeridos', ph: 'O básico que espera.' },
        { k: p + 'gain_exp', r: 'Ganhos esperados', ph: 'O que espera normalmente, na linguagem dela.' },
        { k: p + 'gain_des', r: 'Ganhos desejados', ph: 'O que a surpreenderia.' }
      ] },
      { t: 'grupo', cols: 2, itens: [
        { k: n === 1 ? p + 'ctx_obj' : P + 'objecao', r: 'Objeções prováveis', ph: 'O que impede ou atrasa a decisão.' },
        { k: p + 'gatilho', r: 'Gatilho de decisão', ph: 'O que a faz sair da consideração para a decisão.' },
        { k: p + 'ctx_info', r: 'Onde é encontrável', ph: 'Canais, comunidades, fontes de informação que consulta.' },
        { k: p + 'ctx_dec', r: 'Como decide e quem influencia', ph: 'Processo de decisão, influenciadores.' }
      ] },
      { t: 'grupo', cols: 2, itens: [
        { k: p + 'fonte_tipo', r: 'Principal fonte da informação', tipo: 'opcoes', op: FONTES_PERSONA },
        { k: p + 'fonte', r: 'Detalhe das fontes', ph: 'Com quem conversaram, que dado interno usaram, o que ainda é hipótese a validar.' }
      ] }
    ];
  }
  var E2 = {
    id: 'e2', codigo: 'E2', titulo: 'Segmentação, persona e posicionamento',
    etapa: 'Etapa 3 · Aulas 7 a 9', bloco: 'Bloco 2 · Segmento, persona e posicionamento',
    pergunta: 'Para quem somos? Por que nos escolher?',
    resumo: 'O coração do plano: o segmento prioritário escolhido com critério, uma ou duas personas com evidência, o Value Proposition Canvas e a declaração de posicionamento.',
    leituras: ['aula-7-8'],
    leiturasEmBreve: ['Value Proposition Canvas e declaração de posicionamento (Aula 9)'],
    secoes: [
      { id: 'segmentacao', n: '2.1', titulo: 'Segmentação de mercado',
        dica: 'Não existe produto para todo mundo. Combine mais de uma variável e teste os cinco critérios de atratividade, perguntando para cada um: "como sabemos que isso é verdade?".',
        leitura: ['aula-7-8', '7-preenchendo-o-bloco-2-1-da-ferramenta'],
        itens: [
          { t: 'grupo', cols: 2, itens: [
            { k: 'b2_variaveis', r: 'Variáveis de segmentação usadas', ph: 'Geográfica, demográfica, psicográfica, comportamental ou firmográfica — e quais recortes de cada uma.' },
            { k: 'b2_tipo', r: 'Tipo de mercado', tipo: 'opcoes', op: ['B2C (pessoa física)', 'B2B (empresa)', 'Os dois'] }
          ] },
          { t: 'tabela', r: 'Segmentos possíveis (2 a 4)', cols: [
            { r: 'Segmento (frase específica)', w: '24%' }, { r: 'Características principais' }, { r: 'Necessidade central' }, { r: 'Potencial estimado (número e fonte)' }],
            linhas: seq(4).map(function (i) { var p = 'b2_seg' + i; return { r: 'Segmento ' + i, k: [p + '_nome', p + '_caract', p + '_nec', p + '_pot'] }; }) },
          { t: 'tabela', r: 'Avaliação MASDA', cols: [
            { r: 'Mensurável', tipo: 'check', w: '9%' }, { r: 'Acessível', tipo: 'check', w: '9%' }, { r: 'Substancial', tipo: 'check', w: '9%' },
            { r: 'Diferenciável', tipo: 'check', w: '9%' }, { r: 'Acionável', tipo: 'check', w: '9%' }, { r: 'Critério mais frágil e como sabemos' }],
            linhas: seq(4).map(function (i) { var p = 'b2_seg' + i; return { r: 'Segmento ' + i, rotuloDe: p + '_nome', k: [p + '_m', p + '_a', p + '_s', p + '_d', p + '_ac', p + '_masda'] }; }) },
          { k: 'b2_segmento_prio', r: 'Segmento prioritário escolhido', tipo: 'linha' },
          { k: 'b2_segmento_justif', r: 'Por que este segmento (com base na avaliação acima)' },
          { k: 'b2_segmento_fonte', r: 'Fonte de validação', ph: 'Como o grupo confirmou (ou pretende confirmar) essa escolha com a empresa parceira ou com dado de mercado.' }
        ] },
      { id: 'personas', n: '2.2', titulo: 'Personas',
        dica: 'Persona é hipótese testável, não personagem de ficção: só o nome é inventado. Construam duas quando houver mais de um decisor relevante (quem usa e quem paga, quem compra e quem recomenda).',
        leitura: ['aula-7-8', '16-preenchendo-o-bloco-2-2-da-ferramenta'],
        itens: [ { t: 'referencia', de: 'roteiro', blocos: [2], r: 'Respostas registradas na entrevista (Bloco 2 do roteiro)' } ]
          .concat(persona(1)).concat(persona(2))
          .concat([{ k: 'b2_personas_porque', r: 'Por que uma (ou duas) personas?', ph: 'Existe mais de um tipo de decisor relevante? Como as duas se conectam?' }]) },
      { id: 'vpc', n: '2.3', titulo: 'Value Proposition Canvas',
        dica: 'Preencham o lado do cliente com base na Persona 1; depois, o lado da empresa. O fit está nos aliviadores e criadores que mais importam para aquela persona específica.',
        itens: [
          { t: 'trazer', r: '↻ Trazer jobs, dores e ganhos da Persona 1', de: 'e2', mapa: {
            b2_vpc_jobs: function (c) { return juntar([['Funcional', c.b2_p1_job_func], ['Emocional', c.b2_p1_job_emoc], ['Social', c.b2_p1_job_soc]]); },
            b2_vpc_pains: function (c) { return seq(5).map(function (i) { return c['b2_p1_pain' + i] ? '• ' + c['b2_p1_pain' + i] + (c['b2_p1_pain' + i + '_int'] ? ' (' + c['b2_p1_pain' + i + '_int'] + '/5)' : '') : ''; }).filter(Boolean).join('\n'); },
            b2_vpc_gains: function (c) { return juntar([['Requeridos', c.b2_p1_gain_req], ['Esperados', c.b2_p1_gain_exp], ['Desejados', c.b2_p1_gain_des]]); }
          } },
          { t: 'grupo', cols: 2, itens: [
            { t: 'sub', r: 'Lado do cliente' }, { t: 'sub', r: 'Lado da empresa' },
            { k: 'b2_vpc_jobs', r: 'Tarefas do cliente (jobs)', ph: 'O que o cliente tenta fazer.' },
            { k: 'b2_vpc_produtos', r: 'Produtos e serviços', ph: 'O que a empresa oferece.' },
            { k: 'b2_vpc_pains', r: 'Dores', ph: 'Frustrações, riscos, o que o cliente teme.' },
            { k: 'b2_vpc_relievers', r: 'Aliviadores de dor', ph: 'Como a oferta resolve as dores.' },
            { k: 'b2_vpc_gains', r: 'Ganhos', ph: 'O que o cliente quer conquistar, economizar, sentir.' },
            { k: 'b2_vpc_gainc', r: 'Criadores de ganho', ph: 'Como a oferta gera ganhos.' }
          ] },
          { k: 'b2_vpc_fit', r: 'Fit: onde há maior alinhamento entre cliente e empresa?' }
        ] },
      { id: 'posicionamento', n: '2.4', titulo: 'Declaração de posicionamento',
        dica: 'Preencham os componentes e vejam a frase se montar. Escrevam três versões e escolham a mais precisa: se um concorrente pudesse assinar a mesma frase, ela ainda não é posicionamento.',
        itens: [
          { t: 'tabela', cols: [{ r: 'Conteúdo' }], linhas: [
            ['b2_pos_para', 'Para...', 'O segmento-alvo.'], ['b2_pos_que', 'que...', 'O problema central ou a necessidade.'],
            ['b2_pos_oq', 'nossa [oferta] é...', 'A categoria da solução.'], ['b2_pos_pq', 'que...', 'O diferencial único.'],
            ['b2_pos_contra', 'diferente de...', 'A alternativa principal.'], ['b2_pos_pois', 'pois...', 'A evidência concreta.']
          ].map(function (l) { return { r: l[1], d: l[2], k: [l[0]] }; }) },
          { t: 'especial', nome: 'frase' },
          { k: 'b2_pos_v1', r: 'Versão 1' }, { k: 'b2_pos_v2', r: 'Versão 2' }, { k: 'b2_pos_v3', r: 'Versão 3' },
          { k: 'b2_pos_final', r: 'Declaração escolhida', d: 'A versão mais precisa, em texto corrido. É ela que aparece nas próximas entregas.' },
          { k: 'b2_pos_porque', r: 'Por que esta versão é a mais precisa' }
        ] },
      { id: 'checklist', n: '✓', titulo: 'Checklist antes de entregar',
        itens: [ { t: 'checklist', itens: [
          ['e2_chk1', 'O segmento prioritário está descrito em uma frase específica, não em um adjetivo genérico.'],
          ['e2_chk2', 'Os cinco critérios MASDA foram testados, não apenas listados.'],
          ['e2_chk3', 'Ao menos uma variável de segmentação tem evidência de fonte externa ou de conversa direta com a empresa parceira.'],
          ['e2_chk4', 'O grupo resistiu à tentação de tentar servir "todo mundo" sem critério de exclusão.'],
          ['e2_chk5', 'Cada campo da persona tem uma fonte identificada; se a empresa não tem cliente atual, a persona está rotulada como hipótese a validar.'],
          ['e2_chk6', 'Os jobs funcional, emocional e social estão todos preenchidos, e a persona evita adjetivos genéricos sem uma frase específica por trás.'],
          ['e2_chk7', 'A persona aparece no Value Proposition Canvas.'],
          ['e2_chk8', 'A declaração de posicionamento é específica: nenhum concorrente poderia assiná-la como está.']
        ] } ] }
    ],
    importar: function (j, out) {
      // a Persona 2 da Ferramenta tinha campos únicos para dores, jobs e ganhos
      if (j.b2_persona2_dores) out.b2_p2_pain1 = j.b2_persona2_dores;
      if (j.b2_persona2_jobs) out.b2_p2_job_func = j.b2_persona2_jobs;
      if (j.b2_persona2_gains) out.b2_p2_gain_exp = j.b2_persona2_gains;
    }
  };

  /* =====================================================================
   * E3 · Mix de marketing e jornada (Bloco 3)
   * ===================================================================== */
  var SETE_P = [['produto', 'Produto'], ['preco', 'Preço'], ['praca', 'Praça'], ['promocao', 'Promoção'], ['pessoas', 'Pessoas'], ['processos', 'Processos'], ['evidencias', 'Evidências físicas']];
  var E3 = {
    id: 'e3', codigo: 'E3', titulo: 'Mix de marketing e jornada do cliente',
    etapa: 'Etapa 4 · Aulas 10 a 13', bloco: 'Bloco 3 · Mix de marketing',
    pergunta: 'O que oferecemos e como chegamos ao cliente?',
    resumo: 'Os 7Ps coerentes com o posicionamento, a jornada real do cliente, até quatro canais prioritários e o mix de mídia paga, própria e conquistada.',
    leituras: [],
    leiturasEmBreve: ['Os 7Ps do mix de marketing (Aula 10)', 'Jornada do cliente e pontos de contato (Aula 11)', 'Canais prioritários e mix de mídia (Aula 12)'],
    secoes: [
      { id: 'sete-ps', n: '3.1', titulo: 'Os 7Ps do mix de marketing',
        dica: 'Primeiro descrevam o mix atual; depois, a escolha estratégica — o que deveria existir para servir o segmento-alvo. A declaração de posicionamento precisa ser reconhecível em cada P.',
        itens: [
          { t: 'espelho', de: 'e2', k: 'b2_pos_final', r: 'Declaração de posicionamento (E2)' },
          { t: 'tabela', cols: [
            { r: 'Como é hoje' }, { r: 'Escolha estratégica: o que deveria ser' },
            { r: 'Coerente com o posicionamento?', tipo: 'opcoes', op: COERENCIA, w: '14%' }],
            linhas: SETE_P.map(function (p) { var k = 'b3_7p_' + p[0]; return { r: p[1], k: [k + '_hoje', k, k + '_coer'] }; }) },
          { k: 'b3_7p_ajustes', r: 'Os 2 ou 3 Ps que mais precisam de ajuste, e por quê' }
        ] },
      { id: 'jornada', n: '3.2', titulo: 'Jornada do cliente e pontos de contato',
        dica: 'Mapeiem a jornada real, não a ideal. Em cada etapa: o que o cliente faz e pensa, onde encontra a marca, o momento em que decide avançar ou abandonar, e o que a empresa deve fazer.',
        itens: [
          { t: 'espelho', de: 'e2', k: 'b2_persona1_nome', r: 'Persona 1 (E2)' },
          { t: 'referencia', de: 'roteiro', blocos: [3], r: 'Respostas registradas na entrevista (Bloco 3 do roteiro)' },
          { t: 'tabela', cols: [
            { r: 'O que o cliente faz / pensa' }, { r: 'Pontos de contato (online e offline)' },
            { r: 'Momento de verdade: onde avança ou abandona' }, { r: 'O que a empresa deve fazer' }],
            linhas: ['Descoberta', 'Consideração', 'Avaliação', 'Compra', 'Pós-compra', 'Recomendação'].map(function (e, i) {
              var p = 'b3_jorn' + (i + 1); return { r: e, k: [p + '_faz', p + '_ptc', p + '_mv', p + '_acao'] }; }) },
          { t: 'grupo', cols: 2, itens: [
            { k: 'b3_jorn_perda', r: 'Onde a empresa mais perde clientes hoje?' },
            { k: 'b3_jorn_fonte', r: 'De onde vieram essas informações?', ph: 'Entrevista, observação, dados da empresa, conversa com clientes.' }
          ] }
        ] },
      { id: 'canais', n: '3.3', titulo: 'Canais prioritários',
        dica: 'Até quatro canais (nem todo canal precisa ser digital). Estar em todos os canais sem estratégia é pior do que estar em poucos com foco.',
        itens: [
          { t: 'tabela', cols: [
            { r: 'Canal', w: '14%' }, { r: 'Etapa principal da jornada', tipo: 'opcoes', op: ['Atração', 'Consideração', 'Conversão', 'Retenção/Advocacy'], w: '14%' },
            { r: 'Tipo', tipo: 'opcoes', op: ['Digital', 'Presencial', 'Ambos'], w: '11%' },
            { r: 'Papel / objetivo no plano' }, { r: 'Por que este canal: onde a persona está' }, { r: 'Como se integra com os outros' }],
            linhas: seq(4).map(function (i) { var p = 'b3_canal' + i; return { r: 'Canal ' + i, k: [p + '_nome', p + '_etapa', p + '_tipo', p + '_papel', p + '_porque', p + '_integra'] }; }) },
          { k: 'b3_canais_fora', r: 'Canais que ficam de fora por enquanto, e por quê' }
        ] },
      { id: 'midia', n: '3.4', titulo: 'Mix de mídia: paga, própria e conquistada',
        itens: [ { t: 'grupo', cols: 3, itens: [
          { t: 'sub', r: 'Paid · o que vamos pagar para veicular' }, { t: 'sub', r: 'Owned · canais que controlamos' }, { t: 'sub', r: 'Earned · o que esperamos conquistar' },
          { k: 'b3_paid_canais', r: 'Canais e formatos', ph: 'Google Ads, Meta Ads, influenciadores pagos...' },
          { k: 'b3_owned_canais', r: 'Canais principais', ph: 'Site, blog, redes sociais, e-mail...' },
          { k: 'b3_earned_esperado', r: 'O que esperamos que aconteça', ph: 'Menções espontâneas, imprensa, avaliações...' },
          { k: 'b3_paid_orcamento', r: 'Orçamento estimado', ph: 'R$ por mês ou por campanha' },
          { k: 'b3_owned_freq', r: 'Frequência / cadência', ph: 'Ex.: 3 vezes por semana, newsletter mensal' },
          { k: 'b3_earned_facilitar', r: 'Como vamos facilitar', ph: 'Assessoria, programa de indicação, pedido de avaliação...' }
        ] } ] },
      { id: 'checklist', n: '✓', titulo: 'Checklist de coerência antes de entregar',
        itens: [ { t: 'checklist', itens: [
          ['e3_chk1', 'A declaração de posicionamento aparece em cada P do mix.'],
          ['e3_chk2', 'O mix atual e a escolha estratégica estão separados, e as incoerências foram nomeadas.'],
          ['e3_chk3', 'A persona escolhida aparece na jornada do cliente.'],
          ['e3_chk4', 'A jornada descreve o caminho real do cliente, não o caminho ideal.'],
          ['e3_chk5', 'Os canais de comunicação são coerentes com onde a persona está.'],
          ['e3_chk6', 'A empresa tem capacidade de manter os canais escolhidos com qualidade e frequência.']
        ] } ] }
    ]
  };

  /* =====================================================================
   * E4 · Objetivos, KPIs e plano de ações (Blocos 4 e 5)
   * ===================================================================== */
  var CATEGORIAS_ORC = ['Mídia paga (Google, Meta, TikTok, OOH, impressos, TV/rádio)', 'Produção de conteúdo (texto, vídeo, foto, design)', 'Ferramentas e tecnologia (CRM, automação, analytics)',
    'Eventos, feiras e patrocínios', 'Relações públicas / assessoria de imprensa', 'Incentivos e promoções (descontos, brindes, cashback)', 'Reserva / contingência (recomendado: 10–15%)'];
  function smart(n) {
    var p = 'b4_s' + n + '_';
    return [
      { t: 'sub', r: 'Objetivo ' + n + (n === 3 ? ' (opcional)' : '') },
      { t: 'grupo', cols: 3, itens: [
        { k: p + 's', r: 'S · Específico', ph: 'O que exatamente queremos alcançar?' },
        { k: p + 'm', r: 'M · Mensurável', ph: 'Qual o número concreto do sucesso?' },
        { k: p + 'a', r: 'A · Alcançável', ph: 'Temos recursos? É realista para esta empresa?' },
        { k: p + 'r', r: 'R · Relevante', ph: 'Por que importa para o objetivo de negócio?' },
        { k: p + 't', r: 'T · Temporal', ph: 'Qual é o prazo?' },
        { k: p + 'frase', r: 'O objetivo em uma frase', ph: 'Ex.: Crescer 20% em receita até dezembro com CAC abaixo de R$ 250.' }
      ] }
    ];
  }
  var E4 = {
    id: 'e4', codigo: 'E4', titulo: 'Objetivos, KPIs e plano de ações',
    etapa: 'Etapa 5 · Aulas 14 a 16', bloco: 'Blocos 4 e 5 · Objetivos, KPIs e plano de ações',
    pergunta: 'Onde queremos chegar, como vamos medir, o que faremos e quanto custa?',
    resumo: 'Objetivos SMART ligados ao objetivo de negócio, o painel de KPIs com baseline e meta, a priorização das ações pelo ICE Score, o 5W2H das três prioritárias, o orçamento por trimestre e o cronograma.',
    leituras: [],
    leiturasEmBreve: ['Objetivos SMART e KPIs de marketing (Aula 14)', 'Priorização de ações: ICE Score e 5W2H (Aula 15)', 'Orçamento, responsabilidades e cronograma (Aula 16)'],
    secoes: [
      { id: 'alinhamento', n: '4.1', titulo: 'Alinhamento estratégico',
        dica: 'Os objetivos de marketing precisam contribuir diretamente para o objetivo de negócio da empresa. Lembrem do SOM calculado na E1: ele é a régua do que é alcançável.',
        itens: [
          { t: 'espelho', de: 'e1', k: 'b1_som_def', r: 'SOM estimado (E1)' },
          { k: 'b4_obj_negocio', r: 'Objetivo de negócio que o plano serve', ph: 'Ex.: crescer 30% em receita até dezembro.' },
          { k: 'b4_north_star', r: 'North Star Metric: o indicador que unifica', ph: 'Ex.: número de clientes ativos pagantes.' },
          { k: 'b4_obj_mktg1', r: 'Objetivo de marketing 1' }, { k: 'b4_obj_mktg2', r: 'Objetivo de marketing 2' }, { k: 'b4_obj_mktg3', r: 'Objetivo de marketing 3 (opcional)' }
        ] },
      { id: 'smart', n: '4.2', titulo: 'Objetivos SMART',
        dica: '"Crescer" não é objetivo. Um objetivo mal definido é uma intenção. Formalizem os objetivos de marketing da seção 4.1.',
        itens: smart(1).concat(smart(2)).concat(smart(3)) },
      { id: 'kpis', n: '4.3', titulo: 'Dashboard de KPIs',
        dica: 'De 3 a 5 KPIs, um por objetivo SMART, mais a North Star se fizer sentido. KPI não é métrica: KPI tem meta, prazo e responsável.',
        itens: [
          { t: 'tabela', r: 'O que medir', cols: [
            { r: 'KPI / indicador', w: '18%' }, { r: 'Tipo', tipo: 'opcoes', op: ['Processo', 'Resultado'], w: '11%' },
            { r: 'O que mede' }, { r: 'Fórmula / como medir' }, { r: 'Ferramenta', w: '14%' }],
            linhas: seq(5).map(function (i) { var p = 'b4_kpi' + i; return { r: String(i), k: [p + '_nome', p + '_tipo', p + '_mede', p + '_formula', p + '_ferr'] }; }) },
          { t: 'tabela', r: 'Onde estamos e onde queremos chegar', cols: [
            { r: 'Baseline atual' }, { r: 'Meta' }, { r: 'Prazo', w: '15%' }, { r: 'Responsável', w: '17%' }],
            linhas: seq(5).map(function (i) { var p = 'b4_kpi' + i; return { r: 'KPI ' + i, rotuloDe: p + '_nome', k: [p + '_base', p + '_meta', p + '_prazo', p + '_resp'] }; }) }
        ] },
      { id: 'baseline', n: '4.4', titulo: 'Baseline e lógica das metas',
        dica: 'Definir o ponto de partida é mais difícil — e mais importante — do que definir a meta. Para os três KPIs mais críticos, de onde vem o número de hoje e por que a meta é realista?',
        itens: [
          { t: 'trazer', r: '↻ Trazer os três primeiros KPIs do dashboard', de: 'e4', mapa: {
            b4_base1_kpi: 'b4_kpi1_nome', b4_base1_val: 'b4_kpi1_base', b4_base2_kpi: 'b4_kpi2_nome', b4_base2_val: 'b4_kpi2_base', b4_base3_kpi: 'b4_kpi3_nome', b4_base3_val: 'b4_kpi3_base' } },
          { t: 'tabela', cols: [
            { r: 'KPI', w: '16%' }, { r: 'Baseline atual', w: '14%' }, { r: 'Fonte do baseline' }, { r: 'Benchmark de mercado (se houver)' }, { r: 'Lógica da meta' }],
            linhas: seq(3).map(function (i) { var p = 'b4_base' + i; return { r: String(i), k: [p + '_kpi', p + '_val', p + '_fonte', p + '_bench', p + '_logica'] }; }) }
        ] },
      { id: 'okr', n: '4.5', titulo: 'OKR simplificado (opcional)',
        dica: 'Uma forma alternativa de resumir os objetivos SMART: o Objective é qualitativo; os Key Results, mensuráveis e vinculados a ele.',
        itens: [
          { t: 'grupo', cols: 2, itens: [
            { k: 'b4_okr_obj', r: 'Objective', ph: 'Ex.: tornar a marca a referência do bairro para...' },
            { k: 'b4_okr_prazo', r: 'Prazo', tipo: 'linha' }
          ] },
          { t: 'tabela', cols: [{ r: 'Descrição' }, { r: 'Meta', w: '20%' }, { r: 'Prazo', w: '18%' }],
            linhas: seq(3).map(function (i) { var p = 'b4_okr_kr' + i; return { r: 'KR' + i, k: [p, p + '_meta', p + '_prazo'] }; }) }
        ] },
      { id: 'ice', n: '5.1', titulo: 'Priorização de ações: ICE Score',
        dica: 'ICE = Impacto × Confiança × Facilidade, de 1 a 10 cada. Confiança 10 significa certeza absoluta — vocês têm? As ações de maior score vão para o 5W2H.',
        itens: [
          { t: 'tabela', largo: true, cols: [
            { r: 'Ação / iniciativa', w: '22%' }, { r: 'Objetivo vinculado' }, { r: 'Tipo', w: '11%' },
            { r: 'Impacto', tipo: 'numero', min: 1, max: 10, w: '8%' }, { r: 'Confiança', tipo: 'numero', min: 1, max: 10, w: '8%' },
            { r: 'Facilidade', tipo: 'numero', min: 1, max: 10, w: '8%' }, { r: 'Score ICE', tipo: 'calc', w: '8%' }],
            linhas: seq(10).map(function (i) { var p = 'b5_ice' + i; return { r: String(i), k: [p + '_acao', p + '_obj', p + '_tipo', p + '_imp', p + '_conf', p + '_fac', p + '_score'] }; }) },
          { t: 'especial', nome: 'ranking' },
          { k: 'b5_ice_criterios', r: 'Como o grupo pontuou', ph: 'O que significa um Impacto 8 ou uma Confiança 6 para este grupo? Em que evidência a confiança se apoia?' }
        ] },
      { id: '5w2h', n: '5.2', titulo: '5W2H das três ações prioritárias',
        dica: 'Cada "How Much" vira uma linha do orçamento, e cada ação precisa mover um KPI do dashboard.',
        itens: [ { t: 'trazer', r: '↻ Trazer as três ações de maior ICE', de: 'e4', mapa: { b5_5w2h1_what: topIce(0), b5_5w2h2_what: topIce(1), b5_5w2h3_what: topIce(2) } } ]
          .concat([1, 2, 3].reduce(function (a, n) {
            var p = 'b5_5w2h' + n + '_';
            return a.concat([{ t: 'sub', r: 'Ação ' + n }, { t: 'grupo', cols: 2, itens: [
              { k: p + 'what', r: 'What · O quê?' }, { k: p + 'why', r: 'Why · Por quê?' },
              { k: p + 'who', r: 'Who · Quem?', tipo: 'linha' }, { k: p + 'when', r: 'When · Quando?', tipo: 'linha' },
              { k: p + 'where', r: 'Where · Onde?', tipo: 'linha' }, { k: p + 'howmuch', r: 'How much · Quanto?', tipo: 'linha', ph: 'R$' },
              { k: p + 'how', r: 'How · Como?' }, { k: p + 'kpi', r: 'KPI que esta ação move' }
            ] }]);
          }, []))
          .concat([{ t: 'especial', nome: 'csv5w2h' }]) },
      { id: 'orcamento', n: '5.3', titulo: 'Orçamento de marketing por trimestre',
        dica: 'Estimem por categoria; se não souberem o valor exato, usem faixas. O total deve ser compatível com o percentual do faturamento informado.',
        itens: [
          { t: 'tabela', moeda: true, cols: [
            { r: 'T1 (R$)', tipo: 'moeda' }, { r: 'T2 (R$)', tipo: 'moeda' }, { r: 'T3 (R$)', tipo: 'moeda' }, { r: 'T4 (R$)', tipo: 'moeda' }, { r: 'Total anual', tipo: 'calc' }],
            linhas: CATEGORIAS_ORC.map(function (c, i) { var p = 'b5_orc' + (i + 1); return { r: c, k: [p + '_t1', p + '_t2', p + '_t3', p + '_t4', p + '_total'] }; })
              .concat([{ r: 'Total do período', total: true, k: ['b5_orc_tot_t1', 'b5_orc_tot_t2', 'b5_orc_tot_t3', 'b5_orc_tot_t4', 'b5_orc_tot_total'], calc: true }]) },
          { t: 'grupo', cols: 2, itens: [
            { k: 'b5_orc_pct_fat', r: '% do faturamento alocado em marketing', tipo: 'linha', ph: 'Ex.: 8%' },
            { k: 'b5_orc_metodo', r: 'Método de orçamento', tipo: 'opcoes', op: ['% da receita', 'Objetivos e tarefas', 'Recursos disponíveis', 'Paridade competitiva'] }
          ] },
          { k: 'b5_orc_justif', r: 'De onde vieram os valores', ph: 'Cotações, benchmarks de mercado, valores praticados pela empresa hoje.' }
        ] },
      { id: 'cronograma', n: '5.4', titulo: 'Cronograma trimestral',
        itens: [
          { t: 'trazer', r: '↻ Trazer as ações do 5W2H', de: 'e4', mapa: { b5_cron1_acao: 'b5_5w2h1_what', b5_cron2_acao: 'b5_5w2h2_what', b5_cron3_acao: 'b5_5w2h3_what' } },
          { t: 'tabela', cols: [
            { r: 'Ação / iniciativa', tipo: 'linha', w: '32%' },
            { r: 'T1 · jan–mar', tipo: 'opcoes', op: STATUS_CRON }, { r: 'T2 · abr–jun', tipo: 'opcoes', op: STATUS_CRON },
            { r: 'T3 · jul–set', tipo: 'opcoes', op: STATUS_CRON }, { r: 'T4 · out–dez', tipo: 'opcoes', op: STATUS_CRON }],
            linhas: seq(5).map(function (i) { var p = 'b5_cron' + i; return { r: String(i), k: [p + '_acao', p + '_q1', p + '_q2', p + '_q3', p + '_q4'] }; }) }
        ] },
      { id: 'checklist', n: '✓', titulo: 'Checklist de coerência antes de entregar',
        itens: [ { t: 'checklist', itens: [
          ['e4_chk1', 'Cada objetivo SMART é mensurável com os KPIs definidos.'],
          ['e4_chk2', 'Cada KPI tem baseline com fonte, meta, prazo e responsável.'],
          ['e4_chk3', 'Os scores do ICE foram pontuados com honestidade, sobretudo a Confiança.'],
          ['e4_chk4', 'As ações prioritárias do ICE Score aparecem no 5W2H.'],
          ['e4_chk5', 'Cada linha do 5W2H tem um custo correspondente no orçamento.'],
          ['e4_chk6', 'Os KPIs aparecem nas ações, e o orçamento é consistente com o ICE Score.']
        ] } ] }
    ]
  };

  /* =====================================================================
   * E5 · Comunicação e marca (Bloco 6)
   * ===================================================================== */
  var PILARES = [['educ', 'Educação'], ['insp', 'Inspiração'], ['social', 'Prova social'], ['prod', 'Produto / oferta'], ['cult', 'Cultura / marca']];
  var E5 = {
    id: 'e5', codigo: 'E5', titulo: 'Comunicação e marca',
    etapa: 'Etapa 6 · Aulas 17 e 18', bloco: 'Bloco 6 · Comunicação e marca',
    pergunta: 'Como vamos nos comunicar?',
    resumo: 'Identidade de marca, tom de voz, arquitetura de mensagem, pilares de conteúdo, um plano editorial de dez peças e a comunicação integrada por canal.',
    leituras: [],
    leiturasEmBreve: ['Identidade de marca e tom de voz (Aula 17)', 'Pilares de conteúdo, plano editorial e comunicação integrada (Aula 18)'],
    secoes: [
      { id: 'identidade', n: '6.1', titulo: 'Identidade de marca',
        dica: 'Cada elemento deve ser coerente com os demais e com o posicionamento. "Somos inovadores, confiáveis e comprometidos" não é identidade.',
        itens: [
          { t: 'espelho', de: 'e2', k: 'b2_pos_final', r: 'Declaração de posicionamento (E2)' },
          { k: 'b6_essencia', r: 'Essência da marca: a ideia central em uma frase' },
          { k: 'b6_prop_valor', r: 'Proposta de valor, em linguagem simples' },
          { t: 'grupo', cols: 2, itens: [
            { k: 'b6_missao', r: 'Propósito e missão: por que existimos, o que entregamos' },
            { k: 'b6_visao', r: 'Visão: onde queremos chegar' },
            { k: 'b6_valores', r: 'Valores: de 3 a 5 princípios inegociáveis' },
            { k: 'b6_personalidade', r: 'Personalidade: 3 adjetivos que a descrevem como pessoa' },
            { k: 'b6_arquetipo', r: 'Arquétipo de marca, e por quê', ph: 'Herói, Sábio, Cuidador, Rebelde, Explorador...' },
            { k: 'b6_visual', r: 'Identidade visual', ph: 'Cores, logotipo, tipografia, ícones.' }
          ] }
        ] },
      { id: 'tom', n: '6.2', titulo: 'Tom de voz',
        itens: [
          { t: 'tabela', cols: [{ r: 'Posição (1 a 10)', tipo: 'numero', min: 1, max: 10, w: '12%' }, { r: 'Como aparece na comunicação' }, { r: 'Exemplo de frase' }],
            linhas: [['formal', 'Formal ←→ Informal'], ['serio', 'Sério ←→ Bem-humorado'], ['emocional', 'Funcional ←→ Emocional']]
              .map(function (d) { var p = 'b6_tv_' + d[0]; return { r: d[1], k: [p + '_score', p + '_como', p + '_ex'] }; }) },
          { t: 'grupo', cols: 2, itens: [
            { k: 'b6_tv_usamos', r: 'Palavras e expressões que usamos' }, { k: 'b6_tv_evitamos', r: 'Palavras e expressões que evitamos' },
            { k: 'b6_tv_erro', r: 'Como a marca fala quando erra' }, { k: 'b6_tv_vitoria', r: 'Como a marca celebra a vitória do cliente' }
          ] }
        ] },
      { id: 'mensagem', n: '6.3', titulo: 'Arquitetura de mensagem',
        dica: 'Uma mensagem central, coerente com o posicionamento, sustentada por mensagens de apoio que têm prova.',
        itens: [
          { k: 'b6_msg_central', r: 'Mensagem central: a promessa em uma frase' },
          { t: 'tabela', cols: [{ r: 'Mensagem de apoio' }, { r: 'Prova ou evidência' }, { r: 'Para qual persona ou etapa da jornada', w: '24%' }],
            linhas: seq(3).map(function (i) { var p = 'b6_msg' + i; return { r: String(i), k: [p, p + '_prova', p + '_para'] }; }) }
        ] },
      { id: 'pilares', n: '6.4', titulo: 'Pilares de conteúdo',
        dica: 'De 3 a 5 temas centrais que a marca aborda de forma consistente. Cada pilar precisa conversar com a persona e com o posicionamento. Deixem em branco os pilares que não usarem.',
        itens: [ { t: 'tabela', cols: [{ r: 'Temas / ângulos prioritários' }, { r: 'Formatos principais' }, { r: 'Canal(is)' }, { r: 'Frequência', w: '12%' }, { r: '% do mix', w: '9%' }],
          linhas: PILARES.map(function (pl) { var p = 'b6_pilar_' + pl[0]; return { r: pl[1], k: [p + '_temas', p + '_formatos', p + '_canais', p + '_freq', p + '_pct'] }; }) } ] },
      { id: 'editorial', n: '6.5', titulo: 'Plano editorial: dez conteúdos',
        dica: 'Conteúdo sem estratégia é ruído; estratégia de conteúdo sem calendário é promessa. Cada peça usa um pilar e se liga a um KPI.',
        itens: [ { t: 'tabela', largo: true, cols: [
          { r: 'Conteúdo / tema', w: '20%' }, { r: 'Pilar', tipo: 'opcoes', op: ['Educação', 'Inspiração', 'Prova Social', 'Produto', 'Cultura', 'Outro'], w: '11%' },
          { r: 'Formato' }, { r: 'Canal(is)' }, { r: 'Data', tipo: 'data', w: '13%' }, { r: 'Frequência' }, { r: 'Responsável' }, { r: 'KPI vinculado' }],
          linhas: seq(10).map(function (i) { var p = 'b6_ed' + i; return { r: String(i), k: [p + '_titulo', p + '_pilar', p + '_formato', p + '_canal', p + '_data', p + '_freq', p + '_resp', p + '_kpi'] }; }) } ] },
      { id: 'integrada', n: '6.6', titulo: 'Comunicação integrada por canal',
        dica: 'A mesma essência em vozes diferentes: para cada canal prioritário do Bloco 3, o papel, o conteúdo e como o tom de voz se manifesta ali.',
        itens: [
          { t: 'trazer', r: '↻ Trazer os canais prioritários da E3', de: 'e3', mapa: {
            b6_ci1_canal: 'b3_canal1_nome', b6_ci2_canal: 'b3_canal2_nome', b6_ci3_canal: 'b3_canal3_nome', b6_ci4_canal: 'b3_canal4_nome',
            b6_ci1_papel: 'b3_canal1_papel', b6_ci2_papel: 'b3_canal2_papel', b6_ci3_papel: 'b3_canal3_papel', b6_ci4_papel: 'b3_canal4_papel' } },
          { t: 'tabela', cols: [
            { r: 'Canal', w: '15%' }, { r: 'Etapa do funil', tipo: 'opcoes', op: ['Atração', 'Consideração', 'Conversão', 'Retenção', 'Advocacy'], w: '13%' },
            { r: 'Papel / objetivo neste canal' }, { r: 'Tipo de conteúdo / ação' }, { r: 'Tom específico neste canal' }],
            linhas: seq(4).map(function (i) { var p = 'b6_ci' + i; return { r: String(i), k: [p + '_canal', p + '_funil', p + '_papel', p + '_conteudo', p + '_tom'] }; }) }
        ] },
      { id: 'checklist', n: '✓', titulo: 'Checklist de coerência antes de entregar',
        itens: [ { t: 'checklist', itens: [
          ['e5_chk1', 'A identidade de marca é específica da empresa parceira, não uma lista de adjetivos genéricos.'],
          ['e5_chk2', 'O tom de voz é coerente com o arquétipo de marca.'],
          ['e5_chk3', 'A mensagem central é reconhecível na declaração de posicionamento.'],
          ['e5_chk4', 'O plano editorial usa os pilares de conteúdo definidos.'],
          ['e5_chk5', 'Os canais da comunicação integrada são os canais prioritários do Bloco 3.'],
          ['e5_chk6', 'A comunicação fala com a persona escolhida, não com "todo mundo".']
        ] } ] }
    ]
  };

  /* =====================================================================
   * E6 · Governança, síntese e pitch (Bloco 7 + síntese final)
   * ===================================================================== */
  var PITCH = [['Contexto e objetivo do plano', '2 min'], ['Análise de mercado e SWOT de marketing: o que descobrimos', '4 min'], ['Segmento, persona e posicionamento proposto', '4 min'],
    ['Mix de marketing: o que sugerimos ajustar', '5 min'], ['Objetivos, KPIs e as três ações prioritárias', '5 min'], ['Identidade de comunicação e plano editorial', '3 min'], ['Governança: como implementar e medir', '2 min']];
  var E6 = {
    id: 'e6', codigo: 'E6', titulo: 'Governança, síntese e pitch',
    etapa: 'Etapa 7 · Aulas 19 e 20', bloco: 'Bloco 7 · Governança + síntese final',
    pergunta: 'Como vamos acompanhar e ajustar o plano? Ele está coerente do início ao fim?',
    resumo: 'O painel de acompanhamento, os rituais de gestão, o roadmap em três fases, a síntese do plano e a preparação do pitch para a empresa parceira.',
    leituras: [],
    leiturasEmBreve: ['Governança simplificada, síntese e preparação do pitch (Aula 19)'],
    secoes: [
      { id: 'painel', n: '7.1', titulo: 'Painel de acompanhamento',
        dica: 'Os mesmos 3 a 5 KPIs da E4 (4.3). É o painel que os rituais abaixo vão usar para comparar meta e realizado.',
        itens: [
          { t: 'trazer', r: '↻ Trazer KPIs e metas da E4', de: 'e4', mapa: {
            b7_dash1_kpi: 'b4_kpi1_nome', b7_dash1_meta: 'b4_kpi1_meta', b7_dash2_kpi: 'b4_kpi2_nome', b7_dash2_meta: 'b4_kpi2_meta',
            b7_dash3_kpi: 'b4_kpi3_nome', b7_dash3_meta: 'b4_kpi3_meta', b7_dash4_kpi: 'b4_kpi4_nome', b7_dash4_meta: 'b4_kpi4_meta',
            b7_dash5_kpi: 'b4_kpi5_nome', b7_dash5_meta: 'b4_kpi5_meta' } },
          { t: 'tabela', cols: [{ r: 'KPI', tipo: 'linha' }, { r: 'Meta', tipo: 'linha' }, { r: 'Frequência de acompanhamento', tipo: 'linha', ph: 'Semanal, mensal...' }, { r: 'Critério de alerta', tipo: 'linha', ph: 'Quando acender o sinal amarelo?' }, { r: 'Realizado / último valor', tipo: 'linha' }],
            linhas: seq(5).map(function (i) { var p = 'b7_dash' + i; return { r: String(i), k: [p + '_kpi', p + '_meta', p + '_freq', p + '_alerta', p + '_real'] }; }) }
        ] },
      { id: 'rituais', n: '7.2', titulo: 'Rituais de gestão',
        dica: 'Um plano sem rituais de revisão morre na gaveta. Quem, quando e o quê — de forma realista para uma PME, sem estrutura corporativa.',
        itens: [ { t: 'tabela', cols: [
          { r: 'Ritual', w: '18%', ph: '' }, { r: 'Frequência', w: '11%' }, { r: 'Pauta' }, { r: 'Decisão esperada' }, { r: 'Responsável', w: '14%' }],
          linhas: [['Revisão semanal de KPIs', 'Semanal', 'KPIs de processo, desvios...', 'Ajuste de campanha...'],
            ['Revisão mensal de resultados', 'Mensal', 'KPIs de resultado, orçamento...', 'Realocação de orçamento...'],
            ['Revisão trimestral do plano', 'Trimestral', 'Validade dos objetivos...', 'Continuidade ou ajuste estratégico...']]
            .map(function (r, i) { var p = 'b7_rit' + (i + 1); return { r: String(i + 1), ph: [r[0], r[1], r[2], r[3], ''], k: [p + '_nome', p + '_freq', p + '_pauta', p + '_decisao', p + '_resp'] }; }) } ] },
      { id: 'roadmap', n: '7.3', titulo: 'Roadmap de implementação',
        dica: 'As ações da E4 organizadas em três fases, cada uma com KPIs e responsável.',
        itens: [ { t: 'tabela', largo: true, cols: [
          { r: 'Ação 1' }, { r: 'Ação 2' }, { r: 'Ação 3' }, { r: 'Ação 4' }, { r: 'KPIs a acompanhar' }, { r: 'Responsável', w: '12%' }],
          linhas: [['Fase 1 · Fundação', 'Mês 1: quick wins e estrutura mínima'], ['Fase 2 · Crescimento', 'Meses 2 a 4'], ['Fase 3 · Escala', 'Meses 5 a 12']]
            .map(function (f, i) { var p = 'b7_fase' + (i + 1); return { r: f[0], d: f[1], k: [p + '_a1', p + '_a2', p + '_a3', p + '_a4', p + '_kpis', p + '_resp'] }; }) } ] },
      { id: 'sintese', n: '✦', titulo: 'Síntese final do plano',
        dica: 'O plano está coerente do início ao fim? Respondam com honestidade: é isso que a empresa vai perguntar no pitch.',
        itens: [
          { k: 'sint_hipotese', r: 'Qual é a hipótese central do plano?' },
          { k: 'sint_risco', r: 'Qual é o maior risco do plano? O que pode não funcionar?' },
          { k: 'sint_sinal30d', r: 'Qual será o primeiro sinal de que está funcionando, em 30 dias?' },
          { k: 'sint_3acoes', r: 'Se tivessem que escolher apenas 3 ações para o primeiro mês, quais seriam?' }
        ] },
      { id: 'coerencia', n: '✓', titulo: 'Checklist de coerência do plano',
        dica: 'Cada "não" aponta exatamente onde o fio do posicionamento se rompeu.',
        itens: [
          { t: 'checklist', itens: [
            ['e6_coer1', 'A persona escolhida aparece na jornada do cliente?'],
            ['e6_coer2', 'A declaração de posicionamento aparece em cada P do mix?'],
            ['e6_coer3', 'Os canais de comunicação são coerentes com onde a persona está?'],
            ['e6_coer4', 'Os objetivos SMART são mensuráveis com os KPIs definidos?'],
            ['e6_coer5', 'As ações prioritárias do ICE Score aparecem no 5W2H?'],
            ['e6_coer6', 'Cada linha do 5W2H tem um custo correspondente no orçamento?'],
            ['e6_coer7', 'O tom de voz da comunicação é coerente com o arquétipo de marca?'],
            ['e6_coer8', 'O plano editorial usa os pilares de conteúdo definidos?'],
            ['e6_coer9', 'O painel de KPIs tem metas derivadas dos objetivos SMART?'],
            ['e6_coer10', 'O roadmap tem responsáveis identificados para cada fase?']
          ] },
          { t: 'tabela', r: 'Situação de cada bloco', relatorio: false, cols: [{ r: 'Situação', tipo: 'opcoes', op: STATUS_BLOCO, w: '40%' }],
            linhas: [['chk_b1', 'Bloco 1 · Análise situacional (E1)'], ['chk_b2', 'Bloco 2 · Segmento e posicionamento (E2)'], ['chk_b3', 'Bloco 3 · Mix de marketing (E3)'],
              ['chk_b4', 'Bloco 4 · Objetivos e KPIs (E4)'], ['chk_b5', 'Bloco 5 · Plano de ações (E4)'], ['chk_b6', 'Bloco 6 · Comunicação e marca (E5)'],
              ['chk_b7', 'Bloco 7 · Governança (E6)'], ['chk_coer', 'Coerência do plano']].map(function (b) { return { r: b[1], k: [b[0]] }; }) }
        ] },
      { id: 'pitch', n: '▶', titulo: 'Preparação do pitch final',
        dica: '25 minutos de apresentação e 10 de perguntas, com o responsável da empresa presente. O professor pode dirigir perguntas a qualquer integrante: todos precisam saber defender qualquer parte.',
        itens: [ { t: 'tabela', relatorio: false, cols: [
          { r: 'Mensagem principal: o que a empresa precisa levar' }, { r: 'Quem apresenta', tipo: 'linha', w: '14%' }, { r: 'Pergunta difícil provável e a resposta do grupo' }],
          linhas: PITCH.map(function (p, i) { var k = 'e6_pitch' + (i + 1); return { r: p[0], d: p[1], k: [k + '_msg', k + '_quem', k + '_perg'] }; }) } ] }
    ],
    importar: function (j, out) {
      var st = j.__checkStates || {};
      ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'coer'].forEach(function (b) { if (st[b]) out['chk_' + b] = st[b]; });
    }
  };

  /* ---------------- funções usadas pelos botões "Trazer" ---------------- */
  function juntar(pares) {
    return pares.filter(function (p) { return p[1]; }).map(function (p) { return p[0] + ': ' + p[1]; }).join('\n');
  }
  function topIce(pos) {
    return function (c) {
      var l = [];
      for (var i = 1; i <= 10; i++) {
        var s = Number(c['b5_ice' + i + '_imp']) * Number(c['b5_ice' + i + '_conf']) * Number(c['b5_ice' + i + '_fac']);
        if (c['b5_ice' + i + '_acao'] && s > 0) l.push({ a: c['b5_ice' + i + '_acao'], s: s, i: i });
      }
      l.sort(function (x, y) { return y.s - x.s || x.i - y.i; });
      return l[pos] ? l[pos].a : '';
    };
  }

  window.PM = window.PM || {};
  window.PM.LEITURAS = L;
  window.PM.ORDEM = ['e0', 'roteiro', 'auditoria', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6'];
  window.PM.ENTREGAS = ['e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6'];
  window.PM.ESPEC = { e0: E0, roteiro: ROTEIRO, auditoria: AUDITORIA, e1: E1, e2: E2, e3: E3, e4: E4, e5: E5, e6: E6 };
})();
