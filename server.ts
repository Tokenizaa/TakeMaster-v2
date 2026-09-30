import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from './src/server/db';
import { ai, parseGeminiJson } from './src/server/ai';
import { Episode, EditorialDiagnosis, ResearchData, OutlineBlock, QuestionItem, ScriptItem, PlannedShort, FollowUpItem } from './src/types';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));

// --- REST Endpoints: Shows ---
app.get('/api/shows', (req: Request, res: Response) => {
  res.json(db.getShows());
});

app.get('/api/shows/:id', (req: Request, res: Response) => {
  const show = db.getShow(req.params.id);
  if (!show) return res.status(404).json({ error: 'Show not found' });
  res.json(show);
});

app.post('/api/shows', (req: Request, res: Response) => {
  const newShow = {
    ...req.body,
    id: req.body.id || `show-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.saveShow(newShow);
  res.status(201).json(newShow);
});

app.put('/api/shows/:id', (req: Request, res: Response) => {
  const updated = db.saveShow({ ...req.body, id: req.params.id });
  res.json(updated);
});

app.delete('/api/shows/:id', (req: Request, res: Response) => {
  const success = db.deleteShow(req.params.id);
  res.json({ success });
});

// --- REST Endpoints: Episodes ---
app.get('/api/episodes', (req: Request, res: Response) => {
  res.json(db.getEpisodes());
});

app.get('/api/episodes/:id', (req: Request, res: Response) => {
  const ep = db.getEpisode(req.params.id);
  if (!ep) return res.status(404).json({ error: 'Episode not found' });
  res.json(ep);
});

app.post('/api/episodes', (req: Request, res: Response) => {
  const ep = req.body as Episode;
  const created = db.saveEpisode({
    ...ep,
    id: ep.id || `ep-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  res.status(201).json(created);
});

app.put('/api/episodes/:id', (req: Request, res: Response) => {
  const updated = db.saveEpisode({ ...req.body, id: req.params.id });
  res.json(updated);
});

app.delete('/api/episodes/:id', (req: Request, res: Response) => {
  const success = db.deleteEpisode(req.params.id);
  res.json({ success });
});

// --- REST Endpoints: Guests ---
app.get('/api/guests', (req: Request, res: Response) => {
  res.json(db.getGuests());
});

app.post('/api/guests', (req: Request, res: Response) => {
  const guest = req.body;
  const created = db.saveGuest({
    ...guest,
    id: guest.id || `guest-${Date.now()}`,
    createdAt: new Date().toISOString(),
  });
  res.status(201).json(created);
});

app.put('/api/guests/:id', (req: Request, res: Response) => {
  const updated = db.saveGuest({ ...req.body, id: req.params.id });
  res.json(updated);
});

// --- AI Endpoints using @google/genai (model: gemini-3.8-flash) ---

// 1. Editorial Diagnosis
app.post('/api/ai/diagnose', async (req: Request, res: Response) => {
  const { idea, guestName, format, durationMin, objective, additionalInfo } = req.body;

  if (!ai) {
    // High-quality contextual fallback if API key is not yet set
    const fallbackDiagnosis: EditorialDiagnosis = {
      centralTheme: `A jornada e superação de ${guestName || 'protagonista'} no formato ${format || 'Entrevista'}`,
      potentialStory: `Como a ideia inicial se transformou em uma trajetória de alto impacto, superando incertezas e riscos.`,
      primaryConflict: `O momento crucial onde tudo esteve em risco e as decisões difíceis tomadas.`,
      primaryTransformation: `A evolução pessoal e profissional desde o início até a consolidação atual.`,
      whyWatch: `História humana real com lições práticas de execução, coragem e liderança sem floreios.`,
      whatToDiscover: `Os bastidores reais das decisões mais difíceis que nunca foram reveladas abertamente.`,
      researchPoints: [
        `Verificar cronologia exata dos momentos de crise e virada de ${guestName || 'convidado'}`,
        `Buscar números de faturamento, funcionários e clientes confirmados`,
        `Identificar potenciais contradições em entrevistas anteriores`
      ],
      highImpactMoments: [
        `A confissão do momento em que pensou em desistir`,
        `O ponto de virada definitivo`,
        `A lição mais dura aprendida na prática`
      ],
      approved: false,
    };
    return res.json(fallbackDiagnosis);
  }

  try {
    const prompt = `Você é um Produtor Executivo e Supervisor de Conteúdo Audiovisual sênior de televisão e streaming.
Analise a seguinte ideia de episódio para um programa de formato "${format || 'Entrevista'}" com duração de aproximadamente ${durationMin || 45} minutos:

IDÉIA: "${idea}"
CONVIDADO: "${guestName || 'Não especificado'}"
OBJETIVO: "${objective || 'Impactar e ensinar a audiência'}"
INFORMAÇÕES ADICIONAIS: "${additionalInfo || 'Nenhuma'}"

Gere um DIAGNÓSTICO EDITORIAL aprofundado, que encontre a alma da história, o conflito e a transformação.
Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "centralTheme": "string",
  "potentialStory": "string",
  "primaryConflict": "string",
  "primaryTransformation": "string",
  "whyWatch": "string",
  "whatToDiscover": "string",
  "researchPoints": ["string", "string", "string"],
  "highImpactMoments": ["string", "string", "string"],
  "approved": false
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const diagnosis = parseGeminiJson<EditorialDiagnosis>(response.text, {
      centralTheme: 'Tema central do episódio',
      potentialStory: 'História potencial a ser explorada',
      primaryConflict: 'Conflito principal a ser abordado',
      primaryTransformation: 'Transformação do protagonista',
      whyWatch: 'Relevância para a audiência',
      whatToDiscover: 'Pontos não óbvios a desvendar',
      researchPoints: ['Pesquisa 1', 'Pesquisa 2'],
      highImpactMoments: ['Momento de tensão', 'Momento de revelação'],
      approved: false,
    });

    res.json(diagnosis);
  } catch (error: any) {
    console.error('Error generating diagnosis:', error);
    res.status(500).json({ error: error.message || 'Falha ao gerar diagnóstico editorial' });
  }
});

// 2. Research Generation
app.post('/api/ai/research', async (req: Request, res: Response) => {
  const { guestName, company, idea, diagnosis } = req.body;

  if (!ai) {
    const fallbackResearch: ResearchData = {
      aboutGuest: `${guestName || 'Convidado'}, profissional de destaque com histórico no setor.`,
      trajectory: `Início de carreira autônomo, primeiros projetos e expansão das operações.`,
      company: `${company || 'Empresa'}, atuação no mercado brasileiro com relevância no segmento.`,
      keyDatesAndNumbers: `Marcos históricos relevantes, faturamento e equipe atual.`,
      previousInterviews: `Aparições em podcasts do setor, reportagens e palestras.`,
      recurringThemes: `Disciplina de trabalho, cultura de equipe, sobrevivência a crises e inovação.`,
      contradictionsAndClarifications: `Esclarecer declarações passadas e validar momentos de virada com perguntas respeitosas.`,
      compellingStories: `A primeira grande conquista e a crise mais emblemática.`,
      sources: [
        {
          id: `src-${Date.now()}-1`,
          title: 'Registros e Histórico Público de Negócios',
          detail: 'Validação da fundação, estrutura societária e atuação pública.',
          status: 'CONFIRMADO',
          category: 'company'
        },
        {
          id: `src-${Date.now()}-2`,
          title: 'Dados Financeiros e Metas de Crescimento',
          detail: 'Números de faturamento mencionados na imprensa.',
          status: 'NÃO CONFIRMADO',
          category: 'dates_numbers'
        },
        {
          id: `src-${Date.now()}-3`,
          title: 'Ponto sensível sobre a primeira sociedade',
          detail: 'Verificar como ocorreu a transição dos primeiros sócios na empresa.',
          status: 'PERGUNTAR AO CONVIDADO',
          category: 'contradictions'
        }
      ]
    };
    return res.json(fallbackResearch);
  }

  try {
    const prompt = `Você é um Pesquisador Jornalístico e de Produção Audiovisual experiente.
Com base nas informações abaixo, estruture um Dossiê de Pesquisa rico e factual para subsidiar o roteiro e a entrevista.
IMPORTANTE: Nunca invente fatos sobre pessoas reais. Para cada item que precisar de validação ou for sensível, categorize as fontes claramente como 'CONFIRMADO', 'NÃO CONFIRMADO' ou 'PERGUNTAR AO CONVIDADO'.

CONVIDADO: "${guestName}"
EMPRESA: "${company || ''}"
IDÉIA/PROPOSTA: "${idea}"
DIAGNÓSTICO EDITORIAL: ${JSON.stringify(diagnosis || {})}

Retorne ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "aboutGuest": "string",
  "trajectory": "string",
  "company": "string",
  "keyDatesAndNumbers": "string",
  "previousInterviews": "string",
  "recurringThemes": "string",
  "contradictionsAndClarifications": "string",
  "compellingStories": "string",
  "sources": [
    {
      "id": "string",
      "title": "string",
      "url": "string (opcional)",
      "detail": "string",
      "status": "CONFIRMADO" | "NÃO CONFIRMADO" | "PERGUNTAR AO CONVIDADO",
      "category": "guest" | "trajectory" | "company" | "dates_numbers" | "interviews" | "contradictions" | "stories"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const research = parseGeminiJson<ResearchData>(response.text, {
      aboutGuest: '',
      trajectory: '',
      company: '',
      keyDatesAndNumbers: '',
      previousInterviews: '',
      recurringThemes: '',
      contradictionsAndClarifications: '',
      compellingStories: '',
      sources: [],
    });

    res.json(research);
  } catch (error: any) {
    console.error('Error generating research:', error);
    res.status(500).json({ error: error.message || 'Falha ao gerar pesquisa' });
  }
});

// 3. Smart Outline & Question Creation
app.post('/api/ai/outline', async (req: Request, res: Response) => {
  const { idea, guestName, targetDurationMin, diagnosis, research } = req.body;

  const targetMinutes = targetDurationMin || 45;

  if (!ai) {
    const fallbackOutline: { outline: OutlineBlock[]; questions: QuestionItem[] } = {
      outline: [
        {
          id: 'blk-1',
          blockNumber: 1,
          title: 'Cold Open & Gancho',
          estimatedDurationMin: Math.round(targetMinutes * 0.08),
          objective: 'Capturar atenção imediata com frase forte e apresentar o contraste.',
          keyThemes: ['Frase de impacto', 'Abertura do apresentador'],
          transitionText: 'Antes de falarmos do sucesso atual, quero voltar ao dia em que tudo começou...'
        },
        {
          id: 'blk-2',
          blockNumber: 2,
          title: 'Origem e os Primeiros Passos',
          estimatedDurationMin: Math.round(targetMinutes * 0.2),
          objective: 'Compreender o ambiente de escassez e o primeiro teste de fogo.',
          keyThemes: ['Primeira oportunidade', 'Dificuldades iniciais'],
          transitionText: 'Mas o caminho não permaneceu seguro por muito tempo...'
        },
        {
          id: 'blk-3',
          blockNumber: 3,
          title: 'A Grande Crise e o Teste de Caráter',
          estimatedDurationMin: Math.round(targetMinutes * 0.28),
          objective: 'Mergulhar no principal conflito e no momento de quase colapso.',
          keyThemes: ['Pior momento', 'Decisão no escuro', 'Resiliência'],
          transitionText: 'Foi preciso tomar uma atitude radical para não fechar as portas...'
        },
        {
          id: 'blk-4',
          blockNumber: 4,
          title: 'A Virada Estratégica e Crescimento',
          estimatedDurationMin: Math.round(targetMinutes * 0.24),
          objective: 'Analisar como a transformação ocorreu na prática.',
          keyThemes: ['Inovação', 'Escala', 'Construção da equipe'],
          transitionText: 'Olhando para trás, os erros ensinam mais que as vitórias...'
        },
        {
          id: 'blk-5',
          blockNumber: 5,
          title: 'Lado Humano, Família e Aprendizados',
          estimatedDurationMin: Math.round(targetMinutes * 0.12),
          objective: 'Despir a figura pública e conectar com a dor pessoal e vida real.',
          keyThemes: ['Preço pessoal pago', 'Valores inegociáveis'],
          transitionText: 'Para encerrar, perguntas rápidas e uma mensagem final.'
        },
        {
          id: 'blk-6',
          blockNumber: 6,
          title: 'Perguntas Rápidas & Encerramento',
          estimatedDurationMin: Math.round(targetMinutes * 0.08),
          objective: 'Desfecho dinâmico com lição de vida e chamada para a audiência.',
          keyThemes: ['Bate-bola', 'Conselho definitivo'],
          transitionText: 'Agradecimento e mensagem final aos espectadores.'
        }
      ],
      questions: [
        {
          id: 'q-demo-1',
          blockId: 'blk-2',
          order: 1,
          text: `Você lembra do momento exato em que percebeu que precisava arriscar e criar algo próprio?`,
          objective: 'Extrair o ponto de inflexão original.',
          suggestedCamera: 'CAM 2',
          eyeDirection: 'Olhar para convidado',
          followUps: [
            {
              id: 'fu-demo-1',
              triggerCondition: 'SE FALAR SOBRE MEDO OU DÚVIDA',
              actionOrQuestion: 'Quem ao seu redor disse que aquilo era uma loucura?',
              tag: 'MEDO'
            },
            {
              id: 'fu-demo-2',
              triggerCondition: 'SE RESPONDER DE FORMA SUPERFICIAL',
              actionOrQuestion: 'Me coloca naquela sala. O que você sentiu no peito naquele momento?',
              tag: 'APROFUNDAR'
            }
          ]
        },
        {
          id: 'q-demo-2',
          blockId: 'blk-3',
          order: 1,
          text: `Qual foi a manhã em que você abriu os olhos e sentiu que poderia realmente perder tudo?`,
          objective: 'Extrair a vulnerabilidade máxima do conflito central.',
          suggestedCamera: 'CAM 2',
          eyeDirection: 'Olhar para convidado',
          followUps: [
            {
              id: 'fu-demo-3',
              triggerCondition: 'SE ELE SE EMOCIONAR OU SILENCIAR',
              actionOrQuestion: 'NÃO INTERROMPER. Segurar plano na CAM 3.',
              tag: 'NÃO INTERROMPER'
            },
            {
              id: 'fu-demo-4',
              triggerCondition: 'SE CITAR VALORES FINANCEIROS',
              actionOrQuestion: 'Quanto dinheiro real estava em jogo ali?',
              tag: 'DINHEIRO'
            }
          ]
        }
      ]
    };
    return res.json(fallbackOutline);
  }

  try {
    const prompt = `Você é um Roteirista Chefe e Diretor de Conteúdo Audiovisual.
Gere a PAUTA INTELIGENTE (blocos sequenciais da narrativa) e as PERGUNTAS PRINCIPAIS com REPIQUES INTELIGENTES para o episódio:

IDÉIA: "${idea}"
CONVIDADO: "${guestName || 'Convidado'}"
DURAÇÃO TOTAL ALVO: ${targetMinutes} minutos (a soma dos blocos deve ser EXATAMENTE ou muito próxima de ${targetMinutes} minutos!)
DIAGNÓSTICO EDITORIAL: ${JSON.stringify(diagnosis || {})}
PESQUISA: ${JSON.stringify(research || {})}

REGRAS EDITORIAIS:
1. Nunca gere perguntas burocráticas ou mornas como "Qual sua formação?".
2. Crie perguntas que provoquem histórias e cenas concretas: "Você lembra do momento em que...", "Me leva para aquela manhã...".
3. Para cada pergunta importante, crie 2 a 4 REPIQUES INTELIGENTES com gatilhos condicionais (SE FALAR SOBRE DINHEIRO, SE FALAR SOBRE FAMÍLIA, SE HOUVER SILÊNCIO/EMOÇÃO -> NÃO INTERROMPER, SE RESPONDER SUPERFICIALMENTE).
4. O total dos blocos deve somar ${targetMinutes} minutos.
5. Indique as câmeras (CAM 2 para perguntas ao convidado, CAM 1 para transições/abertura).

Retorne ESTRITAMENTE em formato JSON com o schema:
{
  "outline": [
    {
      "id": "string",
      "blockNumber": 1,
      "title": "string",
      "estimatedDurationMin": number,
      "objective": "string",
      "keyThemes": ["string"],
      "transitionText": "string"
    }
  ],
  "questions": [
    {
      "id": "string",
      "blockId": "string (deve bater com o id de um dos blocos acima)",
      "order": number,
      "text": "string",
      "objective": "string",
      "suggestedCamera": "CAM 2",
      "eyeDirection": "Olhar para convidado",
      "followUps": [
        {
          "id": "string",
          "triggerCondition": "string (ex: SE FALAR SOBRE DINHEIRO)",
          "actionOrQuestion": "string",
          "tag": "DINHEIRO" | "FAMÍLIA" | "MEDO" | "CONFLITO" | "APROFUNDAR" | "NÃO INTERROMPER" | "OUTRO"
        }
      ]
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = parseGeminiJson<{ outline: OutlineBlock[]; questions: QuestionItem[] }>(response.text, {
      outline: [],
      questions: [],
    });

    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating outline:', error);
    res.status(500).json({ error: error.message || 'Falha ao gerar pauta' });
  }
});

// 4. Full Script Generation (Roteiro Completo com Câmeras, Timestamps e Marcadores)
app.post('/api/ai/script', async (req: Request, res: Response) => {
  const { episode } = req.body;

  if (!ai) {
    return res.status(500).json({ error: 'Chave de API não configurada' });
  }

  try {
    const prompt = `Você é um Diretor de TV e Roteirista de Produção Audiovisual profissional.
Escreva o ROTEIRO COMPLETO, cronológico e detalhado para este episódio:

TÍTULO: "${episode.title}"
CONVIDADO: "${episode.guestName}"
APRESENTADOR: "${episode.host || 'Apresentador'}"
FORMATO: "${episode.format}"
DURAÇÃO: ${episode.targetDurationMin} min
BLOCOS DA PAUTA: ${JSON.stringify(episode.outline || [])}
PERGUNTAS E REPIQUES: ${JSON.stringify(episode.questions || [])}
CÂMERAS DISPONÍVEIS: CAM 1 (Frontal Apresentador), CAM 2 (45° Apresentador), CAM 3 (45° Convidado).

REQUISITOS ESSENCIAIS:
1. Incluir COLD OPEN (gancho dramático ou revelador no início, normalmente CAM 3 convidado com fala forte).
2. Vinheta e ABERTURA oficial na CAM 1 (olhar fixo na lente, texto forte marcado para Teleprompter).
3. Transições bem escritas entre os blocos (pontes narrativas na CAM 2 ou CAM 1).
4. Indicação de Câmera Principal e Alternativa para cada item.
5. Direção do Olhar (ex: 'Olhar para a lente', 'Olhar para o convidado').
6. Tipo de Plano ('Plano Médio Frontal', 'Plano Fechado / Close', 'Plano Aberto Geral').
7. Marcadores de Direção: ['COLD OPEN', 'PAUSA', 'NÃO INTERROMPER', 'OLHAR PARA LENTE', 'CORTE SECO', 'B-ROLL', 'FRASE FORTE', 'VINHETA'].
8. Indicar se o item é para Teleprompter ('isTeleprompter': true apenas para falas formais do apresentador, abertura, transição e encerramento).
9. Encerramento com CTA e lição final na CAM 1.

Retorne ESTRITAMENTE em formato JSON com o schema:
{
  "script": [
    {
      "id": "string",
      "blockId": "string (opcional)",
      "timestamp": "00:00",
      "type": "cold_open" | "opening" | "vinheta" | "transition" | "question" | "reaction" | "closing" | "b_roll_insert",
      "camera": "CAM 1" | "CAM 2" | "CAM 3",
      "alternativeCamera": "string (opcional)",
      "speaker": "string",
      "targetPerson": "string (opcional)",
      "eyeDirection": "string",
      "shotType": "string",
      "content": "string",
      "directionalMarkers": ["string"],
      "isTeleprompter": boolean,
      "questionRefId": "string (opcional)"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = parseGeminiJson<{ script: ScriptItem[] }>(response.text, { script: [] });
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating script:', error);
    res.status(500).json({ error: error.message || 'Falha ao gerar roteiro' });
  }
});

// 5. Intelligent Repiques for a single question
app.post('/api/ai/repiques', async (req: Request, res: Response) => {
  const { questionText, context, guestName } = req.body;

  if (!ai) {
    const fallbackFollowups: FollowUpItem[] = [
      {
        id: `fu-${Date.now()}-1`,
        triggerCondition: 'SE FALAR SOBRE DINHEIRO OU PREJUÍZO',
        actionOrQuestion: 'Quanto exatamente estava em risco naquele momento?',
        tag: 'DINHEIRO',
      },
      {
        id: `fu-${Date.now()}-2`,
        triggerCondition: 'SE FALAR SOBRE FAMÍLIA OU ESPOSA',
        actionOrQuestion: 'Como as pessoas mais próximas reagiram a essa decisão?',
        tag: 'FAMÍLIA',
      },
      {
        id: `fu-${Date.now()}-3`,
        triggerCondition: 'SE HOUVER HESITAÇÃO OU EMOÇÃO',
        actionOrQuestion: 'NÃO INTERROMPER. Deixar o silêncio pesar por 3 segundos.',
        tag: 'NÃO INTERROMPER',
      },
      {
        id: `fu-${Date.now()}-4`,
        triggerCondition: 'SE RESPONDER DE FORMA TÉCNICA OU EVASIVA',
        actionOrQuestion: 'Mas no dia a dia real, o que você fez na manhã seguinte?',
        tag: 'APROFUNDAR',
      },
    ];
    return res.json({ followUps: fallbackFollowups });
  }

  try {
    const prompt = `Você é um entrevistador investigativo de alto calibre.
Para a pergunta: "${questionText}"
Convidado: "${guestName || 'Convidado'}"
Contexto: "${context || 'Entrevista em estúdio'}"

Gere 4 a 5 REPIQUES INTELIGENTES (ramificações imediatas baseadas na resposta dele), incluindo gatilho condicional claro, pergunta de ação e tag visual.

Retorne em formato JSON:
{
  "followUps": [
    {
      "id": "string",
      "triggerCondition": "string (ex: SE FALAR SOBRE DINHEIRO)",
      "actionOrQuestion": "string",
      "tag": "DINHEIRO" | "FAMÍLIA" | "MEDO" | "CONFLITO" | "APROFUNDAR" | "NÃO INTERROMPER" | "OUTRO"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = parseGeminiJson<{ followUps: FollowUpItem[] }>(response.text, { followUps: [] });
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating repiques:', error);
    res.status(500).json({ error: error.message || 'Falha ao gerar repiques' });
  }
});

// 6. Planned Shorts / Digital Cuts Planner
app.post('/api/ai/shorts', async (req: Request, res: Response) => {
  const { episode } = req.body;

  if (!ai) {
    const fallbackShorts: PlannedShort[] = [
      {
        id: `sh-${Date.now()}-1`,
        title: 'O dia do quase fim',
        hook: '"Eu abri o galpão e percebi que devia mais do que conseguiria pagar em uma vida."',
        generatingQuestion: 'Qual foi o pior momento da sua trajetória?',
        estimatedDuration: '45-60s',
        status: 'Planejado',
        notes: 'Enquadrar em 9:16 com zoom no olhar na resposta.'
      },
      {
        id: `sh-${Date.now()}-2`,
        title: 'A ilusão do faturamento',
        hook: '"Faturamento é vaidade, lucro é sanidade, mas o caixa é o rei."',
        generatingQuestion: 'Qual erro financeiro quase te destruiu?',
        estimatedDuration: '40s',
        status: 'Planejado'
      }
    ];
    return res.json({ shorts: fallbackShorts });
  }

  try {
    const prompt = `Você é um Estrategista de Conteúdo Digital e Produtor de Cortes/Shorts para YouTube, Instagram Reels e TikTok.
Analise o episódio a seguir e planeje 4 CORTES DE ALTO IMPACTO (Shorts/Reels) com ganchos irresistíveis antes da gravação:

TÍTULO: "${episode.title}"
CONVIDADO: "${episode.guestName}"
PAUTA E PERGUNTAS: ${JSON.stringify(episode.questions || [])}
DIAGNÓSTICO: ${JSON.stringify(episode.diagnosis || {})}

Retorne em formato JSON:
{
  "shorts": [
    {
      "id": "string",
      "title": "string",
      "hook": "string (frase de impacto nos primeiros 3 segundos)",
      "generatingQuestion": "string (pergunta do apresentador que vai gerar essa resposta)",
      "estimatedDuration": "30-60s",
      "status": "Planejado",
      "notes": "string"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = parseGeminiJson<{ shorts: PlannedShort[] }>(response.text, { shorts: [] });
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating shorts:', error);
    res.status(500).json({ error: error.message || 'Falha ao planejar shorts' });
  }
});

// 7. Contextual AI Production Assistant (Modifies actual objects, not isolated chat!)
app.post('/api/ai/assist', async (req: Request, res: Response) => {
  const { episode, userPrompt, currentTab, activeBlockId, activeQuestionId } = req.body;

  if (!ai) {
    return res.json({
      actionType: 'notification',
      message: 'Assistente contextual em modo offline. Configure a chave GEMINI_API_KEY para edições inteligentes automáticas.',
      appliedDiff: null
    });
  }

  try {
    const prompt = `Você é um Co-Produtor e Roteirista Audiovisual em tempo real dentro da plataforma TakeMaster.
O usuário está trabalhando na aba: "${currentTab}".
PEDIDO DO USUÁRIO: "${userPrompt}"

CONTEXTO DO EPISÓDIO ATUAL:
Título: "${episode.title}"
Convidado: "${episode.guestName}"
Duração Alvo: ${episode.targetDurationMin} min
Bloco ativo selecionado: "${activeBlockId || 'Nenhum'}"
Pergunta ativa selecionada: "${activeQuestionId || 'Nenhum'}"
Pauta: ${JSON.stringify(episode.outline || [])}
Perguntas: ${JSON.stringify(episode.questions || [])}

Sua tarefa é retornar uma alteração CONCRETA nos objetos do episódio.
Não fale como um robô genérico. Retorne um plano de ação em JSON com:
- "actionType": 'update_outline' | 'update_script' | 'update_question' | 'adjust_duration' | 'suggest_broll' | 'text_feedback'
- "summary": Breve explicação de 1 frase para o apresentador
- "updatedData": o objeto ou lista com as alterações prontas para serem mescladas no episódio
- "targetField": nome do campo afetado (ex: 'outline', 'questions', 'script', 'diagnosis.potentialStory')

Retorne ESTRITAMENTE em formato JSON:
{
  "actionType": "string",
  "summary": "string",
  "targetField": "string",
  "updatedData": any
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = parseGeminiJson<any>(response.text, {
      actionType: 'text_feedback',
      summary: 'Sugestão processada',
      targetField: '',
      updatedData: null,
    });

    res.json(parsed);
  } catch (error: any) {
    console.error('Error in contextual assistant:', error);
    res.status(500).json({ error: error.message || 'Falha no assistente contextual' });
  }
});

// 8. Editor Script Synthesis (Roteiro do Editor pós-gravação)
app.post('/api/ai/editor-script', async (req: Request, res: Response) => {
  const { episode } = req.body;

  if (!ai) {
    const fallbackEditorScript = `
00:00 - COLD OPEN (CAM 3 Convidado)
[Corte seco para a fala de abertura do João sobre os R$ 12 na conta]

00:22 - VINHETA PRINCIPAL
[Subir áudio 0dB, corte de transição com lettering]

00:30 - APRESENTAÇÃO DO EPISÓDIO (CAM 1 Frontal)
[Plano fechado, olhar na lente. Inserir GC: Renan Vianna - Apresentador]

01:20 - BLOCO 02: ORIGEM (CAM 2 -> CAM 3)
[01:38: Inserir B-Roll Foto da Kombi 1989 em tela dividida / overlay]

11:15 - BLOCO 03: A ENCHENTE DE 2014 (CAM 2 -> CAM 3)
* MOMENTO FORTE MARCADO ÀS 12:25:
João relata promessa feita à mãe. Manter CAM 3 sem corte de reação por 15 segundos para preservar emoção.
[Inserir imagem da manchete do jornal local às 13:10]

42:10 - ENCERRAMENTO (CAM 1 Frontal)
[Subir trilha instrumental suave a -12dB até o fade out final]
`;
    return res.json({ editorScript: fallbackEditorScript });
  }

  try {
    const prompt = `Você é um Diretor de Pós-Produção e Montador de Vídeo Sênior.
Sintetize um ROTEIRO DE EDIÇÃO técnico, conciso e profissional para a equipe de montagem, combinando a minutagem, as câmeras, os marcadores de gravação e as oportunidades de B-Roll:

EPISÓDIO: "${episode.title}"
CONVIDADO: "${episode.guestName}"
ROTEIRO: ${JSON.stringify(episode.script || [])}
MARCADORES DE GRAVAÇÃO FEITOS NO MODO ESTÚDIO: ${JSON.stringify(episode.recordingMarkers || [])}
MATERIAIS / B-ROLL: ${JSON.stringify(episode.assets || [])}

Retorne um texto formatado em minutagem cronológica (ex: "00:00 COLD OPEN CAM 3", "01:20 CAM 2 Pergunta", "12:25 🔥 MOMENTO FORTE MARCADO", "Inserir foto antiga", etc.) pronto para ser entregue ao editor.

Retorne em formato JSON:
{
  "editorScript": "string formatada"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = parseGeminiJson<{ editorScript: string }>(response.text, {
      editorScript: 'Roteiro de edição sintetizado com sucesso.',
    });
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating editor script:', error);
    res.status(500).json({ error: error.message || 'Falha ao sintetizar roteiro de edição' });
  }
});

// --- Server & Vite Setup ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TakeMaster Audiovisual Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
