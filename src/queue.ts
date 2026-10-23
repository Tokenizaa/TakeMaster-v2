/**
 * AI Job Queue — Local Development & Cloudflare Queues
 * 
 * In-memory queue for local development. In production, replace with Cloudflare Queues.
 */

import type { AIJobRequest, AIJobResponse, AIJobResult } from './domain/types/episode';
import type { AIValidationMeta } from './domain/aiContracts';

// ============================================
// JOB TYPES
// ============================================

export type AIJobType =
  | 'diagnosis'
  | 'research'
  | 'outline'
  | 'script'
  | 'repiques'
  | 'shorts'
  | 'editor-synthesis'
  | 'editor-script'
  | 'contextual-assist'
  | 'assist'
  | 'program-identity'
  | 'pitch';

export interface AIJob {
  id: string;
  type: AIJobType;
  dto: unknown;
  options?: AIJobRequest['options'];
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
  meta?: AIValidationMeta;
}

export interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

// ============================================
// IN-MEMORY QUEUE (Local Development)
// ============================================

class InMemoryQueue {
  private jobs = new Map<string, AIJob>();
  private processing = new Set<string>();
  private listeners = new Set<() => void>();

  // Job management
  createJob(type: AIJobType, dto: unknown, options?: AIJobRequest['options']): AIJob {
    const job: AIJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      dto,
      options,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(job.id, job);
    this.notify();
    return job;
  }

  getJob(id: string): AIJob | undefined {
    return this.jobs.get(id);
  }

  getJobs(): AIJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getStats(): QueueStats {
    let queued = 0, processing = 0, completed = 0, failed = 0;
    for (const job of this.jobs.values()) {
      switch (job.status) {
        case 'queued': queued++; break;
        case 'processing': processing++; break;
        case 'completed': completed++; break;
        case 'failed': failed++; break;
      }
    }
    return { queued, processing, completed, failed, total: this.jobs.size };
  }

  // Worker interface
  async claimNextJob(workerId: string): Promise<AIJob | null> {
    for (const job of this.jobs.values()) {
      if (job.status === 'queued') {
        job.status = 'processing';
        job.startedAt = new Date().toISOString();
        this.processing.add(job.id);
        this.notify();
        return job;
      }
    }
    return null;
  }

  completeJob(id: string, result: unknown, meta?: AIValidationMeta): void {
    const job = this.jobs.get(id);
    if (job) {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.result = result;
      job.meta = meta;
      this.processing.delete(id);
      this.notify();
    }
  }

  failJob(id: string, error: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.status = 'failed';
      job.completedAt = new Date().toISOString();
      job.error = error;
      this.processing.delete(id);
      this.notify();
    }
  }

  // Cleanup
  cleanupOldJobs(maxAgeMs = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    for (const [id, job] of this.jobs.entries()) {
      if (job.status !== 'queued' && job.status !== 'processing') {
        const completedAt = job.completedAt ? new Date(job.completedAt).getTime() : 0;
        if (completedAt > 0 && completedAt < cutoff) {
          this.jobs.delete(id);
          removed++;
        }
      }
    }
    if (removed > 0) this.notify();
    return removed;
  }

  // Event listeners
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

// ============================================
// SINGLETON
// ============================================

export const aiQueue = new InMemoryQueue();

// ============================================
// HELPER FUNCTIONS
// ============================================

export function createAIJob(type: AIJobType, dto: unknown, options?: AIJobRequest['options']): AIJobResponse {
  const job = aiQueue.createJob(type, dto, options);
  return {
    jobId: job.id,
    status: 'queued',
    estimatedDurationMs: estimateDuration(type),
  };
}

export function getAIJobResult(jobId: string): AIJobResult | null {
  const job = aiQueue.getJob(jobId);
  if (!job) return null;
  
  return {
    jobId: job.id,
    status: job.status === 'completed' ? 'completed' : 
            job.status === 'failed' ? 'failed' : 'processing',
    result: job.result,
    error: job.error,
    meta: job.meta,
  };
}

export function getQueueStats(): QueueStats {
  return aiQueue.getStats();
}

// Duration estimates per job type (milliseconds)
function estimateDuration(type: AIJobType): number {
  const estimates: Record<AIJobType, number> = {
    diagnosis: 15000,
    research: 20000,
    outline: 10000,
    script: 30000,
    repiques: 10000,
    shorts: 10000,
    'editor-synthesis': 15000,
    'editor-script': 15000,
    'contextual-assist': 5000,
    'assist': 5000,
    'program-identity': 20000,
    pitch: 15000,
  };
  return estimates[type] ?? 15000;
}

// ============================================
// CLOUDFLARE QUEUES INTEGRATION (Production)
// ============================================

/**
 * In production, replace InMemoryQueue with Cloudflare Queues:
 * 
 * 1. Define queue in wrangler.jsonc:
 *    "queues": {
 *      "producers": [
 *        { "queue": "ai-jobs", "binding": "AI_JOBS" }
 *      ],
 *      "consumers": [
 *        { "queue": "ai-jobs", "max_batch_size": 10, "max_batch_timeout": 30 }
 *      ]
 *    }
 * 
 * 2. Producer (API routes):
 *    export async function onRequestPost(context) {
 *      await context.env.AI_JOBS.send({ type, dto, options });
 *      return new Response(JSON.stringify({ jobId, status: 'queued' }), { status: 202 });
 *    }
 * 
 * 3. Consumer (AI Worker):
 *    export default {
 *      async queue(batch, env) {
 *        for (const message of batch.messages) {
 *          const { type, dto, options } = message.body;
 *          const result = await processAIJob(type, dto, options);
 *          // Store result in KV/D1
 *        }
 *      }
 *    }
 * 
 * 4. Result retrieval via KV/D1 lookup by jobId
 */