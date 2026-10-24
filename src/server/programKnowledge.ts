import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Episode,
  Guest,
  ProgramEditorialIdentity,
  ProgramKnowledgeSource,
  ProgramKnowledgeSummary,
  Show,
} from '../domain/contracts';

const NAO_INFORMADO = 'não informado na fonte';
const NAO_IDENTIFICADO_NA_BASE = 'não identificado na base';

export function normalizeSlug(input: string): string {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^show-/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getKnowledgeBaseDirs(): string[] {
  // Use environment variable for production deployment, fallback to cwd for development
  const explicitPath = process.env.KNOWLEDGE_BASE_PATH;
  const cwd = process.cwd();
  
  const candidates: string[] = [];
  
  // Explicit path from environment takes priority (production deployment)
  if (explicitPath) {
    candidates.push(explicitPath);
    candidates.push(path.resolve(explicitPath, 'programs'));
  }
  
  // Development fallbacks
  candidates.push(
    path.resolve(cwd, 'rsplay-knowledge-base'),
    path.resolve(cwd, 'rsplay-knowledge-base', 'programs'),
    path.resolve(cwd, 'programs')
  );
  
  return candidates.filter((dir) => {
    try {
      return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
    } catch {
      return false;
    }
  });
}

function findProgramFolder(slugCandidates: string[]): string | null {
  const baseDirs = getKnowledgeBaseDirs();
  for (const dir of baseDirs) {
    for (const candidate of slugCandidates) {
      if (!candidate) continue;
      const target = path.join(dir, candidate);
      try {
        if (
          fs.existsSync(target) &&
          fs.statSync(target).isDirectory() &&
          fs.existsSync(path.join(target, 'profile.json'))
        ) {
          return target;
        }
      } catch {
        // ignore
      }
    }

    // Fallback: partial slug match if exact folder not found
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const candidate of slugCandidates) {
        if (!candidate || candidate.length < 4) continue;
        const found = entries.find(
          (e) =>
            e.isDirectory() &&
            (e.name === candidate ||
              e.name.includes(candidate) ||
              candidate.includes(e.name)) &&
            fs.existsSync(path.join(dir, e.name, 'profile.json'))
        );
        if (found) {
          return path.join(dir, found.name);
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function cleanFieldText(value: unknown, emptyFallback = NAO_IDENTIFICADO_NA_BASE): string {
  if (value === null || value === undefined) return emptyFallback;
  if (Array.isArray(value)) {
    const filtered = value
      .map((item) => String(item || '').trim())
      .filter((item) => item && item !== NAO_INFORMADO && item !== NAO_IDENTIFICADO_NA_BASE);
    return filtered.length > 0 ? filtered.join(' • ') : emptyFallback;
  }
  const str = String(value).trim();
  if (!str || str === NAO_INFORMADO || str === NAO_IDENTIFICADO_NA_BASE) {
    return emptyFallback;
  }
  return str;
}

function cleanStringList(value: unknown): string[] {
  if (!value || value === NAO_INFORMADO || value === NAO_IDENTIFICADO_NA_BASE) {
    return [];
  }
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value
          .map((v) => String(v || '').trim())
          .filter((v) => v && v !== NAO_INFORMADO && v !== NAO_IDENTIFICADO_NA_BASE)
      ),
    ];
  }
  const str = String(value).trim();
  if (!str) return [];
  return str
    .split(/[•;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s && s !== NAO_INFORMADO && s !== NAO_IDENTIFICADO_NA_BASE);
}

/**
 * Lists all scraped RS Play programs available in `/rsplay-knowledge-base` / `/programs`.
 */
export function listKnowledgeBasePrograms(): Array<{
  slug: string;
  nomeDoPrograma: string;
  apresentador: string;
  descricao: string;
  horario: string;
  temas: string[];
  midiaKitCapturado: boolean;
  secoesCount: number;
  fontesCount: number;
}> {
  const dirs = getKnowledgeBaseDirs();
  for (const dir of dirs) {
    const invPath = path.join(dir, 'inventory.json');
    if (fs.existsSync(invPath)) {
      try {
        const inv = JSON.parse(fs.readFileSync(invPath, 'utf-8'));
        if (Array.isArray(inv.programas)) {
          return inv.programas.map((p: any) => {
            let desc = '';
            let temas: string[] = [];
            const profPath = path.join(dir, p.slug, 'profile.json');
            if (fs.existsSync(profPath)) {
              try {
                const prof = JSON.parse(fs.readFileSync(profPath, 'utf-8'));
                desc = cleanFieldText(prof.descricao, '');
                temas = cleanStringList(prof.temasAbordados);
              } catch {
                // ignore
              }
            }
            return {
              slug: p.slug,
              nomeDoPrograma: p.nomeDoPrograma || p.slug,
              apresentador: cleanFieldText(p.apresentador, NAO_IDENTIFICADO_NA_BASE),
              descricao: desc || NAO_IDENTIFICADO_NA_BASE,
              horario: cleanFieldText(p.horario, NAO_IDENTIFICADO_NA_BASE),
              temas,
              midiaKitCapturado: Boolean(p.midiaKitCapturado),
              secoesCount: Number(p.secoesExtraidas || 0),
              fontesCount: Number(p.fontesCount || 1),
            };
          });
        }
      } catch {
        // fallback to directory scan
      }
    }
  }
  return [];
}

/**
 * Builds a deterministic, strictly source-grounded Editorial Identity (Fase 2)
 * without inventing or inferring any unsupported facts.
 */
export function buildGroundedEditorialIdentity(
  profile: Record<string, any> | null,
  show: Partial<Show>,
  sources: ProgramKnowledgeSource[]
): ProgramEditorialIdentity {
  if (!profile) {
    // Internal TakeMaster show (not in external RS Play scrape)
    const essencia = cleanFieldText(show.description);
    const publico = cleanFieldText(show.targetAudience);
    const tom = cleanFieldText(show.editorialStyle);
    const temas = show.category ? [show.category] : [];
    const formatos = show.format ? [show.format] : [];
    const forcas =
      show.standardStructure && show.standardStructure.length > 0
        ? [`Estrutura padrão definida (${show.standardStructure.join(' → ')})`]
        : [NAO_IDENTIFICADO_NA_BASE];
    const abordagensRecomendadas =
      tom !== NAO_IDENTIFICADO_NA_BASE
        ? [`Condução alinhada ao estilo editorial: ${tom}`]
        : [NAO_IDENTIFICADO_NA_BASE];

    return {
      essencia,
      publico,
      tom,
      temas: temas.length > 0 ? temas : [NAO_IDENTIFICADO_NA_BASE],
      formatos: formatos.length > 0 ? formatos : [NAO_IDENTIFICADO_NA_BASE],
      forcas,
      abordagens_recomendadas: abordagensRecomendadas,
      abordagens_a_evitar: [NAO_IDENTIFICADO_NA_BASE],
      diferenciais: [NAO_IDENTIFICADO_NA_BASE],
      fontes: sources,
      modelUsed: 'grounded-knowledge-synthesis',
      usedFallback: false,
      generatedAt: new Date().toISOString(),
    };
  }

  const descricao = cleanFieldText(profile.descricao, '');
  const proposta = cleanFieldText(profile.propostaEditorial, '');
  const conceito = cleanFieldText(profile.conceito, '');

  const essenciaParts = [descricao, conceito, proposta.slice(0, 480)].filter(Boolean);
  const essencia =
    essenciaParts.length > 0 ? essenciaParts[0] : NAO_IDENTIFICADO_NA_BASE;

  const publicoRaw = cleanFieldText(profile.publico, '');
  const publico = publicoRaw || NAO_IDENTIFICADO_NA_BASE;

  // Derive tone strictly from explicit sections/proposta/conceito if present
  let tom = NAO_IDENTIFICADO_NA_BASE;
  const combinedEditorialText = `${descricao} ${proposta} ${conceito}`.trim();
  if (combinedEditorialText.length > 40 && proposta) {
    // Extract factual summary of how the presenter conducts the show from the proposal
    const firstSentence = proposta
      .replace(/^\[[^\]]+\]\s*/, '')
      .split(/\.\s+/)[0];
    if (firstSentence && firstSentence.length > 15) {
      tom = `${firstSentence}.`;
    }
  } else if (show.editorialStyle && show.editorialStyle !== NAO_INFORMADO) {
    tom = show.editorialStyle;
  }

  const temas = cleanStringList(profile.temasAbordados);
  // Temas devem vir exclusivamente dos campos estruturados da fonte.
  // Não adicionar palavras-chave programáticas específicas aqui.

  const formatoRaw = cleanFieldText(profile.formato, '');
  const duracaoRaw = cleanFieldText(profile.duracao, '');
  const horarioRaw = cleanFieldText(profile.horario, '');
  const formatos: string[] = [];
  if (formatoRaw) formatos.push(formatoRaw.replace(/^\[[^\]]+\]\s*/, ''));
  if (duracaoRaw && !formatoRaw.includes(duracaoRaw)) formatos.push(`Duração: ${duracaoRaw}`);
  if (
    horarioRaw &&
    !/consulte a programa/i.test(horarioRaw) &&
    !formatoRaw.includes(horarioRaw)
  ) {
    formatos.push(`Exibição: ${horarioRaw}`);
  }

  const forcas: string[] = [];
  const apresentadorBio = cleanFieldText(profile.apresentador, '');
  if (apresentadorBio && apresentadorBio.length > 35) {
    forcas.push(
      `Autoridade e trajetória comprovada na condução: ${apresentadorBio.slice(0, 220)}${
        apresentadorBio.length > 220 ? '...' : ''
      }`
    );
  }
  const comercialList = cleanStringList(profile.informacoesComerciais);
  if (comercialList.length > 0) {
    forcas.push('Distribuição multiplataforma no ecossistema RS Play (Canal 524 Claro TV+ e Digital)');
  }

  const abordagensRecomendadas: string[] = [];
  const quadrosList = cleanStringList(profile.quadros);
  if (quadrosList.length > 0) {
    abordagensRecomendadas.push(...quadrosList.slice(0, 4));
  } else if (proposta) {
    const sentences = proposta
      .replace(/\[[^\]]+\]/g, '')
      .split(/\.\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25 && s.length < 240);
    abordagensRecomendadas.push(...sentences.slice(0, 3).map((s) => `${s}.`));
  }

  const diferenciaisList = cleanStringList(profile.diferenciais);
  if (diferenciaisList.length === 0 && proposta && /diferencial/i.test(proposta)) {
    const diffMatch = proposta.match(/[^.]*diferencial[^.]*\./i);
    if (diffMatch) diferenciaisList.push(diffMatch[0].trim());
  }

  return {
    essencia,
    publico,
    tom,
    temas: temas.length > 0 ? temas : [NAO_IDENTIFICADO_NA_BASE],
    formatos: formatos.length > 0 ? formatos : [NAO_IDENTIFICADO_NA_BASE],
    forcas: forcas.length > 0 ? forcas : [NAO_IDENTIFICADO_NA_BASE],
    abordagens_recomendadas:
      abordagensRecomendadas.length > 0
        ? abordagensRecomendadas
        : [NAO_IDENTIFICADO_NA_BASE],
    abordagens_a_evitar: [NAO_IDENTIFICADO_NA_BASE],
    diferenciais:
      diferenciaisList.length > 0 ? diferenciaisList : [NAO_IDENTIFICADO_NA_BASE],
    fontes: sources,
    modelUsed: 'grounded-knowledge-base',
    usedFallback: false,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Resolves the complete ProgramKnowledgeSummary & raw RAG context for any Show.
 */
export function resolveProgramKnowledge(
  show: Partial<Show> & { title: string; id?: string },
  explicitSlug?: string
): {
  summary: ProgramKnowledgeSummary;
  rawContentMd: string;
  rawProfile: Record<string, any> | null;
} {
  const slugFromTitle = normalizeSlug(show.title);
  const slugFromId = show.id ? normalizeSlug(show.id) : '';
  const candidates = [
    explicitSlug ? normalizeSlug(explicitSlug) : '',
    slugFromId,
    slugFromTitle,
    slugFromTitle === 'advogada-leque' ? 'advogada-do-leque' : '',
  ].filter(Boolean);

  const folder = findProgramFolder(candidates);

  if (!folder) {
    const fallbackSources: ProgramKnowledgeSource[] = [
      {
        urlOriginal: `takemaster://shows/${show.id || slugFromTitle}`,
        urlCanonica: `takemaster://shows/${show.id || slugFromTitle}`,
        tituloDaPagina: `Cadastro do Programa no TakeMaster (${show.title})`,
        tipoDePagina: 'cadastro_interno_takemaster',
        statusHttp: 200,
        dataHoraScrape: show.updatedAt || new Date().toISOString(),
        trechosCount: 1,
        resumoTrecho: show.description || show.editorialStyle || show.title,
      },
    ];

    const editorialSynthesis = buildGroundedEditorialIdentity(null, show, fallbackSources);

    const summary: ProgramKnowledgeSummary = {
      slug: slugFromTitle || 'programa',
      showId: show.id,
      foundInKnowledgeBase: false,
      coverageLevel: 'cadastro_interno',
      coverageLabel: 'Cadastro Interno TakeMaster (Sem Mídia Kit no Scrape RS Play)',
      nome: show.title,
      apresentador: cleanFieldText(show.host),
      descricao: cleanFieldText(show.description),
      proposta: cleanFieldText(show.editorialStyle),
      conceito: NAO_IDENTIFICADO_NA_BASE,
      publico: cleanFieldText(show.targetAudience),
      temasPrincipais: show.category ? [show.category] : [],
      quadros: show.standardStructure || [],
      formato: cleanFieldText(show.format),
      duracao: show.defaultDurationMin ? `${show.defaultDurationMin} minutos` : NAO_IDENTIFICADO_NA_BASE,
      horario: NAO_IDENTIFICADO_NA_BASE,
      canalPlataforma:
        show.distributionChannels && show.distributionChannels.length > 0
          ? show.distributionChannels.join(' • ')
          : NAO_IDENTIFICADO_NA_BASE,
      caracteristicasEditoriais: [
        ...(show.editorialStyle ? [show.editorialStyle] : []),
        ...(show.scenario ? [`Cenário: ${show.scenario}`] : []),
      ],
      informacoesComerciais: [],
      redesSociais: [],
      imagensCount: 0,
      secoesExtraidasCount: 0,
      fontes: fallbackSources,
      editorialSynthesis,
    };

    const rawContentMd = `PROGRAMA: ${summary.nome}
APRESENTADOR(A): ${summary.apresentador}
DESCRIÇÃO: ${summary.descricao}
PROPOSTA / ESTILO EDITORIAL: ${summary.proposta}
PÚBLICO: ${summary.publico}
FORMATO: ${summary.formato} (${summary.duracao})
ESTRUTURA PADRÃO: ${(show.standardStructure || []).join(' | ') || NAO_IDENTIFICADO_NA_BASE}
FONTES: Cadastro interno TakeMaster (${show.id || summary.slug})`;

    return { summary, rawContentMd, rawProfile: null };
  }

  const profilePath = path.join(folder, 'profile.json');
  const contentPath = path.join(folder, 'content.md');
  const sourcesPath = path.join(folder, 'sources.json');
  const mediaPath = path.join(folder, 'media.json');

  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  const rawContentMd = fs.existsSync(contentPath)
    ? fs.readFileSync(contentPath, 'utf-8')
    : '';
  const rawSources: any[] = fs.existsSync(sourcesPath)
    ? JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'))
    : [];
  const rawMedia: any[] = fs.existsSync(mediaPath)
    ? JSON.parse(fs.readFileSync(mediaPath, 'utf-8'))
    : [];

  const fontes: ProgramKnowledgeSource[] = rawSources.map((s) => ({
    urlOriginal: s.urlOriginal || s.urlCanonica || 'https://www.rsplay.com.br/',
    urlCanonica: s.urlCanonica || s.urlOriginal || 'https://www.rsplay.com.br/',
    tituloDaPagina: s.tituloDaPagina || 'Fonte Oficial RS Play',
    tipoDePagina: s.tipoDePagina || 'catalogo_cms_json',
    statusHttp: Number(s.statusHttp || 200),
    dataHoraScrape: s.dataHoraScrape || profile.atualizadoEm || new Date().toISOString(),
    trechosCount: Array.isArray(s.trechosExtraidos) ? s.trechosExtraidos.length : 0,
    resumoTrecho:
      Array.isArray(s.trechosExtraidos) && s.trechosExtraidos[0]?.textoOriginal
        ? String(s.trechosExtraidos[0].textoOriginal).slice(0, 260)
        : undefined,
  }));

  const secoesCount = Array.isArray(profile.secoesDoMidiaKit)
    ? profile.secoesDoMidiaKit.length
    : 0;
  const hasMediaKitHtml = Boolean(profile.midiaKitCapturadoComSucesso && secoesCount > 0);

  const editorialSynthesis = buildGroundedEditorialIdentity(profile, show, fontes);

  const caracteristicasEditoriais: string[] = [];
  if (editorialSynthesis.tom !== NAO_IDENTIFICADO_NA_BASE) {
    caracteristicasEditoriais.push(editorialSynthesis.tom);
  }
  for (const rec of editorialSynthesis.abordagens_recomendadas) {
    if (
      rec !== NAO_IDENTIFICADO_NA_BASE &&
      !caracteristicasEditoriais.includes(rec) &&
      caracteristicasEditoriais.length < 4
    ) {
      caracteristicasEditoriais.push(rec);
    }
  }

  const imagensCount = rawMedia.filter((m) => m.tipo === 'imagem').length;

  const summary: ProgramKnowledgeSummary = {
    slug: profile.slug || path.basename(folder),
    showId: show.id,
    foundInKnowledgeBase: true,
    coverageLevel: hasMediaKitHtml ? 'completa' : 'parcial',
    coverageLabel: hasMediaKitHtml
      ? `Cobertura Completa • Mídia Kit Oficial (${secoesCount} seções) + Catálogo RS Play`
      : 'Cobertura Parcial • Catálogo Oficial RS Play (Sem Mídia Kit Dedicado)',
    nome: cleanFieldText(profile.nomeDoPrograma, show.title),
    apresentador: cleanFieldText(
      profile.apresentador,
      show.host || NAO_IDENTIFICADO_NA_BASE
    )
      .split(' — ')[0]
      .trim(),
    descricao: cleanFieldText(profile.descricao, show.description || NAO_IDENTIFICADO_NA_BASE),
    proposta: cleanFieldText(profile.propostaEditorial),
    conceito: cleanFieldText(profile.conceito),
    publico: cleanFieldText(profile.publico),
    temasPrincipais:
      editorialSynthesis.temas[0] === NAO_IDENTIFICADO_NA_BASE
        ? []
        : editorialSynthesis.temas,
    quadros:
      cleanStringList(profile.quadros).length > 0
        ? cleanStringList(profile.quadros)
        : show.standardStructure || [],
    formato: cleanFieldText(profile.formato),
    duracao: cleanFieldText(profile.duracao),
    horario: cleanFieldText(profile.horario),
    canalPlataforma: cleanFieldText(profile.canalPlataforma),
    caracteristicasEditoriais,
    informacoesComerciais: cleanStringList(profile.informacoesComerciais),
    redesSociais: cleanStringList(profile.redesSociais),
    imagensCount,
    secoesExtraidasCount: secoesCount,
    fontes,
    editorialSynthesis,
  };

  return { summary, rawContentMd, rawProfile: profile };
}

/**
 * FASE 6 — Monta o contexto editorial completo do programa para enviar ao NVIDIA NIM:
 * program -> knowledge profile -> content -> sources -> contexto editorial -> NVIDIA NIM
 */
export function buildProgramEditorialAiContext(params: {
  show: Partial<Show> & { title: string; id?: string };
  episodes?: Episode[];
  guests?: Guest[];
}): {
  knowledge: ProgramKnowledgeSummary;
  contextPromptBlock: string;
} {
  const { summary, rawContentMd } = resolveProgramKnowledge(params.show);
  const showEpisodes = (params.episodes || []).slice(0, 8);
  const availableGuests = (params.guests || []).slice(0, 10);

  const historyLines =
    showEpisodes.length > 0
      ? showEpisodes
          .map(
            (ep, idx) =>
              `${idx + 1}. "${ep.title}" (Convidado: ${ep.guestName || 'N/A'}) — Ideia: ${
                ep.idea || 'N/A'
              }`
          )
          .join('\n')
      : 'Nenhum episódio anterior registrado para este programa no banco.';

  const guestsLines =
    availableGuests.length > 0
      ? availableGuests
          .map(
            (g) =>
              `- ${g.name} (${g.role || 'Convidado'} — ${g.company || 'N/A'}): ${
                g.bio ? g.bio.slice(0, 140) : 'Sem bio detalhada'
              }`
          )
          .join('\n')
      : 'Nenhum participante pré-cadastrado na base de convidados.';

  const sourcesLines = summary.fontes
    .map(
      (s) =>
        `- ${s.urlCanonica} (${s.tipoDePagina}, HTTP ${s.statusHttp}, coletado em ${s.dataHoraScrape})`
    )
    .join('\n');

  const contextPromptBlock = `=== BASE DE CONHECIMENTO OFICIAL DO PROGRAMA (RS PLAY / TAKEMASTER) ===
PROGRAMA: ${summary.nome}
SLUG: ${summary.slug}
COBERTURA DA BASE: ${summary.coverageLabel}
APRESENTADOR(A): ${summary.apresentador}
DESCRIÇÃO OFICIAL: ${summary.descricao}
PROPOSTA EDITORIAL: ${summary.proposta}
CONCEITO: ${summary.conceito}
PÚBLICO-ALVO: ${summary.publico}
TEMAS PRINCIPAIS: ${
    summary.temasPrincipais.length > 0
      ? summary.temasPrincipais.join(', ')
      : NAO_IDENTIFICADO_NA_BASE
  }
QUADROS: ${
    summary.quadros.length > 0 ? summary.quadros.join(' | ') : NAO_IDENTIFICADO_NA_BASE
  }
FORMATO: ${summary.formato}
DURAÇÃO: ${summary.duracao}
HORÁRIO / PERIODICIDADE: ${summary.horario}
CANAL / PLATAFORMA: ${summary.canalPlataforma}

=== CONTEÚDO ESTRUTURADO DA FONTE (CONTENT.MD) ===
${rawContentMd.slice(0, 6500)}

=== HISTÓRICO DE EPISÓDIOS DO PROGRAMA NO TAKEMASTER ===
${historyLines}

=== PARTICIPANTES / CONVIDADOS DISPONÍVEIS NO BANCO ===
${guestsLines}

=== FONTES RASTREÁVEIS UTILIZADAS (${summary.fontes.length}) ===
${sourcesLines}
`;

  return {
    knowledge: summary,
    contextPromptBlock,
  };
}

export const listAvailableKnowledgeBasePrograms = listKnowledgeBasePrograms;

/**
 * Result of editorial base validation and mapping
 */
export interface EditorialBaseValidationResult {
  isValid: boolean;
  slug: string;
  coverageLevel: 'completa' | 'parcial' | 'cadastro_interno';
  coverageLabel: string;
  sources: ProgramKnowledgeSource[];
  gaps: string[];
  warnings: string[];
  profileHash: string;
  matchedProgramTitle: string;
  editorialIdentity: ProgramEditorialIdentity;
}

/**
 * Operational configuration derived from editorial base
 */
export interface EditorialOperationalConfig {
  // Program identity
  title: string;
  description: string;
  host: string;
  format: string;
  defaultDurationMin: number;
  editorialStyle: string;
  scenario: string;
  category: string;
  targetAudience: string;
  distributionChannels: string[];
  
  // Episode structure
  standardStructure: string[];
  defaultOpening: string;
  defaultClosing: string;
  
  // Cameras
  cameras: Array<{
    name: string;
    label: string;
    purpose: string;
    framing: string;
    active: boolean;
  }>;
  
  // Editorial metadata
  themes: string[];
  quadros: string[];
  diferenciais: string[];
  informacoesComerciais: string[];
  redesSociais: string[];
  
  // Tracking
  editorialSource: {
    slug: string;
    coverageLevel: string;
    coverageLabel: string;
    profileHash: string;
    sourcesCount: number;
    gaps: string[];
    mappedAt: string;
  };
}

/**
 * Validates that the editorial base corresponds to the selected program
 * and returns validation result with gaps and warnings.
 * Returns isValid: false if there are critical mismatches (e.g., title mismatch).
 */
export function validateEditorialBaseMatchesProgram(
  summary: ProgramKnowledgeSummary,
  selectedProgramTitle: string,
  selectedProgramSlug?: string
): EditorialBaseValidationResult {
  // Check if program was found in knowledge base
  if (!summary.foundInKnowledgeBase) {
    // Not found is a critical gap
    return {
      isValid: false,
      slug: summary.slug,
      coverageLevel: summary.coverageLevel,
      coverageLabel: summary.coverageLabel,
      sources: summary.fontes,
      gaps: ['Programa não encontrado na base de conhecimento editorial (RS Play)'],
      warnings: ['Usando cadastro interno do TakeMaster como fallback'],
      profileHash: '',
      matchedProgramTitle: summary.nome,
      editorialIdentity: summary.editorialSynthesis,
    };
  }
  
  // Check coverage level - partial is a warning, not a critical gap
  // but we still need to track it for the return value
  if (summary.coverageLevel === 'parcial') {
    // Partial coverage is tracked but not a critical gap
  }
  
  // Check title match (fuzzy match for safety)
  const normalizedTitle = normalizeSlug(selectedProgramTitle);
  const normalizedFound = normalizeSlug(summary.nome);
  if (normalizedTitle !== normalizedFound) {
    // Title mismatch is a critical validation failure
    return {
      isValid: false,
      slug: summary.slug,
      coverageLevel: summary.coverageLevel,
      coverageLabel: summary.coverageLabel,
      sources: summary.fontes,
      gaps: [`Título do programa selecionado ("${selectedProgramTitle}") difere do encontrado na base ("${summary.nome}")`],
      warnings: [],
      profileHash: '',
      matchedProgramTitle: summary.nome,
      editorialIdentity: summary.editorialSynthesis,
    };
  }
  
  // Check for missing CRITICAL fields only - these make validation fail
  if (summary.apresentador === NAO_IDENTIFICADO_NA_BASE) {
    return {
      isValid: false,
      slug: summary.slug,
      coverageLevel: summary.coverageLevel,
      coverageLabel: summary.coverageLabel,
      sources: summary.fontes,
      gaps: ['Apresentador não identificado na base'],
      warnings: [],
      profileHash: '',
      matchedProgramTitle: summary.nome,
      editorialIdentity: summary.editorialSynthesis,
    };
  }
  
  if (summary.temasPrincipais.length === 0) {
    return {
      isValid: false,
      slug: summary.slug,
      coverageLevel: summary.coverageLevel,
      coverageLabel: summary.coverageLabel,
      sources: summary.fontes,
      gaps: ['Temas principais não identificados na base'],
      warnings: [],
      profileHash: '',
      matchedProgramTitle: summary.nome,
      editorialIdentity: summary.editorialSynthesis,
    };
  }
  
  // WARNINGS (non-blocking) - collect but don't fail validation
  const warnings_list: string[] = [];
  
  if (summary.coverageLevel === 'parcial') {
    warnings.push('Cobertura parcial: Mídia Kit oficial não capturado ou incompleto');
    warnings.push('Alguns campos editoriais podem estar ausentes ou baseados apenas no catálogo RS Play');
  }
  
  // Check for missing non-critical fields (warnings only)
  if (summary.publico === NAO_IDENTIFICADO_NA_BASE) {
    warnings_list.push('Público-alvo não identificado na base');
  }
  if (summary.formato === NAO_IDENTIFICADO_NA_BASE) {
    warnings.push('Formato não identificado na base');
  }
  if (summary.duracao === NAO_IDENTIFICADO_NA_BASE) {
    warnings.push('Duração não identificada na base');
  }
  if (summary.informacoesComerciais.length === 0) {
    warnings_list.push('Informações comerciais não identificadas na base');
  }
  if (summary.quadros.length === 0 && summary.quadros !== NAO_IDENTIFICADO_NA_BASE) {
    warnings_list.push('Quadros/estrutura não identificados na base');
  }
  
  // Generate profile hash for version tracking
  const profileData = JSON.stringify({
    slug: summary.slug,
    nome: summary.nome,
    apresentador: summary.apresentador,
    descricao: summary.descricao,
    proposta: summary.proposta,
    conceito: summary.conceito,
    publico: summary.publico,
    temasPrincipais: summary.temasPrincipais,
    quadros: summary.quadros,
    formato: summary.formato,
    duracao: summary.duracao,
    horario: summary.horario,
    canalPlataforma: summary.canalPlataforma,
    informacoesComerciais: summary.informacoesComerciais,
    redesSociais: summary.redesSociais,
  });
  const profileHash = crypto.createHash('sha256').update(profileData).digest('hex').slice(0, 16);
  
  // Valid if found in KB, not cadastro_interno, and no critical gaps (we already returned early for critical gaps)
  const isValid = summary.foundInKnowledgeBase 
    && summary.coverageLevel !== 'cadastro_interno';
  
  return {
    isValid,
    slug: summary.slug,
    coverageLevel: summary.coverageLevel,
    coverageLabel: summary.coverageLabel,
    sources: summary.fontes,
    gaps: [], // Critical gaps would have returned early
    warnings: warnings_list,
    profileHash,
    matchedProgramTitle: summary.nome,
    editorialIdentity: summary.editorialSynthesis,
  };
}

/**
 * Maps editorial base data to operational configuration for program setup.
 * Only maps fields that have actual evidence in the editorial base.
 * Missing data is left as explicit gaps, not fabricated.
 */
export function mapEditorialBaseToOperationalConfig(
  validation: EditorialBaseValidationResult,
  show: Partial<Show> & { title: string; id?: string }
): EditorialOperationalConfig {
  const { summary: editorialSummary, editorialIdentity } = 
    resolveProgramKnowledge(show, validation.slug);
  
  // Use editorial data when available, otherwise use show data or mark as provisional
  const hasEditorialBase = validation.isValid && validation.coverageLevel !== 'cadastro_interno';
  
  // Map format from editorial base
  let format = 'Outro';
  if (hasEditorialBase && editorialSummary.formato !== NAO_IDENTIFICADO_NA_BASE) {
    format = editorialSummary.formato;
  } else if (show.format && show.format !== 'Outro') {
    format = show.format;
  }
  
  // Map duration
  let defaultDurationMin = 45;
  if (hasEditorialBase && editorialSummary.duracao !== NAO_IDENTIFICADO_NA_BASE) {
    const durMatch = editorialSummary.duracao.match(/(\d+)/);
    if (durMatch) defaultDurationMin = parseInt(durMatch[1], 10);
  } else if (show.defaultDurationMin && show.defaultDurationMin > 0) {
    defaultDurationMin = show.defaultDurationMin;
  }
  
  // Map host/apresentador
  let host = '';
  if (hasEditorialBase && editorialSummary.apresentador !== NAO_IDENTIFICADO_NA_BASE) {
    host = editorialSummary.apresentador.split(' — ')[0].trim();
  } else if (show.host) {
    host = show.host;
  }
  
  // Map editorial style / tom
  let editorialStyle = '';
  if (hasEditorialBase && editorialIdentity.tom !== NAO_IDENTIFICADO_NA_BASE) {
    editorialStyle = editorialIdentity.tom;
  } else if (show.editorialStyle) {
    editorialStyle = show.editorialStyle;
  }
  
  // Map standard structure / quadros
  let standardStructure = ['Abertura', 'Bloco 1', 'Bloco 2', 'Encerramento'];
  if (hasEditorialBase && editorialSummary.quadros.length > 0) {
    standardStructure = editorialSummary.quadros;
  } else if (show.standardStructure && show.standardStructure.length > 0) {
    standardStructure = show.standardStructure;
  }
  
  // Map default opening/closing
  let defaultOpening = 'Bem-vindos ao {program_title}. Hoje recebemos {guest_name} para falar sobre {topic}.';
  let defaultClosing = 'Obrigado por assistir. Não esqueça de se inscrever e ativar as notificações.';
  
  if (hasEditorialBase) {
    // Try to personalize based on editorial identity
    if (editorialIdentity.essencia !== NAO_IDENTIFICADO_NA_BASE) {
      defaultOpening = `Bem-vindos ao ${editorialSummary.nome}. ${editorialIdentity.essencia.slice(0, 200)} Hoje recebemos {guest_name}.`;
    }
    if (editorialIdentity.diferenciais[0] !== NAO_IDENTIFICADO_NA_BASE) {
      defaultClosing = `Obrigado por assistir ao ${editorialSummary.nome}. ${editorialIdentity.diferenciais[0]} Até a próxima!`;
    }
  }
  
  // Map cameras based on format
  const cameras = getDefaultCamerasForFormat(format);
  
  // Map category/themes
  let category = '';
  if (hasEditorialBase && editorialSummary.temasPrincipais.length > 0) {
    category = editorialSummary.temasPrincipais[0];
  } else if (show.category) {
    category = show.category;
  }
  
  // Map target audience
  let targetAudience = '';
  if (hasEditorialBase && editorialSummary.publico !== NAO_IDENTIFICADO_NA_BASE) {
    targetAudience = editorialSummary.publico;
  } else if (show.targetAudience) {
    targetAudience = show.targetAudience;
  }
  
  // Map distribution channels
  let distributionChannels: string[] = [];
  if (hasEditorialBase && editorialSummary.canalPlataforma !== NAO_IDENTIFICADO_NA_BASE) {
    distributionChannels = editorialSummary.canalPlataforma.split(' • ').map(s => s.trim()).filter(Boolean);
  } else if (show.distributionChannels && show.distributionChannels.length > 0) {
    distributionChannels = show.distributionChannels;
  }
  
  return {
    title: editorialSummary.nome || show.title,
    description: editorialSummary.descricao || show.description || '',
    host,
    format,
    defaultDurationMin,
    editorialStyle,
    scenario: show.scenario || '',
    category,
    targetAudience,
    distributionChannels,
    standardStructure,
    defaultOpening,
    defaultClosing,
    cameras,
    themes: hasEditorialBase ? editorialSummary.temasPrincipais : (show.category ? [show.category] : []),
    quadros: hasEditorialBase ? editorialSummary.quadros : standardStructure,
    diferenciais: hasEditorialBase ? editorialIdentity.diferenciais : [NAO_IDENTIFICADO_NA_BASE],
    informacoesComerciais: hasEditorialBase ? editorialSummary.informacoesComerciais : [],
    redesSociais: hasEditorialBase ? editorialSummary.redesSociais : [],
    editorialSource: {
      slug: validation.slug,
      coverageLevel: validation.coverageLevel,
      coverageLabel: validation.coverageLabel,
      profileHash: validation.profileHash,
      sourcesCount: validation.sources.length,
      gaps: validation.gaps,
      mappedAt: new Date().toISOString(),
    },
  };
}

/**
 * Gets default camera configuration based on show format.
 */
function getDefaultCamerasForFormat(format: string): Array<{
  name: string;
  label: string;
  purpose: string;
  framing: string;
  active: boolean;
}> {
  const baseCameras = [
    { name: 'CAM 1', label: 'Câmera Principal', purpose: 'Principal', framing: 'close_up', active: true },
    { name: 'CAM 2', label: 'Câmera Convidado', purpose: 'Guest', framing: 'medium', active: true },
    { name: 'CAM 3', label: 'Câmera Wide', purpose: 'Wide', framing: 'wide', active: true },
  ];
  
  // Customize based on format
  const fmt = format.toLowerCase();
  if (fmt.includes('entrevista') || fmt.includes('solo')) {
    return baseCameras;
  }
  if (fmt.includes('mesa') || fmt.includes('redonda') || fmt.includes('debate')) {
    return [
      { name: 'CAM 1', label: 'Câmera Principal (Mesa)', purpose: 'Principal', framing: 'medium', active: true },
      { name: 'CAM 2', label: 'Câmera Convidado 1', purpose: 'Guest', framing: 'close_up', active: true },
      { name: 'CAM 3', label: 'Câmera Convidado 2', purpose: 'Guest', framing: 'close_up', active: true },
      { name: 'CAM 4', label: 'Câmera Wide (Mesa)', purpose: 'Wide', framing: 'wide', active: true },
    ];
  }
  if (fmt.includes('podcast') || fmt.includes('videocast')) {
    return [
      { name: 'CAM 1', label: 'Câmera Host', purpose: 'Principal', framing: 'close_up', active: true },
      { name: 'CAM 2', label: 'Câmera Convidado', purpose: 'Guest', framing: 'close_up', active: true },
      { name: 'CAM 3', label: 'Câmera Wide / Overhead', purpose: 'Wide', framing: 'wide', active: true },
    ];
  }
  if (fmt.includes('reportagem')) {
    return [
      { name: 'CAM 1', label: 'Câmera Repórter', purpose: 'Principal', framing: 'medium', active: true },
      { name: 'CAM 2', label: 'Câmera Entrevistado', purpose: 'Guest', framing: 'close_up', active: true },
      { name: 'CAM 3', label: 'Câmera B-Roll / Ambiente', purpose: 'B-Roll', framing: 'wide', active: true },
    ];
  }
  
  return baseCameras;
}

/**
 * Integrates editorial base into program setup.
 * This is the main integration function that connects editorial knowledge to operational setup.
 * 
 * @param orgId - Organization ID
 * @param programId - Program UUID
 * @param show - Show data (partial)
 * @param explicitSlug - Optional explicit slug to resolve
 * @returns Operational config and validation result
 */
export async function integrateEditorialBaseToSetup(
  orgId: string,
  programId: string,
  show: Partial<Show> & { title: string; id?: string },
  explicitSlug?: string
): Promise<{
  config: EditorialOperationalConfig;
  validation: EditorialBaseValidationResult;
  success: boolean;
  error?: string;
}> {
  try {
    // Resolve the editorial knowledge base
    const { summary } = resolveProgramKnowledge(show, explicitSlug);
    
    // Validate the base matches the selected program
    const validation = validateEditorialBaseMatchesProgram(summary, show.title, explicitSlug);
    
    // If base is invalid (not found, unreadable, incompatible), return error
    if (!validation.isValid) {
      return {
        config: null as any,
        validation,
        success: false,
        error: `Base editorial inválida ou ausente: ${validation.gaps.join('; ')}`,
      };
    }
    
    // Map editorial data to operational config
    const config = mapEditorialBaseToOperationalConfig(validation, show);
    
    return {
      config,
      validation,
      success: true,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Erro desconhecido na integração da base editorial';
    return {
      config: null as any,
      validation: null as any,
      success: false,
      error: errMsg,
    };
  }
}
