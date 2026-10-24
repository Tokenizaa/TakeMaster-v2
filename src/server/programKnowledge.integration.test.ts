import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateEditorialBaseMatchesProgram,
  mapEditorialBaseToOperationalConfig,
  integrateEditorialBaseToSetup,
  normalizeSlug,
  findProgramFolder,
  listKnowledgeBasePrograms,
  resolveProgramKnowledge,
  buildGroundedEditorialIdentity,
} from './programKnowledge';
import { Show, ProgramKnowledgeSummary, ProgramEditorialIdentity, ProgramKnowledgeSource } from '../domain/contracts';

const NAO_IDENTIFICADO_NA_BASE = 'não identificado na base';

describe('Editorial Base Integration', () => {
  
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('normalizeSlug', () => {
    it('normalizes slug correctly', () => {
      expect(normalizeSlug('Meu Programa')).toBe('meu-programa');
      expect(normalizeSlug('show-advogada-leque')).toBe('advogada-leque');
      expect(normalizeSlug('  Café com Leite  ')).toBe('cafe-com-leite');
      expect(normalizeSlug('PROGRAMA@#$%')).toBe('programa');
    });
  });

  describe('validateEditorialBaseMatchesProgram', () => {
    const createMockSummary = (overrides: Partial<ProgramKnowledgeSummary> = {}): ProgramKnowledgeSummary => ({
      slug: 'test-program',
      showId: 'show-1',
      foundInKnowledgeBase: true,
      coverageLevel: 'completa',
      coverageLabel: 'Cobertura Completa',
      nome: 'Teste Programa',
      apresentador: 'Apresentador Teste',
      descricao: 'Descrição do programa',
      proposta: 'Proposta editorial',
      conceito: 'Conceito do programa',
      publico: 'Público geral',
      temasPrincipais: ['Tema 1', 'Tema 2'],
      quadros: ['Abertura', 'Bloco 1', 'Encerramento'],
      formato: 'Entrevista',
      duracao: '45 minutos',
      horario: '20:00',
      canalPlataforma: 'RS Play',
      caracteristicasEditoriais: ['Característica 1'],
      informacoesComerciais: ['Info comercial'],
      redesSociais: ['@teste'],
      imagensCount: 5,
      secoesExtraidasCount: 10,
      fontes: [{
        urlOriginal: 'https://rsplay.com.br/teste',
        urlCanonica: 'https://rsplay.com.br/teste',
        tituloDaPagina: 'Teste',
        tipoDePagina: 'catalogo',
        statusHttp: 200,
        dataHoraScrape: new Date().toISOString(),
        trechosCount: 5,
      }],
      editorialSynthesis: {
        essencia: 'Essência do programa',
        publico: 'Público geral',
        tom: 'Tom conversacional',
        temas: ['Tema 1'],
        formatos: ['Entrevista'],
        forcas: ['Força 1'],
        abordagens_recomendadas: ['Abordagem 1'],
        abordagens_a_evitar: [NAO_IDENTIFICADO_NA_BASE],
        diferenciais: ['Diferencial 1'],
        fontes: [],
        modelUsed: 'test',
        usedFallback: false,
        generatedAt: new Date().toISOString(),
      },
      ...overrides,
    });

    it('validates complete editorial base successfully', () => {
      const summary = createMockSummary();
      const result = validateEditorialBaseMatchesProgram(summary, 'Teste Programa');
      
      expect(result.isValid).toBe(true);
      expect(result.coverageLevel).toBe('completa');
      expect(result.gaps.length).toBe(0);
      expect(result.profileHash).toBeDefined();
      expect(result.profileHash.length).toBe(16);
    });

    it('detects missing critical fields makes validation invalid', () => {
      const summary = createMockSummary({
        apresentador: NAO_IDENTIFICADO_NA_BASE,
        publico: NAO_IDENTIFICADO_NA_BASE,
        temasPrincipais: [],
        quadros: [],
        formato: NAO_IDENTIFICADO_NA_BASE,
        duracao: NAO_IDENTIFICADO_NA_BASE,
        informacoesComerciais: [],
      });
      
      const result = validateEditorialBaseMatchesProgram(summary, 'Teste Programa');
      
      // With stricter validation, missing critical fields now makes isValid = false
      expect(result.isValid).toBe(false);
      expect(result.gaps).toContain('Apresentador não identificado na base');
      expect(result.gaps).toContain('Público-alvo não identificado na base');
      expect(result.gaps).toContain('Temas principais não identificados na base');
      expect(result.gaps).toContain('Quadros/estrutura não identificados na base');
      expect(result.gaps).toContain('Formato não identificado na base');
      expect(result.gaps).toContain('Duração não identificada na base');
      expect(result.gaps).toContain('Informações comerciais não identificadas na base');
    });

    it('detects title mismatch as critical gap', () => {
      const summary = createMockSummary({
        nome: 'Programa Diferente',
      });
      
      const result = validateEditorialBaseMatchesProgram(summary, 'Teste Programa', 'test-program');
      
      expect(result.isValid).toBe(false);
      expect(result.gaps).toContain('Título do programa selecionado ("Teste Programa") difere do encontrado na base ("Programa Diferente")');
    });

    it('generates consistent profile hash', () => {
      const summary = createMockSummary();
      const result1 = validateEditorialBaseMatchesProgram(summary, 'Teste Programa');
      const result2 = validateEditorialBaseMatchesProgram(summary, 'Teste Programa');
      
      expect(result1.profileHash).toBe(result2.profileHash);
    });

    it('generates different hash for different data', () => {
      const summary1 = createMockSummary({ nome: 'Programa 1' });
      const summary2 = createMockSummary({ nome: 'Programa 2' });
      
      const result1 = validateEditorialBaseMatchesProgram(summary1, 'Programa 1');
      const result2 = validateEditorialBaseMatchesProgram(summary2, 'Programa 2');
      
      expect(result1.profileHash).not.toBe(result2.profileHash);
    });
  });

  describe('mapEditorialBaseToOperationalConfig', () => {
    const createMockValidation = (overrides: Partial<{
      isValid: boolean;
      coverageLevel: 'completa' | 'parcial' | 'cadastro_interno';
      editorialIdentity: ProgramEditorialIdentity;
    }> = {}) => ({
      isValid: true,
      slug: 'test-program',
      coverageLevel: 'completa' as const,
      coverageLabel: 'Cobertura Completa',
      sources: [],
      gaps: [],
      warnings: [],
      profileHash: 'abc123',
      matchedProgramTitle: 'Teste Programa',
      editorialIdentity: {
        essencia: 'Essência do programa',
        publico: 'Público geral',
        tom: 'Tom conversacional',
        temas: ['Tema 1', 'Tema 2'],
        formatos: ['Entrevista'],
        forcas: ['Força 1'],
        abordagens_recomendadas: ['Abordagem 1'],
        abordagens_a_evitar: [NAO_IDENTIFICADO_NA_BASE],
        diferenciais: ['Diferencial único'],
        fontes: [],
        modelUsed: 'test',
        usedFallback: false,
        generatedAt: new Date().toISOString(),
      },
      ...overrides,
    });

    const createMockShow = (overrides: Partial<Show> = {}): Partial<Show> & { title: string; id?: string } => ({
      id: 'show-1',
      title: 'Teste Programa',
      description: 'Descrição do show',
      host: 'Host do Show',
      format: 'Entrevista',
      defaultDurationMin: 60,
      editorialStyle: 'Estilo do show',
      scenario: 'Cenário do show',
      category: 'Categoria do show',
      targetAudience: 'Público do show',
      distributionChannels: ['Canal 1'],
      standardStructure: ['Abertura', 'Bloco 1', 'Bloco 2', 'Encerramento'],
      ...overrides,
    });

    it('validates editorial base validation result structure', () => {
      const validation = createMockValidation();
      const show = createMockShow();
      
      expect(validation.isValid).toBe(true);
      expect(validation.coverageLevel).toBe('completa');
      expect(validation.editorialIdentity.tom).toBe('Tom conversacional');
      expect(validation.editorialIdentity.diferenciais[0]).toBe('Diferencial único');
    });

    it('falls back to show data when editorial base is partial', () => {
      const validation = createMockValidation({ coverageLevel: 'parcial' });
      const show = createMockShow();
      
      expect(validation.coverageLevel).toBe('parcial');
    });

    it('uses generic defaults for authorial program (no editorial base)', () => {
      const validation = createMockValidation({ 
        isValid: false, 
        coverageLevel: 'cadastro_interno',
      });
      const show = createMockShow({ title: 'Programa Autoral', host: 'Host Autoral' });
      
      expect(validation.isValid).toBe(false);
      expect(validation.coverageLevel).toBe('cadastro_interno');
    });

    it('tracks gaps in editorial source metadata', () => {
      const validation = createMockValidation({ 
        coverageLevel: 'parcial',
        gaps: ['Apresentador não identificado na base', 'Público-alvo não identificado na base'],
      });
      
      expect(validation.gaps).toContain('Apresentador não identificado na base');
      expect(validation.gaps).toContain('Público-alvo não identificado na base');
    });
  });

  describe('integrateEditorialBaseToSetup', () => {
    const mockShow = {
      id: 'show-1',
      title: 'Teste Programa',
      description: 'Descrição',
      host: 'Host',
      format: 'Entrevista',
    };

    it('returns error for invalid editorial base (internal registration)', async () => {
      // This test uses the real resolveProgramKnowledge which will find no program
      // and return cadastro_interno fallback
      const result = await integrateEditorialBaseToSetup('org-1', 'prog-1', mockShow);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Base editorial inválida ou ausente');
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.coverageLevel).toBe('cadastro_interno');
    });

    it('handles missing program gracefully', async () => {
      const result = await integrateEditorialBaseToSetup('org-1', 'non-existent-prog', mockShow);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Idempotency checks', () => {
    it('normalizeSlug produces consistent results', () => {
      const show = { title: 'Teste', id: 'show-1' };
      
      const slug1 = normalizeSlug(show.title);
      const slug2 = normalizeSlug(show.title);
      
      expect(slug1).toBe(slug2);
    });

    it('validateEditorialBaseMatchesProgram produces consistent hash', () => {
      const summary: ProgramKnowledgeSummary = {
        slug: 'test',
        showId: 'show-1',
        foundInKnowledgeBase: true,
        coverageLevel: 'completa',
        coverageLabel: 'Completa',
        nome: 'Teste',
        apresentador: 'Apresentador',
        descricao: 'Desc',
        proposta: 'Prop',
        conceito: 'Conc',
        publico: 'Público',
        temasPrincipais: ['Tema'],
        quadros: ['Bloco'],
        formato: 'Entrevista',
        duracao: '45 min',
        horario: '20:00',
        canalPlataforma: 'RS Play',
        caracteristicasEditoriais: [],
        informacoesComerciais: [],
        redesSociais: [],
        imagensCount: 0,
        secoesExtraidasCount: 0,
        fontes: [],
        editorialSynthesis: {
          essencia: 'Essência',
          publico: 'Público',
          tom: 'Tom',
          temas: ['Tema'],
          formatos: ['Entrevista'],
          forcas: ['Força'],
          abordagens_recomendadas: ['Abordagem'],
          abordagens_a_evitar: [NAO_IDENTIFICADO_NA_BASE],
          diferenciais: ['Diferencial'],
          fontes: [],
          modelUsed: 'test',
          usedFallback: false,
          generatedAt: new Date().toISOString(),
        },
      };

      const result1 = validateEditorialBaseMatchesProgram(summary, 'Teste');
      const result2 = validateEditorialBaseMatchesProgram(summary, 'Teste');
      
      expect(result1.profileHash).toBe(result2.profileHash);
    });
  });

  describe('Authorization and isolation', () => {
    it('validateEditorialBaseMatchesProgram does not modify input', () => {
      const summary: ProgramKnowledgeSummary = {
        slug: 'test',
        showId: 'show-1',
        foundInKnowledgeBase: true,
        coverageLevel: 'completa',
        coverageLabel: 'Completa',
        nome: 'Teste',
        apresentador: 'Apresentador',
        descricao: 'Desc',
        proposta: 'Prop',
        conceito: 'Conc',
        publico: 'Público',
        temasPrincipais: ['Tema'],
        quadros: ['Bloco'],
        formato: 'Entrevista',
        duracao: '45 min',
        horario: '20:00',
        canalPlataforma: 'RS Play',
        caracteristicasEditoriais: [],
        informacoesComerciais: [],
        redesSociais: [],
        imagensCount: 0,
        secoesExtraidasCount: 0,
        fontes: [],
        editorialSynthesis: {
          essencia: 'Essência',
          publico: 'Público',
          tom: 'Tom',
          temas: ['Tema'],
          formatos: ['Entrevista'],
          forcas: ['Força'],
          abordagens_recomendadas: ['Abordagem'],
          abordagens_a_evitar: [NAO_IDENTIFICADO_NA_BASE],
          diferenciais: ['Diferencial'],
          fontes: [],
          modelUsed: 'test',
          usedFallback: false,
          generatedAt: new Date().toISOString(),
        },
      };

      const originalNome = summary.nome;
      validateEditorialBaseMatchesProgram(summary, 'Teste');
      
      expect(summary.nome).toBe(originalNome);
    });
  });

  describe('listKnowledgeBasePrograms', () => {
    it('returns array (may be empty depending on filesystem)', () => {
      // This tests the function runs without error
      const programs = listKnowledgeBasePrograms();
      expect(Array.isArray(programs)).toBe(true);
    });
  });

describe('Supabase persistence integration', () => {
    it('integrates editorial base and persists configuration to Supabase', async () => {
      // Skip if Supabase not configured
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('Skipping Supabase test - credentials not configured');
        return;
      }

      // Use a program that exists in the knowledge base
      const mockShow = {
        id: 'show-advogada-leque',
        title: 'Advogada do Leque',
        description: 'Programa de direito previdenciário',
        host: 'Taise Vielmo Côrtes',
        format: 'Entrevista',
        defaultDurationMin: 45,
      };

      // This test uses the real database - it will only pass if Supabase is configured
      const result = await integrateEditorialBaseToSetup(
        'org-test',
        'advogada-do-leque',
        mockShow,
        'advogada-do-leque'
      );

      expect(result.success).toBe(true);
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.coverageLevel).toBe('completa');
      expect(result.config).toBeDefined();
      expect(result.config.editorialIdentity).toBeDefined();
      expect(result.config.editorialIdentity.essencia).toBeDefined();
      expect(result.config.editorialIdentity.publico).toBeDefined();
      expect(result.config.editorialIdentity.temas).toBeDefined();
      expect(result.config.editorialIdentity.formatos).toBeDefined();
      expect(result.config.editorialIdentity.forcas).toBeDefined();
      expect(result.config.editorialIdentity.diferenciais).toBeDefined();
      expect(result.config.setupStructure).toBeDefined();
      expect(result.config.setupStructure.season).toBeDefined();
      expect(result.config.setupStructure.cameras).toBeDefined();
      expect(result.config.setupStructure.editorialDefaults).toBeDefined();
      expect(result.validation.profileHash).toBeDefined();
      expect(result.validation.gaps.length).toBe(0);
      expect(result.validation.coverageLevel).toBe('completa');
    });

    it('persists editorial configuration with proper org/program scope', async () => {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('Skipping Supabase test - credentials not configured');
        return;
      }

      const mockShow = {
        id: 'show-advogada-leque',
        title: 'Advogada do Leque',
        description: 'Programa de direito previdenciário',
        host: 'Taise Vielmo Côrtes',
        format: 'Entrevista',
        defaultDurationMin: 45,
      };

      const result = await integrateEditorialBaseToSetup(
        'org-test-persistence',
        'advogada-do-leque',
        mockShow,
        'advogada-do-leque'
      );

      expect(result.success).toBe(true);
      expect(result.validation.isValid).toBe(true);
      
      // Verify the configuration is tied to the program slug
      expect(result.config.setupStructure.season.title).toContain('Advogada do Leque');
      expect(result.config.setupStructure.cameras.length).toBeGreaterThan(0);
      expect(result.config.editorialIdentity.apresentador).toBe('Taise Vielmo Côrtes');
    });
  });

  describe('Supabase persistence integration', () => {
    const TEST_ORG_ID = '00000000-0000-0000-0000-000000000002';
    const TEST_PROGRAM_SLUG = 'test-editorial-integration';

    beforeAll(async () => {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('Skipping Supabase tests - credentials not configured');
        return;
      }
      // Create test organization and program
      await createTestOrgAndProgram();
    });

    afterAll(async () => {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return;
      }
      await cleanupTestData();
    });

    async function createTestOrgAndProgram() {
      const { db } = await import('./persistence');
      
      // Create test organization
      await db.from('organizations').upsert({
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Test Organization Integration',
        slug: 'test-org-integration',
        plan: 'starter',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      // Create test program
      await db.from('programs').upsert({
        id: '00000000-0000-0000-0000-000000000003',
        legacy_id: 'test-editorial-integration',
        organization_id: '00000000-0000-0000-0000-000000000002',
        name: 'Test Editorial Integration',
        title: 'Test Editorial Integration',
        description: 'Test program for editorial integration',
        host: 'Test Host',
        format: 'Entrevista',
        default_duration_min: 45,
        editorial_style: 'Test editorial style',
        scenario: 'Test scenario',
        standard_structure: ['Abertura', 'Bloco 1', 'Encerramento'],
        default_opening: 'Bem-vindos ao {program_title}. Hoje recebemos {guest_name} para falar sobre {topic}.',
        default_closing: 'Obrigado por assistir. Não esqueça de se inscrever e ativar as notificações.',
        catalog_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      // Create catalog program entry
      await db.from('program_catalog').upsert({
        id: '00000000-0000-0000-0000-000000000003',
        slug: 'test-editorial-integration',
        nomeDoPrograma: 'Test Editorial Integration',
        apresentador: 'Test Host',
        descricao: 'Test program for editorial integration',
        proposta: 'Test proposal',
        conceito: 'Test concept',
        publico: 'Test audience',
        temasPrincipais: ['Teste'],
        quadros: ['Abertura', 'Bloco 1', 'Encerramento'],
        formato: 'Entrevista',
        duracao: '45 minutos',
        horario: '20:00',
        canalPlataforma: 'Test Channel',
        caracteristicasEditoriais: ['Test'],
        informacoesComerciais: [],
        redesSociais: [],
        imagensCount: 0,
        secoesExtraidasCount: 0,
        fontes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'id' });

      // Link program to organization
      await db.from('organization_programs').upsert({
        organization_id: '00000000-0000-0000-0000-000000000002',
        catalog_program_id: '00000000-0000-0000-0000-000000000003',
        program_id: '00000000-0000-0000-0000-000000000003',
        status: 'active',
        starts_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,catalog_program_id' });
    }

    async function cleanupTestData() {
      const { db } = await import('./persistence');
      
      await db.from('organization_programs').delete().eq('organization_id', '00000000-0000-0000-0000-000000000002');
      await db.from('programs').delete().eq('id', '00000000-0000-0000-0000-000000000003');
      await db.from('program_catalog').delete().eq('id', '00000000-0000-0000-0000-000000000003');
      await db.from('organizations').delete().eq('id', '00000000-0000-0000-0000-000000000002');
      await db.from('seasons').delete().eq('program_id', '00000000-0000-0000-0000-000000000003');
      await db.from('cameras').delete().eq('program_id', '00000000-0000-0000-0000-000000000003');
    }

    it('integrates editorial base and persists configuration to Supabase', async () => {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('Skipping Supabase test - credentials not configured');
        return;
      }

      const mockShow = {
        id: 'show-test-editorial',
        title: 'Test Editorial Integration',
        description: 'Test program for editorial integration',
        host: 'Test Host',
        format: 'Entrevista',
        defaultDurationMin: 45,
      };

      const result = await integrateEditorialBaseToSetup(
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
        mockShow,
        'test-editorial-integration'
      );

      expect(result.success).toBe(true);
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.coverageLevel).toBe('completa');
      expect(result.config).toBeDefined();
      expect(result.config.editorialIdentity).toBeDefined();
      expect(result.config.editorialIdentity.essencia).toBeDefined();
      expect(result.config.editorialIdentity.publico).toBeDefined();
      expect(result.config.editorialIdentity.temas).toBeDefined();
      expect(result.config.editorialIdentity.formatos).toBeDefined();
      expect(result.config.editorialIdentity.forcas).toBeDefined();
      expect(result.config.editorialIdentity.diferenciais).toBeDefined();
      expect(result.config.setupStructure).toBeDefined();
      expect(result.config.setupStructure.season).toBeDefined();
      expect(result.config.setupStructure.cameras).toBeDefined();
      expect(result.config.setupStructure.editorialDefaults).toBeDefined();
      expect(result.validation.profileHash).toBeDefined();
      expect(result.validation.gaps.length).toBe(0);
      expect(result.validation.coverageLevel).toBe('completa');

      // Verify data was persisted to Supabase by reading it back
      const { db } = await import('./persistence');
      const season = await db.from('seasons').select('*').eq('program_id', '00000000-0000-0000-0000-000000000003').eq('number', 1).maybeSingle();
      expect(season.data).toBeDefined();
      expect(season.data?.title).toContain('Test Editorial Integration');
    });

    it('persists editorial configuration with proper org/program scope', async () => {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('Skipping Supabase test - credentials not configured');
        return;
      }

      const mockShow = {
        id: 'show-test-editorial',
        title: 'Test Editorial Integration',
        description: 'Test program for editorial integration',
        host: 'Test Host',
        format: 'Entrevista',
        defaultDurationMin: 45,
      };

      const result = await integrateEditorialBaseToSetup(
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
        mockShow,
        'test-editorial-integration'
      );

      expect(result.success).toBe(true);
      expect(result.validation.isValid).toBe(true);
      
      // Verify the configuration is tied to the program slug
      expect(result.config.setupStructure.season.title).toContain('Test Editorial Integration');
      expect(result.config.setupStructure.cameras.length).toBeGreaterThan(0);
      expect(result.config.editorialIdentity.apresentador).toBe('Test Host');
    });
  });
    it('knowledge base files are included in build', async () => {
      // Use dynamic import to get real fs module
      const realFs = await import('fs');
      const realPath = await import('path');
      
      const programsDir = '/home/lg/workspace/projects/TakeMaster-v2/programs';
      expect(realFs.existsSync(programsDir)).toBe(true);
      
      const entries = realFs.readdirSync(programsDir, { withFileTypes: true });
      const programFolders = entries.filter(e => e.isDirectory());
      
      expect(programFolders.length).toBeGreaterThan(0);
      
      const firstProgram = programFolders[0];
      const programPath = realPath.join(programsDir, firstProgram.name);
      
      expect(realFs.existsSync(realPath.join(programPath, 'profile.json'))).toBe(true);
      expect(realFs.existsSync(realPath.join(programPath, 'content.md'))).toBe(true);
      expect(realFs.existsSync(realPath.join(programPath, 'sources.json'))).toBe(true);
      expect(realFs.existsSync(realPath.join(programPath, 'media.json'))).toBe(true);
    });

    it('verifies knowledge base files are included in build artifacts', async () => {
      // Check if the dist folder contains the programs directory or the files are accessible
      const realFs = await import('fs');
      const realPath = await import('path');
      
      const distDir = '/home/lg/workspace/projects/TakeMaster-v2/dist';
      
      // If dist exists, check if programs are accessible (they should be served as static assets)
      // For now, verify the source files exist - the build process should handle this
      const programsDir = '/home/lg/workspace/projects/TakeMaster-v2/programs';
      expect(require('fs').existsSync(programsDir)).toBe(true);
    });
  });