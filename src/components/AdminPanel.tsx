import React, { useState } from 'react';
import { useAuth, ADMIN_EMAIL } from '../context/AuthContext';
import { DarkBook, BookDiscussion, AdminAuditRecord, SupabaseConfigState } from '../types';
import { recordAuditLog, getAdminAuditLogs, deleteBookFromSupabase, persistBookToSupabase } from '../lib/supabase';
import { SUPABASE_ADMIN_FRAMEWORK_SQL } from '../lib/schemaSql';
import {
  Shield,
  ShieldAlert,
  Database,
  Plus,
  Trash2,
  Edit3,
  Save,
  Check,
  RefreshCw,
  Terminal,
  Code2,
  Copy,
  CheckCheck,
  Layers,
  Key,
  Lock,
  Sparkles,
  Search,
  BookOpen,
  AlertCircle,
  LogOut,
} from 'lucide-react';

export { SUPABASE_ADMIN_FRAMEWORK_SQL };

interface AdminPanelProps {
  books: DarkBook[];
  discussions: BookDiscussion[];
  configState: SupabaseConfigState;
  onUpdateBooks: (books: DarkBook[]) => void;
  onUpdateDiscussions: (discussions: BookDiscussion[]) => void;
  onRefreshDatabase: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  books,
  discussions,
  configState,
  onUpdateBooks,
  onUpdateDiscussions,
  onRefreshDatabase,
}) => {
  const { user, isAdmin, switchDemoRole, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'crud' | 'query' | 'sql' | 'logs'>('crud');
  const [copiedSql, setCopiedSql] = useState(false);

  // Insert Form State
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newArchetype, setNewArchetype] = useState<DarkBook['darkArchetype']>('The Strategist');
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [newSynopsis, setNewSynopsis] = useState('');
  const [newCuratorNotes, setNewCuratorNotes] = useState('');
  const [insertSuccess, setInsertSuccess] = useState(false);

  // Edit Form State
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<DarkBook>>({});

  // Delete & Action Feedback State
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);
  const [bookToDelete, setBookToDelete] = useState<DarkBook | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    bookTitle?: string;
  } | null>(null);

  // Query Inspector State
  const [selectedTable, setSelectedTable] = useState<'books' | 'discussions' | 'book_club_discussions' | 'member_goals' | 'audit_logs' | 'profiles'>('books');
  const [queryFilter, setQueryFilter] = useState('');
  const [auditLogs, setAuditLogs] = useState<AdminAuditRecord[]>(getAdminAuditLogs());

  // Security Check: Strictly block unauthorized users
  if (!isAdmin || user?.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return (
      <div className="p-12 text-center rounded-2xl bg-red-950/20 border border-red-900/50 max-w-xl mx-auto my-12 animate-fadeIn">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-red-200 font-display">Developer Admin Clearance Required</h2>
        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
          Only verified administrator accounts (<code className="text-red-300 font-mono font-semibold">{ADMIN_EMAIL}</code>) possess full INSERT, UPDATE, DELETE, and SELECT database privileges.
        </p>
        <div className="mt-4 p-3 bg-black/50 border border-white/5 rounded-lg text-xs text-zinc-400 font-mono inline-block">
          Active Session: {user?.email || 'Unauthenticated'} · Role: {user?.role || 'Guest'}
        </div>
      </div>
    );
  }

  // 1. INSERT Handler (Developer Admin privilege)
  const handleInsertBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAuthor.trim()) return;

    const newBook: DarkBook = {
      id: `bk_admin_${Date.now()}`,
      openLibraryKey: `custom_${Date.now()}`,
      title: newTitle.trim(),
      author: newAuthor.trim(),
      coverUrl: newCoverUrl.trim() || '/src/assets/images/reading_circle_dramatic_1790432613396.jpg',
      firstPublishYear: new Date().getFullYear(),
      subjects: ['Dark Psychology', 'Strategy', 'Power Dynamics'],
      darkArchetype: newArchetype,
      synopsis: newSynopsis.trim() || 'A curated dark psychology volume authored and ingested by Developer Admin.',
      curatorNotes: newCuratorNotes.trim() || `Ingested by Developer Admin (${ADMIN_EMAIL}) with full DB privileges.`,
      rating: 5.0,
      addedBy: ADMIN_EMAIL,
      createdAt: new Date().toISOString(),
      discussionCount: 0,
      status: 'featured',
    };

    const updated = [newBook, ...books];
    onUpdateBooks(updated);
    await persistBookToSupabase(newBook);

    recordAuditLog({
      action: 'INSERT',
      table: 'public.books',
      performedBy: ADMIN_EMAIL,
      details: `Admin executed INSERT: "${newBook.title}" by ${newBook.author} (ID: ${newBook.id})`,
      status: 'SUCCESS',
    });

    setAuditLogs(getAdminAuditLogs());
    setNewTitle('');
    setNewAuthor('');
    setNewSynopsis('');
    setNewCuratorNotes('');
    setNewCoverUrl('');
    setInsertSuccess(true);
    setTimeout(() => setInsertSuccess(false), 3000);
  };

  // 2. UPDATE Handler (Developer Admin privilege)
  const handleStartEdit = (book: DarkBook) => {
    setEditingBookId(book.id);
    setEditFields({ ...book });
  };

  const handleSaveEdit = async (bookId: string) => {
    const existing = books.find((b) => b.id === bookId);
    if (!existing) return;

    const updatedBook = { ...existing, ...editFields } as DarkBook;
    const updated = books.map((b) => (b.id === bookId ? updatedBook : b));
    onUpdateBooks(updated);
    await persistBookToSupabase(updatedBook);

    recordAuditLog({
      action: 'UPDATE',
      table: 'public.books',
      performedBy: ADMIN_EMAIL,
      details: `Admin executed UPDATE on volume [${bookId}]: ${updatedBook.title}`,
      status: 'SUCCESS',
    });

    setAuditLogs(getAdminAuditLogs());
    setEditingBookId(null);
    setDeleteFeedback({
      type: 'success',
      message: `Catalog record "${updatedBook.title}" successfully committed to database via UPDATE privilege.`,
      bookTitle: updatedBook.title,
    });
    setTimeout(() => setDeleteFeedback(null), 4000);
  };

  // 3. DELETE Handlers (Developer Admin privilege)
  const promptDeleteBook = (book: DarkBook) => {
    setBookToDelete(book);
  };

  const handleConfirmDelete = async (book: DarkBook) => {
    setDeletingBookId(book.id);
    if (editingBookId === book.id) {
      setEditingBookId(null);
    }

    // 1. Immediately remove from live UI dashboard & local cache
    const updated = books.filter((b) => b.id !== book.id && b.openLibraryKey !== book.openLibraryKey);
    onUpdateBooks(updated);

    try {
      // 2. Execute Supabase DELETE API query with proper record identifiers
      const res = await deleteBookFromSupabase(book);

      if (res.success) {
        setDeleteFeedback({
          type: 'success',
          message: `Catalog Record "${book.title}" permanently removed from Supabase database and dashboard.`,
          bookTitle: book.title,
        });

        recordAuditLog({
          action: 'DELETE',
          table: 'public.books',
          performedBy: ADMIN_EMAIL,
          details: `Admin executed DELETE on record "${book.title}" (ID: ${book.id}, Key: ${book.openLibraryKey})`,
          status: 'SUCCESS',
        });
      } else {
        setDeleteFeedback({
          type: 'error',
          message: `Database sync notice: Record purged locally, but Supabase reported: ${res.error || 'Permission error'}`,
          bookTitle: book.title,
        });

        recordAuditLog({
          action: 'DELETE',
          table: 'public.books',
          performedBy: ADMIN_EMAIL,
          details: `Admin DELETE query warning for "${book.title}": ${res.error}`,
          status: 'FAILED',
        });
      }
    } catch (err: any) {
      console.error('[Admin] Delete book exception:', err);
      setDeleteFeedback({
        type: 'error',
        message: `Network exception while deleting "${book.title}": ${err?.message || 'Unknown network error'}. Removed from local view.`,
        bookTitle: book.title,
      });
    } finally {
      setDeletingBookId(null);
      setBookToDelete(null);
      setAuditLogs(getAdminAuditLogs());
      setTimeout(() => setDeleteFeedback(null), 5000);
    }
  };

  // 4. SELECT Table Data (Developer Admin privilege)
  const getSelectedTableData = () => {
    switch (selectedTable) {
      case 'books':
        return books.filter(
          (b) =>
            !queryFilter ||
            b.title.toLowerCase().includes(queryFilter.toLowerCase()) ||
            b.author.toLowerCase().includes(queryFilter.toLowerCase())
        );
      case 'discussions':
        return discussions.filter(
          (d) =>
            !queryFilter ||
            d.title.toLowerCase().includes(queryFilter.toLowerCase()) ||
            d.content.toLowerCase().includes(queryFilter.toLowerCase())
        );
      case 'book_club_discussions':
        try {
          const raw = localStorage.getItem('bf_local_book_club_threads_db');
          const threads = raw ? JSON.parse(raw) : [];
          return threads.filter(
            (t: any) =>
              !queryFilter ||
              t.title.toLowerCase().includes(queryFilter.toLowerCase()) ||
              t.content.toLowerCase().includes(queryFilter.toLowerCase())
          );
        } catch {
          return [];
        }
      case 'member_goals':
        try {
          const raw = localStorage.getItem('bf_local_member_goals_db');
          const goals = raw ? JSON.parse(raw) : [];
          return goals.filter(
            (g: any) =>
              !queryFilter ||
              g.bookTitle.toLowerCase().includes(queryFilter.toLowerCase()) ||
              g.userName.toLowerCase().includes(queryFilter.toLowerCase())
          );
        } catch {
          return [];
        }
      case 'audit_logs':
        return auditLogs.filter(
          (a) =>
            !queryFilter ||
            a.details.toLowerCase().includes(queryFilter.toLowerCase()) ||
            a.action.toLowerCase().includes(queryFilter.toLowerCase())
        );
      case 'profiles':
        return [
          {
            id: 'usr_admin_adhudson',
            email: ADMIN_EMAIL,
            role: 'admin',
            privileges: 'FULL UNRESTRICTED (INSERT, UPDATE, DELETE, SELECT)',
            accessScope: 'Global Cluster',
          },
          {
            id: 'usr_scholar_vance',
            email: 'helena.vance@sanctuary.io',
            role: 'scholar',
            privileges: 'SELECT (public), INSERT (discussions/comments)',
            accessScope: 'Standard Reading Salon',
          },
          {
            id: 'usr_member_sterling',
            email: 'julian.sterling@readingcircle.org',
            role: 'member',
            privileges: 'SELECT (public), INSERT (comments), UPVOTE',
            accessScope: 'Standard Member',
          },
        ];
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_ADMIN_FRAMEWORK_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-red-950/40 via-[#0d0d16] to-[#0a0a10] border border-red-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-mono text-red-400">
            <Shield className="w-4 h-4 text-red-500" />
            <span>Developer Admin Security Console</span>
            <span>·</span>
            <span>Target Admin: {ADMIN_EMAIL}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-zinc-100 font-display">
            Supabase Full Database Control (CRUD)
          </h2>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Direct management engine enforcing Developer Admin security roles. You have full INSERT, UPDATE, DELETE, and SELECT privileges across all catalog volumes, discussions, and member goals.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={onRefreshDatabase}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Sync Supabase</span>
          </button>

          <button
            onClick={signOut}
            className="px-3.5 py-2 bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-200 hover:text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Sign out of Developer Admin console"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span>Log Out (Admin)</span>
          </button>
        </div>
      </div>

      {/* Admin Tab Switcher */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2 p-1 bg-[#101018] rounded-xl border border-white/5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('crud')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'crud'
                ? 'bg-red-950 text-white border border-red-800/80 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-red-400" />
            <span>CRUD Operations</span>
          </button>

          <button
            onClick={() => setActiveTab('query')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'query'
                ? 'bg-red-950 text-white border border-red-800/80 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-red-400" />
            <span>SELECT Query Inspector</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'sql'
                ? 'bg-red-950 text-white border border-red-800/80 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Supabase SQL Migration Code</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-red-950 text-white border border-red-800/80 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-red-400" />
            <span>Audit Records ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: CRUD Management */}
      {activeTab === 'crud' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* INSERT Form */}
          <div className="bg-[#0e0e15] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <Plus className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-zinc-100 font-display">INSERT Book Record</h3>
            </div>

            {insertSuccess && (
              <div className="p-3 text-xs bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 rounded-lg flex items-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4 shrink-0" />
                <span>Book successfully committed to Supabase database via INSERT privilege.</span>
              </div>
            )}

            <form onSubmit={handleInsertBook} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Volume Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. The Laws of Human Nature"
                  className="w-full px-3 py-2 bg-[#14141e] border border-white/10 rounded-lg text-zinc-200 focus:outline-none focus:border-red-600/60"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Author / Philosopher</label>
                <input
                  type="text"
                  required
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="e.g. Robert Greene"
                  className="w-full px-3 py-2 bg-[#14141e] border border-white/10 rounded-lg text-zinc-200 focus:outline-none focus:border-red-600/60"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Dark Archetype Classification</label>
                <select
                  value={newArchetype}
                  onChange={(e) => setNewArchetype(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#14141e] border border-white/10 rounded-lg text-zinc-200 focus:outline-none focus:border-red-600/60"
                >
                  <option value="The Strategist">The Strategist</option>
                  <option value="The Shadow">The Shadow</option>
                  <option value="The Manipulator">The Manipulator</option>
                  <option value="The Sovereign">The Sovereign</option>
                  <option value="The Stoic">The Stoic</option>
                  <option value="The Alchemist">The Alchemist</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Cover Image URL (Optional)</label>
                <input
                  type="text"
                  value={newCoverUrl}
                  onChange={(e) => setNewCoverUrl(e.target.value)}
                  placeholder="https://covers.openlibrary.org/b/id/..."
                  className="w-full px-3 py-2 bg-[#14141e] border border-white/10 rounded-lg text-zinc-200 focus:outline-none focus:border-red-600/60"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Dark Synopsis</label>
                <textarea
                  rows={2}
                  value={newSynopsis}
                  onChange={(e) => setNewSynopsis(e.target.value)}
                  placeholder="Psychological premise and strategic theme..."
                  className="w-full px-3 py-2 bg-[#14141e] border border-white/10 rounded-lg text-zinc-200 focus:outline-none focus:border-red-600/60"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Admin Curator Annotations</label>
                <textarea
                  rows={2}
                  value={newCuratorNotes}
                  onChange={(e) => setNewCuratorNotes(e.target.value)}
                  placeholder="Key psychological defense mechanisms..."
                  className="w-full px-3 py-2 bg-[#14141e] border border-white/10 rounded-lg text-zinc-200 focus:outline-none focus:border-red-600/60"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Execute INSERT Record</span>
              </button>
            </form>
          </div>

          {/* UPDATE & DELETE Table View */}
          <div className="lg:col-span-2 bg-[#0e0e15] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-zinc-100 font-display">
                  UPDATE & DELETE Catalog Records ({books.length})
                </h3>
              </div>
              <span className="text-xs text-zinc-400 font-mono">Privilege: Admin Only</span>
            </div>

            {/* In-UI Status and Feedback Alert Banner */}
            {deleteFeedback && (
              <div
                className={`p-3 text-xs rounded-lg flex items-center justify-between gap-2 animate-fadeIn ${
                  deleteFeedback.type === 'success'
                    ? 'bg-red-950/40 border border-red-800/60 text-red-200'
                    : 'bg-amber-950/40 border border-amber-800/60 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {deleteFeedback.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>{deleteFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteFeedback(null)}
                  className="text-zinc-400 hover:text-white text-xs cursor-pointer px-1"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {books.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 rounded-lg bg-[#11111a] border border-white/5 space-y-2">
                  <p className="text-xs">No catalog records currently exist in the database.</p>
                  <p className="text-[11px] text-zinc-600">Use the INSERT form on the left to add volumes.</p>
                </div>
              ) : (
                books.map((book) => {
                  const isEditing = editingBookId === book.id;
                  const isDeleting = deletingBookId === book.id;

                  return (
                    <div
                      key={book.id}
                      className={`p-3.5 rounded-lg bg-[#13131c] border transition-all text-xs ${
                        isDeleting
                          ? 'opacity-50 border-red-900/60 bg-red-950/20'
                          : 'border-white/5 hover:border-white/10'
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-zinc-400">Title</label>
                              <input
                                type="text"
                                value={editFields.title || ''}
                                onChange={(e) => setEditFields({ ...editFields, title: e.target.value })}
                                className="w-full px-2 py-1 bg-[#1a1a26] border border-white/10 rounded text-zinc-200"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-400">Author</label>
                              <input
                                type="text"
                                value={editFields.author || ''}
                                onChange={(e) => setEditFields({ ...editFields, author: e.target.value })}
                                className="w-full px-2 py-1 bg-[#1a1a26] border border-white/10 rounded text-zinc-200"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-zinc-400">Archetype</label>
                              <select
                                value={editFields.darkArchetype}
                                onChange={(e) => setEditFields({ ...editFields, darkArchetype: e.target.value as any })}
                                className="w-full px-2 py-1 bg-[#1a1a26] border border-white/10 rounded text-zinc-200"
                              >
                                <option value="The Strategist">The Strategist</option>
                                <option value="The Shadow">The Shadow</option>
                                <option value="The Manipulator">The Manipulator</option>
                                <option value="The Sovereign">The Sovereign</option>
                                <option value="The Stoic">The Stoic</option>
                                <option value="The Alchemist">The Alchemist</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-400">Status</label>
                              <select
                                value={editFields.status}
                                onChange={(e) => setEditFields({ ...editFields, status: e.target.value as any })}
                                className="w-full px-2 py-1 bg-[#1a1a26] border border-white/10 rounded text-zinc-200"
                              >
                                <option value="reading">Currently Reading</option>
                                <option value="featured">Featured Salon</option>
                                <option value="archive">Archived</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-zinc-400">Curator Annotations</label>
                            <input
                              type="text"
                              value={editFields.curatorNotes || ''}
                              onChange={(e) => setEditFields({ ...editFields, curatorNotes: e.target.value })}
                              className="w-full px-2 py-1 bg-[#1a1a26] border border-white/10 rounded text-zinc-200"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingBookId(null)}
                              className="px-2.5 py-1 text-zinc-400 hover:text-zinc-200 bg-white/5 rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(book.id)}
                              className="px-3 py-1 bg-emerald-900 hover:bg-emerald-800 text-white rounded font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <Save className="w-3 h-3" />
                              <span>Commit UPDATE</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <img
                              src={book.coverUrl}
                              alt={book.title}
                              className="w-10 h-14 object-cover rounded bg-black border border-white/10 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="font-semibold text-zinc-100 font-display text-sm">{book.title}</div>
                              <div className="text-zinc-400 text-[11px] mt-0.5">
                                {book.author} · {book.darkArchetype} · Status: <span className="text-amber-400">{book.status}</span>
                              </div>
                              {book.curatorNotes && (
                                <p className="text-zinc-500 text-[11px] mt-1 line-clamp-1 italic">
                                  &quot;{book.curatorNotes}&quot;
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(book)}
                              disabled={isDeleting}
                              className="p-1.5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Edit Record (UPDATE privilege)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => promptDeleteBook(book)}
                              disabled={isDeleting}
                              className="p-1.5 text-red-400 hover:text-red-200 bg-red-950/40 hover:bg-red-900 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete Record (DELETE privilege)"
                              aria-label={`Delete record ${book.title}`}
                            >
                              {isDeleting ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-400" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Developer Admin Delete Confirmation Modal */}
      {bookToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0e0e16] border border-red-900/60 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-red-400 uppercase tracking-wider font-semibold">
                    Developer Admin Clearance
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-[10px] text-zinc-400 font-mono">public.books</span>
                </div>
                <h3 className="text-base font-bold text-zinc-100 font-display">
                  Confirm Permanent Record Deletion
                </h3>
              </div>
            </div>

            {/* Target Record Card */}
            <div className="p-3.5 rounded-xl bg-[#141420] border border-white/10 flex items-center gap-3.5 text-xs">
              <img
                src={bookToDelete.coverUrl}
                alt={bookToDelete.title}
                className="w-12 h-16 object-cover rounded bg-black border border-white/10 shrink-0 shadow"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 space-y-1">
                <div className="font-semibold text-zinc-100 truncate font-display text-sm">
                  {bookToDelete.title}
                </div>
                <div className="text-zinc-400 text-xs truncate">
                  {bookToDelete.author} · <span className="text-amber-400">{bookToDelete.darkArchetype}</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono truncate">
                  Key: {bookToDelete.openLibraryKey} · ID: {bookToDelete.id}
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              This will execute a Supabase <code className="text-red-300 font-mono font-semibold">DELETE</code> query and permanently purge this catalog record from the database and live dashboard across all views.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                disabled={deletingBookId === bookToDelete.id}
                className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(bookToDelete)}
                disabled={deletingBookId === bookToDelete.id}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-900 hover:bg-red-800 border border-red-700/80 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {deletingBookId === bookToDelete.id ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Purging from Database...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Execute Permanent DELETE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: SELECT Query Inspector */}
      {activeTab === 'query' && (
        <div className="bg-[#0e0e15] border border-white/10 rounded-xl p-5 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-zinc-100 font-display">
                SELECT Query Inspector & Table Browser
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value as any)}
                className="px-3 py-1.5 bg-[#161622] border border-white/10 rounded-lg text-xs text-zinc-200"
              >
                <option value="books">public.books</option>
                <option value="book_club_discussions">public.book_club_discussions</option>
                <option value="member_goals">public.member_goals</option>
                <option value="discussions">public.discussions</option>
                <option value="audit_logs">public.audit_logs</option>
                <option value="profiles">public.profiles (RBAC & Privileges)</option>
              </select>

              <div className="relative">
                <input
                  type="text"
                  value={queryFilter}
                  onChange={(e) => setQueryFilter(e.target.value)}
                  placeholder="Filter table rows..."
                  className="pl-7 pr-3 py-1.5 bg-[#161622] border border-white/10 rounded-lg text-xs text-zinc-200 placeholder-zinc-500"
                />
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div className="p-3 bg-black rounded-lg border border-white/5 font-mono text-xs text-zinc-300 overflow-x-auto max-h-[500px]">
            <pre>{JSON.stringify(getSelectedTableData(), null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Tab 3: Supabase SQL Setup Code */}
      {activeTab === 'sql' && (
        <div className="bg-[#0e0e15] border border-white/10 rounded-xl p-5 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 font-display flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-400" />
                <span>Complete Supabase SQL Schema Migration Script</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Copy and paste this script directly into your Supabase SQL Editor. It sets up UUID extensions, ENUM types, tables, Row-Level Security (RLS) policies, and Developer Admin verification.
              </p>
            </div>

            <button
              onClick={handleCopySql}
              className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow"
            >
              {copiedSql ? (
                <>
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <span>SQL Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy SQL Script</span>
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <div className="p-4 bg-[#08080c] rounded-xl border border-white/10 font-mono text-xs text-emerald-400/90 overflow-x-auto max-h-[550px] leading-relaxed">
              <pre>{SUPABASE_ADMIN_FRAMEWORK_SQL}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Records */}
      {activeTab === 'logs' && (
        <div className="bg-[#0e0e15] border border-white/10 rounded-xl p-5 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-zinc-100 font-display">Immutable Admin Audit Stream</h3>
            </div>
            <span className="text-xs text-zinc-400 font-mono">Logged by: {ADMIN_EMAIL}</span>
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg bg-[#12121b] border border-white/5 flex items-center justify-between gap-4 text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.action === 'INSERT'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : log.action === 'UPDATE'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : log.action === 'DELETE'
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="text-zinc-400">{log.table}</span>
                  <span className="text-zinc-200">{log.details}</span>
                </div>

                <div className="text-zinc-500 text-[11px] shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Testing Sandbox Switcher inside Admin Panel */}
      <div className="p-4 rounded-xl bg-[#0a0a10] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Developer Sandbox: Test Privacy & Role Visibility</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Switch roles to verify that regular users (Scholar / Member) have all Admin controls completely hidden.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => switchDemoRole('scholar')}
            className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded text-xs text-zinc-300 transition-colors cursor-pointer"
          >
            Switch to Scholar
          </button>
          <button
            onClick={() => switchDemoRole('member')}
            className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded text-xs text-zinc-300 transition-colors cursor-pointer"
          >
            Switch to Member
          </button>
        </div>
      </div>
    </div>
  );
};
