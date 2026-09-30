/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { EpisodesListView } from './components/EpisodesListView';
import { ShowsView } from './components/ShowsView';
import { GuestsView } from './components/GuestsView';
import { StudioSetupView } from './components/StudioSetupView';
import { EpisodeHeader } from './components/EpisodeEditor/EpisodeHeader';
import { DiagnosisTab } from './components/EpisodeEditor/DiagnosisTab';
import { ResearchTab } from './components/EpisodeEditor/ResearchTab';
import { OutlineTab } from './components/EpisodeEditor/OutlineTab';
import { ScriptTab } from './components/EpisodeEditor/ScriptTab';
import { CamerasTab } from './components/EpisodeEditor/CamerasTab';
import { AssetsTab } from './components/EpisodeEditor/AssetsTab';
import { ShortsTab } from './components/EpisodeEditor/ShortsTab';
import { RecordingPrepTab } from './components/EpisodeEditor/RecordingPrepTab';
import { EditorTab } from './components/EpisodeEditor/EditorTab';
import { StudioModeModal } from './components/StudioMode/StudioModeModal';
import { ExportModal } from './components/ExportModal';
import { NewEpisodeModal } from './components/NewEpisodeModal';
import { AiContextAssistant } from './components/AiContextAssistant';
import { Episode, Show, Guest, CameraConfig, ShowFormat } from './types';
import { api } from './services/api';

