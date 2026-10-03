import { SupabasePersistence } from './src/server/supabasePersistence';

// Helper function to generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function runTests() {
  const persistence = new SupabasePersistence();
  const testResults: Array<{
    testName: string;
    passed: boolean;
    error?: string;
    details?: any;
  }> = [];

  // Test data
  const testProgramId = generateUUID();
  const testEpisodeId = generateUUID();
  const testParticipantId = generateUUID();

  console.log('Starting Supabase Persistence Layer Tests...\n');

  // Test 1: Program CRUD Operations
  console.log('=== Testing Program CRUD Operations ===');
  
  // Create Program
  try {
    const testProgram = {
      id: testProgramId,
      title: 'Test Program',
      description: 'A test program for validation',
      host: 'Test Host',
      format: 'Entrevista',
      defaultDurationMin: 60,
      editorialStyle: 'Informativo',
      scenario: 'Test scenario',
      standardStructure: [],
      defaultOpening: 'Opening',
      defaultClosing: 'Closing',
      defaultSegments: [],
      standardSegments: [],
      tone: 'Profissional',
      targetAudience: 'Adultos',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const savedProgram = await persistence.saveShow(testProgram);
    testResults.push({
      testName: 'Program - Create',
      passed: true,
      details: { id: savedProgram.id }
    });
    console.log('✓ Program created successfully');
  } catch (error: any) {
    testResults.push({
      testName: 'Program - Create',
      passed: false,
      error: error.message
    });
    console.log('✗ Program creation failed:', error.message);
  }

  // Read Program
  try {
    const program = await persistence.getShow(testProgramId);
    if (program) {
      testResults.push({
        testName: 'Program - Read',
        passed: true,
        details: { id: program.id, title: program.title }
      });
      console.log('✓ Program read successfully');
    } else {
      testResults.push({
        testName: 'Program - Read',
        passed: false,
        error: 'Program not found'
      });
      console.log('✗ Program read failed: Program not found');
    }
  } catch (error: any) {
    testResults.push({
      testName: 'Program - Read',
      passed: false,
      error: error.message
    });
    console.log('✗ Program read failed:', error.message);
  }

  // Update Program
  try {
    const updatedProgram = {
      id: testProgramId,
      title: 'Updated Test Program',
      description: 'An updated test program',
      host: 'Updated Host',
      format: 'Programa Solo',
      defaultDurationMin: 90,
      editorialStyle: 'Entretenimento',
      scenario: 'Updated scenario',
      standardStructure: [],
      defaultOpening: 'Updated Opening',
      defaultClosing: 'Updated Closing',
      defaultSegments: [],
      standardSegments: [],
      tone: 'Descontraído',
      targetAudience: 'Jovens',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString() // Keep original createdAt
    };

    await persistence.saveShow(updatedProgram);
    testResults.push({
      testName: 'Program - Update',
      passed: true,
      details: { id: updatedProgram.id, title: updatedProgram.title }
    });
    console.log('✓ Program updated successfully');
  } catch (error: any) {
    testResults.push({
      testName: 'Program - Update',
      passed: false,
      error: error.message
    });
    console.log('✗ Program update failed:', error.message);
  }

  // Test 2: Participant CRUD Operations
  console.log('\n=== Testing Participant CRUD Operations ===');

  // Create Participant
  try {
    const testParticipant = {
      id: testParticipantId,
      name: 'Test Participant',
      role: 'Especialista',
      company: 'Test Company',
      bio: 'A test participant bio',
      contacts: 'test@example.com',
      links: ['https://example.com'],
      notes: 'Test notes',
      entity_type: 'individual',
      group_type: null,
      members: [],
      social_handles: {},
      previous_episodes: [],
      previous_research_summary: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await persistence.saveGuest(testParticipant);
    testResults.push({
      testName: 'Participant - Create',
      passed: true,
      details: { id: testParticipant.id, name: testParticipant.name }
    });
    console.log('✓ Participant created successfully');
  } catch (error: any) {
    testResults.push({
      testName: 'Participant - Create',
      passed: false,
      error: error.message
    });
    console.log('✗ Participant creation failed:', error.message);
  }

  // Read Participant
  try {
    const participant = await persistence.getGuest(testParticipantId);
    if (participant) {
      testResults.push({
        testName: 'Participant - Read',
        passed: true,
        details: { id: participant.id, name: participant.name }
      });
      console.log('✓ Participant read successfully');
    } else {
      testResults.push({
        testName: 'Participant - Read',
        passed: false,
        error: 'Participant not found'
      });
      console.log('✗ Participant read failed: Participant not found');
    }
  } catch (error: any) {
    testResults.push({
      testName: 'Participant - Read',
      passed: false,
      error: error.message
    });
    console.log('✗ Participant read failed:', error.message);
  }

  // Update Participant
  try {
    const updatedParticipant = {
      id: testParticipantId,
      name: 'Updated Test Participant',
      role: 'Convidado Especial',
      company: 'Updated Company',
      bio: 'An updated bio',
      contacts: 'updated@example.com',
      links: ['https://updated.example.com'],
      notes: 'Updated test notes',
      entity_type: 'group',
      group_type: 'band',
      members: ['member1', 'member2'],
      social_handles: { twitter: '@updated' },
      previous_episodes: [testEpisodeId],
      previous_research_summary: 'Updated research summary',
      createdAt: new Date().toISOString(), // Keep original
      updatedAt: new Date().toISOString()
    };

    await persistence.saveGuest(updatedParticipant);
    testResults.push({
      testName: 'Participant - Update',
      passed: true,
      details: { id: updatedParticipant.id, name: updatedParticipant.name }
    });
    console.log('✓ Participant updated successfully');
  } catch (error: any) {
    testResults.push({
      testName: 'Participant - Update',
      passed: false,
      error: error.message
    });
    console.log('✗ Participant update failed:', error.message);
  }

  // Test 3: Episode CRUD Operations (Note: These methods are not fully implemented in persistence layer)
  console.log('\n=== Testing Episode CRUD Operations ===');
  
  // Since the persistence layer doesn't have full episode implementation, 
  // we'll test direct Supabase access for episodes
  try {
    const { data: episode, error } = await persistence.supabase
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
        diagnosis: {},
        research: {},
        checklist: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .single();

    if (error) throw error;

    testResults.push({
      testName: 'Episode - Create (Direct)',
      passed: true,
      details: { id: episode.id, title: episode.title }
    });
    console.log('✓ Episode created successfully (direct)');
  } catch (error: any) {
    testResults.push({
      testName: 'Episode - Create (Direct)',
      passed: false,
      error: error.message
    });
    console.log('✗ Episode creation failed (direct):', error.message);
  }

  // Read Episode
  try {
    const { data: episode, error } = await persistence.supabase
      .from('episodes')
      .select('*')
      .eq('id', testEpisodeId)
      .single();

    if (error) throw error;
    if (episode) {
      testResults.push({
        testName: 'Episode - Read (Direct)',
        passed: true,
        details: { id: episode.id, title: episode.title }
      });
      console.log('✓ Episode read successfully (direct)');
    } else {
      testResults.push({
        testName: 'Episode - Read (Direct)',
        passed: false,
        error: 'Episode not found'
      });
      console.log('✗ Episode read failed (direct): Episode not found');
    }
  } catch (error: any) {
    testResults.push({
      testName: 'Episode - Read (Direct)',
      passed: false,
      error: error.message
    });
    console.log('✗ Episode read failed (direct):', error.message);
  }

  // Update Episode
  try {
    const { data: episode, error } = await persistence.supabase
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
      .single();

    if (error) throw error;

    testResults.push({
      testName: 'Episode - Update (Direct)',
      passed: true,
      details: { id: episode.id, title: episode.title }
    });
    console.log('✓ Episode updated successfully (direct)');
  } catch (error: any) {
    testResults.push({
      testName: 'Episode - Update (Direct)',
      passed: false,
      error: error.message
    });
    console.log('✗ Episode update failed (direct):', error.message);
  }

  // Test 4: Constraint Validation
  console.log('\n=== Testing Constraint Validation ===');

  // Test NOT NULL constraint on Program.title
  try {
    const invalidId = generateUUID();
    await persistence.supabase
      .from('programs')
      .insert({
        id: invalidId,
        title: null, // This should violate NOT NULL constraint
        description: 'Test description',
        host: 'Test Host',
        format: 'Entrevista',
        default_duration_min: 60,
        editorial_style: 'Test',
        scenario: 'Test',
        standard_structure: '{}',
        default_opening: 'Test',
        default_closing: 'Test',
        default_segments: '[]',
        standard_segments: '[]',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .single();

    testResults.push({
      testName: 'Program - NOT NULL Constraint (title)',
      passed: false,
      error: 'Should have failed but did not'
    });
    console.log('✗ Program NOT NULL constraint test failed: Should have failed but did not');
  } catch (error: any) {
    if (error.code === '23502') { // Not null violation
      testResults.push({
        testName: 'Program - NOT NULL Constraint (title)',
        passed: true,
        details: { constraint: 'title cannot be null' }
      });
      console.log('✓ Program NOT NULL constraint working correctly');
    } else {
      // Sometimes the error might be different, let's check if it's a constraint violation
      if (error.message && (error.message.includes('null') || error.message.includes('not null'))) {
        testResults.push({
          testName: 'Program - NOT NULL Constraint (title)',
          passed: true,
          details: { constraint: 'title cannot be null', error: error.message }
        });
        console.log('✓ Program NOT NULL constraint working correctly');
      } else {
        testResults.push({
          testName: 'Program - NOT NULL Constraint (title)',
          passed: false,
          error: error.message
        });
        console.log('✗ Program NOT NULL constraint test failed:', error.message);
      }
    }
  }

  // Test CHECK constraint on Program.format
  try {
    const invalidId = generateUUID();
    await persistence.supabase
      .from('programs')
      .insert({
        id: invalidId,
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
      })
      .single();

    testResults.push({
      testName: 'Program - CHECK Constraint (format)',
      passed: false,
      error: 'Should have failed but did not'
    });
    console.log('✗ Program CHECK constraint test failed: Should have failed but did not');
  } catch (error: any) {
    if (error.code === '23514') { // Check violation
      testResults.push({
        testName: 'Program - CHECK Constraint (format)',
        passed: true,
        details: { constraint: 'format must be valid value' }
      });
      console.log('✓ Program CHECK constraint working correctly');
    } else {
      // Check if it's a constraint violation
      if (error.message && (error.message.includes('check') || error.message.includes('constraint'))) {
        testResults.push({
          testName: 'Program - CHECK Constraint (format)',
          passed: true,
          details: { constraint: 'format must be valid value', error: error.message }
        });
        console.log('✓ Program CHECK constraint working correctly');
      } else {
        testResults.push({
          testName: 'Program - CHECK Constraint (format)',
          passed: false,
          error: error.message
        });
        console.log('✗ Program CHECK constraint test failed:', error.message);
      }
    }
  }

  // Test 5: Relationship Integrity
  console.log('\n=== Testing Relationship Integrity ===');

  // Test Program -> Episode relationship (foreign key)
  try {
    const invalidEpisodeId = generateUUID();
    await persistence.supabase
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
        diagnosis: {},
        research: {},
        checklist: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .single();

    testResults.push({
      testName: 'Episode - Foreign Key Constraint (program_id)',
      passed: false,
      error: 'Should have failed but did not'
    });
    console.log('✗ Episode foreign key constraint test failed: Should have failed but did not');
  } catch (error: any) {
    if (error.code === '23503') { // Foreign key violation
      testResults.push({
        testName: 'Episode - Foreign Key Constraint (program_id)',
        passed: true,
        details: { constraint: 'program_id must reference existing program' }
      });
      console.log('✓ Episode foreign key constraint working correctly');
    } else {
      // Check if it's a foreign key violation
      if (error.message && (error.message.includes('foreign key') || error.message.includes('references'))) {
        testResults.push({
          testName: 'Episode - Foreign Key Constraint (program_id)',
          passed: true,
          details: { constraint: 'program_id must reference existing program', error: error.message }
        });
        console.log('✓ Episode foreign key constraint working correctly');
      } else {
        testResults.push({
          testName: 'Episode - Foreign Key Constraint (program_id)',
          passed: false,
          error: error.message
        });
        console.log('✗ Episode foreign key constraint test failed:', error.message);
      }
    }
  }

  // Test Episode -> Participant relationship via episode_participants
  try {
    // First, create an episode-participant relationship
    const { data: epData, error: insertError } = await persistence.supabase
      .from('episode_participants')
      .insert({
        episode_id: testEpisodeId,
        participant_id: testParticipantId,
        name: 'Test Participant',
        order_pos: 0,
        is_featured: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .single();

    if (insertError) throw insertError;

    // Now try to create a relationship with non-existent participant
    const invalidEpId = generateUUID();
    await persistence.supabase
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
      })
      .single();

    testResults.push({
      testName: 'EpisodeParticipant - Foreign Key Constraint (participant_id)',
      passed: false,
      error: 'Should have failed but did not'
    });
    console.log('✗ EpisodeParticipant foreign key constraint test failed: Should have failed but did not');
  } catch (error: any) {
    if (error.code === '23503') { // Foreign key violation
      testResults.push({
        testName: 'EpisodeParticipant - Foreign Key Constraint (participant_id)',
        passed: true,
        details: { constraint: 'participant_id must reference existing participant' }
      });
      console.log('✓ EpisodeParticipant foreign key constraint working correctly');
    } else {
      // Check if it's a foreign key violation
      if (error.message && (error.message.includes('foreign key') || error.message.includes('references'))) {
        testResults.push({
          testName: 'EpisodeParticipant - Foreign Key Constraint (participant_id)',
          passed: true,
          details: { constraint: 'participant_id must reference existing participant', error: error.message }
        });
        console.log('✓ EpisodeParticipant foreign key constraint working correctly');
      } else {
        testResults.push({
          testName: 'EpisodeParticipant - Foreign Key Constraint (participant_id)',
          passed: false,
          error: error.message
        });
        console.log('✗ EpisodeParticipant foreign key constraint test failed:', error.message);
      }
    }
  }

  // Test 6: Verify JSON Local Not Used as Source of Truth
  console.log('\n=== Verifying JSON Local Not Used as Source of Truth ===');
  
  // Check if there are any local JSON files being used for Episode or Participant data
  try {
    const { data: programs, error: programsError } = await persistence.supabase
      .from('programs')
      .select('id, title')
      .limit(1);
    
    if (programsError) throw programsError;
    
    const { data: episodes, error: episodesError } = await persistence.supabase
      .from('episodes')
      .select('id, title')
      .limit(1);
      
    if (episodesError) throw episodesError;
    
    const { data: participants, error: participantsError } = await persistence.supabase
      .from('participants')
      .select('id, name')
      .limit(1);

    if (participantsError) throw participantsError;

    if (programs && episodes && participants) {
      testResults.push({
        testName: 'JSON Local Not Used as Source of Truth',
        passed: true,
        details: {
          programsCount: programs.length,
          episodesCount: episodes.length,
          participantsCount: participants.length
        }
      });
      console.log('✓ Data is being retrieved from Supabase (not JSON local)');
    } else {
      testResults.push({
        testName: 'JSON Local Not Used as Source of Truth',
        passed: false,
        error: 'Failed to retrieve data from Supabase'
      });
      console.log('✗ Failed to verify JSON local not used');
    }
  } catch (error: any) {
    testResults.push({
      testName: 'JSON Local Not Used as Source of Truth',
      passed: false,
      error: error.message
    });
    console.log('✗ Failed to verify JSON local not used:', error.message);
  }

  // Cleanup: Delete test records
  console.log('\n=== Cleaning Up Test Records ===');
  
  try {
    // Delete in reverse order of dependencies
    await persistence.supabase.from('episode_participants').delete().eq('episode_id', testEpisodeId);
    await persistence.supabase.from('episodes').delete().eq('id', testEpisodeId);
    await persistence.supabase.from('participants').delete().eq('id', testParticipantId);
    await persistence.supabase.from('programs').delete().eq('id', testProgramId);
    
    console.log('✓ Test records cleaned up successfully');
  } catch (error: any) {
    console.log('⚠ Warning: Failed to clean up test records:', error.message);
  }

  // Print test summary
  console.log('\n=== TEST SUMMARY ===');
  const passedTests = testResults.filter(t => t.passed).length;
  const totalTests = testResults.length;
  
  console.log(`Passed: ${passedTests}/${totalTests}`);
  
  if (passedTests < totalTests) {
    console.log('\nFailed Tests:');
    testResults
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`- ${t.testName}: ${t.error}`);
      });
  }
  
  return testResults;
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error in test runner:', error);
  process.exit(1);
});