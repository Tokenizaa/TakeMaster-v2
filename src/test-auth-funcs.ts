import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cvyoumtywnyayceoezru.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXJhYmFzZSIsInJlZiI6ImN2eW91bXR5d255YXljZW9lenJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NTYxNDcsImV4cCI6MjEwNjEzMjE0N30.4IL7rqzj3Vi1JpyHaOOTaaaVYeS33EGl7tsltGO0a10';

const TEST_DATA = {
  testOrgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
};

async function testAuthFunctions() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Sign in as host (owner)
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: 'host@example.com',
    password: 'SuperSecret123!',
  });
  
  if (authError || !authData.session) {
    console.error('Auth failed:', authError?.message);
    return;
  }
  
  console.log('Signed in as:', authData.user?.email);
  console.log('User ID:', authData.user?.id);
  
  // Test the auth functions via RPC
  console.log('\n--- Test tm_private.is_org_member ---');
  const { data: isMember, error: memberError } = await client.rpc('tm_private.is_org_member', {
    p_org: TEST_DATA.testOrgId,
  });
  console.log('is_org_member(TestOrg):', isMember, memberError ? `Error: ${memberError.message}` : '');
  
  const { data: isMemberOther, error: memberOtherError } = await client.rpc('tm_private.is_org_member', {
    p_org: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  });
  console.log('is_org_member(OtherOrg):', isMemberOther, memberOtherError ? `Error: ${memberOtherError.message}` : '');
  
  console.log('\n--- Test tm_private.is_org_role ---');
  const { data: isRole, error: roleError } = await client.rpc('tm_private.is_org_role', {
    p_org: TEST_DATA.testOrgId,
    p_roles: ['owner', 'admin'],
  });
  console.log('is_org_role(TestOrg, [owner,admin]):', isRole, roleError ? `Error: ${roleError.message}` : '');
  
  const { data: isRoleViewer, error: roleViewerError } = await client.rpc('tm_private.is_org_role', {
    p_org: TEST_DATA.testOrgId,
    p_roles: ['viewer'],
  });
  console.log('is_org_role(TestOrg, [viewer]):', isRoleViewer, roleViewerError ? `Error: ${roleViewerError.message}` : '');
  
  // Test public.is_org_member
  console.log('\n--- Test public.is_org_member ---');
  const { data: isMemberPub, error: memberPubError } = await client.rpc('is_org_member', {
    p_organization_id: TEST_DATA.testOrgId,
  });
  console.log('public.is_org_member(TestOrg):', isMemberPub, memberPubError ? `Error: ${memberPubError.message}` : '');
  
  await client.auth.signOut();
}

testAuthFunctions().catch(console.error);