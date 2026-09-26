import React, { useState } from 'react';
import {
  BookClubThread,
  BookClubComment,
  BookClubCategory,
  MemberGoal,
  DarkBook,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { SUPABASE_ADMIN_FRAMEWORK_SQL } from '../lib/schemaSql';
import {
  Users,
  MessageSquare,
  Sparkles,
  Plus,
  Filter,
  Search,
  BookOpen,
  Pin,
  Flame,
  Lightbulb,
  Eye,
  Scale,
  Bookmark,
  Send,
  Trash2,
  CheckCircle2,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  CheckCheck,
  Share2,
  BookMarked,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface BookClubProps {
  threads: BookClubThread[];
  memberGoals: MemberGoal[];
  books: DarkBook[];
  onAddThread: (thread: BookClubThread) => void;
  onAddComment: (threadId: string, comment: BookClubComment) => void;
  onToggleReaction: (threadId: string, reactionType: string, commentId?: string) => void;
  onDeleteThread?: (threadId: string) => void;
  onAddMemberGoal: (goal: MemberGoal) => void;
  onUpdateMemberGoalProgress?: (goalId: string, delta: number) => void;
  initialBook?: DarkBook | null;
}

const REACTION_CONFIG = [
  { type: '👁️', label: 'Deep Analysis', icon: Eye, color: 'text-purple-400', bg: 'hover:bg-purple-950/40 hover:border-purple-800/60' },
  { type: '💡', label: 'Insightful', icon: Lightbulb, color: 'text-amber-400', bg: 'hover:bg-amber-950/40 hover:border-amber-800/60' },
  { type: '🔥', label: 'Provocative', icon: Flame, color: 'text-rose-400', bg: 'hover:bg-rose-950/40 hover:border-rose-800/60' },
  { type: '⚖️', label: 'Stoic Truth', icon: Scale, color: 'text-emerald-400', bg: 'hover:bg-emerald-950/40 hover:border-emerald-800/60' },
  { type: '📌', label: 'Bookmarked', icon: Bookmark, color: 'text-blue-400', bg: 'hover:bg-blue-950/40 hover:border-blue-800/60' },
];

export const BookClub: React.FC<BookClubProps> = ({
  threads,
  memberGoals,
  books,
  onAddThread,
  onAddComment,
  onToggleReaction,
  onDeleteThread,
  onAddMemberGoal,
  onUpdateMemberGoalProgress,
  initialBook,
}) => {
  const { user, isAdmin } = useAuth();

  // Active Main Section within Book Club
  const [activeSection, setActiveSection] = useState<'discussions' | 'chapter_notes' | 'goals' | 'stream'>('discussions');

  // Filtering & Search
  const [categoryFilter, setCategoryFilter] = useState<'all' | BookClubCategory>('all');
  const [selectedArchetype, setSelectedArchetype] = useState<string>('all');
  const [chapterFilter, setChapterFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'reactions' | 'comments'>('newest');

  // Modal / Form States
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // New Thread Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<BookClubCategory>('perspective');
  const [newBookId, setNewBookId] = useState<string>(initialBook?.id || books[0]?.id || '');
  const [newChapterNumber, setNewChapterNumber] = useState<number | ''>('');
  const [newKeyTakeaway, setNewKeyTakeaway] = useState('');
  const [newArchetype, setNewArchetype] = useState('The Strategist');
  const [newTags, setNewTags] = useState('');

  // New Goal Form State
  const [goalBookTitle, setGoalBookTitle] = useState(books[0]?.title || 'The 48 Laws of Power');
  const [goalTargetChapters, setGoalTargetChapters] = useState(12);
  const [goalDeadline, setGoalDeadline] = useState('2026-11-15');
  const [goalReflectionNote, setGoalReflectionNote] = useState('');

  // Comment input per thread
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string>>({});
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({
    thread_jung_shadow_01: true,
  });

  const archetypesList = [
    'all',
    'The Shadow',
    'The Strategist',
    'The Manipulator',
    'The Sovereign',
    'The Stoic',
    'The Alchemist',
  ];

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const selectedBook = books.find((b) => b.id === newBookId);

    const parsedTags = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const newThread: BookClubThread = {
      id: `thread_${Date.now()}`,
      bookId: selectedBook?.id,
      bookTitle: selectedBook ? selectedBook.title : 'General Psychological Discourse',
      bookAuthor: selectedBook ? selectedBook.author : 'Sanctuary Circle',
      coverUrl: selectedBook?.coverUrl,
      authorName: user?.name || 'Sanctuary Scholar',
      authorEmail: user?.email || 'guest@sanctuary.io',
      authorRole: user?.role || 'member',
      authorAvatar: user?.avatarUrl,
      category: newCategory,
      chapterNumber: newChapterNumber ? Number(newChapterNumber) : undefined,
      title: newTitle.trim(),
      content: newContent.trim(),
      keyTakeaway: newKeyTakeaway.trim() || undefined,
      archetypeTag: newArchetype,
      tags: parsedTags.length > 0 ? parsedTags : [newArchetype, newCategory.replace('_', ' ')],
      createdAt: new Date().toISOString(),
      pinned: false,
      reactions: { '👁️': 0, '💡': 0, '🔥': 0, '⚖️': 0, '📌': 0 },
      userReactions: {},
      commentsCount: 0,
      comments: [],
    };

    onAddThread(newThread);
    setShowThreadModal(false);
    setNewTitle('');
    setNewContent('');
    setNewKeyTakeaway('');
    setNewTags('');
    setNewChapterNumber('');
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalBookTitle.trim()) return;

    const newGoal: MemberGoal = {
      id: `goal_${Date.now()}`,
      userEmail: user?.email || 'guest@sanctuary.io',
      userName: user?.name || 'Sanctuary Scholar',
      userAvatar: user?.avatarUrl,
      bookTitle: goalBookTitle.trim(),
      targetChapters: goalTargetChapters,
      completedChapters: 0,
      deadline: goalDeadline,
      reflectionNote: goalReflectionNote.trim() || 'Committed to deep psychological reading and notes.',
      status: 'in_progress',
      createdAt: new Date().toISOString(),
    };

    onAddMemberGoal(newGoal);
    setShowGoalModal(false);
    setGoalReflectionNote('');
  };

  const handlePostComment = (threadId: string) => {
    const text = (commentInputs[threadId] || '').trim();
    if (!text) return;

    const replyAuthor = replyingTo[threadId];

    const newComment: BookClubComment = {
      id: `comm_bc_${Date.now()}`,
      threadId,
      authorName: user?.name || 'Sanctuary Scholar',
      authorEmail: user?.email || 'guest@sanctuary.io',
      authorRole: user?.role || 'member',
      authorAvatar: user?.avatarUrl,
      content: text,
      createdAt: new Date().toISOString(),
      replyToAuthor: replyAuthor,
      reactions: {},
      userReactions: {},
    };

    onAddComment(threadId, newComment);
    setCommentInputs({ ...commentInputs, [threadId]: '' });
    setReplyingTo({ ...replyingTo, [threadId]: '' });
  };

  const toggleThreadExpand = (threadId: string) => {
    setExpandedThreads((prev) => ({
      ...prev,
      [threadId]: !prev[threadId],
    }));
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_ADMIN_FRAMEWORK_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Filter threads
  const filteredThreads = threads.filter((t) => {
    // Section matching
    if (activeSection === 'chapter_notes' && t.category !== 'chapter_note') return false;
    if (activeSection === 'discussions' && categoryFilter !== 'all' && t.category !== categoryFilter) return false;

    // Archetype filter
    if (selectedArchetype !== 'all' && t.archetypeTag !== selectedArchetype) return false;

    // Chapter filter
    if (chapterFilter !== 'all') {
      const ch = t.chapterNumber || 0;
      if (chapterFilter === '1-5' && (ch < 1 || ch > 5)) return false;
      if (chapterFilter === '6-15' && (ch < 6 || ch > 15)) return false;
      if (chapterFilter === '16-30' && (ch < 16 || ch > 30)) return false;
      if (chapterFilter === '31+' && ch < 31) return false;
    }

    // Keyword search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = t.title.toLowerCase().includes(q);
      const inContent = t.content.toLowerCase().includes(q);
      const inBook = t.bookTitle.toLowerCase().includes(q);
      const inAuthor = t.authorName.toLowerCase().includes(q);
      const inTags = t.tags.some((tag) => tag.toLowerCase().includes(q));
      if (!inTitle && !inContent && !inBook && !inAuthor && !inTags) return false;
    }

    return true;
  });

  // Sort threads
  const sortedThreads = [...filteredThreads].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    if (sortBy === 'reactions') {
      const countA = Object.values(a.reactions || {}).reduce((acc, v) => acc + v, 0);
      const countB = Object.values(b.reactions || {}).reduce((acc, v) => acc + v, 0);
      return countB - countA;
    }
    if (sortBy === 'comments') {
      return (b.commentsCount || b.comments.length) - (a.commentsCount || a.comments.length);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Action Bar */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-[#0d0d17] via-[#10101c] to-[#090910] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-950/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-950/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Users className="w-3.5 h-3.5" />
                <span>Book Club & Community Discourse</span>
              </span>
              <span>·</span>
              <span className="text-zinc-400">Real-Time Reflections & Salons</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Synchronized</span>
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 font-display tracking-tight">
              Philosophical Discourse & Chapter Salons
            </h1>

            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Engage with fellow scholars in deep psychological dissections. Share chapter notes, post-book perspectives, pledge reading accountability goals, and react with analytical insights.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => setShowThreadModal(true)}
              className="px-4 py-2.5 bg-red-950 hover:bg-red-900 border border-red-800/70 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg hover:shadow-red-950/50 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-red-300" />
              <span>Post Thought / Note</span>
            </button>

            <button
              onClick={() => setShowGoalModal(true)}
              className="px-3.5 py-2.5 bg-[#141422] hover:bg-[#1a1a2e] border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>Log Reading Goal</span>
            </button>

            {/* Supabase SQL Button - Strictly visible ONLY to Developer Admin */}
            {isAdmin && (
              <button
                onClick={() => setShowSqlModal(true)}
                className="px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Copy Supabase SQL code to run in Supabase SQL Editor"
              >
                <Code2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Supabase SQL</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top Segmented Navigation Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/10 pb-3">
        {/* Main Section Buttons */}
        <div className="flex items-center p-1 bg-[#0f0f18] rounded-xl border border-white/5 overflow-x-auto">
          <button
            onClick={() => setActiveSection('discussions')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSection === 'discussions'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-red-400" />
            <span>Discussion & Perspectives ({threads.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('chapter_notes')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSection === 'chapter_notes'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5 text-amber-400" />
            <span>Chapter Notes & Reflections ({threads.filter((t) => t.category === 'chapter_note').length})</span>
          </button>

          <button
            onClick={() => setActiveSection('goals')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSection === 'goals'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>Member Goals ({memberGoals.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('stream')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSection === 'stream'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Live Member Feed</span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reflections, tags, books..."
              className="pl-8 pr-3 py-1.5 bg-[#12121c] border border-white/10 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-600/50 w-48 md:w-60"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 bg-[#12121c] border border-white/10 rounded-lg text-xs text-zinc-300 focus:outline-none"
          >
            <option value="newest">Latest Thoughts</option>
            <option value="reactions">Most Insightful (Reactions)</option>
            <option value="comments">Most Discussed</option>
          </select>
        </div>
      </div>

      {/* 3. Filter Tags & Chapter Navigator */}
      {(activeSection === 'discussions' || activeSection === 'chapter_notes') && (
        <div className="space-y-2.5 p-3.5 rounded-xl bg-[#0b0b12] border border-white/5 text-xs">
          {/* Categories Filter */}
          {activeSection === 'discussions' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-zinc-400 text-[11px] font-mono shrink-0">Topic Type:</span>
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-red-950/80 text-red-200 border border-red-800/80 font-medium'
                    : 'bg-white/5 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All Threads
              </button>
              <button
                onClick={() => setCategoryFilter('perspective')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  categoryFilter === 'perspective'
                    ? 'bg-red-950/80 text-red-200 border border-red-800/80 font-medium'
                    : 'bg-white/5 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Perspectives
              </button>
              <button
                onClick={() => setCategoryFilter('chapter_note')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  categoryFilter === 'chapter_note'
                    ? 'bg-red-950/80 text-red-200 border border-red-800/80 font-medium'
                    : 'bg-white/5 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Chapter Notes
              </button>
              <button
                onClick={() => setCategoryFilter('post_book')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  categoryFilter === 'post_book'
                    ? 'bg-red-950/80 text-red-200 border border-red-800/80 font-medium'
                    : 'bg-white/5 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Post-Book Reflections
              </button>
              <button
                onClick={() => setCategoryFilter('general')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  categoryFilter === 'general'
                    ? 'bg-red-950/80 text-red-200 border border-red-800/80 font-medium'
                    : 'bg-white/5 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                General Salon
              </button>
            </div>
          )}

          {/* Chapter & Archetype Tagging Navigator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
            {/* Archetype Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-zinc-400 text-[11px] font-mono shrink-0 mr-1">Archetype:</span>
              {archetypesList.map((arc) => (
                <button
                  key={arc}
                  onClick={() => setSelectedArchetype(arc)}
                  className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                    selectedArchetype === arc
                      ? 'bg-amber-950/70 border border-amber-700/70 text-amber-300 font-semibold'
                      : 'bg-black/40 border border-white/5 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {arc === 'all' ? 'All Archetypes' : arc}
                </button>
              ))}
            </div>

            {/* Chapter Milestone Filter */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-zinc-400 text-[11px] font-mono">Chapter:</span>
              {['all', '1-5', '6-15', '16-30', '31+'].map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChapterFilter(ch)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                    chapterFilter === ch
                      ? 'bg-zinc-700 text-white font-medium'
                      : 'bg-black/40 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {ch === 'all' ? 'All' : `Ch ${ch}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. SECTION 1 & 2: THREADS STREAM (Discussions & Chapter Notes) */}
      {(activeSection === 'discussions' || activeSection === 'chapter_notes') && (
        <div className="space-y-4">
          {sortedThreads.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0c0c14] border border-white/5 space-y-3">
              <BookOpen className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-zinc-300 text-sm font-display">No discussions or reflections match your filter.</p>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Be the first to share an analytical breakdown or chapter reflection for this curriculum.
              </p>
              <button
                onClick={() => setShowThreadModal(true)}
                className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-800 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post First Thought</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedThreads.map((thread) => {
                const isExpanded = Boolean(expandedThreads[thread.id]);
                const isAuthorOrAdmin =
                  isAdmin || (user?.email && thread.authorEmail.toLowerCase() === user.email.toLowerCase());

                return (
                  <article
                    key={thread.id}
                    className="p-5 md:p-6 rounded-2xl bg-[#0e0e16] border border-white/10 hover:border-white/20 transition-all shadow-xl space-y-4"
                  >
                    {/* Top Row: Meta, Badges, Book Reference, Actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                          {thread.pinned && (
                            <span className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/50 text-[10px] font-bold flex items-center gap-1">
                              <Pin className="w-2.5 h-2.5" />
                              <span>Pinned Thesis</span>
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded bg-red-950/50 text-red-300 border border-red-900/40 text-[10px] font-semibold uppercase tracking-wider">
                            {thread.category.replace('_', ' ')}
                          </span>

                          {thread.chapterNumber && (
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px]">
                              Chapter {thread.chapterNumber}
                            </span>
                          )}

                          <span className="text-amber-300 font-semibold">{thread.archetypeTag}</span>
                          <span className="text-zinc-600">·</span>
                          <span className="text-zinc-300 font-medium">Re: {thread.bookTitle}</span>
                        </div>

                        <h2 className="text-lg md:text-xl font-bold text-zinc-100 font-display leading-snug">
                          {thread.title}
                        </h2>
                      </div>

                      {/* Author & Options */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isAuthorOrAdmin && onDeleteThread && (
                          <button
                            onClick={() => onDeleteThread(thread.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete discussion thread"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Author Byline */}
                    <div className="flex items-center gap-2.5 text-xs text-zinc-400 pb-2 border-b border-white/5">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-300 border border-white/10 overflow-hidden shrink-0">
                        {thread.authorAvatar ? (
                          <img src={thread.authorAvatar} alt={thread.authorName} className="w-full h-full object-cover" />
                        ) : (
                          thread.authorName.charAt(0)
                        )}
                      </div>
                      <span className="text-zinc-300 font-medium">{thread.authorName}</span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-[11px] text-zinc-400">{new Date(thread.createdAt).toLocaleDateString()}</span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-zinc-400">
                        {thread.authorRole === 'admin' ? 'Developer Admin' : thread.authorRole}
                      </span>
                    </div>

                    {/* Key Takeaway Highlight Callout if present */}
                    {thread.keyTakeaway && (
                      <div className="p-3.5 rounded-xl bg-amber-950/20 border-l-2 border-amber-500 text-xs text-amber-200 leading-relaxed space-y-1">
                        <div className="font-semibold flex items-center gap-1.5 text-amber-400 text-[11px] uppercase tracking-wider">
                          <Lightbulb className="w-3 h-3" />
                          <span>Key Psychological Principle</span>
                        </div>
                        <p className="italic">{thread.keyTakeaway}</p>
                      </div>
                    )}

                    {/* Body Content */}
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line font-serif">
                      {thread.content}
                    </p>

                    {/* Tags */}
                    {thread.tags && thread.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {thread.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md bg-[#141420] text-zinc-400 hover:text-zinc-200 text-[10px] border border-white/5"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Reaction Bar & Comments Toggle */}
                    <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* 5 Rich Psychological Reactions */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {REACTION_CONFIG.map(({ type, label, icon: Icon, color, bg }) => {
                          const count = thread.reactions?.[type] || 0;
                          const userHasReacted = Boolean(
                            user?.email && thread.userReactions?.[type]?.includes(user.email)
                          );

                          return (
                            <button
                              key={type}
                              onClick={() => onToggleReaction(thread.id, type)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border cursor-pointer ${bg} ${
                                userHasReacted
                                  ? 'bg-[#181828] border-amber-500/50 text-amber-300 font-bold shadow-sm'
                                  : 'bg-[#101018] border-white/5 text-zinc-400 hover:text-zinc-200'
                              }`}
                              title={`${label} (${count} scholars)`}
                            >
                              <span>{type}</span>
                              <span className="tabular-nums text-[11px]">{count}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Comments Expand Button */}
                      <button
                        onClick={() => toggleThreadExpand(thread.id)}
                        className="px-3 py-1.5 bg-[#12121e] hover:bg-[#181828] border border-white/10 rounded-lg text-xs text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer self-end sm:self-auto"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                        <span>
                          {thread.comments?.length || 0} {thread.comments?.length === 1 ? 'Comment' : 'Comments'}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Expandable Comment Section */}
                    {isExpanded && (
                      <div className="pt-4 border-t border-white/5 space-y-3 animate-fadeIn">
                        {/* Existing Threaded Comments */}
                        {thread.comments && thread.comments.length > 0 ? (
                          <div className="space-y-2.5 pl-3 md:pl-4 border-l border-white/10">
                            {thread.comments.map((comment) => (
                              <div
                                key={comment.id}
                                className="p-3 rounded-xl bg-[#12121d] border border-white/5 space-y-1.5 text-xs"
                              >
                                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-zinc-200">{comment.authorName}</span>
                                    {comment.replyToAuthor && (
                                      <span className="text-zinc-500">replying to @{comment.replyToAuthor}</span>
                                    )}
                                    <span className="text-zinc-600">·</span>
                                    <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>

                                  <button
                                    onClick={() => setReplyingTo({ ...replyingTo, [thread.id]: comment.authorName })}
                                    className="text-[10px] text-zinc-400 hover:text-amber-300 transition-colors cursor-pointer"
                                  >
                                    Reply
                                  </button>
                                </div>

                                <p className="text-zinc-300 leading-relaxed">{comment.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 italic">No responses posted yet. Initiate the dialogue.</p>
                        )}

                        {/* Comment Composer */}
                        <div className="space-y-1.5 pt-2">
                          {replyingTo[thread.id] && (
                            <div className="flex items-center justify-between text-[11px] text-amber-300 px-1">
                              <span>Replying to @{replyingTo[thread.id]}</span>
                              <button
                                onClick={() => setReplyingTo({ ...replyingTo, [thread.id]: '' })}
                                className="text-zinc-500 hover:text-zinc-300 text-[10px] cursor-pointer"
                              >
                                Cancel reply
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={commentInputs[thread.id] || ''}
                              onChange={(e) =>
                                setCommentInputs({ ...commentInputs, [thread.id]: e.target.value })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handlePostComment(thread.id);
                              }}
                              placeholder={
                                user
                                  ? 'Synthesize your perspective or rebuttal...'
                                  : 'Sign in to participate in book club discussion...'
                              }
                              className="flex-1 px-3 py-2 bg-[#141422] border border-white/10 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-600/60"
                            />

                            <button
                              onClick={() => handlePostComment(thread.id)}
                              disabled={!(commentInputs[thread.id] || '').trim()}
                              className="px-3.5 py-2 bg-red-950 hover:bg-red-900 disabled:opacity-40 disabled:cursor-not-allowed border border-red-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Send</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. SECTION 3: MEMBER GOALS & ACCOUNTABILITY */}
      {activeSection === 'goals' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Community Reading Commitments & Progress Pacing</span>
            <button
              onClick={() => setShowGoalModal(true)}
              className="px-3.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Set My Goal</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {memberGoals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.completedChapters / (goal.targetChapters || 1)) * 100));
              const isOwner = user?.email && goal.userEmail.toLowerCase() === user.email.toLowerCase();

              return (
                <div
                  key={goal.id}
                  className="p-5 rounded-2xl bg-[#0e0e16] border border-white/10 space-y-4 hover:border-white/20 transition-all shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-200 border border-white/10 overflow-hidden">
                        {goal.userAvatar ? (
                          <img src={goal.userAvatar} alt={goal.userName} className="w-full h-full object-cover" />
                        ) : (
                          goal.userName.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-100">{goal.userName}</div>
                        <div className="text-[10px] text-zinc-400">Target: {goal.deadline || 'Ongoing'}</div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        goal.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {goal.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200 font-display">{goal.bookTitle}</h3>
                    {goal.reflectionNote && (
                      <p className="text-xs text-zinc-400 italic mt-1 line-clamp-2">&quot;{goal.reflectionNote}&quot;</p>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400">Progress</span>
                      <span className="text-zinc-200 font-bold">
                        {goal.completedChapters} / {goal.targetChapters} Chapters ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-red-700 via-amber-600 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick Progress Increment for Goal Owner */}
                  {isOwner && onUpdateMemberGoalProgress && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-zinc-400 text-[11px]">Log Chapter Progress:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onUpdateMemberGoalProgress(goal.id, -1)}
                          disabled={goal.completedChapters <= 0}
                          className="px-2 py-0.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded text-zinc-300 cursor-pointer"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => onUpdateMemberGoalProgress(goal.id, 1)}
                          disabled={goal.completedChapters >= goal.targetChapters}
                          className="px-2.5 py-0.5 bg-red-950 hover:bg-red-900 border border-red-800 text-white rounded font-medium cursor-pointer"
                        >
                          +1 Chapter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. SECTION 4: LIVE COMMUNITY FEED */}
      {activeSection === 'stream' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 rounded-xl bg-[#0e0e16] border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-200 font-medium">Real-Time Member Reflection Stream</span>
            </div>
            <span className="text-zinc-400 text-[11px] font-mono">Live Sync Engine Active</span>
          </div>

          <div className="space-y-3">
            {threads.slice(0, 10).map((t) => (
              <div
                key={`stream_${t.id}`}
                className="p-4 rounded-xl bg-[#0c0c14] border border-white/5 hover:border-white/15 transition-all flex items-start gap-3 text-xs"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-200 border border-white/10 shrink-0 mt-0.5">
                  {t.authorName.charAt(0)}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-200">{t.authorName}</span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-amber-400 font-medium">Re: {t.bookTitle}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <p className="text-zinc-300 line-clamp-2 font-serif">{t.content}</p>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-1">
                    <span className="text-amber-300">#{t.archetypeTag}</span>
                    <span>·</span>
                    <span>{Object.values(t.reactions || {}).reduce((a, b) => a + b, 0)} Reactions</span>
                    <span>·</span>
                    <span>{t.comments?.length || 0} Comments</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: Create New Thread / Reflection */}
      {showThreadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#0e0e18] border border-white/15 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-400" />
                <h3 className="text-base font-semibold text-zinc-100 font-display">
                  Post Reflection / Chapter Note
                </h3>
              </div>
              <button
                onClick={() => setShowThreadModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs px-2 py-1 rounded bg-white/5 cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Book Context</label>
                  <select
                    value={newBookId}
                    onChange={(e) => setNewBookId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#161624] border border-white/10 rounded-lg text-zinc-200"
                  >
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.author})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Reflection Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as BookClubCategory)}
                    className="w-full px-3 py-2 bg-[#161624] border border-white/10 rounded-lg text-zinc-200"
                  >
                    <option value="perspective">Discussion Perspective</option>
                    <option value="chapter_note">Chapter Note & Breakdown</option>
                    <option value="post_book">Post-Book Summary</option>
                    <option value="general">General Philosophical Salon</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Archetypal Focus</label>
                  <select
                    value={newArchetype}
                    onChange={(e) => setNewArchetype(e.target.value)}
                    className="w-full px-3 py-2 bg-[#161624] border border-white/10 rounded-lg text-zinc-200"
                  >
                    <option value="The Strategist">The Strategist (Greene)</option>
                    <option value="The Shadow">The Shadow (Jung)</option>
                    <option value="The Manipulator">The Manipulator (Cialdini)</option>
                    <option value="The Sovereign">The Sovereign (Machiavelli)</option>
                    <option value="The Stoic">The Stoic (Aurelius)</option>
                    <option value="The Alchemist">The Alchemist (Transformation)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Chapter Milestone (Optional)</label>
                  <input
                    type="number"
                    min="1"
                    value={newChapterNumber}
                    onChange={(e) => setNewChapterNumber(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 16"
                    className="w-full px-3 py-2 bg-[#161624] border border-white/10 rounded-lg text-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Discussion Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Chapter 16 Analysis: The Strategic Power of Calculated Silence"
                  className="w-full px-3 py-2 bg-[#161624] border border-white/10 rounded-lg text-zinc-100 focus:outline-none focus:border-red-600/60"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Key Takeaway / Quote (Highlighted)</label>
                <input
                  type="text"
                  value={newKeyTakeaway}
                  onChange={(e) => setNewKeyTakeaway(e.target.value)}
                  placeholder="e.g. Scarcity multiplies value. Silence creates psychological gravity."
                  className="w-full px-3 py-2 bg-[#161624] border border-white/10 rounded-lg text-amber-200 focus:outline-none focus:border-amber-600/60"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Reflection Body</label>
                <textarea
                  rows={4}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Synthesize your psychological insights, real-world applications, or debate questions..."
                  className="w-full px-3 py-2 bg-[#161624] border border-white/10 rounded-lg text-zinc-100 focus:outline-none focus:border-red-600/60 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="e.g. Shadow Integration, Scarcity, Law 16"
                  className="w-full px-3 py-2 bg-[#161624] border border-white/10 rounded-lg text-zinc-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowThreadModal(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200 bg-white/5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-950 hover:bg-red-900 border border-red-800 text-white font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Publish to Book Club
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Set Member Reading Goal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0e0e18] border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-semibold text-zinc-100 font-display">
                  Set Reading Accountability Goal
                </h3>
              </div>
              <button
                onClick={() => setShowGoalModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs px-2 py-1 rounded bg-white/5 cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Target Volume</label>
                <select
                  value={goalBookTitle}
                  onChange={(e) => setGoalBookTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161624] border border-white/10 rounded-lg text-zinc-200"
                >
                  {books.map((b) => (
                    <option key={b.id} value={b.title}>
                      {b.title} ({b.author})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Target Chapters</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={goalTargetChapters}
                    onChange={(e) => setGoalTargetChapters(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#161624] border border-white/10 rounded-lg text-zinc-200"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Target Finish Date</label>
                  <input
                    type="date"
                    required
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-[#161624] border border-white/10 rounded-lg text-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Pledge Note / Focus Area</label>
                <textarea
                  rows={2}
                  value={goalReflectionNote}
                  onChange={(e) => setGoalReflectionNote(e.target.value)}
                  placeholder="e.g. Writing weekly syntheses on Machiavellian defense strategies."
                  className="w-full px-3 py-2 bg-[#161624] border border-white/10 rounded-lg text-zinc-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-3.5 py-1.5 text-zinc-400 hover:text-zinc-200 bg-white/5 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 font-semibold rounded-lg cursor-pointer shadow"
                >
                  Commit Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Supabase SQL Code Viewer & Instant Copy (Strictly Admin Only) */}
      {isAdmin && showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-[#0e0e18] border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-semibold text-zinc-100 font-display">
                    Supabase SQL Migration Code
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Execute this SQL in Supabase Dashboard &gt; SQL Editor to provision tables for <code className="text-amber-300">book_club_discussions</code>, <code className="text-amber-300">club_member_reactions</code>, <code className="text-amber-300">member_goals</code>, RLS, and Developer Admin security roles.
                </p>
              </div>

              <button
                onClick={() => setShowSqlModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs px-2 py-1 rounded bg-white/5 cursor-pointer shrink-0"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#07070b] border border-white/10 rounded-xl p-4 font-mono text-xs text-emerald-400/90 max-h-[500px] leading-relaxed">
              <pre>{SUPABASE_ADMIN_FRAMEWORK_SQL}</pre>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10 shrink-0">
              <span className="text-xs text-zinc-400">Target Admin: adhudson504@gmail.com</span>
              <button
                onClick={handleCopySql}
                className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                {copiedSql ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                    <span>SQL Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Full SQL Script</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
