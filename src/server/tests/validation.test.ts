// Simple validation script to test the saveShow method mapping logic
import { SupabasePersistence } from '../supabasePersistence';

// Create a mock supabase object to capture the upsert call
const mockSupabase = {
  from: (table: string) => {
    if (table === 'programs') {
      return {
        upsert: (data: any, options: any) => {
          // Store the data for inspection
          mockSupabase.lastUpsertData = data;
          mockSupabase.lastUpsertOptions = options;
          return { error: null };
        }
      };
    }
    if (table === 'cameras') {
      return {
        delete: () => ({
          eq: () => ({
            insert: () => ({ error: null })
          })
        })
      };
    }
    return {
      upsert: () => ({ error: null }),
      delete: () => ({ error: null })
    };
  }
};

// Mock the getSupabaseAdmin function to return our mock
const originalModule = require('./supabase');
(mockSupabase as any).originalGetSupabaseAdmin = originalModule.getSupabaseAdmin;

// Override the getSupabaseAdmin function
const mockGetSupabaseAdmin = () => mockSupabase;

// Temporarily replace the module's export
jest.mock('./supabase', () => ({
  getSupabaseAdmin: mockGetSupabaseAdmin
}));

// Re-import the module to get the mocked version
jest.mock('../supabasePersistence', () => {
  const actualSupabasePersistence = jest.requireActual('../supabasePersistence');
  return {
    SupabasePersistence: class extends actualSupabasePersistence.SupabasePersistence {
      constructor() {
        // Call the parent constructor but override the supabase property
        super();
        (this as any).supabase = mockSupabase;
      }
    }
  };
});

import { SupabasePersistence } from '../supabasePersistence';

