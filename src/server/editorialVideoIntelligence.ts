import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function parseYouTubeVideoId(input: string): string {
  let id = '';
  try {
    const url = new URL(input);
    if (url.hostname === 'youtu.be' || url.hostname.endsWith('.youtu.be')) id = url.pathname.split('/').filter(Boolean)[0] || '';
    else if (url.hostname === 'youtube.com' || url.hostname.endsWith('.youtube.com')) {
      id = url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] || '';
    }
  } catch {
    if (VIDEO_ID.test(input)) id = input;
  }
  if (!VIDEO_ID.test(id)) throw Object.assign(new Error('Informe uma URL pública válida do YouTube.'), { status: 400 });
  return id;
}

function extractJsonAfter(html: string, marker: string): any | null {
  const markerAt = html.indexOf(marker);
  if (markerAt < 0) return null;
  const start = html.indexOf('{', markerAt + marker.length);
  if (start < 0) return null;
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

function walk(value: any, visit: (node: any) => void) {
  if (!value || typeof value !== 'object') return;
  visit(value);
  if (Array.isArray(value)) for (const item of value) walk(item, visit);
  else for (const item of Object.values(value)) walk(item, visit);
}

export function parseChannelPage(html: string) {
  const initial = extractJsonAfter(html, 'ytInitialData');
  if (!initial) throw new Error('O YouTube não entregou a listagem pública do canal em formato reconhecível.');
  const videos = new Map<string, { videoId: string; title: string; publishedLabel: string | null; durationLabel: string | null }>();
  const continuations = new Set<string>();
  walk(initial, (node) => {
    const renderer = node.videoRenderer || node.gridVideoRenderer || node.richItemRenderer?.content?.videoRenderer;
    if (renderer?.videoId && VIDEO_ID.test(renderer.videoId)) {
      const title = renderer.title?.runs?.map((run: any) => run.text).join('') || renderer.title?.simpleText || renderer.headline?.simpleText || renderer.videoId;
      videos.set(renderer.videoId, { videoId: renderer.videoId, title, publishedLabel: renderer.publishedTimeText?.simpleText || null, durationLabel: renderer.lengthText?.simpleText || null });
    }
    const token = node.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token
      || node.continuationEndpoint?.continuationCommand?.token;
    if (typeof token === 'string' && token) continuations.add(token);
  });
  const apiKey = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/)?.[1] || null;
  const context = extractJsonAfter(html, '"INNERTUBE_CONTEXT"');
  const channelTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(/\s*-\s*YouTube\s*$/i, '').trim() || null;
  return { videos: [...videos.values()], continuations: [...continuations], apiKey, context, channelTitle };
}

function channelVideosUrl(input: string): string {
  let url: URL;
  try { url = new URL(input); } catch { throw Object.assign(new Error('Informe a URL pública do canal do YouTube.'), { status: 400 }); }
  if (!/(^|\.)youtube\.com$/i.test(url.hostname) && !/(^|\.)youtu\.be$/i.test(url.hostname)) {
    throw Object.assign(new Error('A URL precisa pertencer ao YouTube.'), { status: 400 });
  }
  if (url.hostname.endsWith('youtu.be')) throw Object.assign(new Error('Envie a URL do canal, não a URL de um vídeo curto.'), { status: 400 });
  url.search = ''; url.hash = '';
  url.pathname = url.pathname.replace(/\/$/, '');
  if (!/\/(?:videos|streams|shorts|featured)$/i.test(url.pathname)) url.pathname += '/videos';
  return url.href;
}

async function fetchChannelPage(url: string) {
  const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`YouTube não disponibilizou a página pública do canal (HTTP ${response.status}).`);
  return response.text();
}

export async function discoverYouTubeChannelVideos(input: string, maxVideos = 5000) {
  if (!Number.isInteger(maxVideos) || maxVideos < 1 || maxVideos > 5000) throw new Error('maxVideos deve estar entre 1 e 5000.');
  const channelUrl = channelVideosUrl(input);
  const firstHtml = await fetchChannelPage(channelUrl);
  const first = parseChannelPage(firstHtml);
  const found = new Map(first.videos.map((video) => [video.videoId, video]));
  const context = first.context;
  const apiKey = first.apiKey;
  let continuation = first.continuations[0] || null;
  let pages = 1;
  const errors: string[] = [];
  while (continuation && found.size < maxVideos) {
    if (!context || !apiKey) {
      errors.push('A listagem pública forneceu um token de continuação, mas não o contexto público necessário para paginar.');
      break;
    }
    const response = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 TakeMaster/2.0', origin: 'https://www.youtube.com', referer: channelUrl },
      body: JSON.stringify({ context, continuation }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) { errors.push(`Paginação interrompida com HTTP ${response.status}.`); break; }
    const data = await response.json();
    let next: string | null = null;
    walk(data, (node) => {
      const renderer = node.videoRenderer || node.gridVideoRenderer || node.richItemRenderer?.content?.videoRenderer;
      if (renderer?.videoId && VIDEO_ID.test(renderer.videoId)) {
        const title = renderer.title?.runs?.map((run: any) => run.text).join('') || renderer.title?.simpleText || renderer.videoId;
        found.set(renderer.videoId, { videoId: renderer.videoId, title, publishedLabel: renderer.publishedTimeText?.simpleText || null, durationLabel: renderer.lengthText?.simpleText || null });
      }
      const token = node.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || node.continuationEndpoint?.continuationCommand?.token;
      if (typeof token === 'string' && token) next = token;
    });
    continuation = next;
    pages++;
    await sleep(150);
  }
  return { channelUrl, channelTitle: first.channelTitle, videos: [...found.values()].slice(0, maxVideos), pages, reachedEnd: !continuation, truncated: found.size >= maxVideos && Boolean(continuation), errors };
}

