import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { SanctuaryVault } from './components/SanctuaryVault';
import { OpenLibrarySearch } from './components/OpenLibrarySearch';
import { ReadingRooms } from './components/ReadingRooms';
import { BookClub } from './components/BookClub';
import { AdminPanel } from './components/AdminPanel';
import { BookDetailModal } from './components/BookDetailModal';
import {
  DarkBook,
  BookDiscussion,
  DiscussionComment,
  SupabaseConfigState,
  OpenLibraryDoc,
  ReadingSession,
  SessionMilestone,
  BookClubThread,
  BookClubComment,
  MemberGoal,
} from './types';
import {
  validateSupabaseConnection,
  getLocalBooks,
  saveLocalBooks,
  getLocalDiscussions,
  saveLocalDiscussions,
  getLocalReadingSessions,
  saveLocalReadingSessions,
  getLocalBookClubThreads,
  saveLocalBookClubThreads,
  getLocalMemberGoals,
  saveLocalMemberGoals,
  syncBooksFromSupabase,
  syncDiscussionsFromSupabase,
  syncSessionsFromSupabase,
  syncBookClubThreadsFromSupabase,
  syncMemberGoalsFromSupabase,
  persistBookToSupabase,
  persistDiscussionToSupabase,
  persistCommentToSupabase,
  persistSessionToSupabase,
  persistBookClubThreadToSupabase,
  persistBookClubCommentToSupabase,
  deleteBookClubThreadFromSupabase,
  deleteDiscussionFromSupabase,
  persistMemberGoalToSupabase,
  recordAuditLog,
} from './lib/supabase';
import { deduceDarkArchetype, getCoverUrl } from './services/openLibrary';

