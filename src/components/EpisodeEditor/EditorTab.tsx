import React, { useState } from 'react';
import {
  FileCheck,
  Sparkles,
  Copy,
  Check,
  Download,
  Flame,
  Scissors,
  Clock,
  Loader2,
  Film
} from 'lucide-react';
import { Episode } from '../../types';
import { api } from '../../services/api';

interface EditorTabProps {
  episode: Episode;
  onUpdateEpisode: (updated: Partial<Episode>) => void;
}

export const EditorTab: React.FC<EditorTabProps> = ({
  episode,
  onUpdateEpisode,
}) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate synthetic editor timeline text if not already created
  const getInitialEditorScript = () => {
    if (episode.editorScriptSynthesis) return episode.editorScriptSynthesis;

    const lines: string[] = [];
    lines.push(`ROTEIRO TÉCNICO DE EDIÇÃO & MONTAGEM`);
    lines.push(`PROGRAMA: ${episode.title}`);
    lines.push(`CONVIDADO: ${episode.guestName || 'Solo'}`);
    lines.push(`DATA DE GERAÇÃO: ${new Date().toLocaleDateString('pt-BR')}`);
    lines.push(`------------------------------------------------------------------\n`);

    lines.push(`--- LINHA DO TEMPO ESTIMADA & CORTES DE CÂMERA ---`);
    (episode.script || []).forEach((item) => {
      const markers = item.directionalMarkers?.length
        ? ` [${item.directionalMarkers.join(' · ')}]`
        : '';
      lines.push(`${item.timestamp} | ${item.camera} (${item.speaker})${markers}`);
      if (item.content) {
        lines.push(`    "${item.content.slice(0, 100)}${item.content.length > 100 ? '...' : ''}"`);
      }
    });

    const markers = episode.recordingMarkers || [];
    if (markers.length > 0) {
      lines.push(`\n------------------------------------------------------------------`);
      lines.push(`--- MARCADORES AO VIVO DO APRESENTADOR (MODO ESTÚDIO) ---`);
      markers.forEach((m) => {
        const icon = m.type === 'momento_forte' ? '🔥 MOMENTO FORTE' : m.type === 'corte' ? '✂ CORTE' : '📝 NOTA';
        lines.push(`${m.formattedTime} - ${icon}: ${m.blockTitle}`);
        lines.push(`    Detalhe: "${m.referenceText}" ${m.comment ? `[Nota: ${m.comment}]` : ''}`);
      });
    }

    const assets = episode.assets || [];
    if (assets.length > 0) {
      lines.push(`\n------------------------------------------------------------------`);
      lines.push(`--- PONTOS DE INSERÇÃO DE B-ROLL & ARQUIVOS ---`);
      assets.forEach((ast) => {
        lines.push(`[${ast.type.toUpperCase()}] "${ast.title}" -> ${ast.moment}`);
      });
    }

    return lines.join('\n');
  };

  const [editorText, setEditorText] = useState(getInitialEditorScript());

  const handleSynthesizeWithAi = async () => {
    setLoading(true);
    try {
      const res = await api.aiEditorScript({ episode });
      if (res.editorScript) {
        setEditorText(res.editorScript);
        onUpdateEpisode({ editorScriptSynthesis: res.editorScript });
      }
    } catch (err) {
      console.error('Failed to synthesize editor script:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([editorText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roteiro_edicao_ep_${episode.episodeNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100">Roteiro de Pós-Produção & Edição</h2>
            <p className="text-xs text-zinc-400">
              Entrega profissional para o editor com minutagem de cortes, B-rolls e marcações feitas durante a gravação.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSynthesizeWithAi}
            disabled={loading}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>✨ Sintetizar com IA</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar .TXT</span>
          </button>
        </div>
      </div>

      {/* Live Markers Summary Cards if any recorded */}
      {(episode.recordingMarkers || []).length > 0 && (
        <div className="bg-zinc-900 border border-amber-900/40 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold font-mono text-zinc-200 uppercase">
              Momentos Marcados Durante a Gravação ({(episode.recordingMarkers || []).length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(episode.recordingMarkers || []).map((m) => (
              <div
                key={m.id}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-amber-400 text-[11px]">
                    ⏱ {m.formattedTime}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 uppercase">
                    {m.type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-zinc-200 font-medium line-clamp-1">{m.blockTitle}</p>
                <p className="text-zinc-400 line-clamp-2 text-[11px] italic">"{m.referenceText}"</p>
                {m.comment && <p className="text-[11px] text-amber-300/80">Nota: {m.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Editor Text Console */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            Documento Técnico de Edição
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            Editável manualmente
          </span>
        </div>

        <textarea
          rows={18}
          value={editorText}
          onChange={(e) => {
            setEditorText(e.target.value);
            onUpdateEpisode({ editorScriptSynthesis: e.target.value });
          }}
          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 font-mono text-xs text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed selection:bg-amber-500/20"
        />
      </div>
    </div>
  );
};
