import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AuthSession,
  CameraConfig,
  Episode,
  Guest,
  LibraryAsset,
  Production,
  ScheduleEvent,
  Show,
  User,
} from './types';
import { api } from './services/api';
import { Sidebar, NavSection } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ShowsView } from './components/ShowsView';
import { EpisodesListView } from './components/EpisodesListView';
import { GuestsView } from './components/GuestsView';
import { StudioSetupView } from './components/StudioSetupView';
import { ScheduleView } from './components/ScheduleView';
import { LibraryView } from './components/LibraryView';
import { BillingView } from './components/BillingView';
import { AdminPanelView } from './components/AdminPanelView';
import { LoginModal } from './components/LoginModal';
import { NewEpisodeModal } from './components/NewEpisodeModal';
import { ExportModal } from './components/ExportModal';
import { AiContextAssistant } from './components/AiContextAssistant';
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
import { Loader2, Lock, ShieldCheck, CreditCard, Users } from 'lucide-react';

export function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [selectedShowId, setSelectedShowId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [activeEpisodeTab, setActiveEpisodeTab] = useState<string>('diagnosis');

  const [isNewEpisodeOpen, setIsNewEpisodeOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [exportEpisode, setExportEpisode] = useState<Episode | null>(null);
  const [studioEpisodeId, setStudioEpisodeId] = useState<string | null>(null);
  const [initialTeleprompterText, setInitialTeleprompterText] = useState<string | undefined>(
    undefined
  );
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  // Rule 5: Honest persistence status ('saved' only after backend SQL confirmation)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadWorkspaceState = async () => {
    setLoading(true);
    try {
      const state = await api.getState();
      setSession(state.session);
      setAvailableUsers(state.availableUsers || []);
      setShows(state.shows);
      setProductions(state.productions || []);
      setEpisodes(state.episodes);
      setGuests(state.guests);
      setScheduleEvents(state.scheduleEvents || []);
      setLibraryAssets(state.libraryAssets || []);
      setSaveStatus('saved');
      setSaveErrorMessage(null);
    } catch (err: any) {
      console.error('Failed to load workspace state:', err);
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao carregar workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceState();
  }, []);

  const handleLoginProfile = async (emailOrUserId: string, loginCode?: string) => {
    setLoading(true);
    setActiveEpisodeId(null);
    setSelectedShowId('ALL');
    try {
      await api.login(emailOrUserId, session?.activeOrganization.id, loginCode);
      await loadWorkspaceState();
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  const handleSwitchOrganization = async (organizationId: string) => {
    try {
      setLoading(true);
      setActiveEpisodeId(null);
      setSelectedShowId('ALL');
      await api.switchOrganization(organizationId);
      await loadWorkspaceState();
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao alternar organização');
      setLoading(false);
    }
  };

  const handleResetWorkspaceSeed = async () => {
    try {
      setSaveStatus('saving');
      const res = await api.resetSeedWorkspace();
      if (res.session) setSession(res.session);
      setShows(res.shows);
      setProductions(res.productions);
      setEpisodes(res.episodes);
      setGuests(res.guests);
      setScheduleEvents(res.scheduleEvents);
      setLibraryAssets(res.libraryAssets);
      setActiveEpisodeId(null);
      setSaveStatus('saved');
      setSaveErrorMessage(null);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Falha ao restaurar seed');
    }
  };

  const filteredEpisodes = useMemo(() => {
    return episodes.filter((ep) => {
      const matchesShow = selectedShowId === 'ALL' || ep.showId === selectedShowId;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesShow;
      const matchesQuery =
        ep.title.toLowerCase().includes(q) ||
        ep.guestName.toLowerCase().includes(q) ||
        ep.idea.toLowerCase().includes(q);
      return matchesShow && matchesQuery;
    });
  }, [episodes, selectedShowId, searchQuery]);

  const activeEpisode = useMemo(
    () => episodes.find((e) => e.id === activeEpisodeId) || null,
    [episodes, activeEpisodeId]
  );

  const studioEpisode = useMemo(
    () => episodes.find((e) => e.id === studioEpisodeId) || null,
    [episodes, studioEpisodeId]
  );

  const handleUpdateEpisode = (partial: Partial<Episode>) => {
    const targetId = partial.id || activeEpisodeId || studioEpisodeId;
    if (!targetId) return;

    const current = episodes.find((e) => e.id === targetId);
    if (!current) return;

    const merged: Episode = {
      ...current,
      ...partial,
      id: current.id,
      updatedAt: new Date().toISOString(),
    };

    setEpisodes((prev) => prev.map((e) => (e.id === targetId ? merged : e)));
    setSaveStatus('saving');
    setSaveErrorMessage(null);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        const persisted = await api.updateEpisode(targetId, merged);
        setEpisodes((prev) => prev.map((e) => (e.id === persisted.id ? persisted : e)));
        if (partial.assets) {
          const refreshedAssets = await api.getLibraryAssets();
          setLibraryAssets(refreshedAssets);
        }
        setSaveStatus('saved');
        setSaveErrorMessage(null);
      } catch (err: any) {
        console.error('Autosave error:', err);
        setSaveStatus('error');
        setSaveErrorMessage(err?.message || 'Falha ao persistir episódio');
      }
    }, 450);
  };

  const handleCreateEpisode = async (payload: Partial<Episode>): Promise<Episode> => {
    setSaveStatus('saving');
    try {
      const created = await api.createEpisode(payload);
      setEpisodes((prev) => [created, ...prev]);
      setActiveEpisodeId(created.id);
      setActiveEpisodeTab('diagnosis');
      setSaveStatus('saved');
      setSaveErrorMessage(null);
      return created;
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao criar episódio');
      throw err;
    }
  };

  const handleDeleteEpisode = async (id: string) => {
    setSaveStatus('saving');
    try {
      await api.deleteEpisode(id);
      setEpisodes((prev) => prev.filter((e) => e.id !== id));
      if (activeEpisodeId === id) {
        setActiveEpisodeId(null);
      }
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao excluir episódio');
    }
  };

  const handleCreateShow = async (payload: Partial<Show>) => {
    setSaveStatus('saving');
    try {
      const created = await api.createShow(payload);
      setShows((prev) => [...prev, created]);
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao criar programa');
    }
  };

  const handleUpdateShow = async (id: string, payload: Partial<Show>) => {
    setSaveStatus('saving');
    try {
      const updated = await api.updateShow(id, payload);
      setShows((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao atualizar programa');
    }
  };

  const handleDeleteShow = async (id: string) => {
    setSaveStatus('saving');
    try {
      await api.deleteShow(id);
      setShows((prev) => prev.filter((s) => s.id !== id));
      if (selectedShowId === id) setSelectedShowId('ALL');
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao remover programa');
    }
  };

  const handleCreateProduction = async (payload: Partial<Production>) => {
    setSaveStatus('saving');
    try {
      const created = await api.createProduction(payload);
      setProductions((prev) => [...prev, created]);
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao criar temporada');
    }
  };

  const handleDeleteProduction = async (id: string) => {
    setSaveStatus('saving');
    try {
      await api.deleteProduction(id);
      setProductions((prev) => prev.filter((p) => p.id !== id));
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao excluir temporada');
    }
  };

  const handleSaveGuest = async (payload: Partial<Guest>) => {
    setSaveStatus('saving');
    try {
      if (payload.id && guests.some((g) => g.id === payload.id)) {
        const updated = await api.updateGuest(payload.id, payload);
        setGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      } else {
        const created = await api.createGuest(payload);
        setGuests((prev) => [created, ...prev]);
      }
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao salvar participante');
    }
  };

  const handleCreateScheduleEvent = async (payload: Partial<ScheduleEvent>) => {
    setSaveStatus('saving');
    try {
      const created = await api.createScheduleEvent(payload);
      setScheduleEvents((prev) => [...prev, created]);
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao agendar sessão');
    }
  };

  const handleUpdateScheduleEvent = async (id: string, payload: Partial<ScheduleEvent>) => {
    setSaveStatus('saving');
    try {
      const updated = await api.updateScheduleEvent(id, payload);
      setScheduleEvents((prev) => prev.map((ev) => (ev.id === id ? updated : ev)));
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao atualizar agenda');
    }
  };

  const handleDeleteScheduleEvent = async (id: string) => {
    setSaveStatus('saving');
    try {
      await api.deleteScheduleEvent(id);
      setScheduleEvents((prev) => prev.filter((ev) => ev.id !== id));
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao remover evento');
    }
  };

  const handleCreateLibraryAsset = async (payload: Partial<LibraryAsset>) => {
    setSaveStatus('saving');
    try {
      const created = await api.createLibraryAsset(payload);
      setLibraryAssets((prev) => [created, ...prev]);
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao catalogar asset');
    }
  };

  const handleUpdateLibraryAsset = async (id: string, payload: Partial<LibraryAsset>) => {
    setSaveStatus('saving');
    try {
      const updated = await api.updateLibraryAsset(id, payload);
      setLibraryAssets((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao atualizar asset');
    }
  };

  const handleDeleteLibraryAsset = async (id: string) => {
    setSaveStatus('saving');
    try {
      await api.deleteLibraryAsset(id);
      setLibraryAssets((prev) => prev.filter((a) => a.id !== id));
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err?.message || 'Erro ao excluir asset');
    }
  };

  const openEpisode = (id: string, tab = 'diagnosis') => {
    setActiveEpisodeId(id);
    setActiveEpisodeTab(tab);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm font-medium text-zinc-400">
          Carregando RSPlay TV SaaS — Autenticação por Programa, Planos & Persistência...
        </p>
      </div>
    );
  }

  const activeStudioShow =
    shows.find((s) => s.id === selectedShowId) || shows[0] || null;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(sec) => {
          setActiveSection(sec);
          setActiveEpisodeId(null);
        }}
        onNewEpisode={() => setIsNewEpisodeOpen(true)}
        episodesCount={episodes.length}
        showsCount={shows.length}
        guestsCount={guests.length}
        scheduleCount={scheduleEvents.length}
        libraryCount={libraryAssets.length}
        organizationName={session?.activeOrganization.name}
        session={session}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          shows={shows}
          selectedShowId={selectedShowId}
          onSelectShow={setSelectedShowId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          saveStatus={saveStatus}
          saveErrorMessage={saveErrorMessage}
          activeEpisodeTitle={activeEpisode?.title}
          onOpenStudioMode={
            activeEpisode ? () => setStudioEpisodeId(activeEpisode.id) : undefined
          }
          session={session}
          onSwitchOrganization={handleSwitchOrganization}
          onResetWorkspaceSeed={handleResetWorkspaceSeed}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onOpenBilling={() => {
            setActiveEpisodeId(null);
            setActiveSection('billing');
          }}
        />

        {/* Contextual SaaS Access Banner (shows active program login isolation & quick access to Admin / Billing / Login Switcher) */}
        {!activeEpisode && session && (
          <div className="bg-zinc-900/60 border-b border-zinc-800/80 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-zinc-300">
              {session.isFullAccessAdmin ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>
                <strong>Perfil Ativo:</strong> {session.user.name} ({session.user.email})
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400">
                {session.isFullAccessAdmin
                  ? `Visão Administrativa Master (${shows.length} programas liberados)`
                  : `Isolamento por Programa Ativo — Visualizando exclusivamente: ${shows
                      .map((s) => s.title)
                      .join(', ')}`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Testar outro Login de Programa</span>
              </button>
              <span className="text-zinc-700">·</span>
              <button
                type="button"
                onClick={() => setActiveSection('billing')}
                className="text-zinc-300 hover:text-zinc-100 font-medium flex items-center gap-1 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Plano Mensal & Gateway</span>
              </button>
              <span className="text-zinc-700">·</span>
              <button
                type="button"
                onClick={() => setActiveSection('admin')}
                className="text-zinc-300 hover:text-zinc-100 font-medium flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Painel Admin & Relatórios</span>
              </button>
            </div>
          </div>
        )}

        {activeEpisode ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <EpisodeHeader
              episode={activeEpisode}
              activeTab={activeEpisodeTab}
              onSelectTab={setActiveEpisodeTab}
              onBack={() => setActiveEpisodeId(null)}
              onUpdateEpisode={handleUpdateEpisode}
              onOpenStudioMode={() => setStudioEpisodeId(activeEpisode.id)}
              onOpenExportModal={() => setExportEpisode(activeEpisode)}
              onToggleAiAssistant={() => setIsAiAssistantOpen((prev) => !prev)}
            />

            <div className="flex-1 overflow-y-auto bg-zinc-950">
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
                  onOpenTeleprompter={(initialText) => {
                    setInitialTeleprompterText(initialText);
                    setStudioEpisodeId(activeEpisode.id);
                  }}
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
              {(activeEpisodeTab === 'prep' || activeEpisodeTab === 'recording') && (
                <RecordingPrepTab
                  episode={activeEpisode}
                  onUpdateEpisode={handleUpdateEpisode}
                  onOpenStudioMode={() => setStudioEpisodeId(activeEpisode.id)}
                />
              )}
              {activeEpisodeTab === 'editor' && (
                <EditorTab episode={activeEpisode} onUpdateEpisode={handleUpdateEpisode} />
              )}
            </div>
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto">
            {activeSection === 'dashboard' && (
              <DashboardView
                shows={shows}
                productions={productions}
                episodes={filteredEpisodes}
                guests={guests}
                scheduleEvents={scheduleEvents}
                libraryAssets={libraryAssets}
                onOpenEpisode={(id) => openEpisode(id)}
                onNewEpisode={() => setIsNewEpisodeOpen(true)}
                onOpenStudioMode={(ep) => setStudioEpisodeId(ep.id)}
                onNavigateSection={setActiveSection}
              />
            )}

            {activeSection === 'shows' && (
              <ShowsView
                shows={shows}
                productions={productions}
                episodes={episodes}
                onCreateShow={handleCreateShow}
                onUpdateShow={handleUpdateShow}
                onDeleteShow={handleDeleteShow}
                onCreateProduction={handleCreateProduction}
                onDeleteProduction={handleDeleteProduction}
                onSelectShowFilter={(id) => {
                  setSelectedShowId(id);
                  setActiveSection('episodes');
                }}
              />
            )}

            {activeSection === 'episodes' && (
              <EpisodesListView
                episodes={filteredEpisodes}
                onSelectEpisode={(ep, tab) => openEpisode(ep.id, tab || 'diagnosis')}
                onNewEpisodeClick={() => setIsNewEpisodeOpen(true)}
                onDeleteEpisode={handleDeleteEpisode}
                onOpenStudioMode={(ep) => setStudioEpisodeId(ep.id)}
              />
            )}

            {activeSection === 'guests' && (
              <GuestsView
                guests={guests}
                onSaveGuest={handleSaveGuest}
                onNewEpisodeWithGuest={() => setIsNewEpisodeOpen(true)}
              />
            )}

            {activeSection === 'schedule' && (
              <ScheduleView
                scheduleEvents={scheduleEvents}
                shows={shows}
                productions={productions}
                episodes={episodes}
                selectedShowId={selectedShowId}
                onCreateEvent={handleCreateScheduleEvent}
                onUpdateEvent={handleUpdateScheduleEvent}
                onDeleteEvent={handleDeleteScheduleEvent}
                onOpenEpisode={(id) => openEpisode(id)}
              />
            )}

            {activeSection === 'library' && (
              <LibraryView
                libraryAssets={libraryAssets}
                shows={shows}
                episodes={episodes}
                selectedShowId={selectedShowId}
                onCreateAsset={handleCreateLibraryAsset}
                onUpdateAsset={handleUpdateLibraryAsset}
                onDeleteAsset={handleDeleteLibraryAsset}
                onOpenEpisode={(id) => openEpisode(id)}
              />
            )}

            {activeSection === 'studio' && (
              <StudioSetupView
                activeShow={activeStudioShow}
                onUpdateShowCameras={async (cameras: CameraConfig[]) => {
                  if (activeStudioShow) {
                    await handleUpdateShow(activeStudioShow.id, { cameras });
                  }
                }}
              />
            )}

            {activeSection === 'billing' && (
              <BillingView
                session={session}
                shows={shows}
                onSubscriptionUpdated={loadWorkspaceState}
              />
            )}

            {activeSection === 'admin' && (
              <AdminPanelView
                session={session}
                onImpersonateUser={async (email, loginCode) => {
                  await handleLoginProfile(email, loginCode);
                  setActiveSection('dashboard');
                }}
                onWorkspaceMutated={loadWorkspaceState}
              />
            )}
          </main>
        )}
      </div>

      {/* Modals & Drawers */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        session={session}
        availableUsers={availableUsers}
        allShows={shows}
        onLogin={handleLoginProfile}
      />

      <NewEpisodeModal
        isOpen={isNewEpisodeOpen}
        onClose={() => setIsNewEpisodeOpen(false)}
        shows={shows}
        productions={productions}
        guests={guests}
        onCreateEpisode={handleCreateEpisode}
      />

      {exportEpisode && (
        <ExportModal
          isOpen={Boolean(exportEpisode)}
          episode={exportEpisode}
          onClose={() => setExportEpisode(null)}
        />
      )}

      {studioEpisode && (
        <StudioModeModal
          isOpen={Boolean(studioEpisode)}
          episode={studioEpisode}
          initialTeleprompterText={initialTeleprompterText}
          onClose={() => {
            setStudioEpisodeId(null);
            setInitialTeleprompterText(undefined);
          }}
          onUpdateEpisode={handleUpdateEpisode}
        />
      )}

      {activeEpisode && (
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

export default App;
