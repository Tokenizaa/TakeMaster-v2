import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EpisodesListView } from '../EpisodesListView';
import type { Episode, EpisodeStatus } from '../../types';

// Mock the format utility functions
jest.mock('../../utils/format', () => ({
  getStatusColorClass: (status: EpisodeStatus) => `status-${status}`,
  getStatusLabel: (status: EpisodeStatus) => status.charAt(0).toUpperCase() + status.slice(1)
}));

const mockEpisodes: Episode[] = [
  {
    id: 'ep-1',
    legacy_id: null,
    program_id: 'prog-123',
    episode_number: 1,
    title: 'Test Episode 1',
    idea: 'Test idea 1 with guest John Doe',
    topic: 'Test topic 1',
    synopsis: 'Test synopsis 1',
    format: 'Entrevista',
    target_duration_min: 45,
    target_duration_minutes: 45,
    presenter_name: 'Test Host',
    host: 'Test Host',
    tone: 'Informative',
    objective: null,
    additional_info: null,
    status: 'draft' as EpisodeStatus,
    diagnosis: {} as any,
    research: {} as any,
    technical_checklist: {} as any,
    editorial_notes_for_post: null,
    editor_script_synthesis: null,
    recording_time_elapsed: null,
    scheduled_date: null,
    production_status: 'planned',
    version: 1,
    season_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    checklist: [],
    outline: [],
    questions: [],
    shorts: [],
    guest_name: 'John Doe',
    guest_id: 'guest-123'
  },
  {
    id: 'ep-2',
    legacy_id: null,
    program_id: 'prog-123',
    episode_number: 2,
    title: 'Test Episode 2',
    idea: 'Test idea 2',
    topic: 'Test topic 2',
    synopsis: 'Test synopsis 2',
    format: 'Programa Solo',
    target_duration_min: 30,
    target_duration_minutes: 30,
    presenter_name: 'Solo Host',
    host: 'Solo Host',
    tone: 'Entertainment',
    objective: null,
    additional_info: null,
    status: 'ready' as EpisodeStatus,
    diagnosis: {} as any,
    research: {} as any,
    technical_checklist: {} as any,
    editorial_notes_for_post: null,
    editor_script_synthesis: null,
    recording_time_elapsed: null,
    scheduled_date: null,
    production_status: 'planned',
    version: 1,
    season_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    checklist: [],
    outline: [],
    questions: [],
    shorts: [],
    guest_name: null,
    guest_id: null
  }
];

const mockOnSelectEpisode = jest.fn();
const mockOnNewEpisodeClick = jest.fn();
const mockOnOpenStudioMode = jest.fn();
const mockOnDeleteEpisode = jest.fn();