async function fetchPublicVideo(videoId: string) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 TakeMaster/2.0' }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw Object.assign(new Error(`YouTube retornou HTTP ${response.status}.`), { status: 502 });
  const html = await response.text();
  const player = extractJsonAfter(html, 'ytInitialPlayerResponse') || {};
  const oembedResponse = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { signal: AbortSignal.timeout(10000) });
  if (!oembedResponse.ok) throw Object.assign(new Error('Metadados públicos do vídeo indisponíveis.'), { status: 404 });
  const oembed: any = await oembedResponse.json();
  const details = player?.videoDetails || {};
  const micro = player?.microformat?.playerMicroformatRenderer || {};
  const captionTracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const tracks = captionTracks.map((track: any) => ({ language: track.languageCode || 'und', name: track.name?.simpleText || '', kind: track.kind === 'asr' ? 'automatic' : 'manual', baseUrl: track.baseUrl })).filter((track: any) => track.baseUrl);
  return { videoId, canonicalUrl: url, title: oembed.title || details.title || videoId, description: details.shortDescription || '', channelTitle: oembed.author_name || details.author || '', channelId: details.channelId || null, publishedAt: micro.publishDate || micro.uploadDate || null, durationSeconds: Number(details.lengthSeconds) || null, thumbnailUrl: oembed.thumbnail_url || null, language: tracks[0]?.language || null, tracks, metadata: { provider: 'youtube', oembed, videoDetailsAvailable: Boolean(details.videoId) } };
}

