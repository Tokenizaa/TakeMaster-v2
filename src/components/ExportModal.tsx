import React, { useState } from 'react';
import {
  X,
  Printer,
  Copy,
  Download,
  Check,
  FileText,
  Camera,
  Users,
  Film,
  Scissors
} from 'lucide-react';
import { Episode } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  episode: Episode;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  episode,
}) => {
  const [activeExportType, setActiveExportType] = useState<
    | 'script_full'
    | 'outline'
    | 'host_sheet'
    | 'guest_sheet'
    | 'camera_map'
    | 'editor_script'
    | 'shorts_plan'
  >('script_full');

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const exportTypes = [
    { id: 'script_full', label: 'Roteiro Completo' },
    { id: 'outline', label: 'Pauta dos Blocos' },
    { id: 'host_sheet', label: 'Folha do Apresentador' },
    { id: 'guest_sheet', label: 'Folha do Convidado' },
    { id: 'camera_map', label: 'Mapa de Câmeras' },
    { id: 'editor_script', label: 'Roteiro de Edição' },
    { id: 'shorts_plan', label: 'Plano de Shorts' },
  ];

  const generateContent = () => {
    const divider = '======================================================================\n';
    let text = '';

    switch (activeExportType) {
      case 'script_full':
        text += `TAKEMASTER - ROTEIRO TÉCNICO COMPLETO\n`;
        text += `EPISÓDIO #${episode.episodeNumber}: ${episode.title}\n`;
        text += `CONVIDADO: ${episode.guestName || 'Solo'} | FORMATO: ${episode.format} | META: ${episode.targetDurationMin} MIN\n`;
        text += divider;
        (episode.script || []).forEach((item) => {
          text += `\n[${item.timestamp}] - ${item.camera} (${item.speaker})\n`;
          if (item.eyeDirection) text += `Direção: ${item.eyeDirection}\n`;
          if (item.directionalMarkers?.length) {
            text += `Marcadores: [${item.directionalMarkers.join(' · ')}]\n`;
          }
          text += `Fala: "${item.content}"\n`;
        });
        break;

      case 'outline':
        text += `TAKEMASTER - PAUTA RESUMIDA DE GRAVAÇÃO\n`;
        text += `EPISÓDIO: ${episode.title}\n`;
        text += divider;
        (episode.outline || []).forEach((b) => {
          text += `\nBLOCO ${b.blockNumber}: ${b.title} (${b.estimatedDurationMin} min)\n`;
          text += `Objetivo: ${b.objective}\n`;
          if (b.transitionText) text += `Transição: "${b.transitionText}"\n`;
        });
        break;

      case 'host_sheet':
        text += `TAKEMASTER - FOLHA DE BANCADA DO APRESENTADOR\n`;
        text += `APRESENTADOR: ${episode.host || 'Apresentador'} | CONVIDADO: ${episode.guestName}\n`;
        text += divider;
        (episode.questions || []).forEach((q, idx) => {
          text += `\nPERGUNTA #${idx + 1} (${q.suggestedCamera}):\n`;
          text += `"${q.text}"\n`;
          text += `Objetivo: ${q.objective}\n`;
          if (q.followUps?.length) {
            text += `Repiques Estratégicos:\n`;
            q.followUps.forEach((fu) => {
              text += `  -> [${fu.triggerCondition}] ${fu.actionOrQuestion}\n`;
            });
          }
        });
        break;

      case 'guest_sheet':
        text += `TAKEMASTER - BRIEFING PARA O CONVIDADO\n`;
        text += `OLÁ, ${episode.guestName?.toUpperCase() || 'CONVIDADO'}! BEM-VINDO AO NOSSO ESTÚDIO.\n`;
        text += `PROGRAMA: ${episode.title}\n`;
        text += `DURAÇÃO PREVISTA: ~${episode.targetDurationMin} minutos de gravação.\n`;
        text += divider;
        text += `\nTEMAS QUE IREMOS PERCORRER NA CONVERSA:\n`;
        (episode.outline || []).forEach((b) => {
          text += `• ${b.title}: ${b.objective}\n`;
        });
        text += `\nFIQUE TRANQUILO: Não buscamos respostas perfeitas, mas sim histórias reais e espontâneas!\n`;
        break;

      case 'camera_map':
        text += `TAKEMASTER - MAPA & SETUP TÉCNICO DE CÂMERAS\n`;
        text += divider;
        (episode.cameras || []).forEach((cam) => {
          text += `\n[${cam.name}] - ${cam.label}\n`;
          text += `Enquadramento: ${cam.framing}\n`;
          text += `Função: ${cam.purpose}\n`;
        });
        break;

      case 'editor_script':
        text += episode.editorScriptSynthesis || `ROTEIRO DE EDIÇÃO\nNenhum roteiro sintetizado ainda.`;
        break;

      case 'shorts_plan':
        text += `TAKEMASTER - ESTRATÉGIA DE CORTES DIGITAIS (SHORTS/REELS)\n`;
        text += divider;
        (episode.shorts || []).forEach((sh, idx) => {
          text += `\nSHORT #${idx + 1}: ${sh.title} (${sh.estimatedDuration}) [${sh.status}]\n`;
          text += `GANCHO (0-3s): "${sh.hook}"\n`;
          text += `PERGUNTA GERADORA: "${sh.generatingQuestion}"\n`;
        });
        break;
    }

    return text;
  };

  const currentContent = generateContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeExportType}_ep_${episode.episodeNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Exportação & Impressão da Produção</h2>
            <p className="text-xs text-zinc-400">Gere roteiros, folhas de bancada e mapas para a equipe</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Types Tabs */}
        <div className="px-6 pt-3 flex gap-2 border-b border-zinc-800 overflow-x-auto no-scrollbar">
          {exportTypes.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveExportType(t.id as any)}
              className={`py-2 px-3 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer ${
                activeExportType === t.id
                  ? 'bg-zinc-950 text-amber-400 border-t border-x border-zinc-800'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
          <pre className="font-mono text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed selection:bg-amber-500/20">
            {currentContent}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <span className="text-xs text-zinc-500 font-mono">
            {currentContent.split('\n').length} linhas geradas
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleCopy}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
