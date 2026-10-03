import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NewEpisodeModal } from '../NewEpisodeModal';
import type { Program, ShowFormat } from '../../types';

const mockPrograms: Program[] = [
  {
    id: 'prog-123',
    title: 'Test Show',
    description: 'Test description',
    host: 'Test Host',
    format: 'Entrevista' as ShowFormat,
    defaultDurationMin: 45,
    defaultEpisodeDurationMinutes: 45,
    defaultOpening: 'Opening',
    defaultClosing: 'Closing',
    defaultPresenterName: 'Test Presenter',
    defaultSegments: {},
    standardSegments: {},
    editorialStyle: 'Test Style',
    scenario: 'Test Scenario',
    cameras: [],
    standardStructure: [],
    targetAudience: 'Adults',
    tone: 'Informative',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockOnCreateWithAi = jest.fn();

describe('NewEpisodeModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <NewEpisodeModal
        isOpen={false}
        onClose={() => {}}
        activeShow={null}
        shows={mockPrograms}
        onCreateWithAi={mockOnCreateWithAi}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render the modal when isOpen is true', () => {
    const { container } = render(
      <NewEpisodeModal
        isOpen={true}
        onClose={() => {}}
        activeShow={mockPrograms[0]}
        shows={mockPrograms}
        onCreateWithAi={mockOnCreateWithAi}
      />
    );

    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByText(/Novo Episódio Audiovisual/i)).toBeInTheDocument();
    expect(screen.getByText(/Estruture com IA: da ideia bruta ao estúdio pronto/i)).toBeInTheDocument();
  });

  it('should show error when idea is empty and form is submitted', async () => {
    render(
      <NewEpisodeModal
        isOpen={true}
        onClose={() => {}}
        activeShow={mockPrograms[0]}
        shows={mockPrograms}
        onCreateWithAi={mockOnCreateWithAi}
      />
    );

    const form = screen.getByRole('form');
    fireEvent.submit(form);
    
    expect(screen.getByText(/Por favor, descreva a ideia do episódio./)).toBeInTheDocument();
    expect(mockOnCreateWithAi).not.toHaveBeenCalled();
  });

  it('should call onCreateWithAi with correct data when form is submitted with valid data', async () => {
    render(
      <NewEpisodeModal
        isOpen={true}
        onClose={() => {}}
        activeShow={mockPrograms[0]}
        shows={mockPrograms}
        onCreateWithAi={mockOnCreateWithAi}
      />
    );

    // Fill in the form
    const ideaInput = screen.getByPlaceholderText(/Quero entrevistar um empresário/i);
    fireEvent.change(ideaInput, { target: { value: 'Test episode idea' } });
    
    const guestNameInput = screen.getByPlaceholderText(/Ex: João Silva/i);
    fireEvent.change(guestNameInput, { target: { value: 'Test Guest' } });
    
    const companyInput = screen.getByPlaceholderText(/Ex: Ferramentas Brasil S\/A/i);
    fireEvent.change(companyInput, { target: { value: 'Test Company' } });
    
    const objectiveInput = screen.getByPlaceholderText(/Ex: Revelar como superar crises financeiras extremas com calo nas mãos./i);
    fireEvent.change(objectiveInput, { target: { value: 'Test Objective' } });
    
    const additionalInfoInput = screen.getByPlaceholderText(/Ex: O convidado trouxe uma foto antiga da Kombi/i);
    fireEvent.change(additionalInfoInput, { target: { value: 'Test Additional Info' } });

    // Submit the form
    const form = screen.getByRole('form');
    fireEvent.submit(form);
    
    // Wait for the async operation to complete
    await waitFor(() => {
      expect(mockOnCreateWithAi).toHaveBeenCalledTimes(1);
    });
    
    // Check that the function was called with the correct data
    expect(mockOnCreateWithAi).toHaveBeenCalledWith({
      programId: 'prog-123',
      idea: 'Test episode idea',
      guestName: 'Test Guest',
      company: 'Test Company',
      format: 'Entrevista',
      durationMin: 45,
      objective: 'Test Objective',
      additionalInfo: 'Test Additional Info'
    });
  });

  it('should close the modal when close button is clicked', async () => {
    const onClose = jest.fn();
    
    render(
      <NewEpisodeModal
        isOpen={true}
        onClose={onClose}
        activeShow={mockPrograms[0]}
        shows={mockPrograms}
        onCreateWithAi={mockOnCreateWithAi}
      />
    );

    const closeButton = screen.getByLabelText(/close/i) || screen.getByTitle(/close/i);
    if (!closeButton) {
      // Fallback to finding the X button
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(button => 
        button.getAttribute('aria-label')?.includes('close') || 
        button.textContent.includes('×')
      );
      if (xButton) {
        fireEvent.click(xButton);
      }
    } else {
      fireEvent.click(closeButton);
    }
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});