function AppContent() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'library' | 'explore' | 'discussions' | 'book_club' | 'admin'>('library');

  // Supabase State
  const [configState, setConfigState] = useState<SupabaseConfigState>({
    isConfigured: false,
    isConnected: false,
    isValidating: true,
    url: '',
    anonKey: '',
    maskedKey: '',
    latencyMs: null,
    error: null,
    mode: 'local_fallback',
    checkedAt: null,
  });

  // State for Catalog, Discussions, Sessions, Book Club Threads & Goals
  const [books, setBooks] = useState<DarkBook[]>([]);
  const [discussions, setDiscussions] = useState<BookDiscussion[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [bookClubThreads, setBookClubThreads] = useState<BookClubThread[]>([]);
  const [memberGoals, setMemberGoals] = useState<MemberGoal[]>([]);
  const [selectedBook, setSelectedBook] = useState<DarkBook | null>(null);
  const [sessionTargetBook, setSessionTargetBook] = useState<DarkBook | null>(null);
  const [bookClubTargetBook, setBookClubTargetBook] = useState<DarkBook | null>(null);

  // Initialize and validate Supabase connection on launch with background syncing
  useEffect(() => {
    async function initDatabaseConnection() {
      // 1. Instantly load local active cache
      const storedBooks = getLocalBooks();
      const storedDiscussions = getLocalDiscussions();
      const storedSessions = getLocalReadingSessions();
      const storedThreads = getLocalBookClubThreads();
      const storedGoals = getLocalMemberGoals();
      setBooks(storedBooks);
      setDiscussions(storedDiscussions);
      setSessions(storedSessions);
      setBookClubThreads(storedThreads);
      setMemberGoals(storedGoals);

      // 2. Validate Supabase connection
      const validated = await validateSupabaseConnection();
      setConfigState(validated);

      // 3. If live Supabase connection is established, synchronize remote tables
      if (validated.isConnected) {
        try {
          const [remoteBooks, remoteDiscussions, remoteSessions, remoteThreads, remoteGoals] = await Promise.all([
            syncBooksFromSupabase(),
            syncDiscussionsFromSupabase(),
            syncSessionsFromSupabase(),
            syncBookClubThreadsFromSupabase(),
            syncMemberGoalsFromSupabase(),
          ]);
          setBooks(remoteBooks);
          setDiscussions(remoteDiscussions);
          setSessions(remoteSessions);
          setBookClubThreads(remoteThreads);
          setMemberGoals(remoteGoals);
        } catch (e) {
          console.warn('[Supabase] Background sync failed, continuing in persistent CSR mode:', e);
        }
      }
    }

    initDatabaseConnection();
  }, []);

  // Strict User Privacy: If regular user is active, prevent remaining in admin tab
  useEffect(() => {
    if (!isAdmin && activeTab === 'admin') {
      setActiveTab('library');
    }
  }, [isAdmin, activeTab]);

  const handleRefreshSupabase = async () => {
    setConfigState((prev) => ({ ...prev, isValidating: true }));
    const validated = await validateSupabaseConnection();
    setConfigState(validated);

    if (validated.isConnected) {
      const [remoteBooks, remoteDiscussions, remoteSessions, remoteThreads, remoteGoals] = await Promise.all([
        syncBooksFromSupabase(),
        syncDiscussionsFromSupabase(),
        syncSessionsFromSupabase(),
        syncBookClubThreadsFromSupabase(),
        syncMemberGoalsFromSupabase(),
      ]);
      setBooks(remoteBooks);
      setDiscussions(remoteDiscussions);
      setSessions(remoteSessions);
      setBookClubThreads(remoteThreads);
      setMemberGoals(remoteGoals);
    }
  };

  const handleAddBookToSanctuary = (newBook: DarkBook) => {
    const updated = [newBook, ...books];
    setBooks(updated);
    saveLocalBooks(updated);
    persistBookToSupabase(newBook);

    recordAuditLog({
      action: 'INSERT',
      table: 'public.books',
      performedBy: user?.email || 'guest',
      details: `Ingested volume "${newBook.title}" by ${newBook.author}`,
      status: 'SUCCESS',
    });
  };

  const handleUpdateBooks = (newBooks: DarkBook[]) => {
    setBooks(newBooks);
    saveLocalBooks(newBooks);
  };

  const handleUpdateDiscussions = (newDiscussions: BookDiscussion[]) => {
    setDiscussions(newDiscussions);
    saveLocalDiscussions(newDiscussions);
  };

  const handleAddDiscussion = (discussion: BookDiscussion) => {
    const updated = [discussion, ...discussions];
    setDiscussions(updated);
    saveLocalDiscussions(updated);
    persistDiscussionToSupabase(discussion);

    recordAuditLog({
      action: 'INSERT',
      table: 'public.discussions',
      performedBy: user?.email || 'guest',
      details: `Published thesis: "${discussion.title}" for ${discussion.bookTitle}`,
      status: 'SUCCESS',
    });
  };

  const handleAddComment = (discussionId: string, comment: DiscussionComment) => {
    const updated = discussions.map((d) => {
      if (d.id === discussionId) {
        return {
          ...d,
          comments: [...d.comments, comment],
        };
      }
      return d;
    });
    setDiscussions(updated);
    saveLocalDiscussions(updated);
    persistCommentToSupabase(comment);
  };

  const handleUpvoteDiscussion = (discussionId: string) => {
    const userEmail = user?.email || 'guest@sanctuary.io';
    const updated = discussions.map((d) => {
      if (d.id === discussionId) {
        const upvotedList = d.upvotedByEmails || [];
        const isUpvoted = upvotedList.includes(userEmail);
        const newUpvotes = isUpvoted ? Math.max(1, d.upvotes - 1) : d.upvotes + 1;
        const newUpvotedBy = isUpvoted
          ? upvotedList.filter((e) => e !== userEmail)
          : [...upvotedList, userEmail];

        const updatedDisc = { ...d, upvotes: newUpvotes, upvotedByEmails: newUpvotedBy };
        persistDiscussionToSupabase(updatedDisc);
        return updatedDisc;
      }
      return d;
    });
    setDiscussions(updated);
    saveLocalDiscussions(updated);
  };

  const handleLikeComment = (discussionId: string, commentId: string) => {
    const userEmail = user?.email || 'guest@sanctuary.io';
    const updated = discussions.map((d) => {
      if (d.id === discussionId) {
        const updatedComments = d.comments.map((c) => {
          if (c.id === commentId) {
            const likedList = c.likedByEmails || [];
            const isLiked = likedList.includes(userEmail);
            const newLikes = isLiked ? Math.max(0, (c.likes || 0) - 1) : (c.likes || 0) + 1;
            const newLikedBy = isLiked
              ? likedList.filter((e) => e !== userEmail)
              : [...likedList, userEmail];

            const updatedComm = { ...c, likes: newLikes, likedByEmails: newLikedBy };
            persistCommentToSupabase(updatedComm);
            return updatedComm;
          }
          return c;
        });
        return { ...d, comments: updatedComments };
      }
      return d;
    });
    setDiscussions(updated);
    saveLocalDiscussions(updated);
  };

  const handleDeleteDiscussion = (discussionId: string) => {
    const target = discussions.find((d) => d.id === discussionId);
    if (!target) return;

    if (!isAdmin && user?.email?.toLowerCase() !== target.authorEmail.toLowerCase()) {
      return;
    }

    if (!window.confirm(`Confirm removal of thesis "${target.title}"?`)) return;

    const updated = discussions.filter((d) => d.id !== discussionId);
    setDiscussions(updated);
    saveLocalDiscussions(updated);

    recordAuditLog({
      action: 'DELETE',
      table: 'public.discussions',
      performedBy: user?.email || 'guest',
      details: `Removed thesis "${target.title}" (ID: ${discussionId})`,
      status: 'SUCCESS',
    });
  };

  // =========================================================================
  // BOOK CLUB HANDLERS
  // =========================================================================

  const handleAddBookClubThread = (newThread: BookClubThread) => {
    const updated = [newThread, ...bookClubThreads];
    setBookClubThreads(updated);
    saveLocalBookClubThreads(updated);
    persistBookClubThreadToSupabase(newThread);

    recordAuditLog({
      action: 'INSERT',
      table: 'public.book_club_discussions',
      performedBy: user?.email || 'guest',
      details: `Posted book club reflection "${newThread.title}" (${newThread.category})`,
      status: 'SUCCESS',
    });
  };

  const handleAddBookClubComment = (threadId: string, comment: BookClubComment) => {
    const updated = bookClubThreads.map((t) => {
      if (t.id === threadId) {
        const commentsList = t.comments || [];
        return {
          ...t,
          comments: [...commentsList, comment],
          commentsCount: (t.commentsCount || commentsList.length) + 1,
        };
      }
      return t;
    });
    setBookClubThreads(updated);
    saveLocalBookClubThreads(updated);
    persistBookClubCommentToSupabase(comment);
  };

  const handleToggleBookClubReaction = (threadId: string, reactionType: string, commentId?: string) => {
    const userEmail = user?.email || 'guest@sanctuary.io';

    const updated = bookClubThreads.map((t) => {
      if (t.id === threadId) {
        if (!commentId) {
          // Thread reaction
          const userReactions = { ...(t.userReactions || {}) };
          const reactedUsers = userReactions[reactionType] || [];
          const hasReacted = reactedUsers.includes(userEmail);

          const newReactedUsers = hasReacted
            ? reactedUsers.filter((e) => e !== userEmail)
            : [...reactedUsers, userEmail];

          userReactions[reactionType] = newReactedUsers;

          const currentCount = t.reactions?.[reactionType] || 0;
          const newCount = hasReacted ? Math.max(0, currentCount - 1) : currentCount + 1;
          const reactions = { ...(t.reactions || {}), [reactionType]: newCount };

          const updatedThread = { ...t, reactions, userReactions };
          persistBookClubThreadToSupabase(updatedThread);
          return updatedThread;
        }
      }
      return t;
    });

    setBookClubThreads(updated);
    saveLocalBookClubThreads(updated);
  };

  const handleDeleteBookClubThread = (threadId: string) => {
    const target = bookClubThreads.find((t) => t.id === threadId);
    if (!target) return;

    if (!isAdmin && user?.email?.toLowerCase() !== target.authorEmail.toLowerCase()) {
      return;
    }

    if (!window.confirm(`Confirm removal of reflection "${target.title}"?`)) return;

    const updated = bookClubThreads.filter((t) => t.id !== threadId);
    setBookClubThreads(updated);
    saveLocalBookClubThreads(updated);
    deleteBookClubThreadFromSupabase(threadId);

    recordAuditLog({
      action: 'DELETE',
      table: 'public.book_club_discussions',
      performedBy: user?.email || 'guest',
      details: `Removed book club reflection "${target.title}" (ID: ${threadId})`,
      status: 'SUCCESS',
    });
  };

  const handleAddMemberGoal = (goal: MemberGoal) => {
    const updated = [goal, ...memberGoals];
    setMemberGoals(updated);
    saveLocalMemberGoals(updated);
    persistMemberGoalToSupabase(goal);

    recordAuditLog({
      action: 'INSERT',
      table: 'public.member_goals',
      performedBy: user?.email || 'guest',
      details: `Committed reading goal for "${goal.bookTitle}" (${goal.targetChapters} chapters)`,
      status: 'SUCCESS',
    });
  };

  const handleUpdateMemberGoalProgress = (goalId: string, delta: number) => {
    const updated = memberGoals.map((g) => {
      if (g.id === goalId) {
        const nextCount = Math.max(0, Math.min(g.targetChapters, g.completedChapters + delta));
        const status: 'in_progress' | 'completed' = nextCount >= g.targetChapters ? 'completed' : 'in_progress';
        const updatedGoal = { ...g, completedChapters: nextCount, status };
        persistMemberGoalToSupabase(updatedGoal);
        return updatedGoal;
      }
      return g;
    });
    setMemberGoals(updated);
    saveLocalMemberGoals(updated);
  };

  const handleUpdateMemberGoal = (goalId: string, updates: Partial<MemberGoal>) => {
    const updated = memberGoals.map((g) => {
      if (g.id === goalId) {
        const targetChapters = updates.targetChapters ?? g.targetChapters;
        const completedChapters = updates.completedChapters ?? g.completedChapters;
        const nextCompleted = Math.max(0, Math.min(targetChapters, completedChapters));
        const status: 'in_progress' | 'completed' = nextCompleted >= targetChapters ? 'completed' : 'in_progress';
        const updatedGoal: MemberGoal = { ...g, ...updates, completedChapters: nextCompleted, status };
        persistMemberGoalToSupabase(updatedGoal);
        return updatedGoal;
      }
      return g;
    });
    setMemberGoals(updated);
    saveLocalMemberGoals(updated);
  };

  // =========================================================================
  // READING SESSIONS HANDLERS
  // =========================================================================

  const handleAddSession = (newSession: ReadingSession) => {
    const updated = [newSession, ...sessions];
    setSessions(updated);
    saveLocalReadingSessions(updated);
    persistSessionToSupabase(newSession);

    recordAuditLog({
      action: 'INSERT',
      table: 'public.reading_sessions',
      performedBy: user?.email || 'guest',
      details: `Hosted cohort reading session for "${newSession.bookTitle}" (Code: ${newSession.inviteCode})`,
      status: 'SUCCESS',
    });
  };

  const handleToggleJoinSession = (sessionId: string) => {
    const userEmail = user?.email || 'guest@sanctuary.io';
    const updated = sessions.map((sess) => {
      if (sess.id === sessionId) {
        const isJoined = sess.joinedUserEmails.includes(userEmail);
        const newJoined = isJoined
          ? sess.joinedUserEmails.filter((e) => e !== userEmail)
          : [...sess.joinedUserEmails, userEmail];
        const updatedSess = {
          ...sess,
          joinedUserEmails: newJoined,
          membersCount: Math.max(1, newJoined.length),
        };
        persistSessionToSupabase(updatedSess);
        return updatedSess;
      }
      return sess;
    });
    setSessions(updated);
    saveLocalReadingSessions(updated);
  };

  const handleUpdateSessionChapter = (sessionId: string, newChapter: number) => {
    const updated = sessions.map((sess) => {
      if (sess.id === sessionId) {
        const updatedSess = {
          ...sess,
          currentChapter: newChapter,
          lastActivityAt: new Date().toISOString(),
        };
        persistSessionToSupabase(updatedSess);
        return updatedSess;
      }
      return sess;
    });
    setSessions(updated);
    saveLocalReadingSessions(updated);
  };

  const handleAddSessionMilestone = (sessionId: string, milestone: SessionMilestone) => {
    const updated = sessions.map((sess) => {
      if (sess.id === sessionId) {
        const currentMilestones = sess.milestones || [];
        const updatedSess = {
          ...sess,
          milestones: [...currentMilestones, milestone],
          lastActivityAt: new Date().toISOString(),
        };
        persistSessionToSupabase(updatedSess);
        return updatedSess;
      }
      return sess;
    });
    setSessions(updated);
    saveLocalReadingSessions(updated);
  };

  const handleInspectOpenLibraryDoc = (doc: OpenLibraryDoc) => {
    const author = doc.author_name?.[0] || 'Unknown Philosopher';
    const archetype = deduceDarkArchetype(doc.title, doc.subject);
    const coverUrl = doc.cover_i
      ? getCoverUrl(doc.cover_i, 'L')
      : doc.isbn?.[0]
      ? `https://covers.openlibrary.org/b/isbn/${doc.isbn[0].replace(/[-\s]/g, '')}-L.jpg`
      : '/src/assets/images/reading_circle_dramatic_1790432613396.jpg';

    const tempBook: DarkBook = {
      id: `preview_${doc.key}`,
      openLibraryKey: doc.key,
      title: doc.title,
      author,
      coverUrl,
      firstPublishYear: doc.first_publish_year,
      isbn: doc.isbn,
      subjects: doc.subject?.slice(0, 6) || ['Psychology', 'Philosophy'],
      darkArchetype: archetype,
      synopsis: `Retrieved via Open Library client search. Edition count: ${doc.edition_count || 1}.`,
      curatorNotes: 'Examine key excerpts and evaluate alignment with sanctuary reading curriculum.',
      rating: doc.ratings_average || 4.8,
      addedBy: 'OpenLibrary Explorer',
      createdAt: new Date().toISOString(),
      discussionCount: 0,
      status: 'reading',
    };

    setSelectedBook(tempBook);
  };

  const handleStartSessionFromDoc = (doc: OpenLibraryDoc) => {
    const author = doc.author_name?.[0] || 'Unknown Philosopher';
    const archetype = deduceDarkArchetype(doc.title, doc.subject);
    const coverUrl = doc.cover_i
      ? getCoverUrl(doc.cover_i, 'L')
      : doc.isbn?.[0]
      ? `https://covers.openlibrary.org/b/isbn/${doc.isbn[0].replace(/[-\s]/g, '')}-L.jpg`
      : '/src/assets/images/reading_circle_dramatic_1790432613396.jpg';

    const bookForSession: DarkBook = {
      id: `session_target_${doc.key}`,
      openLibraryKey: doc.key,
      title: doc.title,
      author,
      coverUrl,
      firstPublishYear: doc.first_publish_year,
      isbn: doc.isbn,
      subjects: doc.subject || ['Psychology'],
      darkArchetype: archetype,
      synopsis: `Open Library Catalog Entry. Classification: ${archetype}.`,
      rating: 4.8,
      addedBy: user?.email || 'adhudson504@gmail.com',
      createdAt: new Date().toISOString(),
      discussionCount: 0,
      status: 'reading',
    };

    setSessionTargetBook(bookForSession);
    setActiveTab('discussions');
  };

  const handleStartSessionFromBook = (book: DarkBook) => {
    setSessionTargetBook(book);
    setActiveTab('discussions');
  };

  const existingBookKeys = new Set(books.map((b) => b.openLibraryKey));

  return (
    <div className="h-[100dvh] flex flex-col bg-[#070709] text-[#e2e2e8] overflow-hidden">
      {/* Top Bar (3-Zone Contract) */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        configState={configState}
        onRefreshSupabase={handleRefreshSupabase}
        onConfigUpdated={(state) => setConfigState(state)}
        sessionsCount={sessions.length}
        discussionsCount={discussions.length + bookClubThreads.length}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {activeTab === 'library' && (
            <SanctuaryVault
              books={books}
              onSelectBook={(book) => setSelectedBook(book)}
              onNavigateToExplore={() => setActiveTab('explore')}
            />
          )}

          {activeTab === 'explore' && (
            <OpenLibrarySearch
              onAddBookToSanctuary={handleAddBookToSanctuary}
              existingBookKeys={existingBookKeys}
              onInspectBook={handleInspectOpenLibraryDoc}
              onStartSession={handleStartSessionFromDoc}
            />
          )}

          {activeTab === 'discussions' && (
            <ReadingRooms
              discussions={discussions}
              sessions={sessions}
              books={books}
              onAddDiscussion={handleAddDiscussion}
              onAddComment={handleAddComment}
              onUpvoteDiscussion={handleUpvoteDiscussion}
              onLikeComment={handleLikeComment}
              onDeleteDiscussion={handleDeleteDiscussion}
              onAddSession={handleAddSession}
              onToggleJoinSession={handleToggleJoinSession}
              onUpdateSessionChapter={handleUpdateSessionChapter}
              onAddSessionMilestone={handleAddSessionMilestone}
              initialSessionBook={sessionTargetBook}
            />
          )}

          {activeTab === 'book_club' && (
            <BookClub
              threads={bookClubThreads}
              memberGoals={memberGoals}
              books={books}
              onAddThread={handleAddBookClubThread}
              onAddComment={handleAddBookClubComment}
              onToggleReaction={handleToggleBookClubReaction}
              onDeleteThread={handleDeleteBookClubThread}
              onAddMemberGoal={handleAddMemberGoal}
              onUpdateMemberGoalProgress={handleUpdateMemberGoalProgress}
              initialBook={bookClubTargetBook}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPanel
              books={books}
              discussions={discussions}
              configState={configState}
              onUpdateBooks={handleUpdateBooks}
              onUpdateDiscussions={handleUpdateDiscussions}
              onRefreshDatabase={handleRefreshSupabase}
            />
          )}
        </div>

        {/* Discreet Footer */}
        <footer className="border-t border-white/5 py-6 px-4 md:px-8 mt-12 bg-[#050507]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
            <div className="font-display text-zinc-400">
              Books and Friends · Dark Psychology Sanctuary & Book Club
            </div>
            <div className="flex items-center gap-3">
              <span>Client-Side Rendering (CSR)</span>
              <span>·</span>
              <span>Open Library API</span>
              <span>·</span>
              <span>Dedicated Book Club Salons</span>
              <span>·</span>
              <span>Supabase Architecture</span>
            </div>
          </div>
        </footer>
      </main>

      {/* Book Inspection Modal */}
      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onStartDiscussion={(b) => {
          setSelectedBook(null);
          setBookClubTargetBook(b);
          setActiveTab('book_club');
        }}
        onHostSession={(b) => {
          setSelectedBook(null);
          handleStartSessionFromBook(b);
        }}
        memberGoals={memberGoals}
        onUpdateMemberGoalProgress={handleUpdateMemberGoalProgress}
        onUpdateMemberGoal={handleUpdateMemberGoal}
        onAddMemberGoal={handleAddMemberGoal}
        sessions={sessions}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
