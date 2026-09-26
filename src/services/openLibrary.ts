import { OpenLibraryDoc, DarkBook, PipelineStageInfo, OpenLibraryWorkDetails, CacheStats } from '../types';

export const DARK_PSYCHOLOGY_PRESETS = [
  { label: 'Dark Psychology', query: 'dark psychology manipulation' },
  { label: 'Shadow Self', query: 'Carl Jung shadow archetype psychology' },
  { label: 'Power & Influence', query: 'Robert Greene power strategy' },
  { label: 'Cognitive Bias & Persuasion', query: 'persuasion cognitive bias heuristics' },
  { label: 'Machiavellian Statecraft', query: 'Niccolo Machiavelli power statecraft' },
  { label: 'Game Theory & Strategy', query: 'game theory strategic decision making' },
  { label: 'Stoic Fortitude', query: 'Marcus Aurelius Seneca Epictetus stoicism' },
];

// Local Caching Storage Keys
const SEARCH_CACHE_PREFIX = 'ol_cache_search_';
const WORK_CACHE_PREFIX = 'ol_cache_work_';
const CACHE_STATS_KEY = 'ol_cache_stats';

// In-memory runtime fast cache for instant UI response
const memorySearchCache = new Map<string, { docs: OpenLibraryDoc[]; timestamp: number }>();
const memoryWorkCache = new Map<string, { details: OpenLibraryWorkDetails; timestamp: number }>();

// Cache TTL (7 days in milliseconds)
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SearchPipelineResult {
  docs: OpenLibraryDoc[];
  pipeline: PipelineStageInfo;
  isFromCache: boolean;
}

export interface WorkDetailsPipelineResult {
  details: OpenLibraryWorkDetails | null;
  pipeline: PipelineStageInfo;
  isFromCache: boolean;
}

// -------------------------------------------------------------
// Local Database Caching Utilities
// -------------------------------------------------------------

export function getLocalCacheStats(): CacheStats {
  try {
    const raw = localStorage.getItem(CACHE_STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : { hits: 0, misses: 0, lastAccessed: null };

    // Count stored entries and estimate byte size
    let searchCount = 0;
    let workCount = 0;
    let totalChars = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SEARCH_CACHE_PREFIX)) {
        searchCount++;
        totalChars += (localStorage.getItem(key) || '').length;
      } else if (key?.startsWith(WORK_CACHE_PREFIX)) {
        workCount++;
        totalChars += (localStorage.getItem(key) || '').length;
      }
    }

    return {
      hits: parsed.hits || 0,
      misses: parsed.misses || 0,
      searchEntries: searchCount,
      workEntries: workCount,
      totalCached: searchCount + workCount,
      estimatedSizeKb: Math.round(totalChars / 1024),
      lastAccessed: parsed.lastAccessed || null,
    };
  } catch {
    return {
      hits: 0,
      misses: 0,
      searchEntries: 0,
      workEntries: 0,
      totalCached: 0,
      estimatedSizeKb: 0,
      lastAccessed: null,
    };
  }
}

function recordCacheEvent(type: 'hit' | 'miss') {
  try {
    const stats = getLocalCacheStats();
    if (type === 'hit') stats.hits += 1;
    else stats.misses += 1;
    stats.lastAccessed = new Date().toISOString();
    localStorage.setItem(CACHE_STATS_KEY, JSON.stringify(stats));
  } catch (err) {
    // Ignore storage quota warnings gracefully
  }
}

export function clearOpenLibraryLocalCache() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(SEARCH_CACHE_PREFIX) || key?.startsWith(WORK_CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  memorySearchCache.clear();
  memoryWorkCache.clear();
  localStorage.setItem(CACHE_STATS_KEY, JSON.stringify({ hits: 0, misses: 0, lastAccessed: new Date().toISOString() }));
}

