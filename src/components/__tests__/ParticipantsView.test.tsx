import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ParticipantsView } from '../ParticipantsView';
import type { Guest, ParticipantType, GroupType, EntityType } from '../../types';

// Mock participant data
const mockParticipants: Guest[] = [
  {
    id: 'guest-1',
    legacy_id: null,
    program_id: null,
    name: 'John Doe',
    type: 'individual',
    group_type: null,
    role: 'Host',
    company: 'ABC Corp',
    company_or_group: null,
    bio: 'Experienced host',
    contacts: 'john@example.com',
    notes: 'Regular guest',
    links: ['https://johndoe.com'],
    members: [],
    entity_type: 'individual',
    social_handles: { twitter: '@johndoe' },
    previous_episodes: ['ep1', 'ep2'],
    previous_research_summary: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'guest-2',
    legacy_id: null,
    program_id: null,
    name: 'Jane Smith',
    type: 'group',
    group_type: 'band',
    role: 'Musician',
    company: 'XYZ Band',
    company_or_group: null,
    bio: 'Talented musician',
    contacts: 'jane@example.com',
    notes: 'Band member',
    links: [],
    members: ['Member1', 'Member2'],
    entity_type: 'group',
    social_handles: {},
    previous_episodes: [],
    previous_research_summary: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Mock functions
const mockOnGetParticipants = jest.fn().mockResolvedValue(mockParticipants);
const mockOnSaveParticipant = jest.fn().mockImplementation(async (guest) => {
  // Return the guest with an ID if it's new
  return {
    ...guest,
    id: guest.id || `guest-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } as Guest;
});
const mockOnDeleteParticipant = jest.fn().mockResolvedValue(true);

describe('ParticipantsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the participants view header', () => {
    render(
      <ParticipantsView
        participants={mockParticipants}
        onGetParticipants={mockOnGetParticipants}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );

    expect(screen.getByText(/Participantes \/ Convidados/i)).toBeInTheDocument();
    expect(screen.getByText(/Gerencie participantes, suas biografias, contatos e históricos de participação/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Novo Participante/i })).toBeInTheDocument();
  });

  it('should render participants in the list', () => {
    render(
      <ParticipantsView
        participants={mockParticipants}
        onGetParticipants={mockOnGetParticipants}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );

    // Check that both participants are rendered
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    
    // Check participant details
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('Musician')).toBeInTheDocument();
    
    // Check companies
    expect(screen.getByText('ABC Corp')).toBeInTheDocument();
    expect(screen.getByText('XYZ Band')).toBeInTheDocument();
  });

  it('should open add modal when new participant button is clicked', () => {
    render(
      <ParticipantsView
        participants={mockParticipants}
        onGetParticipants={mockOnGetParticipants}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );

    const addButton = screen.getByRole('button', { name: /Novo Participante/i });
    fireEvent.click(addButton);
    
    // Check that modal is open (look for form elements)
    expect(screen.getByLabelText(/Nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cargo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Empresa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Biografia/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contatos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar/i })).toBeInTheDocument();
  });

  it('should validate required fields in add form', async () => {
    render(
      <ParticipantsView
        participants={mockParticipants}
        onGetParticipants={mockOnGetParticipants}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );

    // Open add modal
    const addButton = screen.getByRole('button', { name: /Novo Participante/i });
    fireEvent.click(addButton);
    
    // Try to submit empty form
    const saveButton = screen.getByRole('button', { name: /Salvar/i });
    fireEvent.click(saveButton);
    
    // Check that validation errors appear
    expect(screen.getByText(/Nome é obrigatório/i)).toBeInTheDocument();
    expect(screen.getByText(/Cargo é obrigatório/i)).toBeInTheDocument();
    expect(screen.getByText(/Empresa é obrigatória/i)).toBeInTheDocument();
    expect(screen.getByText(/Biografia é obrigatória/i)).toBeInTheDocument();
    expect(screen.getByText(/Contatos é obrigatório/i)).toBeInTheDocument();
    expect(screen.getByText(/Notas é obrigatória/i)).toBeInTheDocument();
  });

  it('should add a new participant with valid data', async () => {
    render(
      <ParticipantsView
        participants={mockParticipants}
        onGetParticipants={mockOnGetParticipants}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );

    // Open add modal
    const addButton = screen.getByRole('button', { name: /Novo Participante/i });
    fireEvent.click(addButton);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'Alice Johnson' } });
    fireEvent.change(screen.getByLabelText(/Cargo/i), { target: { value: 'Guest' } });
    fireEvent.change(screen.getByLabelText(/Empresa/i), { target: { value: 'DEF Inc' } });
    fireEvent.change(screen.getByLabelText(/Biografia/i), { target: { value: 'Expert in field' } });
    fireEvent.change(screen.getByLabelText(/Contatos/i), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByLabelText(/Notas/i), { target: { value: 'New participant' } });
    
    // Submit the form
    const saveButton = screen.getByRole('button', { name: /Salvar/i });
    fireEvent.click(saveButton);
    
    // Wait for save to complete
    await waitFor(() => {
      expect(mockOnSaveParticipant).toHaveBeenCalled();
    });
    
    // Check success message
    expect(screen.getByText(/Participante salvo com sucesso/i)).toBeInTheDocument();
    
    // Check that form was reset (modal should be closed)
    expect(screen.queryByLabelText(/Nome/i)).not.toHaveValue('Alice Johnson');
  });

  it('should start editing a participant when edit button is clicked', () => {
    render(
      <ParticipantsView
        participants={mockParticipants}
        onGetParticipants={mockOnGetParticipants}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );

    // Find and click edit button for first participant
    const editButton = screen.getAllByRole('button', { name: /Editar/i })[0];
    fireEvent.click(editButton);
    
    // Check that edit form is populated
    expect(screen.getByLabelText(/Nome/i)).toHaveValue('John Doe');
    expect(screen.getByLabelText(/Cargo/i)).toHaveValue('Host');
    expect(screen.getByLabelText(/Empresa/i)).toHaveValue('ABC Corp');
    expect(screen.getByLabelText(/Biografia/i)).toHaveValue('Experienced host');
    expect(screen.getByLabelText(/Contatos/i)).toHaveValue('john@example.com');
    expect(screen.getByLabelText(/Notas/i)).toHaveValue('Regular guest');
  });

  it('should validate required fields in edit form', async () => {
    render(
      <ParticipantsView
        participants={mockParticipants}
        onGetParticipants={mockOnGetParticipants}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );

    // Open edit form for first participant
    const editButton = screen.getAllByRole('button', { name: /Editar/i })[0];
    fireEvent.click(editButton);
    
    // Clear required fields
    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Cargo/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Empresa/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Biografia/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Contatos/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Notas/i), { target: { value: '' } });
    
    // Try to save
    const saveButton = screen.getByRole('button', { name: /Salvar/i });
    fireEvent.click(saveButton);
    
    // Check that validation errors appear
    expect(screen.getByText(/Nome é obrigatório/i)).toBeInTheDocument();
    expect(screen.getByText(/Cargo é obrigatório/i)).toBeInTheDocument();
    expect(screen.getByText(/Empresa é obrigatória/i)).toBeInTheDocument();
    expect(screen.getByText(/Biografia é obrigatória/i)).toBeInTheDocument();
    expect(screen.getByText(/Contatos é obrigatório/i)).toBeInTheDocument();
    expect(screen.getByText(/Notas é obrigatória/i)).toBeInTheDocument();
  });

  it('should update participant with valid data in edit form', async () => {
    render(
      <ParticipantsView
        participants={mockParticipants}
        onGetParticipants={mockOnGetParticipants}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );

    // Open edit form for first participant
    const editButton = screen.getAllByRole('button', { name: /Editar/i })[0];
    fireEvent.click(editButton);
    
    // Update the form
    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'John Doe Updated' } });
    fireEvent.change(screen.getByLabelText(/Cargo/i), { target: { value: 'Senior Host' } });
    
    // Submit the form
    const saveButton = screen.getByRole('button', { name: /Salvar/i });
    fireEvent.click(saveButton);
    
    // Wait for save to complete
    await waitFor(() => {
      expect(mockOnSaveParticipant).toHaveBeenCalled();
    });
    
    // Check success message
    expect(screen.getByText(/Participante atualizado com sucesso/i)).toBeInTheDocument();
    
    // Check that edit form is closed
    expect(screen.queryByLabelText(/Nome/i)).not.toHaveValue('John Doe Updated');
  });

  it('should delete participant when delete button is clicked', async () => {
    render(
      <ParticipantsView
        participants={mockParticipants}
        onGetParticipants={mockOnGetParticipants}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );

    // Click delete button for first participant
    const deleteButton = screen.getAllByRole('button', { name: /Excluir/i })[0];
    fireEvent.click(deleteButton);
    
    // Confirm deletion in alert
    window.confirm = jest.fn().mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /OK/i })); // Assuming OK button in confirm
    
    // Wait for delete to complete
    await waitFor(() => {
      expect(mockOnDeleteParticipant).toHaveBeenCalledWith('guest-1');
    });
  });

  it('should filter participants by search term', async () => {
    render(
      <ParticipantsView
        participants={mockParticipants}
        onGetParticipants={mockOnGetParticipants}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );

    // Type in search
    fireEvent.change(screen.getByPlaceholderText(/Buscar por nome, cargo, empresa ou bio/i), { target: { value: 'John' } });
    
    // Wait for filtering to happen
    await waitFor(() => {
      // Should only show John Doe
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('should filter participants by type', async () => {
    render(
      <ParticipantsView
        participants={mockParticipants}
        onGetParticipants={mockOnGetParticipants}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );

    // Select type filter
    const typeSelect = screen.getByLabelText(/Tipo/i);
    fireEvent.change(typeSelect, { target: { value: 'group' } });
    
    // Wait for filtering to happen
    await waitFor(() => {
      // Should only show Jane Smith (group)
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('should filter participants by group_type', async () => {
    render(
      <ParticipantsView
        participants={mockParticipants}
        onGetParticipants={mockOnGetParticipants}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );

    // Select group type filter
    const groupTypeSelect = screen.getByLabelText(/Tipo Grupo/i);
    fireEvent.change(groupTypeSelect, { target: { value: 'band' } });
    
    // Wait for filtering to happen
    await waitFor(() => {
      // Should only show Jane Smith (band)
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('should filter participants by role', async () => {
    render(
      <ParticipantsView
        participants={mockParticipants}
        onGetParticipants={mockOnGetParticipants}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );

    // Type in role filter
    fireEvent.change(screen.getByLabelText(/Cargo/i), { target: { value: 'Musician' } });
    
    // Wait for filtering to happen
    await waitFor(() => {
      // Should only show Jane Smith
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('should filter participants by company', async () => {
    render(
      <ParticipantsView
        participants={mockParticipants}
        onGetParticipants={mockOnGetParticipants}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );

    // Type in company filter
    fireEvent.change(screen.getByLabelText(/Empresa/i), { target: { value: 'XYZ' } });
    
    // Wait for filtering to happen
    await waitFor(() => {
      // Should only show Jane Smith
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('should toggle expanded details', () => {
    render(
      <ParticipantsView
        participants={mockParticipants}
        onGetParticipants={mockOnGetParticipants}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );

    // Initially no details should be expanded
    expect(screen.queryByText('Experienced host')).not.toBeInTheDocument();
    
    // Click expand button for first participant
    const expandButton = screen.getAllByRole('button', { name: /Ver detalhes/i })[0];
    fireEvent.click(expandButton);
    
    // Now details should be visible
    expect(screen.getByText('Experienced host')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Regular guest')).toBeInTheDocument();
    
    // Click again to collapse
    fireEvent.click(expandButton);
    
    // Details should be hidden again
    expect(screen.queryByText('Experienced host')).not.toBeInTheDocument();
  });

  it('should handle fetch error', () => {
    const mockOnGetParticipantsWithError = jest.fn().mockRejectedValue(new Error('Failed to fetch'));
    
    render(
      <ParticipantsView
        participants=[]
        onGetParticipants={mockOnGetParticipantsWithError}
        onSaveParticipant={mockOnSaveParticipant}
        onDeleteParticipant={mockOnDeleteParticipant}
      />
    );
    
    // Wait for error to appear
    expect(screen.getByText(/Falha ao carregar participantes/i)).toBeInTheDocument();
  });
});