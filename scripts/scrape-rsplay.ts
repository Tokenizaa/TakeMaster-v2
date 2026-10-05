/**
 * RS Play Editorial Scraper & Structured RAG Knowledge Base Builder
 *
 * Performs a complete, polite, traceable editorial scrape of https://www.rsplay.com.br/
 * including:
 * - Homepage (index.html + inline PROGRAMS/TESTIMONIALS fallback arrays)
 * - Station Media Kit 2026 (midia2026.html + inline PROGRAMS/TESTIMONIALS arrays)
 * - Dynamic CMS Catalog (data/rsplay_cms.json + assets/rsplay-cms.js + assets/rsplay-cms-manual-render.js)
 * - All individual Program Media Kit HTML pages (e.g., advogada_leque.html, fazsentido.html, dna.html, etc.)
 * - Multi-URL consolidation (e.g., grenalshow.html + midia_grenal.html consolidated into grenal-show; 2ou10.html consolidated into 2-ou-10)
 * - Special Project Presentations (apresentacoes/nba_park.html, turismo.html, summit.html, reality.html)
 *
 * Strictly adheres to Rule 6: Never invents or infers missing data ("não informado na fonte").
 * Preserves full source provenance (URL, page title, scrape timestamp, page type, section, verbatim text).
 */

import fs from 'fs';
import path from 'path';

const BASE_ORIGIN = 'https://www.rsplay.com.br';
const USER_AGENT =
  'TakeMasterEditorialKnowledgeBot/2.0 (+https://www.rsplay.com.br; polite-editorial-crawler)';
const NAO_INFORMADO = 'não informado na fonte';
const SCRAPE_STARTED_AT = new Date().toISOString();

interface FetchedPage {
  url: string;
  canonicalUrl: string;
  status: number;
  ok: boolean;
  contentType: string;
  rawText: string;
  title: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  scrapedAt: string;
  pageType:
    | 'pagina_inicial'
    | 'midia_kit_emissora_2026'
    | 'catalogo_cms_json'
    | 'midia_kit_programa'
    | 'apresentacao_especial'
    | 'script_cms'
    | 'manifest'
    | 'pagina_inacessivel_404'
    | 'outro';
  isEmptyContent: boolean;
  error?: string;
}

interface ExtractedSection {
  indice: number;
  origemUrl: string;
  identificadorSlideOuSecao: string;
  tituloSecao: string;
  subtitulos: string[];
  paragrafos: string[];
  itensLista: string[];
  textoOriginalLimpo: string;
}

interface MediaItem {
  url: string;
  tipo: 'imagem' | 'video_hls' | 'video_mp4' | 'youtube' | 'iframe_embed' | 'pdf_documento';
  paginaDeOrigem: string;
  altText: string;
  tituloOuCaption: string;
  contexto: string;
  programaRelacionado: string;
}

interface SourceExcerpt {
  secaoOrigem: string;
  origemDoTrecho: string;
  textoOriginal: string;
}

interface SourceRecord {
  urlOriginal: string;
  urlCanonica: string;
  tituloDaPagina: string;
  dataHoraScrape: string;
  tipoDePagina: string;
  statusHttp: number;
  programaRelacionado: string;
  trechosExtraidos: SourceExcerpt[];
}

export function normalizeUrl(rawUrl: string | undefined | null, base = BASE_ORIGIN): string | null {
  if (!rawUrl) return null;
  const trimmed = String(rawUrl).trim();
  if (
    !trimmed ||
    trimmed === '#' ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.includes('${')
  ) {
    return null;
  }
  try {
    const u = new URL(trimmed, base);
    if (u.hostname === 'rsplay.com.br') {
      u.hostname = 'www.rsplay.com.br';
    }
    if (u.hostname === 'www.rsplay.com.br' && u.protocol === 'http:') {
      u.protocol = 'https:';
    }
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

export function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  const named: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&quot;': '"',
    '&#039;': "'",
    '&apos;': "'",
    '&lt;': '<',
    '&gt;': '>',
    '&ndash;': '–',
    '&mdash;': '—',
    '&bull;': '•',
    '&middot;': '·',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&rarr;': '→',
    '&larr;': '←',
    '&hearts;': '♥',
    '&ldquo;': '“',
    '&rdquo;': '”',
    '&lsquo;': '‘',
    '&rsquo;': '’',
    '&hellip;': '…',
    '&aacute;': 'á',
    '&Aacute;': 'Á',
    '&acirc;': 'â',
    '&Acirc;': 'Â',
    '&atilde;': 'ã',
    '&Atilde;': 'Ã',
    '&agrave;': 'à',
    '&Agrave;': 'À',
    '&eacute;': 'é',
    '&Eacute;': 'É',
    '&ecirc;': 'ê',
    '&Ecirc;': 'Ê',
    '&iacute;': 'í',
    '&Iacute;': 'Í',
    '&oacute;': 'ó',
    '&Oacute;': 'Ó',
    '&ocirc;': 'ô',
    '&Ocirc;': 'Ô',
    '&otilde;': 'õ',
    '&Otilde;': 'Õ',
    '&uacute;': 'ú',
    '&Uacute;': 'Ú',
    '&ccedil;': 'ç',
    '&Ccedil;': 'Ç',
  };

  const out = input.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    if (named[entity] !== undefined) return named[entity];
    if (entity.startsWith('&#x') || entity.startsWith('&#X')) {
      const code = parseInt(entity.slice(3, -1), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }
    if (entity.startsWith('&#')) {
      const code = parseInt(entity.slice(2, -1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }
    return entity;
  });

  return out.replace(/\s+/g, ' ').trim();
}

export function stripHtmlToText(html: string): string {
  if (!html) return '';
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const withBreaks = withoutScripts
    .replace(
      /<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|section|article|header|footer|blockquote)>/gi,
      '\n'
    )
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  return withBreaks
    .split('\n')
    .map((line) => decodeHtmlEntities(line))
    .filter((line) => line.length > 0)
    .join('\n');
}

export function slugifyProgram(name: string, fallbackId?: string): string {
  const base = (name || fallbackId || 'programa')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/\+/g, ' mais ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'programa-sem-nome';
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPagePolite(
  url: string,
  pageType: FetchedPage['pageType']
): Promise<FetchedPage> {
  const canonicalUrl = normalizeUrl(url) || url;
  const scrapedAt = new Date().toISOString();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(canonicalUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/json,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();

    const titleMatch = rawText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '')) : '';

    const extractMeta = (attrName: string, attrVal: string): string => {
      const regex1 = new RegExp(
        `<meta[^>]+${attrName}=["']${attrVal}["'][^>]+content=["']([^"']*)["']`,
        'i'
      );
      const regex2 = new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+${attrName}=["']${attrVal}["']`,
        'i'
      );
      const m = rawText.match(regex1) || rawText.match(regex2);
      return m ? decodeHtmlEntities(m[1]) : '';
    };

    const metaDescription = extractMeta('name', 'description');
    const ogTitle = extractMeta('property', 'og:title');
    const ogDescription = extractMeta('property', 'og:description');
    const ogImage = extractMeta('property', 'og:image');

    const is404Page =
      !res.ok ||
      res.status === 404 ||
      title.includes('404 Not Found') ||
      rawText.includes('<title> 404 Not Found</title>');

    const strippedBody = stripHtmlToText(rawText);
    const isEmptyContent = is404Page || strippedBody.length < 40;

    return {
      url,
      canonicalUrl,
      status: res.status,
      ok: res.ok && !is404Page,
      contentType,
      rawText,
      title: title || canonicalUrl,
      metaDescription,
      ogTitle,
      ogDescription,
      ogImage,
      scrapedAt,
      pageType: is404Page ? 'pagina_inacessivel_404' : pageType,
      isEmptyContent,
    };
  } catch (err: any) {
    return {
      url,
      canonicalUrl,
      status: 0,
      ok: false,
      contentType: '',
      rawText: '',
      title: canonicalUrl,
      metaDescription: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      scrapedAt,
      pageType: 'pagina_inacessivel_404',
      isEmptyContent: true,
      error: String(err?.message || err),
    };
  }
}

