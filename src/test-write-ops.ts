import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cvyoumtywnyayceoezru.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2eW91bXR5d255YXljZW9lenJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NTYxNDcsImV4cCI6MjEwNjEzMjE0N30.4IL7rqzj3Vi1JpyHaOOTaaaVYeS33EGl7tsltGO0a10';

const TEST_DATA = {
  testOrgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
};

async function testWriteOps() {
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
  
  // Test 1: UPDATE organization
  console.log('\n--- Test 1: UPDATE organization ---');
  const { data: updateData, error: updateError } = await client
    .from('organizations')
    .update({ name: 'Updated Test Org Name 3' })
    .eq('id', TEST_DATA.testOrgId)
    .select();
  
  console.log('UPDATE result:', updateError ? `ERROR: ${updateError.message}` : `SUCCESS`);
  
  // Test 2: INSERT organization_members (use existing user ID)
  console.log('\n--- Test 2: INSERT organization_members ---');
  // Use guest@example.com user ID which exists
  const guestUserId = '153a1267-9b35-4531-8144-20c90c5dfa3b';
  const { data: insertData, error: insertError } = await client
    .from('organization_members')
    .insert({
      organization_id: TEST_DATA.testOrgId,
      user_id: guestUserId,
      role: 'editorial',
      active: true,
    })
    .select();
  
  console.log('INSERT result:', insertError ? `ERROR: ${insertError.message}` : `SUCCESS: ${JSON.stringify(insertData)}`);
  
  // Test 3: INSERT program with correct JSONB
  console.log('\n--- Test 3: INSERT program ---');
  const testProgId = `test-prog-${Date.now()}`;
  const { data: progData, error: progError } = await client
    .from('programs')
    .insert({
      legacy_id: testProgId,
      name: 'New Test Program',
      title: 'New Test Program',
      description: 'Test',
      host: 'Test Host',
      format: 'Entrevista',
      organization_id: TEST_DATA.testOrgId,
      standard_structure: '{}',
      default_segments: [],
      standard_segments: [],
      default_duration_min: 30,
      default_episode_duration_minutes: 30,
      editorial_style: 'Test',
      target_audience: 'Test',
      tone: 'Test',
      scenario: 'Test',
      default_opening: 'Test',
      default_closing: 'Test',
    })
    .select();
  
  console.log('INSERT program result:', progError ? `ERROR: ${progError.message}` : `SUCCESS: ${JSON.stringify(progData)}`);
  
  // Test 4: INSERT episode
  console.log('\n--- Test 4: INSERT episode ---');
  if (progData && progData[0]) {
    const { data: epData, error: epError } = await client
      .from('episodes')
      .insert({
        legacy_id: `test-ep-${Date.now()}`,
        program_id: progData[0].id,
        episode_number: 99,
        title: 'Test Episode',
        idea: 'Test Idea',
        topic: 'Test Topic',
        synopsis: 'Test Synopsis',
        format: 'Entrevista',
        target_duration_min: 30,
        host: 'Test Host',
        status: 'draft',
        diagnosis: {},
        research: {},
      })
      .select();
    
    console.log('INSERT episode result:', epError ? `ERROR: ${epError.message}` : `SUCCESS: ${JSON.stringify(epData)}`);
  }
  
  // Test 5: INSERT participant
  console.log('\n--- Test 5: INSERT participant ---');
  if (progData && progData[0]) {
    const { data: partData, error: partError } = await client
      .from('participants')
      .insert({
        legacy_id: `test-part-${Date.now()}`,
        program_id: progData[0].id,
        name: 'Test Participant',
        type: 'individual',
        role: 'guest',
        company: 'Test Company',
        bio: 'Test Bio',
        members: [],
        contacts: 'test@test.com',
        notes: 'Test Notes',
        links: [],
        social_handles: {},
        previous_episodes: [],
        previous_research_summary: 'Test',
        entity_type: 'individual',
      })
      .select();
    
    console.log('INSERT participant result:', partError ? `ERROR: ${partError.message}` : `SUCCESS: ${JSON.stringify(partData)}`);
  }
  
  // Test 6: DENY test - viewer should NOT be able to UPDATE organization
  console.log('\n--- Test 6: DENY - Viewer UPDATE organization ---');
  await client.auth.signOut();
  
  const { data: authData2, error: authError2 } = await client.auth.signInWithPassword({
    email: 'guest@example.com',
    password: 'GuestPass456!',
  });
  
  if (authError2 || !authData2.session) {
    console.error('Auth failed for viewer:', authError2?.message);
  } else {
    console.log('Signed in as:', authData2.user?.email);
    
    const { data: denyUpdateData, error: denyUpdateError } = await client
      .from('organizations')
      .update({ name: 'Should Fail' })
      .eq('id', TEST_DATA.testOrgId)
      .select();
    
    console.log('DENY UPDATE result:', denyUpdateError ? `EXPECTED ERROR: ${denyUpdateError.message}` : `UNEXPECTED SUCCESS: ${JSON.stringify(denyUpdateData)}`);
  }
  
  // Test 7: DENY test - viewer should NOT be able to INSERT organization_members
  console.log('\n--- Test 7: DENY - Viewer INSERT organization_members ---');
  const { data: denyInsertData, error: denyInsertError } = await client
    .from('organization_members')
    .insert({
      organization_id: TEST_DATA.testOrgId,
      user_id: guestUserId,
      role: 'viewer',
      active: true,
    })
    .select();
  
  console.log('DENY INSERT result:', denyInsertError ? `EXPECTED ERROR: ${denyInsertError.message}` : `UNEXPECTED SUCCESS: ${JSON.stringify(denyInsertData)}`);
  
  await client.auth.signOut();
}

testWriteOps().catch(console.error);