describe('EpisodesListView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the episode list header', () => {
    render(
      <EpisodesListView
        episodes={mockEpisodes}
        onSelectEpisode={mockOnSelectEpisode}
        onNewEpisodeClick={mockOnNewEpisodeClick}
        onOpenStudioMode={mockOnOpenStudioMode}
        onDeleteEpisode={mockOnDeleteEpisode}
      />
    );

    expect(screen.getByText(/Episódios da Produção/i)).toBeInTheDocument();
    expect(screen.getByText(/Gerencie o pipeline completo de gravação/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Novo Episódio/i })).toBeInTheDocument();
  });

  it('should render episodes in the list', () => {
    render(
      <EpisodesListView
        episodes={mockEpisodes}
        onSelectEpisode={mockOnSelectEpisode}
        onNewEpisodeClick={mockOnNewEpisodeClick}
        onOpenStudioMode={mockOnOpenStudioMode}
        onDeleteEpisode={mockOnDeleteEpisode}
      />
    );

    // Check that both episodes are rendered
    expect(screen.getByText('Test Episode 1')).toBeInTheDocument();
    expect(screen.getByText('Test Episode 2')).toBeInTheDocument();
    
    // Check episode details
    expect(screen.getByText('EP 001')).toBeInTheDocument();
    expect(screen.getByText('EP 002')).toBeInTheDocument();
    
    // Check formats
    expect(screen.getByText('Entrevista')).toBeInTheDocument();
    expect(screen.getByText('Programa Solo')).toBeInTheDocument();
    
    // Check statuses
    expect(screen.getByText(/Draft/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready/i)).toBeInTheDocument();
  });

  it('should call onSelectEpisode when episode card is clicked', () => {
    render(
      <EpisodesListView
        episodes={mockEpisodes}
        onSelectEpisode={mockOnSelectEpisode}
        onNewEpisodeClick={mockOnNewEpisodeClick}
        onOpenStudioMode={mockOnOpenStudioMode}
        onDeleteEpisode={mockOnDeleteEpisode}
      />
    );

    const episodeCard = screen.getByText('Test Episode 1').closest('div');
    fireEvent.click(episodeCard);
    
    expect(mockOnSelectEpisode).toHaveBeenCalledWith(mockEpisodes[0]);
  });

  it('should call onNewEpisodeClick when new episode button is clicked', () => {
    render(
      <EpisodesListView
        episodes={mockEpisodes}
        onSelectEpisode={mockOnSelectEpisode}
        onNewEpisodeClick={mockOnNewEpisodeClick}
        onOpenStudioMode={mockOnOpenStudioMode}
        onDeleteEpisode={mockOnDeleteEpisode}
      />
    );

    const newEpisodeButton = screen.getByRole('button', { name: /Novo Episódio/i });
    fireEvent.click(newEpisodeButton);
    
    expect(mockOnNewEpisodeClick).toHaveBeenCalled();
  });

  it('should call onOpenStudioMode when studio mode button is clicked', () => {
    render(
      <EpisodesListView
        episodes={mockEpisodes}
        onSelectEpisode={mockOnSelectEpisode}
        onNewEpisodeClick={mockOnNewEpisodeClick}
        onOpenStudioMode={mockOnOpenStudioMode}
        onDeleteEpisode={mockOnDeleteEpisode}
      />
    );

    const studioModeButton = screen.getByRole('button', { name: /Modo Estúdio/i });
    fireEvent.click(studioModeButton);
    
    expect(mockOnOpenStudioMode).toHaveBeenCalledWith(mockEpisodes[0]);
  });

  it('should filter episodes by search term', () => {
    render(
      <EpisodesListView
        episodes={mockEpisodes}
        onSelectEpisode={mockOnSelectEpisode}
        onNewEpisodeClick={mockOnNewEpisodeClick}
        onOpenStudioMode={mockOnOpenStudioMode}
        onDeleteEpisode={mockOnDeleteEpisode}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Buscar por título, convidado ou tema/i);
    fireEvent.change(searchInput, { target: { value: 'John Doe' } });
    
    // Should only show episode with John Doe in guest name or idea
    expect(screen.getByText('Test Episode 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Episode 2')).not.toBeInTheDocument();
  });

  it('should filter episodes by status', () => {
    render(
      <EpisodesListView
        episodes={mockEpisodes}
        onSelectEpisode={mockOnSelectEpisode}
        onNewEpisodeClick={mockOnNewEpisodeClick}
        onOpenStudioMode={mockOnOpenStudioMode}
        onDeleteEpisode={mockOnDeleteEpisode}
      />
    );

    // Click on "Pronto p/ Gravar" button (ready status)
    const readyButton = screen.getByRole('button', { name: /Pronto p\/ Gravar/i });
    fireEvent.click(readyButton);
    
    // Should only show episode with ready status
    expect(screen.getByText('Test Episode 2')).toBeInTheDocument();
    expect(screen.queryByText('Test Episode 1')).not.toBeInTheDocument();
  });

  it('should show empty state when no episodes match filters', () => {
    render(
      <EpisodesListView
        episodes={mockEpisodes}
        onSelectEpisode={mockOnSelectEpisode}
        onNewEpisodeClick={mockOnNewEpisodeClick}
        onOpenStudioMode={mockOnOpenStudioMode}
        onDeleteEpisode={mockOnDeleteEpisode}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Buscar por título, convidado ou tema/i);
    fireEvent.change(searchInput, { target: { value: 'Non-existent term' } });
    
    expect(screen.getByText(/Nenhum episódio encontrado/i)).toBeInTheDocument();
  });

  it('should handle delete episode', async () => {
    mockOnDeleteEpisode.mockResolvedValue(undefined);
    
    render(
      <EpisodesListView
        episodes={mockEpisodes}
        onSelectEpisode={mockOnSelectEpisode}
        onNewEpisodeClick={mockOnNewEpisodeClick}
        onOpenStudioMode={mockOnOpenStudioMode}
        onDeleteEpisode={mockOnDeleteEpisode}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /Excluir episódio/i, hidden: false });
    fireEvent.click(deleteButton);
    
    expect(mockOnDeleteEpisode).toHaveBeenCalledWith('ep-1');
    
    // Wait for any async operations to complete
    await waitFor(() => {
      // In a real test, we might check for success/error states
      expect(mockOnDeleteEpisode).toHaveBeenCalledTimes(1);
    });
  });

  it('should show error when delete episode fails', async () => {
    mockOnDeleteEpisode.mockRejectedValue(new Error('Delete failed'));
    
    render(
      <EpisodesListView
        episodes={mockEpisodes}
        onSelectEpisode={mockOnSelectEpisode}
        onNewEpisodeClick={mockOnNewEpisodeClick}
        onOpenStudioMode={mockOnOpenStudioMode}
        onDeleteEpisode={mockOnDeleteEpisode}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /Excluir episódio/i, hidden: false });
    fireEvent.click(deleteButton);
    
    // Wait for error to appear
    expect(await screen.findByText(/Falha ao excluir episódio/i)).toBeInTheDocument();
  });
});