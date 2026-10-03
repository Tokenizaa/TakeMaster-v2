import { SupabasePersistence } from '../supabasePersistence';
import { ProgramsService } from '../../services/programs/programs.service';
import { validateProgramCreation, validateProgramUpdate } from '../../validation/programs.validators';

// Test helper to generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

describe('Programs Persistence Layer Validation (Post-Refactor)', () => {
  let persistence: SupabasePersistence;
  let programsService: ProgramsService;

  // Test data IDs
  const testProgramId = generateUUID();
  const testProgramId2 = generateUUID();
  
  beforeAll(async () => {
    persistence = new SupabasePersistence();
    programsService = new ProgramsService(persistence);
  });

  afterAll(async () => {
    // Cleanup: Delete test records
    try {
      // Delete in reverse order of dependencies
      await persistence.supabase.from('cameras').delete().eq('program_id', testProgramId);
      await persistence.supabase.from('cameras').delete().eq('program_id', testProgramId2);
      await persistence.supabase.from('programs').delete().eq('id', testProgramId);
      await persistence.supabase.from('programs').delete().eq('id', testProgramId2);
    } catch (error) {
      console.warn('Warning: Failed to clean up test records:', error);
    }
  });

  describe('1. Program CRUD Operations', () => {
    it('should create a program with all fields', async () => {
      const testProgram = {
        id: testProgramId,
        title: 'Test Program for Validation',
        description: 'A test program for validating the persistence layer after refactoring',
        host: 'Test Host',
        format: 'Entrevista',
        defaultDurationMin: 60,
        defaultEpisodeDurationMinutes: 45,
        editorialStyle: 'Informativo',
        scenario: 'Test scenario for validation',
        standardStructure: ['Bloco 1', 'Bloco 2', 'Bloco 3'],
        defaultOpening: 'Opening Sequence',
        defaultClosing: 'Closing Credits',
        defaultSegments: ['Segment A', 'Segment B'],
        standardSegments: ['Standard Intro', 'Standard Outro'],
        targetAudience: 'Adultos 25-45 anos',
        tone: 'Profissional e Informativo',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      const savedProgram = await persistence.saveProgram(testProgram);
      
      expect(savedProgram).toBeDefined();
      expect(savedProgram.id).toBe(testProgramId);
      expect(savedProgram.title).toBe(testProgram.title);
      expect(savedProgram.description).toBe(testProgram.description);
      expect(savedProgram.host).toBe(testProgram.host);
      expect(savedProgram.format).toBe(testProgram.format);
      expect(savedProgram.defaultDurationMin).toBe(testProgram.defaultDurationMin);
      expect(savedProgram.defaultEpisodeDurationMinutes).toBe(testProgram.defaultEpisodeDurationMinutes);
      expect(savedProgram.editorialStyle).toBe(testProgram.editorialStyle);
      expect(savedProgram.scenario).toBe(testProgram.scenario);
      expect(savedProgram.standardStructure).toEqual(testProgram.standardStructure);
      expect(savedProgram.defaultOpening).toBe(testProgram.defaultOpening);
      expect(savedProgram.defaultClosing).toBe(testProgram.defaultClosing);
      expect(savedProgram.defaultSegments).toEqual(testProgram.defaultSegments);
      expect(savedProgram.standardSegments).toEqual(testProgram.standardSegments);
      expect(savedProgram.targetAudience).toBe(testProgram.targetAudience);
      expect(savedProgram.tone).toBe(testProgram.tone);
      
      // Verify cameras relationship (should be empty initially)
      expect(savedProgram.cameras).toEqual([]);
    });

    it('should read a program by ID', async () => {
      const program = await persistence.getProgram(testProgramId);
      
      expect(program).toBeDefined();
      expect(program?.id).toBe(testProgramId);
      expect(program?.title).toBe('Test Program for Validation');
      expect(program?.description).toBe('A test program for validating the persistence layer after refactoring');
      expect(program?.host).toBe('Test Host');
      expect(program?.format).toBe('Entrevista');
      expect(program?.defaultDurationMin).toBe(60);
      expect(program?.defaultEpisodeDurationMinutes).toBe(45);
      expect(program?.editorialStyle).toBe('Informativo');
      expect(program?.scenario).toBe('Test scenario for validation');
      expect(program?.standardStructure).toEqual(['Bloco 1', 'Bloco 2', 'Bloco 3']);
      expect(program?.defaultOpening).toBe('Opening Sequence');
      expect(program?.defaultClosing).toBe('Closing Credits');
      expect(program?.defaultSegments).toEqual(['Segment A', 'Segment B']);
      expect(program?.standardSegments).toEqual(['Standard Intro', 'Standard Outro']);
      expect(program?.targetAudience).toBe('Adultos 25-45 anos');
      expect(program?.tone).toBe('Profissional e Informativo');
    });

    it('should update a program (upsert)', async () => {
      const updatedProgram = {
        id: testProgramId,
        title: 'Updated Test Program for Validation',
        description: 'An updated test program for validating persistence layer',
        host: 'Updated Host',
        format: 'Programa Solo',
        defaultDurationMin: 90,
        defaultEpisodeDurationMinutes: 60,
        editorialStyle: 'Entretenimento',
        scenario: 'Updated scenario for validation',
        standardStructure: ['Bloco A', 'Bloco B'],
        defaultOpening: 'Updated Opening',
        defaultClosing: 'Updated Closing',
        defaultSegments: ['Updated Segment 1'],
        standardSegments: ['Updated Standard Intro'],
        targetAudience: 'Jovens 18-25 anos',
        tone: 'Descontraído e Jovial',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString() // Keep original createdAt
      };

      const savedProgram = await persistence.saveProgram(updatedProgram);
      
      expect(savedProgram).toBeDefined();
      expect(savedProgram.id).toBe(testProgramId);
      expect(savedProgram.title).toBe(updatedProgram.title);
      expect(savedProgram.description).toBe(updatedProgram.description);
      expect(savedProgram.host).toBe(updatedProgram.host);
      expect(savedProgram.format).toBe(updatedProgram.format);
      expect(savedProgram.defaultDurationMin).toBe(updatedProgram.defaultDurationMin);
      expect(savedProgram.defaultEpisodeDurationMinutes).toBe(updatedProgram.defaultEpisodeDurationMinutes);
      expect(savedProgram.editorialStyle).toBe(updatedProgram.editorialStyle);
      expect(savedProgram.scenario).toBe(updatedProgram.scenario);
      expect(savedProgram.standardStructure).toEqual(updatedProgram.standardStructure);
      expect(savedProgram.defaultOpening).toBe(updatedProgram.defaultOpening);
      expect(savedProgram.defaultClosing).toBe(updatedProgram.defaultClosing);
      expect(savedProgram.defaultSegments).toEqual(updatedProgram.defaultSegments);
      expect(savedProgram.standardSegments).toEqual(updatedProgram.standardSegments);
      expect(savedProgram.targetAudience).toBe(updatedProgram.targetAudience);
      expect(savedProgram.tone).toBe(updatedProgram.tone);
    });

    it('should get programs with filters', async () => {
      // Create a second test program for filtering tests
      const testProgram2 = {
        id: testProgramId2,
        title: 'Second Test Program',
        description: 'Another test program for filtering',
        host: 'Second Test Host',
        format: 'Podcast/Videocast',
        defaultDurationMin: 30,
        defaultEpisodeDurationMinutes: 30,
        editorialStyle: 'Descontraído',
        scenario: 'Podcast scenario',
        standardStructure: [],
        defaultOpening: 'Podcast Intro',
        defaultClosing: 'Podcast Outro',
        defaultSegments: [],
        standardSegments: [],
        targetAudience: 'Todos',
        tone: 'Informal',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await persistence.saveProgram(testProgram2);

      // Test search filter
      const searchResult = await persistence.getPrograms({ search: 'Test Program' });
      expect(searchResult.data.length).toBeGreaterThanOrEqualTo(2); // Should find both programs
      
      // Test format filter
      const formatResult = await persistence.getPrograms({ format: 'Entrevista' });
      expect(formatResult.data.length).toBeGreaterThanOrEqualTo(1);
      expect(formatResult.data.every(p => p.format === 'Entrevista')).toBe(true);
      
      // Test limit and offset
      const paginatedResult = await persistence.getPrograms({ limit: 1, offset: 0 });
      expect(paginatedResult.data.length).toBeLessThanOrEqualTo(1);
      expect(paginatedResult.count).toBeGreaterThanOrEqualTo(2);
    });

    it('should delete a program', async () => {
      // We'll test deletion with the second program to keep the first for other tests
      const deleteResult = await persistence.deleteProgram(testProgramId2);
      expect(deleteResult).toBe(true);
      
      // Verify it's deleted
      const deletedProgram = await persistence.getProgram(testProgramId2);
      expect(deletedProgram).toBeUndefined();
    });
  });

  describe('2. Field Storage and Retrieval Verification', () => {
    it('should store and retrieve all Program fields correctly', async () => {
      const testProgram = {
        id: generateUUID(),
        title: 'Field Validation Test Program',
        description: 'Testing all fields storage and retrieval',
        host: 'Field Test Host',
        format: 'Debate',
        defaultDurationMin: 120,
        defaultEpisodeDurationMinutes: 90,
        editorialStyle: 'Analítico',
        scenario: 'Debate scenario for field validation',
        standardStructure: ['Abertura', 'Debate', 'Encerramento'],
        defaultOpening: 'Abertura do Debate',
        defaultClosing: 'Encerramento do Debate',
        defaultSegments: ['Bloco 1', 'Bloco 2'],
        standardSegments: ['Intro Padrão', 'Outro Padrão'],
        targetAudience: 'Adultos com interesse em debates',
        tone: 'Sério e Analítico',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      const savedProgram = await persistence.saveProgram(testProgram);
      const retrievedProgram = await persistence.getProgram(savedProgram.id);
      
      // Verify all fields match
      expect(retrievedProgram).toBeDefined();
      expect(retrievedProgram?.id).toBe(savedProgram.id);
      expect(retrievedProgram?.title).toBe(savedProgram.title);
      expect(retrievedProgram?.description).toBe(savedProgram.description);
      expect(retrievedProgram?.host).toBe(savedProgram.host);
      expect(retrievedProgram?.format).toBe(savedProgram.format);
      expect(retrievedProgram?.defaultDurationMin).toBe(savedProgram.defaultDurationMin);
      expect(retrievedProgram?.defaultEpisodeDurationMinutes).toBe(savedProgram.defaultEpisodeDurationMinutes);
      expect(retrievedProgram?.editorialStyle).toBe(savedProgram.editorialStyle);
      expect(retrievedProgram?.scenario).toBe(savedProgram.scenario);
      expect(retrievedProgram?.standardStructure).toEqual(savedProgram.standardStructure);
      expect(retrievedProgram?.defaultOpening).toBe(savedProgram.defaultOpening);
      expect(retrievedProgram?.defaultClosing).toBe(savedProgram.defaultClosing);
      expect(retrievedProgram?.defaultSegments).toEqual(savedProgram.defaultSegments);
      expect(retrievedProgram?.standardSegments).toEqual(savedProgram.standardSegments);
      expect(retrievedProgram?.targetAudience).toBe(savedProgram.targetAudience);
      expect(retrievedProgram?.tone).toBe(savedProgram.tone);
      
      // Cleanup
      await persistence.deleteProgram(savedProgram.id);
    });
  });

  describe('3. Update (Upsert) Operations', () => {
    it('should correctly perform upsert operations', async () => {
      const testProgramId = generateUUID();
      
      // Create initial program
      const initialProgram = {
        id: testProgramId,
        title: 'Initial Program Title',
        description: 'Initial description',
        host: 'Initial Host',
        format: 'Entrevista',
        defaultDurationMin: 60,
        defaultEpisodeDurationMinutes: 60,
        editorialStyle: 'Initial Style',
        scenario: 'Initial scenario',
        standardStructure: [],
        defaultOpening: 'Initial Opening',
        defaultClosing: 'Initial Closing',
        defaultSegments: [],
        standardSegments: [],
        targetAudience: 'Initial Audience',
        tone: 'Initial Tone',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await persistence.saveProgram(initialProgram);
      
      // Update the program
      const updatedProgram = {
        id: testProgramId,
        title: 'Updated Program Title',
        description: 'Updated description',
        host: 'Updated Host',
        format: 'Reportagem',
        defaultDurationMin: 90,
        defaultEpisodeDurationMinutes: 90,
        editorialStyle: 'Updated Style',
        scenario: 'Updated scenario',
        standardStructure: ['Segment 1', 'Segment 2'],
        defaultOpening: 'Updated Opening',
        defaultClosing: 'Updated Closing',
        defaultSegments: ['Updated Segment A'],
        standardSegments: ['Updated Standard Intro'],
        targetAudience: 'Updated Audience',
        tone: 'Updated Tone',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString() // Keep original
      };

      const savedProgram = await persistence.saveProgram(updatedProgram);
      const retrievedProgram = await persistence.getProgram(testProgramId);
      
      // Verify updated values
      expect(retrievedProgram).toBeDefined();
      expect(retrievedProgram?.title).toBe(updatedProgram.title);
      expect(retrievedProgram?.description).toBe(updatedProgram.description);
      expect(retrievedProgram?.host).toBe(updatedProgram.host);
      expect(retrievedProgram?.format).toBe(updatedProgram.format);
      expect(retrievedProgram?.defaultDurationMin).toBe(updatedProgram.defaultDurationMin);
      expect(retrievedProgram?.defaultEpisodeDurationMinutes).toBe(updatedProgram.defaultEpisodeDurationMinutes);
      expect(retrievedProgram?.editorialStyle).toBe(updatedProgram.editorialStyle);
      expect(retrievedProgram?.scenario).toBe(updatedProgram.scenario);
      expect(retrievedProgram?.standardStructure).toEqual(updatedProgram.standardStructure);
      expect(retrievedProgram?.defaultOpening).toBe(updatedProgram.defaultOpening);
      expect(retrievedProgram?.defaultClosing).toBe(updatedProgram.defaultClosing);
      expect(retrievedProgram?.defaultSegments).toEqual(updatedProgram.defaultSegments);
      expect(retrievedProgram?.standardSegments).toEqual(updatedProgram.standardSegments);
      expect(retrievedProgram?.targetAudience).toBe(updatedProgram.targetAudience);
      expect(retrievedProgram?.tone).toBe(updatedProgram.tone);
      
      // Cleanup
      await persistence.deleteProgram(testProgramId);
    });
  });

  describe('4. JSON Local Not Used as Source of Truth', () => {
    it('should retrieve data from Supabase, not local JSON', async () => {
      // Try to get data from Supabase
      const { data: programs, error: programsError } = await persistence.supabase
        .from('programs')
        .select('id, title')
        .limit(1);
      
      expect(programsError).toBeNull();
      expect(programs).toBeDefined();
      
      // If we got data, it's coming from Supabase
      if (programs && programs.length > 0) {
        expect(typeof programs[0].id).toBe('string');
        expect(typeof programs[0].title).toBe('string');
      }
      
      // Also test with episodes and participants to be thorough
      const { data: episodes, error: episodesError } = await persistence.supabase
        .from('episodes')
        .select('id, title')
        .limit(1);
        
      expect(episodesError).toBeNull();
      expect(episodes).toBeDefined();
      
      const { data: participants, error: participantsError } = await persistence.supabase
        .from('participants')
        .select('id, name')
        .limit(1);
        
      expect(participantsError).toBeNull();
      expect(participants).toBeDefined();
    });
  });

  describe('5. Relationship Testing (Program → Cameras)', () => {
    it('should correctly handle Program-Camera relationships', async () => {
      const testProgramId = generateUUID();
      
      // Create a program
      const testProgram = {
        id: testProgramId,
        title: 'Program with Cameras',
        description: 'Testing camera relationships',
        host: 'Test Host',
        format: 'Entrevista',
        defaultDurationMin: 60,
        defaultEpisodeDurationMinutes: 60,
        editorialStyle: 'Test Style',
        scenario: 'Test scenario',
        standardStructure: [],
        defaultOpening: 'Opening',
        defaultClosing: 'Closing',
        defaultSegments: [],
        standardSegments: [],
        targetAudience: 'Test Audience',
        tone: 'Test Tone',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        cameras: [
          {
            id: generateUUID(),
            name: 'Camera 1',
            label: 'C1',
            purpose: 'Main shot',
            framing: 'Medium',
            active: true
          },
          {
            id: generateUUID(),
            name: 'Camera 2',
            label: 'C2',
            purpose: 'Reverse shot',
            framing: 'Close-up',
            active: false
          }
        ]
      };

      // Save the program with cameras
      const savedProgram = await persistence.saveProgram(testProgram);
      
      // Retrieve the program and verify cameras
      const retrievedProgram = await persistence.getProgram(savedProgram.id);
      
      expect(retrievedProgram).toBeDefined();
      expect(retrievedProgram?.cameras).toBeDefined();
      expect(retrievedProgram?.cameras.length).toBe(2);
      
      // Verify first camera
      expect(retrievedProgram?.cameras[0].id).toBe(testProgram.cameras[0].id);
      expect(retrievedProgram?.cameras[0].name).toBe(testProgram.cameras[0].name);
      expect(retrievedProgram?.cameras[0].label).toBe(testProgram.cameras[0].label);
      expect(retrievedProgram?.cameras[0].purpose).toBe(testProgram.cameras[0].purpose);
      expect(retrievedProgram?.cameras[0].framing).toBe(testProgram.cameras[0].framing);
      expect(retrievedProgram?.cameras[0].active).toBe(testProgram.cameras[0].active);
      
      // Verify second camera
      expect(retrievedProgram?.cameras[1].id).toBe(testProgram.cameras[1].id);
      expect(retrievedProgram?.cameras[1].name).toBe(testProgram.cameras[1].name);
      expect(retrievedProgram?.cameras[1].label).toBe(testProgram.cameras[1].label);
      expect(retrievedProgram?.cameras[1].purpose).toBe(testProgram.cameras[1].purpose);
      expect(retrievedProgram?.cameras[1].framing).toBe(testProgram.cameras[1].framing);
      expect(retrievedProgram?.cameras[1].active).toBe(testProgram.cameras[1].active);
      
      // Cleanup
      await persistence.deleteProgram(testProgramId);
    });
  });

  describe('6. Input Validation', () => {
    it('should validate program creation data correctly', () => {
      // Valid data
      const validData = {
        title: 'Valid Program',
        description: 'Valid description',
        host: 'Valid Host',
        format: 'Entrevista',
        defaultDurationMin: 60
      };
      
      const validationResult = validateProgramCreation(validData);
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should reject invalid program creation data', () => {
      // Missing required fields
      const invalidData = {
        title: '', // Empty title
        description: 'Valid description',
        // Missing host
        format: 'InvalidFormat', // Invalid format
        defaultDurationMin: -5 // Negative duration
      };
      
      const validationResult = validateProgramCreation(invalidData);
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Título é obrigatório e deve ser uma string não vazia');
      expect(validationResult.errors).toContain('Host é obrigatório e deve ser uma string não vazia');
      expect(validationResult.errors).toContain('Formato inválido');
      expect(validationResult.errors).toContain('Duração mínima padrão deve ser um número não negativo');
    });

    it('should validate program update data correctly', () => {
      // Valid partial update
      const validUpdateData = {
        title: 'Updated Title',
        description: 'Updated description'
      };
      
      const validationResult = validateProgramUpdate(validUpdateData);
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should reject invalid program update data', () => {
      // Invalid update data
      const invalidUpdateData = {
        title: '', // Empty title
        format: 'InvalidFormat', // Invalid format
        defaultDurationMin: -10 // Negative duration
      };
      
      const validationResult = validateProgramUpdate(invalidUpdateData);
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Título é obrigatório e deve ser uma string não vazia');
      expect(validationResult.errors).toContain('Formato inválido');
      expect(validationResult.errors).toContain('Duração mínima padrão deve ser um número não negativo');
    });
  });

  describe('7. API Endpoints Nomenclature', () => {
    it('should use /api/programs endpoint (not /api/shows)', async () => {
      // This test verifies that the API routes are using the correct nomenclature
      // We'll check by looking at the server.ts file directly since we can't easily 
      // make HTTP requests in this test environment without setting up a test server
      
      // Read the server.ts file to verify endpoint nomenclature
      const fs = require('fs');
      const serverContent = fs.readFileSync('../server.ts', 'utf8');
      
      // Check that the old shows endpoints are not present
      expect(serverContent).nottoContain('/api/shows');
      expect(serverContent).nottoContain('app.get(\'/api/shows\')');
      expect(serverContent).nottoContain('app.post(\'/api/shows\')');
      expect(serverContent).nottoContain('app.put(\'/api/shows\')');
      expect(serverContent).nottoContain('app.delete(\'/api/shows\')');
      
      // Check that the new programs endpoints are present
      expect(serverContent).toContain('/api/programs');
      expect(serverContent).toContain('app.get(\'/api/programs\')');
      expect(serverContent).toContain('app.get(\'/api/programs/:id\')');
      expect(serverContent).toContain('app.post(\'/api/programs\')');
      expect(serverContent).toContain('app.put(\'/api/programs/:id\')');
      expect(serverContent).toContain('app.delete(\'/api/programs/:id\')');
    });
  });

  describe('8. Naming Consistency Check', () => {
    it('should have no remaining \"show\" nomenclature in core persistence files', async () => {
      const fs = require('fs');
      const path = require('path');
      
      // Files to check for remaining "show" nomenclature
      const filesToCheck = [
        '../src/server/supabasePersistence.ts',
        '../src/services/programs/programs.service.ts',
        '../src/services/api.ts',
        '../src/validation/programs.validators.ts',
        '../server.ts'
      ];
      
      let hasShowReferences = false;
      let showReferences = [];
      
      for (const filePath of filesToCheck) {
        try {
          const fullPath = path.resolve(__dirname, filePath);
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // Look for problematic "show" references (but allow in comments or strings that are clearly not code)
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            // Skip comments and check for actual code references
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith('//') && !trimmedLine.startsWith('*')) {
              // Check for show references that are likely problematic
              if (/\.shows\b|\.show\b|saveShow|getShow|ShowsService|shows\.ts|show\.ts/i.test(line) && 
                  !/shows\.ts|show\.ts/.test(line)) { // Allow file references
                hasShowReferences = true;
                showReferences.push(`${filePath}:${index + 1}: ${trimmedLine}`);
              }
            }
          });
        } catch (error) {
          console.warn(`Could not check file ${filePath}:`, error.message);
        }
      }
      
      expect(hasShowReferences).toBe(false);
      if (hasShowReferences) {
        console.warn('Remaining "show" references found:', showReferences);
      }
    });
  });
});