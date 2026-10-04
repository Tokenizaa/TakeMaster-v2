-- Keep SECURITY DEFINER helpers usable by authenticated RLS policies,
-- but do not expose them as anonymous RPC endpoints.
revoke execute on function public.has_program_access(uuid) from anon;
revoke execute on function public.is_org_member(uuid) from anon;
