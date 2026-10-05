import {
  BillingInvoice,
  Episode,
  Guest,
  LibraryAsset,
  Organization,
  PaymentGatewayEvent,
  Production,
  SaaSPlanDefinition,
  SaaSSubscription,
  ScheduleEvent,
  Show,
  User,
  UserShowPermission,
} from '../domain/contracts';

/**
 * RSPlay TV SaaS — Official Monthly Subscription Plans
 */
export const RSPLAY_SAAS_PLANS: SaaSPlanDefinition[] = [
  {
    id: 'rsplay_programa_individual',
    name: 'Plano Programa Individual',
    tagline: 'Ideal para 1 programa independente com login dedicado e estúdio multicâmera.',
    monthlyPriceCents: 49000, // R$ 490,00 / mês
    maxShows: 1,
    maxUsers: 4,
    features: [
      '1 Programa liberado com login e permissões isoladas',
      'Até 4 contas de acesso (Apresentador, Produtor, Editor, Diretor)',
      'Modo Estúdio Ao Vivo com Teleprompter e 3 Câmeras',
      'Diagnóstico, Pesquisa e Roteiro assistidos por IA',
      'Renovação mensal automática via Cartão ou PIX Automático',
    ],
  },
  {
    id: 'rsplay_studio_pro',
    name: 'Plano Estúdio Pro RSPlay',
    tagline: 'Para produtoras e grades com múltiplos programas e logins segregados por atração.',
    monthlyPriceCents: 129000, // R$ 1.290,00 / mês
    maxShows: 5,
    maxUsers: 20,
    highlighted: true,
    features: [
      'Até 5 Programas na grade com isolamento de conteúdo por perfil',
      'Até 20 logins individuais com matriz granular de permissões',
      'Agenda de Estúdio e Biblioteca Transversal de Assets 4K',
      'IA Co-Produtora Completa (Pauta, Repiques e Cortes Shorts)',
      'Gateway de Pagamentos com Renovação Automática e Faturamento',
    ],
  },
  {
    id: 'rsplay_broadcast_enterprise',
    name: 'Plano Rede Broadcast Enterprise',
    tagline: 'Operação completa de emissora RSPlay TV com programas e equipes ilimitadas.',
    monthlyPriceCents: 299000, // R$ 2.990,00 / mês
    maxShows: 999,
    maxUsers: 999,
    features: [
      'Programas e Temporadas ilimitados na grade da emissora',
      'Logins individuais ilimitados por programa e função',
      'Painel Administrativo Master, Relatórios Executivos & BI',
      'Auditoria completa de operações e Webhooks de Gateway em tempo real',
      'SLA de Broadcast 24/7 e Backup Relacional Dedicado',
    ],
  },
];

export const SEED_USERS: User[] = [
  {
    id: 'usr-producer-01',
    email: 'helena.costa@rsplaytv.com.br',
    name: 'Helena Costa (Admin Geral RSPlay TV)',
    jobTitle: 'Diretora Geral de Broadcast & SaaS',
    status: 'active',
    loginCode: 'rsplay123',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'usr-editor-02',
    email: 'rafael.mendes@rsplaytv.com.br',
    name: 'Rafael Mendes (Login: Bastidores do Poder)',
    jobTitle: 'Apresentador & Diretor do Programa Bastidores',
    status: 'active',
    loginCode: 'poder123',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'usr-host-04',
    email: 'clara.vasconcelos@rsplaytv.com.br',
    name: 'Clara Vasconcelos (Login: Anatomia Criativa)',
    jobTitle: 'Apresentadora & Editora Chefe — Anatomia Criativa',
    status: 'active',
    loginCode: 'anatomia123',
    createdAt: '2026-01-11T11:00:00.000Z',
    updatedAt: '2026-01-11T11:00:00.000Z',
  },
  {
    id: 'usr-partner-03',
    email: 'marina.silva@horizonte.media',
    name: 'Marina Silva (Horizonte Media)',
    jobTitle: 'Diretora Executiva Horizonte',
    status: 'active',
    loginCode: 'horizonte123',
    createdAt: '2026-01-12T10:00:00.000Z',
    updatedAt: '2026-01-12T10:00:00.000Z',
  },
];

export const SEED_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-takemaster-studio',
    name: 'RSPlay TV — Rede Broadcast & Estúdios',
    slug: 'rsplay-tv',
    plan: 'rsplay_studio_pro',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'org-horizonte-media',
    name: 'Horizonte Media Lab (Afiliada RSPlay)',
    slug: 'horizonte-media',
    plan: 'rsplay_programa_individual',
    createdAt: '2026-01-12T10:00:00.000Z',
    updatedAt: '2026-01-12T10:00:00.000Z',
  },
];

export const SEED_MEMBERSHIPS = [
  {
    id: 'mem-01',
    organizationId: 'org-takemaster-studio',
    userId: 'usr-producer-01',
    role: 'owner' as const,
  },
  {
    id: 'mem-02',
    organizationId: 'org-takemaster-studio',
    userId: 'usr-editor-02',
    role: 'producer' as const,
  },
  {
    id: 'mem-05',
    organizationId: 'org-takemaster-studio',
    userId: 'usr-host-04',
    role: 'host' as const,
  },
  {
    id: 'mem-03',
    organizationId: 'org-horizonte-media',
    userId: 'usr-producer-01',
    role: 'admin' as const,
  },
  {
    id: 'mem-04',
    organizationId: 'org-horizonte-media',
    userId: 'usr-partner-03',
    role: 'owner' as const,
  },
];

/**
 * Granular Program-Level Permissions:
 * - usr-editor-02 (Rafael Mendes) ONLY has access to 'show-1' (Bastidores do Poder & Negócios)
 * - usr-host-04 (Clara Vasconcelos) ONLY has access to 'show-2' (Anatomia Criativa)
 * - usr-producer-01 (Helena Costa) is Owner/Admin and has access to all programs
 */
export const SEED_USER_SHOW_PERMISSIONS: Omit<
  UserShowPermission,
  'createdAt' | 'updatedAt'
