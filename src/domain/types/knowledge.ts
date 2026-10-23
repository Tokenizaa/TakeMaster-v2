/**
 * Program Knowledge Domain Types — Strict Internal Types
 */

import type {
  ShowFormat,
  ProgramKnowledgeSource,
  ProgramKnowledgeSummary,
  ProgramEditorialIdentity,
  ProgramPitchSuggestion,
  ProgramPitchRequestInput,
  ProgramPitchCurationResponse,
  EditorialFitLevel,
} from '../contracts';

export type {
  ShowFormat,
  ProgramKnowledgeSource,
  ProgramKnowledgeSummary,
  ProgramEditorialIdentity,
  ProgramPitchSuggestion,
  ProgramPitchRequestInput,
  ProgramPitchCurationResponse,
  EditorialFitLevel,
};

// ============================================
// STRICT VERSIONS
// ============================================

export interface StrictProgramKnowledgeSource {
  urlOriginal: string;
  urlCanonica: string;
  tituloDaPagina: string;
  tipoDePagina: string;
  statusHttp: number;
  dataHoraScrape: string;
  trechosCount: number;
  resumoTrecho?: string;
  metadados?: Record<string, unknown>;
}

export interface StrictProgramKnowledgeSummary {
  slug: string;
  showId?: string;
  foundInKnowledgeBase: boolean;
  coverageLevel: 'completa' | 'parcial' | 'cadastro_interno';
  coverageLabel: string;
  nome: string;
  apresentador: string;
  descricao: string;
  proposta: string;
  conceito: string;
  publico: string;
  temasPrincipais: string[];
  quadros: string[];
  formato: string;
  duracao: string;
  horario: string;
  canalPlataforma: string;
  caracteristicasEditoriais: string[];
  informacoesComerciais: string[];
  redesSociais: string[];
  imagensCount: number;
  secoesExtraidasCount: number;
  fontes: StrictProgramKnowledgeSource[];
  editorialSynthesis: StrictProgramEditorialIdentity;
}

export interface StrictProgramEditorialIdentity {
  essencia: string;
  publico: string;
  tom: string;
  temas: string[];
  formatos: string[];
  forcas: string[];
  abordagens_recomendadas: string[];
  abordagens_a_evitar: string[];
  diferenciais: string[];
  fontes: StrictProgramKnowledgeSource[];
  modelUsed?: string;
  usedFallback?: boolean;
  generatedAt?: string;
  confidenceScore?: number;
  completenessScore?: number;
}

export interface StrictProgramPitchSuggestion {
  score: number;
  fit: EditorialFitLevel;
  reason: string;
  angle: string;
  suggestedGuest: string;
  questions: string[];
  title: string;
  hook: string;
  generatedAt: string;
  modelUsed: string;
  inputHash?: string;
}

export interface StrictProgramPitchRequestInput {
  prompt?: string;
  tema?: string;
  noticia?: string;
  convidado?: string;
  acontecimento?: string;
  produto?: string;
  cidade?: string;
  showId?: string;
  showSlug?: string;
}

export interface StrictProgramPitchCurationResponse {
  showId: string;
  showTitle: string;
  slug: string;
  queryUsed: string;
  pautas: StrictProgramPitchSuggestion[];
  fontes: StrictProgramKnowledgeSource[];
  modelUsed: string;
  usedFallback: boolean;
  generatedAt: string;
  cached: boolean;
  cacheExpiresAt?: string;
}

// ============================================
// KNOWLEDGE BASE STRUCTURE (filesystem)
// ============================================

export interface KnowledgeBaseProgramFolder {
  slug: string;
  profile: ProgramProfile;
  extracted: ExtractedContent[];
  images: KnowledgeBaseImage[];
  lastUpdated: string;
  version: number;
}

export interface ProgramProfile {
  slug: string;
  nome: string;
  apresentador: string;
  descricao: string;
  proposta: string;
  conceito: string;
  publico: string;
  temasPrincipais: string[];
  quadros: string[];
  formato: ShowFormat;
  duracao: string;
  horario: string;
  canalPlataforma: string;
  caracteristicasEditoriais: string[];
  informacoesComerciais: string[];
  redesSociais: Record<string, string>;
  fontes: StrictProgramKnowledgeSource[];
}

export interface ExtractedContent {
  url: string;
  titulo: string;
  tipo: string;
  conteudo: string;
  dataExtracao: string;
  secoes: ExtractedSection[];
}

export interface ExtractedSection {
  titulo: string;
  conteudo: string;
  relevancia: number;
}

export interface KnowledgeBaseImage {
  path: string;
  urlOriginal: string;
  tipo: 'logo' | 'banner' | 'host' | 'set' | 'grafico' | 'outro';
  largura: number;
  altura: number;
  tamanhoBytes: number;
}

// ============================================
// CACHE & INDEX
// ============================================

export interface KnowledgeBaseCacheEntry {
  key: string;
  data: StrictProgramEditorialIdentity | StrictProgramPitchCurationResponse;
  createdAt: string;
  expiresAt: string;
  modelUsed: string;
  inputHash: string;
}

export interface KnowledgeBaseIndexEntry {
  slug: string;
  showId?: string;
  nome: string;
  apresentador: string;
  formato: ShowFormat;
  folderPath: string;
  lastScraped: string;
  coverageLevel: 'completa' | 'parcial' | 'cadastro_interno';
  profileHash: string;
}