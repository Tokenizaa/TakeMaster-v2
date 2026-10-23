import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  validatePathParams,
  validateQuery,
  validateBody,
  uuidParam,
  showIdParam,
  organizationIdParam,
  userIdParam,
  episodeIdParam,
  productionIdParam,
  loginBodySchema,
  switchOrgBodySchema,
  subscribeBodySchema,
  aiAssistBodySchema,
} from './validation.zod';
import { AppError } from './validation';

describe('validation.zod', () => {
  describe('uuidParam', () => {
    it('aceita UUID válido', () => {
      const schema = z.object({ id: uuidParam });
      expect(() => validatePathParams({ id: '550e8400-e29b-41d4-a716-446655440000' }, schema)).not.toThrow();
    });
    it('rejeita UUID inválido', () => {
      const schema = z.object({ id: uuidParam });
      expect(() => validatePathParams({ id: 'nao-e-um-uuid' }, schema)).toThrow(AppError);
    });
  });

  describe('validatePathParams', () => {
    it('retorna dados validados', () => {
      const schema = z.object({ id: uuidParam });
      const result = validatePathParams({ id: '550e8400-e29b-41d4-a716-446655440000' }, schema);
      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('validateQuery', () => {
    it('aceita paginação válida', () => {
      const schema = z.object({ page: z.coerce.number().optional(), pageSize: z.coerce.number().optional() });
      const result = validateQuery({ page: '1', pageSize: '20' } as any, schema);
      expect(result).toBeDefined();
    });
  });

  describe('validateBody', () => {
    it('aceita body de login válido', () => {
      const result = validateBody(
        { emailOrUserId: 'test@test.com', loginCode: 'code123' },
        loginBodySchema
      );
      expect(result.emailOrUserId).toBe('test@test.com');
    });
    it('rejeita body de login sem email', () => {
      expect(() => validateBody({ loginCode: 'code123' }, loginBodySchema)).toThrow(AppError);
    });
  });

  describe('switchOrgBodySchema', () => {
    it('aceita organizationId válido', () => {
      const result = validateBody({ organizationId: '550e8400-e29b-41d4-a716-446655440000' }, switchOrgBodySchema);
      expect(result.organizationId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
    it('rejeita organizationId inválido', () => {
      expect(() => validateBody({ organizationId: 'invalido' }, switchOrgBodySchema)).toThrow(AppError);
    });
  });

  describe('subscribeBodySchema', () => {
    it('aceita body de subscribe válido', () => {
      const result = validateBody({ planId: 'plano-1', autoRenew: true }, subscribeBodySchema);
      expect(result.planId).toBe('plano-1');
    });
    it('rejeita sem planId', () => {
      expect(() => validateBody({}, subscribeBodySchema)).toThrow(AppError);
    });
  });

  describe('aiAssistBodySchema', () => {
    it('aceita prompt válido', () => {
      const result = validateBody({ prompt: 'resuma este episódio' }, aiAssistBodySchema);
      expect(result.prompt).toBe('resuma este episódio');
    });
    it('rejeita prompt muito grande', () => {
      const longPrompt = 'a'.repeat(2001);
      expect(() => validateBody({ prompt: longPrompt }, aiAssistBodySchema)).toThrow(AppError);
    });
  });

  describe('showIdParam', () => {
    it('aceita ID não vazio', () => {
      const schema = z.object({ id: showIdParam });
      const result = validatePathParams({ id: 'show-1' }, schema);
      expect(result.id).toBe('show-1');
    });
  });

  describe('organizationIdParam', () => {
    it('aceita UUID de organização', () => {
      const schema = z.object({ id: organizationIdParam });
      const result = validatePathParams({ id: '550e8400-e29b-41d4-a716-446655440000' }, schema);
      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('userIdParam', () => {
    it('aceita UUID de usuário', () => {
      const schema = z.object({ id: userIdParam });
      const result = validatePathParams({ id: '550e8400-e29b-41d4-a716-446655440000' }, schema);
      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('episodeIdParam', () => {
    it('aceita ID de episódio não vazio', () => {
      const schema = z.object({ id: episodeIdParam });
      const result = validatePathParams({ id: 'ep-101' }, schema);
      expect(result.id).toBe('ep-101');
    });
  });

  describe('productionIdParam', () => {
    it('aceita ID de produção não vazio', () => {
      const schema = z.object({ id: productionIdParam });
      const result = validatePathParams({ id: 'prod-1' }, schema);
      expect(result.id).toBe('prod-1');
    });
  });
});