async function readTranscriptTrack(track: { baseUrl: string; language: string; kind: string }) {
  const response = await fetch(track.baseUrl, { headers: { 'user-agent': 'Mozilla/5.0 TakeMaster/2.0' }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Falha ao obter legenda (HTTP ${response.status}).`);
  const xml = await response.text();
  if (!/<text\b|<p\b/i.test(xml)) return null;
  const segments: Array<{ start: number; duration: number | null; text: string }> = [];
  for (const match of xml.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>|<p\b([^>]*)>([\s\S]*?)<\/p>/gi)) {
    const attrs = match[1] || match[3] || '';
    const raw = match[2] || match[4] || '';
    const start = Number(attrs.match(/\b(?:start|t)=["']([^"']+)/)?.[1] || 0);
    const durationRaw = attrs.match(/\b(?:dur|d)=["']([^"']+)/)?.[1];
    const text = raw.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
    if (text) segments.push({ start, duration: durationRaw ? Number(durationRaw) : null, text });
  }
  if (!segments.length) return null;
  return { fullText: segments.map((s) => s.text).join(' '), segments, language: track.language, transcriptType: track.kind as 'manual' | 'automatic', sourceUrl: track.baseUrl };
}

export async function listEditorialCatalogPrograms() {
  const { data, error } = await db.from('program_catalog').select('id,slug,name,description,host,active,metadata').order('name');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function listEditorialVideos(catalogProgramId?: string) {
  let query = db.from('program_videos').select('*, program_catalog_sources(source_url,source_type), video_transcripts(id,language,version,status,is_current,created_at), video_editorial_analyses(id,summary,topics,guests,review_status,created_at)').order('published_at', { ascending: false, nullsFirst: false }).limit(200);
  if (catalogProgramId) query = query.eq('catalog_program_id', catalogProgramId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function importYouTubeVideo(input: string, catalogProgramId?: string) {
  const videoId = parseYouTubeVideoId(input);
  const video = await fetchPublicVideo(videoId);
  const { data: priorVideo, error: priorVideoError } = await db.from('program_videos').select('id,catalog_program_id').eq('provider', 'youtube').eq('external_video_id', videoId).maybeSingle();
  if (priorVideoError) throw new Error(priorVideoError.message);
  const effectiveProgramId = catalogProgramId || priorVideo?.catalog_program_id || null;
  if (effectiveProgramId) {
    const { data: program, error: programError } = await db.from('program_catalog').select('id').eq('id', effectiveProgramId).maybeSingle();
    if (programError) throw new Error(programError.message);
    if (!program) throw Object.assign(new Error('Programa não encontrado no catálogo canônico.'), { status: 404 });
  }
  const source = await db.from('program_catalog_sources').upsert({
    catalog_program_id: effectiveProgramId, source_type: 'youtube', source_url: video.canonicalUrl, canonical_url: video.canonicalUrl, platform_account_id: video.channelId, platform_handle: video.channelTitle,
    evidence: `Vídeo público: ${video.title}`, collected_at: new Date().toISOString(), source_published_at: video.publishedAt || null, content_hash: sha256(JSON.stringify(video.metadata)), extraction_method: 'youtube-public-player-and-oembed', confidence: video.channelId ? 0.95 : 0.75, metadata: { title: video.title, channelTitle: video.channelTitle },
  }, { onConflict: 'source_type,source_url' }).select('id').single();
  if (source.error) throw new Error(source.error.message);
  const saved = await db.from('program_videos').upsert({
    catalog_program_id: effectiveProgramId, source_id: source.data.id, provider: 'youtube', external_video_id: videoId, canonical_url: video.canonicalUrl, channel_id: video.channelId, channel_title: video.channelTitle, title: video.title, description: video.description, published_at: video.publishedAt || null, duration_seconds: video.durationSeconds, thumbnail_url: video.thumbnailUrl, language: video.language, transcript_status: video.tracks.length ? 'available' : 'unavailable', metadata: { ...video.metadata, captionTracks: video.tracks.map(({ language, name, kind }) => ({ language, name, kind })) }, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }, { onConflict: 'provider,external_video_id' }).select('*').single();
  if (saved.error) throw new Error(saved.error.message);
  let transcriptSaved: any = null;
  let transcriptError: string | null = null;
  for (const track of video.tracks) {
    try {
      const transcript = await readTranscriptTrack(track);
      if (!transcript) continue;
      const contentHash = sha256(transcript.fullText);
      const latest = await db.from('video_transcripts').select('version').eq('video_id', saved.data.id).eq('language', transcript.language).order('version', { ascending: false }).limit(1);
      if (latest.error) throw new Error(latest.error.message);
      const existing = await db.from('video_transcripts').select('*').eq('video_id', saved.data.id).eq('language', transcript.language).eq('content_hash', contentHash).maybeSingle();
      if (existing.error) throw new Error(existing.error.message);
      if (existing.data) { transcriptSaved = existing.data; break; }
      const version = (latest.data?.[0]?.version || 0) + 1;
      const clearCurrent = await db.from('video_transcripts').update({ is_current: false, status: 'superseded' }).eq('video_id', saved.data.id).eq('language', transcript.language).eq('is_current', true);
      if (clearCurrent.error) throw new Error(clearCurrent.error.message);
      const inserted = await db.from('video_transcripts').insert({ video_id: saved.data.id, version, language: transcript.language, transcript_type: transcript.transcriptType, full_text: transcript.fullText, segments: transcript.segments, source_url: video.canonicalUrl, content_hash: contentHash, fetched_at: new Date().toISOString(), is_current: true, status: 'ready', metadata: { captionTrackName: track.name } }).select('*').single();
      if (inserted.error) throw new Error(inserted.error.message);
      transcriptSaved = inserted.data; break;
    } catch (error: any) { transcriptError = error?.message || 'Erro ao importar legenda.'; }
  }
  const status = transcriptSaved ? 'available' : video.tracks.length ? 'error' : 'unavailable';
  const statusUpdate = await db.from('program_videos').update({ transcript_status: status, language: transcriptSaved?.language || video.language, updated_at: new Date().toISOString() }).eq('id', saved.data.id);
  if (statusUpdate.error) throw new Error(statusUpdate.error.message);
  return { video: { ...saved.data, transcript_status: status }, transcript: transcriptSaved, transcriptError, captionsAvailable: video.tracks.length > 0 };
}

export async function importYouTubeChannel(input: string, catalogProgramId?: string, maxVideos = 5000) {
  const discovery = await discoverYouTubeChannelVideos(input, maxVideos);
  const results: Array<{ videoId: string; title: string; status: 'imported' | 'failed'; transcript: boolean; error?: string }> = [];
  for (const item of discovery.videos) {
    try {
      const imported = await importYouTubeVideo(item.videoId, catalogProgramId);
      results.push({ videoId: item.videoId, title: imported.video.title, status: 'imported', transcript: Boolean(imported.transcript) });
    } catch (error: any) {
      results.push({ videoId: item.videoId, title: item.title, status: 'failed', transcript: false, error: error?.message || 'Falha ao importar vídeo.' });
    }
    await sleep(250);
  }
  return {
    channelUrl: discovery.channelUrl, channelTitle: discovery.channelTitle, pagesDiscovered: discovery.pages,
    discovered: discovery.videos.length, imported: results.filter((item) => item.status === 'imported').length,
    withTranscript: results.filter((item) => item.transcript).length,
    withoutTranscript: results.filter((item) => item.status === 'imported' && !item.transcript).length,
    failed: results.filter((item) => item.status === 'failed').length,
    reachedEnd: discovery.reachedEnd, truncated: discovery.truncated, discoveryErrors: discovery.errors, results,
  };
}
