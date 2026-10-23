/**
 * Cloudflare AI Worker — Minimal Version for Local Development
 * 
 * Runs locally with: npx wrangler dev src/ai-worker.ts
 * In production: deployed as separate worker consuming from Cloudflare Queues
 * 
 * This minimal version just polls the in-memory queue and logs activity.
 * Full AI processing is done in the main server (src/server/ai.ts) for now.
 * TODO: Move actual AI processing here for production.
 */

import { aiQueue, type AIJob, type AIJobType } from './queue';
import { getServerConfig } from './server/config';
import { logStructured } from './server/logger';

// ============================================
// WORKER CONFIGURATION
// ============================================

const WORKER_ID = `ai-worker-${process.pid}-${Math.random().toString(36).slice(2, 6)}`;
const POLL_INTERVAL_MS = 2000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let isProcessing = false;

// ============================================
// MAIN PROCESSING LOOP
// ============================================

async function processNextJob(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const job = await aiQueue.claimNextJob(WORKER_ID);
    if (job) {
      logStructured('INFO', 'ai_worker_processing', { workerId: WORKER_ID, jobId: job.id, type: job.type });
      
      try {
        // TODO: Implement actual AI processing here
        // For now, simulate processing with a delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        // Mock result based on job type
        const mockResult = createMockResult(job.type, job.dto);
        const meta = {
          promptVersion: `v1.0.0-${job.type}`,
          source: 'mock' as const,
          validated: true,
          warnings: [],
          generatedAt: new Date().toISOString(),
        };
        
        aiQueue.completeJob(job.id, mockResult, meta);
        logStructured('INFO', 'ai_worker_completed', { workerId: WORKER_ID, jobId: job.id });
      } catch (error: any) {
        aiQueue.failJob(job.id, error.message);
        logStructured('ERROR', 'ai_worker_failed', { workerId: WORKER_ID, jobId: job.id, error: error.message });
      }
    }
  } finally {
    isProcessing = false;
  }
}

function createMockResult(type: AIJobType, dto: any): any {
  const base = { mock: true, processedAt: new Date().toISOString(), dto: dto };
  
  switch (type) {
    case 'diagnosis':
      return { ...base, centralTheme: 'Mock diagnosis', potentialStory: 'Mock story', primaryConflict: 'Mock conflict', primaryTransformation: 'Mock transformation', whyWatch: 'Mock why', whatToDiscover: 'Mock discover', researchPoints: [], highImpactMoments: [], approved: false };
    case 'research':
      return { ...base, aboutGuest: 'Mock research', trajectory: 'Mock trajectory', company: 'Mock company', keyDatesAndNumbers: 'Mock dates', previousInterviews: 'Mock interviews', recurringThemes: 'Mock themes', contradictionsAndClarifications: 'Mock contradictions', compellingStories: 'Mock stories', sources: [] };
    case 'outline':
      return { ...base, outline: [{ id: 'blk-1', blockNumber: 1, title: 'Mock Block', estimatedDurationMin: 10, objective: 'Mock objective', keyThemes: ['mock'], transitionText: 'Mock transition' }], questions: [] };
    case 'script':
      return { ...base, script: [{ id: 'sc-1', blockId: 'blk-1', timestamp: '00:00', type: 'opening', camera: 'CAM 1', speaker: 'Host', eyeDirection: 'Camera', shotType: 'Medium', content: 'Mock script', directionalMarkers: [], isTeleprompter: true }] };
    case 'shorts':
      return { ...base, shorts: [{ id: 'sh-1', title: 'Mock Short', hook: 'Mock hook', generatingQuestion: 'Mock question', estimatedDuration: '45-60s', status: 'Planejado' as const }] };
    case 'editor-synthesis':
      return { ...base, synthesis: 'Mock editor synthesis for post-production.' };
    case 'contextual-assist':
      return { ...base, suggestion: 'Mock contextual assistance.' };
    case 'program-identity':
      return { ...base, essencia: 'Mock essence', publico: 'Mock audience', tom: 'Mock tone', temas: ['mock'], formatos: ['mock'], forcas: ['mock'], abordagens_recomendadas: ['mock'], abordagens_a_evitar: ['mock'], diferenciais: ['mock'], fontes: [] };
    case 'pitch':
      return { ...base, pautas: [{ score: 80, fit: 'alto' as const, reason: 'Mock reason', angle: 'Mock angle', suggestedGuest: 'Mock guest', questions: ['Mock question'], title: 'Mock title', hook: 'Mock hook' }], fontes: [] };
    case 'repiques':
      return { ...base, followUps: [{ id: 'fu-1', triggerCondition: 'Mock trigger', actionOrQuestion: 'Mock action', tag: 'APROFUNDAR' as const }] };
    default:
      return base;
  }
}

// ============================================
// WORKER LOOP
// ============================================

async function runWorkerLoop() {
  while (true) {
    await processNextJob();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Start the worker loop
runWorkerLoop().catch(err => {
  logStructured('ERROR', 'ai_worker_fatal', { workerId: WORKER_ID, error: err.message });
  process.exit(1);
});

// Cleanup old jobs periodically
setInterval(() => {
  const removed = aiQueue.cleanupOldJobs();
  if (removed > 0) {
    logStructured('INFO', 'ai_queue_cleanup', { removed });
  }
}, 60 * 60 * 1000);

logStructured('INFO', 'ai_worker_started', { workerId: WORKER_ID, pollIntervalMs: POLL_INTERVAL_MS });

// ============================================
// CLOUDFLARE WORKER EXPORT
// ============================================

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    
    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        workerId: WORKER_ID,
        queue: aiQueue.getStats(),
        uptime: process.uptime(),
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Queue stats
    if (url.pathname === '/stats') {
      return new Response(JSON.stringify(aiQueue.getStats()), { headers: { 'Content-Type': 'application/json' } });
    }

    // Manual job trigger (for testing)
    if (request.method === 'POST' && url.pathname === '/trigger') {
      const body = await request.json();
      const job = aiQueue.createJob(body.type, body.dto, body.options);
      return new Response(JSON.stringify({ jobId: job.id, status: 'queued' }), { 
        status: 202,
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    return new Response('AI Worker - use /health, /stats, or POST /trigger', { status: 404 });
  },
};