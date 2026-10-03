import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cvyoumtywnyayceoezru.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2eW91bXR5d255YXljZW9lenJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NTYxNDcsImV4cCI6MjEwNjEzMjE0N30.4IL7rqzj3Vi1JpyHaOOTaaaVYeS33EGl7tsltGO0a10';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2eW91bXR5d255YXljZW9lenJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDU1NjE0NywiZXhwIjoyMTA2MTMyMTQ3fQ.s3aedozbSDJpXCsyb5rthqfQyVVWaoGVXm-pedvf1GA';

// Working test users (already confirmed working)
const TEST_USERS = [
  { email: 'host@example.com', password: 'SuperSecret123!', name: 'Owner of Test Org', expectedOrgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role: 'owner' },
  { email: 'guest@example.com', password: 'GuestPass456!', name: 'Viewer of Test Org', expectedOrgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role: 'viewer' },
];

const TEST_DATA = {
  testOrgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  otherOrgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  program1Id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  program2Id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  otherProgramId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  episode1Id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  episode2Id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
  episode3Id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  otherEpisodeId: 'cccccccc-cccc-cccc-cccc-cccccccccccd',
  participant1Id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  participant2Id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  participant3Id: 'ffffffff-ffff-ffff-ffff-fffffffffff0',
  otherParticipantId: '11111111-1111-1111-1111-111111111110',
  guestUserId: '153a1267-9b35-4531-8144-20c90c5dfa3b', // guest@example.com
  // User that exists in auth.users but not in Test Org
  newMemberUserId: 'b18e03ea-eef2-45fb-99dd-5b5ed3945812',
};

interface TestResult {
  test: string;
  user: string;
  expected: 'ALLOW' | 'DENY';
  actual: 'ALLOW' | 'DENY' | 'ERROR';
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest(
  testName: string,
  user: typeof TEST_USERS[0],
  expected: 'ALLOW' | 'DENY',
  testFn: (client: ReturnType<typeof createClient>) => Promise<{ success: boolean; count: number; error?: any }>
): Promise<void> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Sign in
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  
  if (authError || !authData.session) {
    results.push({
      test: testName,
      user: user.name,
      expected,
      actual: 'ERROR',
      passed: false,
      details: `Auth failed: ${authError?.message || 'No session'}`,
    });
    return;
  }
  
  // Run test
  try {
    const result = await testFn(client);
    const actual = result.success ? 'ALLOW' : 'DENY';
    const passed = actual === expected;
    
    results.push({
      test: testName,
      user: user.name,
      expected,
      actual,
      passed,
      details: result.error ? `Error: ${result.error.message}` : `Count: ${result.count}`,
    });
  } catch (e) {
    results.push({
      test: testName,
      user: user.name,
      expected,
      actual: 'ERROR',
      passed: false,
      details: `Exception: ${(e as Error).message}`,
    });
  }
  
  await client.auth.signOut();
  await sleep(500); // Rate limit avoidance
}

