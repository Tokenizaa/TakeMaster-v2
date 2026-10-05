import { getServerConfig } from './config';
import {
  EditorialDiagnosis,
  EditorialFitLevel,
  Episode,
  FollowUpItem,
  Guest,
  OutlineBlock,
  PlannedShort,
  ProgramEditorialIdentity,
  ProgramPitchCurationResponse,
  ProgramPitchRequestInput,
  ProgramPitchSuggestion,
  QuestionItem,
  ResearchData,
  ScriptItem,
  Show,
} from '../domain/contracts';
import {
  buildSafeEpisodeAiContext,
  validateDiagnosisOutput,
  validateFollowUps,
  validateOutlineOutput,
  validateResearchOutput,
  validateScriptOutput,
  validateShortsOutput,
} from '../domain/aiContracts';
import { buildProgramEditorialAiContext } from './programKnowledge';
import { incrementMetric, logStructured } from './logger';

type GenerateOptions = {
  model?: string;
  contents: string;
  config?: { responseMimeType?: string };
};
type GenerateResponse = { text?: string };

export function isAiConfigured(): boolean {
  const c = getServerConfig();
  return Boolean(c.nimApiKey && c.nimApiKey.trim().length > 5);
}

export function getNimModelConfig() {
  const c = getServerConfig();
  return {
    configured: Boolean(c.nimApiKey && c.nimApiKey.trim().length > 5),
    primaryModel: c.nimPrimaryModel,
    fallbackModel: c.nimFallbackModel,
    baseUrl: c.nimBaseUrl,
  };
}

async function callNim(
  model: string,
  contents: string,
  responseMimeType?: string
): Promise<GenerateResponse> {
  const c = getServerConfig();
  if (!c.nimApiKey) throw new Error('NVIDIA NIM não configurado: defina NIM_API_KEY.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), c.nimTimeoutMs);
  try {
    const response = await fetch(c.nimBaseUrl + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + c.nimApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: contents }],
        temperature: 0.4,
        ...(responseMimeType === 'application/json'
          ? { response_format: { type: 'json_object' } }
          : {}),
      }),
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) throw new Error('NVIDIA NIM HTTP ' + response.status);
    const data = JSON.parse(raw);
    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') {
      throw new Error('NVIDIA NIM retornou uma resposta sem conteúdo.');
    }
    return { text };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('NVIDIA NIM timeout após ' + c.nimTimeoutMs + 'ms.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithFallback(options: GenerateOptions): Promise<GenerateResponse> {
  const c = getServerConfig();
  const primary = c.nimPrimaryModel;
  try {
    return await callNim(primary, options.contents, options.config?.responseMimeType);
  } catch (primaryError) {
    if (!c.nimFallbackModel || c.nimFallbackModel === primary) throw primaryError;
    try {
      return await callNim(c.nimFallbackModel, options.contents, options.config?.responseMimeType);
    } catch {
      throw new Error('IA indisponível após tentativa no modelo principal e fallback.');
    }
  }
}

export const ai = { models: { generateContent: generateWithFallback } };

