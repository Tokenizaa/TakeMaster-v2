import { getServerConfig } from './config';

type GenerateOptions = { model?: string; contents: string; config?: { responseMimeType?: string } };
type GenerateResponse = { text?: string };

async function callNim(model: string, contents: string, responseMimeType?: string): Promise<GenerateResponse> {
  const c = getServerConfig();
  if (!c.nimApiKey) throw new Error('NVIDIA NIM não configurado: defina NIM_API_KEY.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), c.nimTimeoutMs);
  try {
    const response = await fetch(c.nimBaseUrl + '/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + c.nimApiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{ role: 'user', content: contents }], temperature: 0.4, ...(responseMimeType === 'application/json' ? { response_format: { type: 'json_object' } } : {}) }), signal: controller.signal });
    const raw = await response.text();
    if (!response.ok) throw new Error('NVIDIA NIM HTTP ' + response.status);
    const data = JSON.parse(raw);
    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') throw new Error('NVIDIA NIM retornou uma resposta sem conteúdo.');
    return { text };
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('NVIDIA NIM timeout após ' + c.nimTimeoutMs + 'ms.');
    throw error;
  } finally { clearTimeout(timeout); }
}

async function generateWithFallback(options: GenerateOptions): Promise<GenerateResponse> {
  const c = getServerConfig();
  const primary = c.nimPrimaryModel;
  try { return await callNim(primary, options.contents, options.config?.responseMimeType); }
  catch (primaryError) {
    if (!c.nimFallbackModel || c.nimFallbackModel === primary) throw primaryError;
    try { return await callNim(c.nimFallbackModel, options.contents, options.config?.responseMimeType); }
    catch { throw new Error('IA indisponível após tentativa no modelo principal e fallback.'); }
  }
}

export const ai = { models: { generateContent: generateWithFallback } };

export function parseAIJson<T>(rawText: string | undefined, fallback?: T): T {
  if (!rawText) {
    if (fallback !== undefined) return fallback;
    throw new Error('A IA retornou uma resposta vazia.');
  }

  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^\x60\x60\x60json\s*/, '').replace(/^\x60\x60\x60\s*/, '').replace(/\s*\x60\x60\x60$/, '').trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    if (fallback !== undefined) return fallback;
    throw new Error('A IA retornou JSON inválido.');
  }
}
