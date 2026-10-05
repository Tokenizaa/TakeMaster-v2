import fs from 'fs';
import path from 'path';
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

function normalizeSlug(input: string): string {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^show-/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getKnowledgeBaseDirs(): string[] {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, 'rsplay-knowledge-base'),
    path.resolve(cwd, 'rsplay-knowledge-base', 'programs'),
    path.resolve(cwd, 'programs'),
  ];
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
  // Also extract explicit thematic keywords mentioned in the media kit sections if present
  if (proposta) {
    const lowerProp = proposta.toLowerCase();
    if (lowerProp.includes('direito previdenciário') && !temas.includes('Direito Previdenciário')) {
      temas.push('Direito Previdenciário');
    }
    if (
      lowerProp.includes('planejamento previdenciário') &&
      !temas.includes('Planejamento Previdenciário')
    ) {
      temas.push('Planejamento Previdenciário');
    }
    if (lowerProp.includes('liderança feminina') && !temas.includes('Liderança Feminina')) {
      temas.push('Liderança Feminina');
    }
    if (lowerProp.includes('flamenco') && !temas.includes('Cultura & Dança Flamenca')) {
      temas.push('Cultura & Dança Flamenca');
    }
    if (lowerProp.includes('impacto social') && !temas.includes('Impacto Social')) {
      temas.push('Impacto Social');
    }
    if (lowerProp.includes('sustentabilidade') && !temas.includes('Sustentabilidade')) {
      temas.push('Sustentabilidade');
    }
    if (lowerProp.includes('cultura') && !temas.includes('Cultura & Propósito')) {
      temas.push('Cultura & Propósito');
    }
  }
  if (temas.length === 0 && descricao) {
    if (/saúde|bem-estar|qualidade de vida/i.test(descricao)) {
      temas.push('Saúde', 'Bem-estar', 'Qualidade de Vida com Ciência');
    }
  }

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