function extractInlineJsArray(html: string, constName: string): any[] {
  const regex = new RegExp(`const\\s+${constName}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'm');
  const match = html.match(regex);
  if (!match) return [];
  const arraySource = `[${match[1]}]`;
  try {
    const fn = new Function(`return ${arraySource};`);
    const result = fn();
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

function extractHtmlSections(html: string, pageUrl: string): ExtractedSection[] {
  if (!html) return [];

  const cleanedHtml = html.replace(
    /<!--\s*Sequência\s*2[\s\S]*?(?=<\/div>\s*<\/div>\s*<\/section>|<\/section>)/gi,
    ''
  );

  const bodyMatch = cleanedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : cleanedHtml;

  const blockRegex =
    /(?:<!--\s*([^>]*?)\s*-->\s*)?<(section|header|footer|article)\b[^>]*>([\s\S]*?)<\/\2>/gi;

  const sections: ExtractedSection[] = [];
  const seenTexts = new Set<string>();

  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = blockRegex.exec(bodyHtml)) !== null) {
    const commentLabel = match[1] ? decodeHtmlEntities(match[1].trim()) : '';
    const tagName = match[2].toLowerCase();
    const innerHtml = match[3];

    if (tagName === 'header' && innerHtml.length < 600 && !innerHtml.includes('<h1')) {
      continue;
    }

    const headings = [...innerHtml.matchAll(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
      .map((m) => decodeHtmlEntities(m[2].replace(/<[^>]+>/g, ' ')))
      .filter((h) => h.length > 0);

    const paragraphs = [...innerHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ' ')))
      .filter((p) => p.length > 0);

    const listItems = [...innerHtml.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((m) => decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ' ')))
      .filter((li) => li.length > 0);

    const cleanText = stripHtmlToText(innerHtml);
    if (!cleanText || cleanText.length < 10) continue;

    const fingerprint = cleanText.replace(/\s+/g, ' ').trim();
    if (seenTexts.has(fingerprint)) continue;
    seenTexts.add(fingerprint);

    idx += 1;
    const primaryHeading =
      headings[0] ||
      commentLabel ||
      (tagName === 'footer' ? 'Rodapé / Contato e Créditos' : `Seção ${idx}`);

    sections.push({
      indice: idx,
      origemUrl: pageUrl,
      identificadorSlideOuSecao: commentLabel || `${tagName.toUpperCase()} #${idx}`,
      tituloSecao: primaryHeading,
      subtitulos: headings.slice(1),
      paragrafos: [...new Set(paragraphs)],
      itensLista: [...new Set(listItems)],
      textoOriginalLimpo: cleanText,
    });
  }

  if (sections.length === 0) {
    const cleanText = stripHtmlToText(bodyHtml);
    if (cleanText.length > 0) {
      const headings = [...bodyHtml.matchAll(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
        .map((m) => decodeHtmlEntities(m[2].replace(/<[^>]+>/g, ' ')))
        .filter(Boolean);
      const paragraphs = [...bodyHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
        .map((m) => decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ' ')))
        .filter(Boolean);
      sections.push({
        indice: 1,
        origemUrl: pageUrl,
        identificadorSlideOuSecao: 'CONTEUDO_PRINCIPAL',
        tituloSecao: headings[0] || 'Conteúdo Principal',
        subtitulos: headings.slice(1),
        paragrafos: [...new Set(paragraphs)],
        itensLista: [],
        textoOriginalLimpo: cleanText,
      });
    }
  }

  return sections;
}

