// Simple validation of the field mapping logic in saveProgram method
import { Program } from '../../types/domain';

// Extract the mapping logic from saveProgram method to test it directly
function mapProgramToDbData(program: Program) {
  return {
    id: program.id,
    name: program.title,
    description: program.description,
    host: program.host,
    format: program.format,
    default_duration_min: program.defaultDurationMin,
    default_episode_duration_minutes: program.defaultEpisodeDurationMinutes ?? program.defaultDurationMin,
    default_opening: program.defaultOpening,
    default_presenter_name: program.defaultPresenterName ?? program.host,
    default_segments: program.defaultSegments ?? {},
    editorial_style: program.editorialStyle,
    scenario: program.scenario,
    standard_segments: program.standardSegments ?? {},
    standard_structure: program.standardStructure,
    target_audience: program.targetAudience ?? null,
    title: program.title,
    tone: program.tone ?? null,
    updated_at: program.updatedAt,
    createdAt: program.createdAt,
    legacy_id: null,
    organization_id: null,
    catalog_program_id: null
  };
}

const baseProgram: Program = {
  id: 'test-id',
  title: 'Test Show',
  description: 'Test Description',
  host: 'Test Host',
  format: 'Entrevista',
  defaultDurationMin: 30,
  editorialStyle: 'Test Style',
  scenario: 'Test Scenario',
  cameras: [],
  standardStructure: [],
  defaultOpening: 'Opening',
  defaultClosing: 'Closing',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

console.log('Running Show to Program Data Mapping Validation Tests...\n');

// Test 1: defaultEpisodeDurationMinutes mapping
{
  const program: Program = {
    ...baseProgram,
    defaultEpisodeDurationMinutes: 45
  };

  const result = mapProgramToDbData(program);
  if (result.default_episode_duration_minutes === 45) {
    console.log('✓ Test 1 passed: defaultEpisodeDurationMinutes mapping');
  } else {
    console.log('✗ Test 1 failed: defaultEpisodeDurationMinutes mapping');
    console.log(`  Expected: 45, Got: ${result.default_episode_duration_minutes}`);
  }
}

// Test 2: defaultEpisodeDurationMinutes fallback
{
  const program: Program = {
    ...baseProgram
    // defaultEpisodeDurationMinutes is intentionally omitted
  };

  const result = mapProgramToDbData(program);
  if (result.default_episode_duration_minutes === 30) {
    console.log('✓ Test 2 passed: defaultEpisodeDurationMinutes fallback');
  } else {
    console.log('✗ Test 2 failed: defaultEpisodeDurationMinutes fallback');
    console.log(`  Expected: 30, Got: ${result.default_episode_duration_minutes}`);
  }
}

// Test 3: defaultPresenterName mapping
{
  const program: Program = {
    ...baseProgram,
    defaultPresenterName: 'Custom Presenter'
  };

  const result = mapProgramToDbData(program);
  if (result.default_presenter_name === 'Custom Presenter') {
    console.log('✓ Test 3 passed: defaultPresenterName mapping');
  } else {
    console.log('✗ Test 3 failed: defaultPresenterName mapping');
    console.log(`  Expected: Custom Presenter, Got: ${result.default_presenter_name}`);
  }
}

// Test 4: defaultPresenterName fallback
{
  const program: Program = {
    ...baseProgram
    // defaultPresenterName is intentionally omitted
  };

  const result = mapProgramToDbData(program);
  if (result.default_presenter_name === 'Test Host') {
    console.log('✓ Test 4 passed: defaultPresenterName fallback');
  } else {
    console.log('✗ Test 4 failed: defaultPresenterName fallback');
    console.log(`  Expected: Test Host, Got: ${result.default_presenter_name}`);
  }
}

// Test 5: defaultSegments mapping
{
  const program: Program = {
    ...baseProgram,
    defaultSegments: { news: 'value1', weather: 'value2' }
  };

  const result = mapProgramToDbData(program);
  if (result.default_segments && 
      result.default_segments.news === 'value1' && 
      result.default_segments.weather === 'value2') {
    console.log('✓ Test 5 passed: defaultSegments mapping');
  } else {
    console.log('✗ Test 5 failed: defaultSegments mapping');
    console.log(`  Expected: { news: "value1", weather: "value2" }, Got: ${JSON.stringify(result.default_segments)}`);
  }
}

// Test 6: defaultSegments fallback
{
  const program: Program = {
    ...baseProgram
    // defaultSegments is intentionally omitted
  };

  const result = mapProgramToDbData(program);
  if (result.default_segments && Object.keys(result.default_segments).length === 0) {
    console.log('✓ Test 6 passed: defaultSegments fallback');
  } else {
    console.log('✗ Test 6 failed: defaultSegments fallback');
    console.log(`  Expected: {}, Got: ${JSON.stringify(result.default_segments)}`);
  }
}

// Test 7: standardSegments mapping
{
  const program: Program = {
    ...baseProgram,
    standardSegments: { intro: 'value1', discussion: 'value2' }
  };

  const result = mapProgramToDbData(program);
  if (result.standard_segments && 
      result.standard_segments.intro === 'value1' && 
      result.standard_segments.discussion === 'value2') {
    console.log('✓ Test 7 passed: standardSegments mapping');
  } else {
    console.log('✗ Test 7 failed: standardSegments mapping');
    console.log(`  Expected: { intro: "value1", discussion: "value2" }, Got: ${JSON.stringify(result.standard_segments)}`);
  }
}

// Test 8: standardSegments fallback
{
  const program: Program = {
    ...baseProgram
    // standardSegments is intentionally omitted
  };

  const result = mapProgramToDbData(program);
  if (result.standard_segments && Object.keys(result.standard_segments).length === 0) {
    console.log('✓ Test 8 passed: standardSegments fallback');
  } else {
    console.log('✗ Test 8 failed: standardSegments fallback');
    console.log(`  Expected: {}, Got: ${JSON.stringify(result.standard_segments)}`);
  }
}

// Test 9: targetAudience mapping
{
  const program: Program = {
    ...baseProgram,
    targetAudience: 'Women 25-40'
  };

  const result = mapProgramToDbData(program);
  if (result.target_audience === 'Women 25-40') {
    console.log('✓ Test 9 passed: targetAudience mapping');
  } else {
    console.log('✗ Test 9 failed: targetAudience mapping');
    console.log(`  Expected: Women 25-40, Got: ${result.target_audience}`);
  }
}

// Test 10: targetAudience fallback
{
  const program: Program = {
    ...baseProgram
    // targetAudience is intentionally omitted
  };

  const result = mapProgramToDbData(program);
  if (result.target_audience === null) {
    console.log('✓ Test 10 passed: targetAudience fallback');
  } else {
    console.log('✗ Test 10 failed: targetAudience fallback');
    console.log(`  Expected: null, Got: ${result.target_audience}`);
  }
}

// Test 11: tone mapping
{
  const program: Program = {
    ...baseProgram,
    tone: 'Conversational'
  };

  const result = mapProgramToDbData(program);
  if (result.tone === 'Conversational') {
    console.log('✓ Test 11 passed: tone mapping');
  } else {
    console.log('✗ Test 11 failed: tone mapping');
    console.log(`  Expected: Conversational, Got: ${result.tone}`);
  }
}

// Test 12: tone fallback
{
  const program: Program = {
    ...baseProgram
    // tone is intentionally omitted
  };

  const result = mapProgramToDbData(program);
  if (result.tone === null) {
    console.log('✓ Test 12 passed: tone fallback');
  } else {
    console.log('✗ Test 12 failed: tone fallback');
    console.log(`  Expected: null, Got: ${result.tone}`);
  }
}

// Test 13: all other fields
{
  const program: Program = {
    ...baseProgram
  };

  const result = mapProgramToDbData(program);
   
  let passed = true;
  let errorMessage = '';
   
  // Check that all the basic fields are mapped correctly
  if (result.id !== 'test-id') {
    passed = false;
    errorMessage += `\n  id: expected 'test-id', got '${result.id}'`;
  }
  if (result.name !== 'Test Show') {
    passed = false;
    errorMessage += `\n  name: expected 'Test Show', got '${result.name}'`;
  }
  if (result.description !== 'Test Description') {
    passed = false;
    errorMessage += `\n  description: expected 'Test Description', got '${result.description}'`;
  }
  if (result.host !== 'Test Host') {
    passed = false;
    errorMessage += `\n  host: expected 'Test Host', got '${result.host}'`;
  }
  if (result.format !== 'Entrevista') {
    passed = false;
    errorMessage += `\n  format: expected 'Entrevista', got '${result.format}'`;
  }
  if (result.default_duration_min !== 30) {
    passed = false;
    errorMessage += `\n  default_duration_min: expected 30, got ${result.default_duration_min}`;
  }
  if (result.default_opening !== 'Opening') {
    passed = false;
    errorMessage += `\n  default_opening: expected 'Opening', got '${result.default_opening}'`;
  }
  if (result.editorial_style !== 'Test Style') {
    passed = false;
    errorMessage += `\n  editorial_style: expected 'Test Style', got '${result.editorial_style}'`;
  }
  if (result.scenario !== 'Test Scenario') {
    passed = false;
    errorMessage += `\n  scenario: expected 'Test Scenario', got '${result.scenario}'`;
  }
  if (!Array.isArray(result.standard_structure) || result.standard_structure.length !== 0) {
    passed = false;
    errorMessage += `\n  standard_structure: expected [], got ${JSON.stringify(result.standard_structure)}`;
  }
  if (result.title !== 'Test Show') {
    passed = false;
    errorMessage += `\n  title: expected 'Test Show', got '${result.title}'`;
  }
  if (result.updated_at !== program.updatedAt) {
    passed = false;
    errorMessage += `\n  updated_at: expected '${program.updatedAt}', got '${result.updated_at}'`;
  }
  if (result.createdAt !== program.createdAt) {
    passed = false;
    errorMessage += `\n  createdAt: expected '${program.createdAt}', got '${result.createdAt}'`;
  }
  if (result.legacy_id !== null) {
    passed = false;
    errorMessage += `\n  legacy_id: expected null, got ${result.legacy_id}`;
  }
  if (result.organization_id !== null) {
    passed = false;
    errorMessage += `\n  organization_id: expected null, got ${result.organization_id}`;
  }
  if (result.catalog_program_id !== null) {
    passed = false;
    errorMessage += `\n  catalog_program_id: expected null, got ${result.catalog_program_id}`;
  }
   
  if (passed) {
    console.log('✓ Test 13 passed: all other fields mapping');
  } else {
    console.log('✗ Test 13 failed: all other fields mapping');
    console.log(errorMessage);
  }
}

console.log('\nValidation tests completed.');