function getStoredSearch(query: string): OpenLibraryDoc[] | null {
  const normKey = query.trim().toLowerCase();

  // Check fast in-memory cache first
  const mem = memorySearchCache.get(normKey);
  if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
    recordCacheEvent('hit');
    return mem.docs;
  }

  // Check persistent localStorage
  try {
    const raw = localStorage.getItem(`${SEARCH_CACHE_PREFIX}${normKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        memorySearchCache.set(normKey, parsed);
        recordCacheEvent('hit');
        return parsed.docs;
      }
    }
  } catch {
    // Fallthrough to network
  }

  recordCacheEvent('miss');
  return null;
}

function saveStoredSearch(query: string, docs: OpenLibraryDoc[]) {
  const normKey = query.trim().toLowerCase();
  const entry = { docs, timestamp: Date.now() };
  memorySearchCache.set(normKey, entry);
  try {
    localStorage.setItem(`${SEARCH_CACHE_PREFIX}${normKey}`, JSON.stringify(entry));
  } catch {
    // Quota reached; clean oldest if necessary
  }
}

function getStoredWorkDetails(key: string): OpenLibraryWorkDetails | null {
  const normKey = key.replace(/^\/+/, '').trim();

  // In-memory cache
  const mem = memoryWorkCache.get(normKey);
  if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
    recordCacheEvent('hit');
    return mem.details;
  }

  try {
    const raw = localStorage.getItem(`${WORK_CACHE_PREFIX}${normKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        memoryWorkCache.set(normKey, parsed);
        recordCacheEvent('hit');
        return parsed.details;
      }
    }
  } catch {
    // Fallthrough
  }

  recordCacheEvent('miss');
  return null;
}

function saveStoredWorkDetails(key: string, details: OpenLibraryWorkDetails) {
  const normKey = key.replace(/^\/+/, '').trim();
  const entry = { details, timestamp: Date.now() };
  memoryWorkCache.set(normKey, entry);
  try {
    localStorage.setItem(`${WORK_CACHE_PREFIX}${normKey}`, JSON.stringify(entry));
  } catch {
    // Ignore
  }
}

// -------------------------------------------------------------
// Cover Image Helpers (Covers API for ISBN, Works, and Cover ID)
// -------------------------------------------------------------