export default function App() {
  const [shows, setShows] = useState<Show[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Navigation
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [activeShowId, setActiveShowId] = useState<string>('');
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [activeEpisodeTab, setActiveEpisodeTab] = useState<string>('diagnosis');

  // Modals & Panels
  const [isStudioModeOpen, setIsStudioModeOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isNewEpisodeModalOpen, setIsNewEpisodeModalOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [teleprompterInitialText, setTeleprompterInitialText] = useState<string>('');

  // Autosave
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'idle'>('saved');
  const debounceTimerRef = useRef<any>(null);

  // Initial Data Load
  useEffect(() => {
    async function loadData() {
      try {
        const [showsData, episodesData, guestsData] = await Promise.all([
          api.getShows(),
          api.getEpisodes(),
          api.getGuests(),
        ]);
        setShows(showsData);
        setEpisodes(episodesData);
        setGuests(guestsData);
        if (showsData.length > 0) {
          setActiveShowId(showsData[0].id);
        }
        if (episodesData.length > 0) {
          setActiveEpisode(episodesData[0]);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  const activeShow = shows.find((s) => s.id === activeShowId) || shows[0] || null;

  // Persist episode changes with debounce
  const handleUpdateEpisode = useCallback(
    (updatedFields: Partial<Episode>) => {
      if (!activeEpisode) return;

      const updatedEpisode: Episode = {
        ...activeEpisode,
        ...updatedFields,
        updatedAt: new Date().toISOString(),
      };

      setActiveEpisode(updatedEpisode);
      setEpisodes((prev) =>
        prev.map((e) => (e.id === updatedEpisode.id ? updatedEpisode : e))
      );

      setSavingStatus('saving');
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(async () => {
        try {
          await api.updateEpisode(updatedEpisode.id, updatedEpisode);
          setSavingStatus('saved');
        } catch (err) {
          console.error('Failed to autosave episode:', err);
          setSavingStatus('saved');
        }
      }, 800);
    },
    [activeEpisode]
  );

  // Create episode from idea with AI Producer diagnosis
  const handleCreateEpisodeWithAi = async (data: {
    showId: string;
    idea: string;
    guestName: string;
    company?: string;
    format: ShowFormat;
    durationMin: number;
    objective?: string;
    additionalInfo?: string;
  }) => {
    setSavingStatus('saving');

    // 1. Run AI diagnosis immediately
    const diagnosis = await api.aiDiagnose({
      idea: data.idea,
      guestName: data.guestName,
      format: data.format,
      durationMin: data.durationMin,
      objective: data.objective,
      additionalInfo: data.additionalInfo,
    });

    // 2. Build initial empty outline block template
    const initialOutline = [
      {
        id: `blk-${Date.now()}-1`,
        blockNumber: 1,
        title: 'Cold Open & Gancho',
        estimatedDurationMin: Math.max(2, Math.round(data.durationMin * 0.08)),
        objective: 'Capturar atenção e situar o contraste da história.',
        keyThemes: ['Impacto inicial', 'Apresentação'],
        transitionText: 'Antes de falarmos do sucesso atual, quero voltar ao dia em que tudo começou...',
      },
      {
        id: `blk-${Date.now()}-2`,
        blockNumber: 2,
        title: 'Origem & Primeiros Desafios',
        estimatedDurationMin: Math.max(4, Math.round(data.durationMin * 0.22)),
        objective: 'Entender a gênese e o primeiro teste de fogo.',
        keyThemes: ['Início humilde', 'Primeiras barreiras'],
        transitionText: 'Mas a caminhada não demorou para encontrar sua maior tempestade...',
      },
      {
        id: `blk-${Date.now()}-3`,
        blockNumber: 3,
        title: 'A Grande Crise & Conflito Central',
        estimatedDurationMin: Math.max(6, Math.round(data.durationMin * 0.3)),
        objective: 'Mergulhar na vulnerabilidade e no momento em que quase perdeu tudo.',
        keyThemes: ['Pior momento', 'Decisão radical'],
        transitionText: 'Foi preciso tomar uma atitude drástica para renascer...',
      },
      {
        id: `blk-${Date.now()}-4`,
        blockNumber: 4,
        title: 'A Virada Estratégica & Escala',
        estimatedDurationMin: Math.max(4, Math.round(data.durationMin * 0.25)),
        objective: 'Analisar como a transformação ocorreu na prática.',
        keyThemes: ['Mudança de modelo', 'Crescimento'],
        transitionText: 'Com a experiência acumulada, vieram as lições humanas mais profundas.',
      },
      {
        id: `blk-${Date.now()}-5`,
        blockNumber: 5,
        title: 'Ping-Pong & Lição Final',
        estimatedDurationMin: Math.max(3, Math.round(data.durationMin * 0.15)),
        objective: 'Perguntas bate-pronto, mensagem final aos espectadores e encerramento.',
        keyThemes: ['Bate-bola', 'Conselho definitivo'],
        transitionText: 'Agradecimento e mensagem final aos espectadores.',
      },
    ];

    // 3. Construct new full episode object
    const newEpisode: Episode = {
      id: `ep-${Date.now()}`,
      showId: data.showId,
      episodeNumber: episodes.length + 1,
      title: data.guestName ? `${data.guestName}: ${diagnosis.centralTheme}` : diagnosis.centralTheme,
      idea: data.idea,
      guestName: data.guestName,
      host: activeShow?.host || 'Apresentador',
      format: data.format,
      targetDurationMin: data.durationMin,
      objective: data.objective,
      additionalInfo: data.additionalInfo,
      status: 'diagnosis',
      diagnosis,
      research: {
        aboutGuest: data.guestName ? `${data.guestName}, protagonista da história.` : '',
        trajectory: 'Início autônomo, consolidação e desafios superados.',
        company: data.company || '',
        keyDatesAndNumbers: 'Ano de fundação, faturamento e equipe.',
        previousInterviews: '',
        recurringThemes: 'Disciplina, superação de crises e aprendizado prático.',
        contradictionsAndClarifications: '',
        compellingStories: '',
        sources: [
          {
            id: `src-${Date.now()}-1`,
            title: 'Briefing Inicial Informado',
            detail: data.idea,
            status: 'CONFIRMADO',
            category: 'guest',
          },
        ],
      },
      outline: initialOutline,
      questions: [
        {
          id: `q-${Date.now()}-1`,
          blockId: initialOutline[1].id,
          order: 1,
          text: `Você lembra do momento exato em que percebeu que precisava arriscar?`,
          objective: 'Descobrir o ponto de virada inicial.',
          suggestedCamera: 'CAM 2',
          eyeDirection: 'Olhar para convidado',
          followUps: [
            {
              id: `fu-${Date.now()}-1`,
              triggerCondition: 'SE FALAR SOBRE MEDO OU FAMÍLIA',
              actionOrQuestion: 'Quem ao seu redor disse que aquilo era loucura?',
              tag: 'MEDO',
            },
          ],
        },
      ],
      script: [
        {
          id: `sc-${Date.now()}-1`,
          timestamp: '00:00',
          type: 'opening',
          camera: 'CAM 1',
          speaker: activeShow?.host || 'Apresentador',
          eyeDirection: 'Olhar para a lente',
          shotType: 'Plano Médio Frontal',
          content: `Existe uma parte da história de todo empreendedor que você nunca vai encontrar nos manuais. Hoje nós vamos conhecer uma dessas jornadas reais: ${diagnosis.potentialStory}`,
          directionalMarkers: ['OLHAR PARA LENTE', 'TOM FIRME'],
          isTeleprompter: true,
        },
      ],
      cameras: activeShow?.cameras || [
        {
          id: 'cam-1',
          name: 'CAM 1',
          label: 'Frontal Apresentador',
          purpose: 'Abertura e encerramento',
          framing: 'Plano Médio Frontal',
          active: true,
        },
        {
          id: 'cam-2',
          name: 'CAM 2',
          label: '45° Apresentador',
          purpose: 'Perguntas ao entrevistado',
          framing: 'Plano Médio 45°',
          active: true,
        },
        {
          id: 'cam-3',
          name: 'CAM 3',
          label: '45° Convidado',
          purpose: 'Respostas e closes',
          framing: 'Plano Fechado 45°',
          active: true,
        },
      ],
      assets: [],
      shorts: [
        {
          id: `sh-${Date.now()}-1`,
          title: `O maior momento de risco de ${data.guestName || 'protagonista'}`,
          hook: '"O dia em que quase tudo desabou."',
          generatingQuestion: 'Qual foi o pior momento da sua caminhada?',
          estimatedDuration: '45s',
          status: 'Planejado',
        },
      ],
      recordingMarkers: [],
      technicalChecklist: {
        cam1Recording: false,
        cam2Recording: false,
        cam3Recording: false,
        micHost: false,
        micGuest: false,
        audioMonitored: false,
        lighting: false,
        memoryCardsStorage: false,
        batteries: false,
        syncClap: false,
        waterReady: false,
        silentPhones: false,
        customItems: [],
      },
      versions: [
        {
          id: `v-${Date.now()}`,
          versionNumber: 1,
          name: 'Criação Inicial da IA',
          savedAt: new Date().toISOString(),
          description: 'Diagnóstico editorial e esqueleto inicial do episódio.',
          snapshot: {},
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await api.createEpisode(newEpisode);
    setEpisodes((prev) => [saved, ...prev]);
    setActiveEpisode(saved);
    setActiveEpisodeTab('diagnosis');
    setCurrentView('episode-detail');
    setSavingStatus('saved');
  };

  const handleSelectEpisode = (ep: Episode, initialTab: string = 'diagnosis') => {
    setActiveEpisode(ep);
    setActiveEpisodeTab(initialTab);
    setCurrentView('episode-detail');
  };

  const handleOpenStudioModeForEpisode = (ep: Episode) => {
    setActiveEpisode(ep);
    setIsStudioModeOpen(true);
  };

  const handleDeleteEpisode = async (id: string) => {
    await api.deleteEpisode(id);
    setEpisodes((prev) => prev.filter((e) => e.id !== id));
    if (activeEpisode?.id === id) {
      setActiveEpisode(episodes.find((e) => e.id !== id) || null);
      setCurrentView('episodes');
    }
  };

  const handleSaveShow = async (showData: Partial<Show>) => {
    const created = await api.createShow(showData);
    setShows((prev) => [...prev, created]);
    setActiveShowId(created.id);
  };

  const handleDeleteShow = async (id: string) => {
    await api.deleteShow(id);
    setShows((prev) => prev.filter((s) => s.id !== id));
    if (activeShowId === id && shows.length > 1) {
      setActiveShowId(shows.find((s) => s.id !== id)?.id || '');
    }
  };

  const handleSaveGuest = async (guestData: Partial<Guest>) => {
    const created = await api.createGuest(guestData);
    setGuests((prev) => [...prev, created]);
  };

  const handleUpdateShowCameras = async (cameras: CameraConfig[]) => {
    if (!activeShow) return;
    const updated = await api.updateShow(activeShow.id, { cameras });
    setShows((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleOpenTeleprompter = (text?: string) => {
    setTeleprompterInitialText(text || '');
    setIsStudioModeOpen(true);
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-3 text-zinc-400">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        <p className="text-xs font-mono">Iniciando TakeMaster Studio...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        activeEpisode={activeEpisode}
        activeEpisodeTab={activeEpisodeTab}
        onSelectEpisodeTab={setActiveEpisodeTab}
        onOpenStudioMode={() => setIsStudioModeOpen(true)}
        onNewEpisodeClick={() => setIsNewEpisodeModalOpen(true)}
        shows={shows}
        activeShowId={activeShowId}
        onSelectShowId={setActiveShowId}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          currentView={currentView}
          activeEpisode={activeEpisode}
          activeShow={activeShow}
          savingStatus={savingStatus}
          onNewEpisodeClick={() => setIsNewEpisodeModalOpen(true)}
          onNewShowClick={() => setCurrentView('shows')}
          onBackToEpisodes={() => setCurrentView('episodes')}
        />

        {/* View Switcher */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-zinc-950">
          {currentView === 'dashboard' && (
            <DashboardView
              episodes={episodes}
              shows={shows}
              activeShow={activeShow}
              onSelectEpisode={handleSelectEpisode}
              onNewEpisodeClick={() => setIsNewEpisodeModalOpen(true)}
              onNewShowClick={() => setCurrentView('shows')}
              onOpenStudioMode={handleOpenStudioModeForEpisode}
            />
          )}

          {currentView === 'episodes' && (
            <EpisodesListView
              episodes={episodes}
              onSelectEpisode={handleSelectEpisode}
              onNewEpisodeClick={() => setIsNewEpisodeModalOpen(true)}
              onOpenStudioMode={handleOpenStudioModeForEpisode}
              onDeleteEpisode={handleDeleteEpisode}
            />
          )}

          {currentView === 'shows' && (
            <ShowsView
              shows={shows}
              activeShowId={activeShowId}
              onSelectShowId={setActiveShowId}
              onSaveShow={handleSaveShow}
              onDeleteShow={handleDeleteShow}
            />
          )}

          {currentView === 'guests' && (
            <GuestsView
              guests={guests}
              onSaveGuest={handleSaveGuest}
              onNewEpisodeWithGuest={(guest) => {
                setIsNewEpisodeModalOpen(true);
              }}
            />
          )}

          {currentView === 'studio-setup' && (
            <StudioSetupView
              activeShow={activeShow}
              onUpdateShowCameras={handleUpdateShowCameras}
            />
          )}

          {/* Episode Editor & 9 Tabbed Subviews */}
          {currentView === 'episode-detail' && activeEpisode && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <EpisodeHeader
                episode={activeEpisode}
                activeTab={activeEpisodeTab}
                onSelectTab={setActiveEpisodeTab}
                onUpdateEpisode={handleUpdateEpisode}
                onOpenStudioMode={() => setIsStudioModeOpen(true)}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                onToggleAiAssistant={() => setIsAiAssistantOpen(!isAiAssistantOpen)}
                onBack={() => setCurrentView('episodes')}
              />

              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                {activeEpisodeTab === 'diagnosis' && (
                  <DiagnosisTab
                    episode={activeEpisode}
                    onUpdateEpisode={handleUpdateEpisode}
                    onAdvanceToNextTab={() => setActiveEpisodeTab('research')}
                  />
                )}

                {activeEpisodeTab === 'research' && (
                  <ResearchTab
                    episode={activeEpisode}
                    onUpdateEpisode={handleUpdateEpisode}
                    onAdvanceToNextTab={() => setActiveEpisodeTab('outline')}
                  />
                )}

                {activeEpisodeTab === 'outline' && (
                  <OutlineTab
                    episode={activeEpisode}
                    onUpdateEpisode={handleUpdateEpisode}
                    onAdvanceToNextTab={() => setActiveEpisodeTab('script')}
                  />
                )}

                {activeEpisodeTab === 'script' && (
                  <ScriptTab
                    episode={activeEpisode}
                    onUpdateEpisode={handleUpdateEpisode}
                    onAdvanceToNextTab={() => setActiveEpisodeTab('cameras')}
                    onOpenTeleprompter={handleOpenTeleprompter}
                  />
                )}

                {activeEpisodeTab === 'cameras' && (
                  <CamerasTab
                    episode={activeEpisode}
                    onUpdateEpisode={handleUpdateEpisode}
                    onAdvanceToNextTab={() => setActiveEpisodeTab('assets')}
                  />
                )}

                {activeEpisodeTab === 'assets' && (
                  <AssetsTab
                    episode={activeEpisode}
                    onUpdateEpisode={handleUpdateEpisode}
                    onAdvanceToNextTab={() => setActiveEpisodeTab('shorts')}
                  />
                )}

                {activeEpisodeTab === 'shorts' && (
                  <ShortsTab
                    episode={activeEpisode}
                    onUpdateEpisode={handleUpdateEpisode}
                    onAdvanceToNextTab={() => setActiveEpisodeTab('prep')}
                  />
                )}

                {activeEpisodeTab === 'prep' && (
                  <RecordingPrepTab
                    episode={activeEpisode}
                    onUpdateEpisode={handleUpdateEpisode}
                    onOpenStudioMode={() => setIsStudioModeOpen(true)}
                  />
                )}

                {activeEpisodeTab === 'editor' && (
                  <EditorTab
                    episode={activeEpisode}
                    onUpdateEpisode={handleUpdateEpisode}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Full-Screen Studio Recording HUD */}
      {activeEpisode && isStudioModeOpen && (
        <StudioModeModal
          episode={activeEpisode}
          isOpen={isStudioModeOpen}
          onClose={() => setIsStudioModeOpen(false)}
          onUpdateEpisode={handleUpdateEpisode}
          initialTeleprompterText={teleprompterInitialText}
        />
      )}

      {/* Export & Printing Modal */}
      {activeEpisode && isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          episode={activeEpisode}
        />
      )}

      {/* New Episode Creation from Idea Modal */}
      {isNewEpisodeModalOpen && (
        <NewEpisodeModal
          isOpen={isNewEpisodeModalOpen}
          onClose={() => setIsNewEpisodeModalOpen(false)}
          activeShow={activeShow}
          shows={shows}
          onCreateWithAi={handleCreateEpisodeWithAi}
        />
      )}

      {/* AI Contextual Assistant Right Drawer */}
      {activeEpisode && isAiAssistantOpen && (
        <AiContextAssistant
          isOpen={isAiAssistantOpen}
          onClose={() => setIsAiAssistantOpen(false)}
          episode={activeEpisode}
          currentTab={activeEpisodeTab}
          onUpdateEpisode={handleUpdateEpisode}
        />
      )}
    </div>
  );
}
