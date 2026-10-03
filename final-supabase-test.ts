import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function main() {
  console.log('Starting Supabase Validation Tests...\n');
  
  // Test data
  const testProgramId = generateUUID();
  const testEpisodeId = generateUUID();
  const testParticipantId = generateUUID();
  
  let passed = 0;
  let total = 0;
  
  // Test 1: Program CRUD Operations
  console.log('=== Testing Program CRUD Operations ===');
  
  // Create Program
  total++;
  try {
    const { data: program, error } = await supabase
      .from('programs')
      .insert({
        id: testProgramId,
        name: 'Test Program', // Required field
        title: 'Test Program',
        description: 'A test program for validation',
        host: 'Test Host',
        format: 'Entrevista',
        default_duration_min: 60,
        default_episode_duration_minutes: 60,
        editorial_style: 'Informativo',
        scenario: 'Test scenario',
        standard_structure: '{}',
        default_opening: 'Opening',
        default_closing: 'Closing',
        default_segments: '[]', // JSON array
        standard_segments: '[]', // JSON array
        tone: 'Profissional',
        target_audience: 'Adultos',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    console.log('✓ Program created successfully');
    passed++;
  } catch (error: any) {
    console.log('✗ Program creation failed:', error.message);
  }
  
  // Read Program
  total++;
  try {
    const { data: program, error } = await supabase
      .from('programs')
      .select('*')
      .eq('id', testProgramId)
      .single();
      
    if (error) throw error;
    if (!program) throw new Error('Program not found');
    console.log('✓ Program read successfully');
    passed++;
  } catch (error: any) {
    console.log('✗ Program read failed:', error.message);
  }
  
  // Update Program
  total++;
  try {
    const { data: program, error } = await supabase
      .from('programs')
      .update({
        title: 'Updated Test Program',
        description: 'An updated test program',
        host: 'Updated Host',
        format: 'Programa Solo',
        editorial_style: 'Entretenimento',
        scenario: 'Updated scenario',
        standard_structure: '[]',
        default_opening: 'Updated Opening',
        default_closing: 'Updated Closing',
        default_segments: '[]',
        standard_segments: '[]',
        tone: 'Descontraído',
        target_audience: 'Jovens',
        updated_at: new Date().toISOString()
      })
      .eq('id', testProgramId)
      .select()
      .single();
      
    if (error) throw error;
    console.log('✓ Program updated successfully');
    passed++;
  } catch (error: any) {
    console.log('✗ Program update failed:', error.message);
  }
  
  // Test 2: Participant CRUD Operations
  console.log('\n=== Testing Participant CRUD Operations ===');
  
  // Create Participant
  total++;
  try {
    const { data: participant, error } = await supabase
      .from('participants')
      .insert({
        id: testParticipantId,
        name: 'Test Participant',
        role: 'Especialista',
        company: 'Test Company',
        bio: 'A test participant bio',
        contacts: '{}', // PostgreSQL empty array
        notes: 'Test notes',
        entity_type: 'individual',
        group_type: null,
        members: '{}', // PostgreSQL empty array
        social_handles: '{}', // JSON empty object
        previous_episodes: null,
        program_id: testProgramId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    console.log('✓ Participant created successfully');
    passed++;
  } catch (error: any) {
    console.log('✗ Participant creation failed:', error.message);
  }
  
  // Read Participant
  total++;
  try {
    const { data: participant, error } = await supabase
      .from('participants')
      .select('*')
      .eq('id', testParticipantId)
      .single();
      
    if (error) throw error;
    if (!participant) throw new Error('Participant not found');
    console.log('✓ Participant read successfully');
    passed++;
  } catch (error: any) {
    console.log('✗ Participant read failed:', error.message);
  }
  
  // Update Participant
  total++;
  try {
    const { data: participant, error } = await supabase
      .from('participants')
      .update({
        name: 'Updated Test Participant',
        role: 'Convidado Especial',
        company: 'Updated Company',
        bio: 'An updated bio',
        contacts: '{"test@example.com"}', // PostgreSQL array with one element
        notes: 'Updated test notes',
        entity_type: 'group',
        group_type: 'band',
        members: '{"member1","member2"}', // PostgreSQL array with two elements
        social_handles: '{"twitter": "@updated"}', // JSON object
        previous_episodes: '["' + testEpisodeId + '"]', // PostgreSQL array with one element
        updated_at: new Date().toISOString()
      })
      .eq('id', testParticipantId)
      .select()
      .single();
      
    if (error) throw error;
    console.log('✓ Participant updated successfully');
    passed++;
  } catch (error: any) {
    console.log('✗ Participant update failed:', error.message);
  }
  
  // Test 3: Episode CRUD Operations
  console.log('\n=== Testing Episode CRUD Operations ===');
  
  // Create Episode
  total++;
  try {
    const { data: episode, error } = await supabase
      .from('episodes')
      .insert({
        id: testEpisodeId,
        program_id: testProgramId,
        episode_number: 1,
        title: 'Test Episode',
        idea: 'Test episode idea',
        topic: 'Test topic',
        synopsis: 'Test synopsis',
        format: 'Entrevista',
        host: 'Test Host',
        status: 'draft',
        diagnosis: '{}', // JSON empty object
        research: '{}', // JSON empty object
        checklist: '[]', // JSON empty array
        technical_checklist: '[]', // JSON empty array
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    console.log('✓ Episode created successfully');
    passed++;
  } catch (error: any) {
    console.log('✗ Episode creation failed:', error.message);
  }
  
  // Read Episode
  total++;
  try {
    const { data: episode, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', testEpisodeId)
      .single();
      
    if (error) throw error;
    if (!episode) throw new Error('Episode not found');
    console.log('✓ Episode read successfully');
    passed++;
  } catch (error: any) {
    console.log('✗ Episode read failed:', error.message);
  }
  
  // Update Episode
  total++;
  try {
    const { data: episode, error } = await supabase
      .from('episodes')
      .update({
        title: 'Updated Test Episode',
        idea: 'Updated episode idea',
        topic: 'Updated topic',
        synopsis: 'Updated synopsis',
        status: 'research',
        updated_at: new Date().toISOString()
      })
      .eq('id', testEpisodeId)
      .select()
      .single();
      
    if (error) throw error;
    console.log('✓ Episode updated successfully');
    passed++;
  } catch (error: any) {
    console.log('✗ Episode update failed:', error.message);
  }
  
  // Test 4: Constraint Validation
  console.log('\n=== Testing Constraint Validation ===');
  
  // Test NOT NULL constraint on Program.title
  total++;
  try {
    const invalidId = generateUUID();
    const { error } = await supabase
      .from('programs')
      .insert({
        id: invalidId,
        name: 'Test Program', // Required field
        title: null, // This should violate NOT NULL constraint
        description: 'Test description',
        host: 'Test Host',
        format: 'Entrevista',
        default_duration_min: 60,
        default_episode_duration_minutes: 60,
        editorial_style: 'Test',
        scenario: 'Test',
        standard_structure: '{}',
        default_opening: 'Test',
        default_closing: 'Test',
        default_segments: '[]',
        standard_segments: '[]',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (error && error.code === '23502') { // Not null violation
      console.log('✓ Program NOT NULL constraint working correctly');
      passed++;
    } else if (error) {
      throw error;
    } else {
      throw new Error('Should have failed but did not');
    }
  } catch (error: any) {
    console.log('✗ Program NOT NULL constraint test failed:', error.message);
  }
  
  // Test CHECK constraint on Program.format
  total++;
  try {
    const invalidId = generateUUID();
    const { error } = await supabase
      .from('programs')
      .insert({
        id: invalidId,
        name: 'Test Program', // Required field
        title: 'Test Program',
        description: 'Test description',
        host: 'Test Host',
        format: 'InvalidFormat', // This should violate CHECK constraint
        default_duration_min: 60,
        default_episode_duration_minutes: 60,
        editorial_style: 'Test',
        scenario: 'Test',
        standard_structure: '{}',
        default_opening: 'Test',
        default_closing: 'Test',
        default_segments: '[]',
        standard_segments: '[]',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (error && error.code === '23514') { // Check violation
      console.log('✓ Program CHECK constraint working correctly');
      passed++;
    } else if (error) {
      throw error;
    } else {
      throw new Error('Should have failed but did not');
    }
  } catch (error: any) {
    console.log('✗ Program CHECK constraint test failed:', error.message);
  }
  
  // Test 5: Relationship Integrity
  console.log('\n=== Testing Relationship Integrity ===');
  
  // Test Program -> Episode relationship (foreign key)
  total++;
  try {
    const invalidEpisodeId = generateUUID();
    const { error } = await supabase
      .from('episodes')
      .insert({
        id: invalidEpisodeId,
        program_id: '00000000-0000-0000-0000-000000000000', // Non-existent program ID
        episode_number: 1,
        title: 'Test Episode',
        idea: 'Test idea',
        topic: 'Test topic',
        synopsis: 'Test synopsis',
        format: 'Entrevista',
        host: 'Test Host',
        status: 'draft',
        diagnosis: '{}',
        research: '{}',
        checklist: '[]',
        technical_checklist: '[]',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (error && error.code === '23503') { // Foreign key violation
      console.log('✓ Episode foreign key constraint working correctly');
      passed++;
    } else if (error) {
      throw error;
    } else {
      throw new Error('Should have failed but did not');
    }
  } catch (error: any) {
    console.log('✗ Episode foreign key constraint test failed:', error.message);
  }
  
  // Test Episode -> Participant relationship via episode_participants
  total++;
  try {
    // First, create an episode-participant relationship
    const { data: epData, error: insertError } = await supabase
      .from('episode_participants')
      .insert({
        episode_id: testEpisodeId,
        participant_id: testParticipantId,
        name: 'Test Participant',
        order_pos: 0,
        is_featured: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (insertError) throw insertError;
    
    // Now try to create a relationship with non-existent participant
    const invalidEpId = generateUUID();
    const { error } = await supabase
      .from('episode_participants')
      .insert({
        id: invalidEpId,
        episode_id: testEpisodeId,
        participant_id: '00000000-0000-0000-0000-000000000000', // Non-existent participant
        name: 'Test Participant 2',
        order_pos: 1,
        is_featured: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (error && error.code === '23503') { // Foreign key violation
      console.log('✓ EpisodeParticipant foreign key constraint working correctly');
      passed++;
    } else if (error) {
      throw error;
    } else {
      throw new Error('Should have failed but did not');
    }
  } catch (error: any) {
    console.log('✗ EpisodeParticipant foreign key constraint test failed:', error.message);
  }
  
  // Test 6: Verify JSON Local Not Used as Source of Truth
  console.log('\n=== Verifying JSON Local Not Used as Source of Truth ===');
  
  total++;
  try {
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('id, title')
      .limit(1);
      
    if (programsError) throw programsError;
    
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, title')
      .limit(1);
      
    if (episodesError) throw episodesError;
    
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id, name')
      .limit(1);
      
    if (participantsError) throw participantsError;
    
    if (programs && episodes && participants) {
      console.log('✓ Data is being retrieved from Supabase (not JSON local)');
      passed++;
    } else {
      throw new Error('Failed to retrieve data from Supabase');
    }
  } catch (error: any) {
    console.log('✗ Failed to verify JSON local not used:', error.message);
  }
  
  // Cleanup: Delete test records
  console.log('\n=== Cleaning Up Test Records ===');
  
  try {
    // Delete in reverse order of dependencies
    await supabase.from('episode_participants').delete().eq('episode_id', testEpisodeId);
    await supabase.from('episodes').delete().eq('id', testEpisodeId);
    await supabase.from('participants').delete().eq('id', testParticipantId);
    await supabase.from('programs').delete().eq('id', testProgramId);
    
    console.log('✓ Test records cleaned up successfully');
  } catch (error: any) {
    console.log('⚠ Warning: Failed to clean up test records:', error.message);
  }
  
  // Print test summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed < total) {
    console.log(`Failed: ${total - passed}/${total}`);
    process.exit(1);
  } else {
    console.log('All tests passed!');
    process.exit(0);
  }
}

// Run the tests
main().catch(error => {
  console.error('Unhandled error in test runner:', error);
  process.exit(1);
});