export function getCoverUrl(coverId?: number, size: 'S' | 'M' | 'L' = 'M'): string {
  if (!coverId) return '';
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

export function getCoverUrlByIsbn(isbn?: string, size: 'S' | 'M' | 'L' = 'L'): string {
  if (!isbn) return '';
  const cleanIsbn = isbn.replace(/[-\s]/g, '');
  return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-${size}.jpg`;
}

// -------------------------------------------------------------
// Dark Archetype Deduction Engine
// -------------------------------------------------------------

export function deduceDarkArchetype(title: string, subjects: string[] = []): DarkBook['darkArchetype'] {
  const text = `${title} ${subjects.join(' ')}`.toLowerCase();

  if (text.includes('shadow') || text.includes('jung') || text.includes('unconscious') || text.includes('night') || text.includes('abyss')) {
    return 'The Shadow';
  }
  if (text.includes('strategy') || text.includes('power') || text.includes('greene') || text.includes('tactics') || text.includes('art of war')) {
    return 'The Strategist';
  }
  if (text.includes('manipulat') || text.includes('persuas') || text.includes('influence') || text.includes('coercion') || text.includes('compliance')) {
    return 'The Manipulator';
  }
  if (text.includes('sovereign') || text.includes('prince') || text.includes('machiavelli') || text.includes('ruler') || text.includes('king')) {
    return 'The Sovereign';
  }
  if (text.includes('stoic') || text.includes('aurelius') || text.includes('seneca') || text.includes('meditation') || text.includes('epictetus')) {
    return 'The Stoic';
  }
  return 'The Alchemist';
}

// -------------------------------------------------------------
// 1. Search & Autocomplete API: On-Demand Fetching Workflow
// Strict Rule: Input -> Network -> Process -> Output
// -------------------------------------------------------------

export async function executeOpenLibrarySearch(
  query: string,
  onProgress?: (stage: PipelineStageInfo) => void
): Promise<SearchPipelineResult> {
  const cleanQuery = query.trim();
  const startTime = performance.now();
  const endpoint = `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanQuery)}&limit=24&fields=key,title,author_name,first_publish_year,cover_i,subject,edition_count,ratings_average,isbn`;

  // Stage 1: Input Validation
  let currentStage: PipelineStageInfo = {
    stage: 'input',
    query: cleanQuery,
    endpoint,
    statusText: 'Stage 1 [Input]: Sanitizing query parameters & validating local database cache...',
    durationMs: 0,
    resultCount: 0,
    isCached: false,
  };
  onProgress?.({ ...currentStage });

  // Check local database cache first
  const cachedDocs = getStoredSearch(cleanQuery);
  if (cachedDocs && cachedDocs.length > 0) {
    const cacheDuration = Math.round(performance.now() - startTime);

    // Skip Network Stage (Cache Hit) & Proceed straight to Process / Output
    currentStage = {
      stage: 'process',
      query: cleanQuery,
      endpoint: `${endpoint} [LOCAL DB CACHE HIT]`,
      statusText: 'Stage 3 [Process]: Ingesting sanitized records directly from persistent browser cache...',
      durationMs: cacheDuration,
      resultCount: cachedDocs.length,
      isCached: true,
    };
    onProgress?.({ ...currentStage });

    await new Promise((r) => setTimeout(r, 40));

    const finalDuration = Math.round(performance.now() - startTime);
    currentStage = {
      stage: 'output',
      query: cleanQuery,
      endpoint,
      statusText: `Stage 4 [Output]: Returned ${cachedDocs.length} records instantly from local cache in ${finalDuration}ms.`,
      durationMs: finalDuration,
      resultCount: cachedDocs.length,
      isCached: true,
    };
    onProgress?.({ ...currentStage });

    return {
      docs: cachedDocs.map((d) => ({ ...d, fromCache: true })),
      pipeline: currentStage,
      isFromCache: true,
    };
  }

  await new Promise((r) => setTimeout(r, 50)); // Visual pipeline tick

  // Stage 2: Network Request
  currentStage = {
    ...currentStage,
    stage: 'network',
    statusText: `Stage 2 [Network]: Dispatching HTTPS request to openlibrary.org REST cluster...`,
    durationMs: Math.round(performance.now() - startTime),
  };
  onProgress?.({ ...currentStage });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open Library API returned HTTP ${response.status}: ${response.statusText}`);
    }

    // Stage 3: Process & Normalization
    currentStage = {
      ...currentStage,
      stage: 'process',
      statusText: 'Stage 3 [Process]: Deserializing JSON payload, mapping cover IDs, deducing dark archetypes, committing to local cache...',
      durationMs: Math.round(performance.now() - startTime),
    };
    onProgress?.({ ...currentStage });

    const rawData = await response.json();
    const rawDocs: any[] = rawData.docs || [];

    // Transform and sanitize
    const sanitizedDocs: OpenLibraryDoc[] = rawDocs
      .filter((doc) => doc.title && (doc.author_name || doc.cover_i || doc.isbn))
      .map((doc) => ({
        key: doc.key || `custom_${Math.random()}`,
        title: doc.title,
        author_name: Array.isArray(doc.author_name)
          ? doc.author_name
          : doc.author_name
          ? [doc.author_name]
          : ['Unknown Author'],
        first_publish_year: doc.first_publish_year,
        cover_i: doc.cover_i,
        subject: Array.isArray(doc.subject) ? doc.subject.slice(0, 8) : [],
        edition_count: doc.edition_count || 1,
        ratings_average: doc.ratings_average ? Number(doc.ratings_average.toFixed(2)) : undefined,
        isbn: Array.isArray(doc.isbn) ? doc.isbn.slice(0, 4) : [],
        fromCache: false,
      }));

    // Commit to local cache store
    saveStoredSearch(cleanQuery, sanitizedDocs);

    // Stage 4: Output Ready
    const finalDuration = Math.round(performance.now() - startTime);
    currentStage = {
      ...currentStage,
      stage: 'output',
      statusText: `Stage 4 [Output]: Normalized & cached ${sanitizedDocs.length} book records successfully in ${finalDuration}ms.`,
      durationMs: finalDuration,
      resultCount: sanitizedDocs.length,
      isCached: false,
    };
    onProgress?.({ ...currentStage });

    return {
      docs: sanitizedDocs,
      pipeline: currentStage,
      isFromCache: false,
    };
  } catch (error: any) {
    const errorDuration = Math.round(performance.now() - startTime);
    const errorStage: PipelineStageInfo = {
      stage: 'error',
      query: cleanQuery,
      endpoint,
      statusText: `Pipeline interrupted: ${error.name === 'AbortError' ? 'Network timeout' : error.message}`,
      durationMs: errorDuration,
      resultCount: 0,
      error: error.message || 'Failed to fetch books from Open Library',
    };
    onProgress?.(errorStage);

    return {
      docs: [],
      pipeline: errorStage,
      isFromCache: false,
    };
  }
}

