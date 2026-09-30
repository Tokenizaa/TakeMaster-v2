import fs from 'fs';
import path from 'path';
import { DatabaseState, Episode, Show, Guest, CameraConfig } from '../types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const defaultCameras: CameraConfig[] = [
  {
    id: 'cam-1',
    name: 'CAM 1',
    label: 'Frontal Apresentador',
    purpose: 'Abertura, encerramento, passagens diretas, teleprompter e conexão com a audiência',
    framing: 'Plano Médio / Close-up Frontal',
    active: true,
  },
  {
    id: 'cam-2',
    name: 'CAM 2',
    label: '45° Apresentador',
    purpose: 'Perguntas ao convidado, reações, escuta ativa e diálogo na bancada',
    framing: 'Plano Médio perfil 45 graus',
    active: true,
  },
  {
    id: 'cam-3',
    name: 'CAM 3',
    label: '45° Convidado',
    purpose: 'Respostas principais, histórias de impacto, confissões e planos fechados',
    framing: 'Plano Médio / Close expressivo 45 graus',
    active: true,
  },
];

const seedShows: Show[] = [
  {
    id: 'show-1',
    title: 'Mentes de Valor',
    description: 'Entrevistas aprofundadas com empreendedores, fundadores e líderes que superaram crises severas e construíram impérios.',
    host: 'Renan Vianna',
    format: 'Entrevista',
    defaultDurationMin: 45,
    editorialStyle: 'Cinematográfico, humano, investigativo e inspirador. Foco no conflito real e aprendizados práticos.',
    scenario: 'Estúdio escuro com iluminação pontual âmbar/tungstênio, mesa de madeira rústica e microfones Shure SM7B.',
    cameras: defaultCameras,
    standardStructure: [
      'Cold Open de Alto Impacto',
      'Vinheta / Abertura Direta',
      'A Origem Humilde e a Primeira Fagulha',
      'A Primeira Grande Ruptura / Quase Quebrou',
      'A Virada Estratégica e Crescimento',
      'Aprendizados e Lado Humano',
      'Futuro e Visão',
      'Ping-Pong Rápido',
      'Encerramento e Lição Final'
    ],
    defaultOpening: 'Existe um capítulo na história de todo grande empresário que você nunca vai ler nos manuais de negócios...',
    defaultClosing: 'Essa foi mais uma história real de quem colocou o peito na linha de fogo. Se essa conversa te inspirou, inscreva-se e compartilhe com quem está construindo seu sonho.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'show-2',
    title: 'Tech & Negócios',
    description: 'Videocast sobre bastidores do ecossistema de startups, inteligência artificial e decisões sob alta pressão.',
    host: 'Renan Vianna',
    format: 'Podcast/Videocast',
    defaultDurationMin: 50,
    editorialStyle: 'Dinâmico, analítico e provocativo.',
    scenario: 'Cenário moderno com luzes RGB sutis e monitor de dados ao fundo.',
    cameras: defaultCameras,
    standardStructure: ['Gancho', 'Origem da Tese', 'Desafios Técnicos', 'Monetização', 'Visão 2030'],
    defaultOpening: 'Bem-vindos a mais um episódio de Tech & Negócios. Hoje vamos entender quem está realmente moldando o futuro...',
    defaultClosing: 'Obrigado por nos acompanhar até aqui. Nos vemos na próxima semana!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const seedGuests: Guest[] = [
  {
    id: 'guest-1',
    name: 'João Silva',
    role: 'Fundador & CEO',
    company: 'Ferramentas Brasil S/A',
    bio: 'Começou como mecânico aos 17 anos em São Bernardo do Campo. Vendeu ferramentas usadas numa Kombi em 2008. Hoje comanda uma fábrica de 12.000m² com 420 colaboradores e faturamento superior a R$ 85 milhões.',
    contacts: 'assessoria@ferramentasbrasil.com.br / (11) 98765-4321',
    links: ['https://linkedin.com/in/joaosilva-ferramentas', 'https://ferramentasbrasil.com.br'],
    notes: 'Homem humilde, fala com entusiasmo sobre a família e a equipe de chão de fábrica. Evita falar sobre termos em inglês sofisticados, prefere linguagem direta e pé no chão.',
    previousEpisodes: ['ep-1'],
    previousResearchSummary: 'Pesquisa realizada em 2026 destacou momento crítico da enchente de 2014 onde perdeu 70% do maquinário.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'guest-2',
    name: 'Dra. Camila Nogueira',
    role: 'Cofundadora & CTO',
    company: 'BioHealth Analytics',
    bio: 'Pioneira em diagnósticos preventivos com modelos de visão computacional na América Latina.',
    contacts: 'camila@biohealth.ai',
    links: ['https://linkedin.com/in/camilanogueira-bio'],
    notes: 'Excelente didática, muito clara e precisa com dados numéricos.',
    previousEpisodes: [],
    createdAt: new Date().toISOString(),
  }
];

const seedEpisodes: Episode[] = [
  {
    id: 'ep-1',
    showId: 'show-1',
    episodeNumber: 14,
    title: 'Da Kombi Velha à Fábrica de 400 Funcionários',
    idea: 'Quero entrevistar o João Silva, que começou vendendo ferramentas numa Kombi usada e hoje é dono de uma das maiores fábricas de ferramentas mecânicas do país. Quero descobrir a verdade sobre a quase falência dele em 2014, os erros no início, as noites sem dormir e como ele aprendeu a liderar tanta gente sem nunca ter feito faculdade.',
    guestName: 'João Silva',
    guestId: 'guest-1',
    host: 'Renan Vianna',
    format: 'Entrevista',
    targetDurationMin: 45,
    objective: 'Inspirar quem está no início do negócio e revelar a resiliência prática necessária para suportar perdas catastróficas.',
    additionalInfo: 'João trouxe uma chave de boca número 17 que foi a primeira ferramenta vendida por ele.',
    status: 'ready',
    diagnosis: {
      centralTheme: 'A travessia da sobrevivência operária para a liderança industrial em grande escala.',
      potentialStory: 'A jornada de um homem que só tinha ferramentas de segunda mão, encarou uma enchente que destruiu tudo, e usou a lealdade dos fornecedores para renascer.',
      primaryConflict: 'A enchente de 2014: R$ 1,2 milhão em dívidas, maquinário submerso e apenas R$ 12 na conta bancária no dia de pagar a folha de pagamento.',
      primaryTransformation: 'De vendedor autônomo individualista que fazia tudo sozinho para um líder respeitado por centenas de colaboradores operários.',
      whyWatch: 'Mostra o empreendedorismo real brasileiro sem romantização: sem aporte de venture capital, com calo nas mãos e negociação dura.',
      whatToDiscover: 'O que ele fez exatamente na manhã seguinte à enchente e como conseguiu crédito quando todos os bancos fecharam as portas.',
      researchPoints: [
        'Confirmar data exata e prejuízo da enchente de 2014',
        'Verificar se a primeira loja ainda existe ou se foi vendida',
        'Checar a transição da revenda para a fabricação própria em 2017'
      ],
      highImpactMoments: [
        'A confissão dos R$ 12 na conta no momento da enchente',
        'A primeira vez que teve que demitir um amigo de infância que roubou a empresa',
        'A chegada da chave número 17 no estúdio como âncora emocional'
      ],
      approved: true,
    },
    research: {
      aboutGuest: 'João Silva, 48 anos, natural do ABC paulista. Casado com Dona Maria há 24 anos, pai de dois filhos engenheiros. Começou a trabalhar aos 12 anos como engraxate.',
      trajectory: '1998: Mecânico contratado. 2004: Adquire Kombi 1989 e passa a revender ferramentas em oficinas mecânicas do grande ABC. 2010: Abre primeiro galpão de 200m². 2014: Enchente histórica destrói estoque. 2017: Funda a linha de produção própria Ferramentas Brasil. 2024: Inaugura nova planta de 12.000m².',
      company: 'Ferramentas Brasil S/A. Mais de 800 SKUs ativos, distribuição em 2.400 pontos de venda em 18 estados. Certificação ISO 9001.',
      keyDatesAndNumbers: '2008 (início na Kombi) | 2014 (enchente - prejuízo R$ 1,8M) | 420 funcionários | R$ 85M faturamento anual estimado.',
      previousInterviews: 'Participou do podcast regional da ACIABC em 2023 (foco apenas em dados técnicos do setor) e concedeu breve entrevista ao jornal Diário do Grande ABC em 2021.',
      recurringThemes: 'Disciplina inegociável, respeito a quem trabalha no chão de fábrica e aversão a endividamento bancário predatório.',
      contradictionsAndClarifications: 'Na entrevista de 2021 afirmou que nunca pegou empréstimo, mas na reportagem da ACIABC citou um financiamento do BNDES em 2018 para o forno de indução. (Vale pedir esclarecimento com respeito).',
      compellingStories: 'O dia em que um fornecedor alemão de aço viajou ao Brasil para conhecer a pequena fábrica e jantou um marmitex com João e os operários.',
      sources: [
        {
          id: 'src-1',
          title: 'Registro na Junta Comercial e Histórico da Empresa',
          url: 'https://jucesp.sp.gov.br/consulta',
          detail: 'Fundação formal em 12/03/2010 sob CNPJ ativo.',
          status: 'CONFIRMADO',
          category: 'company'
        },
        {
          id: 'src-2',
          title: 'Noticiário Climático do ABC - Enchente Março de 2014',
          url: 'https://g1.globo.com/sp/santo-andre/noticia/2014/03/chuva.html',
          detail: 'Transbordamento do córrego dos Meninos que atingiu o galpão da Rua Jurubatuba.',
          status: 'CONFIRMADO',
          category: 'dates_numbers'
        },
        {
          id: 'src-3',
          title: 'Financiamento BNDES vs Falas sobre Empréstimos',
          detail: 'Esclarecer se o financiamento foi tomado apenas após o faturamento atingir escala ou se foi crucial na virada fabril.',
          status: 'PERGUNTAR AO CONVIDADO',
          category: 'contradictions'
        }
      ]
    },
    outline: [
      {
        id: 'block-1',
        blockNumber: 1,
        title: 'Cold Open & Abertura',
        estimatedDurationMin: 3,
        objective: 'Criar gancho eletrizante e contextualizar a dimensão da jornada de João.',
        keyThemes: ['Impacto inicial', 'Contraste Kombi vs Fábrica'],
        transitionText: 'João, antes de falar da fábrica com 400 colaboradores, eu quero voltar exatamente pro dia em que essa história quase morreu.'
      },
      {
        id: 'block-2',
        blockNumber: 2,
        title: 'A Origem na Kombi e a Fome de Vencer',
        estimatedDurationMin: 8,
        objective: 'Mapear a gênese: o mecânico que virou mascate de ferramentas.',
        keyThemes: ['Início sem dinheiro', 'Primeiras vendas', 'Apoio familiar'],
        transitionText: 'Tudo parecia estar caminhando para frente até que o mês de março de 2014 chegou...'
      },
      {
        id: 'block-3',
        blockNumber: 3,
        title: 'A Grande Ruptura: A Enchente de 2014',
        estimatedDurationMin: 12,
        objective: 'Extrair o momento de maior vulnerabilidade humana e teste de caráter.',
        keyThemes: ['Perda material total', 'A folha com R$ 12 na conta', 'Apoio da esposa'],
        transitionText: 'Muita gente teria jogado a toalha ali. Você não só continuou como decidiu fabricar suas próprias ferramentas.'
      },
      {
        id: 'block-4',
        blockNumber: 4,
        title: 'A Virada Industrial: Da Revenda à Fabricação',
        estimatedDurationMin: 10,
        objective: 'Analisar a decisão arriscada de comprar maquinário pesado e competir com multinacionais.',
        keyThemes: ['Maquinário de ponta', 'Qualidade de aço', 'Concorrência com importados'],
        transitionText: 'Com o crescimento, veio o desafio mais silencioso: aprender a liderar 400 pessoas.'
      },
      {
        id: 'block-5',
        blockNumber: 5,
        title: 'Liderança Real, Erros de Gestão e Família',
        estimatedDurationMin: 8,
        objective: 'Humanizar o empresário: demissões difíceis, valores de chão de fábrica e vida pessoal.',
        keyThemes: ['Demissão de amigo', 'Relação com filhos', 'Cultura de trabalho'],
        transitionText: 'Para encerrar, temos o nosso ping-pong com perguntas diretas e sem rodeios.'
      },
      {
        id: 'block-6',
        blockNumber: 6,
        title: 'Ping-Pong Rápido & Encerramento',
        estimatedDurationMin: 4,
        objective: 'Fechar com ritmo dinâmico, conselho prático e CTA direto com o público.',
        keyThemes: ['Respostas bate-pronto', 'Mensagem final', 'Apresentação da relíquia'],
        transitionText: 'João, muito obrigado pela verdade trazida a essa mesa hoje.'
      }
    ],
    questions: [
      {
        id: 'q-1',
        blockId: 'block-2',
        order: 1,
        text: 'João, você lembra exatamente do momento em que percebeu que continuar como mecânico contratado não ia dar o futuro que sua família precisava?',
        objective: 'Descobrir a fagulha inicial da coragem empreendedora.',
        suggestedCamera: 'CAM 2',
        eyeDirection: 'Olhar para convidado',
        followUps: [
          {
            id: 'fu-1',
            triggerCondition: 'SE FALAR SOBRE MEDO OU FAMÍLIA',
            actionOrQuestion: 'Sua esposa te apoiou ou ela pediu pra você não largar a carteira assinada?',
            tag: 'FAMÍLIA'
          },
          {
            id: 'fu-2',
            triggerCondition: 'SE RESPONDER DE FORMA MUITO GENÉRICA',
            actionOrQuestion: 'Mas qual foi o dia exato? O que aconteceu naquele expediente?',
            tag: 'APROFUNDAR'
          }
        ]
      },
      {
        id: 'q-2',
        blockId: 'block-2',
        order: 2,
        text: 'Como você conseguiu comprar aquela Kombi se você não tinha nem dinheiro para abastecer?',
        objective: 'Detalhar a criatividade e a negociação na escassez.',
        suggestedCamera: 'CAM 2',
        eyeDirection: 'Olhar para convidado',
        followUps: [
          {
            id: 'fu-3',
            triggerCondition: 'SE CITAR O NOME DO ANTIGO DONO',
            actionOrQuestion: 'Ele ainda é vivo? Você ainda tem contato com ele?',
            tag: 'CONFLITO'
          }
        ]
      },
      {
        id: 'q-3',
        blockId: 'block-3',
        order: 1,
        text: 'Me leva para a manhã seguinte à chuva de março de 2014. Quando você abriu a porta de aço do galpão, o que os seus olhos viram?',
        objective: 'Criar imagem sensorial profunda da pior crise da vida dele.',
        suggestedCamera: 'CAM 2',
        eyeDirection: 'Olhar para convidado',
        followUps: [
          {
            id: 'fu-4',
            triggerCondition: 'SE ELE EMBARGAR A VOZ OU SE EMOCIONAR',
            actionOrQuestion: 'NÃO INTERROMPER. Segurar silêncio e manter plano na CAM 3.',
            tag: 'NÃO INTERROMPER'
          },
          {
            id: 'fu-5',
            triggerCondition: 'SE FALAR DO VALOR MONETÁRIO PERDIDO',
            actionOrQuestion: 'É verdade que na folha de pagamento você tinha literalmente R$ 12 no banco?',
            tag: 'DINHEIRO'
          },
          {
            id: 'fu-6',
            triggerCondition: 'SE MENCIONAR DESESPERO',
            actionOrQuestion: 'Você chegou a pensar em desistir de tudo ali mesmo?',
            tag: 'MEDO'
          }
        ]
      },
      {
        id: 'q-4',
        blockId: 'block-3',
        order: 2,
        text: 'Como foi a conversa com os seus 18 funcionários da época quando você avisou que não tinha dinheiro para pagar a semana?',
        objective: 'Evidenciar o caráter e a lealdade da equipe em tempos de crise.',
        suggestedCamera: 'CAM 2',
        eyeDirection: 'Olhar para convidado',
        followUps: [
          {
            id: 'fu-7',
            triggerCondition: 'SE CITAR ALGUM FUNCIONÁRIO ESPECÍFICO',
            actionOrQuestion: 'Essa pessoa ainda está com você hoje na fábrica nova?',
            tag: 'APROFUNDAR'
          }
        ]
      },
      {
        id: 'q-5',
        blockId: 'block-4',
        order: 1,
        text: 'Todo mundo dizia que fabricar no Brasil era suicídio por causa de impostos e importação chinesa. O que te fez dar esse salto aos 40 anos?',
        objective: 'Extrair a visão estratégica e coragem operacional.',
        suggestedCamera: 'CAM 2',
        eyeDirection: 'Olhar para convidado',
        followUps: [
          {
            id: 'fu-8',
            triggerCondition: 'SE FALAR DE QUALIDADE DO PRODUTO',
            actionOrQuestion: 'O que a sua chave de fenda tem que a importada não entrega?',
            tag: 'APROFUNDAR'
          }
        ]
      },
      {
        id: 'q-6',
        blockId: 'block-5',
        order: 1,
        text: 'Qual foi o erro de gestão mais doloroso que você cometeu quando o negócio começou a crescer rápido demais?',
        objective: 'Romper a imagem de infalibilidade e gerar identificação genuína.',
        suggestedCamera: 'CAM 2',
        eyeDirection: 'Olhar para convidado',
        followUps: [
          {
            id: 'fu-9',
            triggerCondition: 'SE CITAR CONFLITO COM SÓCIO OU AMIGO',
            actionOrQuestion: 'Como você lidou com a quebra de confiança?',
            tag: 'CONFLITO'
          }
        ]
      }
    ],
    script: [
      {
        id: 'sc-1',
        blockId: 'block-1',
        timestamp: '00:00',
        type: 'cold_open',
        camera: 'CAM 3',
        speaker: 'João Silva',
        targetPerson: 'Audiência / Fora de quadro',
        eyeDirection: 'Olhar distante, pensativo',
        shotType: 'Plano Fechado / Close Expressivo',
        content: '"Naquela manhã de 2014, quando a água baixou, eu puxei a porta de aço e olhei para o estoque... Eu tinha R$ 1,8 milhão em dívidas vencidas e R$ 12 na conta. O gerente do banco me disse: João, acabou pra você."',
        directionalMarkers: ['COLD OPEN', 'PAUSA DRAMÁTICA', 'SEGURAR PLANO', 'CORTE SECO'],
        isTeleprompter: false,
      },
      {
        id: 'sc-2',
        blockId: 'block-1',
        timestamp: '00:22',
        type: 'vinheta',
        camera: 'CAM 1',
        speaker: 'Sistema',
        eyeDirection: 'Centro de tela',
        shotType: 'Arte Visual / Motion',
        content: '[ VINHETA MENTES DE VALOR - CORTE DE SOM ENÉRGICO ]',
        directionalMarkers: ['VINHETA', 'GC IDENTIFICAÇÃO'],
        isTeleprompter: false,
      },
      {
        id: 'sc-3',
        blockId: 'block-1',
        timestamp: '00:30',
        type: 'opening',
        camera: 'CAM 1',
        speaker: 'Renan Vianna (Apresentador)',
        eyeDirection: 'Olhar firme e direto para a lente',
        shotType: 'Plano Médio Frontal',
        content: 'Existe um capítulo na vida de quase todo empresário de sucesso que você não vai encontrar em nenhum livro de negócios. É o capítulo do silêncio. Daquela noite em que as portas parecem fechadas e ninguém mais atende o telefone. Hoje você vai conhecer a história de quem começou vendendo peças numa Kombi de segunda mão e construiu uma das maiores indústrias de ferramentas da América Latina. Com vocês, João Silva.',
        directionalMarkers: ['OLHAR PARA LENTE', 'TOM FIRME E INSPIRADOR'],
        isTeleprompter: true,
      },
      {
        id: 'sc-4',
        blockId: 'block-1',
        timestamp: '01:05',
        type: 'transition',
        camera: 'CAM 2',
        speaker: 'Renan Vianna (Apresentador)',
        targetPerson: 'João Silva',
        eyeDirection: 'Olhar para convidado',
        shotType: 'Plano Médio 45°',
        content: 'João, seja muito bem-vindo ao Mentes de Valor. É uma honra ter você nessa mesa.',
        directionalMarkers: ['SORRISO SUTIL', 'CORTE → CAM 3'],
        isTeleprompter: false,
      },
      {
        id: 'sc-5',
        blockId: 'block-2',
        timestamp: '01:20',
        type: 'question',
        camera: 'CAM 2',
        alternativeCamera: 'CAM 3',
        speaker: 'Renan Vianna (Apresentador)',
        targetPerson: 'João Silva',
        eyeDirection: 'Olhar para convidado',
        shotType: 'Plano Médio 45°',
        content: 'João, você lembra exatamente do momento em que percebeu que continuar como mecânico contratado não ia dar o futuro que sua família precisava?',
        directionalMarkers: ['CORTE IMEDIATO PARA CAM 3 ASSIM QUE TERMINAR PERGUNTA', 'NÃO INTERROMPER'],
        isTeleprompter: false,
        questionRefId: 'q-1',
      },
      {
        id: 'sc-6',
        blockId: 'block-2',
        timestamp: '01:38',
        type: 'reaction',
        camera: 'CAM 3',
        speaker: 'João Silva (Convidado)',
        targetPerson: 'Renan Vianna',
        eyeDirection: 'Olhar para apresentador',
        shotType: 'Plano Fechado Convidado',
        content: '[João relata o nascimento do filho mais velho e a falta de dinheiro para comprar o remédio na farmácia em 1999.]',
        directionalMarkers: ['B-ROLL: INSERIR FOTO DA KOMBI 1989', 'REAÇÃO NA CAM 2'],
        isTeleprompter: false,
      },
      {
        id: 'sc-7',
        blockId: 'block-3',
        timestamp: '11:15',
        type: 'question',
        camera: 'CAM 2',
        speaker: 'Renan Vianna (Apresentador)',
        targetPerson: 'João Silva',
        eyeDirection: 'Olhar para convidado',
        shotType: 'Plano Fechado 45°',
        content: 'Me leva para a manhã seguinte à chuva de março de 2014. Quando você abriu a porta de aço do galpão, o que os seus olhos viram?',
        directionalMarkers: ['TOM GRAVE', 'CORTE SUAVE → CAM 3', 'SEGURAR PLANO'],
        isTeleprompter: false,
        questionRefId: 'q-3',
      },
      {
        id: 'sc-8',
        blockId: 'block-6',
        timestamp: '42:10',
        type: 'closing',
        camera: 'CAM 1',
        speaker: 'Renan Vianna (Apresentador)',
        eyeDirection: 'Olhar para lente',
        shotType: 'Plano Médio Frontal',
        content: 'Essa chave número 17 que o João colocou na mesa hoje não é apenas um pedaço de aço forjado. É o símbolo de que a dignidade e a palavra valem mais do que qualquer planilha. Se essa conversa te fez lembrar por que você começou o seu negócio, compartilhe esse episódio e se inscreva no canal. Nos vemos na próxima semana no Mentes de Valor.',
        directionalMarkers: ['OLHAR PARA LENTE', 'SUBIR TRILHA INSTRUMENTAL', 'INSERIR CRÉDITOS NA TELA'],
        isTeleprompter: true,
      }
    ],
    cameras: defaultCameras,
    assets: [
      {
        id: 'ast-1',
        blockId: 'block-2',
        type: 'foto',
        title: 'Foto da Kombi 1989 com as ferramentas',
        description: 'Foto analógica digitalizada mostrando João com 30 anos ao lado da Kombi branca.',
        moment: 'Durante a resposta sobre o início das vendas nas oficinas.',
        status: 'obtido',
      },
      {
        id: 'ast-2',
        blockId: 'block-3',
        type: 'foto',
        title: 'Manchete de jornal da enchente de 2014 no galpão',
        description: 'Recorte de jornal local mostrando o galpão alagado na Rua Jurubatuba.',
        moment: 'Quando João narrar a chegada ao galpão submerso.',
        status: 'obtido',
      },
      {
        id: 'ast-3',
        blockId: 'block-4',
        type: 'video',
        title: 'B-Roll fábrica atual em operação',
        description: 'Take cinematográfico em 4K das prensas industriais e fornos de indução.',
        moment: 'Na transição para a fabricação industrial.',
        status: 'aprovado',
      }
    ],
    shorts: [
      {
        id: 'sh-1',
        title: 'O dia em que eu tinha R$ 12 na conta e R$ 1,8M em dívidas',
        hook: '"O gerente do banco olhou pra mim e disse: João, você tá liquidado."',
        generatingQuestion: 'O que você viu ao abrir a porta do galpão após a enchente?',
        estimatedDuration: '50s',
        status: 'Planejado',
        notes: 'Corte perfeito para Reels e TikTok com música de tensão e virada épica.'
      },
      {
        id: 'sh-2',
        title: 'A diferença entre a chave de fenda chinesa e a brasileira',
        hook: '"Se a ferramenta espanar na mão do mecânico, o prejuízo não é dele, é meu."',
        generatingQuestion: 'Por que fabricar no Brasil contra os importados?',
        estimatedDuration: '40s',
        status: 'Planejado',
        notes: 'Foco no orgulho da indústria nacional.'
      },
      {
        id: 'sh-3',
        title: 'Como demitir um amigo sem perder a sua alma',
        hook: '"Amizade é fora do portão da fábrica. Ali dentro, 400 famílias dependem do resultado."',
        generatingQuestion: 'Qual foi o erro de gestão mais doloroso?',
        estimatedDuration: '45s',
        status: 'Planejado',
      }
    ],
    recordingMarkers: [
      {
        id: 'mk-1',
        timestampSec: 745,
        formattedTime: '00:12:25',
        type: 'momento_forte',
        blockTitle: 'A Grande Ruptura: A Enchente de 2014',
        referenceText: 'João embargou a voz e contou sobre a promessa que fez para a mãe dele antes dela falecer.',
        comment: 'COLOCAR NO TEASER DO EPISÓDIO!'
      }
    ],
    technicalChecklist: {
      cam1Recording: false,
      cam2Recording: false,
      cam3Recording: false,
      micHost: false,
      micGuest: false,
      audioMonitored: false,
      lighting: false,
      memoryCardsStorage: false,
      batteries: false,
      syncClap: false,
      waterReady: false,
      silentPhones: false,
      customItems: [
        { id: 't-1', label: 'Chave nº 17 posicionada na bancada para o apresentador segurar', done: false }
      ]
    },
    versions: [
      {
        id: 'v-1',
        versionNumber: 1,
        name: 'Rascunho Inicial da IA',
        savedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        description: 'Primeira versão estruturada gerada a partir da ideia.',
        snapshot: {}
      },
      {
        id: 'v-2',
        versionNumber: 2,
        name: 'Versão com Pesquisa & Repiques',
        savedAt: new Date(Date.now() - 1800000).toISOString(),
        description: 'Adicionados detalhes da enchente de 2014 e ramificações nas perguntas.',
        snapshot: {}
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export class Database {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
  }

  private load(): DatabaseState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.episodes && parsed.shows) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading database, resetting to seeds:', e);
    }

    const initial: DatabaseState = {
      shows: seedShows,
      episodes: seedEpisodes,
      guests: seedGuests,
    };
    this.save(initial);
    return initial;
  }

  private save(state: DatabaseState) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  public getShows(): Show[] {
    return this.state.shows;
  }

  public getShow(id: string): Show | undefined {
    return this.state.shows.find(s => s.id === id);
  }

  public saveShow(show: Show): Show {
    const idx = this.state.shows.findIndex(s => s.id === show.id);
    if (idx >= 0) {
      this.state.shows[idx] = { ...show, updatedAt: new Date().toISOString() };
    } else {
      this.state.shows.push(show);
    }
    this.save(this.state);
    return show;
  }

  public deleteShow(id: string): boolean {
    const initialLen = this.state.shows.length;
    this.state.shows = this.state.shows.filter(s => s.id !== id);
    if (this.state.shows.length !== initialLen) {
      this.save(this.state);
      return true;
    }
    return false;
  }

  public getGuests(): Guest[] {
    return this.state.guests;
  }

  public saveGuest(guest: Guest): Guest {
    const idx = this.state.guests.findIndex(g => g.id === guest.id);
    if (idx >= 0) {
      this.state.guests[idx] = guest;
    } else {
      this.state.guests.push(guest);
    }
    this.save(this.state);
    return guest;
  }

  public getEpisodes(): Episode[] {
    return this.state.episodes;
  }

  public getEpisode(id: string): Episode | undefined {
    return this.state.episodes.find(e => e.id === id);
  }

  public saveEpisode(episode: Episode): Episode {
    const idx = this.state.episodes.findIndex(e => e.id === episode.id);
    const updated = { ...episode, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      this.state.episodes[idx] = updated;
    } else {
      this.state.episodes.unshift(updated);
    }
    this.save(this.state);
    return updated;
  }

  public deleteEpisode(id: string): boolean {
    const initialLen = this.state.episodes.length;
    this.state.episodes = this.state.episodes.filter(e => e.id !== id);
    if (this.state.episodes.length !== initialLen) {
      this.save(this.state);
      return true;
    }
    return false;
  }
}

export const db = new Database();