>[] = [
  {
    id: 'perm-rafael-show1',
    organizationId: 'org-takemaster-studio',
    userId: 'usr-editor-02',
    showId: 'show-1',
    canView: true,
    canEditEditorial: true,
    canEditScript: true,
    canOperateStudio: true,
    canManageSchedule: true,
    canManageAssets: true,
    canExport: true,
  },
  {
    id: 'perm-clara-show2',
    organizationId: 'org-takemaster-studio',
    userId: 'usr-host-04',
    showId: 'show-2',
    canView: true,
    canEditEditorial: true,
    canEditScript: true,
    canOperateStudio: true,
    canManageSchedule: false,
    canManageAssets: true,
    canExport: true,
  },
];

export function buildSeedSubscriptionsForOrg(organizationId: string): {
  subscriptions: SaaSSubscription[];
  invoices: BillingInvoice[];
  gatewayEvents: PaymentGatewayEvent[];
} {
  const now = new Date();
  const periodStart = new Date(now.getTime() - 10 * 24 * 3600 * 1000).toISOString();
  const periodEnd = new Date(now.getTime() + 20 * 24 * 3600 * 1000).toISOString();
  const prevMonth = new Date(now.getTime() - 40 * 24 * 3600 * 1000).toISOString();

  if (organizationId === 'org-horizonte-media') {
    const subId = 'sub-horizonte-01';
    return {
      subscriptions: [
        {
          id: subId,
          organizationId,
          showId: 'show-horizonte-01',
          planId: 'rsplay_programa_individual',
          planName: 'Plano Programa Individual',
          billingCycle: 'monthly',
          amountCents: 49000,
          currency: 'BRL',
          status: 'active',
          autoRenew: true,
          paymentGateway: 'RSPlay Pay / Stripe',
          paymentMethodType: 'pix_automatico',
          paymentMethodLast4: 'PIX',
          paymentMethodBrand: 'PIX Automático Banco Central',
          gatewayCustomerId: 'cus_horizonte_9921',
          gatewaySubscriptionId: 'sub_gateway_hz_01',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          lastRenewalAt: periodStart,
          createdAt: prevMonth,
          updatedAt: periodStart,
        },
      ],
      invoices: [
        {
          id: 'inv-hz-01',
          organizationId,
          subscriptionId: subId,
          invoiceNumber: 'RSP-2026-0041',
          description: 'Assinatura Mensal — Plano Programa Individual (Fronteiras da Ciência)',
          amountCents: 49000,
          currency: 'BRL',
          status: 'paid',
          paymentMethod: 'pix_automatico',
          gatewayTransactionId: 'tx_pix_auto_99812',
          autoRenewalCycle: true,
          dueDate: periodStart,
          paidAt: periodStart,
          createdAt: periodStart,
        },
      ],
      gatewayEvents: [
        {
          id: 'gev-hz-01',
          organizationId,
          subscriptionId: subId,
          provider: 'RSPlay Pay / Stripe',
          eventType: 'invoice.payment_succeeded',
          status: 'processed',
          payload: {
            invoiceNumber: 'RSP-2026-0041',
            amountBRL: 'R$ 490,00',
            autoRenew: true,
          },
          createdAt: periodStart,
        },
      ],
    };
  }

  const mainSubId = 'sub-rsplay-main';
  return {
    subscriptions: [
      {
        id: mainSubId,
        organizationId,
        planId: 'rsplay_studio_pro',
        planName: 'Plano Estúdio Pro RSPlay',
        billingCycle: 'monthly',
        amountCents: 129000,
        currency: 'BRL',
        status: 'active',
        autoRenew: true,
        paymentGateway: 'RSPlay Pay / Stripe',
        paymentMethodType: 'credit_card',
        paymentMethodLast4: '4829',
        paymentMethodBrand: 'Mastercard Black Corporativo',
        gatewayCustomerId: 'cus_rsplay_tv_001',
        gatewaySubscriptionId: 'sub_stripe_rsplay_8821',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        lastRenewalAt: periodStart,
        createdAt: prevMonth,
        updatedAt: periodStart,
      },
    ],
    invoices: [
      {
        id: 'inv-rsp-01',
        organizationId,
        subscriptionId: mainSubId,
        invoiceNumber: 'RSP-2026-0101',
        description: 'Contratação Inicial — Plano Estúdio Pro RSPlay (Grade Multiprogama)',
        amountCents: 129000,
        currency: 'BRL',
        status: 'paid',
        paymentMethod: 'credit_card',
        gatewayTransactionId: 'ch_stripe_8819201a',
        autoRenewalCycle: false,
        dueDate: prevMonth,
        paidAt: prevMonth,
        createdAt: prevMonth,
      },
      {
        id: 'inv-rsp-02',
        organizationId,
        subscriptionId: mainSubId,
        invoiceNumber: 'RSP-2026-0189',
        description: 'Renovação Automática Mensal — Plano Estúdio Pro RSPlay',
        amountCents: 129000,
        currency: 'BRL',
        status: 'paid',
        paymentMethod: 'credit_card',
        gatewayTransactionId: 'ch_stripe_9941205b',
        autoRenewalCycle: true,
        dueDate: periodStart,
        paidAt: periodStart,
        createdAt: periodStart,
      },
    ],
    gatewayEvents: [
      {
        id: 'gev-rsp-01',
        organizationId,
        subscriptionId: mainSubId,
        provider: 'RSPlay Pay / Stripe',
        eventType: 'customer.subscription.created',
        status: 'processed',
        payload: {
          plan: 'Plano Estúdio Pro RSPlay',
          gatewaySubscriptionId: 'sub_stripe_rsplay_8821',
          autoRenew: true,
        },
        createdAt: prevMonth,
      },
      {
        id: 'gev-rsp-02',
        organizationId,
        subscriptionId: mainSubId,
        provider: 'RSPlay Pay / Stripe',
        eventType: 'invoice.auto_renewal_succeeded',
        status: 'processed',
        payload: {
          invoiceNumber: 'RSP-2026-0189',
          amountBRL: 'R$ 1.290,00',
          cardLast4: '4829',
          nextRenewal: periodEnd.slice(0, 10),
        },
        createdAt: periodStart,
      },
    ],
  };
}

