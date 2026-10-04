import { AppError } from './errors';
import { getSupabaseAdmin } from './supabase';

export type OrganizationRole = 'owner' | 'admin' | 'member';

export async function assertOrganizationMember(userId: string, organizationId: string): Promise<void> {
  const { data, error } = await getSupabaseAdmin()
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  if (error) throw new AppError('Falha ao verificar acesso à organização', 'AUTHORIZATION_CHECK_FAILED', 500);
  if (!data) throw new AppError('Usuário não pertence à organização', 'FORBIDDEN', 403);
}

export async function assertOrganizationRole(
  userId: string,
  organizationId: string,
  roles: OrganizationRole[],
): Promise<void> {
  const { data, error } = await getSupabaseAdmin()
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  if (error) throw new AppError('Falha ao verificar papel na organização', 'AUTHORIZATION_CHECK_FAILED', 500);
  if (!data || !roles.includes(data.role as OrganizationRole)) {
    throw new AppError('Usuário não possui permissão para esta operação', 'FORBIDDEN', 403);
  }
}

export async function assertProgramAccess(userId: string, programId: string): Promise<void> {
  const { data: program, error: programError } = await getSupabaseAdmin()
    .from('programs')
    .select('id,organization_id,catalog_program_id')
    .or(`id.eq.${programId},legacy_id.eq.${programId}`)
    .maybeSingle();

  if (programError) throw new AppError('Falha ao verificar programa', 'AUTHORIZATION_CHECK_FAILED', 500);
  if (!program) throw new AppError('Programa não encontrado', 'NOT_FOUND', 404);

  if (program.organization_id) {
    try {
      await assertOrganizationMember(userId, program.organization_id);
      return;
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== 'FORBIDDEN') throw error;
    }
  }

  if (!program.catalog_program_id) {
    throw new AppError('Usuário sem acesso ao programa', 'FORBIDDEN', 403);
  }

  const { data: directAccess, error: accessError } = await getSupabaseAdmin()
    .from('program_user_access')
    .select('user_id')
    .eq('user_id', userId)
    .eq('catalog_program_id', program.catalog_program_id)
    .eq('status', 'active')
    .maybeSingle();

  if (accessError) throw new AppError('Falha ao verificar acesso ao programa', 'AUTHORIZATION_CHECK_FAILED', 500);
  if (!directAccess) throw new AppError('Usuário sem acesso ao programa', 'FORBIDDEN', 403);
}

export async function getSingleOrganizationId(userId: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('active', true);

  if (error) throw new AppError('Falha ao localizar organização do usuário', 'AUTHORIZATION_CHECK_FAILED', 500);
  const ids = [...new Set((data ?? []).map(row => row.organization_id))];
  if (ids.length === 0) throw new AppError('Usuário não pertence a nenhuma organização ativa', 'FORBIDDEN', 403);
  if (ids.length > 1) throw new AppError('Contexto de organização é obrigatório para este usuário', 'ORGANIZATION_CONTEXT_REQUIRED', 409);
  return ids[0];
}
