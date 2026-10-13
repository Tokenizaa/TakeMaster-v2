#!/usr/bin/env node
/**
 * Simple governance check for G0
 * Validates:
 * - plan/features.json exists and is valid JSON
 * - plan/features.json existe, é válido e tem foco/features coerentes
 * - documentos canônicos do projeto existem
 * - nenhuma feature possui estado desconhecido
 * - estrutura mínima do Loop existe
 */

import fs from 'fs';
import path from 'path';

function log(msg) { console.log(`[governance-check] ${msg}`); }
function error(msg) { console.error(`[governance-check] ERROR: ${msg}`); process.exit(1); }
function success(msg) { console.log(`[governance-check] SUCCESS: ${msg}`); }

function checkFileExists(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    error(`File does not exist: ${filePath}`);
    return false;
  }
  log(`File exists: ${filePath}`);
  return true;
}

function checkIsValidJson(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    JSON.parse(content);
    log(`File is valid JSON: ${filePath}`);
    return true;
  } catch (e) {
    error(`File is not valid JSON ${filePath}: ${e.message}`);
    return false;
  }
}

function main() {
  log('Starting governance check...');
  
  // 1. plan/features.json exists and is valid JSON
  if (!checkFileExists('plan/features.json')) return;
  if (!checkIsValidJson('plan/features.json')) return;
  
  const featuresPath = path.join(process.cwd(), 'plan', 'features.json');
  let featuresData;
  try {
    const content = fs.readFileSync(featuresPath, 'utf8');
    featuresData = JSON.parse(content);
  } catch (e) {
    error(`Failed to parse plan/features.json: ${e.message}`);
    return;
  }
  
  if (typeof featuresData !== 'object' || featuresData === null) {
    error('plan/features.json root is not an object');
    return;
  }

  if (typeof featuresData.current_focus !== 'string' || !featuresData.current_focus.trim()) {
    error('plan/features.json missing current_focus string');
    return;
  }

  if (!Array.isArray(featuresData.features) || featuresData.features.length === 0) {
    error('plan/features.json missing non-empty features array');
    return;
  }

  const allowedStates = new Set(['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED']);
  for (const feature of featuresData.features) {
    if (!feature || typeof feature.id !== 'string' || typeof feature.state !== 'string') {
      error('Every feature must have id and state strings');
      return;
    }
    if (!allowedStates.has(feature.state)) {
      error(`Feature ${feature.id} has unknown state '${feature.state}'`);
      return;
    }
  }

  log(`Current focus: ${featuresData.current_focus}`);

  // Canonical project files required for governance.
  const canonicalFiles = [
    'docs/CANONICAL_STATE.md',
    'docs/testing/CANONICAL_TEST_MAP.md',
    'plan/features.json',
    'plan/progress.md',
    'loop/loop.config.json',
    '.github/workflows/governance.yml'
  ];
  
  for (const file of canonicalFiles) {
    if (!checkFileExists(file)) return;
  }
  
  // Minimal Loop structure.
  const loopDir = path.join(process.cwd(), 'loop');
  const required = [
    'loop.config.json',
    'sessions.log',
    'inbox.items.md',
    path.join('locks', '.gitkeep'),
    path.join('checkpoints', 'CHECKPOINT.md'),
    path.join('checkpoints', 'README.md')
  ];
  
  for (const item of required) {
    const fullPath = path.join(loopDir, item);
    if (!fs.existsSync(fullPath)) {
      // Special case for .gitkeep: create it if missing
      if (item === path.join('locks', '.gitkeep')) {
        const locksDir = path.join(loopDir, 'locks');
        if (!fs.existsSync(locksDir)) {
          fs.mkdirSync(locksDir, { recursive: true });
        }
        fs.writeFileSync(fullPath, '');
        log(`Created missing file: ${item}`);
        continue;
      }
      error(`Loop structure missing: ${item}`);
      return;
    }
    log(`Loop structure item exists: ${item}`);
  }
  
  success('All governance checks passed');
  process.exit(0);
}

main();
