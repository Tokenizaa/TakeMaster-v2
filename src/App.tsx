/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { EpisodesListView } from './components/EpisodesListView';
import { CatalogView } from './components/CatalogView';
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
import { VersionHistoryTab } from './components/EpisodeEditor/VersionHistoryTab';
import { StudioModeModal } from './components/StudioMode/StudioModeModal';
import { ExportModal } from './components/ExportModal';
import { NewEpisodeModal } from './components/NewEpisodeModal';
import { AiContextAssistant } from './components/AiContextAssistant';
import { Episode, Program, Guest, CameraConfig, ShowFormat } from './types';
import { api } from './services/api';
import { apiFetch } from './lib/apiFetch';

export default function App() {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [programsError, setProgramsError] = useState<string | null>(null);
    const [episodesError, setEpisodesError] = useState<string | null>(null);
    const [guestsError, setGuestsError] = useState<string | null>(null);

   // Navigation
   const [currentView, setCurrentView] = useState<string>('dashboard');
   const [activeProgramId, setActiveProgramId] = useState<string>('');
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
        // Reset errors
        setProgramsError(null);
        setEpisodesError(null);
        setGuestsError(null);
        
        try {
          const [programsData, episodesData, guestsData] = await Promise.all([
            api.getPrograms(),
            api.getEpisodes(),
            api.getGuests(),
          ]);
          setPrograms(programsData);
          setEpisodes(episodesData);
          setGuests(guestsData);
          if (programsData.length > 0) {
            setActiveProgramId(programsData[0].id);
          }
          if (episodesData.length > 0) {
            setActiveEpisode(episodesData[0]);
          }
        } catch (err: any) {
          // Handle individual errors
          if (err.message?.includes('programs')) {
            setProgramsError(err.message || 'Falha ao carregar programas');
          } else if (err.message?.includes('episodes')) {
            setEpisodesError(err.message || 'Falha ao carregar episódios');
          } else if (err.message?.includes('guests')) {
            setGuestsError(err.message || 'Falha ao carregar convidados');
          } else {
            // Generic error
            setProgramsError('Falha ao carregar dados iniciais. Por favor, tente recarregar a página.');
          }
          console.error('Failed to load initial data:', err);
        } finally {
          setLoadingInitial(false);
        }
      }
      loadData();
    }, []);

   const activeProgram = programs.find((p) => p.id === activeProgramId) || programs[0] || null;

    // Persist episode changes with debounce
    const handleUpdateEpisode = useCallback(
      (updatedFields: Partial<Episode>) => {
        if (!activeEpisode) return;

        // updated_at (snake_case) — episodes usa o schema do banco, não camelCase
        const updatedEpisode: Episode = {
          ...activeEpisode,
          ...updatedFields,
          updated_at: new Date().toISOString(),
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
          } catch (err: any) {
            console.error('Failed to autosave episode:', err);
            setSavingStatus('saved');
            // In a real app, we might want to show a notification to the user
            // that the autosave failed, but we don't want to be too intrusive
          }
        }, 800);
      },
      [activeEpisode]
    );

    // Create episode from idea with AI Producer diagnosis
     const handleCreateEpisodeWithAi = async (data: {
       programId: string;
       idea: string;
       company?: string;
       format: ShowFormat;
       durationMin: number;
       objective?: string;
       additionalInfo?: string;
     }) => {
      setSavingStatus('saving');

      try {
        // 1. Run AI diagnosis immediately
        const diagnosis = await api.aiDiagnose({
          idea: data.idea,
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
// snake_case + crypto.randomUUID: a API espera os nomes do schema,
            // e episodes.id é uuid (não aceita `ep-<timestamp>`).
            const newEpisode: Episode = {
              id: crypto.randomUUID(),
              program_id: data.programId,
              episode_number: episodes.length + 1,
              title: diagnosis.centralTheme,
              idea: data.idea,

              host: activeProgram?.host || 'Apresentador',
              format: data.format,
              target_duration_min: data.durationMin,
              target_duration_minutes: data.durationMin,
              presenter_name: activeProgram?.host || 'Apresentador',
              tone: 'Profissional e direto',
              topic: diagnosis.centralTheme,
              synopsis: diagnosis.potentialStory,
              topic_note: undefined,
              objective: data.objective,
              additional_info: data.additionalInfo,
              status: 'diagnosis',
              diagnosis,
              guest_name: data.guest_name,
              guest_id: data.guest_id,
            research: {
              aboutGuest: '',
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
created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            production_status: 'draft',
            version: 1,
            legacy_id: null,
            season_id: null,
            scheduled_date: null,
            technical_checklist: {
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
          };

         const saved = await api.createEpisode(newEpisode);
         setEpisodes((prev) => [saved, ...prev]);
         setActiveEpisode(saved);
         setActiveEpisodeTab('diagnosis');
         setCurrentView('episode-detail');
         setSavingStatus('saved');
       } catch (err: any) {
         setSavingStatus('saved');
         // Error will be handled by the NewEpisodeModal component
         throw err;
       }
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
     try {
       await api.deleteEpisode(id);
       setEpisodes((prev) => prev.filter((e) => e.id !== id));
       if (activeEpisode?.id === id) {
         setActiveEpisode(episodes.find((e) => e.id !== id) || null);
         setCurrentView('episodes');
       }
     } catch (err: any) {
       // Error will be handled by the EpisodesListView component
       throw err;
     }
   };

     const handleSaveProgram = async (programData: Partial<Program>) => {
       try {
         if (programData.id) {
           // Update existing program
           const updated = await api.updateProgram(programData.id, programData);
           setPrograms((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
           // Keep the active program the same if it was being edited
           setActiveProgramId(updated.id);
         } else {
           // Create new program
           const created = await api.createProgram(programData);
           setPrograms((prev) => [...prev, created]);
           setActiveProgramId(created.id);
         }
       } catch (err: any) {
         // Error will be handled by the ProgramsView component
         throw err;
       }
     };

    const handleDeleteProgram = async (id: string) => {
      try {
        await api.deleteProgram(id);
        setPrograms((prev) => prev.filter((p) => p.id !== id));
        if (activeProgramId === id && programs.length > 1) {
          setActiveProgramId(programs.find((p) => p.id !== id)?.id || '');
        }
      } catch (err: any) {
        // Error will be handled by the ProgramsView component
        throw err;
      }
    };

    const handleSaveGuest = async (guestData: Partial<Guest>) => {
      try {
        const created = await api.createGuest(guestData);
        setGuests((prev) => [...prev, created]);
      } catch (err: any) {
        // Error will be handled by the GuestsView component
        throw err;
      }
    };

    const handleSaveParticipant = async (participantData: Partial<Guest>) => {
      try {
        if (participantData.id) {
          // Update existing participant
          const updated = await api.updateGuest(participantData.id, participantData);
          setGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        } else {
          // Create new participant
          const created = await api.createGuest(participantData);
          setGuests((prev) => [...prev, created]);
        }
      } catch (err: any) {
        // Error will be handled by the ParticipantsView component
        throw err;
      }
    };

    const handleDeleteParticipant = async (id: string) => {
      try {
        const res = await apiFetch(`/api/guests/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Falha ao excluir participante');
        setGuests((prev) => prev.filter((g) => g.id !== id));
      } catch (err: any) {

        // Error will be handled by the ParticipantsView component
        throw err;
      }
    };
   const handleUpdateProgramCameras = async (cameras: CameraConfig[]) => {
     if (!activeProgram) return;
     try {
       const updated = await api.updateProgram(activeProgram.id, { cameras });
       setPrograms((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
     } catch (err: any) {
       // In a real app, we might want to show a notification to the user
       // that the update failed, but we don't want to be too intrusive
       console.error('Failed to update program cameras:', err);
     }
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
           programs={programs}
           activeProgramId={activeProgramId}
           onSelectProgramId={setActiveProgramId}
         />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
         <Header
           currentView={currentView}
           activeEpisode={activeEpisode}
           activeShow={activeProgram}
           savingStatus={savingStatus}
           onNewEpisodeClick={() => setIsNewEpisodeModalOpen(true)}
           onNewShowClick={() => setCurrentView('programs')}
           onBackToEpisodes={() => setCurrentView('episodes')}
         />

        {/* View Switcher */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-zinc-950">
           {currentView === 'dashboard' && (
             <DashboardView
               episodes={episodes}
               programs={programs}
               activeShow={activeProgram}
               onSelectEpisode={handleSelectEpisode}
               onNewEpisodeClick={() => setIsNewEpisodeModalOpen(true)}
               onNewShowClick={() => setCurrentView('programs')}
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

            {currentView === 'programs' && (
              <ProgramsView
                programs={programs}
                activeProgramId={activeProgramId}
                onSelectProgramId={setActiveProgramId}
                onSaveProgram={handleSaveProgram}
                onDeleteProgram={handleDeleteProgram}
                fetchError={programsError}
              />
            )}
          {currentView === 'catalog' && (
            <CatalogView />
          )}

          {currentView === 'guests' && (
            <ParticipantsView
              guests={guests}
              onGetParticipants={api.getGuests}
              onSaveParticipant={handleSaveParticipant}
              onDeleteParticipant={handleDeleteParticipant}
              fetchError={guestsError}
            />
          )}
          {currentView === 'studio-setup' && (
             <StudioSetupView
               activeShow={activeProgram}
               onUpdateShowCameras={handleUpdateProgramCameras}
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

                {activeEpisodeTab === 'history' && (
                  <VersionHistoryTab
                    episode={activeEpisode}
                    onUpdateEpisode={handleUpdateEpisode}
                    onAdvanceToNextTab={() => setActiveEpisodeTab('diagnosis')}
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
          onOpenTeleprompter={handleOpenTeleprompter}
        />
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          episode={activeEpisode}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* AI Context Assistant */}
      {isAiAssistantOpen && (
        <AiContextAssistant
          isOpen={isAiAssistantOpen}
          onClose={() => setIsAiAssistantOpen(false)}
          episode={activeEpisode}
          currentTab={activeEpisodeTab}
          onUpdateEpisode={handleUpdateEpisode}
        />
      )}

      {/* New Episode Modal */}
      {isNewEpisodeModalOpen && (
        <NewEpisodeModal
          isOpen={isNewEpisodeModalOpen}
          onClose={() => setIsNewEpisodeModalOpen(false)}
          activeShow={activeProgram}
          shows={programs}
          onCreateWithAi={handleCreateWithAi}
        />
      )}

      {programsError && (
        <ErrorMessage message={programsError} onDismiss={() => setProgramsError(null)} />
      )}

      {episodesError && (
        <ErrorMessage message={episodesError} onDismiss={() => setEpisodesError(null)} />
      )}
    </div>
  );
}

