export type CompetencyPillar =
  | 'Segurança & Acesso'
  | 'Normas & Tipos Processuais'
  | 'Documentos & Blocos'
  | 'Tramitação & Integridade';

export interface DiagnosticQuestion {
  id: number;
  topic: string;
  pillar: CompetencyPillar;
  complexity: 'Básica / Conceitual' | 'Intermediária / Aplicação' | 'Avançada / Análise';
  points: number;
  stem: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StudentAttemptLog {
  attemptNumber: number;
  score: number;
  tier: 'Iniciante' | 'Intermediário' | 'Avançado';
  patentTitle: string;
  intimacyLevel: string;
  completedAt: string;
  date: string;
  avgTimeSec?: number;
  maxStreak?: number;
  correctCount: number;
  totalQuestions: number;
  pillarScores: Record<CompetencyPillar, number>;
  unlockedBadges?: string[];
}

export interface ClassStudentRecord {
  id: string;
  name: string;
  registration: string;
  cohort: string;
  score: number;
  tier: 'Iniciante' | 'Intermediário' | 'Avançado';
  completedAt: string;
  avgTimeSec?: number;
  maxStreak?: number;
  pillarScores: Record<CompetencyPillar, number>; // 0-100% per pillar
  attemptsCount?: number;
  history?: StudentAttemptLog[];
}

export interface DiagnosticAssessment {
  id: string;
  title: string;
  subtitle: string;
  subjectArea: string;
  estimatedMinutes: number;
  sourceMaterial: string;
  questions: DiagnosticQuestion[];
  initialClassRoster: ClassStudentRecord[];
}

export const COMPETENCY_PILLARS: CompetencyPillar[] = [
  'Segurança & Acesso',
  'Normas & Tipos Processuais',
  'Documentos & Blocos',
  'Tramitação & Integridade',
];

export const MILITARY_RANKS = [
  'SD PM',
  'CB PM',
  '3º SGT PM',
  '2º SGT PM',
  '1º SGT PM',
  'ST PM',
  'ASP PM',
  '2º TEN PM',
  '1º TEN PM',
  'CAP PM',
  'MAJ PM',
  'TC PM',
  'CEL PM',
];

export const INSTRUCTOR_RECORD: ClassStudentRecord = {
  id: 'instructor-gregorio',
  name: '1º SGT PM GREGÓRIO',
  registration: 'INST-CAS-2026',
  cohort: 'CAS PMPE 2026',
  score: 100,
  tier: 'Avançado',
  completedAt: '08:00',
  avgTimeSec: 5,
  maxStreak: 10,
  pillarScores: {
    'Segurança & Acesso': 100,
    'Normas & Tipos Processuais': 100,
    'Documentos & Blocos': 100,
    'Tramitação & Integridade': 100,
  },
  attemptsCount: 1,
  history: [
    {
      attemptNumber: 1,
      score: 100,
      tier: 'Avançado',
      patentTitle: 'Especialista / Gestor SEI',
      intimacyLevel: 'Avançado / Com Intimidade',
      completedAt: '08:00',
      date: '26/10/2026',
      avgTimeSec: 5,
      maxStreak: 10,
      correctCount: 10,
      totalQuestions: 10,
      pillarScores: {
        'Segurança & Acesso': 100,
        'Normas & Tipos Processuais': 100,
        'Documentos & Blocos': 100,
        'Tramitação & Integridade': 100,
      },
      unlockedBadges: [
        'SEI Master',
        'Guardião do Sigilo',
        'Operador Ágil',
        'Combo Perfeito',
        'Perícia Documental',
        'Mestre dos Blocos',
      ],
    },
  ],
};

export const PRESET_ASSESSMENTS: DiagnosticAssessment[] = [
  {
    id: 'operacao-sei-em-foco-pmpe',
    title: 'Operação SEI em Foco: Desafio Diagnóstico PMPE',
    subtitle:
      'Missão de Sondagem Diagnóstica do Curso de Aperfeiçoamento de Sargentos (CAS PMPE 2026) baseada estritamente na Apostila de Documentação Técnica — SEI (Decreto nº 45.157/2017 e Portaria SAD nº 123/2020).',
    subjectArea: 'CAS PMPE 2026 · Polícia Militar de Pernambuco',
    estimatedMinutes: 10,
    sourceMaterial: `APOSTILA — CURSO DE APERFEIÇOAMENTO DE SARGENTOS (CAS PM-2026)
DOCUMENTAÇÃO TÉCNICA — SEI (POLÍCIA MILITAR DE PERNAMBUCO)
Conteudistas: Ten Cel QOPM Ramona Tavares de Lemos e Sgt QPMG João Carlos Rodrigues da Silva.

1. LEGISLAÇÃO E FUNDAMENTOS (DECRETO Nº 45.157/2017 E PORTARIA SAD Nº 123/2020):
- O SEI foi integrado ao Estado de Pernambuco pelo Decreto nº 45.157, de 23 de outubro de 2017, regulamentado pela Portaria SAD nº 123, de 22 de janeiro de 2020.
- Acesso e Assinatura (Art. 5º e Art. 11 da Portaria 123/2020): Vinculados ao login e senha do correio eletrônico oficial (Expresso.PE), de uso pessoal e intransferível. Modalidades de assinatura eletrônica: assinatura digital (certificado ICP-Brasil) e assinatura cadastrada (login e senha). A autenticidade é verificada pelos Códigos Verificador e CRC na tarja de assinatura.
- Limite de Arquivo Externo (Art. 14 § 1º): 200 megabytes (MB) por arquivo, devendo ser particionado se ultrapassar (Ex: SEI 1-2; SEI 2-2). É vedada a inclusão de documento externo protegido por senha (Art. 16).
- Digitalização (Art. 21): Formato PDF com processamento de OCR (Reconhecimento Óptico de Caracteres) e resolução mínima de 300 dpi.

2. SEGURANÇA E ACESSO (SIP, NSI/DTEC E 2FA):
- SIP (Sistema Interno de Permissões): Controla o SEI (libera permissões, cadastra usuários, cria unidades setoriais e hierarquias). Na PMPE, a função de NSI (Núcleo Setorial de Informática) pertence à DTEC, e a liberação do usuário nas unidades é associada aos remanejamentos definidos pela DGP-2. O cadastro de Administrador SEI/SIP fica a cargo da ATI/PE.
- Perfis de Acesso (Art. 6º): I - básico; II - colaborador (básico sem assinatura: não tramita e nem assina documentos); III - administrador; IV - administrador setorial; V - usuário externo.
- Autenticação em 2 Fatores (2FA): Requer aplicativo autenticador (Google/Microsoft Authenticator) via leitura de QR Code e cadastro de e-mail pessoal não institucional com senha diferente da senha do SEI. O código de 6 dígitos muda a cada 30 segundos, mas o sistema aceita qualquer código gerado nos últimos 90 segundos.

3. GESTÃO DE DOCUMENTOS (NATO-DIGITAL VS. DIGITALIZADO):
- Documento Nato-Digital: Criado originariamente em meio eletrônico ou que possua código de validação digital (ex: contracheques, Notas Fiscais Eletrônicas), mesmo se escaneado.
- Documento Digitalizado nesta Unidade: Obtido da conversão de suporte físico sem código de validação (ex: certidões, declarações, RG). Deve ser obrigatoriamente autenticado por servidor público ou cargo comissionado, sendo VEDADA essa operação para estagiários, jovens aprendizes e prestadores de serviço terceirizados.
- Valor Legal (Art. 12 § 2º do Decreto 45.157): Digitalização de originais = cópia autenticada administrativamente; digitalização de cópia autenticada em cartório, autenticada administrativamente ou cópia simples = valor de cópia simples.

4. TIPOS E REGRAS DE PROCESSOS (PÚBLICO, RESTRITO E SIGILOSO):
- Público: Visualizado e pesquisado nos meios interno e externo sem restrição.
- Restrito: Conteúdo visualizado apenas pelas unidades por onde houve tramitação/guarda (requer justificativa/Hipótese Legal, ex: documentos preparatórios ou informação pessoal). O trâmite (histórico de passagem) pode ser visto por qualquer usuário.
- Sigiloso: Direcionado à PESSOA (servidor credenciado) e não ao setor/unidade. Outros servidores do mesmo setor não o visualizam. Identificado por tarja vermelha e ícone de Chave/Segredo. Não aparece o ícone "Enviar Processo", sendo substituído por "Gerenciar Credenciais de Acesso" e "Renunciar Credenciais de Acesso". O processo Sigiloso pode descer de nível (para restrito ou público), mas o contrário não pode acontecer.

5. COMPORTAMENTO DO SISTEMA (ANEXADO VS. RELACIONADO):
- Processo Relacionado: Caminha por vias diferentes e independentes (associação para facilitar busca de informações; exige que ambos estejam abertos na mesma unidade no momento de relacionar).
- Processo Anexado: Mesmo interessado e mesmo assunto; o processo anexado caminha subordinado como "escravo" dentro do Processo Mater. Apenas o Gestor Setorial do SEI (ou a ATI via chamado) pode realizar a desanexação justificada.

6. BLOCOS E TRAMITAÇÃO (INTERNO, ASSINATURA E REUNIÃO):
- Bloco Interno: Gaveta virtual para organização e armazenamento de processos dentro da unidade (na versão 4.0 pode ser atribuído a um servidor).
- Bloco de Assinatura: Análogo à Pasta de Despacho para disponibilizar minutas de documentos para assinatura por servidores de outras unidades (permite assinatura simultânea em lote). Estados: Gerado, Disponibilizado, Recebido e Retornado.
- Bloco de Reunião: Compartilha processos com outros setores para visualização de minutas/documentos ainda não assinados para pauta de deliberação.

7. EDITOR, AUTOMAÇÃO E INTEGRIDADE PROCESSUAL:
- Documento Modelo vs. Texto Padrão: Documento Modelo replica a estrutura de um documento já existente; Texto Padrão utiliza comandos/variáveis de preenchimento automático do SEI entre arrobas, como @dia@ de @mes_extenso@ de @ano@.
- Atualizar Andamento vs. Despacho: "Atualizar Andamento" serve para registro resumido e comunicação informal (uma vez salvo, não pode ser apagado ou alterado). Despachos formais (determinação e cumprimento) devem ser gerados como documento "Despacho" na árvore do processo.
- Exclusão vs. Cancelamento: Processos e documentos só podem ser EXCLUÍDOS enquanto não forem movimentados/tramitados. Uma vez tramitado para outra unidade, o processo não pode ser excluído (apenas concluído), e o documento só poderá ser CANCELADO mediante justificativa obrigatória no campo Motivo.`,
    questions: [
      {
        id: 1,
        topic: 'Legislação e Fundamentos',
        pillar: 'Normas & Tipos Processuais',
        complexity: 'Básica / Conceitual',
        points: 10,
        stem: 'Segundo o Decreto Estadual nº 45.157/2017 e a Portaria SAD nº 123/2020 (Arts. 5º, 11, 14 e 21), quais são as regras oficiais sobre credencial de acesso, tamanho máximo de arquivo externo e padrão de digitalização no SEI PERNAMBUCO?',
        options: [
          'Login via CPF com senha compartilhada por seção; limite de 50 MB por arquivo; digitalização em formato JPG a 150 dpi sem OCR.',
          'Login e senha vinculados ao Expresso.PE (uso pessoal e intransferível); limite de 200 MB por arquivo externo (vedado arquivo com senha); e digitalização em PDF com OCR e resolução mínima de 300 dpi.',
          'Acesso exclusivo por token USB; limite irrestrito de tamanho de arquivo; digitalização obrigatória de jornais, revistas e correspondências pessoais.',
          'Login via conta Google pessoal; limite de 500 MB protegido por senha ZIP; digitalização em preto e branco a 72 dpi.'
        ],
        correctIndex: 1,
        explanation: 'Fundamentação (Portaria SAD nº 123/2020, Arts. 5º, 11, 14 §1º, 16 e 21): O acesso e a assinatura cadastrada utilizam o login pessoal e intransferível do Expresso.PE; arquivos externos têm limite de 200 MB (particionando se exceder, ex: SEI 1-2), sendo proibidos arquivos com senha, e a digitalização exige PDF com OCR a no mínimo 300 dpi.'
      },
      {
        id: 2,
        topic: 'Segurança e Acesso (SIP vs. SEI)',
        pillar: 'Segurança & Acesso',
        complexity: 'Básica / Conceitual',
        points: 10,
        stem: 'Na estrutura de governança da PMPE descrita na apostila DTSEI (pág. 7 e 14), qual é a função do SIP (Sistema Interno de Permissões), a quem pertence o NSI (Núcleo Setorial de Informática) na Corporação e o que caracteriza o perfil "Colaborador"?',
        options: [
          'O SIP edita textos de ofícios; o NSI pertence à Diretoria de Finanças; e o perfil Colaborador pode assinar inquéritos sigilosos.',
          'O SIP controla o SEI (libera permissões, cadastra usuários e hierarquias conforme movimentações da DGP-2); na PMPE o NSI pertence à DTEC; e o perfil Colaborador é o "básico sem assinatura" (não tramita nem assina documentos).',
          'O SIP é o banco de dados de treinamento; o NSI é gerido pelo TRF4; e o perfil Colaborador é exclusivo para cidadãos externos.',
          'O SIP serve apenas para leitura de Diário Oficial; o NSI pertence ao Comando Geral; e o perfil Colaborador permite excluir processos já tramitados.'
        ],
        correctIndex: 1,
        explanation: 'Fundamentação (Apostila DTSEI, págs. 7 e 14; Portaria 123/2020, Arts. 6º e 8º): O SIP gerencia permissões e hierarquias de unidades (associadas às transferências da DGP-2). Na PMPE a função de NSI cabe à DTEC, enquanto o cadastro de Administrador SIP/SEI cabe à ATI/PE. O perfil Colaborador não tramita nem assina documentos.'
      },
      {
        id: 3,
        topic: 'Autenticação em 2 Fatores (2FA)',
        pillar: 'Segurança & Acesso',
        complexity: 'Intermediária / Aplicação',
        points: 10,
        stem: 'Ao habilitar a Autenticação em 2 Fatores (2FA) no SEI 4.0 (págs. 15 a 19 da apostila), quais requisitos de segurança devem ser observados quanto ao e-mail de ativação e à validade temporal do código gerado no smartphone?',
        options: [
          'Informar e-mail NÃO associado à instituição (ex: Gmail, Hotmail) com senha diferente da senha do SEI; o código de 6 dígitos muda a cada 30 segundos, mas o sistema aceita qualquer código gerado nos últimos 90 segundos.',
          'Usar obrigatoriamente o e-mail institucional (@pm.pe.gov.br) com a mesma senha do Expresso.PE; o código expira rigorosamente em 10 segundos.',
          'Não cadastrar nenhum e-mail, pois a desativação em caso de perda do celular só ocorre presencialmente na sede da ATI.',
          'Vincular o número de telefone via SMS; uma vez liberado o navegador, os cookies nunca expiram mesmo após limpeza do histórico.'
        ],
        correctIndex: 0,
        explanation: 'Fundamentação (Apostila DTSEI, págs. 17 e 18): Na finalização do cadastro 2FA é imprescindível informar um e-mail externo à instituição e com senha diferente da senha do SEI. O código muda a cada 30s no app autenticador, mas o SEI aceita os códigos gerados nos últimos 90 segundos.'
      },
      {
        id: 4,
        topic: 'Nato-Digital vs. Digitalizado',
        pillar: 'Documentos & Blocos',
        complexity: 'Intermediária / Aplicação',
        points: 10,
        stem: 'Sobre a inclusão de Documento Externo no SEI (pág. 4 e pág. 45 da apostila), qual é a diferença prática entre "Nato-digital" e "Digitalizado nesta Unidade" e quem pode realizar a autenticação administrativa?',
        options: [
          'Todo documento escaneado na seção é "Digitalizado nesta Unidade"; a autenticação pode ser feita por estagiários, jovens aprendizes e terceirizados.',
          'Documentos com código de validação própria (como contracheques e Notas Fiscais Eletrônicas) são considerados Nato-Digitais mesmo se escaneados; já os "Digitalizados nesta Unidade" não possuem código de validação e exigem autenticação obrigatória por servidor público ou comissionado (vedada a estagiários e terceirizados).',
          'A digitalização de uma cópia simples transforma o arquivo automaticamente em documento original com fé pública irrestrita.',
          'Documentos Nato-Digitais exigem carimbo físico de confere com o original antes de serem salvos em PDF.'
        ],
        correctIndex: 1,
        explanation: 'Fundamentação (Apostila DTSEI, pág. 45 e Decreto 45.157, Art. 12 §2º): Contracheques e NF-e possuem código de validação e entram como Nato-Digitais. Documentos sem código de validação (certidões, declarações) entram como "Digitalizado nesta Unidade" e devem ser obrigatoriamente autenticados por servidor efetivo ou comissionado, sendo vedado a estagiários, jovens aprendizes e terceirizados.'
      },
      {
        id: 5,
        topic: 'Público, Restrito e Sigiloso',
        pillar: 'Normas & Tipos Processuais',
        complexity: 'Avançada / Análise',
        points: 10,
        stem: 'Na classificação quanto ao Nível de Acesso (Arts. 43 a 46 da Portaria 123/2020 e págs. 25, 26, 50 e 51 da apostila), como o SEI trata os processos Públicos, Restritos e Sigilosos?',
        options: [
          'O processo Sigiloso é visualizado por todos os policiais da mesma seção; já o processo Público pode ser transformado diretamente em Sigiloso sem justificativa.',
          'O processo Restrito restringe o conteúdo às unidades por onde tramita (exigindo Hipótese Legal), mas seu trâmite é visível; já o Sigiloso (tarja vermelha e ícone de chave) é direcionado à PESSOA credenciada e não ao setor, substitui o botão "Enviar Processo" por "Gerenciar Credenciais de Acesso", e pode descer de nível (para restrito/público), mas o contrário não pode ocorrer.',
          'A inclusão de um documento restrito ou sigiloso em um processo público mantém todos os demais documentos abertos ao público externo.',
          'O documento sigiloso pode ser desclassificado por qualquer usuário básico de qualquer unidade da PMPE.'
        ],
        correctIndex: 1,
        explanation: 'Fundamentação (Apostila DTSEI, págs. 25, 26, 50 e 51; Portaria 123/2020, Arts. 45 e 46): O processo Sigiloso é tramitado de pessoa para pessoa via "Gerenciar/Renunciar Credenciais de Acesso" (outros servidores do setor não o veem) e exibe ícone de chave. Conforme a #FICAADICA da pág. 26, o processo Sigiloso pode descer de nível para restrito ou público, mas o contrário não pode acontecer.'
      },
      {
        id: 6,
        topic: 'Anexado vs. Relacionado',
        pillar: 'Tramitação & Integridade',
        complexity: 'Intermediária / Aplicação',
        points: 10,
        stem: 'Qual é a diferença técnica entre "Processo Relacionado" e "Processo Anexado" no SEI (págs. 29 a 31 da apostila e Arts. 34 a 36 da Portaria 123/2020)?',
        options: [
          'O Processo Relacionado caminha por vias separadas e autônomas (exigindo que estejam abertos na mesma unidade para relacionar); já o Processo Anexado passa a caminhar subordinado como "escravo" dentro do Processo Mater, e sua desanexação só pode ser feita pelo Gestor Setorial do SEI (ou ATI via chamado).',
          'O Processo Anexado permite que cada processo siga para um Batalhão diferente simultaneamente, enquanto o Relacionado funde os arquivos PDF.',
          'Qualquer servidor com perfil básico pode desanexar um processo a qualquer momento clicando no ícone de lixeira.',
          'Dois processos podem ser relacionados mesmo que estejam abertos apenas em Secretarias diferentes e classificados como restritos.'
        ],
        correctIndex: 0,
        explanation: 'Fundamentação (Apostila DTSEI, págs. 29 a 31; Portaria 123/2020, Arts. 34 a 36): Processos relacionados mantêm tramitação independente (mas só podem ser relacionados se estiverem abertos na mesma unidade). O processo anexado incorpora-se ao Processo Mater ("escravo") e apenas o Gestor Setorial do SEI (ou a ATI) possui competência para desanexá-lo.'
      },
      {
        id: 7,
        topic: 'Blocos Interno, Assinatura e Reunião',
        pillar: 'Documentos & Blocos',
        complexity: 'Intermediária / Aplicação',
        points: 10,
        stem: 'Sobre a utilização de Blocos no SEI 4.0 (págs. 32 a 34 e 46 a 49 da apostila), assinale a alternativa que associa corretamente o tipo de bloco à sua finalidade operacional na PMPE:',
        options: [
          'Bloco Interno serve para colar assinaturas externas; Bloco de Assinatura arquiva processos concluídos; e Bloco de Reunião realiza videoconferências.',
          'Bloco Interno atua como "gaveta virtual" para armazenar processos na unidade; Bloco de Assinatura (análogo à Pasta de Despacho) agrupa documentos para assinatura em lote ou por outra unidade; e Bloco de Reunião compartilha processos com outros setores para visualizar minutas ainda não assinadas.',
          'Documentos inseridos em Bloco de Assinatura já não podem sofrer qualquer edição, mesmo antes de serem assinados.',
          'Na versão 4.0 do SEI é proibido atribuir um Bloco Interno ou um Bloco de Assinatura a um servidor específico da unidade.'
        ],
        correctIndex: 1,
        explanation: 'Fundamentação (Apostila DTSEI, págs. 29, 32, 34, 46 e 48): O Bloco Interno organiza processos na unidade (gaveta virtual); o Bloco de Assinatura substitui a antiga Pasta de Despacho física, permitindo inclusive assinar todos os documentos simultaneamente ou editá-los enquanto não assinados; e o Bloco de Reunião permite que outros setores visualizem documentos não assinados.'
      },
      {
        id: 8,
        topic: 'Documento Modelo vs. Texto Padrão',
        pillar: 'Documentos & Blocos',
        complexity: 'Básica / Conceitual',
        points: 10,
        stem: 'Ao gerar um documento interno (ex: GOVPE - CI), o operador pode escolher entre "Documento Modelo" e "Texto Padrão" (págs. 37, 49 e 50 da apostila). Qual é o diferencial técnico do Texto Padrão?',
        options: [
          'O Texto Padrão bloqueia o editor de texto e impede qualquer digitação manual pelo sargento.',
          'Enquanto o Documento Modelo apenas replica um documento anterior exigindo reformular todo o conteúdo, o Texto Padrão permite construir a estrutura utilizando comandos/variáveis de atualização automática do SEI, como `@dia@ de @mes_extenso@ de @ano@`.',
          'O Documento Modelo só funciona para arquivos externos em PDF, e o Texto Padrão é exclusivo para planilhas Excel.',
          'O Texto Padrão altera automaticamente o modelo no banco de dados da ATI para todas as Secretarias do Estado.'
        ],
        correctIndex: 1,
        explanation: 'Fundamentação (Apostila DTSEI, págs. 49 e 50): O Documento Modelo baseia-se em um documento já criado na unidade cujo conteúdo precisa ser reescrito. Já o Texto Padrão utiliza variáveis dinâmicas do SEI (acessíveis no ícone "?") como @dia@ de @mes_extenso@ de @ano@, @timbre_orgao@, @sigla_unidade@, etc.'
      },
      {
        id: 9,
        topic: 'Atualizar Andamento e Prazos',
        pillar: 'Tramitação & Integridade',
        complexity: 'Avançada / Análise',
        points: 10,
        stem: 'Analise as normas de tramitação (Arts. 25, 26, 29 e 30 da Portaria 123/2020 e págs. 27 e 29 da apostila) sobre o uso da função "Atualizar Andamento" e a contagem de prazos em caso de indisponibilidade do sistema:',
        options: [
          'A função "Atualizar Andamento" deve ser utilizada para redigir despachos longos e decisórios, podendo ser apagada a qualquer tempo pelo autor.',
          'Não se deve usar o "Atualizar Andamento" para despachos formais (que são vias de mão dupla e devem compor a árvore do processo), pois o texto registrado no andamento jamais pode ser apagado ou alterado; quanto aos prazos que vencerem no dia de indisponibilidade superior a 60 min (entre 06h e 23h) ou ocorrida entre 23h e 24h, prorrogam-se para o dia útil seguinte.',
          'Os atos processuais no SEI só são tempestivos se praticados até as 17h00min do dia do vencimento.',
          'Em caso de erro na tramitação de um processo, a unidade recebedora deve excluir o processo imediatamente na lixeira.'
        ],
        correctIndex: 1,
        explanation: 'Fundamentação (Apostila DTSEI, págs. 10, 27 e 29; Portaria 123/2020, Arts. 25, 26 e 30): Despachos de determinação e cumprimento pertencem à árvore do processo; registros em Atualizar Andamento são imutáveis. O ato é tempestivo até 23h59min, e indisponibilidades > 60 min (das 06h às 23h) ou entre 23h e 24h prorrogam o prazo para o próximo dia útil.'
      },
      {
        id: 10,
        topic: 'Exclusão vs. Cancelamento e Versões',
        pillar: 'Tramitação & Integridade',
        complexity: 'Avançada / Análise',
        points: 10,
        stem: 'Sobre a integridade processual no SEI (págs. 31, 42 e 43 da apostila), quando é permitido EXCLUIR um processo ou documento, o que ocorre após o trâmite para outra unidade e qual a regra sobre "Comparar Versões"?',
        options: [
          'Processos e documentos só podem ser EXCLUÍDOS enquanto não forem movimentados/tramitados; após o processo tramitar para outra unidade, ele não pode mais ser excluído e o documento só poderá ser CANCELADO (preenchendo o campo Motivo); além disso, as versões de documentos só podem ser comparadas nos documentos elaborados pela sua própria unidade.',
          'Documentos assinados podem ser excluídos da árvore a qualquer momento, mesmo após o processo ter passado por cinco unidades diferentes.',
          'O cancelamento de um documento dispensa justificativa e apaga todo o histórico na Consulta de Andamento.',
          'Qualquer unidade pode comparar todas as versões intermediárias de edição de documentos produzidos por outros órgãos.'
        ],
        correctIndex: 0,
        explanation: 'Fundamentação (Apostila DTSEI, págs. 31, 42 e 43): A exclusão (lixeira) só é permitida antes da tramitação. Uma vez tramitado o processo, garante-se a integridade: o processo só pode ser concluído e o documento apenas CANCELADO mediante justificativa no campo Motivo. E conforme a #FICAADICA da pág. 42, versões de documentos só podem ser comparadas nos documentos elaborados pela própria unidade.'
      },
    ],
    initialClassRoster: [INSTRUCTOR_RECORD],
  },
];
