import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Check,
  ChevronRight,
  ChevronLeft,
  Flame,
  Scissors,
  StickyNote,
  Clock,
  Camera,
  Eye,
  Maximize2,
  Volume2,
  AlertCircle,
  Plus,
  SkipForward,
  FastForward
} from 'lucide-react';
import { Episode, ScriptItem, RecordingMarker, OutlineBlock, FollowUpItem } from '../../types';
import { formatSecondsToTime, getCameraColor } from '../../utils/format';

interface StudioModeModalProps {
  episode: Episode;
  isOpen: boolean;
  onClose: () => void;
  onUpdateEpisode: (updated: Partial<Episode>) => void;
  initialTeleprompterText?: string;
}

export const StudioModeModal: React.FC<StudioModeModalProps> = ({
  episode,
  isOpen,
  onClose,
  onUpdateEpisode,
  initialTeleprompterText,
}) => {
  const script = episode.script || [];
  const outline = episode.outline || [];
  const segments = episode.segments || [];
  const questions = (episode.questions && episode.questions.length > 0)
    ? episode.questions
    : segments.flatMap(s => s.questions || []);

  // Target duration fallback
  const targetDurationMin = episode.targetDurationMinutes || episode.targetDurationMin || 60;
  const episodeNumber = episode.episodeNumber || 1;

  // Studio Timers
  const [totalSecondsElapsed, setTotalSecondsElapsed] = useState(episode.recordingTimeElapsed || 0);
  const [blockSecondsElapsed, setBlockSecondsElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Active Script Item Pointer
  const [currentIndex, setCurrentIndex] = useState(0);

  // Markers logged in this session
  const [markers, setMarkers] = useState<RecordingMarker[]>(episode.recordingMarkers || []);
  const [lastMarkerAlert, setLastMarkerAlert] = useState<string | null>(null);

  // Quick note modal
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');

  // Teleprompter state
  const [showTeleprompter, setShowTeleprompter] = useState(!!initialTeleprompterText);
  const [teleprompterText, setTeleprompterText] = useState(initialTeleprompterText || '');
  const [teleprompterSpeed, setTeleprompterSpeed] = useState(2);
  const [teleprompterFontSize, setTeleprompterFontSize] = useState(38);
  const [isTeleprompterScrolling, setIsTeleprompterScrolling] = useState(false);
  const teleprompterRef = useRef<HTMLDivElement>(null);

  // Interval for Recording Timers
  useEffect(() => {
    let interval: any = null;
    if (isOpen && isTimerRunning) {
      interval = setInterval(() => {
        setTotalSecondsElapsed((prev) => prev + 1);
        setBlockSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, isTimerRunning]);

  // Teleprompter auto-scroll effect
  useEffect(() => {
    let scrollInterval: any = null;
    if (isOpen && showTeleprompter && isTeleprompterScrolling && teleprompterRef.current) {
      scrollInterval = setInterval(() => {
        if (teleprompterRef.current) {
          teleprompterRef.current.scrollTop += teleprompterSpeed;
        }
      }, 50);
    }
    return () => clearInterval(scrollInterval);
  }, [isOpen, showTeleprompter, isTeleprompterScrolling, teleprompterSpeed]);

  if (!isOpen) return null;

  const currentItem: ScriptItem | undefined = script[currentIndex] || script[0];
  const nextItem: ScriptItem | undefined = script[currentIndex + 1];

  const currentItemText = currentItem?.teleprompterText || (currentItem as any)?.content || '';
  const currentItemCamera = currentItem?.cameraInstruction || (currentItem as any)?.camera || 'CAM 1';

  // Find corresponding outline block or segment
  const currentBlock: OutlineBlock | undefined = outline.find(
    (b) => b.id === (currentItem as any)?.blockId
  ) || (segments[0] ? {
    id: segments[0].id,
    blockNumber: 1,
    title: segments[0].title,
    objective: segments[0].objective || '',
    estimatedDurationMin: segments[0].estimatedDurationMinutes || 5,
    suggestedCameraId: segments[0].primaryCamera || 'CAM 1',
  } as any : outline[0]);

  const blockTargetSeconds = (currentBlock?.estimatedDurationMin || 5) * 60;
  const isBlockTimeExceeded = blockSecondsElapsed > blockTargetSeconds;
  const isBlockTimeWarning =
    blockSecondsElapsed > blockTargetSeconds - 120 && !isBlockTimeExceeded;

  // Find linked question and followups
  const currentQuestion = questions.find(
    (q) => q.id === (currentItem as any)?.questionRefId || (currentItemText && currentItemText.includes(q.text.slice(0, 15)))
  );
  const currentFollowups: FollowUpItem[] = currentQuestion?.followUps || [];

  // Log recording marker
  const addMarker = (type: RecordingMarker['type'], comment?: string) => {
    const formatted = formatSecondsToTime(totalSecondsElapsed);
    const newMarker: RecordingMarker = {
      id: `mk-${Date.now()}`,
      timestampSec: totalSecondsElapsed,
      formattedTime: formatted,
      type,
      blockTitle: currentBlock?.title || 'Gravação',
      referenceText: currentItemText.slice(0, 60),
      comment,
    };

    const updated = [newMarker, ...markers];
    setMarkers(updated);
    onUpdateEpisode({ recordingMarkers: updated, recordingTimeElapsed: totalSecondsElapsed });

    const alertMsg =
      type === 'momento_forte'
        ? `🔥 Momento forte marcado às ${formatted}!`
        : type === 'corte'
        ? `✂ Corte marcado às ${formatted}!`
        : `📝 Nota registrada às ${formatted}!`;
    setLastMarkerAlert(alertMsg);
    setTimeout(() => setLastMarkerAlert(null), 3000);
  };

  const handleNext = () => {
    if (currentIndex < script.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleExtendBlock = () => {
    setBlockSecondsElapsed((prev) => Math.max(0, prev - 120)); // gives 2 more minutes
    addMarker('estender', '+2 minutos adicionados ao bloco');
  };

  const handleEndBlock = () => {
    setBlockSecondsElapsed(0);
    // Find next item in a different block
    const nextBlockItemIndex = script.findIndex(
      (item, idx) => idx > currentIndex && item.blockId !== currentItem?.blockId
    );
    if (nextBlockItemIndex !== -1) {
      setCurrentIndex(nextBlockItemIndex);
    } else {
      handleNext();
    }
  };

  const openInTeleprompter = (text: string) => {
    setTeleprompterText(text);
    setShowTeleprompter(true);
    setIsTeleprompterScrolling(true);
  };

  const handleCloseStudio = () => {
    onUpdateEpisode({
      recordingTimeElapsed: totalSecondsElapsed,
      status: totalSecondsElapsed > 60 ? 'recorded' : episode.status,
    });
    onClose();
  };

  const currentCamStyle = currentItemCamera
    ? getCameraColor(currentItemCamera)
    : { bg: 'bg-zinc-800', text: 'text-zinc-200', border: 'border-zinc-700', badge: 'bg-zinc-700 text-white' };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden text-zinc-100 font-sans">
      {/* Top Studio HUD Bar */}
      <div className="h-16 px-6 bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
        {/* Left: Program / Episode title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-tally" />
            <span className="font-mono text-xs font-bold text-red-500 uppercase tracking-widest">
              REC ESTÚDIO
            </span>
          </div>
          <span className="text-zinc-700">|</span>
          <span className="text-xs font-mono font-bold text-zinc-300">
            EP {String(episodeNumber).padStart(3, '0')}
          </span>
          <span className="text-xs text-zinc-400 font-medium truncate max-w-xs sm:max-w-md">
            {episode.title}
          </span>
        </div>

        {/* Center: Timers (Total & Block) */}
        <div className="flex items-center gap-6">
          {/* Total show timer */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Tempo Total</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">
                {formatSecondsToTime(totalSecondsElapsed)}
              </span>
              <span className="text-xs text-zinc-600">/</span>
              <span className="text-xs text-zinc-500">
                {targetDurationMin}:00
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-800" />

          {/* Block timer */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Tempo do Bloco</span>
              {isBlockTimeExceeded ? (
                <span className="text-[9px] font-mono font-bold text-red-400 bg-red-950/80 px-1 rounded animate-pulse">
                  ESTOURADO
                </span>
              ) : isBlockTimeWarning ? (
                <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/80 px-1 rounded">
                  2 MIN RESTANTES
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span
                className={`text-xl sm:text-2xl font-black tracking-tight ${
                  isBlockTimeExceeded
                    ? 'text-red-500'
                    : isBlockTimeWarning
                    ? 'text-amber-400'
                    : 'text-zinc-200'
                }`}
              >
                {formatSecondsToTime(blockSecondsElapsed)}
              </span>
              <span className="text-xs text-zinc-600">/</span>
              <span className="text-xs text-zinc-500">
                {currentBlock ? `${currentBlock.estimatedDurationMin}:00` : '05:00'}
              </span>
            </div>
          </div>

          {/* Pause / Resume Timer Button */}
          <button
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
            title={isTimerRunning ? 'Pausar cronômetro' : 'Continuar cronômetro'}
          >
            {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

        {/* Right: Exit Studio */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCloseStudio}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Encerrar / Sair</span>
          </button>
        </div>
      </div>

      {/* Temporary Alert Toast for Live Marker */}
      {lastMarkerAlert && (
        <div className="bg-amber-500 text-zinc-950 px-4 py-2 font-mono font-bold text-xs text-center animate-in slide-in-from-top duration-200">
          {lastMarkerAlert}
        </div>
      )}

      {/* Main Studio Proptron Display */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col justify-between max-w-5xl mx-auto w-full space-y-6">
        {/* Block Header Banner */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 rounded">
              BLOCO {String(currentBlock?.blockNumber || 1).padStart(2, '0')}
            </span>
            <h2 className="text-lg md:text-xl font-extrabold text-zinc-100 uppercase tracking-tight">
              {currentBlock?.title || 'Abertura'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExtendBlock}
              className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono text-xs rounded transition-colors cursor-pointer"
              title="Adiciona 2 minutos ao tempo do bloco"
            >
              ⏱ +2 Minutos
            </button>
            <button
              onClick={handleEndBlock}
              className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono text-xs rounded transition-colors cursor-pointer"
              title="Avança diretamente para o próximo bloco"
            >
              ⏩ Próximo Bloco
            </button>
          </div>
        </div>

        {/* Center Live Proptron Card */}
        <div className="space-y-4">
          {/* Active Camera Indicator with High Contrast Glow */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`px-4 py-2 rounded-xl font-mono font-extrabold text-lg tracking-wider flex items-center gap-2 shadow-lg ${currentCamStyle.badge}`}
              >
                <Camera className="w-5 h-5" />
                <span>{currentItemCamera}</span>
              </div>

              {currentItem?.eyeDirection && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono font-semibold text-zinc-300">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>{currentItem.eyeDirection}</span>
                </div>
              )}
            </div>

            {/* Teleprompter button if applicable */}
            {currentItemText && (
              <button
                onClick={() => openInTeleprompter(currentItemText)}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Abrir no Teleprompter</span>
              </button>
            )}
          </div>

          {/* Active Big Typography Question / Content */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 md:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="font-bold text-amber-400 uppercase tracking-wider">
                {currentItem?.speaker || 'Apresentador'}
                {currentItem?.targetPerson ? ` → ${currentItem.targetPerson}` : ''}
              </span>
              <span>
                Item {currentIndex + 1} de {script.length}
              </span>
            </div>

            <p className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-zinc-100 leading-tight tracking-tight selection:bg-amber-500/30">
              {currentItemText || 'Carregando roteiro...'}
            </p>

            {/* Directional markers */}
            {currentItem?.directionalMarkers && currentItem.directionalMarkers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {currentItem.directionalMarkers.map((m, i) => (
                  <span
                    key={i}
                    className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700 text-amber-300 tracking-wider"
                  >
                    [{m}]
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Next Camera & Content Preview */}
          {nextItem && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-950/70 border border-zinc-850 rounded-xl text-xs text-zinc-400 font-mono">
              <span className="text-zinc-500 uppercase font-bold">Próximo:</span>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-bold">
                {nextItem.cameraInstruction || (nextItem as any).camera || 'CAM 2'}
              </span>
              <span className="truncate text-zinc-300 font-sans">
                {nextItem.speaker}: "{(nextItem.teleprompterText || (nextItem as any).content || '').slice(0, 80)}..."
              </span>
            </div>
          )}

          {/* Intelligent Follow-ups (Repiques) in Studio */}
          {currentFollowups.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase text-indigo-400 font-bold">
                  Repiques Disponíveis (Se Convidado Responder):
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {currentFollowups.map((fu) => (
                  <div
                    key={fu.id}
                    className="p-3 bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-xl space-y-1 transition-colors"
                  >
                    <span className="inline-block text-[10px] font-mono font-bold text-amber-400 bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-800/60 uppercase">
                      {fu.triggerCondition}
                    </span>
                    <p className="text-sm font-bold text-zinc-200">{fu.actionOrQuestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Studio Action Control Bar (Section 24) */}
        <div className="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex >= script.length - 1}
              className="px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-white/10 disabled:opacity-30 cursor-pointer"
            >
              <span>Próximo</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>

            <button
              onClick={handleNext}
              className="px-3 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-mono text-xs rounded-xl transition-colors cursor-pointer"
              title="Pular este item"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Marker Buttons: Momento Forte, Marcar Corte, Nota */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => addMarker('momento_forte')}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-950/40 transition-transform active:scale-95 cursor-pointer"
            >
              <Flame className="w-4 h-4 fill-zinc-950" />
              <span>🔥 Momento Forte</span>
            </button>

            <button
              onClick={() => addMarker('corte')}
              className="px-3.5 py-2.5 bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-700/60 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Scissors className="w-4 h-4" />
              <span>✂ Marcar Corte</span>
            </button>

            <button
              onClick={() => setShowNoteModal(true)}
              className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <StickyNote className="w-4 h-4" />
              <span>Nota</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100">Adicionar Nota de Gravação</h3>
            <textarea
              rows={3}
              autoFocus
              value={quickNoteText}
              onChange={(e) => setQuickNoteText(e.target.value)}
              placeholder="Ex: Refazer pergunta com câmera mais fechada ou checar ruído..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (quickNoteText.trim()) {
                    addMarker('nota', quickNoteText.trim());
                    setQuickNoteText('');
                  }
                  setShowNoteModal(false);
                }}
                className="px-4 py-1.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-lg"
              >
                Salvar Nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Teleprompter Overlay (Section 26) */}
      {showTeleprompter && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Teleprompter Top Controller */}
          <div className="h-14 px-6 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-4">
              <span className="font-bold text-amber-400 uppercase tracking-widest">
                TELEPROMPTER ESTÚDIO
              </span>
              <button
                onClick={() => setIsTeleprompterScrolling(!isTeleprompterScrolling)}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded flex items-center gap-1.5 cursor-pointer"
              >
                {isTeleprompterScrolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isTeleprompterScrolling ? 'Pausar' : 'Rolar'}</span>
              </button>
            </div>

            {/* Controls: Speed & Font Size */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Velocidade:</span>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={teleprompterSpeed}
                  onChange={(e) => setTeleprompterSpeed(Number(e.target.value))}
                  className="w-24 accent-amber-500 cursor-pointer"
                />
                <span className="text-zinc-200 font-bold">{teleprompterSpeed}x</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Tamanho:</span>
                <input
                  type="range"
                  min={24}
                  max={64}
                  value={teleprompterFontSize}
                  onChange={(e) => setTeleprompterFontSize(Number(e.target.value))}
                  className="w-24 accent-amber-500 cursor-pointer"
                />
                <span className="text-zinc-200 font-bold">{teleprompterFontSize}px</span>
              </div>

              <button
                onClick={() => setShowTeleprompter(false)}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded flex items-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Fechar Prompter</span>
              </button>
            </div>
          </div>

          {/* Scrolling Content Area */}
          <div
            ref={teleprompterRef}
            className="flex-1 overflow-y-auto px-8 md:px-24 py-20 text-center leading-relaxed font-sans max-w-4xl mx-auto w-full no-scrollbar select-none"
            style={{ fontSize: `${teleprompterFontSize}px` }}
          >
            <div className="text-zinc-100 font-bold space-y-8">
              {teleprompterText.split('\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
