import { createClient } from '@supabase/supabase-js';
import { executeNimEditorialCall } from './ai';

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const db = createClient(url, key, { auth: { persistSession: false } });

type Segment = { start: number; duration?: number | null; text: string };
const asArray = (value: unknown) => Array.isArray(value) ? value : [];

export async function analyzeVideoTranscript(videoId: string) {
  const { data: transcript, error } = await db.from('video_transcripts')
    .select('id,video_id,language,full_text,segments,content_hash,version')
    .eq('id', videoId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!transcript) throw Object.assign(new Error('Transcrição não encontrada.'), { status: 404 });
  const segments: Segment[] = asArray(transcript.segments).filter((s: any) => Number.isFinite(Number(s.start)) && typeof s.text === 'string');
  const prompt = `Você é um analista editorial. Analise a transcrição abaixo como registro do que foi dito, não como prova de veracidade.
Responda SOMENTE JSON válido com as chaves:
summary (string);
topics (array de {name:string,evidence:array de {start:number,quote:string}});
guests (array de {name:string,role:string|null,evidence:array de {start:number,quote:string}});
questions (array de {text:string,evidence:array de {start:number,quote:string}});
claims_to_verify (array de {claim:string,reason:string,evidence:array de {start:number,quote:string}});
segments (array de {title:string,start:number,end:number,summary:string});
calls_to_action (array de {text:string,start:number,quote:string}).
Use somente informações explícitas na transcrição. Para cada achado relevante, cite start em segundos e uma citação literal curta. Se não houver evidência, use array vazio. Claims são alegações a verificar, nunca fatos confirmados. Não invente nomes nem horários.
Idioma da transcrição: ${transcript.language}
Transcrição com timestamps:
${segments.map((s) => `[${Number(s.start).toFixed(2)}s] ${s.text}`).join('\n').slice(0, 90000)}`;
  const result = await executeNimEditorialCall({ prompt });
  let parsed: any;
  try { parsed = JSON.parse(result.text); }
  catch { throw new Error('A IA retornou análise fora do formato JSON esperado; a transcrição foi preservada sem alteração.'); }
  if (!parsed || typeof parsed.summary !== 'string' || !parsed.summary.trim()) throw new Error('Análise sem resumo válido; transcrição preservada.');
  const starts = new Set(segments.map((s) => Math.round(Number(s.start))));
  const validateEvidence = (items: any[]) => items.map((item) => {
    const evidence = asArray(item.evidence).filter((e: any) => Number.isFinite(Number(e.start)) && typeof e.quote === 'string' && e.quote.trim())
      .map((e: any) => ({ start: Number(e.start), quote: e.quote.trim().slice(0, 400), verifiedTimestamp: starts.has(Math.round(Number(e.start))) }));
    return { ...item, evidence };
  });
  const topics = validateEvidence(asArray(parsed.topics));
  const guests = validateEvidence(asArray(parsed.guests));
  const questions = validateEvidence(asArray(parsed.questions));
  const claims = validateEvidence(asArray(parsed.claims_to_verify));
  const editorialSegments = asArray(parsed.segments).filter((s: any) => typeof s.title === 'string' && Number.isFinite(Number(s.start)) && Number.isFinite(Number(s.end)) && Number(s.end) >= Number(s.start)).map((s: any) => ({ title: s.title, start: Number(s.start), end: Number(s.end), summary: String(s.summary || '') }));
  const calls = asArray(parsed.calls_to_action).filter((s: any) => typeof s.text === 'string').map((s: any) => ({ text: s.text, start: Number(s.start) || 0, quote: String(s.quote || '').slice(0, 400), verifiedTimestamp: starts.has(Math.round(Number(s.start) || 0)) }));
  const { data: latest, error: latestError } = await db.from('video_editorial_analyses').select('analysis_version').eq('transcript_id', transcript.id).order('analysis_version', { ascending: false }).limit(1);
  if (latestError) throw new Error(latestError.message);
  const version = (latest?.[0]?.analysis_version || 0) + 1;
  const inserted = await db.from('video_editorial_analyses').insert({
    transcript_id: transcript.id, analysis_version: version, summary: parsed.summary.trim(),
    topics, guests, questions, claims_to_verify: claims, segments: editorialSegments, calls_to_action: calls,
    model_name: result.modelUsed, prompt_version: 'video-editorial-analysis-v1', review_status: 'needs_review',
  }).select('*').single();
  if (inserted.error) throw new Error(inserted.error.message);
  return inserted.data;
}
