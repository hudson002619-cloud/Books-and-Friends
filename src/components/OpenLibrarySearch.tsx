import React, { useState, useEffect, useRef } from 'react';
import { OpenLibraryDoc, DarkBook, PipelineStageInfo, CacheStats } from '../types';
import {
  executeOpenLibrarySearch,
  fetchOpenLibraryAutocomplete,
  DARK_PSYCHOLOGY_PRESETS,
  deduceDarkArchetype,
  getCoverUrl,
  getCoverUrlByIsbn,
  getLocalCacheStats,
  clearOpenLibraryLocalCache,
} from '../services/openLibrary';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Compass,
  BookPlus,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Activity,
  Eye,
  Database,
  Trash2,
  ExternalLink,
  Sparkles,
  Zap,
  Info,
  Users,
} from 'lucide-react';

interface OpenLibrarySearchProps {
  onAddBookToSanctuary: (book: DarkBook) => void;
  existingBookKeys: Set<string>;
  onInspectBook: (doc: OpenLibraryDoc) => void;
  onStartSession?: (doc: OpenLibraryDoc) => void;
}

export const OpenLibrarySearch: React.FC<OpenLibrarySearchProps> = ({
  onAddBookToSanctuary,
  existingBookKeys,
  onInspectBook,
  onStartSession,
}) => {
  const { isAdmin, user } = useAuth();
  const [query, setQuery] = useState('dark psychology manipulation');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OpenLibraryDoc[]>([]);
  const [pipelineState, setPipelineState] = useState<PipelineStageInfo | null>(null);
  const [addedBookKeys, setAddedBookKeys] = useState<Set<string>>(new Set());
  const [isCachedResult, setIsCachedResult] = useState(false);

  // Autocomplete state
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<OpenLibraryDoc[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAutocompleteLoading, setIsAutocompleteLoading] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Local Cache Stats
  const [cacheStats, setCacheStats] = useState<CacheStats>(getLocalCacheStats());

  const refreshCacheStats = () => {
    setCacheStats(getLocalCacheStats());
  };

  useEffect(() => {
    // Run initial search
    handleSearch(query);
  }, []);

  // Handle outside click to close autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocomplete debounced query fetch
  const handleQueryChange = (val: string) => {
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length < 2) {
      setAutocompleteSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsAutocompleteLoading(true);
      const suggestions = await fetchOpenLibraryAutocomplete(val, 6);
      setAutocompleteSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
      setIsAutocompleteLoading(false);
    }, 280);
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setShowSuggestions(false);
    setLoading(true);
    setResults([]);

    const response = await executeOpenLibrarySearch(searchQuery, (stage) => {
      setPipelineState(stage);
    });

    setResults(response.docs);
    setIsCachedResult(response.isFromCache);
    setLoading(false);
    refreshCacheStats();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleSelectSuggestion = (doc: OpenLibraryDoc) => {
    setQuery(doc.title);
    setShowSuggestions(false);
    handleSearch(doc.title);
  };

  const handleClearCache = () => {
    clearOpenLibraryLocalCache();
    refreshCacheStats();
  };

  const handleAddDoc = (doc: OpenLibraryDoc) => {
    const author = doc.author_name?.[0] || 'Unknown Philosopher';
    const archetype = deduceDarkArchetype(doc.title, doc.subject);
    const coverUrl = doc.cover_i
      ? getCoverUrl(doc.cover_i, 'L')
      : doc.isbn?.[0]
      ? getCoverUrlByIsbn(doc.isbn[0], 'L')
      : '/src/assets/images/reading_circle_dramatic_1790432613396.jpg';

    const newBook: DarkBook = {
      id: `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      openLibraryKey: doc.key,
      title: doc.title,
      author,
      coverUrl,
      firstPublishYear: doc.first_publish_year,
      isbn: doc.isbn,
      subjects: doc.subject?.slice(0, 5) || ['Psychology', 'Philosophy'],
      darkArchetype: archetype,
      synopsis: `Ingested from Open Library catalog for the Books and Friends Sanctuary. Classification: ${archetype}.`,
      curatorNotes: isAdmin
        ? `Verified by Developer Admin (${user?.email})`
        : `Recommended by ${user?.name || 'Sanctuary Scholar'}`,
      rating: doc.ratings_average || 4.8,
      addedBy: user?.email || 'adhudson504@gmail.com',
      createdAt: new Date().toISOString(),
      discussionCount: 0,
      status: 'reading',
    };

    onAddBookToSanctuary(newBook);
    setAddedBookKeys((prev) => new Set([...prev, doc.key]));
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0c0c12] p-6 md:p-8 shadow-xl">
        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Compass className="w-3.5 h-3.5 text-red-500" />
              <span>Open Library RESTful APIs</span>
              <span>·</span>
              <span>On-Demand Fetching Workflow</span>
            </div>

            {/* Direct Open Library Website & Account Action Gateways */}
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="https://openlibrary.org/account/create"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-800/60 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
                title="Sign up for an Open Library account to borrow books"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Open Library Sign Up</span>
                <ExternalLink className="w-3 h-3 text-red-300" />
              </a>

              <a
                href="https://openlibrary.org/account/login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141420] hover:bg-[#1c1c2c] border border-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
                title="Log in to your Open Library account"
              >
                <span>Log In</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>

              <a
                href="https://openlibrary.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141420] hover:bg-[#1c1c2c] border border-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
              >
                <span>openlibrary.org</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            </div>
          </div>

          {/* User Email & Book Club Library Sync Banner */}
          <div className="mb-4 p-3 rounded-xl bg-[#11111c] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-400">Book Club & Library Sync Email:</span>
              <span className="font-mono text-zinc-100 font-semibold">{user?.email || 'adhudson504@gmail.com'}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="text-emerald-400 font-mono">Matched & Linked</span>
              <span>·</span>
              <span>Direct Session Creation Enabled</span>
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-zinc-100 font-display">
            Explore The Dark Psychology Codex
          </h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Query millions of psychological volumes, manipulative treatises, and shadow literature directly from the Open Library global catalog with on-demand local caching.
          </p>

          {/* Search Form with Real-time Autocomplete */}
          <div ref={autocompleteRef} className="relative mt-5 max-w-2xl">
            <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onFocus={() => {
                    if (autocompleteSuggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Search title, author, Machiavellianism, shadow self, or ISBN..."
                  className="w-full pl-10 pr-10 py-2.5 bg-[#14141f] border border-white/10 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-600/60 transition-all font-sans"
                />
                {isAutocompleteLoading && (
                  <span className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-amber-400 rounded-full animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-red-950 hover:bg-red-900 border border-red-800/60 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Fetch Codex</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Real-time Autocomplete Dropdown */}
            {showSuggestions && autocompleteSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#10101a] border border-white/15 rounded-xl shadow-2xl z-30 overflow-hidden divide-y divide-white/5 animate-fadeIn">
                <div className="px-3 py-1.5 bg-[#0b0b12] text-[10px] uppercase font-semibold text-zinc-400 flex items-center justify-between">
                  <span>Open Library Autocomplete Suggestions</span>
                  <span className="text-zinc-500 font-mono">Real-time</span>
                </div>
                {autocompleteSuggestions.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-white/5 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="truncate">
                      <span className="font-medium text-zinc-100">{item.title}</span>
                      <span className="text-zinc-400 ml-2 text-[11px]">
                        by {item.author_name?.[0] || 'Unknown'} {item.first_publish_year ? `(${item.first_publish_year})` : ''}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-400/90 font-mono shrink-0 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/40">
                      {deduceDarkArchetype(item.title, item.subject)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dark Psychology Topic Presets */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-zinc-400 font-medium">Curated Topics:</span>
            {DARK_PSYCHOLOGY_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setQuery(preset.query);
                  handleSearch(preset.query);
                }}
                className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all ${
                  query === preset.query
                    ? 'bg-zinc-800 border-zinc-600 text-white font-medium'
                    : 'bg-[#111118] border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/10'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Local Database Caching Dashboard & Pipeline Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Strict Workflow Pipeline Monitor */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-[#0e0e16] border border-white/10">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-zinc-200 font-display">
                Workflow Rule: Input → Network → Process → Output
              </span>
            </div>
            <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
              {isCachedResult ? (
                <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 flex items-center gap-1 text-[10px]">
                  <Zap className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Served from Local Cache</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/40 text-[10px]">
                  🌐 Live Network Fetch
                </span>
              )}
              {pipelineState && <span>{pipelineState.durationMs}ms</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
            <div
              className={`p-2.5 rounded-lg border ${
                pipelineState?.stage === 'input' ||
                pipelineState?.stage === 'network' ||
                pipelineState?.stage === 'process' ||
                pipelineState?.stage === 'output'
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : 'bg-zinc-900/30 border-white/5 text-zinc-500'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-zinc-400">1. Input Stage</div>
              <div className="truncate font-mono text-[11px] mt-0.5">
                q="{pipelineState?.query ? pipelineState.query.slice(0, 15) : 'query'}..."
              </div>
            </div>

            <div
              className={`p-2.5 rounded-lg border ${
                pipelineState?.stage === 'network'
                  ? 'bg-amber-950/30 border-amber-700/50 text-amber-300 animate-pulse'
                  : isCachedResult
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : pipelineState?.stage === 'process' || pipelineState?.stage === 'output'
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : 'bg-zinc-900/30 border-white/5 text-zinc-500'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-zinc-400">2. Network Stage</div>
              <div className="truncate font-mono text-[11px] mt-0.5">
                {isCachedResult ? 'Cache Bypass' : 'openlibrary.org/search'}
              </div>
            </div>

            <div
              className={`p-2.5 rounded-lg border ${
                pipelineState?.stage === 'process'
                  ? 'bg-amber-950/30 border-amber-700/50 text-amber-300 animate-pulse'
                  : pipelineState?.stage === 'output'
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : 'bg-zinc-900/30 border-white/5 text-zinc-500'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-zinc-400">3. Process Stage</div>
              <div className="truncate font-mono text-[11px] mt-0.5">Deduce Archetypes</div>
            </div>

            <div
              className={`p-2.5 rounded-lg border ${
                pipelineState?.stage === 'output'
                  ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300'
                  : pipelineState?.stage === 'error'
                  ? 'bg-red-950/30 border-red-700/50 text-red-300'
                  : 'bg-zinc-900/30 border-white/5 text-zinc-500'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-zinc-400">4. Output Stage</div>
              <div className="truncate font-mono text-[11px] mt-0.5">
                {pipelineState?.stage === 'error'
                  ? 'Pipeline Error'
                  : `${pipelineState?.resultCount || results.length} Ready`}
              </div>
            </div>
          </div>

          <div className="mt-2.5 text-[11px] text-zinc-400 font-mono truncate">
            {pipelineState?.statusText || 'Engine standing by for on-demand query dispatch.'}
          </div>
        </div>

        {/* Right Col: Local Database Caching Metrics */}
        <div className="p-4 rounded-xl bg-[#0e0e16] border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-zinc-200 font-display">
                  Local Database Cache
                </span>
              </div>
              <button
                onClick={handleClearCache}
                className="text-[10px] text-zinc-400 hover:text-red-300 transition-colors flex items-center gap-1 p-1 hover:bg-white/5 rounded"
                title="Clear local cached Open Library responses"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2.5 text-xs">
              <div className="p-2 rounded-lg bg-[#141420] border border-white/5">
                <div className="text-[10px] text-zinc-400">Cache Hits</div>
                <div className="text-sm font-bold text-emerald-400 font-mono">{cacheStats.hits}</div>
              </div>
              <div className="p-2 rounded-lg bg-[#141420] border border-white/5">
                <div className="text-[10px] text-zinc-400">Cache Misses</div>
                <div className="text-sm font-bold text-zinc-300 font-mono">{cacheStats.misses}</div>
              </div>
              <div className="p-2 rounded-lg bg-[#141420] border border-white/5">
                <div className="text-[10px] text-zinc-400">Saved Entries</div>
                <div className="text-sm font-bold text-amber-300 font-mono">{cacheStats.totalCached}</div>
              </div>
              <div className="p-2 rounded-lg bg-[#141420] border border-white/5">
                <div className="text-[10px] text-zinc-400">Est. Storage</div>
                <div className="text-sm font-bold text-zinc-300 font-mono">{cacheStats.estimatedSizeKb} KB</div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1">
            <Info className="w-3 h-3 shrink-0 text-zinc-400" />
            <span>Reduces redundant network calls & boosts speed.</span>
          </div>
        </div>
      </div>

      {/* Search Results Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Found {results.length} Open Library Titles</span>
          <span>Click Examine for Works/ISBN details or Ingest into the Sanctuary</span>
        </div>

        {results.length === 0 && !loading && (
          <div className="p-12 text-center rounded-2xl bg-[#0c0c12] border border-white/5">
            <p className="text-zinc-400 text-sm">
              No volumes retrieved. Try searching by title, author, topic, or ISBN above.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.map((doc) => {
            const author = doc.author_name?.[0] || 'Unknown Author';
            const archetype = deduceDarkArchetype(doc.title, doc.subject);
            const coverUrl = doc.cover_i
              ? getCoverUrl(doc.cover_i, 'M')
              : doc.isbn?.[0]
              ? getCoverUrlByIsbn(doc.isbn[0], 'M')
              : '';
            const isAlreadyInVault = existingBookKeys.has(doc.key) || addedBookKeys.has(doc.key);

            return (
              <div
                key={doc.key}
                className="group relative bg-[#0e0e15] border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Book Cover Area */}
                  <div className="relative aspect-[3/4] w-full rounded-lg bg-[#14141e] border border-white/5 overflow-hidden mb-3">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={doc.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-zinc-900 to-black">
                        <BookPlus className="w-8 h-8 text-zinc-600 mb-2" />
                        <span className="text-xs font-semibold text-zinc-400 line-clamp-2">{doc.title}</span>
                      </div>
                    )}

                    {/* Archetype Overlay Badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-medium text-amber-300 border border-white/10">
                      {archetype}
                    </div>

                    {doc.fromCache && (
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[9px] font-medium text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" />
                        <span>Cached</span>
                      </div>
                    )}
                  </div>

                  {/* Book Metadata - Zero Pill Discipline */}
                  <h3 className="text-sm font-semibold text-zinc-100 line-clamp-2 font-display">
                    {doc.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                    <span className="truncate max-w-[140px]">{author}</span>
                    {doc.first_publish_year && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{doc.first_publish_year}</span>
                      </>
                    )}
                  </div>

                  {/* ISBN / Subjects preview */}
                  {doc.isbn && doc.isbn[0] && (
                    <div className="text-[10px] font-mono text-zinc-500 mt-1 truncate">
                      ISBN: {doc.isbn[0]}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 mt-3 border-t border-white/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onInspectBook(doc)}
                      className="flex-1 py-1.5 px-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Examine</span>
                    </button>

                    <button
                      onClick={() => handleAddDoc(doc)}
                      disabled={isAlreadyInVault}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                        isAlreadyInVault
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 cursor-default'
                          : 'bg-red-950 hover:bg-red-900 text-red-200 border border-red-800/60 cursor-pointer'
                      }`}
                    >
                      {isAlreadyInVault ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>In Vault</span>
                        </>
                      ) : (
                        <>
                          <BookPlus className="w-3.5 h-3.5" />
                          <span>{isAdmin ? 'Ingest' : 'Add'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {onStartSession && (
                    <button
                      type="button"
                      onClick={() => onStartSession(doc)}
                      className="w-full py-1.5 px-2 bg-[#151522] hover:bg-red-950/40 border border-white/10 hover:border-red-800/50 text-amber-300 hover:text-amber-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3 h-3 text-amber-400" />
                      <span>Host Reading Session</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
