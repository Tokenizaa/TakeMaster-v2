import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cvyoumtywnyayceoezru.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2eW91bXR5d255YXljZW9lenJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NTYxNDcsImV4cCI6MjEwNjEzMjE0N30.4IL7rqzj3Vi1JpyHaOOTaaaVYeS33EGl7tsltGO0a10';

// Test users
const TEST_USERS = [
  { email: 'host@example.com', password: 'SuperSecret123!', name: 'Owner of Test Org', expectedOrgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
  { email: 'guest@example.com', password: 'GuestPass456!', name: 'Viewer of Test Org', expectedOrgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
  { email: 'admin@example.com', password: 'AdminPass123!', name: 'Admin of Test Org', expectedOrgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
  { email: 'member@example.com', password: 'MemberPass123!', name: 'Member of Test Org', expectedOrgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
  { email: 'outsider@example.com', password: 'OutsiderPass123!', name: 'Owner of Other Org', expectedOrgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
];

// Test data IDs
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
}

async function runAllTests() {
  console.log('=== RLS Authorization Tests ===\n');
  
  // Test 1: Organizations - users can only see their own orgs
  console.log('--- Test 1: Organizations Access ---');
  for (const user of TEST_USERS) {
    await runTest(
      'organizations SELECT',
      user,
      'ALLOW',
      async (client) => {
        const { data, error, count } = await client
          .from('organizations')
          .select('id, name, slug', { count: 'exact' });
        return { success: !error && (data?.length ?? 0) > 0, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 2: Organizations - users can only see THEIR orgs (not others)
  console.log('--- Test 2: Organizations Isolation ---');
  for (const user of TEST_USERS) {
    await runTest(
      'organizations SELECT - only own org',
      user,
      user.email === 'outsider@example.com' ? 'ALLOW' : 'ALLOW', // Both should see their own
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
        
        // Owner of Test Org should see Test Org but not Other Org
        // Owner of Other Org should see Other Org but not Test Org
        const expectedCanSeeTestOrg = user.expectedOrgId === TEST_DATA.testOrgId;
        const expectedCanSeeOtherOrg = user.expectedOrgId === TEST_DATA.otherOrgId;
        
        const passed = canSeeTestOrg === expectedCanSeeTestOrg && canSeeOtherOrg === expectedCanSeeOtherOrg;
        return { 
          success: passed, 
          count: (canSeeTestOrg ? 1 : 0) + (canSeeOtherOrg ? 1 : 0),
          error: passed ? undefined : { message: `TestOrg: ${canSeeTestOrg}, OtherOrg: ${canSeeOtherOrg}` }
        };
      }
    );
  }
  
  // Test 3: Programs - users can only access programs in their orgs
  console.log('--- Test 3: Programs Access ---');
  for (const user of TEST_USERS) {
    await runTest(
      'programs SELECT',
      user,
      'ALLOW',
      async (client) => {
        const { data, error, count } = await client
          .from('programs')
          .select('id, name, organization_id', { count: 'exact' });
        return { success: !error && (data?.length ?? 0) > 0, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 4: Programs isolation
  console.log('--- Test 4: Programs Isolation ---');
  for (const user of TEST_USERS) {
    await runTest(
      'programs SELECT - isolation',
      user,
      user.expectedOrgId === TEST_DATA.testOrgId ? 'ALLOW' : 'DENY',
      async (client) => {
        const { data, error } = await client
          .from('programs')
          .select('id, name, organization_id')
          .eq('id', TEST_DATA.program1Id);
        return { success: !error && (data?.length ?? 0) > 0, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 5: Episodes - users can only access episodes in their programs
  console.log('--- Test 5: Episodes Access ---');
  for (const user of TEST_USERS) {
    await runTest(
      'episodes SELECT',
      user,
      'ALLOW',
      async (client) => {
        const { data, error, count } = await client
          .from('episodes')
          .select('id, title, program_id', { count: 'exact' });
        return { success: !error && (data?.length ?? 0) > 0, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 6: Episodes isolation
  console.log('--- Test 6: Episodes Isolation ---');
  for (const user of TEST_USERS) {
    const canAccess = user.expectedOrgId === TEST_DATA.testOrgId;
    await runTest(
      'episodes SELECT - isolation (episode in Test Org)',
      user,
      canAccess ? 'ALLOW' : 'DENY',
      async (client) => {
        const { data, error } = await client
          .from('episodes')
          .select('id, title, program_id')
          .eq('id', TEST_DATA.episode1Id);
        return { success: !error && (data?.length ?? 0) > 0, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 7: Participants - users can only access participants in their programs
  console.log('--- Test 7: Participants Access ---');
  for (const user of TEST_USERS) {
    await runTest(
      'participants SELECT',
      user,
      'ALLOW',
      async (client) => {
        const { data, error, count } = await client
          .from('participants')
          .select('id, name, program_id', { count: 'exact' });
        return { success: !error && (data?.length ?? 0) > 0, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 8: Participants isolation
  console.log('--- Test 8: Participants Isolation ---');
  for (const user of TEST_USERS) {
    const canAccess = user.expectedOrgId === TEST_DATA.testOrgId;
    await runTest(
      'participants SELECT - isolation (participant in Test Org)',
      user,
      canAccess ? 'ALLOW' : 'DENY',
      async (client) => {
        const { data, error } = await client
          .from('participants')
          .select('id, name, program_id')
          .eq('id', TEST_DATA.participant1Id);
        return { success: !error && (data?.length ?? 0) > 0, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 9: Episode Participants junction - users can only access junction in their programs
  console.log('--- Test 9: Episode Participants Junction ---');
  for (const user of TEST_USERS) {
    const canAccess = user.expectedOrgId === TEST_DATA.testOrgId;
    await runTest(
      'episode_participants SELECT - isolation',
      user,
      canAccess ? 'ALLOW' : 'DENY',
      async (client) => {
        const { data, error } = await client
          .from('episode_participants')
          .select('episode_id, participant_id')
          .eq('episode_id', TEST_DATA.episode1Id);
        return { success: !error && (data?.length ?? 0) > 0, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 10: Write operations - INSERT
  console.log('--- Test 10: Write Operations (INSERT) ---');
  for (const user of TEST_USERS) {
    const canWrite = user.expectedOrgId === TEST_DATA.testOrgId && 
                     (user.name.includes('Owner') || user.name.includes('Admin'));
    await runTest(
      'programs INSERT',
      user,
      canWrite ? 'ALLOW' : 'DENY',
      async (client) => {
        const { data, error } = await client
          .from('programs')
          .insert({
            id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            legacy_id: 'test-new-prog',
            name: 'New Test Program',
            title: 'New Test Program',
            description: 'Test',
            host: 'Test Host',
            format: 'Entrevista',
            organization_id: TEST_DATA.testOrgId,
            standard_structure: '{}',
            default_segments: '[]',
            standard_segments: '[]',
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
  
  // Test 11: Write operations - UPDATE (owner/admin only)
  console.log('--- Test 11: Write Operations (UPDATE organizations) ---');
  for (const user of TEST_USERS) {
    const canWrite = user.expectedOrgId === TEST_DATA.testOrgId && 
                     (user.name.includes('Owner') || user.name.includes('Admin'));
    await runTest(
      'organizations UPDATE',
      user,
      canWrite ? 'ALLOW' : 'DENY',
      async (client) => {
        const { data, error } = await client
          .from('organizations')
          .update({ name: 'Updated Test Org' })
          .eq('id', TEST_DATA.testOrgId)
          .select();
        return { success: !error, count: data?.length ?? 0, error };
      }
    );
  }
  
  // Test 12: Organization members - only owner/admin can manage
  console.log('--- Test 12: Organization Members Management ---');
  for (const user of TEST_USERS) {
    const canManage = user.expectedOrgId === TEST_DATA.testOrgId && 
                      (user.name.includes('Owner') || user.name.includes('Admin'));
    await runTest(
      'organization_members INSERT (manage members)',
      user,
      canManage ? 'ALLOW' : 'DENY',
      async (client) => {
        const { data, error } = await client
          .from('organization_members')
          .insert({
            organization_id: TEST_DATA.testOrgId,
            user_id: '99999999-9999-9999-9999-999999999999',
            role: 'viewer',
            active: true,
          })
          .select();
        return { success: !error, count: data?.length ?? 0, error };
      }
    );
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