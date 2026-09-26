import React, { useState, useEffect } from 'react';
import { DarkBook, OpenLibraryWorkDetails, PipelineStageInfo, MemberGoal, ReadingSession } from '../types';
import { fetchBookDetailsOnDemand, getCoverUrl, getCoverUrlByIsbn } from '../services/openLibrary';
import { useAuth } from '../context/AuthContext';
import {
  X,
  BookOpen,
  Star,
  Quote,
  Users,
  ExternalLink,
  Database,
  Activity,
  Sparkles,
  Hash,
  Calendar,
  Layers,
  ShieldCheck,
  RefreshCw,
  Target,
  CheckCircle2,
  Trophy,
  Plus,
  Minus,
  Sliders,
  Clock,
  BookMarked,
  Check,
  Edit2,
} from 'lucide-react';

interface BookDetailModalProps {
  book: DarkBook | null;
  onClose: () => void;
  onStartDiscussion: (book: DarkBook) => void;
  onHostSession?: (book: DarkBook) => void;
  memberGoals?: MemberGoal[];
  onUpdateMemberGoalProgress?: (goalId: string, delta: number) => void;
  onSetMemberGoalChapter?: (goalId: string, chapter: number) => void;
  onUpdateMemberGoal?: (goalId: string, updates: Partial<MemberGoal>) => void;
  onAddMemberGoal?: (goal: MemberGoal) => void;
  sessions?: ReadingSession[];
}

