import React, { useState } from 'react';
import { BookDiscussion, DarkBook, DiscussionComment, ReadingSession, SessionMilestone } from '../types';
import { useAuth } from '../context/AuthContext';
import { ReadingSessionCard } from './ReadingSessionCard';
import { ReadingSessionModal } from './ReadingSessionModal';
import {
  Users,
  MessageSquare,
  ThumbsUp,
  Heart,
  Send,
  Sparkles,
  Shield,
  Bookmark,
  Plus,
  Layers,
  BookOpen,
  Filter,
  Search,
  CheckCircle2,
  Trash2,
  Pin,
  Flame,
  ArrowRight,
} from 'lucide-react';

interface ReadingRoomsProps {
  discussions: BookDiscussion[];
  sessions: ReadingSession[];
  books: DarkBook[];
  onAddDiscussion: (discussion: BookDiscussion) => void;
  onAddComment: (discussionId: string, comment: DiscussionComment) => void;
  onUpvoteDiscussion: (discussionId: string) => void;
  onLikeComment?: (discussionId: string, commentId: string) => void;
  onDeleteDiscussion?: (discussionId: string) => void;
  onAddSession: (session: ReadingSession) => void;
  onToggleJoinSession: (sessionId: string) => void;
  onUpdateSessionChapter?: (sessionId: string, newChapter: number) => void;
  onAddSessionMilestone?: (sessionId: string, milestone: SessionMilestone) => void;
  initialSessionBook?: DarkBook | null;
}

