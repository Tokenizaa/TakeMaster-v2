import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';

const ROOTS = ['https://rsplay.com.br/', 'https://www.rsplay.com.br/'];
const MAX_PAGES = Number(process.env.RSPLAY_SCRAPE_MAX_PAGES || 1500);
const DELAY_MS = Number(process.env.RSPLAY_SCRAPE_DELAY_MS || 150);
const OUT = process.env.RSPLAY_SCRAPE_OUT || 'artifacts/rsplay-catalog-scrape.json';
const USER_AGENT = 'TakeMasterEditorialCatalogBot/1.0 (+respectful public-site indexing)';

type Page = { url: string; status: number; contentType: string; title: string | null; description: string | null; canonicalUrl: string; text: string; links: string[]; youtube: string[]; hash: string; fetchedAt: string };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const normalize = (raw: string, base: string) => {
  try {
    const u = new URL(raw, base);
    u.hash = '';
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.hostname.toLowerCase().replace(/^www\./, '') !== 'rsplay.com.br') return null;
    return u.href.replace(/\/$/, '') || 'https://rsplay.com.br/';
  } catch { return null; }
};
function decode(s: string) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function extract(html: string, url: string, status: number, contentType: string): Page {
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() || '');
  const description = decode(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] || '');
  const canonicalRaw = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] || url;
  const canonicalUrl = normalize(decode(canonicalRaw), url) || url;
  const links = [...html.matchAll(/(?:href|src)=["']([^"'#]+)["']/gi)].map((m) => normalize(decode(m[1]), url)).filter((v): v is string => Boolean(v));
  const youtube = [...new Set([...html.matchAll(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/g)].map((m) => m[1]))];
  const text = decode(html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
  return { url, status, contentType, title: title || null, description: description || null, canonicalUrl, text, links: [...new Set(links)], youtube, hash: hash(html), fetchedAt: new Date().toISOString() };
}
async function fetchText(url: string): Promise<{ text: string; status: number; type: string } | null> {
  try {
    const response = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xml;q=0.9,*/*;q=0.8' }, signal: AbortSignal.timeout(15000), redirect: 'follow' });
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !/(text\/html|xml|text\/plain)/i.test(type)) return { text: '', status: response.status, type };
    return { text: await response.text(), status: response.status, type };
  } catch { return null; }
}
async function main() {
  const queue = [...ROOTS];
  const visited = new Set<string>();
  const pages: Page[] = [];
  const youtubeIds = new Set<string>();
  while (queue.length && pages.length < MAX_PAGES) {
    const url = normalize(queue.shift()!, 'https://rsplay.com.br/');
    if (!url || visited.has(url)) continue;
    visited.add(url);
    const response = await fetchText(url);
    if (!response) { await sleep(DELAY_MS); continue; }
    if (response.status === 200 && /text\/html/i.test(response.type)) {
      const page = extract(response.text, url, response.status, response.type);
      pages.push(page);
      page.youtube.forEach((id) => youtubeIds.add(id));
      for (const link of page.links) if (!visited.has(link) && queue.length + pages.length < MAX_PAGES * 2) queue.push(link);
    } else if (/xml/i.test(response.type) && /sitemap/i.test(url)) {
      for (const match of response.text.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)) {
        const loc = normalize(decode(match[1].trim()), url);
        if (loc && !visited.has(loc)) queue.push(loc);
      }
    }
    // Discover sitemaps from standard locations, including when the root is a CMS landing page.
    if (url === 'https://rsplay.com.br/' || url === 'https://www.rsplay.com.br/') {
      queue.push(new URL('/sitemap.xml', url).href, new URL('/robots.txt', url).href);
    }
    await sleep(DELAY_MS);
  }
  const data = {
    generatedAt: new Date().toISOString(),
    scope: 'public pages only; no login/paywall/access-control bypass',
    limits: { maxPages: MAX_PAGES, delayMs: DELAY_MS },
    stats: { pagesVisited: visited.size, htmlPages: pages.length, youtubeVideoIds: youtubeIds.size, discoveredInternalUrls: visited.size },
    pages,
    youtubeVideoIds: [...youtubeIds].map((id) => ({ provider: 'youtube', externalVideoId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` })),
  };
  await fs.mkdir(OUT.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ output: OUT, ...data.stats }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
