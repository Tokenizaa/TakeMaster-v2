/**
 * TakeMaster V2 — Phase 4: Reliable AI Runtime Contracts & Schema Validators
 * Ensures AI outputs never silently corrupt domain entities.
 */

import {
  EditorialDiagnosis,
  FollowUpItem,
  OutlineBlock,
  PlannedShort,
  QuestionItem,
  ResearchData,
  ResearchSource,
  ScriptItem,
} from './contracts';

export const PROMPT_VERSIONS = {
  DIAGNOSIS: 'v2.1.0-editorial-diagnosis',
  RESEARCH: 'v2.1.0-factual-research',
  OUTLINE: 'v2.1.0-smart-outline-questions',
  SCRIPT: 'v2.1.0-3cam-studio-script',
  REPIQUES: 'v2.1.0-investigative-followups',
  SHORTS: 'v2.1.0-viral-shorts-planner',
  ASSIST: 'v2.1.0-contextual-coproducer',
  EDITOR_SCRIPT: 'v2.1.0-postprod-synthesis',
} as const;

export interface AIValidationMeta {
  promptVersion: string;
  source: 'nim' | 'gemini' | 'fallback';
  validated: boolean;
  warnings: string[];
  generatedAt: string;
}

export interface ValidatedAIResult<T> {
  data: T;
  meta: AIValidationMeta;
}

function asNonEmptyString(val: unknown, fallback: string, maxLen = 4000): string {
  if (typeof val === 'string' && val.trim().length > 0) {
    return val.trim().slice(0, maxLen);
  }
  return fallback;
}

function asStringArray(val: unknown, fallback: string[], maxItems = 15): string[] {
  if (!Array.isArray(val)) return fallback;
  const cleaned = val
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 500))
    .slice(0, maxItems);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function validateDiagnosisOutput(
  raw: any,
  fallback: EditorialDiagnosis,
  source: 'nim' | 'gemini' | 'fallback'
): ValidatedAIResult<EditorialDiagnosis> {
  const warnings: string[] = [];
  if (!raw || typeof raw !== 'object') {
    warnings.push('Resposta bruta de diagnóstico ausente ou não-objeto; aplicado contrato de segurança.');
    raw = {};
  }

  const data: EditorialDiagnosis = {
    centralTheme: asNonEmptyString(raw.centralTheme, fallback.centralTheme, 400),
    potentialStory: asNonEmptyString(raw.potentialStory, fallback.potentialStory, 1200),
    primaryConflict: asNonEmptyString(raw.primaryConflict, fallback.primaryConflict, 1200),
    primaryTransformation: asNonEmptyString(
      raw.primaryTransformation,
      fallback.primaryTransformation,
      1200
    ),
    whyWatch: asNonEmptyString(raw.whyWatch, fallback.whyWatch, 1000),
    whatToDiscover: asNonEmptyString(raw.whatToDiscover, fallback.whatToDiscover, 1000),
    researchPoints: asStringArray(raw.researchPoints, fallback.researchPoints, 12),
    highImpactMoments: asStringArray(raw.highImpactMoments, fallback.highImpactMoments, 12),
    approved: Boolean(raw.approved),
  };

  return {
    data,
    meta: {
      promptVersion: PROMPT_VERSIONS.DIAGNOSIS,
      source,
      validated: true,
      warnings,
      generatedAt: new Date().toISOString(),
    },
  };
}

const VALID_SOURCE_STATUSES: ResearchSource['status'][] = [
  'CONFIRMADO',
  'NÃO CONFIRMADO',
  'PERGUNTAR AO CONVIDADO',
];

const VALID_SOURCE_CATEGORIES: ResearchSource['category'][] = [
  'guest',
  'trajectory',
  'company',
  'dates_numbers',
  'interviews',
  'contradictions',
  'stories',
];

export function validateResearchOutput(
  raw: any,
  fallback: ResearchData,
  source: 'nim' | 'gemini' | 'fallback'
): ValidatedAIResult<ResearchData> {
  const warnings: string[] = [];
  if (!raw || typeof raw !== 'object') {
    warnings.push('Resposta de pesquisa inválida; aplicado contrato de segurança.');
    raw = {};
  }

  const rawSources = Array.isArray(raw.sources) ? raw.sources : fallback.sources;
  const sources: ResearchSource[] = rawSources
    .filter((s: any) => s && typeof s === 'object')
    .slice(0, 25)
    .map((s: any, idx: number) => ({
      id: asNonEmptyString(s.id, `src-${Date.now()}-${idx + 1}`, 80),
      title: asNonEmptyString(s.title, `Verificação #${idx + 1}`, 240),
      url: typeof s.url === 'string' && s.url.startsWith('http') ? s.url.trim() : undefined,
      detail: asNonEmptyString(s.detail, 'Detalhe a confirmar pela produção.', 1200),
      status: VALID_SOURCE_STATUSES.includes(s.status) ? s.status : 'NÃO CONFIRMADO',
      category: VALID_SOURCE_CATEGORIES.includes(s.category) ? s.category : 'guest',
    }));

  const data: ResearchData = {
    aboutGuest: asNonEmptyString(raw.aboutGuest, fallback.aboutGuest, 2500),
    trajectory: asNonEmptyString(raw.trajectory, fallback.trajectory, 2500),
    company: asNonEmptyString(raw.company, fallback.company, 2000),
    keyDatesAndNumbers: asNonEmptyString(
      raw.keyDatesAndNumbers,
      fallback.keyDatesAndNumbers,
      2000
    ),
    previousInterviews: asNonEmptyString(
      raw.previousInterviews,
      fallback.previousInterviews,
      2000
    ),
    recurringThemes: asNonEmptyString(raw.recurringThemes, fallback.recurringThemes, 2000),
    contradictionsAndClarifications: asNonEmptyString(
      raw.contradictionsAndClarifications,
      fallback.contradictionsAndClarifications,
      2000
    ),
    compellingStories: asNonEmptyString(raw.compellingStories, fallback.compellingStories, 2000),
    sources: sources.length > 0 ? sources : fallback.sources,
  };

  return {
    data,
    meta: {
      promptVersion: PROMPT_VERSIONS.RESEARCH,
      source,
      validated: true,
      warnings,
      generatedAt: new Date().toISOString(),
    },
  };
}

