import React, { useState, useEffect, useRef } from 'react';
import { DarkBook, ReadingTimerState, VaultFilterState } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getStoredVaultFilters,
  saveStoredVaultFilters,
  getStoredReadingTimer,
  saveStoredReadingTimer,
  getStoredBookmarks,
  toggleStoredBookmark,
} from '../lib/supabase';
import {
  BookOpen,
  Star,
  Sparkles,
  Filter,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Flame,
  Shield,
  Compass,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Search,
  ArrowUpDown,
  CheckCircle2,
  Layers,
} from 'lucide-react';

interface SanctuaryVaultProps {
  books: DarkBook[];
  onSelectBook: (book: DarkBook) => void;
  onNavigateToExplore: () => void;
}

export const SanctuaryVault: React.FC<SanctuaryVaultProps> = ({
  books,
  onSelectBook,
  onNavigateToExplore,
}) => {
  const { user } = useAuth();

  // Persistent Filter State (retrieved from localStorage across tab closures)
  const [filters, setFilters] = useState<VaultFilterState>(getStoredVaultFilters());
  const [bookmarks, setBookmarks] = useState<string[]>(getStoredBookmarks());

  // Persistent Background Reading Timer
  const [timerState, setTimerState] = useState<ReadingTimerState>(getStoredReadingTimer());
  const [elapsedDisplaySeconds, setElapsedDisplaySeconds] = useState<number>(0);
  const [showTimerSettings, setShowTimerSettings] = useState(false);

  const archetypes = [
    'all',
    'The Strategist',
    'The Shadow',
    'The Manipulator',
    'The Sovereign',
    'The Stoic',
    'The Alchemist',
  ];

  // Save filter state to localStorage on modification
  const handleFilterUpdate = (partial: Partial<VaultFilterState>) => {
    const updated = { ...filters, ...partial };
    setFilters(updated);
    saveStoredVaultFilters(updated);
  };

  const handleToggleBookmark = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    const updated = toggleStoredBookmark(bookId);
    setBookmarks(updated);
  };

  // Background Timer Calculation Engine
  // Calculates accurate elapsed time even if browser tab was closed or suspended!
  useEffect(() => {
    let interval: any = null;

    const calculateElapsed = () => {
      if (timerState.isActive && timerState.startTime) {
        const secondsSinceStart = Math.floor((Date.now() - timerState.startTime) / 1000);
        setElapsedDisplaySeconds(timerState.accumulatedSeconds + secondsSinceStart);
      } else {
        setElapsedDisplaySeconds(timerState.accumulatedSeconds);
      }
    };

    calculateElapsed();

    if (timerState.isActive) {
      interval = setInterval(calculateElapsed, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState]);

  // Timer Controls
  const handleStartTimer = (book?: DarkBook) => {
    const targetBook = book || books.find((b) => b.id === timerState.bookId) || books[0];
    const newTimer: ReadingTimerState = {
      ...timerState,
      isActive: true,
      bookId: targetBook ? targetBook.id : 'book_48_laws',
      bookTitle: targetBook ? targetBook.title : 'The 48 Laws of Power',
      author: targetBook ? targetBook.author : 'Robert Greene',
      startTime: Date.now(),
    };
    setTimerState(newTimer);
    saveStoredReadingTimer(newTimer);
  };

  const handlePauseTimer = () => {
    if (!timerState.isActive || !timerState.startTime) return;
    const additionalSeconds = Math.floor((Date.now() - timerState.startTime) / 1000);
    const newTimer: ReadingTimerState = {
      ...timerState,
      isActive: false,
      startTime: null,
      accumulatedSeconds: timerState.accumulatedSeconds + additionalSeconds,
    };
    setTimerState(newTimer);
    saveStoredReadingTimer(newTimer);
  };

  const handleResetTimer = () => {
    const newTimer: ReadingTimerState = {
      ...timerState,
      isActive: false,
      startTime: null,
      accumulatedSeconds: 0,
    };
    setTimerState(newTimer);
    saveStoredReadingTimer(newTimer);
    setElapsedDisplaySeconds(0);
  };

  // Format Elapsed Seconds
  const formatTimerDisplay = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Filter & Search Logic
  const filteredBooks = books.filter((book) => {
    const matchesArchetype = filters.archetype === 'all' || book.darkArchetype === filters.archetype;
    const matchesStatus = filters.status === 'all' || book.status === filters.status;
    const matchesSearch =
      !filters.searchQuery ||
      book.title.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      book.subjects.some((s) => s.toLowerCase().includes(filters.searchQuery.toLowerCase()));
    const matchesBookmark = !filters.onlyBookmarked || bookmarks.includes(book.id);

    return matchesArchetype && matchesStatus && matchesSearch && matchesBookmark;
  });

  // Sort logic
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if (filters.sortBy === 'rating') return b.rating - a.rating;
    if (filters.sortBy === 'title') return a.title.localeCompare(b.title);
    if (filters.sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return b.status === 'featured' ? 1 : -1;
  });

  const featuredBook = books.find((b) => b.status === 'featured') || books[0];

  return (
    <div className="space-y-8">
      {/* Hero Atmosphere Banner - Photorealistic 8k Dramatic Lighting */}
      {featuredBook && (
        <div className="relative rounded-3xl overflow-hidden border border-white/10 glow-obscure min-h-[380px] flex flex-col justify-end p-6 md:p-10">
          {/* Background Image with Measured Scrim */}
          <div className="absolute inset-0 z-0">
            <img
              src="/src/assets/images/hero_dark_library_1790432601708.jpg"
              alt="Books and Friends Dark Psychology Sanctuary"
              className="w-full h-full object-cover brightness-[0.45] contrast-125 scale-100"
              referrerPolicy="no-referrer"
            />
            {/* Cinematic Gradient Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070709] via-transparent to-[#070709]/60" />
          </div>

          {/* Hero Content */}
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="text-red-400 font-semibold uppercase tracking-wider text-[11px]">Featured Tome of Power</span>
              <span>·</span>
              <span className="text-amber-300">{featuredBook.darkArchetype}</span>
              <span>·</span>
              <span>4.8 Rating</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-display tracking-tight text-balance leading-tight">
              {featuredBook.title}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 line-clamp-3 leading-relaxed max-w-xl">
              {featuredBook.synopsis}
            </p>

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => onSelectBook(featuredBook)}
                className="px-5 py-2.5 bg-red-950 hover:bg-red-900 border border-red-700/60 text-white text-xs font-semibold rounded-xl transition-all shadow-lg hover:shadow-red-950/50 flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Examine Volume & Notes</span>
              </button>

              <button
                onClick={() => handleStartTimer(featuredBook)}
                className="px-4 py-2.5 bg-[#161622] hover:bg-[#202030] border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-medium rounded-xl transition-all flex items-center gap-2 backdrop-blur-md cursor-pointer shadow-md"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Deep Focus Session</span>
              </button>

              <button
                onClick={onNavigateToExplore}
                className="px-4 py-2.5 bg-black/60 hover:bg-black/90 border border-white/15 text-zinc-300 hover:text-white text-xs font-medium rounded-xl transition-all flex items-center gap-2 backdrop-blur-md cursor-pointer"
              >
                <Compass className="w-4 h-4 text-zinc-400" />
                <span>Browse Open Library Codex</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Background Reading Timer Console */}
      <div className="p-4 rounded-2xl bg-[#0c0c14] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-800/50 text-red-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-200 font-display">
                Deep Focus Reading Timer (Background Persistent)
              </span>
              {timerState.isActive ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-mono border border-emerald-800/50 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Tracking in Background</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono border border-white/5">
                  Paused
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5 truncate max-w-sm">
              Current Tome: <span className="text-zinc-200 font-medium">{timerState.bookTitle}</span> ({timerState.author})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-xl md:text-2xl font-bold text-amber-300 font-mono tracking-wider tabular-nums bg-black/50 px-3.5 py-1 rounded-xl border border-white/10">
            {formatTimerDisplay(elapsedDisplaySeconds)}
          </div>

          <div className="flex items-center gap-2">
            {timerState.isActive ? (
              <button
                type="button"
                onClick={handlePauseTimer}
                className="p-2 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/60 text-amber-200 rounded-xl transition-all cursor-pointer shadow-sm"
                title="Pause Reading Clock"
              >
                <Pause className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStartTimer()}
                className="p-2 bg-red-950 hover:bg-red-900 border border-red-700/60 text-white rounded-xl transition-all cursor-pointer shadow-sm"
                title="Start Reading Clock"
              >
                <Play className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleResetTimer}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-zinc-200 rounded-xl transition-all cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Segmented Filter Controls & Search */}
      <div className="space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2 flex-wrap">
            <BookOpen className="w-4 h-4 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-100 font-display">
              Sanctuary Grimoire & Vault
            </h2>
            <span className="text-xs text-zinc-500 font-mono">({sortedBooks.length} volumes)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => handleFilterUpdate({ searchQuery: e.target.value })}
                placeholder="Filter sanctuary catalog..."
                className="pl-8 pr-3 py-1 bg-[#12121b] border border-white/10 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-600/50"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterUpdate({ sortBy: e.target.value as any })}
              className="px-2.5 py-1 bg-[#12121b] border border-white/10 rounded-lg text-xs text-zinc-300"
            >
              <option value="featured">Featured First</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Recently Added</option>
              <option value="title">Title (A-Z)</option>
            </select>

            {/* Bookmarks Only Toggle */}
            <button
              type="button"
              onClick={() => handleFilterUpdate({ onlyBookmarked: !filters.onlyBookmarked })}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                filters.onlyBookmarked
                  ? 'bg-amber-950/60 border-amber-700/60 text-amber-300 font-semibold'
                  : 'bg-[#12121b] border-white/10 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Bookmark className="w-3 h-3" />
              <span>Bookmarks ({bookmarks.length})</span>
            </button>
          </div>
        </div>

        {/* Status & Archetype Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Filter Segmented Control */}
          <div className="flex items-center p-1 bg-[#101018] rounded-lg border border-white/5 w-fit">
            {(['all', 'reading', 'featured', 'archive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => handleFilterUpdate({ status })}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize cursor-pointer ${
                  filters.status === status
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Archetype Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {archetypes.map((archetype) => (
              <button
                key={archetype}
                onClick={() => handleFilterUpdate({ archetype })}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all border cursor-pointer ${
                  filters.archetype === archetype
                    ? 'bg-red-950/60 border-red-800/80 text-white font-medium'
                    : 'bg-[#0f0f16] border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/10'
                }`}
              >
                {archetype === 'all' ? 'All Archetypes' : archetype}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Books Showcase Grid */}
      {sortedBooks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0c0c12] border border-white/5 space-y-2">
          <p className="text-zinc-400 text-sm">No volumes match the active filter criteria.</p>
          <button
            onClick={() => handleFilterUpdate({ archetype: 'all', status: 'all', searchQuery: '', onlyBookmarked: false })}
            className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sortedBooks.map((book) => {
            const isBookmarked = bookmarks.includes(book.id);

            return (
              <div
                key={book.id}
                onClick={() => onSelectBook(book)}
                className="group cursor-pointer rounded-2xl bg-[#0d0d14] border border-white/10 hover:border-white/20 p-4 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 shadow-lg hover:shadow-2xl relative"
              >
                <div>
                  {/* Cover Art with 8k Dramatic Lighting Shadow */}
                  <div className="relative aspect-[3/4] w-full rounded-xl bg-black border border-white/10 overflow-hidden mb-3.5">
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />

                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/85 backdrop-blur-md text-[10px] font-semibold text-amber-300 border border-white/10">
                      {book.darkArchetype}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleToggleBookmark(e, book.id)}
                      className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg backdrop-blur-md border transition-all cursor-pointer ${
                        isBookmarked
                          ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                          : 'bg-black/70 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                      title={isBookmarked ? 'Remove bookmark' : 'Bookmark volume'}
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="w-3.5 h-3.5 text-amber-300" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/85 backdrop-blur-md text-[10px] font-mono text-zinc-200 border border-white/10 flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{book.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Title & Author - Unboxed Metadata */}
                  <h3 className="text-sm font-semibold text-zinc-100 font-display line-clamp-2 group-hover:text-amber-200 transition-colors">
                    {book.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                    <span>{book.author}</span>
                    {book.firstPublishYear && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{book.firstPublishYear}</span>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
                    {book.synopsis}
                  </p>
                </div>

                {/* Bottom Card Area */}
                <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
                  <span className="capitalize">{book.status} Salon</span>
                  <span className="flex items-center gap-1 text-zinc-300 font-medium group-hover:text-amber-300 transition-colors">
                    Inspect <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