export function parseAIJson<T>(rawText: string | undefined): T {
  if (!rawText) throw new Error('A IA retornou uma resposta vazia.');
  let cleaned = rawText.trim();
  cleaned = cleaned
    .replace(/^```json\s*/, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error('A IA retornou JSON inválido.');
  }
}

export async function generateEditorialDiagnosis(input: {
  episodeTitle?: string;
  idea?: string;
  guestName?: string;
  guestBio?: string;
  showTitle?: string;
  showFormat?: string;
}): Promise<EditorialDiagnosis> {
  incrementMetric('aiCallsTotal');
  const title = input.episodeTitle || 'Episódio em Planejamento';
  const guest = input.guestName || 'Convidado Principal';
  const idea = input.idea || 'Explorar bastidores de liderança, conflitos reais e aprendizados práticos.';

  const fallback: EditorialDiagnosis = {
    centralTheme: `Os bastidores da decisão crítica de ${guest} em "${title}"`,
    potentialStory: `${guest} revela o momento exato em que precisou abandonar a estratégia original e reconstruir a operação sob pressão real.`,
    primaryConflict: `Crescimento acelerado e pressão externa vs. preservação da cultura e lucidez nas decisões estratégicas.`,
    primaryTransformation: `Saída de uma gestão reativa para um modelo de governança com prioridades claras e execução disciplinada.`,
    whyWatch: `O público encontra um relato franco com números, erros assumidos e critérios práticos aplicáveis imediatamente.`,
    whatToDiscover: `Qual foi o ponto de virada não publicado que mudou a trajetória de ${guest}.`,
    researchPoints: [
      `Cronologia de carreira e marcos financeiros de ${guest}`,
      `Principais crises ou pivôs estratégicos nos últimos 36 meses`,
      `Declarações anteriores em entrevistas e possíveis contradições`,
      `Dados concretos do setor relacionados a "${title}"`,
    ],
    highImpactMoments: [
      `Cold Open: A pergunta direta sobre o maior erro estratégico e quanto custou`,
      `Clímax do Bloco 2: O bastidor da reunião decisiva que ninguém viu`,
      `Fechamento: O conselho contraintuitivo para quem enfrenta o mesmo dilema hoje`,
    ],
    approved: false,
  };

  if (!isAiConfigured()) {
    incrementMetric('aiFallbacksTotal');
    return validateDiagnosisOutput(fallback, fallback, 'fallback').data;
  }

  try {
    const prompt = `Você é um Diretor Editorial Sênior de TV e Videocast (TakeMaster V2).
Gere um Diagnóstico Editorial em JSON para o episódio abaixo:
- Programa: ${input.showTitle || 'RSPlay TV'} (${input.showFormat || 'Entrevista'})
- Título do Episódio: ${title}
- Convidado: ${guest} (${input.guestBio || 'Especialista convidado'})
- Ideia / Premissa: ${idea}

Retorne APENAS um objeto JSON com as chaves:
centralTheme (string), potentialStory (string), primaryConflict (string), primaryTransformation (string), whyWatch (string), whatToDiscover (string), researchPoints (array de strings), highImpactMoments (array de strings), approved (boolean false).`;

    const response = await generateWithFallback({
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const parsed = parseAIJson<EditorialDiagnosis>(response.text);
    return validateDiagnosisOutput(parsed, fallback, 'nim').data;
  } catch (err: any) {
    incrementMetric('aiFallbacksTotal');
    logStructured('WARN', 'ai_diagnosis_fallback', { error: String(err?.message || err) });
    return validateDiagnosisOutput(fallback, fallback, 'fallback').data;
  }
}

export async function generateEditorialResearch(input: {
  guestName?: string;
  guestRole?: string;
  guestCompany?: string;
  guestBio?: string;
  episodeTitle?: string;
  idea?: string;
}): Promise<ResearchData> {
  incrementMetric('aiCallsTotal');
  const guest = input.guestName || 'Convidado';
  const company = input.guestCompany || 'Organização';
  const role = input.guestRole || 'Liderança Executiva';

  const fallback: ResearchData = {
    aboutGuest: `${guest} atua como ${role} na ${company}, com trajetória marcada por projetos de alta complexidade e transformação operacional.`,
    trajectory: `Iniciou na linha de frente técnica, assumiu posições de gestão em ciclos de expansão e liderou reestruturações estratégicas na ${company}.`,
    company: `${company} opera em um segmento competitivo, combinando escala operacional com inovação de produto e governança corporativa.`,
    keyDatesAndNumbers: `• Últimos 3 anos: ciclo de expansão e consolidação de portfólio.\n• Indicadores-chave: crescimento de receita recorrente e eficiência operacional.`,
    previousInterviews: `Em participações anteriores, ${guest} costuma abordar inovação e liderança, mas raramente detalha os bastidores das decisões difíceis.`,
    recurringThemes: `Cultura de alta performance, tomada de decisão baseada em dados, resiliência em momentos de crise.`,
    contradictionsAndClarifications: `Verificar como a tese pública de crescimento sustentável se concilia com a velocidade exigida pelo mercado no último ano.`,
    compellingStories: `O episódio de virada operacional na ${company} quando um projeto crítico precisou ser redesenhado em 72 horas.`,
    sources: [
      {
        id: `src-${Date.now()}-1`,
        title: `Perfil Executivo e Histórico — ${guest}`,
        detail: `Atuação como ${role} na ${company} e histórico de liderança.`,
        status: 'CONFIRMADO',
        category: 'guest',
      },
      {
        id: `src-${Date.now()}-2`,
        title: `Métricas de Crescimento — ${company}`,
        detail: `Confirmar números atualizados do último trimestre durante o briefing pré-gravação.`,
        status: 'PERGUNTAR AO CONVIDADO',
        category: 'dates_numbers',
      },
      {
        id: `src-${Date.now()}-3`,
        title: `Bastidor da Decisão Crítica`,
        detail: `Explorar qual foi a escolha mais difícil enfrentada por ${guest} na ${company}.`,
        status: 'PERGUNTAR AO CONVIDADO',
        category: 'stories',
      },
    ],
  };

  if (!isAiConfigured()) {
    incrementMetric('aiFallbacksTotal');
    return validateResearchOutput(fallback, fallback, 'fallback').data;
  }

  try {
    const prompt = `Você é um Pesquisador Jornalístico Sênior (TakeMaster V2).
Gere um Dossiê de Pesquisa Editorial em JSON para:
- Convidado: ${guest} (${role} na ${company})
- Bio: ${input.guestBio || ''}
- Episódio: ${input.episodeTitle || ''}
- Premissa: ${input.idea || ''}

Retorne APENAS JSON com:
aboutGuest, trajectory, company, keyDatesAndNumbers, previousInterviews, recurringThemes, contradictionsAndClarifications, compellingStories, e sources (array de objetos com id, title, detail, status ['CONFIRMADO' | 'NÃO CONFIRMADO' | 'PERGUNTAR AO CONVIDADO'], category ['guest' | 'trajectory' | 'company' | 'dates_numbers' | 'interviews' | 'contradictions' | 'stories']).`;

    const response = await generateWithFallback({
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const parsed = parseAIJson<ResearchData>(response.text);
    return validateResearchOutput(parsed, fallback, 'nim').data;
  } catch (err: any) {
    incrementMetric('aiFallbacksTotal');
    logStructured('WARN', 'ai_research_fallback', { error: String(err?.message || err) });
    return validateResearchOutput(fallback, fallback, 'fallback').data;
  }
}

export async function generateSmartOutline(input: {
  episode?: any;
  show?: any;
}): Promise<{ outline: OutlineBlock[]; questions: QuestionItem[] }> {
  incrementMetric('aiCallsTotal');
  const ctx = buildSafeEpisodeAiContext(input.episode);
  const guest = ctx.guestName || 'Convidado';
  const totalMin = ctx.targetDurationMin || 45;

  const b1Id = `blk-${Date.now()}-1`;
  const b2Id = `blk-${Date.now()}-2`;
  const b3Id = `blk-${Date.now()}-3`;

  const fallbackOutline: OutlineBlock[] = [
    {
      id: b1Id,
      blockNumber: 1,
      title: 'Abertura de Impacto & O Ponto de Ruptura',
      estimatedDurationMin: Math.round(totalMin * 0.25),
      objective: `Ancorar a autoridade de ${guest} e abrir com o conflito central sem rodeios.`,
      keyThemes: ['Cold Open', 'Contexto Real', 'Primeira Grande Decisão'],
      transitionText: 'Mas quando essa estratégia encontrou a realidade do mercado, o cenário mudou...',
    },
    {
      id: b2Id,
      blockNumber: 2,
      title: 'Bastidores, Conflitos e Números Reais',
      estimatedDurationMin: Math.round(totalMin * 0.5),
      objective: `Aprofundar no como foi feito, nos erros evitáveis e nos critérios práticos de ${guest}.`,
      keyThemes: ['Tensão Operacional', 'Méritos e Erros', 'Virada de Chave'],
      transitionText: 'Olhando para o que vem pela frente, fica a pergunta essencial...',
    },
    {
      id: b3Id,
      blockNumber: 3,
      title: 'Síntese Prática & Visão de Futuro',
      estimatedDurationMin: Math.max(5, totalMin - Math.round(totalMin * 0.75)),
      objective: 'Extrair recomendações acionáveis e encerrar com um momento memorável para cortes.',
      keyThemes: ['Lição Contraintuitiva', 'Próximo Ciclo', 'Mensagem Final'],
      transitionText: 'Encerramento do programa e chamada para próximos episódios.',
    },
  ];

  const fallbackQuestions: QuestionItem[] = [
    {
      id: `q-${Date.now()}-1`,
      blockId: b1Id,
      order: 1,
      text: `${guest}, qual foi o momento exato em que você percebeu que o plano original não ia funcionar?`,
      objective: 'Quebrar respostas ensaiadas logo no início e gerar gancho de retenção.',
      suggestedCamera: 'CAM 2',
      eyeDirection: 'Olhar para convidado',
      followUps: [
        {
          id: `fu-${Date.now()}-1`,
          triggerCondition: 'SE RESPONDER COM CONCEITO GENÉRICO',
          actionOrQuestion: 'Pedir o dia específico ou a reunião em que essa ficha caiu.',
          tag: 'APROFUNDAR',
        },
      ],
    },
    {
      id: `q-${Date.now()}-2`,
      blockId: b2Id,
      order: 2,
      text: 'Qual foi o custo real — financeiro ou humano — da decisão mais difícil desse processo?',
      objective: 'Trazer tangibilidade e vulnerabilidade executiva para o bloco central.',
      suggestedCamera: 'CAM 2',
      eyeDirection: 'Olhar para convidado',
      followUps: [
        {
          id: `fu-${Date.now()}-2`,
          triggerCondition: 'SE CITAR NÚMEROS OU IMPACTO DIRETO',
          actionOrQuestion: 'Manter silêncio por 3 segundos e deixar detalhar o impacto.',
          tag: 'NÃO INTERROMPER',
        },
      ],
    },
    {
      id: `q-${Date.now()}-3`,
      blockId: b3Id,
      order: 3,
      text: 'Se você estivesse começando hoje com metade dos recursos, qual regra do mercado você ignoraria?',
      objective: 'Gerar corte viral de alto compartilhamento para fechamento.',
      suggestedCamera: 'CAM 3',
      eyeDirection: 'Olhar para convidado',
      followUps: [],
    },
  ];

  if (!isAiConfigured()) {
    incrementMetric('aiFallbacksTotal');
    return validateOutlineOutput(
      { outline: fallbackOutline, questions: fallbackQuestions },
      { outline: fallbackOutline, questions: fallbackQuestions },
      'fallback'
    ).data;
  }

  try {
    const prompt = `Você é um Roteirista-Chefe de TV e Podcast (TakeMaster V2).
Crie uma Pauta Inteligente (outline) e Perguntas Estratégicas (questions) em JSON para o episódio:
${JSON.stringify(ctx)}

Retorne APENAS JSON no formato:
{
  "outline": [{ "id": "blk-1", "blockNumber": 1, "title": "...", "estimatedDurationMin": 12, "objective": "...", "keyThemes": ["..."], "transitionText": "..." }],
  "questions": [{ "id": "q-1", "blockId": "blk-1", "order": 1, "text": "...", "objective": "...", "suggestedCamera": "CAM 2", "eyeDirection": "Olhar para convidado", "followUps": [{ "id": "fu-1", "triggerCondition": "...", "actionOrQuestion": "...", "tag": "APROFUNDAR" }] }]
}`;

    const response = await generateWithFallback({
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const parsed = parseAIJson<{ outline: OutlineBlock[]; questions: QuestionItem[] }>(
      response.text
    );
    return validateOutlineOutput(
      parsed,
      { outline: fallbackOutline, questions: fallbackQuestions },
      'nim'
    ).data;
  } catch (err: any) {
    incrementMetric('aiFallbacksTotal');
    logStructured('WARN', 'ai_outline_fallback', { error: String(err?.message || err) });
    return validateOutlineOutput(
      { outline: fallbackOutline, questions: fallbackQuestions },
      { outline: fallbackOutline, questions: fallbackQuestions },
      'fallback'
    ).data;
  }
}

export async function generateStudioScript(input: {
  episode?: any;
  show?: any;
}): Promise<{ script: ScriptItem[] }> {
  incrementMetric('aiCallsTotal');
  const ctx = buildSafeEpisodeAiContext(input.episode);
  const host = ctx.host || 'Apresentador';
  const guest = ctx.guestName || 'Convidado';
  const firstBlockId = ctx.outline?.[0]?.id;

  const fallbackScript: ScriptItem[] = [
    {
      id: `sc-${Date.now()}-1`,
      blockId: firstBlockId,
      timestamp: '00:00',
      type: 'cold_open',
      camera: 'CAM 2',
      speaker: guest,
      targetPerson: host,
      eyeDirection: 'Olhar para apresentador',
      shotType: 'Close Dramático',
      content: `[TRECHO DE IMPACTO DO CONVIDADO PARA PRÉVIA — ESCOLHER NA EDIÇÃO]`,
      directionalMarkers: ['CORTE SECO', 'GC TEASER'],
      isTeleprompter: false,
    },
    {
      id: `sc-${Date.now()}-2`,
      blockId: firstBlockId,
      timestamp: '00:35',
      type: 'opening',
      camera: 'CAM 1',
      speaker: host,
      targetPerson: 'Lente CAM 1',
      eyeDirection: 'Olhar para câmera 1 (Teleprompter)',
      shotType: 'Plano Médio',
      content: `Olá! Começa agora mais um episódio de "${ctx.title}". Hoje recebemos ${guest} para uma conversa franca sobre decisões reais, bastidores e transformação.`,
      directionalMarkers: ['TELEPROMPTER ON', 'TRILHA ABERTURA BG'],
      isTeleprompter: true,
    },
    ...(ctx.questions || []).slice(0, 8).map((q: any, idx: number) => ({
      id: `sc-${Date.now()}-q-${idx + 1}`,
      blockId: q.blockId || firstBlockId,
      timestamp: `0${Math.min(9, idx + 2)}:00`,
      type: 'question' as const,
      camera: q.suggestedCamera || 'CAM 3',
      alternativeCamera: 'CAM 2',
      speaker: host,
      targetPerson: guest,
      eyeDirection: q.eyeDirection || 'Olhar para convidado',
      shotType: 'Plano Conjunto / Corte para CAM 2 na resposta',
      content: q.text,
      directionalMarkers: ['PREPARAR GC', 'ESCUTA ATIVA'],
      isTeleprompter: false,
      questionRefId: q.id,
    })),
    {
      id: `sc-${Date.now()}-close`,
      blockId: ctx.outline?.[ctx.outline.length - 1]?.id || firstBlockId,
      timestamp: `${ctx.targetDurationMin || 45}:00`,
      type: 'closing',
      camera: 'CAM 1',
      speaker: host,
      targetPerson: 'Lente CAM 1',
      eyeDirection: 'Olhar para câmera 1 (Teleprompter)',
      shotType: 'Plano Médio',
      content: `${guest}, muito obrigado por compartilhar os bastidores com tanta transparência. E a você que nos acompanha na RSPlay TV, até o próximo episódio!`,
      directionalMarkers: ['TELEPROMPTER ON', 'ENTRA VINHETA FINAL'],
      isTeleprompter: true,
    },
  ];

  if (!isAiConfigured()) {
    incrementMetric('aiFallbacksTotal');
    return validateScriptOutput({ script: fallbackScript }, fallbackScript, 'fallback').data;
  }

  try {
    const prompt = `Você é um Diretor de Estúdio Multicâmera (TakeMaster V2).
Gere o Roteiro Técnico de Gravação (script) em JSON para:
${JSON.stringify(ctx)}

Retorne APENAS JSON com a chave "script" contendo uma lista de itens com:
id, blockId, timestamp, type ('cold_open'|'opening'|'vinheta'|'transition'|'question'|'reaction'|'closing'|'b_roll_insert'), camera ('CAM 1'|'CAM 2'|'CAM 3'), alternativeCamera, speaker, targetPerson, eyeDirection, shotType, content, directionalMarkers (array de strings), isTeleprompter (boolean).`;

    const response = await generateWithFallback({
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const parsed = parseAIJson<{ script: ScriptItem[] }>(response.text);
    return validateScriptOutput(parsed, fallbackScript, 'nim').data;
  } catch (err: any) {
    incrementMetric('aiFallbacksTotal');
    logStructured('WARN', 'ai_script_fallback', { error: String(err?.message || err) });
    return validateScriptOutput({ script: fallbackScript }, fallbackScript, 'fallback').data;
  }
}

export async function generateFollowUpRepiques(input: {
  questionText?: string;
  guestName?: string;
  centralTheme?: string;
}): Promise<FollowUpItem[]> {
  incrementMetric('aiCallsTotal');
  const qText = input.questionText || 'Pergunta principal';

  const fallback: FollowUpItem[] = [
    {
      id: `fu-${Date.now()}-1`,
      triggerCondition: 'SE EVITAR CITAR O CONFLITO REAL',
      actionOrQuestion: `Mas na prática, qual foi a resistência mais dura que você enfrentou nesse ponto?`,
      tag: 'CONFLITO',
    },
    {
      id: `fu-${Date.now()}-2`,
      triggerCondition: 'SE FALAR DE RESULTADO SEM DETALHAR O CUSTO',
      actionOrQuestion: `Quanto tempo ou capital foi necessário investir antes de ver esse retorno?`,
      tag: 'DINHEIRO',
    },
    {
      id: `fu-${Date.now()}-3`,
      triggerCondition: 'SE ABRIR UMA HISTÓRIA PESSOAL FORTE',
      actionOrQuestion: `Manter câmera em close (CAM 2) e perguntar: "O que passou pela sua cabeça naquele instante?"`,
      tag: 'APROFUNDAR',
    },
  ];

  if (!isAiConfigured()) {
    incrementMetric('aiFallbacksTotal');
    return validateFollowUps(fallback, fallback);
  }

  try {
    const prompt = `Gere 3 repiques investigativos (followUps) em JSON para a pergunta: "${qText}" (Convidado: ${input.guestName || 'Convidado'}, Tema: ${input.centralTheme || ''}).
Retorne APENAS JSON: { "followUps": [{ "id": "...", "triggerCondition": "...", "actionOrQuestion": "...", "tag": "DINHEIRO"|"FAMÍLIA"|"MEDO"|"CONFLITO"|"APROFUNDAR"|"NÃO INTERROMPER"|"OUTRO" }] }`;

    const response = await generateWithFallback({
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const parsed = parseAIJson<{ followUps: FollowUpItem[] }>(response.text);
    return validateFollowUps(parsed?.followUps, fallback);
  } catch (err: any) {
    incrementMetric('aiFallbacksTotal');
    return validateFollowUps(fallback, fallback);
  }
}

export async function generatePlannedShorts(input: {
  episode?: any;
}): Promise<{ shorts: PlannedShort[] }> {
  incrementMetric('aiCallsTotal');
  const ctx = buildSafeEpisodeAiContext(input.episode);
  const guest = ctx.guestName || 'Convidado';

  const fallback: PlannedShort[] = [
    {
      id: `sh-${Date.now()}-1`,
      title: `O erro que quase custou a operação de ${guest}`,
      hook: `"Todo mundo olhava para o faturamento, mas ninguém via o risco real..."`,
      generatingQuestion: ctx.questions?.[0]?.text || 'Qual foi o momento crítico de virada?',
      estimatedDuration: '45-60s',
      status: 'Planejado',
      notes: 'Usar corte seco da CAM 2 + legenda dinâmica no topo.',
    },
    {
      id: `sh-${Date.now()}-2`,
      title: `A regra contraintuitiva de liderança de ${guest}`,
      hook: `"Se você precisa aprovar tudo, você não tem um time, tem reféns."`,
      generatingQuestion: ctx.questions?.[1]?.text || 'Qual regra de mercado você precisou quebrar?',
      estimatedDuration: '35-50s',
      status: 'Planejado',
      notes: 'Inserir B-Roll nos primeiros 4 segundos.',
    },
    {
      id: `sh-${Date.now()}-3`,
      title: `O conselho direto para os próximos 12 meses`,
      hook: `"Nos próximos 12 meses, quem continuar fazendo isso vai ficar pelo caminho."`,
      generatingQuestion: ctx.questions?.[2]?.text || 'Qual é o alerta para quem está começando agora?',
      estimatedDuration: '40-55s',
      status: 'Planejado',
      notes: 'Ideal para Reels, YouTube Shorts e TikTok.',
    },
  ];

  if (!isAiConfigured()) {
    incrementMetric('aiFallbacksTotal');
    return validateShortsOutput({ shorts: fallback }, fallback, 'fallback').data;
  }

  try {
    const prompt = `Gere 3 Cortes / Shorts Virais Planejados em JSON para o episódio:
${JSON.stringify(ctx)}
Retorne APENAS JSON: { "shorts": [{ "id": "...", "title": "...", "hook": "...", "generatingQuestion": "...", "estimatedDuration": "45-60s", "status": "Planejado", "notes": "..." }] }`;

    const response = await generateWithFallback({
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const parsed = parseAIJson<{ shorts: PlannedShort[] }>(response.text);
    return validateShortsOutput(parsed, fallback, 'nim').data;
  } catch (err: any) {
    incrementMetric('aiFallbacksTotal');
    return validateShortsOutput({ shorts: fallback }, fallback, 'fallback').data;
  }
}

export async function generateEditorScriptSynthesis(input: {
  episode?: any;
}): Promise<{ synthesis: string }> {
  incrementMetric('aiCallsTotal');
  const ctx = buildSafeEpisodeAiContext(input.episode);
  const markersCount = Array.isArray(ctx.recordingMarkers) ? ctx.recordingMarkers.length : 0;

  const fallbackSynthesis = `# ROTEIRO DE PÓS-PRODUÇÃO E EDIÇÃO — ${ctx.title || 'Episódio'}
Convidado: ${ctx.guestName || 'Convidado'} | Apresentação: ${ctx.host || 'Apresentador'}

## 1. ESTRUTURA DE MONTAGEM
- **Cold Open (00:00 - 00:35):** Selecionar a resposta mais incisiva de ${ctx.guestName || 'Convidado'} (CAM 2 em close) antes da vinheta.
- **Passagem de Blocos:** Manter ritmo dinâmico com cortes em CAM 3 nas transições e inserção de GCs informativos.
- **Marcadores de Estúdio Registrados:** ${markersCount} marcações capturadas durante a gravação.

## 2. PRIORIDADES DE CORTES (SHORTS / REELS)
1. Priorizar trechos marcados como **MELHOR MOMENTO** e **CORTE / SHORT** na timeline.
2. Aplicar correção de áudio e nivelamento LUFS (-14 LUFS para plataformas digitais).`;

  if (!isAiConfigured()) {
    incrementMetric('aiFallbacksTotal');
    return { synthesis: fallbackSynthesis };
  }

  try {
    const prompt = `Crie um Roteiro Guia de Edição e Pós-Produção conciso em Markdown para o editor de vídeo do episódio:
${JSON.stringify(ctx)}`;

    const response = await generateWithFallback({ contents: prompt });
    return { synthesis: (response.text || '').trim() || fallbackSynthesis };
  } catch {
    incrementMetric('aiFallbacksTotal');
    return { synthesis: fallbackSynthesis };
  }
}

export async function generateContextualAssist(input: {
  action?: string;
  context?: any;
  prompt?: string;
}): Promise<{ suggestion: string }> {
  incrementMetric('aiCallsTotal');
  const action = input.action || 'assist';
  const fallbackSuggestion = `Sugestão Editorial (${action}): Explore um exemplo concreto com data, conflito real e decisão tomada sob pressão para elevar a retenção do público.`;

  if (!isAiConfigured()) {
    incrementMetric('aiFallbacksTotal');
    return { suggestion: fallbackSuggestion };
  }

  try {
    const prompt = `Você é o Co-Produtor Editorial do TakeMaster V2.
Ação solicitada: ${action}
Instrução: ${input.prompt || 'Gere uma recomendação prática, direta e acionável para o produtor/apresentador.'}
Contexto: ${JSON.stringify(input.context || {}).slice(0, 3000)}`;

    const response = await generateWithFallback({ contents: prompt });
    const text = (response.text || '').trim();
    return { suggestion: text || fallbackSuggestion };
  } catch {
    incrementMetric('aiFallbacksTotal');
    return { suggestion: fallbackSuggestion };
  }
}

// ============================================================================
// FASE 2, 3, 4, 6, 7, 8 — IDENTIDADE EDITORIAL & CURADORIA DE PAUTAS (NVIDIA NIM)
// ============================================================================

const NAO_IDENTIFICADO_NA_BASE = 'não identificado na base';

export async function executeNimEditorialCall(options: {
  prompt: string;
  simulatePrimaryFailure?: boolean;
  simulateTotalFailure?: boolean;
}): Promise<{ text: string; modelUsed: string; usedFallback: boolean }> {
  const c = getServerConfig();
  const primaryModel = c.nimPrimaryModel || 'qwen/qwen3.5-397b-a17b';
  const fallbackModel = c.nimFallbackModel || 'deepseek-ai/deepseek-v3.2';

  if (options.simulateTotalFailure) {
    throw new Error('IA indisponível após tentativa no modelo principal e fallback.');
  }

  const hasNimKey = Boolean(c.nimApiKey && c.nimApiKey.trim().length > 5);

  if (hasNimKey || options.simulatePrimaryFailure) {
    try {
      if (options.simulatePrimaryFailure) {
        throw new Error(`Falha simulada no modelo principal (${primaryModel}).`);
      }
      const primaryRes = await callNim(primaryModel, options.prompt, 'application/json');
      return {
        text: primaryRes.text || '',
        modelUsed: primaryModel,
        usedFallback: false,
      };
    } catch (primaryErr) {
      logStructured('WARN', 'nim_primary_model_failed_trying_fallback', {
        primaryModel,
        fallbackModel,
        error: String(primaryErr),
      });
      if (!fallbackModel || fallbackModel === primaryModel) throw primaryErr;
      try {
        const fallbackRes = await callNim(fallbackModel, options.prompt, 'application/json');
        return {
          text: fallbackRes.text || '',
          modelUsed: fallbackModel,
          usedFallback: true,
        };
      } catch (fallbackErr) {
        logStructured('WARN', 'nim_fallback_model_failed_using_grounded_kb', {
          primaryModel,
          fallbackModel,
          error: String(fallbackErr),
        });
        incrementMetric('aiFallbacksTotal');
        return {
          text: '',
          modelUsed: fallbackModel,
          usedFallback: true,
        };
      }
    }
  }

  return {
    text: '',
    modelUsed: primaryModel,
    usedFallback: false,
  };
}

function sanitizeGroundedString(val: unknown, fallback: string): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  if (!trimmed || /^n[aã]o\s+informado/i.test(trimmed)) {
    return NAO_IDENTIFICADO_NA_BASE;
  }
  return trimmed;
}

function sanitizeGroundedArray(val: unknown, fallback: string[]): string[] {
  if (!Array.isArray(val)) return fallback;
  const cleaned = val
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : fallback;
}

/**
 * FASE 2 — Gera a Identidade Editorial sintetizada a partir da base de conhecimento real do programa.
 * Nunca inventa informações; quando algo não estiver sustentado pela fonte, retorna "não identificado na base".
 */
export async function generateProgramEditorialIdentity(params: {
  show: Partial<Show> & { title: string; id?: string };
  episodes?: Episode[];
  guests?: Guest[];
  simulatePrimaryFailure?: boolean;
  simulateTotalFailure?: boolean;
}): Promise<ProgramEditorialIdentity> {
  incrementMetric('aiCallsTotal');
  const { knowledge, contextPromptBlock } = buildProgramEditorialAiContext({
    show: params.show,
    episodes: params.episodes,
    guests: params.guests,
  });

  const groundedDefault = knowledge.editorialSynthesis;

  const prompt = `Você é o Analista Editorial Sênior do TakeMaster (RS Play TV).
Analise EXCLUSIVAMENTE a base de conhecimento oficial do programa abaixo e gere uma síntese da Identidade Editorial em JSON.

REGRA ABSOLUTA DE FIDELIDADE À FONTE:
- NÃO invente, não deduza e não complete informações ausentes.
- Quando qualquer campo não estiver sustentado explicitamente pela fonte abaixo, preencha com exatamente: "${NAO_IDENTIFICADO_NA_BASE}" (ou ["${NAO_IDENTIFICADO_NA_BASE}"] para listas).

${contextPromptBlock}

Retorne APENAS um objeto JSON válido com a estrutura exata:
{
  "essencia": "...",
  "publico": "...",
  "tom": "...",
  "temas": ["..."],
  "formatos": ["..."],
  "forcas": ["..."],
  "abordagens_recomendadas": ["..."],
  "abordagens_a_evitar": ["..."],
  "diferenciais": ["..."]
}`;

  const execResult = await executeNimEditorialCall({
    prompt,
    simulatePrimaryFailure: params.simulatePrimaryFailure,
    simulateTotalFailure: params.simulateTotalFailure,
  });

  if (!execResult.text) {
    return {
      ...groundedDefault,
      fontes: knowledge.fontes,
      modelUsed: execResult.modelUsed,
      usedFallback: execResult.usedFallback,
      generatedAt: new Date().toISOString(),
    };
  }

  try {
    const parsed = parseAIJson<Record<string, any>>(execResult.text);
    // Preserve strict source fidelity: if the underlying source has no publico or diferenciais, keep "não identificado na base"
    const sourceHasPublico = knowledge.publico !== NAO_IDENTIFICADO_NA_BASE;
    const sourceHasDiferenciais =
      groundedDefault.diferenciais[0] !== NAO_IDENTIFICADO_NA_BASE;

    return {
      essencia: sanitizeGroundedString(parsed.essencia, groundedDefault.essencia),
      publico: sourceHasPublico
        ? sanitizeGroundedString(parsed.publico, groundedDefault.publico)
        : NAO_IDENTIFICADO_NA_BASE,
      tom: sanitizeGroundedString(parsed.tom, groundedDefault.tom),
      temas: sanitizeGroundedArray(parsed.temas, groundedDefault.temas),
      formatos: sanitizeGroundedArray(parsed.formatos, groundedDefault.formatos),
      forcas: sanitizeGroundedArray(parsed.forcas, groundedDefault.forcas),
      abordagens_recomendadas: sanitizeGroundedArray(
        parsed.abordagens_recomendadas,
        groundedDefault.abordagens_recomendadas
      ),
      abordagens_a_evitar: sanitizeGroundedArray(
        parsed.abordagens_a_evitar,
        groundedDefault.abordagens_a_evitar
      ),
      diferenciais: sourceHasDiferenciais
        ? sanitizeGroundedArray(parsed.diferenciais, groundedDefault.diferenciais)
        : [NAO_IDENTIFICADO_NA_BASE],
      fontes: knowledge.fontes,
      modelUsed: execResult.modelUsed,
      usedFallback: execResult.usedFallback,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    incrementMetric('aiFallbacksTotal');
    return {
      ...groundedDefault,
      fontes: knowledge.fontes,
      modelUsed: execResult.modelUsed,
      usedFallback: true,
      generatedAt: new Date().toISOString(),
    };
  }
}

function buildDeterministicGroundedPitches(params: {
  knowledge: ReturnType<typeof buildProgramEditorialAiContext>['knowledge'];
  queryUsed: string;
  input?: ProgramPitchRequestInput;
  guests?: Guest[];
}): ProgramPitchSuggestion[] {
  const { knowledge, input, guests = [] } = params;
  const customTopic = [
    input?.prompt,
    input?.tema,
    input?.noticia,
    input?.acontecimento,
    input?.produto,
    input?.cidade,
  ]
    .filter(Boolean)
    .join(' — ')
    .trim();
  const customGuest = input?.convidado?.trim() || guests[0]?.name?.trim() || '';
  const theme =
    knowledge.temasPrincipais[0] ||
    knowledge.descricao ||
    knowledge.nome;
  const guestLabel =
    customGuest ||
    (knowledge.apresentador !== NAO_IDENTIFICADO_NA_BASE
      ? knowledge.apresentador
      : NAO_IDENTIFICADO_NA_BASE);
  const subject = customTopic || theme;

  return [
    {
      title: customTopic
        ? `${knowledge.nome} em Pauta: ${customTopic}`
        : `${knowledge.nome}: ${theme}`,
      hook: `Explorar ${subject} a partir das informações disponíveis na base oficial do programa, sem extrapolar o que a fonte sustenta.`,
      score: knowledge.coverageLevel === 'completa' ? 90 : knowledge.coverageLevel === 'parcial' ? 80 : 65,
      fit: knowledge.coverageLevel === 'completa' ? 'alto' : knowledge.coverageLevel === 'parcial' ? 'medio' : 'baixo',
      reason: `A pauta usa como referência a identidade, os temas e a descrição registrados na base do programa: ${knowledge.descricao}.`,
      angle: customTopic
        ? `Relacionar "${customTopic}" aos temas e ao formato explicitamente registrados para ${knowledge.nome}.`
        : `Desenvolver o tema "${theme}" respeitando o formato, o público e a proposta editorial identificados na fonte.`,
      suggestedGuest: guestLabel,
      questions: [
        `O que é essencial compreender sobre ${subject} dentro do contexto deste programa?`,
        `Qual aspecto de ${subject} merece ser aprofundado com o convidado?`,
        `Que pergunta ajuda o público a sair da conversa com uma compreensão mais clara de ${subject}?`,
      ],
    },
    {
      title: `${knowledge.nome}: perguntas que aprofundam ${theme}`,
      hook: `Uma abordagem centrada nas questões que ajudam a transformar o tema em uma conversa relevante para o público do programa.`,
      score: knowledge.coverageLevel === 'completa' ? 86 : knowledge.coverageLevel === 'parcial' ? 76 : 60,
      fit: knowledge.coverageLevel === 'completa' ? 'alto' : 'medio',
      reason:
        knowledge.coverageLevel === 'parcial'
          ? 'Sugestão limitada aos dados explicitamente disponíveis no catálogo oficial.'
          : 'Sugestão baseada nos campos editoriais disponíveis na base oficial.',
      angle: `Estruturar a conversa em torno de ${theme}, usando somente informações confirmadas na base e dados fornecidos pelo produtor.`,
      suggestedGuest: customGuest || NAO_IDENTIFICADO_NA_BASE,
      questions: [
        `Qual é a questão mais importante que o público deveria fazer sobre ${theme}?`,
        `Que experiência ou evidência disponível na fonte ajuda a esclarecer esse assunto?`,
        'Que ponto ainda precisa ser confirmado antes da gravação?',
      ],
    },
    {
      title: `${knowledge.nome}: pauta aberta para ${subject}`,
      hook: 'Abrir espaço para uma conversa orientada por perguntas, fontes e informações que possam ser confirmadas antes da gravação.',
      score: knowledge.coverageLevel === 'completa' ? 78 : knowledge.coverageLevel === 'parcial' ? 70 : 55,
      fit: knowledge.coverageLevel === 'completa' ? 'medio' : 'baixo',
      reason: 'A pauta funciona como ponto de partida e não adiciona fatos que não estejam presentes na base.',
      angle: 'Usar a pauta como briefing inicial e complementar somente com informações verificadas pelo produtor ou pelo convidado.',
      suggestedGuest: customGuest || NAO_IDENTIFICADO_NA_BASE,
      questions: [
        `O que a fonte oficial já permite afirmar sobre ${subject}?`,
        'Quais informações precisam ser pesquisadas ou confirmadas antes da gravação?',
        'Qual pergunta pode gerar o principal momento de descoberta do episódio?',
      ],
    },
  ];
}

function validatePitchList(
  rawPautas: unknown,
  fallback: ProgramPitchSuggestion[]
): ProgramPitchSuggestion[] {
  if (!Array.isArray(rawPautas) || rawPautas.length === 0) {
    return fallback;
  }
  const validated: ProgramPitchSuggestion[] = rawPautas
    .map((item: any, idx: number): ProgramPitchSuggestion | null => {
      if (!item || typeof item !== 'object') return null;
      const fb = fallback[idx] || fallback[0];
      const rawScore = Number(item.score);
      const score = Number.isFinite(rawScore)
        ? Math.max(1, Math.min(100, Math.round(rawScore)))
        : fb.score;
      const rawFit = String(item.fit || '').toLowerCase();
      const fit: EditorialFitLevel =
        rawFit === 'alto' || rawFit === 'medio' || rawFit === 'baixo'
          ? (rawFit as EditorialFitLevel)
          : score >= 85
          ? 'alto'
          : score >= 70
          ? 'medio'
          : 'baixo';

      return {
        title: String(item.title || fb.title).trim(),
        hook: String(item.hook || fb.hook).trim(),
        score,
        fit,
        reason: String(item.reason || fb.reason).trim(),
        angle: String(item.angle || fb.angle).trim(),
        suggestedGuest: String(item.suggestedGuest || fb.suggestedGuest).trim(),
        questions:
          Array.isArray(item.questions) && item.questions.length > 0
            ? item.questions.map((q: any) => String(q || '').trim()).filter(Boolean)
            : fb.questions,
      };
    })
    .filter((p): p is ProgramPitchSuggestion => Boolean(p));

  return validated.length > 0 ? validated : fallback;
}

/**
 * FASE 3 & FASE 4 — Curadoria e Ranking Editorial de Pautas para o Programa.
 */
export async function generateProgramPitchSuggestions(params: {
  show: Partial<Show> & { title: string; id?: string };
  episodes?: Episode[];
  guests?: Guest[];
  input?: ProgramPitchRequestInput;
  simulatePrimaryFailure?: boolean;
  simulateTotalFailure?: boolean;
}): Promise<ProgramPitchCurationResponse> {
  incrementMetric('aiCallsTotal');
  const { knowledge, contextPromptBlock } = buildProgramEditorialAiContext({
    show: params.show,
    episodes: params.episodes,
    guests: params.guests,
  });

  const input = params.input || {};
  const parts: string[] = [];
  if (input.prompt?.trim()) parts.push(`Assunto livre: ${input.prompt.trim()}`);
  if (input.tema?.trim()) parts.push(`Tema: ${input.tema.trim()}`);
  if (input.noticia?.trim()) parts.push(`Notícia: ${input.noticia.trim()}`);
  if (input.convidado?.trim()) parts.push(`Convidado: ${input.convidado.trim()}`);
  if (input.acontecimento?.trim()) parts.push(`Acontecimento: ${input.acontecimento.trim()}`);
  if (input.produto?.trim()) parts.push(`Produto: ${input.produto.trim()}`);
  if (input.cidade?.trim()) parts.push(`Cidade: ${input.cidade.trim()}`);

  const queryUsed =
    parts.length > 0 ? parts.join(' | ') : 'Quero ideias de pautas para este programa.';

  const fallbackPitches = buildDeterministicGroundedPitches({
    knowledge,
    queryUsed,
    input,
    guests: params.guests,
  });

  const prompt = `Você é o Curador de Pautas Sênior do TakeMaster (RS Play TV).
Sua tarefa é sugerir 3 pautas altamente aderentes ao programa abaixo, analisando:
1. Identidade do programa;
2. Público;
3. Temas;
4. Formato;
5. Histórico disponível;
6. Participantes/convidados disponíveis;
7. Pedido do produtor: "${queryUsed}"

REGRA DE FIDELIDADE:
- Baseie-se estritamente na identidade e nas fontes reais do programa abaixo. Não invente dados biográficos inexistentes.

${contextPromptBlock}

Retorne APENAS um objeto JSON válido com a chave "pautas" contendo 3 sugestões no formato exato:
{
  "pautas": [
    {
      "score": 92,
      "fit": "alto",
      "reason": "Por que funciona neste programa segundo sua identidade real...",
      "angle": "Abordagem recomendada...",
      "suggestedGuest": "Perfil ou nome de convidado sugerido...",
      "questions": ["Pergunta 1?", "Pergunta 2?", "Pergunta 3?"],
      "title": "Título da pauta",
      "hook": "Gancho de abertura"
    }
  ]
}`;

  const execResult = await executeNimEditorialCall({
    prompt,
    simulatePrimaryFailure: params.simulatePrimaryFailure,
    simulateTotalFailure: params.simulateTotalFailure,
  });

  let pautas = fallbackPitches;
  let usedFallback = execResult.usedFallback;

  if (execResult.text) {
    try {
      const parsed = parseAIJson<{ pautas?: any[] }>(execResult.text);
      pautas = validatePitchList(parsed?.pautas || parsed, fallbackPitches);
    } catch {
      incrementMetric('aiFallbacksTotal');
      usedFallback = true;
    }
  }

  return {
    showId: params.show.id || knowledge.slug,
    showTitle: knowledge.nome,
    slug: knowledge.slug,
    queryUsed,
    pautas,
    fontes: knowledge.fontes,
    modelUsed: execResult.modelUsed,
    usedFallback,
    generatedAt: new Date().toISOString(),
  };
}