const VALID_FOLLOWUP_TAGS: FollowUpItem['tag'][] = [
  'DINHEIRO',
  'FAMÍLIA',
  'MEDO',
  'CONFLITO',
  'APROFUNDAR',
  'NÃO INTERROMPER',
  'OUTRO',
];

export function validateFollowUps(rawList: unknown, fallback: FollowUpItem[] = []): FollowUpItem[] {
  if (!Array.isArray(rawList)) return fallback;
  const validated = rawList
    .filter((f) => f && typeof f === 'object')
    .slice(0, 10)
    .map((f: any, idx: number) => ({
      id: asNonEmptyString(f.id, `fu-${Date.now()}-${idx + 1}`, 80),
      triggerCondition: asNonEmptyString(
        f.triggerCondition,
        'SE RESPONDER DE FORMA SUPERFICIAL',
        200
      ),
      actionOrQuestion: asNonEmptyString(
        f.actionOrQuestion,
        'Aprofundar com exemplo prático do dia a dia.',
        500
      ),
      tag: VALID_FOLLOWUP_TAGS.includes(f.tag) ? f.tag : 'APROFUNDAR',
    }));
  return validated.length > 0 ? validated : fallback;
}

export function validateOutlineOutput(
  raw: any,
  fallback: { outline: OutlineBlock[]; questions: QuestionItem[] },
  source: 'nim' | 'gemini' | 'fallback'
): ValidatedAIResult<{ outline: OutlineBlock[]; questions: QuestionItem[] }> {
  const warnings: string[] = [];
  if (!raw || typeof raw !== 'object') {
    warnings.push('Resposta de pauta inválida; utilizado fallback estruturado.');
    raw = {};
  }

  const rawOutline = Array.isArray(raw.outline) && raw.outline.length > 0 ? raw.outline : fallback.outline;
  const outline: OutlineBlock[] = rawOutline
    .filter((b: any) => b && typeof b === 'object')
    .slice(0, 20)
    .map((b: any, idx: number) => ({
      id: asNonEmptyString(b.id, `blk-${Date.now()}-${idx + 1}`, 80),
      blockNumber: idx + 1,
      title: asNonEmptyString(b.title, `Bloco ${idx + 1}`, 180),
      estimatedDurationMin: Math.max(
        1,
        Math.min(180, Number(b.estimatedDurationMin) || 5)
      ),
      objective: asNonEmptyString(b.objective, 'Conduzir narrativa do bloco.', 600),
      keyThemes: asStringArray(b.keyThemes, ['Narrativa central'], 8),
      transitionText: asNonEmptyString(
        b.transitionText,
        'Avançando para o próximo capítulo da conversa...',
        600
      ),
    }));

  const defaultBlockId = outline[0]?.id || 'blk-1';
  const rawQuestions =
    Array.isArray(raw.questions) && raw.questions.length > 0 ? raw.questions : fallback.questions;
  const questions: QuestionItem[] = rawQuestions
    .filter((q: any) => q && typeof q === 'object')
    .slice(0, 40)
    .map((q: any, idx: number) => ({
      id: asNonEmptyString(q.id, `q-${Date.now()}-${idx + 1}`, 80),
      blockId: outline.some((b) => b.id === q.blockId) ? q.blockId : defaultBlockId,
      order: Number(q.order) || idx + 1,
      text: asNonEmptyString(q.text, 'Conte como esse momento transformou sua trajetória.', 600),
      objective: asNonEmptyString(q.objective, 'Extrair história concreta.', 400),
      suggestedCamera: asNonEmptyString(q.suggestedCamera, 'CAM 2', 40),
      eyeDirection: asNonEmptyString(q.eyeDirection, 'Olhar para convidado', 120),
      followUps: validateFollowUps(q.followUps, []),
    }));

  return {
    data: { outline, questions },
    meta: {
      promptVersion: PROMPT_VERSIONS.OUTLINE,
      source,
      validated: true,
      warnings,
      generatedAt: new Date().toISOString(),
    },
  };
}