export function buildSeedWorkspaceForOrg(organizationId: string) {
  const now = new Date().toISOString();

  if (organizationId === 'org-horizonte-media') {
    const shows: Show[] = [
      {
        id: 'show-horizonte-01',
        organizationId,
        title: 'Fronteiras da Ciência & Clima',
        description:
          'Documentário de estúdio e debates técnicos sobre transição energética, biotecnologia e infraestrutura.',
        host: 'Dra. Marina Silva',
        format: 'Debate',
        defaultDurationMin: 50,
        editorialStyle: 'Analítico, científico, baseado em evidências e estudos de caso.',
        scenario: 'Estúdio B — Mesa redonda com telão interativo de dados',
        catalogStatus: 'active',
        category: 'Ciência & Tecnologia',
        targetAudience: 'Pesquisadores, gestores públicos e lideranças de engenharia',
        distributionChannels: ['RSPlay TV Canal 1', 'YouTube', 'Spotify Video'],
        cameras: [
          {
            id: 'cam-h1',
            name: 'CAM 1',
            label: 'Master Debate',
            purpose: 'Plano geral da bancada',
            framing: 'Plano Geral (Wide)',
            active: true,
          },
          {
            id: 'cam-h2',
            name: 'CAM 2',
            label: 'Close Mediadora',
            purpose: 'Intervenções e síntese de dados',
            framing: 'Plano Médio (Medium)',
            active: true,
          },
          {
            id: 'cam-h3',
            name: 'CAM 3',
            label: 'Close Especialista',
            purpose: 'Reações e explicações técnicas',
            framing: 'Close-up Intimista',
            active: true,
          },
        ],
        standardStructure: ['Tese Científica', 'Evidências de Campo', 'Contraponto', 'Conclusão'],
        defaultOpening: 'Bem-vindos ao Fronteiras da Ciência na RSPlay TV.',
        defaultClosing: 'A ciência avança quando fazemos as perguntas certas.',
        createdAt: now,
        updatedAt: now,
      },
    ];

    const productions: Production[] = [
      {
        id: 'prod-horizonte-s1',
        organizationId,
        showId: 'show-horizonte-01',
        title: 'Temporada 1 — Transição Energética na América Latina',
        seasonNumber: 1,
        status: 'in_production',
        targetEpisodesCount: 8,
        executiveProducer: 'Marina Silva',
        startDate: '2026-02-01',
        endDate: '2026-06-30',
        notes: 'Série patrocinada com foco em hidrogênio verde e armazenamento.',
        createdAt: now,
        updatedAt: now,
      },
    ];

    const guests: Guest[] = [
      {
        id: 'guest-horizonte-01',
        organizationId,
        name: 'Prof. Henrique Vasconcelos',
        role: 'Diretor do Laboratório de Redes Elétricas',
        company: 'Instituto Atlântico de Energia',
        bio: 'Pesquisador sênior em armazenamento de energia em larga escala.',
        contacts: 'henrique@atlantico.org',
        links: ['https://atlantico.org/henrique'],
        notes: 'Prefere gráficos na tela para explicar curvas de carga.',
        previousEpisodes: [],
        createdAt: now,
        updatedAt: now,
      },
    ];

    const episodes: Episode[] = [
      {
        id: 'ep-horizonte-101',
        organizationId,
        showId: 'show-horizonte-01',
        productionId: 'prod-horizonte-s1',
        episodeNumber: 1,
        title: 'O Gargalo das Baterias Industriais',
        idea: 'Investigar por que a geração solar cresce mais rápido que a capacidade de transmissão.',
        guestName: 'Prof. Henrique Vasconcelos',
        guestId: 'guest-horizonte-01',
        host: 'Dra. Marina Silva',
        format: 'Debate',
        targetDurationMin: 50,
        status: 'ready',
        diagnosis: {
          centralTheme: 'Infraestrutura de transmissão e armazenamento energético.',
          potentialStory: 'O apagão evitado no nordeste por sistemas de baterias químicas.',
          primaryConflict: 'Velocidade de investimentos privados vs regulação estatal.',
          primaryTransformation: 'De consumidor passivo a microrrede autônoma.',
          whyWatch: 'Entender o futuro do custo da energia nos próximos 5 anos.',
          whatToDiscover: 'Quanto custa armazenar 1 MWh hoje no Brasil.',
          researchPoints: ['Leilão de transmissão 2025', 'Custo do lítio vs sódio'],
          highImpactMoments: ['Simulação do pico das 19h no telão'],
          approved: true,
        },
        research: {
          aboutGuest: 'Engenheiro eletricista com 25 anos no setor elétrico.',
          trajectory: 'Liderou implantação de parques eólicos na Bahia.',
          company: 'Instituto Atlântico de Energia.',
          keyDatesAndNumbers: '2023: primeiro piloto de 50MW.',
          previousInterviews: 'Entrevista ao Canal Energia.',
          recurringThemes: 'Segurança energética e descarbonização.',
          contradictionsAndClarifications: 'Questionar viabilidade econômica sem subsídio.',
          compellingStories: 'Noite de tempestade na subestação experimental.',
          sources: [],
        },
        outline: [
          {
            id: 'blk-h1',
            blockNumber: 1,
            title: 'O Paradoxo do Sol ao Meio-Dia',
            estimatedDurationMin: 15,
            objective: 'Explicar o excesso de oferta diurna e déficit noturno.',
            keyThemes: ['Curva Pato', 'Armazenamento'],
            transitionText: 'Mas como financiar essa bateria gigante?',
          },
        ],
        questions: [],
        script: [],
        cameras: shows[0].cameras,
        assets: [],
        shorts: [],
        recordingMarkers: [],
        technicalChecklist: {
          cam1Recording: true,
          cam2Recording: true,
          cam3Recording: true,
          micHost: true,
          micGuest: true,
          audioMonitored: true,
          lighting: true,
          memoryCardsStorage: true,
          batteries: true,
          syncClap: false,
          waterReady: true,
          silentPhones: true,
          customItems: [],
        },
        versions: [],
        createdAt: now,
        updatedAt: now,
      },
    ];

    const scheduleEvents: ScheduleEvent[] = [
      {
        id: 'sched-horizonte-01',
        organizationId,
        showId: 'show-horizonte-01',
        productionId: 'prod-horizonte-s1',
        episodeId: 'ep-horizonte-101',
        title: 'Gravação EP #01 — Baterias Industriais',
        type: 'recording',
        status: 'confirmed',
        scheduledStart: '2026-10-08T14:00:00.000Z',
        scheduledEnd: '2026-10-08T16:00:00.000Z',
        studioLocation: 'Estúdio B — Ciência',
        assignedTeam: ['Marina Silva', 'Carlos (Diretor de TV)'],
        notes: 'Testar gráficos HDMI no telão às 13h30.',
        createdAt: now,
        updatedAt: now,
      },
    ];

    const libraryAssets: LibraryAsset[] = [];

    return { shows, productions, guests, episodes, scheduleEvents, libraryAssets };
  }

  // Default: org-takemaster-studio (RSPlay TV)
  const shows: Show[] = [
    {
      id: 'show-1',
      organizationId,
      title: 'Bastidores do Poder & Negócios',
      description:
        'Entrevistas em profundidade na RSPlay TV com fundadores, executivos e mentes criativas que tomaram decisões de alto risco e transformaram mercados inteiros.',
      host: 'Rafael Mendes',
      format: 'Entrevista',
      defaultDurationMin: 45,
      editorialStyle:
        'Investigativo, cinematográfico, ritmo dinâmico, foco em histórias humanas reais, dilemas éticos e viradas dramáticas sem clichês corporativos.',
      scenario: 'Estúdio Principal RSPlay A — Mesa de madeira maciça, iluminação quente de recorte (3 pontos)',
      catalogStatus: 'active',
      category: 'Negócios & Documentário',
      targetAudience: 'Fundadores, executivos C-level, investidores e criadores de mídia',
      distributionChannels: ['RSPlay TV Ao Vivo', 'YouTube 4K', 'Spotify Video', 'Reels/Shorts'],
      cameras: [
        {
          id: 'cam-1',
          name: 'CAM 1',
          label: 'Geral / Master (2-Shot)',
          purpose: 'Estabelecer relação espacial, reações conjuntas, abertura e transição de blocos',
          framing: 'Plano Geral (Wide)',
          active: true,
        },
        {
          id: 'cam-2',
          name: 'CAM 2',
          label: 'Close Convidado (Hero)',
          purpose: 'Emoção, confissões, tensão, momentos de revelação e cortes verticais (Shorts)',
          framing: 'Close-up Intimista (85mm)',
          active: true,
        },
        {
          id: 'cam-3',
          name: 'CAM 3',
          label: 'Close Apresentador',
          purpose: 'Perguntas incisivas, escuta ativa, reação silenciosa e leitura de teleprompter',
          framing: 'Plano Médio Fechado (50mm)',
          active: true,
        },
      ],
      standardStructure: [
        'Cold Open (Teaser de Tensão)',
        'Abertura & Contextualização',
        'Bloco 1: A Origem e o Ponto Cego',
        'Bloco 2: A Crise Real (O Momento da Quase Quebra)',
        'Bloco 3: A Virada Estratégica e Lições Práticas',
        'Perguntas Rápidas (Ping-Pong) & Encerramento',
      ],
      defaultOpening:
        'Toda grande empresa esconde uma noite em que tudo quase acabou. Hoje na RSPlay TV vamos abrir a caixa-preta de uma decisão de R$ 200 milhões.',
      defaultClosing:
        'Se essa história mudou a forma como você enxerga risco, compartilhe este episódio na RSPlay TV. Até a próxima semana.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'show-2',
      organizationId,
      title: 'Anatomia Criativa',
      description:
        'Programa exclusivo RSPlay TV de dissecação técnica de obras audiovisuais, direção de fotografia, trilhas sonoras e montagem cinematográfica.',
      host: 'Clara Vasconcelos',
      format: 'Programa Solo',
      defaultDurationMin: 30,
      editorialStyle: 'Ensaio visual analítico, demonstração prática no monitor de referência.',
      scenario: 'Ilha de Edição & Color Grading Suite RSPlay — Luz âmbar + LED azul de fundo',
      catalogStatus: 'active',
      category: 'Cinema & Audiovisual',
      targetAudience: 'Diretores, editores, roteiristas e produtores executivos',
      distributionChannels: ['RSPlay TV On-Demand', 'YouTube 4K', 'Substack Vídeo'],
      cameras: [
        {
          id: 'cam-2-1',
          name: 'CAM 1',
          label: 'Frontal Teleprompter',
          purpose: 'Narração principal e conexão direta na lente',
          framing: 'Plano Médio (35mm)',
          active: true,
        },
        {
          id: 'cam-2-2',
          name: 'CAM 2',
          label: 'Ângulo Lateral 45°',
          purpose: 'Quebra de eixo dramática e comentários espontâneos',
          framing: 'Close-up (50mm)',
          active: true,
        },
        {
          id: 'cam-2-3',
          name: 'CAM 3',
          label: 'Overhead / Detalhe Mesa',
          purpose: 'Mostrar roteiros impressos, lentes, anotações e timeline de corte',
          framing: 'Zenital / Macro',
          active: true,
        },
      ],
      standardStructure: [
        'Hook Visual',
        'O Problema Narrativo',
        'A Técnica Explicada',
        'Estudo de Cena',
        'Conclusão Aplicável',
      ],
      defaultOpening: 'Você já sentiu tensão em uma cena sem saber explicar por quê? O segredo está no corte.',
      defaultClosing: 'Nos vemos no próximo frame aqui na RSPlay TV.',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const productions: Production[] = [
    {
      id: 'prod-tm-s1',
      organizationId,
      showId: 'show-1',
      title: 'Temporada 1 — Decisões de Alto Risco',
      seasonNumber: 1,
      status: 'in_production',
      targetEpisodesCount: 12,
      executiveProducer: 'Helena Costa',
      startDate: '2026-01-15',
      endDate: '2026-06-30',
      notes: 'Foco em fundadores de tecnologia e infraestrutura que enfrentaram crises reais de liquidez ou pivôs radicais.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-tm-s2',
      organizationId,
      showId: 'show-2',
      title: 'Temporada 1 — A Arte da Montagem',
      seasonNumber: 1,
      status: 'pre_production',
      targetEpisodesCount: 6,
      executiveProducer: 'Clara Vasconcelos',
      startDate: '2026-03-01',
      endDate: '2026-08-30',
      notes: 'Episódios especiais com análise de cenas ao vivo.',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const guests: Guest[] = [
    {
      id: 'guest-1',
      organizationId,
      name: 'Eduardo Albuquerque',
      role: 'CEO & Co-fundador',
      company: 'Vórtex Logística Aérea (Drones de Carga)',
      bio: 'Engenheiro aeronáutico formado pelo ITA, fundou a Vórtex em 2019. Em 2023 viu o protótipo principal cair durante demonstração para investidores, ficando a 18 dias do fim do caixa antes de fechar contrato histórico de logística hospitalar na Amazônia.',
      contacts: 'eduardo@vortexaero.com.br | Assessoria: (11) 99812-4400',
      links: [
        'https://linkedin.com/in/eduardo-albuquerque-vortex',
        'https://vortexaero.com.br/imprensa',
      ],
      notes: 'Evita falar sobre valores exatos do processo judicial com antigo sócio, mas fala abertamente sobre o acidente do protótipo VX-04 e os dados financeiros da virada.',
      previousEpisodes: ['EP #14 (1ª Temporada Podcast Áudio — 2024)'],
      previousResearchSummary: 'Em 2024 mencionou que a transição de entregas urbanas de varejo para transporte de plasma sanguíneo salvou a companhia.',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const episodes: Episode[] = [
    {
      id: 'ep-101',
      organizationId,
      showId: 'show-1',
      productionId: 'prod-tm-s1',
      episodeNumber: 12,
      title: 'A Queda do Protótipo VX-04 e os 18 Dias Antes da Falência',
      idea: 'Explorar como Eduardo Albuquerque reconstruiu a Vórtex após o acidente ao vivo diante dos fundos de Venture Capital e pivotou de entregas de varejo para logística médica crítica.',
      guestName: 'Eduardo Albuquerque',
      guestId: 'guest-1',
      host: 'Rafael Mendes',
      format: 'Entrevista',
      targetDurationMin: 45,
      objective:
        'Extrair a anatomia emocional e financeira dos 18 dias entre o acidente do drone e o contrato hospitalar.',
      additionalInfo: 'Levar foto impressa do destroço da hélice que ele guarda na mesa do escritório.',
      status: 'scripting',
      diagnosis: {
        centralTheme:
          'Resiliência sob colapso técnico público e coragem para abandonar um mercado glamouroso (varejo) por um mercado vital (saúde).',
        potentialStory:
          'O dia chuvoso em São José dos Campos em que o drone de R$ 1,8 milhão perdeu telemetria na frente de 14 investidores — e a reunião de emergência às 2h da manhã com os engenheiros.',
        primaryConflict:
          'Pressão do conselho para liquidar os ativos e devolver o restante do capital vs. convicção técnica da equipe na rota hospitalar.',
        primaryTransformation:
          'De fundador obcecado por velocidade e valuation para líder focado em confiabilidade aeronáutica e impacto em vidas humanas.',
        whyWatch:
          'Raramente um CEO de deep-tech abre os números reais de folha de pagamento quando restam apenas duas semanas de caixa.',
        whatToDiscover:
          'O que exatamente causou a pane magnética no VX-04 e como ele convenceu o primeiro hospital sem ter certificação definitiva.',
        researchPoints: [
          'Relatório técnico ANAC/CEA sobre testes experimentais em 2023',
          'Contrato de operação assistida no Amazonas (redução de 4h para 22min no transporte de bolsas de sangue)',
          'Saída do cofundador comercial em novembro de 2023',
        ],
        highImpactMoments: [
          'Momento em que Rafael coloca sobre a mesa a foto da hélice quebrada do VX-04 (CAM 2 close-up na reação de Eduardo)',
          'Revelação do áudio que Eduardo enviou para a esposa saindo da pista de testes',
          'Cálculo ao vivo de quanto custava cada hora de engenharia nos 18 dias finais',
        ],
        approved: true,
      },
      research: {
        aboutGuest:
          'Eduardo Albuquerque (38 anos), natural de Recife, bolsista olímpico de física antes de ingressar no ITA. Trabalhou 6 anos em projetos de sistemas embarcados antes de empreender.',
        trajectory:
          '2019: Fundação da Vórtex em galpão compartilhado.\n2021: Rodada Seed de R$ 12M.\nSetembro/2023: Queda do VX-04 no Demo Day.\nOutubro/2023: Pivô para logística médica.\n2025: 14.000 voos autônomos sem incidentes.',
        company:
          'Vórtex Logística Aérea — opera frotas de eVTOLs de carga de médio porte (até 45kg por 120km de raio). Atualmente com 85 engenheiros.',
        keyDatesAndNumbers:
          '• 14 de Setembro de 2023: Data do acidente do VX-04.\n• R$ 410.000: Saldo em conta no dia seguinte ao acidente.\n• R$ 385.000: Folha salarial do mês.\n• 22 minutos: Tempo de travessia sobre o Rio Negro com carga refrigerada.',
        previousInterviews:
          'Participou do podcast "Engenharia de Ponta" em 2024, onde falou apenas da parte técnica dos motores elétricos, sem aprofundar o drama societário.',
        recurringThemes:
          'Redundância tripla, cultura de aviação ("erro não se esconde, se investiga"), aversão a crescimento sem margem.',
        contradictionsAndClarifications:
          'Em nota à imprensa em 2023, a empresa chamou a queda de "pouso forçado programado". Na realidade, houve perda total da fuselagem. Confrontar com elegância.',
        compellingStories:
          'A primeira entrega real sob tempestade tropical levando soro antiofídico para uma comunidade isolada — quando a equipe inteira acompanhou o radar em silêncio absoluto.',
        sources: [
          {
            id: 'src-1',
            title: 'Cadastro CADE / Junta Comercial — Alteração Societária Out/2023',
            detail: 'Confirma saída de sócio minoritário duas semanas após o incidente na pista.',
            status: 'CONFIRMADO',
            category: 'company',
          },
          {
            id: 'src-2',
            title: 'Valor do contrato inicial com rede hospitalar',
            detail: 'Fontes do setor estimam adiantamento de R$ 1,5M que salvou o fluxo de caixa.',
            status: 'PERGUNTAR AO CONVIDADO',
            category: 'dates_numbers',
          },
        ],
      },
      outline: [
        {
          id: 'blk-1',
          blockNumber: 1,
          title: 'Cold Open & O Dia em que o Céu Caiu',
          estimatedDurationMin: 10,
          objective: 'Colocar o espectador dentro da pista de testes em 14 de setembro de 2023.',
          keyThemes: ['O teste diante dos investidores', 'O silêncio após o impacto', 'Nota oficial vs realidade'],
          transitionText:
            'O drone estava destruído no asfalto, os investidores entraram nos carros e foram embora. No dia seguinte, você abriu o extrato bancário.',
        },
        {
          id: 'blk-2',
          blockNumber: 2,
          title: 'Os 18 Dias de Caixa e o Motim no Conselho',
          estimatedDurationMin: 15,
          objective: 'Explorar a tensão financeira, o dilema de demitir ou tentar uma última cartada.',
          keyThemes: ['R$ 410 mil no banco', 'A reunião das 2h da manhã', 'O pivô para hospitais'],
          transitionText:
            'Você tinha uma tecnologia desacreditada no varejo, mas descobriu que para um hospital 20 minutos valem uma vida.',
        },
        {
          id: 'blk-3',
          blockNumber: 3,
          title: 'Operação Rio Negro e a Nova Vórtex',
          estimatedDurationMin: 15,
          objective: 'Mostrar a redenção técnica através da primeira missão crítica na Amazônia.',
          keyThemes: ['Primeiro voo com sangue e soro', 'Cultura de caixa-preta', 'O futuro da aviação autônoma'],
          transitionText: 'Para fechar, quero olhar para aquela hélice quebrada na sua parede.',
        },
      ],
      questions: [
        {
          id: 'q-1',
          blockId: 'blk-1',
          order: 1,
          text: 'Eduardo, no dia 14 de setembro de 2023, às 15h40, o VX-04 subiu 80 metros diante de 14 investidores e despencou no asfalto. O que passou pela sua cabeça nos 5 segundos entre o alerta sonoro e o impacto?',
          objective: 'Gerar abertura cinematográfica imediata para o Cold Open.',
          suggestedCamera: 'CAM 2',
          eyeDirection: 'Olhar fixo no convidado (Rafael conduz em tom grave)',
          followUps: [
            {
              id: 'fu-1',
              triggerCondition: 'SE ELE DER UMA RESPOSTA MUITO TÉCNICA SOBRE TELEMETRIA',
              actionOrQuestion:
                'Esqueça o software por um segundo: olhe para as pessoas na tenda. Quem foi a primeira pessoa que desviou o olhar de você?',
              tag: 'CONFLITO',
            },
            {
              id: 'fu-2',
              triggerCondition: 'SE ELE CITAR A NOTA À IMPRENSA',
              actionOrQuestion:
                'A nota oficial falou em "pouso forçado". Por que vocês tiveram medo de usar a palavra queda?',
              tag: 'APROFUNDAR',
            },
          ],
        },
        {
          id: 'q-2',
          blockId: 'blk-2',
          order: 2,
          text: 'No dia seguinte, vocês tinham R$ 410 mil na conta e uma folha de R$ 385 mil. Como você entrou na sala com 85 engenheiros sabendo que só havia 18 dias de oxigênio?',
          objective: 'Revelar números reais e liderança sob risco iminente de insolvência.',
          suggestedCamera: 'CAM 2',
          eyeDirection: 'Olhar no convidado; cortar para CAM 1 quando ele gesticular sobre a equipe',
          followUps: [
            {
              id: 'fu-3',
              triggerCondition: 'SE ELE FALAR DA SAÍDA DO SÓCIO',
              actionOrQuestion: 'Não interromper — manter CAM 2 fechada e deixar o silêncio trabalhar.',
              tag: 'NÃO INTERROMPER',
            },
          ],
        },
      ],
      script: [
        {
          id: 'sc-1',
          blockId: 'blk-1',
          timestamp: '00:00',
          type: 'cold_open',
          camera: 'CAM 2',
          alternativeCamera: 'CAM 1',
          speaker: 'Eduardo Albuquerque',
          targetPerson: 'Rafael Mendes',
          eyeDirection: 'Olhar para o apresentador',
          shotType: 'Close-up Intimista (85mm)',
          content:
            '[TRECHO DE ALTA TENSÃO DO EPISÓDIO] "Quando o alarme de estol tocou e eu vi 18 meses de engenharia virarem fumaça preta na frente de quem ia assinar o cheque... eu ouvi o barulho das portas dos carros batendo antes mesmo do bombeiro apagar o fogo."',
          directionalMarkers: ['CORTE SECO', 'TRILHA DE TENSÃO SUBINDO', 'INSERIR FOTO DO DESTROÇO'],
          isTeleprompter: false,
        },
        {
          id: 'sc-2',
          blockId: 'blk-1',
          timestamp: '00:45',
          type: 'opening',
          camera: 'CAM 3',
          alternativeCamera: 'CAM 1',
          speaker: 'Rafael Mendes',
          targetPerson: 'Lente CAM 3',
          eyeDirection: 'Olhar direto na lente (Teleprompter)',
          shotType: 'Plano Médio Fechado',
          content:
            'Toda grande empresa de tecnologia esconde uma tarde em que tudo quase acabou. Em setembro de 2023, a Vórtex Logística Aérea tinha apenas 18 dias de caixa e seu único protótipo destruído na pista. Hoje, eles operam a maior malha de transporte médico autônomo da América Latina. Eu sou Rafael Mendes, e no Bastidores do Poder de hoje recebemos o engenheiro e CEO Eduardo Albuquerque.',
          directionalMarkers: ['LEITURA TELEPROMPTER', 'ENTRA GC NOME DO CONVIDADO', 'TRANSIÇÃO PARA CAM 1'],
          isTeleprompter: true,
        },
        {
          id: 'sc-3',
          blockId: 'blk-1',
          timestamp: '01:50',
          type: 'question',
          camera: 'CAM 1',
          alternativeCamera: 'CAM 2',
          speaker: 'Rafael Mendes',
          targetPerson: 'Eduardo Albuquerque',
          eyeDirection: 'Olhar para o convidado',
          shotType: 'Plano Geral (2-Shot)',
          content:
            'Eduardo, bem-vindo. Eu trouxe um objeto aqui na mesa que você conhece bem: a foto da hélice esquerda do VX-04. O que passou pela sua cabeça nos 5 segundos entre o alerta sonoro e o impacto na pista?',
          directionalMarkers: ['MOSTRAR OBJETO NA MESA', 'CORTAR PARA CAM 2 NA RESPOSTA'],
          isTeleprompter: false,
          questionRefId: 'q-1',
        },
      ],
      cameras: shows[0].cameras,
      assets: [
        {
          id: 'ast-1',
          blockId: 'blk-1',
          type: 'foto',
          title: 'Foto Alta Resolução — Hélice Quebrada Protótipo VX-04',
          description: 'Registro fotográfico da peça carbonizada mantida na sede da Vórtex.',
          moment: '01:50 — Quando Rafael introduz a primeira pergunta.',
          status: 'aprovado',
          tags: ['acidente', 'protótipo', 'b-roll'],
          reusable: true,
        },
        {
          id: 'ast-2',
          blockId: 'blk-3',
          type: 'video',
          title: 'B-Roll 4K — Drone Vórtex cruzando o Rio Negro à noite',
          description: 'Imagens de arquivo da operação hospitalar sem áudio (apenas cobertura).',
          moment: 'Bloco 3 — Narrativa da primeira entrega de soro antiofídico.',
          status: 'obtido',
          tags: ['amazônia', 'drone', 'operação'],
          reusable: true,
        },
      ],
      shorts: [
        {
          id: 'sh-1',
          title: 'O Dia em que R$ 2 Milhões Caíram do Céu na Frente dos Investidores',
          hook: 'Os investidores entraram nos carros antes mesmo do bombeiro apagar o fogo...',
          generatingQuestion: 'O que aconteceu nos 5 segundos após o alarme tocar no Demo Day?',
          estimatedDuration: '58s',
          status: 'Planejado',
          notes: 'Usar CAM 2 vertical + inserção de 3s da foto do destroço no topo.',
        },
      ],
      recordingMarkers: [
        {
          id: 'mk-1',
          timestampSec: 412,
          formattedTime: '06:52',
          type: 'momento_forte',
          blockTitle: 'Cold Open & O Dia em que o Céu Caiu',
          referenceText: 'Relato da ligação para a esposa saindo da pista.',
          comment: 'Excelente corte para abrir o episódio e Reels!',
        },
      ],
      technicalChecklist: {
        cam1Recording: true,
        cam2Recording: true,
        cam3Recording: true,
        micHost: true,
        micGuest: true,
        audioMonitored: true,
        lighting: true,
        memoryCardsStorage: true,
        batteries: true,
        syncClap: true,
        waterReady: true,
        silentPhones: true,
        customItems: [
          {
            id: 'chk-c1',
            label: 'Foto impressa da hélice posicionada ao lado do apresentador',
            done: true,
          },
        ],
      },
      versions: [
        {
          id: 'ver-1',
          episodeId: 'ep-101',
          organizationId,
          versionNumber: 1,
          name: 'V1 — Estrutura Inicial da Pauta',
          savedAt: now,
          description: 'Primeira versão aprovada após diagnóstico editorial.',
          snapshot: {
            outline: [],
            questions: [],
            script: [],
          },
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ep-201',
      organizationId,
      showId: 'show-2',
      productionId: 'prod-tm-s2',
      episodeNumber: 1,
      title: 'A Psicologia do Corte Invisível no Cinema de Suspense',
      idea: 'Demonstrar no monitor da ilha RSPlay TV como 4 frames de atraso na reação do ator mudam completamente a percepção de culpa da audiência.',
      guestName: 'Programa Solo (Clara Vasconcelos)',
      host: 'Clara Vasconcelos',
      format: 'Programa Solo',
      targetDurationMin: 30,
      objective: 'Ensinar montagem rítmica e corte em movimento.',
      status: 'ready',
      diagnosis: {
        centralTheme: 'A montagem como manipulação invisível do tempo e da empatia.',
        potentialStory: 'Comparação quadro a quadro de uma sequência clássica de tensão.',
        primaryConflict: 'Corte técnico no diálogo vs. corte emocional no olhar.',
        primaryTransformation: 'O espectador nunca mais assistirá a um diálogo da mesma forma.',
        whyWatch: 'Demonstração prática na timeline em 4K.',
        whatToDiscover: 'A regra dos 4 frames de sustentação após a fala.',
        researchPoints: ['Entrevistas de Walter Murch e Thelma Schoonmaker'],
        highImpactMoments: ['Comparação lado a lado com e sem trilha sonora'],
        approved: true,
      },
      research: {
        aboutGuest: 'Episódio conduzido por Clara Vasconcelos, montadora premiada da RSPlay TV.',
        trajectory: '15 anos editando documentários e séries de ficção.',
        company: 'RSPlay TV Originals.',
        keyDatesAndNumbers: 'Mais de 40 obras montadas.',
        previousInterviews: '',
        recurringThemes: 'Ritmo, respiração do ator e desenho de som.',
        contradictionsAndClarifications: '',
        compellingStories: 'Como um erro de sincronia salvou a cena final de um longa.',
        sources: [],
      },
      outline: [
        {
          id: 'blk-201-1',
          blockNumber: 1,
          title: 'Por que piscamos na hora do corte?',
          estimatedDurationMin: 10,
          objective: 'Introduzir a teoria da piscada na montagem.',
          keyThemes: ['Corte Invisível', 'Olhar do Espectador'],
          transitionText: 'Vamos abrir a timeline na CAM 3.',
        },
      ],
      questions: [],
      script: [],
      cameras: shows[1].cameras,
      assets: [],
      shorts: [],
      recordingMarkers: [],
      technicalChecklist: {
        cam1Recording: true,
        cam2Recording: true,
        cam3Recording: true,
        micHost: true,
        micGuest: false,
        audioMonitored: true,
        lighting: true,
        memoryCardsStorage: true,
        batteries: true,
        syncClap: true,
        waterReady: true,
        silentPhones: true,
        customItems: [],
      },
      versions: [],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const scheduleEvents: ScheduleEvent[] = [
    {
      id: 'sched-tm-01',
      organizationId,
      showId: 'show-1',
      productionId: 'prod-tm-s1',
      episodeId: 'ep-101',
      title: 'Briefing & Passagem de Som — EP #12 (Eduardo Albuquerque)',
      type: 'briefing',
      status: 'completed',
      scheduledStart: '2026-10-05T13:00:00.000Z',
      scheduledEnd: '2026-10-05T13:45:00.000Z',
      studioLocation: 'Camarim Principal & Estúdio A',
      assignedTeam: ['Helena Costa', 'Rafael Mendes'],
      notes: 'Alinhar limites jurídicos sobre ex-sócio e validar pronúncia das siglas aeronáuticas.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sched-tm-02',
      organizationId,
      showId: 'show-1',
      productionId: 'prod-tm-s1',
      episodeId: 'ep-101',
      title: 'Gravação Oficial 3 Câmeras — EP #12 (Vórtex Aero)',
      type: 'recording',
      status: 'confirmed',
      scheduledStart: '2026-10-05T14:00:00.000Z',
      scheduledEnd: '2026-10-05T15:30:00.000Z',
      studioLocation: 'Estúdio Principal RSPlay (Set A)',
      assignedTeam: ['Rafael Mendes', 'Helena Costa', 'Diretor de Corte (Mesa Tricaster)'],
      notes: 'Teleprompter ativo na CAM 3. Foto da hélice pronta no apoio.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sched-tm-03',
      organizationId,
      showId: 'show-2',
      productionId: 'prod-tm-s2',
      episodeId: 'ep-201',
      title: 'Gravação na Ilha 4K — Anatomia Criativa EP #01',
      type: 'recording',
      status: 'scheduled',
      scheduledStart: '2026-10-06T10:00:00.000Z',
      scheduledEnd: '2026-10-06T12:00:00.000Z',
      studioLocation: 'Ilha de Edição & Color Suite RSPlay',
      assignedTeam: ['Clara Vasconcelos', 'Operador de Áudio'],
      notes: 'Capturar sinal limpo HDMI da timeline DaVinci Resolve.',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const libraryAssets: LibraryAsset[] = [
    {
      id: 'lib-ast-1',
      organizationId,
      showId: 'show-1',
      episodeId: 'ep-101',
      episodeTitle: 'A Queda do Protótipo VX-04 e os 18 Dias Antes da Falência',
      type: 'foto',
      title: 'Foto Alta Resolução — Hélice Quebrada Protótipo VX-04',
      description: 'Registro fotográfico da peça carbonizada mantida na sede da Vórtex.',
      moment: '01:50 — Quando Rafael introduz a primeira pergunta.',
      status: 'aprovado',
      tags: ['acidente', 'protótipo', 'b-roll', 'vortex'],
      reusable: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'lib-ast-2',
      organizationId,
      showId: 'show-1',
      episodeId: 'ep-101',
      episodeTitle: 'A Queda do Protótipo VX-04 e os 18 Dias Antes da Falência',
      type: 'video',
      title: 'B-Roll 4K — Drone Vórtex cruzando o Rio Negro à noite',
      description: 'Imagens de arquivo da operação hospitalar sem áudio (apenas cobertura).',
      moment: 'Bloco 3 — Narrativa da primeira entrega de soro antiofídico.',
      status: 'obtido',
      tags: ['amazônia', 'drone', 'operação', '4k'],
      reusable: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'lib-ast-3',
      organizationId,
      showId: 'show-1',
      type: 'vinheta',
      title: 'Vinheta Oficial 4K — Bastidores do Poder (Intro 6s)',
      description: 'Vinheta padrão da 1ª temporada com trilha original masterizada em -14 LUFS.',
      moment: '00:40 — Logo após o Cold Open de cada episódio.',
      status: 'aprovado',
      tags: ['vinheta', 'identidade-visual', 'temporada-1'],
      reusable: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'lib-ast-4',
      organizationId,
      showId: 'show-2',
      type: 'vinheta',
      title: 'Vinheta Oficial 4K — Anatomia Criativa (Abertura Cinema)',
      description: 'Identidade visual exclusiva do programa Anatomia Criativa.',
      moment: '00:15 — Entrada após o Hook Visual.',
      status: 'aprovado',
      tags: ['anatomia-criativa', 'vinheta', 'cinema'],
      reusable: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  return { shows, productions, guests, episodes, scheduleEvents, libraryAssets };
}
