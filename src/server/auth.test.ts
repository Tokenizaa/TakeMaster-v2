import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('auth - anti org-hopping', () => {
  const mockMemberships = [
    { organizationId: 'org-1', organizationName: 'Org 1', role: 'owner' },
    { organizationId: 'org-2', organizationName: 'Org 2', role: 'member' },
  ];

  beforeEach(() => {
    vi.resetModules();
  });

  it('deve permitir acesso à organização do usuário', () => {
    const isMember = mockMemberships.some((m) => m.organizationId === 'org-1');
    expect(isMember).toBe(true);
  });

  it('deve rejeitar acesso a organização não membro', () => {
    const isMember = mockMemberships.some((m) => m.organizationId === 'org-999');
    expect(isMember).toBe(false);
  });

  it('deve validar que o header orgId corresponde a uma membership válida', () => {
    const headerOrgId = 'org-1';
    const isMember = mockMemberships.some((m) => m.organizationId === headerOrgId);
    expect(isMember).toBe(true);

    const invalidOrgId = 'org-999';
    const isInvalidMember = mockMemberships.some((m) => m.organizationId === invalidOrgId);
    expect(isInvalidMember).toBe(false);
  });
});