const VALID_SCRIPT_TYPES: ScriptItem['type'][] = [
  'cold_open',
  'opening',
  'vinheta',
  'transition',
  'question',
  'reaction',
  'closing',
  'b_roll_insert',
];

export function validateScriptOutput(
  raw: any,
  fallback: ScriptItem[],
  source: 'nim' | 'gemini' | 'fallback'
): ValidatedAIResult<{ script: ScriptItem[] }> {
  const warnings: string[] = [];
  const rawList = raw && Array.isArray(raw.script) && raw.script.length > 0 ? raw.script : fallback;

  const script: ScriptItem[] = rawList
    .filter((it: any) => it && typeof it === 'object')
    .slice(0, 80)
    .map((it: any, idx: number) => {
      const type: ScriptItem['type'] = VALID_SCRIPT_TYPES.includes(it.type)
        ? it.type
        : 'question';
      return {
        id: asNonEmptyString(it.id, `sc-${Date.now()}-${idx + 1}`, 80),
        blockId: typeof it.blockId === 'string' ? it.blockId : undefined,
        timestamp: asNonEmptyString(it.timestamp, '00:00', 16),
        type,
        camera: asNonEmptyString(it.camera, 'CAM 2', 32),
        alternativeCamera:
          typeof it.alternativeCamera === 'string' ? it.alternativeCamera : undefined,
        speaker: asNonEmptyString(it.speaker, 'Apresentador', 120),
        targetPerson: typeof it.targetPerson === 'string' ? it.targetPerson : undefined,
        eyeDirection: asNonEmptyString(it.eyeDirection, 'Olhar para convidado', 120),
        shotType: asNonEmptyString(it.shotType, 'Plano Médio', 120),
        content: asNonEmptyString(it.content, 'Fala do roteiro...', 2500),
        directionalMarkers: asStringArray(it.directionalMarkers, ['CORTE SUAVE'], 8),
        isTeleprompter:
          typeof it.isTeleprompter === 'boolean'
            ? it.isTeleprompter
            : type === 'opening' || type === 'closing',
        questionRefId: typeof it.questionRefId === 'string' ? it.questionRefId : undefined,
      };
    });

  return {
    data: { script },
    meta: {
      promptVersion: PROMPT_VERSIONS.SCRIPT,
      source,
      validated: true,
      warnings,
      generatedAt: new Date().toISOString(),
    },
  };
}

const VALID_SHORT_STATUSES: PlannedShort['status'][] = [
  'Planejado',
  'Capturado',
  'Excelente',
  'Não aconteceu',
];

export function validateShortsOutput(
  raw: any,
  fallback: PlannedShort[],
  source: 'nim' | 'gemini' | 'fallback'
): ValidatedAIResult<{ shorts: PlannedShort[] }> {
  const rawList = raw && Array.isArray(raw.shorts) && raw.shorts.length > 0 ? raw.shorts : fallback;
  const shorts: PlannedShort[] = rawList
    .filter((s: any) => s && typeof s === 'object')
    .slice(0, 15)
    .map((s: any, idx: number) => ({
      id: asNonEmptyString(s.id, `sh-${Date.now()}-${idx + 1}`, 80),
      title: asNonEmptyString(s.title, `Corte Digital #${idx + 1}`, 200),
      hook: asNonEmptyString(s.hook, 'Gancho de abertura de alto impacto.', 500),
      generatingQuestion: asNonEmptyString(
        s.generatingQuestion,
        'Pergunta geradora do corte.',
        500
      ),
      estimatedDuration: asNonEmptyString(s.estimatedDuration, '45-60s', 40),
      status: VALID_SHORT_STATUSES.includes(s.status) ? s.status : 'Planejado',
      notes: typeof s.notes === 'string' ? s.notes.slice(0, 500) : undefined,
    }));

  return {
    data: { shorts },
    meta: {
      promptVersion: PROMPT_VERSIONS.SHORTS,
      source,
      validated: true,
      warnings: [],
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Truncates episode payload before sending to Gemini to control context window budget.
 */
export function buildSafeEpisodeAiContext(episode: any) {
  if (!episode || typeof episode !== 'object') return {};
  return {
    title: String(episode.title || '').slice(0, 200),
    guestName: String(episode.guestName || '').slice(0, 120),
    host: String(episode.host || 'Apresentador').slice(0, 120),
    format: String(episode.format || 'Entrevista'),
    targetDurationMin: Number(episode.targetDurationMin) || 45,
    idea: String(episode.idea || '').slice(0, 1500),
    diagnosis: episode.diagnosis || {},
    outline: Array.isArray(episode.outline) ? episode.outline.slice(0, 12) : [],
    questions: Array.isArray(episode.questions) ? episode.questions.slice(0, 20) : [],
    script: Array.isArray(episode.script) ? episode.script.slice(0, 40) : [],
    recordingMarkers: Array.isArray(episode.recordingMarkers)
      ? episode.recordingMarkers.slice(0, 30)
      : [],
    assets: Array.isArray(episode.assets) ? episode.assets.slice(0, 20) : [],
  };
}
