import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, RefreshCw, Search, Video, Captions, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

type CatalogProgram = { id: string; slug: string; name: string; description: string | null; host: string | null; active: boolean };
type EditorialVideo = {
  id: string; title: string; canonical_url: string; channel_title: string | null; published_at: string | null;
  transcript_status: string; language: string | null; duration_seconds: number | null;
  video_transcripts?: Array<{ id: string; language: string; version: number; status: string; is_current: boolean; created_at: string }>;
  video_editorial_analyses?: Array<{ id: string; summary: string; topics: unknown[]; guests: unknown[]; review_status: string; created_at: string }>;
};

const statusLabel: Record<string, string> = {
  pending: 'Aguardando', available: 'Legenda disponível', unavailable: 'Sem legenda pública',
  restricted: 'Acesso restrito', error: 'Falha recuperável', manual_review: 'Revisão necessária',
};

function duration(seconds: number | null) {
  if (!seconds) return 'Duração não informada';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}h ${m}min` : `${m}min ${s.toString().padStart(2, '0')}s`;
}

export const EditorialVideoIntelligence: React.FC = () => {
  const [programs, setPrograms] = useState<CatalogProgram[]>([]);
  const [programId, setProgramId] = useState('');
  const [url, setUrl] = useState('');
  const [videos, setVideos] = useState<EditorialVideo[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadPrograms = useCallback(async () => {
    const result = await api.editorialCatalogPrograms();
    setPrograms(result.programs || []);
    if (!programId && result.programs?.[0]) setProgramId(result.programs[0].id);
  }, [programId]);

  const loadVideos = useCallback(async (selectedId: string) => {
    const result = await api.editorialVideos(selectedId || undefined);
    setVideos(result.videos || []);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const result = await api.editorialCatalogPrograms();
        if (!alive) return;
        setPrograms(result.programs || []);
        const firstId = programId || result.programs?.[0]?.id || '';
        if (!programId && firstId) setProgramId(firstId);
        const list = await api.editorialVideos(firstId || undefined);
        if (alive) setVideos(list.videos || []);
      } catch (e: any) {
        if (alive) setError(e?.message || 'Não foi possível carregar o catálogo editorial.');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!programId) return;
    loadVideos(programId).catch((e: any) => setError(e?.message || 'Falha ao carregar vídeos.'));
  }, [programId, loadVideos]);

  const importVideo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim()) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api.importEditorialVideo(url.trim(), programId || undefined);
      setNotice(result.transcript ? 'Vídeo e transcrição importados.' : result.captionsAvailable ? 'Vídeo importado; a legenda não pôde ser obtida nesta execução.' : 'Vídeo importado sem legenda pública disponível.');
      setUrl('');
      await loadVideos(programId);
    } catch (e: any) {
      setError(e?.message || 'Falha ao importar vídeo.');
    } finally { setBusy(false); }
  };

  const refresh = async () => {
    setBusy(true); setError('');
    try { await loadPrograms(); await loadVideos(programId); }
    catch (e: any) { setError(e?.message || 'Falha ao atualizar o histórico.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs uppercase tracking-wider font-semibold">
            <BookOpen className="w-4 h-4" /> Inteligência editorial histórica
          </div>
          <h2 className="mt-1 text-lg font-semibold text-zinc-100">Vídeos e transcrições do YouTube</h2>
          <p className="mt-1 text-sm text-zinc-400">Importa vídeos públicos, preserva legendas disponíveis e vincula o histórico ao programa canônico.</p>
        </div>
        <button type="button" onClick={refresh} disabled={busy || loading} className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      <form onSubmit={importVideo} className="grid gap-3 md:grid-cols-[minmax(220px,0.8fr)_minmax(260px,1.5fr)_auto]">
        <select value={programId} onChange={(e) => setProgramId(e.target.value)} className="min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100" disabled={loading || busy}>
          <option value="">Vincular depois</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input value={url} onChange={(e) => setUrl(e.target.value)} type="url" required placeholder="URL pública do vídeo do YouTube" className="min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500" />
        <button type="submit" disabled={busy || loading || !url.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50">
          <Video className="h-4 w-4" /> {busy ? 'Importando…' : 'Importar vídeo'}
        </button>
      </form>

      {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
      {loading ? <p className="text-sm text-zinc-400">Carregando catálogo e histórico…</p> : videos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-400">
          <Search className="mx-auto mb-2 h-5 w-5" /> Nenhum vídeo importado para este programa. A descoberta em lote dos canais oficiais é parte da coleta completa do catálogo.
        </div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {videos.map((video) => {
            const transcript = (video.video_transcripts || []).find((t) => t.is_current);
            const analysis = (video.video_editorial_analyses || [])[0];
            return <article key={video.id} className="py-4 first:pt-1 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <a href={video.canonical_url} target="_blank" rel="noreferrer" className="font-medium text-zinc-100 hover:text-amber-300">{video.title}</a>
                  <p className="mt-1 text-xs text-zinc-500">{video.channel_title || 'Canal não identificado'} · {video.published_at ? new Date(video.published_at).toLocaleDateString('pt-BR') : 'Data não informada'} · {duration(video.duration_seconds)}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs ${video.transcript_status === 'available' ? 'border-emerald-900 bg-emerald-950/40 text-emerald-300' : 'border-zinc-700 text-zinc-400'}`}>{statusLabel[video.transcript_status] || video.transcript_status}</span>
              </div>
              {transcript && <p className="mt-2 flex items-center gap-2 text-xs text-emerald-300"><Captions className="h-4 w-4" /> Transcrição {transcript.language} · versão {transcript.version}</p>}
              {analysis && <p className="mt-2 text-sm text-zinc-300">{analysis.summary}</p>}
              <p className="mt-2 text-xs text-zinc-500">Fonte: YouTube público · {video.language || 'idioma não identificado'} · A transcrição registra o conteúdo falado; não comprova a veracidade das afirmações.</p>
            </article>;
          })}
        </div>
      )}
    </section>
  );
};

export default EditorialVideoIntelligence;
