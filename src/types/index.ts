/**
 * TakeMaster V2 — Types Entry Point
 * 
 * Re-exports Shared Kernel (contracts.ts) + Domain Types
 * 
 * IMPORTANTE: Domínios devem importar seus próprios tipos de src/domain/types/<domain>.ts
 * APENAS tipos do Shared Kernel (contracts.ts) podem ser importados cross-domain.
 */

// ============================================
// SHARED KERNEL (cross-domain allowed)
// ============================================
export * from '../domain/contracts';

// ============================================
// DOMAIN TYPES (domain-internal only)
// ============================================
export * from '../domain/types/episode';
export * from '../domain/types/talent';
export * from '../domain/types/media';
export * from '../domain/types/technical';
export * from '../domain/types/production';
export * from '../domain/types/scheduling';
export * from '../domain/types/billing';
export * from '../domain/types/admin';
export * from '../domain/types/knowledge';
export * from '../domain/types/auth';
export * from '../domain/types/catalog';
export * from '../domain/types/errors';

// ============================================
// AI CONTRACTS (Content Intelligence + Program Knowledge)
// ============================================
export * from '../domain/aiContracts';