function matchesBookTitle(titleA: string, titleB: string): boolean {
  if (!titleA || !titleB) return false;
  const cleanA = titleA.toLowerCase().replace(/^(the|a|an)\s+/i, '').replace(/[^a-z0-9]/g, '');
  const cleanB = titleB.toLowerCase().replace(/^(the|a|an)\s+/i, '').replace(/[^a-z0-9]/g, '');
  return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  onClose,
  onStartDiscussion,
  onHostSession,
  memberGoals,
  onUpdateMemberGoalProgress,
  onSetMemberGoalChapter,
  onUpdateMemberGoal,
  onAddMemberGoal,
  sessions,
}) => {
  const { user } = useAuth();
  const [workDetails, setWorkDetails] = useState<OpenLibraryWorkDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [pipelineState, setPipelineState] = useState<PipelineStageInfo | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Goal Creation & Editing States
  const [showGoalCreator, setShowGoalCreator] = useState(false);
  const [newTargetChapters, setNewTargetChapters] = useState(12);
  const [newDeadline, setNewDeadline] = useState('2026-11-15');
  const [newReflection, setNewReflection] = useState('');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editTargetInput, setEditTargetInput] = useState(12);

  useEffect(() => {
    if (!book) {
      setWorkDetails(null);
      setPipelineState(null);
      return;
    }

    // Trigger On-Demand Book Details Fetch Workflow
    let isMounted = true;
    const fetchDetails = async () => {
      setLoading(true);
      const identifier = book.openLibraryKey || (book.isbn && book.isbn[0]) || '';
      
      if (!identifier) {
        setLoading(false);
        return;
      }

      const res = await fetchBookDetailsOnDemand(identifier, (stage) => {
        if (isMounted) setPipelineState(stage);
      });

      if (isMounted) {
        if (res.details) {
          setWorkDetails(res.details);
          setIsFromCache(res.isFromCache);
        }
        setLoading(false);
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [book]);

  if (!book) return null;

  // Determine best available cover image using Covers API with fallbacks
  const isbnCover = book.isbn?.[0] ? getCoverUrlByIsbn(book.isbn[0], 'L') : '';
  const displayCover = workDetails?.coversUrl || book.coverUrl || isbnCover || '/src/assets/images/reading_circle_dramatic_1790432613396.jpg';

  const externalOpenLibraryUrl = book.openLibraryKey.startsWith('http')
    ? book.openLibraryKey
    : book.openLibraryKey.startsWith('/')
    ? `https://openlibrary.org${book.openLibraryKey}`
    : book.openLibraryKey.startsWith('OL') && book.openLibraryKey.endsWith('M')
    ? `https://openlibrary.org/books/${book.openLibraryKey}`
    : book.openLibraryKey.startsWith('OL') && book.openLibraryKey.endsWith('W')
    ? `https://openlibrary.org/works/${book.openLibraryKey}`
    : `https://openlibrary.org/search?q=${encodeURIComponent(book.title)}`;

  // Match book with member goals - strictly isolated to current user's profile scope
  const activeUserEmail = user?.email?.toLowerCase();
  
  const matchedGoal = memberGoals?.find((g) => {
    if (!activeUserEmail) return false;
    return g.userEmail.toLowerCase() === activeUserEmail && matchesBookTitle(g.bookTitle, book.title);
  });

  const targetChapters = matchedGoal ? Math.max(1, matchedGoal.targetChapters || 1) : 0;
  const completedChapters = matchedGoal ? Math.max(0, Math.min(targetChapters, matchedGoal.completedChapters || 0)) : 0;
  const percentage = targetChapters > 0 ? Math.min(100, Math.round((completedChapters / targetChapters) * 100)) : 0;
  const isComplete = matchedGoal ? (completedChapters >= targetChapters || matchedGoal.status === 'completed') : false;
  const remainingChapters = Math.max(0, targetChapters - completedChapters);

  const handleStepChapter = (delta: number) => {
    if (!matchedGoal) return;
    if (onUpdateMemberGoalProgress) {
      onUpdateMemberGoalProgress(matchedGoal.id, delta);
    }
  };

  const handleSaveTargetChapters = () => {
    if (!matchedGoal) return;
    if (onUpdateMemberGoal) {
      onUpdateMemberGoal(matchedGoal.id, { targetChapters: editTargetInput });
      setIsEditingGoal(false);
    }
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!book) return;
    const newGoal: MemberGoal = {
      id: `goal_${Date.now()}`,
      userEmail: user?.email || 'guest@sanctuary.io',
      userName: user?.name || 'Sanctuary Scholar',
      userAvatar: user?.avatarUrl,
      bookTitle: book.title,
      targetChapters: newTargetChapters,
      completedChapters: 0,
      deadline: newDeadline,
      reflectionNote: newReflection.trim() || `Committed reading goal for ${book.title}`,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
    };
    if (onAddMemberGoal) {
      onAddMemberGoal(newGoal);
      setShowGoalCreator(false);
      setNewReflection('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#0d0d14] border border-white/10 rounded-2xl p-5 md:p-7 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Subtle Ember Glow Header Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-950 via-amber-600/60 to-zinc-900" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 font-semibold border border-amber-800/40 text-[11px]">
              {book.darkArchetype}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="font-mono text-zinc-400 text-[11px]">Ref: {book.openLibraryKey}</span>
            {isFromCache && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-800/40 text-[10px] flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" />
                  <span>Local Cache</span>
                </span>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors rounded-lg hover:bg-white/5 shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-1 mt-4 space-y-5">
          {/* On-Demand Pipeline Indicator */}
          {pipelineState && (
            <div className="p-3 rounded-xl bg-[#11111a] border border-white/10 text-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                  <Activity className="w-3.5 h-3.5 text-red-400" />
                  <span>Works/ISBN On-Demand Fetch Workflow:</span>
                </div>
                <div className="font-mono text-[11px] text-zinc-400">
                  {pipelineState.durationMs}ms {isFromCache ? '(Cache Hit)' : '(REST API)'}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                <div className="p-1.5 rounded bg-emerald-950/20 border border-emerald-800/30 text-emerald-300">
                  <div className="font-bold text-zinc-400 uppercase text-[9px]">1. Input</div>
                  <div className="truncate font-mono">{pipelineState.query}</div>
                </div>
                <div className={`p-1.5 rounded border ${isFromCache ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' : pipelineState.stage === 'network' ? 'bg-amber-950/30 border-amber-700/50 text-amber-300 animate-pulse' : 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300'}`}>
                  <div className="font-bold text-zinc-400 uppercase text-[9px]">2. Network</div>
                  <div className="truncate font-mono">{isFromCache ? 'Cache Bypass' : 'openlibrary.org'}</div>
                </div>
                <div className="p-1.5 rounded bg-emerald-950/20 border border-emerald-800/30 text-emerald-300">
                  <div className="font-bold text-zinc-400 uppercase text-[9px]">3. Process</div>
                  <div className="truncate font-mono">Normalize AST</div>
                </div>
                <div className="p-1.5 rounded bg-emerald-950/20 border border-emerald-800/30 text-emerald-300">
                  <div className="font-bold text-zinc-400 uppercase text-[9px]">4. Output</div>
                  <div className="truncate font-mono">{loading ? 'Processing...' : 'Ready'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Left: Book Cover & Quick Meta */}
            <div>
              <div className="aspect-[3/4] w-full rounded-xl bg-black border border-white/10 overflow-hidden shadow-2xl relative mb-3">
                <img
                  src={displayCover}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-2 text-xs text-zinc-400">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#14141f] border border-white/5">
                  <span>Sanctuary Rating</span>
                  <div className="flex items-center gap-1 text-amber-300 font-semibold font-mono">
                    <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                    <span>{book.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-[#14141f] border border-white/5">
                  <span>First Published</span>
                  <span className="font-mono text-zinc-200">
                    {workDetails?.first_publish_date || book.firstPublishYear || 'Classical'}
                  </span>
                </div>

                {workDetails?.latest_revision && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#14141f] border border-white/5">
                    <span>Open Library Rev</span>
                    <span className="font-mono text-zinc-300">v{workDetails.latest_revision}</span>
                  </div>
                )}
              </div>

              {/* Direct Open Library External Gateway */}
              <a
                href={externalOpenLibraryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full py-2 px-3 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5"
              >
                <span>View on Open Library</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            </div>

            {/* Right: Detailed Synopsis, Work Notes, Subjects */}
            <div className="sm:col-span-2 space-y-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-zinc-100 font-display leading-tight">
                  {book.title}
                </h2>
                <p className="text-sm text-zinc-400 mt-1 font-medium">By {book.author}</p>
              </div>

              {/* VISUAL READING PROGRESS BAR & CHAPTER GOALS */}
              {matchedGoal ? (
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#12121e] via-[#0f0f1a] to-[#090910] border border-white/10 shadow-xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                  {/* Header: Status, Title, Large Percentage */}
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${
                        isComplete
                          ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/70 shadow-sm'
                          : 'bg-red-950/60 text-red-400 border border-red-900/50'
                      }`}>
                        {isComplete ? <Trophy className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-100 font-display flex items-center gap-2">
                          <span>Reading Progress & Goals</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold ${
                            isComplete
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                          }`}>
                            {isComplete ? 'Goal Achieved' : 'In Progress'}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 font-medium">
                          Chapter <span className="text-zinc-200 font-semibold">{completedChapters}</span> of <span className="text-zinc-200 font-semibold">{targetChapters}</span> total
                        </div>
                      </div>
                    </div>

                    {/* Prominent Percentage Readout */}
                    <div className="text-right shrink-0">
                      <div className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400">
                        {percentage}%
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Completed</div>
                    </div>
                  </div>

                  {/* Visual Progress Bar Track */}
                  <div className="space-y-1.5 relative z-10">
                    <div className="relative h-3.5 w-full bg-black/80 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
                      {/* Gradient Fill with smooth transition */}
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-red-700 via-amber-500 to-emerald-400 relative shadow-sm"
                        style={{ width: `${Math.max(percentage, 2)}%` }}
                      >
                        {/* Shimmer overlay highlight */}
                        <div className="absolute inset-0 bg-white/20 rounded-full" />
                      </div>

                      {/* Milestone Tick Lines (25%, 50%, 75%) */}
                      <div className="absolute top-0 bottom-0 left-1/4 w-[1px] bg-white/15 pointer-events-none" />
                      <div className="absolute top-0 bottom-0 left-2/4 w-[1px] bg-white/20 pointer-events-none" />
                      <div className="absolute top-0 bottom-0 left-3/4 w-[1px] bg-white/15 pointer-events-none" />
                    </div>

                    {/* Milestone Percentage Labels */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono px-0.5">
                      <span>Ch 0</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span className={isComplete ? 'text-emerald-400 font-semibold' : ''}>Target (Ch {targetChapters})</span>
                    </div>
                  </div>

                  {/* Information & Interactive Controls */}
                  <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative z-10">
                    <div className="text-xs text-zinc-400 flex items-center gap-2 flex-wrap">
                      {isComplete ? (
                        <span className="text-emerald-300 flex items-center gap-1 font-semibold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>All {targetChapters} chapters completed! Milestone unlocked.</span>
                        </span>
                      ) : (
                        <span>
                          <strong className="text-zinc-200">{remainingChapters}</strong> {remainingChapters === 1 ? 'chapter' : 'chapters'} remaining
                        </span>
                      )}
                      {matchedGoal.deadline && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            <span>Target: {matchedGoal.deadline}</span>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Chapter Stepper Buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      <span className="text-[11px] text-zinc-500 mr-1 hidden sm:inline">Log Progress:</span>
                      <button
                        onClick={() => handleStepChapter(-1)}
                        disabled={completedChapters <= 0}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-zinc-300 hover:text-white text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer"
                        title="Step back 1 chapter"
                      >
                        <Minus className="w-3 h-3" />
                        <span>-1 Ch</span>
                      </button>

                      <button
                        onClick={() => handleStepChapter(1)}
                        disabled={completedChapters >= targetChapters}
                        className="px-3 py-1 rounded-lg bg-red-950 hover:bg-red-900 disabled:opacity-30 disabled:cursor-not-allowed border border-red-800/80 text-white text-xs font-semibold font-mono transition-all flex items-center gap-1 shadow cursor-pointer"
                        title="Advance 1 chapter"
                      >
                        <Plus className="w-3 h-3 text-red-300" />
                        <span>+1 Chapter</span>
                      </button>

                      {/* Edit target chapters button */}
                      <button
                        onClick={() => {
                          setIsEditingGoal(!isEditingGoal);
                          setEditTargetInput(targetChapters);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-zinc-200 text-xs transition-colors cursor-pointer"
                        title="Adjust goal target chapters"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Target Total Editor when toggled */}
                  {isEditingGoal && (
                    <div className="p-3 rounded-lg bg-[#0a0a10] border border-white/10 space-y-2 text-xs animate-fadeIn relative z-10">
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="font-semibold text-amber-300">Adjust Total Chapters Target:</span>
                        <button
                          onClick={() => setIsEditingGoal(false)}
                          className="text-zinc-500 hover:text-zinc-300 text-[10px]"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="250"
                          value={editTargetInput}
                          onChange={(e) => setEditTargetInput(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-24 px-2.5 py-1 bg-[#141420] border border-white/10 rounded text-zinc-200 text-xs font-mono"
                        />
                        <button
                          onClick={handleSaveTargetChapters}
                          className="px-3 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 rounded font-medium text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Save Target</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reflection Note Callout */}
                  {matchedGoal.reflectionNote && (
                    <div className="text-[11px] text-zinc-400 italic bg-black/40 border border-white/5 p-2.5 rounded-lg relative z-10">
                      &quot;{matchedGoal.reflectionNote}&quot;
                    </div>
                  )}
                </div>
              ) : (
                /* No goal set yet: Offer sleek inline goal commitment */
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#12121e] to-[#0c0c14] border border-white/10 shadow-lg space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-amber-950/40 text-amber-400 border border-amber-800/40">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-100 font-display">
                          Reading Progress & Chapter Goals
                        </h4>
                        <p className="text-[11px] text-zinc-400">
                          Set a chapter milestone goal for this volume to enable your visual progress bar.
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-mono text-zinc-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      0%
                    </span>
                  </div>

                  {/* Empty Preview Progress Track */}
                  <div className="h-3 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-zinc-800 w-0 transition-all" />
                  </div>

                  {!showGoalCreator ? (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-zinc-400">Pace yourself across chapters & track reading completion</span>
                      <button
                        onClick={() => setShowGoalCreator(true)}
                        className="px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-800/70 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-red-300" />
                        <span>Set Reading Goal</span>
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateGoal} className="p-3.5 rounded-lg bg-[#0a0a10] border border-white/10 space-y-3 text-xs animate-fadeIn">
                      <div className="flex items-center justify-between text-zinc-300 pb-1.5 border-b border-white/5">
                        <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                          <BookMarked className="w-3.5 h-3.5" />
                          <span>Define Chapter Target & Pacing</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowGoalCreator(false)}
                          className="text-zinc-500 hover:text-zinc-300 text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-zinc-400">Total Chapters:</span>
                          {[8, 12, 24, 48].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setNewTargetChapters(num)}
                              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                                newTargetChapters === num
                                  ? 'bg-amber-950 text-amber-300 border border-amber-700/80 font-bold'
                                  : 'bg-white/5 text-zinc-400 hover:text-zinc-200 border border-white/5'
                              }`}
                            >
                              {num} Ch
                            </button>
                          ))}
                          <input
                            type="number"
                            min="1"
                            max="250"
                            value={newTargetChapters}
                            onChange={(e) => setNewTargetChapters(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 px-2 py-1 bg-[#141420] border border-white/10 rounded text-zinc-200 text-xs font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-zinc-400 mb-0.5">Target Completion Date</label>
                            <input
                              type="date"
                              value={newDeadline}
                              onChange={(e) => setNewDeadline(e.target.value)}
                              className="w-full px-2 py-1 bg-[#141420] border border-white/10 rounded text-zinc-200 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-zinc-400 mb-0.5">Personal Reflection Note (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. Dissecting psychological mechanisms"
                              value={newReflection}
                              onChange={(e) => setNewReflection(e.target.value)}
                              className="w-full px-2 py-1 bg-[#141420] border border-white/10 rounded text-zinc-200 text-xs"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 rounded font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Commit Goal & Unlock Visual Progress Bar</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Open Library Synopsis / Psychological Premise */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-red-400" />
                  <span>Psychological Premise & Synopsis</span>
                </h4>
                <div className="text-xs md:text-sm text-zinc-300 leading-relaxed bg-[#12121b] p-3.5 rounded-xl border border-white/5 max-h-48 overflow-y-auto">
                  {loading && !workDetails ? (
                    <div className="flex items-center gap-2 text-zinc-400 py-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Fetching complete Open Library Works description...</span>
                    </div>
                  ) : (
                    workDetails?.description || book.synopsis
                  )}
                </div>
              </div>

              {/* Excerpts if available from Open Library */}
              {workDetails?.excerpts && workDetails.excerpts.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5" />
                    <span>Archival Excerpt</span>
                  </h4>
                  <div className="text-xs text-zinc-300 italic bg-amber-950/20 border border-amber-900/40 p-3 rounded-xl">
                    "{workDetails.excerpts[0].excerpt}"
                    {workDetails.excerpts[0].comment && (
                      <span className="block mt-1 text-[11px] text-zinc-400 not-italic">
                        — {workDetails.excerpts[0].comment}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Curator Dissection */}
              {book.curatorNotes && (
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-red-400" />
                    <span>Curator Dissection</span>
                  </h4>
                  <div className="text-xs text-zinc-300 bg-red-950/20 border border-red-900/40 p-3 rounded-xl">
                    {book.curatorNotes}
                  </div>
                </div>
              )}

              {/* Subjects & Archetype Classification (Zero-Pill Discipline) */}
              <div>
                <div className="text-xs text-zinc-400 font-medium mb-1">Subjects & Archetypes:</div>
                <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400">
                  <span className="text-amber-300 font-medium">{book.darkArchetype}</span>
                  <span aria-hidden="true">·</span>
                  {(workDetails?.subjects && workDetails.subjects.length > 0
                    ? workDetails.subjects
                    : book.subjects
                  ).map((s, idx, arr) => (
                    <React.Fragment key={`${s}-${idx}`}>
                      <span className="text-zinc-300">{s}</span>
                      {idx < Math.min(arr.length, 8) - 1 && <span aria-hidden="true">·</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* ISBN Identifiers if present */}
              {(book.isbn && book.isbn.length > 0) && (
                <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-400">ISBN:</span>
                  {book.isbn.map((code) => (
                    <span key={code} className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-300">
                      {code}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="pt-4 mt-2 border-t border-white/5 flex items-center justify-end gap-2.5 flex-wrap shrink-0">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Close
          </button>

          {onHostSession && (
            <button
              onClick={() => {
                onHostSession(book);
                onClose();
              }}
              className="py-2.5 px-4 bg-[#141422] hover:bg-[#1e1e32] border border-amber-500/40 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Host Reading Session</span>
            </button>
          )}

          <button
            onClick={() => {
              onStartDiscussion(book);
              onClose();
            }}
            className="py-2.5 px-5 bg-red-950 hover:bg-red-900 border border-red-800/60 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Open Salon Discussion</span>
          </button>
        </div>
      </div>
    </div>
  );
};