// -------------------------------------------------------------
// Real-time Fast Autocomplete API
// -------------------------------------------------------------

export async function fetchOpenLibraryAutocomplete(query: string, limit = 6): Promise<OpenLibraryDoc[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  // Check cache first
  const cached = getStoredSearch(`autocomplete_${cleanQuery}`);
  if (cached) return cached.slice(0, limit);

  try {
    const endpoint = `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanQuery)}&limit=${limit}&fields=key,title,author_name,first_publish_year,cover_i,subject,isbn`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const data = await res.json();
    const docs: OpenLibraryDoc[] = (data.docs || []).map((doc: any) => ({
      key: doc.key,
      title: doc.title,
      author_name: Array.isArray(doc.author_name) ? doc.author_name : [doc.author_name || 'Unknown'],
      first_publish_year: doc.first_publish_year,
      cover_i: doc.cover_i,
      subject: Array.isArray(doc.subject) ? doc.subject.slice(0, 4) : [],
      isbn: Array.isArray(doc.isbn) ? doc.isbn.slice(0, 2) : [],
    }));

    saveStoredSearch(`autocomplete_${cleanQuery}`, docs);
    return docs;
  } catch {
    return [];
  }
}

// -------------------------------------------------------------
// 2. Book Details Works / ISBN API On-Demand Workflow
// Strict Rule: Input -> Network -> Process -> Output
// -------------------------------------------------------------