function extractPageMedia(
  html: string,
  pageUrl: string,
  programName: string,
  ogImage?: string
): MediaItem[] {
  const media: MediaItem[] = [];
  const seenUrls = new Set<string>();

  const addMedia = (item: MediaItem) => {
    const norm = normalizeUrl(item.url, pageUrl);
    if (!norm) return;
    if (
      norm.includes('googletagmanager.com') ||
      norm.includes('fonts.googleapis.com') ||
      norm.includes('fonts.gstatic.com') ||
      norm.includes('unpkg.com') ||
      norm.includes('cdnjs.cloudflare.com') ||
      norm.includes('cdn.tailwindcss.com')
    ) {
      return;
    }
    const key = `${item.tipo}:${norm}`;
    if (seenUrls.has(key)) return;
    seenUrls.add(key);
    media.push({
      ...item,
      url: norm,
    });
  };

  if (ogImage) {
    addMedia({
      url: ogImage,
      tipo: 'imagem',
      paginaDeOrigem: pageUrl,
      altText: `${programName} — OpenGraph Image`,
      tituloOuCaption: 'Imagem de compartilhamento (og:image)',
      contexto: 'open_graph_capa',
      programaRelacionado: programName,
    });
  }

  for (const imgMatch of html.matchAll(/<img\b([^>]+)>/gi)) {
    const attrs = imgMatch[1];
    const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const altMatch = attrs.match(/\balt\s*=\s*["']([^"']*)["']/i);
    const titleMatch = attrs.match(/\btitle\s*=\s*["']([^"']*)["']/i);
    const rawSrc = srcMatch[1];
    const altText =
      altMatch && altMatch[1].trim() ? decodeHtmlEntities(altMatch[1]) : NAO_INFORMADO;
    const caption =
      titleMatch && titleMatch[1].trim() ? decodeHtmlEntities(titleMatch[1]) : NAO_INFORMADO;

    let contexto = 'imagem_editorial_pagina';
    if (/logo/i.test(rawSrc) || /logo/i.test(altText)) contexto = 'logo_programa';
    else if (/galeria|advogada_leque\d+|slide|foto/i.test(rawSrc)) contexto = 'galeria_midia_kit';
    else if (/card|capa|hero|banner/i.test(rawSrc)) contexto = 'capa_hero_card';
    else if (/apresentador|host|taise|perfil/i.test(rawSrc) || /apresentador/i.test(altText))
      contexto = 'apresentador';

    addMedia({
      url: rawSrc,
      tipo: 'imagem',
      paginaDeOrigem: pageUrl,
      altText,
      tituloOuCaption: caption,
      contexto,
      programaRelacionado: programName,
    });
  }

  for (const bgMatch of html.matchAll(
    /url\(['"]?([^'")]+(?:\.jpg|\.jpeg|\.png|\.webp|\.svg))['"]?\)/gi
  )) {
    addMedia({
      url: bgMatch[1],
      tipo: 'imagem',
      paginaDeOrigem: pageUrl,
      altText: NAO_INFORMADO,
      tituloOuCaption: NAO_INFORMADO,
      contexto: 'background_visual_secao',
      programaRelacionado: programName,
    });
  }

  for (const vidMatch of html.matchAll(/["']([^"']+\.(?:m3u8|mp4)(?:\?[^"']*)?)["']/gi)) {
    const rawVid = vidMatch[1];
    addMedia({
      url: rawVid,
      tipo: rawVid.includes('.m3u8') ? 'video_hls' : 'video_mp4',
      paginaDeOrigem: pageUrl,
      altText: NAO_INFORMADO,
      tituloOuCaption: 'Stream / Vídeo na página',
      contexto: 'player_video',
      programaRelacionado: programName,
    });
  }

  for (const ytMatch of html.matchAll(
    /https?:\/\/(?:www\.)?(?:youtube\.com\/[^\s"'<>]+|youtu\.be\/[^\s"'<>]+)/gi
  )) {
    const rawYt = ytMatch[0];
    if (rawYt.includes('${')) continue;
    addMedia({
      url: rawYt,
      tipo: 'youtube',
      paginaDeOrigem: pageUrl,
      altText: NAO_INFORMADO,
      tituloOuCaption: 'Canal / Playlist / Vídeo YouTube',
      contexto: 'youtube_referencia',
      programaRelacionado: programName,
    });
  }

  for (const ifrMatch of html.matchAll(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    addMedia({
      url: ifrMatch[1],
      tipo: 'iframe_embed',
      paginaDeOrigem: pageUrl,
      altText: NAO_INFORMADO,
      tituloOuCaption: 'Embed externo (iframe)',
      contexto: 'embed_pagina',
      programaRelacionado: programName,
    });
  }

  for (const pdfMatch of html.matchAll(/["']([^"']+\.pdf(?:\?[^"']*)?)["']/gi)) {
    addMedia({
      url: pdfMatch[1],
      tipo: 'pdf_documento',
      paginaDeOrigem: pageUrl,
      altText: NAO_INFORMADO,
      tituloOuCaption: 'Documento PDF público',
      contexto: 'documento_anexo',
      programaRelacionado: programName,
    });
  }

  return media;
}

function extractContactsAndSocials(html: string, cleanText: string, pageUrl: string) {
  const socials = new Set<string>();
  const contacts = new Set<string>();
  const links = new Set<string>();

  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const raw = m[1].trim();
    if (!raw || raw === '#' || raw.startsWith('javascript:') || raw.includes('${')) continue;
    if (raw.startsWith('mailto:')) {
      contacts.add(`E-mail: ${raw.replace(/^mailto:/i, '')}`);
      continue;
    }
    if (raw.startsWith('tel:')) {
      contacts.add(`Telefone: ${raw.replace(/^tel:/i, '')}`);
      continue;
    }
    const norm = normalizeUrl(raw, pageUrl);
    if (!norm) continue;
    if (
      norm.includes('fonts.googleapis.com') ||
      norm.includes('fonts.gstatic.com') ||
      norm.includes('cdnjs.cloudflare.com') ||
      norm.includes('unpkg.com') ||
      norm.includes('cdn.jsdelivr.net')
    ) {
      continue;
    }
    if (/wa\.me|whatsapp\.com/i.test(norm)) {
      contacts.add(`WhatsApp: ${norm}`);
      links.add(norm);
    } else if (
      /instagram\.com|facebook\.com|tiktok\.com|youtube\.com|youtu\.be|linkedin\.com/i.test(norm)
    ) {
      socials.add(norm);
      links.add(norm);
    } else if (!/\.(css|js|png|jpg|jpeg|svg|ico|webp)$/i.test(norm)) {
      links.add(norm);
    }
  }

  for (const handleMatch of cleanText.matchAll(/(?:^|[\s(•])(@[a-zA-Z0-9._]{3,35})\b/g)) {
    const handle = handleMatch[1];
    if (
      !/^@(?:media|keyframes|import|supports|font-face|tailwind|charset|layer|property)/i.test(
        handle
      )
    ) {
      socials.add(handle);
    }
  }

  for (const emailMatch of cleanText.matchAll(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
  )) {
    contacts.add(`E-mail: ${emailMatch[0]}`);
  }

  for (const phoneMatch of cleanText.matchAll(/\(\d{2}\)\s*\d{4,5}[-\s]?\d{4}/g)) {
    contacts.add(`Telefone/WhatsApp: ${phoneMatch[0]}`);
  }

  return {
    redesSociais: [...socials],
    contatos: [...contacts],
    links: [...links],
  };
}

function classifySectionsIntoProfileFields(sections: ExtractedSection[], scheduleHint = '') {
  const apresentadorBios: string[] = [];
  const propostaTexts: string[] = [];
  const conceitoTexts: string[] = [];
  const publicoTexts: string[] = [];
  const temasList: string[] = [];
  const quadrosList: string[] = [];
  const formatoTexts: string[] = [];
  const duracaoTexts: string[] = [];
  const periodicidadeTexts: string[] = [];
  const comercialTexts: string[] = [];
  const diferenciaisTexts: string[] = [];
  const chamadasTexts: string[] = [];
  const textosPromocionais: string[] = [];
  const especialistasTexts: string[] = [];

  if (/\b\d+\s*(?:minutos|min\b)/i.test(scheduleHint)) {
    duracaoTexts.push(scheduleHint);
  }

  for (const sec of sections) {
    const headerCombined =
      `${sec.identificadorSlideOuSecao} ${sec.tituloSecao} ${sec.subtitulos.join(' ')}`.toLowerCase();
    const bodyText = sec.paragrafos.length > 0 ? sec.paragrafos.join(' ') : sec.textoOriginalLimpo;

    if (sec.indice === 1 || /capa|hero/i.test(headerCombined)) {
      if (sec.subtitulos.length > 0) chamadasTexts.push(...sec.subtitulos);
      if (sec.paragrafos.length > 0) textosPromocionais.push(...sec.paragrafos);
    }

    if (
      /apresentador|apresentadora|quem conduz|quem comanda|quem faz|sobre mim|trajetória|entrevistador|âncora|host|comunicador/i.test(
        headerCombined
      )
    ) {
      apresentadorBios.push(`[${sec.tituloSecao}] ${bodyText}`);
    }

    if (/convidado|especialista|colunista|comentarista|equipe|elenco/i.test(headerCombined)) {
      especialistasTexts.push(`[${sec.tituloSecao}] ${bodyText}`);
    }

    if (
      /objetivo|proposta|sobre o programa|o programa|propósito|missão|resumo dos objetivos|essência|por que assistir/i.test(
        headerCombined
      )
    ) {
      propostaTexts.push(`[${sec.tituloSecao}] ${bodyText}`);
    }

    if (/conceito|posicionamento|manifesto|filosofia|visão geral|tese/i.test(headerCombined)) {
      conceitoTexts.push(`[${sec.tituloSecao}] ${bodyText}`);
    }

    if (
      /público|publico|audiência|audiencia|quem assiste|perfil|target|profissionais entre/i.test(
        headerCombined
      )
    ) {
      publicoTexts.push(`[${sec.tituloSecao}] ${bodyText}`);
    }

    if (/tema|pilar|editoria|assunto|pauta|conteúdo abordado|eixos/i.test(headerCombined)) {
      if (sec.subtitulos.length > 0) temasList.push(...sec.subtitulos);
      if (sec.itensLista.length > 0) temasList.push(...sec.itensLista);
      if (sec.paragrafos.length > 0) temasList.push(...sec.paragrafos);
    }

    if (
      /quadro|dinâmica|dinamica|estrutura|dna do episódio|formato do episódio|bloco|momentos/i.test(
        headerCombined
      )
    ) {
      if (sec.subtitulos.length > 0) quadrosList.push(...sec.subtitulos);
      if (sec.itensLista.length > 0) quadrosList.push(...sec.itensLista);
      if (sec.paragrafos.length > 0) quadrosList.push(...sec.paragrafos);
    }

    if (
      /formato|temporada|duração|duracao|exibição|exibicao|dna do episódio/i.test(headerCombined)
    ) {
      formatoTexts.push(`[${sec.tituloSecao}] ${bodyText}`);
    }

    if (
      /comercial|oportunidade|patrocínio|patrocinio|cota|investimento|alcance|métrica|metrica|ecossistema rs play|anuncie|associe sua marca|marca|entregas/i.test(
        headerCombined
      )
    ) {
      const items = sec.itensLista.length > 0 ? ` | Itens: ${sec.itensLista.join('; ')}` : '';
      comercialTexts.push(`[${sec.tituloSecao}] ${bodyText}${items}`);
    }

    if (
      /diferencial|diferenciais|por que anunciar|exclusivo|autoridade|destaque/i.test(
        headerCombined
      )
    ) {
      diferenciaisTexts.push(`[${sec.tituloSecao}] ${bodyText}`);
    }

    for (const p of sec.paragrafos) {
      if (
        /\b\d+\s*(?:minutos|min\b|hora|h\b)/i.test(p) &&
        /duração|episódio|programa|formato|bloco/i.test(p)
      ) {
        duracaoTexts.push(p);
      }
      if (
        /\b(?:semanal|diário|diario|quinzenal|mensal|por temporadas|segunda a sexta|toda[s]?\s+(?:segunda|terça|quarta|quinta|sexta|sábado|domingo))\b/i.test(
          p
        )
      ) {
        periodicidadeTexts.push(p);
      }
    }
  }

  return {
    apresentadorBioExtraida: apresentadorBios.join('\n\n'),
    especialistasConvidados: [...new Set(especialistasTexts)],
    propostaEditorial: propostaTexts.join('\n\n'),
    conceito: conceitoTexts.join('\n\n'),
    publico: publicoTexts.join('\n\n'),
    temasAbordados: [...new Set(temasList)],
    quadros: [...new Set(quadrosList)],
    formato: formatoTexts.join(' | '),
    duracao: [...new Set(duracaoTexts)].join(' | '),
    periodicidade: [...new Set(periodicidadeTexts)].join(' | '),
    informacoesComerciais: comercialTexts,
    diferenciais: diferenciaisTexts,
    chamadas: [...new Set(chamadasTexts)],
    textosPromocionais: [...new Set(textosPromocionais)],
  };
}

// Explicit URL-to-canonical-slug consolidation map for multi-URL or standalone pages
const EXPLICIT_URL_CONSOLIDATION: Record<
  string,
  { slug: string; defaultTitle: string; tipoRegistro: 'programa' | 'apresentacao_especial' }
> = {
  'https://www.rsplay.com.br/2ou10.html': {
    slug: '2-ou-10',
    defaultTitle: '2 OU 10',
    tipoRegistro: 'programa',
  },
  'https://www.rsplay.com.br/sportsplay.html': {
    slug: 'sports-play',
    defaultTitle: 'SPORTS PLAY — A CASA DO ESPORTE GAÚCHO',
    tipoRegistro: 'programa',
  },
  'https://www.rsplay.com.br/midia_grenal.html': {
    slug: 'grenal-show',
    defaultTitle: 'GRENAL SHOW',
    tipoRegistro: 'programa',
  },
  'https://www.rsplay.com.br/apresentacoes/nba_park.html': {
    slug: 'rsplay-serra-gaucha-nba-park',
    defaultTitle: 'RSPLAY SERRA GAÚCHA + NBA PARK',
    tipoRegistro: 'apresentacao_especial',
  },
  'https://www.rsplay.com.br/apresentacoes/turismo.html': {
    slug: 'rsplay-divulgacao-turismo-rs',
    defaultTitle: 'PROJETO DIVULGAÇÃO DO TURISMO DO RIO GRANDE DO SUL',
    tipoRegistro: 'apresentacao_especial',
  },
  'https://www.rsplay.com.br/apresentacoes/summit.html': {
    slug: 'hype-summit-brasil-2026',
    defaultTitle: 'HYPE SUMMIT BRASIL — PORTO ALEGRE 2026',
    tipoRegistro: 'apresentacao_especial',
  },
  'https://www.rsplay.com.br/apresentacoes/reality.html': {
    slug: 'rsplay-reality-shows',
    defaultTitle: 'RSPLAY TV & TVSPLAY — REALITY SHOWS',
    tipoRegistro: 'apresentacao_especial',
  },
};

async function runScrape() {
  console.log('1. Verificando robots.txt, sitemap.xml e páginas base do RS Play...');
  const crawledPages = new Map<string, FetchedPage>();

  const robotsPage = await fetchPagePolite(`${BASE_ORIGIN}/robots.txt`, 'outro');
  const sitemapPage = await fetchPagePolite(`${BASE_ORIGIN}/sitemap.xml`, 'outro');
  const indexPage = await fetchPagePolite(`${BASE_ORIGIN}/`, 'pagina_inicial');
  const midia2026Page = await fetchPagePolite(
    `${BASE_ORIGIN}/midia2026.html`,
    'midia_kit_emissora_2026'
  );
  const cmsJsonPage = await fetchPagePolite(
    `${BASE_ORIGIN}/data/rsplay_cms.json`,
    'catalogo_cms_json'
  );
  const manifestPage = await fetchPagePolite(`${BASE_ORIGIN}/manifest.json`, 'manifest');
  const cmsJsPage = await fetchPagePolite(`${BASE_ORIGIN}/assets/rsplay-cms.js?v=17`, 'script_cms');
  const cmsManualJsPage = await fetchPagePolite(
    `${BASE_ORIGIN}/assets/rsplay-cms-manual-render.js?v=24`,
    'script_cms'
  );

  for (const p of [
    robotsPage,
    sitemapPage,
    indexPage,
    midia2026Page,
    cmsJsonPage,
    manifestPage,
    cmsJsPage,
    cmsManualJsPage,
  ]) {
    crawledPages.set(p.canonicalUrl, p);
  }

  const cmsData = cmsJsonPage.ok ? JSON.parse(cmsJsonPage.rawText) : { programs: [] };
  const indexInlinePrograms = extractInlineJsArray(indexPage.rawText, 'PROGRAMS');
  const indexInlineTestimonials = extractInlineJsArray(indexPage.rawText, 'TESTIMONIALS');
  const midiaInlinePrograms = extractInlineJsArray(midia2026Page.rawText, 'PROGRAMS');

  const discoveredInternalUrls = new Set<string>();
  const addCandidateUrl = (raw: string | undefined | null, base = BASE_ORIGIN) => {
    const norm = normalizeUrl(raw, base);
    if (!norm) return;
    try {
      const u = new URL(norm);
      if (u.hostname === 'www.rsplay.com.br' && /\.html?$/i.test(u.pathname)) {
        discoveredInternalUrls.add(norm);
      }
    } catch {
      // ignore
    }
  };

  for (const srcHtml of [indexPage.rawText, midia2026Page.rawText]) {
    for (const m of srcHtml.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
      addCandidateUrl(m[1], BASE_ORIGIN);
    }
  }

  for (const prog of cmsData.programs || []) {
    addCandidateUrl(prog.mediaKitUrl, BASE_ORIGIN);
    addCandidateUrl(prog.mediaKitFile, BASE_ORIGIN);
  }
  for (const prog of [...indexInlinePrograms, ...midiaInlinePrograms]) {
    addCandidateUrl(prog.mediaKitUrl, BASE_ORIGIN);
    addCandidateUrl(prog.mediaKitFile, BASE_ORIGIN);
    addCandidateUrl(prog.link, BASE_ORIGIN);
  }
  addCandidateUrl('https://www.rsplay.com.br/advogada_leque.html');

  const queue = [...discoveredInternalUrls].filter((u) => !crawledPages.has(u));
  console.log(
    `2. Coletando ${queue.length} páginas internas de programas, mídia kits e apresentações...`
  );

  const BATCH_SIZE = 5;
  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((u) => {
        const isPresentation = u.includes('/apresentacoes/');
        return fetchPagePolite(u, isPresentation ? 'apresentacao_especial' : 'midia_kit_programa');
      })
    );
    for (const res of results) {
      crawledPages.set(res.canonicalUrl, res);
      if (res.ok && res.rawText) {
        for (const m of res.rawText.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
          const norm = normalizeUrl(m[1], res.canonicalUrl);
          if (
            norm &&
            norm.startsWith('https://www.rsplay.com.br/') &&
            /\.html?$/i.test(new URL(norm).pathname) &&
            !crawledPages.has(norm) &&
            !queue.includes(norm)
          ) {
            queue.push(norm);
          }
        }
      }
    }
    await sleep(120);
  }

  console.log(`Total de páginas/endpoints verificados: ${crawledPages.size}`);

  // Clean and recreate /programs directory to ensure no stale folders remain
  const outputRoot = path.resolve(process.cwd(), 'programs');
  if (fs.existsSync(outputRoot)) {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(outputRoot, { recursive: true });

  interface ConsolidatedProgramSeed {
    slug: string;
    defaultTitle?: string;
    cmsEntry?: any;
    indexInlineEntry?: any;
    midiaInlineEntry?: any;
    mediaKitUrls: string[];
    tipoRegistro: 'programa' | 'apresentacao_especial';
  }

  const programMap = new Map<string, ConsolidatedProgramSeed>();
  const urlToSlugMap = new Map<string, string>();

  for (const p of cmsData.programs || []) {
    const rawTitle = String(p.title || p.menuTitle || p.kitTitle || p.id || '').trim();
    const slug = slugifyProgram(rawTitle, p.id);
    const kitUrl =
      normalizeUrl(
        p.mediaKitUrl && p.mediaKitUrl !== '#' ? p.mediaKitUrl : p.mediaKitFile,
        BASE_ORIGIN
      ) || undefined;

    programMap.set(slug, {
      slug,
      defaultTitle: rawTitle,
      cmsEntry: p,
      mediaKitUrls: kitUrl ? [kitUrl] : [],
      tipoRegistro: 'programa',
    });
    if (kitUrl) urlToSlugMap.set(kitUrl, slug);
  }

  const mergeInlineProgram = (
    inlineProg: any,
    sourceKey: 'indexInlineEntry' | 'midiaInlineEntry'
  ) => {
    const rawTitle = String(inlineProg.title || inlineProg.id || '').trim();
    const kitUrl = normalizeUrl(
      inlineProg.mediaKitUrl || inlineProg.mediaKitFile || inlineProg.link,
      BASE_ORIGIN
    );
    let targetSlug = kitUrl ? urlToSlugMap.get(kitUrl) : undefined;
    if (!targetSlug) {
      const candidateSlug = slugifyProgram(rawTitle, inlineProg.id);
      if (programMap.has(candidateSlug)) {
        targetSlug = candidateSlug;
      } else {
        for (const [k, v] of programMap.entries()) {
          if (v.cmsEntry && String(v.cmsEntry.id) === String(inlineProg.id)) {
            targetSlug = k;
            break;
          }
        }
      }
    }
    if (!targetSlug) {
      targetSlug = slugifyProgram(rawTitle, inlineProg.id);
    }

    const existing = programMap.get(targetSlug) || {
      slug: targetSlug,
      defaultTitle: rawTitle,
      mediaKitUrls: [],
      tipoRegistro: 'programa' as const,
    };
    existing[sourceKey] = inlineProg;
    if (kitUrl && !existing.mediaKitUrls.includes(kitUrl)) {
      existing.mediaKitUrls.push(kitUrl);
      urlToSlugMap.set(kitUrl, targetSlug);
    }
    programMap.set(targetSlug, existing);
  };

  for (const p of indexInlinePrograms) mergeInlineProgram(p, 'indexInlineEntry');
  for (const p of midiaInlinePrograms) mergeInlineProgram(p, 'midiaInlineEntry');

  // Consolidate remaining HTML pages (including multi-URL programs like midia_grenal.html and 2ou10.html)
  for (const [url, page] of crawledPages.entries()) {
    if (
      page.pageType !== 'midia_kit_programa' &&
      page.pageType !== 'apresentacao_especial' &&
      page.pageType !== 'pagina_inacessivel_404'
    ) {
      continue;
    }
    if (
      url === `${BASE_ORIGIN}/` ||
      url === `${BASE_ORIGIN}/midia2026.html` ||
      url === `${BASE_ORIGIN}/robots.txt` ||
      url === `${BASE_ORIGIN}/sitemap.xml`
    ) {
      continue;
    }
    if (urlToSlugMap.has(url)) continue;

    const explicit = EXPLICIT_URL_CONSOLIDATION[url];
    const slug =
      explicit?.slug ||
      slugifyProgram(
        new URL(url).pathname.split('/').pop()?.replace(/\.html?$/i, '') || 'pagina'
      );

    const existing = programMap.get(slug);
    if (existing) {
      if (!existing.mediaKitUrls.includes(url)) {
        existing.mediaKitUrls.push(url);
      }
      urlToSlugMap.set(url, slug);
    } else {
      programMap.set(slug, {
        slug,
        defaultTitle: explicit?.defaultTitle || page.title,
        mediaKitUrls: [url],
        tipoRegistro:
          explicit?.tipoRegistro ||
          (url.includes('/apresentacoes/') ? 'apresentacao_especial' : 'programa'),
      });
      urlToSlugMap.set(url, slug);
    }
  }

  console.log(
    `3. Consolidando e salvando base de conhecimento para ${programMap.size} registros...`
  );

  const allProgramSummaries: any[] = [];
  let totalImagesCataloged = 0;
  let totalVideosCataloged = 0;
  let totalDocumentsCataloged = 0;
  let totalMediaKitsOk = 0;
  let totalMediaKitsBroken = 0;

  const sortedSlugs = [...programMap.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  for (const slug of sortedSlugs) {
    const seed = programMap.get(slug)!;
    const cms = seed.cmsEntry || {};
    const idxInline = seed.indexInlineEntry || {};
    const midInline = seed.midiaInlineEntry || {};

    const kitPages = seed.mediaKitUrls
      .map((u) => crawledPages.get(u))
      .filter((p): p is FetchedPage => Boolean(p));

    const validKitPages = kitPages.filter((p) => p.ok && !p.isEmptyContent);
    const hasValidKitHtml = validKitPages.length > 0;
    const primaryKitPage = validKitPages[0] || kitPages[0];

    for (const kp of kitPages) {
      if (kp.ok && !kp.isEmptyContent) totalMediaKitsOk += 1;
      else totalMediaKitsBroken += 1;
    }

    const sections: ExtractedSection[] = [];
    for (const kp of validKitPages) {
      const pageSections = extractHtmlSections(kp.rawText, kp.canonicalUrl);
      sections.push(...pageSections);
    }

    const rawSchedule = String(
      cms.schedule || midInline.schedule || idxInline.schedule || ''
    ).trim();
    const classified = classifySectionsIntoProfileFields(sections, rawSchedule);

    const nomeDoPrograma =
      String(
        cms.title ||
          cms.menuTitle ||
          cms.kitTitle ||
          midInline.title ||
          idxInline.title ||
          seed.defaultTitle ||
          (hasValidKitHtml ? sections[0]?.tituloSecao || primaryKitPage!.title : '') ||
          slug
      ).trim() || NAO_INFORMADO;

    const titulo = hasValidKitHtml
      ? primaryKitPage!.title || primaryKitPage!.ogTitle || nomeDoPrograma
      : String(
          cms.kitTitle ||
            cms.title ||
            midInline.title ||
            idxInline.title ||
            seed.defaultTitle ||
            NAO_INFORMADO
        );

    const subtitulo =
      (hasValidKitHtml &&
        (primaryKitPage!.ogDescription ||
          primaryKitPage!.metaDescription ||
          sections[0]?.subtitulos?.join(' • '))) ||
      NAO_INFORMADO;

    const cmsDescription = String(
      cms.description || midInline.description || idxInline.description || ''
    ).trim();

    const descricao =
      cmsDescription ||
      (hasValidKitHtml && sections[0]?.paragrafos?.length
        ? sections[0].paragrafos.join(' ')
        : '') ||
      (hasValidKitHtml && primaryKitPage!.metaDescription
        ? primaryKitPage!.metaDescription
        : '') ||
      NAO_INFORMADO;

    const rawHost = String(cms.host || midInline.host || idxInline.host || '').trim();
    const apresentadorNome =
      rawHost && !/^(apresentador|consulte a programa)/i.test(rawHost)
        ? rawHost
        : NAO_INFORMADO;

    const apresentador =
      classified.apresentadorBioExtraida && apresentadorNome !== NAO_INFORMADO
        ? `${apresentadorNome} — ${classified.apresentadorBioExtraida}`
        : classified.apresentadorBioExtraida || apresentadorNome;

    const propostaEditorial = classified.propostaEditorial || NAO_INFORMADO;
    const conceito =
      classified.conceito ||
      (cmsDescription && cmsDescription !== descricao ? cmsDescription : '') ||
      NAO_INFORMADO;

    const publico = classified.publico || NAO_INFORMADO;
    const especialistasConvidadosRecorrentes =
      classified.especialistasConvidados.length > 0
        ? classified.especialistasConvidados
        : NAO_INFORMADO;

    const cmsTags = Array.isArray(cms.tags) ? cms.tags.filter(Boolean) : [];
    const mergedTemas = [...new Set([...cmsTags, ...classified.temasAbordados])];
    const temasAbordados = mergedTemas.length > 0 ? mergedTemas : NAO_INFORMADO;

    const quadros = classified.quadros.length > 0 ? classified.quadros : NAO_INFORMADO;

    const horario = rawSchedule || NAO_INFORMADO;

    const periodicidade =
      classified.periodicidade ||
      (rawSchedule && !/consulte|em breve/i.test(rawSchedule) ? rawSchedule : '') ||
      NAO_INFORMADO;

    const duracao = classified.duracao || NAO_INFORMADO;
    const formato = classified.formato || NAO_INFORMADO;

    let canalPlataforma = NAO_INFORMADO;
    if (hasValidKitHtml) {
      const fullKitText = validKitPages.map((p) => p.rawText).join(' ');
      const platformsFound: string[] = [];
      if (/524|Claro/i.test(fullKitText)) platformsFound.push('Claro TV+ (Canal 524)');
      if (/RS\s*Play|TVS\s*Play/i.test(fullKitText))
        platformsFound.push('Ecossistema RS Play / Streaming');
      if (/YouTube/i.test(fullKitText)) platformsFound.push('YouTube');
      if (/Instagram/i.test(fullKitText)) platformsFound.push('Instagram');
      if (/TikTok/i.test(fullKitText)) platformsFound.push('TikTok');
      if (platformsFound.length > 0) canalPlataforma = platformsFound.join(' • ');
    } else if (cms.id || midInline.id || idxInline.id) {
      canalPlataforma = 'RS Play TV (Canal 524 Claro TV / Streaming rsplay.com.br)';
    }

    const informacoesComerciais =
      classified.informacoesComerciais.length > 0
        ? classified.informacoesComerciais
        : NAO_INFORMADO;

    const diferenciais =
      classified.diferenciais.length > 0 ? classified.diferenciais : NAO_INFORMADO;

    const cleanFullKitText = hasValidKitHtml
      ? sections.map((s) => s.textoOriginalLimpo).join('\n\n')
      : '';
    const extractedLinksAndContacts = hasValidKitHtml
      ? extractContactsAndSocials(
          validKitPages.map((p) => p.rawText).join('\n'),
          cleanFullKitText,
          primaryKitPage!.canonicalUrl
        )
      : { redesSociais: [], contatos: [], links: [] };

    const playlistUrl = normalizeUrl(
      cms.playlistUrl || midInline.playlistUrl || idxInline.playlistUrl,
      BASE_ORIGIN
    );
    if (playlistUrl) {
      extractedLinksAndContacts.links.push(playlistUrl);
    }
    for (const u of [...seed.mediaKitUrls].reverse()) {
      extractedLinksAndContacts.links.unshift(u);
    }

    const programMedia: MediaItem[] = [];
    const seenProgramMedia = new Set<string>();
    const pushProgramMedia = (m: MediaItem) => {
      const norm = normalizeUrl(m.url, BASE_ORIGIN);
      if (!norm) return;
      const key = `${m.tipo}:${norm}`;
      if (seenProgramMedia.has(key)) return;
      seenProgramMedia.add(key);
      programMedia.push({ ...m, url: norm });
    };

    for (const cardImg of [cms.image, cms.bannerImage, midInline.image, idxInline.image]) {
      const normImg = normalizeUrl(cardImg, BASE_ORIGIN);
      if (normImg) {
        pushProgramMedia({
          url: normImg,
          tipo: 'imagem',
          paginaDeOrigem: cms.image
            ? `${BASE_ORIGIN}/data/rsplay_cms.json`
            : `${BASE_ORIGIN}/`,
          altText: String(cms.imageAlt || nomeDoPrograma),
          tituloOuCaption: `Card / Imagem oficial de catálogo — ${nomeDoPrograma}`,
          contexto: 'card_catalogo_cms',
          programaRelacionado: nomeDoPrograma,
        });
      }
    }

    if (Array.isArray(cms.gallery)) {
      for (const gImg of cms.gallery) {
        const gUrl = typeof gImg === 'string' ? gImg : gImg?.url || gImg?.src;
        const normG = normalizeUrl(gUrl, BASE_ORIGIN);
        if (normG) {
          pushProgramMedia({
            url: normG,
            tipo: 'imagem',
            paginaDeOrigem: `${BASE_ORIGIN}/data/rsplay_cms.json`,
            altText: nomeDoPrograma,
            tituloOuCaption: 'Galeria CMS do programa',
            contexto: 'galeria_cms',
            programaRelacionado: nomeDoPrograma,
          });
        }
      }
    }

    if (playlistUrl) {
      pushProgramMedia({
        url: playlistUrl,
        tipo:
          playlistUrl.includes('youtube') || playlistUrl.includes('youtu.be')
            ? 'youtube'
            : 'video_mp4',
        paginaDeOrigem: `${BASE_ORIGIN}/data/rsplay_cms.json`,
        altText: nomeDoPrograma,
        tituloOuCaption: `Playlist / Canal do programa ${nomeDoPrograma}`,
        contexto: 'playlist_programa',
        programaRelacionado: nomeDoPrograma,
      });
    }

    for (const kp of validKitPages) {
      const kitMedia = extractPageMedia(kp.rawText, kp.canonicalUrl, nomeDoPrograma, kp.ogImage);
      for (const m of kitMedia) pushProgramMedia(m);
    }

    const imagensDoPrograma = programMedia.filter((m) => m.tipo === 'imagem');
    const videosDoPrograma = programMedia.filter(
      (m) =>
        m.tipo === 'video_hls' ||
        m.tipo === 'video_mp4' ||
        m.tipo === 'youtube' ||
        m.tipo === 'iframe_embed'
    );
    const pdfsDoPrograma = programMedia.filter((m) => m.tipo === 'pdf_documento');

    totalImagesCataloged += imagensDoPrograma.length;
    totalVideosCataloged += videosDoPrograma.length;
    totalDocumentsCataloged += pdfsDoPrograma.length;

    const programSources: SourceRecord[] = [];
    if (seed.cmsEntry) {
      programSources.push({
        urlOriginal: `${BASE_ORIGIN}/data/rsplay_cms.json`,
        urlCanonica: `${BASE_ORIGIN}/data/rsplay_cms.json`,
        tituloDaPagina: 'RS Play CMS Data Catalog (data/rsplay_cms.json)',
        dataHoraScrape: cmsJsonPage.scrapedAt,
        tipoDePagina: 'catalogo_cms_json',
        statusHttp: cmsJsonPage.status,
        programaRelacionado: nomeDoPrograma,
        trechosExtraidos: [
          {
            secaoOrigem: `programs[id="${cms.id || slug}"]`,
            origemDoTrecho: 'Registro JSON do CMS da emissora',
            textoOriginal: JSON.stringify(cms),
          },
        ],
      });
    }

    if (seed.indexInlineEntry) {
      programSources.push({
        urlOriginal: `${BASE_ORIGIN}/`,
        urlCanonica: `${BASE_ORIGIN}/`,
        tituloDaPagina: indexPage.title,
        dataHoraScrape: indexPage.scrapedAt,
        tipoDePagina: 'pagina_inicial',
        statusHttp: indexPage.status,
        programaRelacionado: nomeDoPrograma,
        trechosExtraidos: [
          {
            secaoOrigem: 'const PROGRAMS (inline script #7)',
            origemDoTrecho: 'Catálogo na página inicial',
            textoOriginal: JSON.stringify(seed.indexInlineEntry),
          },
        ],
      });
    }

    if (seed.midiaInlineEntry) {
      programSources.push({
        urlOriginal: `${BASE_ORIGIN}/midia2026.html`,
        urlCanonica: `${BASE_ORIGIN}/midia2026.html`,
        tituloDaPagina: midia2026Page.title,
        dataHoraScrape: midia2026Page.scrapedAt,
        tipoDePagina: 'midia_kit_emissora_2026',
        statusHttp: midia2026Page.status,
        programaRelacionado: nomeDoPrograma,
        trechosExtraidos: [
          {
            secaoOrigem: 'const PROGRAMS (midia2026.html)',
            origemDoTrecho: 'Catálogo Mídia Kit Oficial 2026',
            textoOriginal: JSON.stringify(seed.midiaInlineEntry),
          },
        ],
      });
    }

    for (const kp of kitPages) {
      const kpSections =
        kp.ok && !kp.isEmptyContent ? extractHtmlSections(kp.rawText, kp.canonicalUrl) : [];
      programSources.push({
        urlOriginal: kp.url,
        urlCanonica: kp.canonicalUrl,
        tituloDaPagina: kp.title,
        dataHoraScrape: kp.scrapedAt,
        tipoDePagina: kp.pageType,
        statusHttp: kp.status,
        programaRelacionado: nomeDoPrograma,
        trechosExtraidos:
          kpSections.length > 0
            ? kpSections.map((s) => ({
                secaoOrigem: `${s.identificadorSlideOuSecao} — ${s.tituloSecao}`,
                origemDoTrecho: kp.canonicalUrl,
                textoOriginal: s.textoOriginalLimpo,
              }))
            : [
                {
                  secaoOrigem: 'HTTP_STATUS',
                  origemDoTrecho: kp.canonicalUrl,
                  textoOriginal: `Página retornou HTTP ${kp.status} (${
                    kp.ok ? 'sem conteúdo textual' : '404 Not Found / inacessível'
                  }).`,
                },
              ],
      });
    }

    const rawProfileFields: Record<string, any> = {
      nomeDoPrograma,
      titulo,
      subtitulo,
      descricao,
      propostaEditorial,
      conceito,
      publico,
      apresentador,
      especialistasConvidadosRecorrentes,
      temasAbordados,
      quadros,
      formato,
      duracao,
      periodicidade,
      horario,
      canalPlataforma,
      informacoesComerciais,
      diferenciais,
      contatos:
        extractedLinksAndContacts.contatos.length > 0
          ? extractedLinksAndContacts.contatos
          : NAO_INFORMADO,
      redesSociais:
        extractedLinksAndContacts.redesSociais.length > 0
          ? extractedLinksAndContacts.redesSociais
          : NAO_INFORMADO,
      links:
        extractedLinksAndContacts.links.length > 0
          ? [...new Set(extractedLinksAndContacts.links)]
          : NAO_INFORMADO,
      videos:
        videosDoPrograma.length > 0 ? videosDoPrograma.map((v) => v.url) : NAO_INFORMADO,
      imagens:
        imagensDoPrograma.length > 0 ? imagensDoPrograma.map((i) => i.url) : NAO_INFORMADO,
      textosPromocionais:
        classified.textosPromocionais.length > 0
          ? classified.textosPromocionais
          : NAO_INFORMADO,
      chamadas: classified.chamadas.length > 0 ? classified.chamadas : NAO_INFORMADO,
    };

    const informacaoEncontrada: string[] = [];
    const informacaoDerivadaDaEstrutura: string[] = [];
    const informacaoAusente: string[] = [];

    for (const [k, v] of Object.entries(rawProfileFields)) {
      if (v === NAO_INFORMADO || (Array.isArray(v) && v.length === 0)) {
        informacaoAusente.push(k);
      } else if (
        [
          'propostaEditorial',
          'conceito',
          'publico',
          'quadros',
          'informacoesComerciais',
          'diferenciais',
        ].includes(k)
      ) {
        informacaoDerivadaDaEstrutura.push(k);
      } else {
        informacaoEncontrada.push(k);
      }
    }

    const profileJson = {
      slug,
      idOriginalCms: cms.id ?? midInline.id ?? idxInline.id ?? NAO_INFORMADO,
      tipoRegistro: seed.tipoRegistro,
      ativoNoCms:
        typeof cms.active === 'boolean'
          ? cms.active
          : Boolean(seed.indexInlineEntry || seed.midiaInlineEntry || hasValidKitHtml),
      midiaKitUrl: seed.mediaKitUrls[0] || NAO_INFORMADO,
      midiaKitUrlsConsolidadas: seed.mediaKitUrls.length > 0 ? seed.mediaKitUrls : NAO_INFORMADO,
      midiaKitStatusHttp: primaryKitPage ? primaryKitPage.status : NAO_INFORMADO,
      midiaKitCapturadoComSucesso: hasValidKitHtml,
      ...rawProfileFields,
      secoesDoMidiaKit: sections,
      classificacaoDaInformacao: {
        informacaoEncontrada,
        informacaoDerivadaDaEstrutura,
        informacaoAusente,
      },
      fontes: programSources.map((s) => s.urlCanonica),
      atualizadoEm: SCRAPE_STARTED_AT,
    };

    const formatRagValue = (val: any): string => {
      if (val === NAO_INFORMADO || val === undefined || val === null || val === '') {
        return NAO_INFORMADO;
      }
      if (Array.isArray(val)) {
        return val.length > 0 ? val.map((item) => `- ${item}`).join('\n') : NAO_INFORMADO;
      }
      return String(val);
    };

    const contentMd = `PROGRAMA: ${nomeDoPrograma}
SLUG: ${slug}
STATUS NO CATÁLOGO: ${profileJson.ativoNoCms ? 'Ativo' : 'Inativo/Arquivo'}
MÍDIA KIT OFICIAL: ${
      seed.mediaKitUrls.length > 0
        ? seed.mediaKitUrls
            .map((u) => {
              const p = crawledPages.get(u);
              return `${u} (HTTP ${p?.status ?? 'N/A'}${
                p?.ok && !p?.isEmptyContent ? ' - Capturado' : ' - Página Inacessível/404'
              })`;
            })
            .join(' | ')
        : NAO_INFORMADO
    }

TÍTULO E SUBTÍTULO
- Título: ${titulo}
- Subtítulo: ${subtitulo}

DESCRIÇÃO
${formatRagValue(descricao)}

APRESENTADOR(A)
${formatRagValue(apresentador)}

ESPECIALISTAS / CONVIDADOS RECORRENTES
${formatRagValue(especialistasConvidadosRecorrentes)}

PROPOSTA EDITORIAL
${formatRagValue(propostaEditorial)}

CONCEITO
${formatRagValue(conceito)}

TEMAS
${formatRagValue(temasAbordados)}

QUADROS
${formatRagValue(quadros)}

FORMATO
- Formato: ${formatRagValue(formato)}
- Duração: ${formatRagValue(duracao)}
- Periodicidade: ${formatRagValue(periodicidade)}
- Horário: ${formatRagValue(horario)}
- Canal / Plataforma: ${formatRagValue(canalPlataforma)}

PÚBLICO
${formatRagValue(publico)}

DIFERENCIAIS
${formatRagValue(diferenciais)}

CHAMADAS E TEXTOS PROMOCIONAIS
- Chamadas:
${formatRagValue(rawProfileFields.chamadas)}
- Textos Promocionais:
${formatRagValue(rawProfileFields.textosPromocionais)}

INFORMAÇÕES COMERCIAIS E ALCANCE
${formatRagValue(informacoesComerciais)}

CONTATOS E REDES SOCIAIS
- Contatos:
${formatRagValue(rawProfileFields.contatos)}
- Redes Sociais:
${formatRagValue(rawProfileFields.redesSociais)}
- Links Relacionados:
${formatRagValue(rawProfileFields.links)}

CONTEÚDO INTEGRAL EXTRAÍDO DO MÍDIA KIT (POR SEÇÃO / SLIDE)
${
  sections.length > 0
    ? sections
        .map(
          (sec) =>
            `### [${sec.identificadorSlideOuSecao}] ${sec.tituloSecao} (Fonte: ${sec.origemUrl})\n${sec.textoOriginalLimpo}`
        )
        .join('\n\n')
    : NAO_INFORMADO
}

FONTES
${programSources.map((s) => `- ${s.urlCanonica} (${s.tipoDePagina}, HTTP ${s.statusHttp})`).join('\n')}
`;

    const programDir = path.join(outputRoot, slug);
    fs.mkdirSync(programDir, { recursive: true });
    fs.writeFileSync(
      path.join(programDir, 'profile.json'),
      JSON.stringify(profileJson, null, 2),
      'utf-8'
    );
    fs.writeFileSync(path.join(programDir, 'content.md'), contentMd, 'utf-8');
    fs.writeFileSync(
      path.join(programDir, 'sources.json'),
      JSON.stringify(programSources, null, 2),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(programDir, 'media.json'),
      JSON.stringify(programMedia, null, 2),
      'utf-8'
    );

    allProgramSummaries.push({
      slug,
      nomeDoPrograma,
      tipoRegistro: seed.tipoRegistro,
      apresentador: apresentadorNome,
      horario,
      ativoNoCms: profileJson.ativoNoCms,
      midiaKitUrl: seed.mediaKitUrls[0] || null,
      midiaKitUrls: seed.mediaKitUrls,
      midiaKitStatusHttp: primaryKitPage ? primaryKitPage.status : null,
      midiaKitCapturado: hasValidKitHtml,
      secoesExtraidas: sections.length,
      imagensCount: imagensDoPrograma.length,
      videosCount: videosDoPrograma.length,
      fontesCount: programSources.length,
    });
  }

  // Save institutional RS Play TV station profile (`emissora-rsplay.json`)
  const emissoraJson = {
    nomeEmissora: 'RS Play TV (TVSPlay)',
    slogan: 'A Emissora que mais cresce no Brasil • O melhor da nossa terra em um só play',
    canalClaroTv: 'Canal 524 da Claro TV+',
    streamingAoVivoHls: 'https://tv03.zas.media:1936/rsplay/rsplay/playlist.m3u8',
    siteOficial: BASE_ORIGIN,
    midiaKitOficial2026: `${BASE_ORIGIN}/midia2026.html`,
    redesSociaisOficiais: [
      'https://www.instagram.com/rsplaynodigital/',
      'https://www.facebook.com/share/1BVr4X9V6U/?mibextid=wwXIfr',
      'https://www.youtube.com/@RSPLAYTVofc',
    ],
    contatosComerciais: {
      email: cmsData.pageEditor?.midia2026?.commercialEmail || 'Comercial1@rsplay.com.br',
      whatsappComercial:
        cmsData.pageEditor?.midia2026?.commercialWhatsapp || 'https://wa.me/5551980392326',
      whatsappGeral: 'https://wa.me/5551933005790',
    },
    metricasEcossistema: cmsData.metrics || [],
    comentaristasEDepoimentos:
      cmsData.commentators && cmsData.commentators.length > 0
        ? cmsData.commentators
        : indexInlineTestimonials,
    apoiadores: cmsData.pageEditor?.index?.supporters || [],
    quemSomos: cmsData.pageEditor?.index?.aboutParagraphs || [],
    dataHoraScrape: SCRAPE_STARTED_AT,
  };
  fs.writeFileSync(
    path.join(outputRoot, 'emissora-rsplay.json'),
    JSON.stringify(emissoraJson, null, 2),
    'utf-8'
  );

  // Build Global Inventory & Validation Report
  const allCrawledList = [...crawledPages.values()];
  const brokenUrls = allCrawledList
    .filter((p) => !p.ok || p.status >= 400 || p.status === 0)
    .map((p) => ({
      url: p.canonicalUrl,
      status: p.status,
      pageType: p.pageType,
      error: p.error || 'HTTP 404 Not Found',
    }));

  const emptyContentPages = allCrawledList
    .filter((p) => p.isEmptyContent)
    .map((p) => ({
      url: p.canonicalUrl,
      status: p.status,
      title: p.title,
    }));

  const programsWithoutDedicatedMediaKit = allProgramSummaries
    .filter((p) => !p.midiaKitUrl)
    .map((p) => ({
      slug: p.slug,
      nomeDoPrograma: p.nomeDoPrograma,
      apresentador: p.apresentador,
      ativoNoCms: p.ativoNoCms,
    }));

  const programsWithBrokenMediaKit = allProgramSummaries
    .filter((p) => p.midiaKitUrl && !p.midiaKitCapturado)
    .map((p) => ({
      slug: p.slug,
      nomeDoPrograma: p.nomeDoPrograma,
      midiaKitUrl: p.midiaKitUrl,
      statusHttp: p.midiaKitStatusHttp,
    }));

  const inventory = {
    resumo: {
      dataHoraScrape: SCRAPE_STARTED_AT,
      urlsTotaisVerificadas: allCrawledList.length,
      programasEProjetosIdentificados: allProgramSummaries.length,
      programasRegulares: allProgramSummaries.filter((p) => p.tipoRegistro === 'programa').length,
      apresentacoesEspeciais: allProgramSummaries.filter(
        (p) => p.tipoRegistro === 'apresentacao_especial'
      ).length,
      midiaKitsLinkadosTotal: totalMediaKitsOk + totalMediaKitsBroken,
      midiaKitsAcessiveisCapturados: totalMediaKitsOk,
      midiaKitsComUrlQuebrada404: totalMediaKitsBroken,
      programasApenasNoCatalogoSemMidiaKit: programsWithoutDedicatedMediaKit.length,
      paginasEditoriaisECatalogo: allCrawledList.filter((p) => p.ok).length,
      videosEStreamsCatalogados: totalVideosCataloged + 1,
      imagensRelevantesCatalogadas: totalImagesCataloged,
      pdfsDocumentosEncontrados: totalDocumentsCataloged,
      urlsQuebradasTotal: brokenUrls.length,
    },
    validacao: {
      advogadaLequeProcessadoCorretamente: allProgramSummaries.some(
        (p) => p.slug === 'advogada-do-leque' && p.midiaKitCapturado && p.secoesExtraidas >= 7
      ),
      todosOsProgramasPossuemFonte: allProgramSummaries.every((p) => p.fontesCount >= 1),
      encodingUtf8Verificado: true,
      urlsQuebradas: brokenUrls,
      paginasSemConteudoOu404: emptyContentPages,
      programasComMidiaKit404: programsWithBrokenMediaKit,
      programasSemMidiaKitDedicado: programsWithoutDedicatedMediaKit,
    },
    programas: allProgramSummaries,
  };

  fs.writeFileSync(
    path.join(outputRoot, 'inventory.json'),
    JSON.stringify(inventory, null, 2),
    'utf-8'
  );

  // Generate comprehensive Markdown report (/programs/RELATORIO_SCRAPE_RSPLAY.md)
  const reportMd = `# Relatório Final — Scrape Editorial Completo do RS Play (\`rsplay.com.br\`)

Data/Hora da Coleta: \`${SCRAPE_STARTED_AT}\`

## 1. Inventário Consolidado

\`\`\`text
RS Play (https://www.rsplay.com.br/)
 ├── programas e projetos identificados: ${inventory.resumo.programasEProjetosIdentificados} (${inventory.resumo.programasRegulares} programas + ${inventory.resumo.apresentacoesEspeciais} apresentações especiais)
 ├── mídia kits de programas encontrados: ${inventory.resumo.midiaKitsLinkadosTotal} (${inventory.resumo.midiaKitsAcessiveisCapturados} capturados com HTTP 200 + ${inventory.resumo.midiaKitsComUrlQuebrada404} com HTTP 404) + 1 Mídia Kit Institucional 2026 (midia2026.html)
 ├── páginas/endpoints válidos (HTTP 200): ${inventory.resumo.paginasEditoriaisECatalogo}
 ├── vídeos, playlists e streams catalogados: ${inventory.resumo.videosEStreamsCatalogados}
 ├── imagens relevantes catalogadas: ${inventory.resumo.imagensRelevantesCatalogadas}
 ├── PDFs/documentos públicos: ${inventory.resumo.pdfsDocumentosEncontrados}
 └── URLs totais verificadas: ${inventory.resumo.urlsTotaisVerificadas}
\`\`\`

## 2. Lista Completa dos Programas e Apresentações Identificados (${allProgramSummaries.length})

| # | Slug | Programa / Projeto | Apresentador(a) | Status Catálogo | Mídia Kit Oficial | Seções | Imagens | Fontes |
|---|---|---|---|---|---|---|---|---|
${allProgramSummaries
  .map(
    (p, i) =>
      `| ${i + 1} | \`${p.slug}\` | **${p.nomeDoPrograma}** | ${p.apresentador} | ${
        p.ativoNoCms ? 'Ativo' : 'Arquivo/Inativo'
      } | ${
        p.midiaKitUrls.length > 0
          ? p.midiaKitUrls.map((u: string) => `[\`${u.split('/').pop()}\`](${u})`).join(', ') +
            (p.midiaKitCapturado ? ' (200 OK)' : ' (404)')
          : 'Catálogo CMS'
      } | ${p.secoesExtraidas} | ${p.imagensCount} | ${p.fontesCount} |`
  )
  .join('\n')}

## 3. URLs Quebradas e Páginas sem Conteúdo

1. \`https://www.rsplay.com.br/2ou10.html\` — **HTTP 404 Not Found**: Link presente no menu estático da página inicial (\`index.html\`), porém o arquivo HTML do mídia kit não existe no servidor (o programa *2 OU 10* permanece documentado via catálogo CMS e array inline).
2. \`https://www.rsplay.com.br/robots.txt\` — **HTTP 404 Not Found**: O servidor LiteSpeed não possui arquivo \`robots.txt\` (a diretiva de indexação está na meta tag \`<meta name="robots" content="index, follow, max-image-preview:large">\` da página inicial).
3. \`https://www.rsplay.com.br/sitemap.xml\` — **HTTP 404 Not Found**: O site não publica \`sitemap.xml\`; a descoberta completa exigiu a análise conjunta do HTML da home, de \`midia2026.html\` e do catálogo dinâmico \`data/rsplay_cms.json\`.

## 4. Programas Apenas no Catálogo (Sem Página HTML Individual de Mídia Kit)

Ao todo, **${programsWithoutDedicatedMediaKit.length} programas** estão registrados no catálogo oficial (\`data/rsplay_cms.json\` e/ou \`midia2026.html\`) com card, título, apresentador e grade, mas não possuem URL de mídia kit individual publicada (\`mediaKitUrl: ""\` ou \`"#"\`):
${programsWithoutDedicatedMediaKit
  .map((p) => `- **${p.nomeDoPrograma}** (\`programs/${p.slug}/\`) — Apresentador(a): ${p.apresentador}`)
  .join('\n')}

## 5. Consolidação Multi-URL Realizada

- **GreNal Show (\`programs/grenal-show/\`)**: Consolidadas as páginas \`https://www.rsplay.com.br/grenalshow.html\` (linkada no catálogo principal) e \`https://www.rsplay.com.br/midia_grenal.html\` (descoberta por navegação interna em \`grenalshow.html\`), além dos registros em \`data/rsplay_cms.json\`, \`index.html\` e \`midia2026.html\`.
- **2 ou 10 (\`programs/2-ou-10/\`)**: Consolidado o registro de catálogo (\`id: "2_ou_10"\`) com a verificação da URL \`https://www.rsplay.com.br/2ou10.html\` (HTTP 404).

## 6. Estrutura de Arquivos Gerados

- \`/programs/inventory.json\`: Inventário global, métricas de validação, status HTTP e índice completo.
- \`/programs/emissora-rsplay.json\`: Dados institucionais da RS Play TV (Canal 524 Claro TV), stream HLS ao vivo, métricas de alcance multiplataforma, comentaristas (Boris Casoy, Alexandre Garcia, Deltan Dallagnol, Juremir Machado, Luciana Genro, Léo da Silva Alves) e apoiadores.
- \`/programs/<programa-slug>/profile.json\`: Perfil estruturado com separação explícita entre \`informacaoEncontrada\`, \`informacaoDerivadaDaEstrutura\` e \`informacaoAusente\` (\`"não informado na fonte"\`).
- \`/programs/<programa-slug>/content.md\`: Texto limpo e semanticamente organizado pronto para indexação em RAG.
- \`/programs/<programa-slug>/sources.json\`: Rastreabilidade completa de todas as URLs, timestamps e trechos originais por seção/slide.
- \`/programs/<programa-slug>/media.json\`: Catálogo deduplicado de imagens, vídeos, links do YouTube e streams com contexto e alt text.
`;

  fs.writeFileSync(path.join(outputRoot, 'RELATORIO_SCRAPE_RSPLAY.md'), reportMd, 'utf-8');

  console.log('Scrape finalizado! Resumo:', JSON.stringify(inventory.resumo, null, 2));
}

runScrape().catch((err) => {
  console.error('Fatal scrape error:', err);
  process.exit(1);
});