export const ReadingRooms: React.FC<ReadingRoomsProps> = ({
  discussions,
  sessions,
  books,
  onAddDiscussion,
  onAddComment,
  onUpvoteDiscussion,
  onLikeComment,
  onDeleteDiscussion,
  onAddSession,
  onToggleJoinSession,
  onUpdateSessionChapter,
  onAddSessionMilestone,
  initialSessionBook,
}) => {
  const { user, isAdmin } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'sessions' | 'discussions'>('sessions');

  // Session Modal State
  const [sessionModalOpen, setSessionModalOpen] = useState(Boolean(initialSessionBook));
  const [selectedBookForSession, setSelectedBookForSession] = useState<DarkBook | null>(
    initialSessionBook || null
  );

  React.useEffect(() => {
    if (initialSessionBook) {
      setSelectedBookForSession(initialSessionBook);
      setSessionModalOpen(true);
      setActiveSubTab('sessions');
    }
  }, [initialSessionBook]);

  // Discussion Filter & Search State
  const [discussionSearch, setDiscussionSearch] = useState('');
  const [selectedArchetypeTag, setSelectedArchetypeTag] = useState<string>('all');

  // Discussion Form State
  const [selectedBookId, setSelectedBookId] = useState<string>(books[0]?.id || '');
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newArchetype, setNewArchetype] = useState('The Shadow');

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const archetypes = [
    'all',
    'The Shadow',
    'The Strategist',
    'The Manipulator',
    'The Sovereign',
    'The Stoic',
    'The Alchemist',
  ];

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const targetBook = books.find((b) => b.id === selectedBookId) || books[0];

    const newDiscussion: BookDiscussion = {
      id: `disc_${Date.now()}`,
      bookId: targetBook ? targetBook.id : 'general',
      bookTitle: targetBook ? targetBook.title : 'General Salon',
      authorName: user?.name || 'Anonymous Reader',
      authorEmail: user?.email || 'guest@sanctuary.io',
      authorRole: user?.role || 'member',
      authorAvatar: user?.avatarUrl,
      title: newTitle.trim(),
      content: newContent.trim(),
      archetypeTag: newArchetype,
      createdAt: new Date().toISOString(),
      upvotes: 1,
      upvotedByEmails: user?.email ? [user.email] : [],
      comments: [],
    };

    onAddDiscussion(newDiscussion);
    setNewTitle('');
    setNewContent('');
    setShowNewTopicForm(false);
  };

  const handlePostComment = (discussionId: string) => {
    const text = (commentInputs[discussionId] || '').trim();
    if (!text) return;

    const comment: DiscussionComment = {
      id: `comm_${Date.now()}`,
      discussionId,
      authorName: user?.name || 'Sanctuary Scholar',
      authorEmail: user?.email || 'guest@sanctuary.io',
      authorRole: user?.role || 'member',
      authorAvatar: user?.avatarUrl,
      content: text,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByEmails: [],
    };

    onAddComment(discussionId, comment);
    setCommentInputs({ ...commentInputs, [discussionId]: '' });
  };

  // Filtered discussions
  const filteredDiscussions = discussions.filter((d) => {
    const matchesArchetype = selectedArchetypeTag === 'all' || d.archetypeTag === selectedArchetypeTag;
    const matchesSearch =
      !discussionSearch ||
      d.title.toLowerCase().includes(discussionSearch.toLowerCase()) ||
      d.content.toLowerCase().includes(discussionSearch.toLowerCase()) ||
      d.bookTitle.toLowerCase().includes(discussionSearch.toLowerCase()) ||
      d.authorName.toLowerCase().includes(discussionSearch.toLowerCase());
    return matchesArchetype && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-[#0c0c14] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
            <Users className="w-3.5 h-3.5 text-amber-500" />
            <span>Interactive Book Club Architecture</span>
            <span>·</span>
            <span>Cohort Sync & Salons</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-zinc-100 font-display">
            Reading Sessions & Circles
          </h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-xl">
            Track chapter milestones, join active reading cohorts with invite codes, or debate psychological theses in community discourse.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setSelectedBookForSession(null);
              setSessionModalOpen(true);
            }}
            className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-800/60 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Host Reading Session</span>
          </button>

          <button
            onClick={() => setShowNewTopicForm(!showNewTopicForm)}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{showNewTopicForm ? 'Cancel Thesis' : 'Propose Thesis'}</span>
          </button>
        </div>
      </div>

      {/* Subtab Segmented Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-2">
        <div className="flex items-center p-1 bg-[#101018] rounded-xl border border-white/5">
          <button
            onClick={() => setActiveSubTab('sessions')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'sessions'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-red-400" />
            <span>Active Reading Sessions ({sessions.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('discussions')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'discussions'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Salon Discourse & Theses ({discussions.length})</span>
          </button>
        </div>

        {activeSubTab === 'discussions' && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={discussionSearch}
              onChange={(e) => setDiscussionSearch(e.target.value)}
              placeholder="Search theses or topics..."
              className="pl-8 pr-3 py-1 bg-[#12121b] border border-white/10 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-600/50"
            />
          </div>
        )}
      </div>

      {/* VIEW 1: Active Reading Sessions Cards Grid */}
      {activeSubTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{sessions.length} Cohort Sessions Synchronized</span>
            <span>Join any session to log chapter milestones and share notes</span>
          </div>

          {sessions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0c0c12] border border-white/5 space-y-3">
              <p className="text-zinc-400 text-sm">No active reading sessions yet.</p>
              <button
                onClick={() => setSessionModalOpen(true)}
                className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-800/60 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Host the First Session
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sessions.map((session) => (
                <ReadingSessionCard
                  key={session.id}
                  session={session}
                  onToggleJoinSession={onToggleJoinSession}
                  onUpdateChapter={onUpdateSessionChapter}
                  onAddMilestone={onAddSessionMilestone}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Discourse & Theses */}
      {activeSubTab === 'discussions' && (
        <div className="space-y-4">
          {/* Archetype Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {archetypes.map((archetype) => (
              <button
                key={archetype}
                onClick={() => setSelectedArchetypeTag(archetype)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all border cursor-pointer ${
                  selectedArchetypeTag === archetype
                    ? 'bg-red-950/60 border-red-800/80 text-white font-medium'
                    : 'bg-[#0f0f16] border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/10'
                }`}
              >
                {archetype === 'all' ? 'All Discourse Topics' : archetype}
              </button>
            ))}
          </div>

          {/* New Topic Creation Form */}
          {showNewTopicForm && (
            <form
              onSubmit={handleCreateTopic}
              className="p-5 rounded-2xl bg-[#0f0f18] border border-red-900/40 space-y-4 animate-fadeIn"
            >
              <h3 className="text-sm font-semibold text-zinc-100 font-display flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-400" />
                <span>Propose New Philosophical Thesis</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Select Book Context</label>
                  <select
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#161622] border border-white/10 rounded-lg text-xs text-zinc-200"
                  >
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.author})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Archetypal Axis</label>
                  <select
                    value={newArchetype}
                    onChange={(e) => setNewArchetype(e.target.value)}
                    className="w-full px-3 py-2 bg-[#161622] border border-white/10 rounded-lg text-xs text-zinc-200"
                  >
                    <option value="The Shadow">The Shadow (Jungian)</option>
                    <option value="The Strategist">The Strategist (Greene)</option>
                    <option value="The Manipulator">The Manipulator (Cialdini)</option>
                    <option value="The Sovereign">The Sovereign (Machiavelli)</option>
                    <option value="The Stoic">The Stoic (Aurelius)</option>
                    <option value="The Alchemist">The Alchemist (Psychological Transformation)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Thesis Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. The Cognitive Architecture of Covert Compliance"
                  className="w-full px-3 py-2 bg-[#161622] border border-white/10 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-red-600/60"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Discourse Body</label>
                <textarea
                  rows={3}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Elaborate your psychological analysis, historical references, and questions for the circle..."
                  className="w-full px-3 py-2 bg-[#161622] border border-white/10 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-red-600/60 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTopicForm(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-white/5 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-red-950 hover:bg-red-900 border border-red-800 rounded-lg cursor-pointer"
                >
                  Publish to Sanctuary
                </button>
              </div>
            </form>
          )}

          {/* Discussion List */}
          {filteredDiscussions.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-[#0c0c12] border border-white/5 text-xs text-zinc-400">
              No discussions match the active search or archetype filter.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDiscussions.map((disc) => {
                const isAuthorOrAdmin =
                  isAdmin || (user?.email && disc.authorEmail?.toLowerCase() === user.email.toLowerCase());
                const isUserUpvoted = Boolean(
                  user?.email && disc.upvotedByEmails?.includes(user.email)
                );

                return (
                  <div
                    key={disc.id}
                    className="p-5 rounded-2xl bg-[#0e0e15] border border-white/10 space-y-4 hover:border-white/15 transition-all"
                  >
                    {/* Topic Meta */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1 flex-wrap">
                          {disc.pinned && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 text-[10px] font-medium flex items-center gap-1">
                              <Pin className="w-2.5 h-2.5" />
                              <span>Pinned Thesis</span>
                            </span>
                          )}
                          <span className="text-amber-300 font-semibold">{disc.archetypeTag}</span>
                          <span>·</span>
                          <span className="text-zinc-300 font-medium">Re: {disc.bookTitle}</span>
                          <span>·</span>
                          <span>{new Date(disc.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-base font-semibold text-zinc-100 font-display">
                          {disc.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Upvote Button */}
                        <button
                          onClick={() => onUpvoteDiscussion(disc.id)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-colors shrink-0 cursor-pointer ${
                            isUserUpvoted
                              ? 'bg-amber-950/60 border border-amber-700/60 text-amber-300 font-bold'
                              : 'bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white'
                          }`}
                          title="Upvote thesis"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span className="tabular-nums">{disc.upvotes}</span>
                        </button>

                        {isAuthorOrAdmin && onDeleteDiscussion && (
                          <button
                            onClick={() => onDeleteDiscussion(disc.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete topic"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
                      {disc.content}
                    </p>

                    {/* Author Attribution with Photo Avatar */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-xs text-zinc-400">
                      {disc.authorAvatar ? (
                        <img
                          src={disc.authorAvatar}
                          alt={disc.authorName}
                          className="w-5 h-5 rounded-full object-cover border border-amber-500/40"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-zinc-800 text-[10px] flex items-center justify-center font-bold text-zinc-300">
                          {disc.authorName.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-zinc-300">{disc.authorName}</span>
                      {disc.authorRole === 'admin' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800">
                          Dev Admin
                        </span>
                      )}
                      {disc.authorRole === 'scholar' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          Scholar
                        </span>
                      )}
                    </div>

                    {/* Comments Thread */}
                    {disc.comments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5 space-y-2.5 pl-3 md:pl-6">
                        {disc.comments.map((comm) => {
                          const isCommentLiked = Boolean(
                            user?.email && comm.likedByEmails?.includes(user.email)
                          );

                          return (
                            <div
                              key={comm.id}
                              className="text-xs bg-[#13131c] p-3 rounded-xl border border-white/5 space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                                <div className="flex items-center gap-2">
                                  {comm.authorAvatar ? (
                                    <img
                                      src={comm.authorAvatar}
                                      alt={comm.authorName}
                                      className="w-4 h-4 rounded-full object-cover border border-white/10"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full bg-zinc-800 text-[8px] flex items-center justify-center font-bold">
                                      {comm.authorName.charAt(0)}
                                    </div>
                                  )}
                                  <span className="font-semibold text-zinc-200">{comm.authorName}</span>
                                  {comm.authorRole === 'admin' && (
                                    <span className="text-[9px] px-1 bg-red-950 text-red-300 rounded">Admin</span>
                                  )}
                                </div>
                                <span className="text-zinc-500">
                                  {new Date(comm.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="text-zinc-300 leading-relaxed pl-6">{comm.content}</p>

                              {onLikeComment && (
                                <div className="pl-6 pt-1 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => onLikeComment(disc.id, comm.id)}
                                    className={`flex items-center gap-1 text-[10px] transition-colors cursor-pointer ${
                                      isCommentLiked ? 'text-red-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                  >
                                    <Heart className={`w-3 h-3 ${isCommentLiked ? 'fill-red-400 text-red-400' : ''}`} />
                                    <span>{comm.likes || 0}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add Comment Input */}
                    <div className="pt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={commentInputs[disc.id] || ''}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [disc.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handlePostComment(disc.id);
                          }
                        }}
                        placeholder="Offer a psychological counterpoint or quote..."
                        className="flex-1 px-3 py-2 bg-[#14141f] border border-white/10 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-600/50 transition-colors"
                      />
                      <button
                        onClick={() => handlePostComment(disc.id)}
                        className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Interactive Session Modal Configuration Box */}
      <ReadingSessionModal
        isOpen={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        initialBook={selectedBookForSession}
        curatedBooks={books}
        onCreateSession={onAddSession}
      />
    </div>
  );
};
