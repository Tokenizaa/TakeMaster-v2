import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

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
  if (!VIDEO_ID.test(id)) throw Object.assign(new Error('Informe uma URL pública válida de vídeo do YouTube.'), { status: 400 });
  return id;
}

async function fetchPublicVideo(videoId: string) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 TakeMaster/2.0' }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw Object.assign(new Error(`YouTube retornou HTTP ${response.status}.`), { status: 502 });
  const html = await response.text();
  const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\})\s*;\s*(?:var\s|const\s|let\s|<)/);
  let player: any = null;
  if (match) { try { player = JSON.parse(match[1]); } catch { /* parse from oEmbed below */ } }
  const oembedResponse = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { signal: AbortSignal.timeout(10000) });
  if (!oembedResponse.ok) throw Object.assign(new Error('Metadados públicos do vídeo indisponíveis.'), { status: 404 });
  const oembed: any = await oembedResponse.json();
  const details = player?.videoDetails || {};
  const micro = player?.microformat?.playerMicroformatRenderer || {};
  const captionTracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const tracks = captionTracks.map((track: any) => ({
    language: track.languageCode || 'und',
    name: track.name?.simpleText || '',
    kind: track.kind === 'asr' ? 'automatic' : 'manual',
    baseUrl: track.baseUrl,
  })).filter((track: any) => track.baseUrl);
  return {
    videoId, canonicalUrl: url, title: oembed.title || details.title || videoId,
    description: details.shortDescription || '', channelTitle: oembed.author_name || details.author || '',
    channelId: details.channelId || null, publishedAt: micro.publishDate || micro.uploadDate || null,
    durationSeconds: Number(details.lengthSeconds) || null, thumbnailUrl: oembed.thumbnail_url || null,
    language: tracks[0]?.language || null, tracks, metadata: { provider: 'youtube', oembed, videoDetailsAvailable: Boolean(details.videoId) },
  };
}

async function readTranscriptTrack(track: { baseUrl: string; language: string; kind: string }) {
  // Only uses caption tracks advertised in the publicly accessible YouTube player response.
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
    catalog_program_id: effectiveProgramId, source_type: 'youtube', source_url: video.canonicalUrl,
    canonical_url: video.canonicalUrl, platform_account_id: video.channelId, platform_handle: video.channelTitle,
    evidence: `Vídeo público: ${video.title}`, collected_at: new Date().toISOString(),
    source_published_at: video.publishedAt || null, content_hash: sha256(JSON.stringify(video.metadata)),
    extraction_method: 'youtube-public-player-and-oembed', confidence: video.channelId ? 0.95 : 0.75,
    metadata: { title: video.title, channelTitle: video.channelTitle },
  }, { onConflict: 'source_type,source_url' }).select('id').single();
  if (source.error) throw new Error(source.error.message);
  const saved = await db.from('program_videos').upsert({
    catalog_program_id: effectiveProgramId, source_id: source.data.id, provider: 'youtube',
    external_video_id: videoId, canonical_url: video.canonicalUrl, channel_id: video.channelId,
    channel_title: video.channelTitle, title: video.title, description: video.description,
    published_at: video.publishedAt || null, duration_seconds: video.durationSeconds,
    thumbnail_url: video.thumbnailUrl, language: video.language,
    transcript_status: video.tracks.length ? 'available' : 'unavailable',
    metadata: { ...video.metadata, captionTracks: video.tracks.map(({ language, name, kind }) => ({ language, name, kind })) },
    last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString(),
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
      const inserted = await db.from('video_transcripts').insert({
        video_id: saved.data.id, version, language: transcript.language, transcript_type: transcript.transcriptType,
        full_text: transcript.fullText, segments: transcript.segments, source_url: video.canonicalUrl,
        content_hash: contentHash, fetched_at: new Date().toISOString(), is_current: true, status: 'ready',
        metadata: { captionTrackName: track.name },
      }).select('*').single();
      if (inserted.error) throw new Error(inserted.error.message);
      transcriptSaved = inserted.data;
      break;
    } catch (error: any) { transcriptError = error?.message || 'Erro ao importar legenda.'; }
  }
  const status = transcriptSaved ? 'available' : video.tracks.length ? 'error' : 'unavailable';
  const statusUpdate = await db.from('program_videos').update({ transcript_status: status, language: transcriptSaved?.language || video.language, updated_at: new Date().toISOString() }).eq('id', saved.data.id);
  if (statusUpdate.error) throw new Error(statusUpdate.error.message);
  return { video: { ...saved.data, transcript_status: status }, transcript: transcriptSaved, transcriptError, captionsAvailable: video.tracks.length > 0 };
}
