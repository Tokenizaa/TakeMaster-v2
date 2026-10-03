import fs from 'fs';
import path from 'path';
import { DatabaseState, Episode, Program, Guest, CameraConfig } from '../types/domain';

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

const seedPrograms: Program[] = [
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
    legacy_id: null,
    program_id: null,
    name: 'João Silva',
    type: 'individual',
    group_type: null,
    role: 'Fundador & CEO',
    company: 'Ferramentas Brasil S/A',
    company_or_group: null,
    bio: 'Começou como mecânico aos 17 anos em São Bernardo do Campo. Vendeu ferramentas usadas numa Kombi em 2008. Hoje comanda uma fábrica de 12.000m² avec 420 colaboradores e faturamento superior a R$ 85 milhões.',
    contacts: 'assessoria@ferramentasbrasil.com.br / (11) 98765-4321',
    notes: 'Homem humilde, fala com entusiasmo sobre a família e a equipe de chão de fábrica. Evita falar sobre termos em inglês sofisticados, prefere linguagem direta e pé no chão.',
    links: ['https://linkedin.com/in/joaosilva-ferramentas', 'https://ferramentasbrasil.com.br'],
    members: [],
    entity_type: 'individual',
    social_handles: {},
    previous_episodes: ['ep-1'],
    previous_research_summary: 'Pesquisa realizada em 2026 destacou momento crítico da enchente de 2014 onde perdeu 70% do maquinário.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'guest-2',
    legacy_id: null,
    program_id: null,
    name: 'Dra. Camila Nogueira',
    type: 'individual',
    group_type: null,
    role: 'Cofundadora & CTO',
    company: 'BioHealth Analytics',
    company_or_group: null,
    bio: 'Pioneira em diagnósticos preventivos com modelos de visão computacional na América Latina.',
    contacts: 'camila@biohealth.ai',
    notes: 'Excelente didática, muito clara e precisa com dados numéricos.',
    links: ['https://linkedin.com/in/camilanogueira-bio'],
    members: [],
    entity_type: 'individual',
    social_handles: {},
    previous_episodes: [],
    previous_research_summary: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const seedEpisodes: Episode[] = [
  {
    id: 'ep-1',
    program_id: 'show-1',
    episode_number: 14,
    title: 'Da Kombi Velha à Fábrica de 400 Funcionários',
    idea: 'Quero entrevistar o João Silva, que começou vendendo ferramentas numa Kombi usada e hoje é dono de uma das maiores fábricas de ferramentas mecânicas do país. Quero descobrir a verdade sobre a quase falência dele em 2014, os erros no início, as noites sem dormir e como ele aprendeu a liderar tanta gente sem nunca ter feito faculdade.',
    guest_name: 'João Silva',
    guest_id: 'guest-1',
    host: 'Renan Vianna',
    format: 'Entrevista',
    target_duration_min: 45,
    target_duration_minutes: 45,
    objective: 'Inspirar quem está no início do negócio e revelar a resiliência prática necessária para suportar perdas catastróficas.',
    additional_info: 'João trouxe uma chave de boca número 17 que foi a primeira ferramenta vendida por ele.',
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
        keyThemes: ['Inicio sem dinheiro', 'Primeiras vendas', 'Apoio familiar'],
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
        keyThemes: ['Maquinaria de ponta', 'Qualidade de aço', 'Competência com importados'],
        transitionText: 'Con o crescimento, veio o desafio mais silencioso: aprender a liderar 400 pessoas.'
      },
      {
        id: 'block-5'

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
        if (parsed.episodes || parsed.programs || parsed.shows) {
          // Normaliza formato legado (`shows`) para o atual (`programs`)
          const normalized: DatabaseState = {
            programs: parsed.programs ?? parsed.shows ?? [],
            episodes: parsed.episodes ?? [],
            guests: parsed.guests ?? [],
          };
          if (!parsed.programs || parsed.shows) this.save(normalized);
          return normalized;
        }
      }
    } catch (e) {
      console.error('Error loading database, resetting to seeds:', e);
    }

const initial: DatabaseState = {
  programs: seedPrograms,
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

public getPrograms(): Program[] {
  return this.state.programs;
}

public getProgram(id: string): Program | undefined {
  return this.state.programs.find(s => s.id === id);
}

public saveProgram(program: Program): Program {
  const idx = this.state.programs.findIndex(s => s.id === program.id);
  if (idx >= 0) {
    this.state.programs[idx] = { ...program, updatedAt: new Date().toISOString() };
  } else {
    this.state.programs.push(program);
  }
  this.save(this.state);
  return program;
}

public deleteProgram(id: string): boolean {
  const initialLen = this.state.programs.length;
  this.state.programs = this.state.programs.filter(s => s.id !== id);
  if (this.state.programs.length !== initialLen) {
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
