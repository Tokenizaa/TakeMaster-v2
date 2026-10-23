import { describe, it, expect } from 'vitest';
import {
  validateShowPayload,
  validateEpisodePayload,
  validateParticipantPayload,
  AppError,
} from './validation';

describe('validation - validateShowPayload', () => {
  it('aceita payload válido de show', () => {
    const result = validateShowPayload({
      title: 'Meu Programa',
      format: 'Entrevista',
      host: 'Apresentador',
    });
    expect(result.title).toBe('Meu Programa');
    expect(result.format).toBe('Entrevista');
  });
  it('rejeita título com menos de 2 caracteres', () => {
    expect(() => validateShowPayload({ title: 'A' })).toThrow(AppError);
  });
  it('rejeita formato inválido', () => {
    expect(() => validateShowPayload({ title: 'Prog', format: 'Invalido' })).toThrow(AppError);
  });
});

describe('validation - validateEpisodePayload', () => {
  it('aceita payload válido de episódio', () => {
    const result = validateEpisodePayload({
      showId: 'show-1',
      title: 'EP 01',
      host: 'Apresentador',
    });
    expect(result.title).toBe('EP 01');
  });
  it('rejeita sem showId na criação', () => {
    expect(() => validateEpisodePayload({ title: 'EP 01' }, false)).toThrow(AppError);
  });
});

describe('validation - validateParticipantPayload', () => {
  it('aceita payload válido de participante', () => {
    const result = validateParticipantPayload({
      name: 'João Silva',
      role: 'Convidado',
    });
    expect(result.name).toBe('João Silva');
  });
  it('rejeita nome com menos de 2 caracteres', () => {
    expect(() => validateParticipantPayload({ name: 'A' })).toThrow(AppError);
  });
});
