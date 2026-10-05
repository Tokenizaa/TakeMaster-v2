import React, { useState, useEffect } from 'react';
import {
  ProgramEditorialIdentity,
  ProgramKnowledgeSummary,
  ProgramPitchCurationResponse,
  ProgramPitchRequestInput,
  ProgramPitchSuggestion,
  Show,
} from '../types';
import { api } from '../services/api';
import {
  Sparkles,
  BookOpen,
  Lightbulb,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Users,
  Compass,
  Layers,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
  HelpCircle,
  Mic,
} from 'lucide-react';

interface ProgramIdentityCardProps {
  show: Show;
  canEditEditorial?: boolean;
  initialTab?: 'identidade' | 'pautas';
  onUsePitchInProduction?: (show: Show, pitch: ProgramPitchSuggestion) => Promise<void> | void;
}

export const ProgramIdentityCard: React.FC<ProgramIdentityCardProps> = ({
  show,
  canEditEditorial = true,
  initialTab = 'identidade',
  onUsePitchInProduction,
}) => {
  const [activeTab, setActiveTab] = useState<'identidade' | 'pautas'>(initialTab);
  const [knowledge, setKnowledge] = useState<ProgramKnowledgeSummary | null>(null);
  const [editorialIdentity, setEditorialIdentity] = useState<ProgramEditorialIdentity | null>(null);
  const [loadingKnowledge, setLoadingKnowledge] = useState<boolean>(true);
  const [generatingIdentity, setGeneratingIdentity] = useState<boolean>(false);
  const [showDetailedSynthesis, setShowDetailedSynthesis] = useState<boolean>(false);

  // Curadoria de Pautas state (FASE 3, 4, 5)
  const [freePrompt, setFreePrompt] = useState<string>('');
  const [showOptionalFilters, setShowOptionalFilters] = useState<boolean>(false);
  const [optionalInputs, setOptionalInputs] = useState<Omit<ProgramPitchRequestInput, 'prompt'>>({
    tema: '',
    noticia: '',
    convidado: '',
    acontecimento: '',
    produto: '',
    cidade: '',
  });
  const [curationResult, setCurationResult] = useState<ProgramPitchCurationResponse | null>(null);
  const [generatingPautas, setGeneratingPautas] = useState<boolean>(false);
  const [creatingFromPitchIdx, setCreatingFromPitchIdx] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoadingKnowledge(true);
    setErrorMsg(null);
    api
      .getShowKnowledge(show.id)
      .then((data) => {
        if (!mounted) return;
        setKnowledge(data);
        setEditorialIdentity(data.editorialSynthesis);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setErrorMsg(err?.message || 'Não foi possível carregar a identidade do programa.');
      })
      .finally(() => {
        if (mounted) setLoadingKnowledge(false);
      });
    return () => {
      mounted = false;
    };
  }, [show.id, show.title, show.updatedAt]);

  const handleSynthesizeIdentityWithAI = async () => {
    setGeneratingIdentity(true);
    setErrorMsg(null);
    try {
      const generated = await api.generateShowEditorialIdentity(show.id);
      setEditorialIdentity(generated);
      setShowDetailedSynthesis(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao gerar síntese editorial com IA.');
    } finally {
      setGeneratingIdentity(false);
    }
  };

  const handleGeneratePautas = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGeneratingPautas(true);
    setErrorMsg(null);
    try {
      const payload: ProgramPitchRequestInput = {
        prompt: freePrompt.trim() || undefined,
        tema: optionalInputs.tema?.trim() || undefined,
        noticia: optionalInputs.noticia?.trim() || undefined,
        convidado: optionalInputs.convidado?.trim() || undefined,
        acontecimento: optionalInputs.acontecimento?.trim() || undefined,
        produto: optionalInputs.produto?.trim() || undefined,
        cidade: optionalInputs.cidade?.trim() || undefined,
      };
      const result = await api.suggestShowPautas(show.id, payload);
      setCurationResult(result);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao sugerir pautas para este programa.');
    } finally {
      setGeneratingPautas(false);
    }
  };

  const handleUseInProduction = async (pitch: ProgramPitchSuggestion, index: number) => {
    if (!onUsePitchInProduction) return;
    setCreatingFromPitchIdx(index);
    try {
      await onUsePitchInProduction(show, pitch);
    } finally {
      setCreatingFromPitchIdx(null);
    }
  };

  const coverageBadgeStyle =
    knowledge?.coverageLevel === 'completa'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : knowledge?.coverageLevel === 'parcial'
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      : 'bg-zinc-800 text-zinc-300 border-zinc-700';

  const direcaoEditorial =
    knowledge?.proposta && knowledge.proposta !== 'não identificado na base'
      ? knowledge.proposta
      : knowledge?.descricao && knowledge.descricao !== 'não identificado na base'
      ? knowledge.descricao
      : editorialIdentity?.essencia || show.editorialStyle || show.description;

  const temasExibidos =
    editorialIdentity?.temas &&
    editorialIdentity.temas.length > 0 &&
    editorialIdentity.temas[0] !== 'não identificado na base'
      ? editorialIdentity.temas
      : knowledge?.temasPrincipais && knowledge.temasPrincipais.length > 0
      ? knowledge.temasPrincipais
      : [];

  return (
    <div
      className="mt-4 rounded-xl border border-zinc-800/90 bg-zinc-950/90 overflow-hidden shadow-lg"
      data-testid={`program-identity-card-${show.id}`}
    >
      {/* Top Bar: [Identidade] [Pautas] + Cobertura */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/60">
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab('identidade')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'identidade'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen size={13} />
            Identidade
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pautas')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'pautas'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Lightbulb size={13} />
            Pautas
          </button>
        </div>

        <div className="flex items-center gap-2">
          {knowledge && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-medium border ${coverageBadgeStyle}`}
              title={knowledge.coverageLabel}
            >
              <ShieldCheck size={11} />
              {knowledge.coverageLevel === 'completa'
                ? 'RS Play / Mídia Kit Completo'
                : knowledge.coverageLevel === 'parcial'
                ? 'RS Play / Catálogo Parcial'
                : 'Base Interna TakeMaster'}
            </span>
          )}
          {activeTab === 'identidade' && (
            <button
              type="button"
              onClick={() => setActiveTab('pautas')}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1"
            >
              <Sparkles size={11} />
              Sugerir pautas
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loadingKnowledge ? (
        <div className="p-5 text-xs text-zinc-400 flex items-center gap-2">
          <RefreshCw size={14} className="animate-spin text-amber-400" />
          Carregando identidade editorial e base de conhecimento do programa...
        </div>
      ) : activeTab === 'identidade' ? (
        /* ================= ABA IDENTIDADE (FASE 1 & FASE 2) ================= */
        <div className="p-4 space-y-4">
          {/* Cabeçalho enxuto do Programa */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-800/70 pb-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-amber-400/90 font-semibold">
                Identidade Editorial do Programa
              </div>
              <h4 className="text-base font-bold text-zinc-100 tracking-tight uppercase mt-0.5">
                {knowledge?.nome || show.title}
              </h4>
              <p className="text-xs text-zinc-300 font-medium mt-0.5">
                {knowledge?.apresentador || show.host}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSynthesizeIdentityWithAI}
              disabled={generatingIdentity}
              className="self-start px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-700/80 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Gerar ou atualizar síntese editorial via NVIDIA NIM"
            >
              <Sparkles size={12} className={generatingIdentity ? 'animate-spin' : ''} />
              {generatingIdentity ? 'Analisando Base...' : 'Síntese Editorial IA'}
            </button>
          </div>

          {/* Direção Editorial & Proposta */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block">
              Direção editorial
            </span>
            <p className="text-xs text-zinc-200 leading-relaxed">{direcaoEditorial}</p>
          </div>

          {/* Grid enxuto: Público, Formato e Características */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/60">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1">
                <Users size={11} className="text-amber-400" />
                Público
              </span>
              <p className="text-xs text-zinc-300 mt-1 line-clamp-3">
                {editorialIdentity?.publico &&
                editorialIdentity.publico !== 'não identificado na base'
                  ? editorialIdentity.publico
                  : knowledge?.publico || 'não identificado na base'}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1">
                <Layers size={11} className="text-amber-400" />
                Formato & Tom
              </span>
              <p className="text-xs text-zinc-300 mt-1">
                {knowledge?.formato && knowledge.formato !== 'não identificado na base'
                  ? knowledge.formato
                  : show.format}
                {knowledge?.duracao && knowledge.duracao !== 'não identificado na base'
                  ? ` • ${knowledge.duracao}`
                  : ` • ${show.defaultDurationMin} min`}
              </p>
              {editorialIdentity?.tom && editorialIdentity.tom !== 'não identificado na base' && (
                <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">
                  Tom: {editorialIdentity.tom}
                </p>
              )}
            </div>
          </div>

          {/* Temas Principais */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">
              Temas
            </span>
            {temasExibidos.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {temasExibidos.slice(0, 8).map((tema, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200 text-[11px]"
                  >
                    {tema}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-zinc-500 italic">não identificado na base</span>
            )}
          </div>

          {/* Quadros (se existirem na fonte) */}
          {knowledge?.quadros && knowledge.quadros.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">
                Quadros / Estrutura
              </span>
              <div className="flex flex-wrap gap-1.5">
                {knowledge.quadros.slice(0, 6).map((q, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px]"
                  >
                    {q}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Síntese Editorial Detalhada Gerada pela IA (FASE 2) */}
          {editorialIdentity && (
            <div className="pt-2 border-t border-zinc-800/70">
              <button
                type="button"
                onClick={() => setShowDetailedSynthesis((prev) => !prev)}
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <Compass size={12} />
                {showDetailedSynthesis
                  ? 'Ocultar diagnóstico completo de identidade (FASE 2)'
                  : 'Ver diagnóstico completo de identidade (Forças, Abordagens e Diferenciais)'}
              </button>

              {showDetailedSynthesis && (
                <div className="mt-3 space-y-3 bg-zinc-900/70 p-3.5 rounded-lg border border-zinc-800 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-zinc-400 font-semibold block">
                      Essência Editorial
                    </span>
                    <p className="text-zinc-200 mt-0.5">{editorialIdentity.essencia}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] uppercase text-emerald-400 font-semibold block">
                        Forças Editoriais
                      </span>
                      <ul className="mt-1 space-y-1 text-zinc-300">
                        {editorialIdentity.forcas.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-amber-400 font-semibold block">
                        Diferenciais
                      </span>
                      <ul className="mt-1 space-y-1 text-zinc-300">
                        {editorialIdentity.diferenciais.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-amber-400 mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/70">
                    <div>
                      <span className="text-[10px] uppercase text-sky-400 font-semibold block">
                        Abordagens Recomendadas
                      </span>
                      <ul className="mt-1 space-y-1 text-zinc-300">
                        {editorialIdentity.abordagens_recomendadas.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-sky-400 mt-0.5">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-rose-400 font-semibold block">
                        Abordagens a Evitar
                      </span>
                      <ul className="mt-1 space-y-1 text-zinc-300">
                        {editorialIdentity.abordagens_a_evitar.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-rose-400 mt-0.5">×</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {editorialIdentity.modelUsed && (
                    <div className="pt-2 border-t border-zinc-800/70 flex items-center justify-between text-[10px] text-zinc-500">
                      <span>
                        Motor editorial: <strong className="text-zinc-400">{editorialIdentity.modelUsed}</strong>
                      </span>
                      {editorialIdentity.usedFallback && (
                        <span className="text-amber-400">Fallback automático ativado</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Rodapé de Fonte & Cobertura (FASE 1 & FASE 2) */}
          <div className="pt-2.5 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-400">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mr-2">
                Fonte:
              </span>
              <span className="text-zinc-300 font-medium">
                {knowledge?.foundInKnowledgeBase
                  ? knowledge.coverageLevel === 'completa'
                    ? 'RS Play / mídia kit oficial'
                    : 'RS Play / catálogo oficial'
                  : 'TakeMaster / cadastro interno'}
              </span>
            </div>

            {knowledge?.fontes && knowledge.fontes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {knowledge.fontes.slice(0, 2).map((fonte, idx) => (
                  <a
                    key={idx}
                    href={
                      fonte.urlCanonica.startsWith('http') ? fonte.urlCanonica : undefined
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-amber-400/90 hover:text-amber-300 underline-offset-2 hover:underline"
                    title={`${fonte.tituloDaPagina} (${fonte.tipoDePagina})`}
                  >
                    <ExternalLink size={10} />
                    {fonte.tipoDePagina === 'midia_kit_html'
                      ? 'Mídia Kit HTML'
                      : fonte.tipoDePagina === 'catalogo_cms_json'
                      ? 'Catálogo RS Play'
                      : 'Registro Interno'}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= ABA PAUTAS (FASE 3, 4, 5, 7) ================= */
        <div className="p-4 space-y-4">
          <form onSubmit={handleGeneratePautas} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-200 mb-1.5">
                O que você quer abordar?
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={freePrompt}
                  onChange={(e) => setFreePrompt(e.target.value)}
                  placeholder="Informe tema, notícia, convidado, cidade ou deixe vazio para sugestões abertas..."
                  className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={generatingPautas}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <Sparkles size={14} className={generatingPautas ? 'animate-spin' : ''} />
                  {generatingPautas ? 'Gerando pautas...' : 'Gerar pautas'}
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
                <span>
                  Dica: sem texto, usamos{' '}
                  <em className="text-zinc-400">"Quero ideias de pautas para este programa."</em>
                </span>
                <button
                  type="button"
                  onClick={() => setShowOptionalFilters((prev) => !prev)}
                  className="text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1"
                >
                  <SlidersHorizontal size={11} />
                  {showOptionalFilters ? 'Ocultar recortes opcionais' : 'Recortes opcionais'}
                </button>
              </div>
            </div>

            {showOptionalFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <div>
                  <label className="text-[10px] uppercase text-zinc-400 font-semibold block mb-1">
                    Tema
                  </label>
                  <input
                    type="text"
                    value={optionalInputs.tema || ''}
                    onChange={(e) =>
                      setOptionalInputs((prev) => ({ ...prev, tema: e.target.value }))
                    }
                    placeholder="Ex.: Direito de família"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-zinc-400 font-semibold block mb-1">
                    Notícia / Acontecimento
                  </label>
                  <input
                    type="text"
                    value={optionalInputs.noticia || ''}
                    onChange={(e) =>
                      setOptionalInputs((prev) => ({ ...prev, noticia: e.target.value }))
                    }
                    placeholder="Ex.: Nova decisão do STJ"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-zinc-400 font-semibold block mb-1">
                    Convidado
                  </label>
                  <input
                    type="text"
                    value={optionalInputs.convidado || ''}
                    onChange={(e) =>
                      setOptionalInputs((prev) => ({ ...prev, convidado: e.target.value }))
                    }
                    placeholder="Ex.: Especialista / Defensor"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-zinc-400 font-semibold block mb-1">
                    Acontecimento / Evento
                  </label>
                  <input
                    type="text"
                    value={optionalInputs.acontecimento || ''}
                    onChange={(e) =>
                      setOptionalInputs((prev) => ({ ...prev, acontecimento: e.target.value }))
                    }
                    placeholder="Ex.: Semana do Consumidor"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-zinc-400 font-semibold block mb-1">
                    Produto / Serviço
                  </label>
                  <input
                    type="text"
                    value={optionalInputs.produto || ''}
                    onChange={(e) =>
                      setOptionalInputs((prev) => ({ ...prev, produto: e.target.value }))
                    }
                    placeholder="Ex.: Planos de saúde"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-zinc-400 font-semibold block mb-1">
                    Cidade / Região
                  </label>
                  <input
                    type="text"
                    value={optionalInputs.cidade || ''}
                    onChange={(e) =>
                      setOptionalInputs((prev) => ({ ...prev, cidade: e.target.value }))
                    }
                    placeholder="Ex.: Porto Alegre / Serra Gaúcha"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200"
                  />
                </div>
              </div>
            )}
          </form>

          {/* Resultados da Curadoria de Pautas (FASE 4 & FASE 5) */}
          {curationResult && (
            <div className="space-y-3 pt-2 border-t border-zinc-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-200">
                  {curationResult.pautas.length} pautas encontradas
                </span>
                <span className="text-[10px] text-zinc-500">
                  Modelo: <strong className="text-zinc-400">{curationResult.modelUsed}</strong>
                  {curationResult.usedFallback ? ' (fallback)' : ''}
                </span>
              </div>

              <div className="space-y-3">
                {curationResult.pautas.map((pauta, idx) => {
                  const fitColor =
                    pauta.fit === 'alto'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                      : pauta.fit === 'medio'
                      ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                      : 'text-rose-400 bg-rose-500/10 border-rose-500/30';

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3 hover:border-amber-500/40 transition-colors"
                    >
                      {/* Cabeçalho da Pauta + Score */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <h5 className="text-sm font-bold text-zinc-100 leading-snug">
                              {pauta.title}
                            </h5>
                          </div>
                          {pauta.hook && (
                            <p className="text-xs text-amber-200/90 italic pl-8">
                              "{pauta.hook}"
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-400">
                            Aderência ao programa
                          </div>
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            <span className="text-sm font-bold text-emerald-400">
                              {pauta.score}%
                            </span>
                            <span
                              className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${fitColor}`}
                            >
                              {pauta.fit}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Por que funciona & Abordagem */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/70 text-xs">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                            Por que funciona
                          </span>
                          <p className="text-zinc-300 leading-relaxed">{pauta.reason}</p>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                            Abordagem
                          </span>
                          <p className="text-zinc-300 leading-relaxed">{pauta.angle}</p>
                        </div>
                      </div>

                      {/* Convidado sugerido */}
                      <div className="pt-2 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <Mic size={13} className="text-amber-400 shrink-0" />
                          <span className="text-zinc-500 font-medium">Convidado sugerido:</span>
                          <span className="font-semibold text-zinc-200">
                            {pauta.suggestedGuest}
                          </span>
                        </div>
                      </div>

                      {/* Perguntas-chave sugeridas */}
                      {pauta.questions && pauta.questions.length > 0 && (
                        <div className="bg-zinc-950/70 rounded-lg p-3 border border-zinc-800/80 space-y-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1">
                            <HelpCircle size={11} className="text-amber-400" />
                            Perguntas iniciais para o roteiro
                          </span>
                          <ul className="space-y-1 text-xs text-zinc-300">
                            {pauta.questions.map((q, qIdx) => (
                              <li key={qIdx} className="flex items-start gap-1.5">
                                <span className="text-amber-400 font-mono text-[11px]">
                                  {qIdx + 1}.
                                </span>
                                <span>{q}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Ação: [Usar na produção] */}
                      {onUsePitchInProduction && canEditEditorial && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            disabled={creatingFromPitchIdx === idx}
                            onClick={() => handleUseInProduction(pauta, idx)}
                            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                          >
                            <CheckCircle2 size={14} />
                            {creatingFromPitchIdx === idx
                              ? 'Abrindo na Produção...'
                              : 'Usar na produção'}
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