export async function fetchBookDetailsOnDemand(
  workKeyOrIsbn: string,
  onProgress?: (stage: PipelineStageInfo) => void
): Promise<WorkDetailsPipelineResult> {
  const cleanKey = workKeyOrIsbn.replace(/^\/+/, '').trim();
  const isIsbn = /^[0-9X-]{10,17}$/i.test(cleanKey.replace(/[-\s]/g, ''));
  const isWorks = cleanKey.includes('OL') && (cleanKey.includes('W') || cleanKey.includes('works'));

  let endpoint = '';
  if (isIsbn) {
    endpoint = `https://openlibrary.org/isbn/${cleanKey.replace(/[-\s]/g, '')}.json`;
  } else {
    const workIdentifier = cleanKey.startsWith('works/') ? cleanKey : `works/${cleanKey}`;
    endpoint = `https://openlibrary.org/${workIdentifier}.json`;
  }

  const startTime = performance.now();

  // Stage 1: Input Validation
  let currentStage: PipelineStageInfo = {
    stage: 'input',
    query: cleanKey,
    endpoint,
    statusText: `Stage 1 [Input]: Resolving identifier (${isIsbn ? 'ISBN' : 'Work Key'}) & checking local cache...`,
    durationMs: 0,
    resultCount: 0,
    isCached: false,
  };
  onProgress?.({ ...currentStage });

  // Check Local Database Cache First
  const cachedDetails = getStoredWorkDetails(cleanKey);
  if (cachedDetails) {
    const elapsed = Math.round(performance.now() - startTime);

    currentStage = {
      stage: 'process',
      query: cleanKey,
      endpoint: `${endpoint} [LOCAL DB CACHE HIT]`,
      statusText: `Stage 3 [Process]: Rehydrating work synopsis & metadata from persistent cache...`,
      durationMs: elapsed,
      resultCount: 1,
      isCached: true,
    };
    onProgress?.({ ...currentStage });

    await new Promise((r) => setTimeout(r, 40));

    const finalDuration = Math.round(performance.now() - startTime);
    currentStage = {
      stage: 'output',
      query: cleanKey,
      endpoint,
      statusText: `Stage 4 [Output]: Loaded full work details from local cache in ${finalDuration}ms.`,
      durationMs: finalDuration,
      resultCount: 1,
      isCached: true,
    };
    onProgress?.({ ...currentStage });

    return {
      details: cachedDetails,
      pipeline: currentStage,
      isFromCache: true,
    };
  }

  await new Promise((r) => setTimeout(r, 50));

  // Stage 2: Network Request
  currentStage = {
    ...currentStage,
    stage: 'network',
    statusText: `Stage 2 [Network]: Fetching raw payload from ${endpoint}...`,
    durationMs: Math.round(performance.now() - startTime),
  };
  onProgress?.({ ...currentStage });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open Library Work API responded with HTTP ${response.status}: ${response.statusText}`);
    }

    // Stage 3: Process & Normalization
    currentStage = {
      ...currentStage,
      stage: 'process',
      statusText: 'Stage 3 [Process]: Parsing Work description AST, resolving covers, extracting excerpts & subjects...',
      durationMs: Math.round(performance.now() - startTime),
    };
    onProgress?.({ ...currentStage });

    const rawData = await response.json();

    // Handle Open Library polymorphic description format (string vs { type: string, value: string })
    let descriptionText = '';
    if (typeof rawData.description === 'string') {
      descriptionText = rawData.description;
    } else if (rawData.description && typeof rawData.description.value === 'string') {
      descriptionText = rawData.description.value;
    } else if (rawData.first_sentence) {
      descriptionText = typeof rawData.first_sentence === 'string' ? rawData.first_sentence : rawData.first_sentence.value || '';
    }

    // Extract subjects
    const subjects: string[] = Array.isArray(rawData.subjects)
      ? rawData.subjects.slice(0, 12)
      : Array.isArray(rawData.subject)
      ? rawData.subject.slice(0, 12)
      : [];

    // Extract covers
    const covers: number[] = Array.isArray(rawData.covers) ? rawData.covers.filter((c: any) => typeof c === 'number') : [];

    const coversUrl = covers.length > 0 ? getCoverUrl(covers[0], 'L') : '';

    const sanitizedDetails: OpenLibraryWorkDetails = {
      key: rawData.key || cleanKey,
      title: rawData.title || 'Untitled Work',
      description: descriptionText || 'No extended historical synopsis available in the Open Library registry.',
      covers,
      coversUrl,
      subjects,
      first_publish_date: rawData.first_publish_date || rawData.publish_date || undefined,
      latest_revision: rawData.revision || 1,
      authors: rawData.authors || [],
      isbn_10: rawData.isbn_10 || [],
      isbn_13: rawData.isbn_13 || [],
      excerpts: Array.isArray(rawData.excerpts) ? rawData.excerpts : [],
      rawJson: rawData,
    };

    // Save to local cache
    saveStoredWorkDetails(cleanKey, sanitizedDetails);

    // Stage 4: Output
    const finalDuration = Math.round(performance.now() - startTime);
    currentStage = {
      ...currentStage,
      stage: 'output',
      statusText: `Stage 4 [Output]: Normalized work details and committed to local database in ${finalDuration}ms.`,
      durationMs: finalDuration,
      resultCount: 1,
      isCached: false,
    };
    onProgress?.({ ...currentStage });

    return {
      details: sanitizedDetails,
      pipeline: currentStage,
      isFromCache: false,
    };
  } catch (error: any) {
    const errorDuration = Math.round(performance.now() - startTime);
    const errorStage: PipelineStageInfo = {
      stage: 'error',
      query: cleanKey,
      endpoint,
      statusText: `Details pipeline error: ${error.name === 'AbortError' ? 'Network request timed out' : error.message}`,
      durationMs: errorDuration,
      resultCount: 0,
      error: error.message || 'Failed to fetch work details',
    };
    onProgress?.(errorStage);

    return {
      details: null,
      pipeline: errorStage,
      isFromCache: false,
    };
  }
}
