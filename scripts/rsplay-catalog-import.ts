import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

type Candidate = { name: string; slug: string; presenter: string | null; sourceUrl: string; sourceTitle: string | null; description: string | null; collectedAt: string; contentHash: string };
const input = process.env.RSPLAY_SCRAPE_OUT || 'artifacts/rsplay-catalog-scrape.json';
const apply = process.argv.includes('--apply');
const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (apply && (!url || !key)) throw new Error('--apply exige SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente local seguro.');

async function main() {
  const raw = JSON.parse(await fs.readFile(input, 'utf8'));
  const candidates: Candidate[] = Array.isArray(raw.programCandidates) ? raw.programCandidates : [];
  if (!candidates.length) throw new Error('Nenhum programCandidate no artefato. Verifique o crawler antes de importar.');
  const db = apply ? createClient(url, key, { auth: { persistSession: false } }) : null;
  const report = { mode: apply ? 'apply' : 'dry-run', input, discovered: candidates.length, created: 0, enriched: 0, skipped: 0, candidates: [] as Array<Record<string, unknown>> };

  for (const candidate of candidates) {
    if (!candidate.name?.trim() || !candidate.slug?.trim() || !candidate.sourceUrl?.startsWith('https://')) {
      report.skipped++;
      report.candidates.push({ slug: candidate.slug, name: candidate.name, action: 'skip_invalid' });
      continue;
    }
    if (!apply || !db) {
      report.candidates.push({ slug: candidate.slug, name: candidate.name, sourceUrl: candidate.sourceUrl, action: 'review_before_apply' });
      continue;
    }

    const existingResult = await db.from('program_catalog').select('*').eq('slug', candidate.slug).maybeSingle();
    if (existingResult.error) throw new Error(existingResult.error.message);
    const existing = existingResult.data;
    const collectedAt = candidate.collectedAt || new Date().toISOString();
    const provenance = {
      source_type: 'official_site',
      source_url: candidate.sourceUrl,
      canonical_url: candidate.sourceUrl,
      evidence: candidate.sourceTitle || candidate.name,
      collected_at: collectedAt,
      content_hash: candidate.contentHash || null,
      extraction_method: 'rsplay-public-crawler',
      confidence: 0.7,
      metadata: { discoveredName: candidate.name, presenterCandidate: candidate.presenter, validation_status: 'needs_review' },
    };

    let catalogId: string;
    if (existing) {
      catalogId = existing.id;
      const metadata = { ...(existing.metadata || {}), validation_status: existing.metadata?.validation_status || 'needs_review', source_evidence: [...(Array.isArray(existing.metadata?.source_evidence) ? existing.metadata.source_evidence : []), { url: candidate.sourceUrl, collectedAt, contentHash: candidate.contentHash }].filter((item: any, index: number, all: any[]) => all.findIndex((other) => other.url === item.url) === index) };
      const patch: Record<string, unknown> = { metadata, updated_at: new Date().toISOString() };
      if (!existing.description && candidate.description) patch.description = candidate.description;
      if (!existing.host && candidate.presenter) patch.host = candidate.presenter;
      if (!existing.source_url) patch.source_url = candidate.sourceUrl;
      const update = await db.from('program_catalog').update(patch).eq('id', existing.id);
      if (update.error) throw new Error(update.error.message);
      report.enriched++;
    } else {
      const inserted = await db.from('program_catalog').insert({
        slug: candidate.slug, name: candidate.name, description: candidate.description || '',
        host: candidate.presenter, source_name: 'RS Play TV', source_url: candidate.sourceUrl,
        source_scraped_at: collectedAt, active: false, contractable: false,
        metadata: { validation_status: 'needs_review', discovered_by: 'rsplay-public-crawler', source_evidence: [{ url: candidate.sourceUrl, collectedAt, contentHash: candidate.contentHash }] },
      }).select('id').single();
      if (inserted.error) throw new Error(inserted.error.message);
      catalogId = inserted.data.id;
      report.created++;
    }

    const source = await db.from('program_catalog_sources').upsert({ ...provenance, catalog_program_id: catalogId }, { onConflict: 'source_type,source_url' });
    if (source.error) throw new Error(source.error.message);
    report.candidates.push({ slug: candidate.slug, name: candidate.name, catalogId, action: existing ? 'enriched_without_overwriting_manual_values' : 'created_needs_review' });
  }
  console.log(JSON.stringify(report, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