async function runAllTests() {
  console.log('=== RLS Authorization Tests (Final) ===\n');
  
  // Test 1: Organizations - users can only see their own orgs
  console.log('--- Test 1: Organizations Access (should see only Test Org) ---');
  for (const user of TEST_USERS) {
    await runTest(
      'organizations SELECT - isolation',
      user,
      'ALLOW',
      async (client) => {
        const { data, error } = await client
          .from('organizations')
          .select('id, name, slug')
          .eq('id', TEST_DATA.testOrgId);
        const canSeeTestOrg = !error && (data?.length ?? 0) > 0;
        
        const { data: data2, error: error2 } = await client
          .from('organizations')
          .select('id, name, slug')
          .eq('id', TEST_DATA.otherOrgId);
        const canSeeOtherOrg = !error2 && (data2?.length ?? 0) > 0;
        
        const passed = canSeeTestOrg && !canSeeOtherOrg;
        return { 
          success: passed, 
          count: (canSeeTestOrg ? 1 : 0) + (canSeeOtherOrg ? 1 : 0),
          error: passed ? undefined : { message: `TestOrg: ${canSeeTestOrg}, OtherOrg: ${canSeeOtherOrg}` }
        };
      }
    );
  }
  
  // Test 2: Programs - users can only access programs in their orgs
  console.log('--- Test 2: Programs Access (should see programs in Test Org) ---');
  for (const user of TEST_USERS) {
    await runTest(
      'programs SELECT - isolation (program in Test Org)',
      user,
      'ALLOW',
      async (client) => {
        const { data, error } = await client
          .from('programs')
          .select('id, name, organization_id')
          .eq('id', TEST_DATA.program1Id);
        return { success: !error && (data?.length ?? 0) > 0, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 3: Programs - should NOT see programs in Other Org
  console.log('--- Test 3: Programs Isolation (should NOT see program in Other Org) ---');
  for (const user of TEST_USERS) {
    await runTest(
      'programs SELECT - isolation (program in Other Org)',
      user,
      'DENY',
      async (client) => {
        const { data, error } = await client
          .from('programs')
          .select('id, name, organization_id')
          .eq('id', TEST_DATA.otherProgramId);
        return { success: !error && (data?.length ?? 0) > 0, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 4: Episodes - users can only access episodes in their programs
  console.log('--- Test 4: Episodes Access (should see episodes in Test Org programs) ---');
  for (const user of TEST_USERS) {
    await runTest(
      'episodes SELECT - isolation (episode in Test Org)',
      user,
      'ALLOW',
      async (client) => {
        const { data, error } = await client
          .from('episodes')
          .select('id, title, program_id')
          .eq('id', TEST_DATA.episode1Id);
        return { success: !error && (data?.length ?? 0) > 0, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 5: Episodes - should NOT see episodes in Other Org
  console.log('--- Test 5: Episodes Isolation (should NOT see episode in Other Org) ---');
  for (const user of TEST_USERS) {
    await runTest(
      'episodes SELECT - isolation (episode in Other Org)',
      user,
      'DENY',
      async (client) => {
        const { data, error } = await client
          .from('episodes')
          .select('id, title, program_id')
          .eq('id', TEST_DATA.otherEpisodeId);
        return { success: !error && (data?.length ?? 0) > 0, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 6: Participants - users can only access participants in their programs
  console.log('--- Test 6: Participants Access (should see participants in Test Org programs) ---');
  for (const user of TEST_USERS) {
    await runTest(
      'participants SELECT - isolation (participant in Test Org)',
      user,
      'ALLOW',
      async (client) => {
        const { data, error } = await client
          .from('participants')
          .select('id, name, program_id')
          .eq('id', TEST_DATA.participant1Id);
        return { success: !error && (data?.length ?? 0) > 0, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 7: Participants - should NOT see participants in Other Org
  console.log('--- Test 7: Participants Isolation (should NOT see participant in Other Org) ---');
  for (const user of TEST_USERS) {
    await runTest(
      'participants SELECT - isolation (participant in Other Org)',
      user,
      'DENY',
      async (client) => {
        const { data, error } = await client
          .from('participants')
          .select('id, name, program_id')
          .eq('id', TEST_DATA.otherParticipantId);
        return { success: !error && (data?.length ?? 0) > 0, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 8: Episode Participants junction
  console.log('--- Test 8: Episode Participants Junction ---');
  for (const user of TEST_USERS) {
    await runTest(
      'episode_participants SELECT - isolation (junction in Test Org)',
      user,
      'ALLOW',
      async (client) => {
        const { data, error } = await client
          .from('episode_participants')
          .select('episode_id, participant_id')
          .eq('episode_id', TEST_DATA.episode1Id);
        return { success: !error && (data?.length ?? 0) > 0, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 9: Write operations - INSERT program (owner only)
  console.log('--- Test 9: Write Operations - INSERT program (owner only) ---');
  for (const user of TEST_USERS) {
    const expected = user.role === 'owner' ? 'ALLOW' : 'DENY';
    await runTest(
      'programs INSERT',
      user,
      expected,
      async (client) => {
        const testId = `test-prog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const { data, error } = await client
          .from('programs')
          .insert({
            legacy_id: testId,
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
        return { success: !error, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 10: Write operations - UPDATE organization (owner/admin only)
  console.log('--- Test 10: Write Operations - UPDATE organization (owner/admin only) ---');
  for (const user of TEST_USERS) {
    const expected = (user.role === 'owner' || user.role === 'admin') ? 'ALLOW' : 'DENY';
    await runTest(
      'organizations UPDATE',
      user,
      expected,
      async (client) => {
        const { data, error } = await client
          .from('organizations')
          .update({ name: `Updated by ${user.role} ${Date.now()}` })
          .eq('id', TEST_DATA.testOrgId)
          .select();
        // For DENY case: RLS allows statement but filters rows -> empty result
        // Check if any rows were actually updated
        const actuallyUpdated = !error && (data?.length ?? 0) > 0;
        return { success: actuallyUpdated, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 11: Organization members - only owner/admin can manage
  console.log('--- Test 11: Organization Members Management (owner/admin only) ---');
  for (const user of TEST_USERS) {
    const expected = (user.role === 'owner' || user.role === 'admin') ? 'ALLOW' : 'DENY';
    await runTest(
      'organization_members INSERT (manage members)',
      user,
      expected,
      async (client) => {
        const { data, error } = await client
          .from('organization_members')
          .insert({
            organization_id: TEST_DATA.testOrgId,
            user_id: TEST_DATA.newMemberUserId,
            role: 'viewer',
            active: true,
          })
          .select();
        return { success: !error, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 12: Service role bypass (should always work)
  console.log('--- Test 12: Service Role Bypass (should always work) ---');
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const serviceTests = [
    { name: 'organizations SELECT all', query: () => serviceClient.from('organizations').select('id, name') },
    { name: 'programs SELECT all', query: () => serviceClient.from('programs').select('id, name, organization_id') },
    { name: 'episodes SELECT all', query: () => serviceClient.from('episodes').select('id, title, program_id') },
    { name: 'participants SELECT all', query: () => serviceClient.from('participants').select('id, name, program_id') },
    { name: 'episode_participants SELECT all', query: () => serviceClient.from('episode_participants').select('episode_id, participant_id') },
    { name: 'organization_members SELECT all', query: () => serviceClient.from('organization_members').select('organization_id, user_id, role') },
  ];
  
  for (const t of serviceTests) {
    try {
      const { data, error } = await t.query();
      const success = !error && (data?.length ?? 0) > 0;
      results.push({
        test: t.name,
        user: 'Service Role',
        expected: 'ALLOW',
        actual: success ? 'ALLOW' : 'DENY',
        passed: success,
        details: error ? `Error: ${error.message}` : `Count: ${data?.length ?? 0}`,
      });
    } catch (e) {
      results.push({
        test: t.name,
        user: 'Service Role',
        expected: 'ALLOW',
        actual: 'ERROR',
        passed: false,
        details: `Exception: ${(e as Error).message}`,
      });
    }
  }
  
  // Print results
  console.log('\n=== RESULTS SUMMARY ===\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const r of results) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} | ${r.test} | User: ${r.user} | Expected: ${r.expected} | Actual: ${r.actual} | ${r.details}`);
    if (r.passed) passed++;
    else failed++;
  }
  
  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(console.error);