describe('SupabasePersistence Field Mapping Validation', () => {
  let persistence: SupabasePersistence;

  beforeEach(() => {
    persistence = new SupabasePersistence();
    // Clear mock data
    mockSupabase.lastUpsertData = null;
    mockSupabase.lastUpsertOptions = null;
  });

  test('should map defaultEpisodeDurationMinutes correctly when provided', () => {
    const program = {
      id: 'test-id',
      title: 'Test Show',
      description: 'Test Description',
      host: 'Test Host',
      format: 'Entrevista',
      defaultDurationMin: 30,
      defaultEpisodeDurationMinutes: 45, // Should be used
      defaultPresenterName: 'Test Presenter',
      defaultSegments: { segment1: 'value1' },
      standardSegments: { segment2: 'value2' },
      targetAudience: 'Adults',
      tone: 'Informative',
      editorialStyle: 'Test Style',
      scenario: 'Test Scenario',
      cameras: [],
      standardStructure: [],
      defaultOpening: 'Opening',
      defaultClosing: 'Closing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Call the method
    persistence.saveProgram(program).catch(() => {}); // We don't await because we're checking the mock

    // Check that the correct value was used
    expect(mockSupabase.lastUpsertData.default_episode_duration_minutes).toBe(45);
  });

    test('should fallback to defaultDurationMin when defaultEpisodeDurationMinutes is not provided', () => {
     const program = {
       id: 'test-id',
       title: 'Test Show',
       description: 'Test Description',
       host: 'Test Host',
       format: 'Entrevista',
       defaultDurationMin: 30,
       // defaultEpisodeDurationMinutes is not provided - should fallback to 30
       defaultPresenterName: 'Test Presenter',
       defaultSegments: { segment1: 'value1' },
       standardSegments: { segment2: 'value2' },
       targetAudience: 'Adults',
       tone: 'Informative',
       editorialStyle: 'Test Style',
       scenario: 'Test Scenario',
       cameras: [],
       standardStructure: [],
       defaultOpening: 'Opening',
       defaultClosing: 'Closing',
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

     // Call the method
     persistence.saveProgram(program).catch(() => {});

     // Check that the fallback value was used
     expect(mockSupabase.lastUpsertData.default_episode_duration_minutes).toBe(30);
   });

    test('should map defaultPresenterName correctly when provided', () => {
     const program = {
       id: 'test-id',
       title: 'Test Show',
       description: 'Test Description',
       host: 'Test Host',
       format: 'Entrevista',
       defaultDurationMin: 30,
       defaultEpisodeDurationMinutes: 45,
       defaultPresenterName: 'Custom Presenter', // Should be used
       defaultSegments: { segment1: 'value1' },
       standardSegments: { segment2: 'value2' },
       targetAudience: 'Adults',
       tone: 'Informative',
       editorialStyle: 'Test Style',
       scenario: 'Test Scenario',
       cameras: [],
       standardStructure: [],
       defaultOpening: 'Opening',
       defaultClosing: 'Closing',
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

     // Call the method
     persistence.saveProgram(program).catch(() => {});

     // Check that the correct value was used
     expect(mockSupabase.lastUpsertData.default_presenter_name).toBe('Custom Presenter');
   });

    test('should fallback to host when defaultPresenterName is not provided', () => {
     const program = {
       id: 'test-id',
       title: 'Test Show',
       description: 'Test Description',
       host: 'Test Host', // Should be used as fallback
       format: 'Entrevista',
       defaultDurationMin: 30,
       defaultEpisodeDurationMinutes: 45,
       // defaultPresenterName is not provided - should fallback to host
       defaultSegments: { segment1: 'value1' },
       standardSegments: { segment2: 'value2' },
       targetAudience: 'Adults',
       tone: 'Informative',
       editorialStyle: 'Test Style',
       scenario: 'Test Scenario',
       cameras: [],
       standardStructure: [],
       defaultOpening: 'Opening',
       defaultClosing: 'Closing',
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

     // Call the method
     persistence.saveProgram(program).catch(() => {});

     // Check that the fallback value was used
     expect(mockSupabase.lastUpsertData.default_presenter_name).toBe('Test Host');
   });

    test('should map defaultSegments correctly when provided', () => {
     const program = {
       id: 'test-id',
       title: 'Test Show',
       description: 'Test Description',
       host: 'Test Host',
       format: 'Entrevista',
       defaultDurationMin: 30,
       defaultEpisodeDurationMinutes: 45,
       defaultPresenterName: 'Test Presenter',
       defaultSegments: { news: 'value1', weather: 'value2' }, // Should be used
       standardSegments: { segment2: 'value2' },
       targetAudience: 'Adults',
       tone: 'Informative',
       editorialStyle: 'Test Style',
       scenario: 'Test Scenario',
       cameras: [],
       standardStructure: [],
       defaultOpening: 'Opening',
       defaultClosing: 'Closing',
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

     // Call the method
     persistence.saveProgram(program).catch(() => {});

     // Check that the correct value was used
     expect(mockSupabase.lastUpsertData.default_segments).toEqual({ news: 'value1', weather: 'value2' });
   });

    test('should fallback to empty object when defaultSegments is not provided', () => {
     const program = {
       id: 'test-id',
       title: 'Test Show',
       description: 'Test Description',
       host: 'Test Host',
       format: 'Entrevista',
       defaultDurationMin: 30,
       defaultEpisodeDurationMinutes: 45,
       defaultPresenterName: 'Test Presenter',
       // defaultSegments is not provided - should fallback to {}
       standardSegments: { segment2: 'value2' },
       targetAudience: 'Adults',
       tone: 'Informative',
       editorialStyle: 'Test Style',
       scenario: 'Test Scenario',
       cameras: [],
       standardStructure: [],
       defaultOpening: 'Opening',
       defaultClosing: 'Closing',
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

     // Call the method
     persistence.saveProgram(program).catch(() => {});

     // Check that the fallback value was used
     expect(mockSupabase.lastUpsertData.default_segments).toEqual({});
   });

    test('should map standardSegments correctly when provided', () => {
     const program = {
       id: 'test-id',
       title: 'Test Show',
       description: 'Test Description',
       host: 'Test Host',
       format: 'Entrevista',
       defaultDurationMin: 30,
       defaultEpisodeDurationMinutes: 45,
       defaultPresenterName: 'Test Presenter',
       defaultSegments: { segment1: 'value1' },
       standardSegments: { intro: 'value1', discussion: 'value2' }, // Should be used
       targetAudience: 'Adults',
       tone: 'Informative',
       editorialStyle: 'Test Style',
       scenario: 'Test Scenario',
       cameras: [],
       standardStructure: [],
       defaultOpening: 'Opening',
       defaultClosing: 'Closing',
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

     // Call the method
     persistence.saveProgram(program).catch(() => {});

     // Check that the correct value was used
     expect(mockSupabase.lastUpsertData.standard_segments).toEqual({ intro: 'value1', discussion: 'value2' });
   });

    test('should fallback to empty object when standardSegments is not provided', () => {
     const program = {
       id: 'test-id',
       title: 'Test Show',
       description: 'Test Description',
       host: 'Test Host',
       format: 'Entrevista',
       defaultDurationMin: 30,
       defaultEpisodeDurationMinutes: 45,
       defaultPresenterName: 'Test Presenter',
       defaultSegments: { segment1: 'value1' },
       // standardSegments is not provided - should fallback to {}
       targetAudience: 'Adults',
       tone: 'Informative',
       editorialStyle: 'Test Style',
       scenario: 'Test Scenario',
       cameras: [],
       standardStructure: [],
       defaultOpening: 'Opening',
       defaultClosing: 'Closing',
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

     // Call the method
     persistence.saveProgram(program).catch(() => {});

     // Check that the fallback value was used
     expect(mockSupabase.lastUpsertData.standard_segments).toEqual({});
   });

    test('should map targetAudience correctly when provided', () => {
     const program = {
       id: 'test-id',
       title: 'Test Show',
       description: 'Test Description',
       host: 'Test Host',
       format: 'Entrevista',
       defaultDurationMin: 30,
       defaultEpisodeDurationMinutes: 45,
       defaultPresenterName: 'Test Presenter',
       defaultSegments: { segment1: 'value1' },
       standardSegments: { segment2: 'value2' },
       targetAudience: 'Women 25-40', // Should be used
       tone: 'Informative',
       editorialStyle: 'Test Style',
       scenario: 'Test Scenario',
       cameras: [],
       standardStructure: [],
       defaultOpening: 'Opening',
       defaultClosing: 'Closing',
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

     // Call the method
     persistence.saveProgram(program).catch(() => {});

     // Check that the correct value was used
     expect(mockSupabase.lastUpsertData.target_audience).toBe('Women 25-40');
   });

    test('should fallback to null when targetAudience is not provided', () => {
     const program = {
       id: 'test-id',
       title: 'Test Show',
       description: 'Test Description',
       host: 'Test Host',
       format: 'Entrevista',
       defaultDurationMin: 30,
       defaultEpisodeDurationMinutes: 45,
       defaultPresenterName: 'Test Presenter',
       defaultSegments: { segment1: 'value1' },
       standardSegments: { segment2: 'value2' },
       // targetAudience is not provided - should fallback to null
       tone: 'Informative',
       editorialStyle: 'Test Style',
       scenario: 'Test Scenario',
       cameras: [],
       standardStructure: [],
       defaultOpening: 'Opening',
       defaultClosing: 'Closing',
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

     // Call the method
     persistence.saveProgram(program).catch(() => {});

     // Check that the fallback value was used
     expect(mockSupabase.lastUpsertData.target_audience).toBeNull();
   });

    test('should map tone correctly when provided', () => {
     const program = {
       id: 'test-id',
       title: 'Test Show',
       description: 'Test Description',
       host: 'Test Host',
       format: 'Entrevista',
       defaultDurationMin: 30,
       defaultEpisodeDurationMinutes: 45,
       defaultPresenterName: 'Test Presenter',
       defaultSegments: { segment1: 'value1' },
       standardSegments: { segment2: 'value2' },
       targetAudience: 'Adults',
       tone: 'Conversational', // Should be used
       editorialStyle: 'Test Style',
       scenario: 'Test Scenario',
       cameras: [],
       standardStructure: [],
       defaultOpening: 'Opening',
       defaultClosing: 'Closing',
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

     // Call the method
     persistence.saveProgram(program).catch(() => {});

     // Check that the correct value was used
     expect(mockSupabase.lastUpsertData.tone).toBe('Conversational');
   });

    test('should fallback to null when tone is not provided', () => {
     const program = {
       id: 'test-id',
       title: 'Test Show',
       description: 'Test Description',
       host: 'Test Host',
       format: 'Entrevista',
       defaultDurationMin: 30,
       defaultEpisodeDurationMinutes: 45,
       defaultPresenterName: 'Test Presenter',
       defaultSegments: { segment1: 'value1' },
       standardSegments: { segment2: 'value2' },
       targetAudience: 'Adults',
       // tone is not provided - should fallback to null
       editorialStyle: 'Test Style',
       scenario: 'Test Scenario',
       cameras: [],
       standardStructure: [],
       defaultOpening: 'Opening',
       defaultClosing: 'Closing',
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

     // Call the method
     persistence.saveProgram(program).catch(() => {});

     // Check that the fallback value was used
     expect(mockSupabase.lastUpsertData.tone).toBeNull();
   });
});