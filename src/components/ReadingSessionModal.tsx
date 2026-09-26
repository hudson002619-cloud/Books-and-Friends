import React, { useState, useEffect } from 'react';
import { ReadingSession, DarkBook, BorrowStatus, OpenLibraryDoc } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  X,
  BookOpen,
  Calendar,
  Layers,
  Link as LinkIcon,
  Image as ImageIcon,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Hash,
  Users,
  BookmarkCheck,
  Zap,
  ExternalLink,
  BookMarked,
  Library,
} from 'lucide-react';

interface ReadingSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBook?: Partial<DarkBook | OpenLibraryDoc> | null;
  curatedBooks?: DarkBook[];
  onCreateSession: (session: ReadingSession) => void;
}

const POPULAR_QUICK_PICKS = [
  {
    title: 'The 48 Laws of Power',
    author: 'Robert Greene',
    chapters: 48,
    borrowStatus: 'in_library' as BorrowStatus,
    coverUrl: 'https://covers.openlibrary.org/b/id/8231856-L.jpg',
    directBookUrl: 'https://openlibrary.org/books/OL24364998M',
    darkArchetype: 'The Strategist',
    synopsis: 'Dissecting Machiavellian defense mechanisms, social dominance, and covert power dynamics.',
  },
  {
    title: 'The Archetypes and The Collective Unconscious',
    author: 'Carl Gustav Jung',
    chapters: 12,
    borrowStatus: 'borrowed' as BorrowStatus,
    coverUrl: 'https://covers.openlibrary.org/b/id/6979841-L.jpg',
    directBookUrl: 'https://openlibrary.org/works/OL26333555M',
    darkArchetype: 'The Shadow',
    synopsis: 'Deep psychoanalytic dissection into shadow confrontation and archetype integration.',
  },
  {
    title: 'The Prince',
    author: 'Niccolò Machiavelli',
    chapters: 26,
    borrowStatus: 'available' as BorrowStatus,
    coverUrl: 'https://covers.openlibrary.org/b/id/8741362-L.jpg',
    directBookUrl: 'https://openlibrary.org/books/OL25418430M',
    darkArchetype: 'The Sovereign',
    synopsis: 'Classic political realism on pragmatism, power consolidation, and calculating statecraft.',
  },
  {
    title: 'Influence: The Psychology of Persuasion',
    author: 'Robert B. Cialdini',
    chapters: 8,
    borrowStatus: 'available' as BorrowStatus,
    coverUrl: 'https://covers.openlibrary.org/b/id/10543628-L.jpg',
    directBookUrl: 'https://openlibrary.org/works/OL27204918M',
    darkArchetype: 'The Manipulator',
    synopsis: 'Scientific analysis of six universal weapons of automatic compliance and social proof.',
  },
  {
    title: 'The Art of Seduction',
    author: 'Robert Greene',
    chapters: 24,
    borrowStatus: 'borrowed' as BorrowStatus,
    coverUrl: 'https://covers.openlibrary.org/b/id/8231991-L.jpg',
    directBookUrl: 'https://openlibrary.org/works/OL2728445W',
    darkArchetype: 'The Manipulator',
    synopsis: 'Psychological examination of interpersonal attraction, charm, and emotional influence.',
  },
  {
    title: 'Crime and Punishment',
    author: 'Fyodor Dostoevsky',
    chapters: 39,
    borrowStatus: 'available' as BorrowStatus,
    coverUrl: 'https://covers.openlibrary.org/b/id/8235116-L.jpg',
    directBookUrl: 'https://openlibrary.org/works/OL1168007W',
    darkArchetype: 'The Shadow',
    synopsis: 'Psychological torment, guilt, morality, and the internal struggle of the extraordinary man theory.',
  },
];

export const ReadingSessionModal: React.FC<ReadingSessionModalProps> = ({
  isOpen,
  onClose,
  initialBook,
  curatedBooks = [],
  onCreateSession,
}) => {
  const { user } = useAuth();

  const [bookTitle, setBookTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalChapters, setTotalChapters] = useState<number>(12);
  const [targetFinishDate, setTargetFinishDate] = useState('');
  const [borrowStatus, setBorrowStatus] = useState<BorrowStatus>('available');
  const [coverUrl, setCoverUrl] = useState('');
  const [directBookUrl, setDirectBookUrl] = useState('');
  const [clubNote, setClubNote] = useState('');
  const [darkArchetype, setDarkArchetype] = useState('The Shadow');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill fields whenever initialBook changes or modal opens
  useEffect(() => {
    if (initialBook) {
      setBookTitle(initialBook.title || '');
      const authorName = Array.isArray((initialBook as any).author_name)
        ? (initialBook as any).author_name[0]
        : (initialBook as any).author || '';
      setAuthor(authorName);

      const cover =
        (initialBook as any).coverUrl ||
        ((initialBook as any).cover_i
          ? `https://covers.openlibrary.org/b/id/${(initialBook as any).cover_i}-L.jpg`
          : (initialBook as any).isbn?.[0]
          ? `https://covers.openlibrary.org/b/isbn/${(initialBook as any).isbn[0].replace(/[-\s]/g, '')}-L.jpg`
          : '');
      setCoverUrl(cover);

      const key = (initialBook as any).openLibraryKey || (initialBook as any).key || '';
      if (key) {
        setDirectBookUrl(
          key.startsWith('http')
            ? key
            : key.startsWith('/')
            ? `https://openlibrary.org${key}`
            : key.startsWith('OL') && key.endsWith('M')
            ? `https://openlibrary.org/books/${key}`
            : `https://openlibrary.org/works/${key}`
        );
      } else {
        setDirectBookUrl('');
      }

      setClubNote((initialBook as any).synopsis || (initialBook as any).curatorNotes || '');
      if ((initialBook as any).darkArchetype) {
        setDarkArchetype((initialBook as any).darkArchetype);
      }
    } else {
      // Reset defaults
      setBookTitle('');
      setAuthor('');
      setTotalChapters(12);
      setTargetFinishDate('');
      setBorrowStatus('available');
      setCoverUrl('');
      setDirectBookUrl('');
      setClubNote('');
    }
    setError(null);
    setSuccess(false);
  }, [initialBook, isOpen]);

  if (!isOpen) return null;

  const handleQuickPick = (item: typeof POPULAR_QUICK_PICKS[0]) => {
    setBookTitle(item.title);
    setAuthor(item.author);
    setTotalChapters(item.chapters);
    setBorrowStatus(item.borrowStatus);
    setCoverUrl(item.coverUrl);
    setDirectBookUrl(item.directBookUrl);
    setDarkArchetype(item.darkArchetype);
    setClubNote(item.synopsis);
  };

  const generateInviteCode = () => {
    const prefix = bookTitle.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '') || 'SANCT';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randNum}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Strict logical validation
    if (!bookTitle.trim()) {
      setError('Book Title is required to establish a reading circle session.');
      return;
    }
    if (!author.trim()) {
      setError('Author is required.');
      return;
    }
    if (totalChapters <= 0 || isNaN(totalChapters)) {
      setError('Total Chapters must be a positive integer.');
      return;
    }

    const hostName = user?.name || 'Sanctuary Scholar';
    const hostEmail = user?.email || 'guest@sanctuary.io';

    const newSession: ReadingSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bookTitle: bookTitle.trim(),
      author: author.trim(),
      totalChapters: Number(totalChapters),
      currentChapter: 1,
      targetFinishDate: targetFinishDate || undefined,
      borrowStatus,
      coverUrl: coverUrl.trim() || undefined,
      directBookUrl: directBookUrl.trim() || undefined,
      clubNote: clubNote.trim() || undefined,
      hostedBy: hostName,
      hostEmail,
      hostRole: user?.role || 'member',
      hostAvatar: user?.avatarUrl,
      inviteCode: generateInviteCode(),
      membersCount: 1,
      joinedUserEmails: [hostEmail],
      createdAt: new Date().toISOString(),
      darkArchetype,
      status: 'active',
    };

    onCreateSession(newSession);
    setSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0d0d14] border border-white/10 rounded-2xl p-5 md:p-7 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-950 via-amber-600/70 to-zinc-900" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-950/60 border border-red-800/40 text-red-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-zinc-100 font-display">
                Start a Reading Session · Create Circle
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Establish an active reading cohort connected to Open Library catalog
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto pr-1 space-y-4 flex-1 mt-4">
          {error && (
            <div className="p-3 text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Reading Session initialized and published to Sanctuary Circles.</span>
            </div>
          )}

          {/* Connected User / Library Email Sync Badge */}
          <div className="p-2.5 rounded-xl bg-[#12121b] border border-white/5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Library className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-zinc-400">Host / Library Sync Email:</span>
              <span className="font-mono text-zinc-200 font-medium">{user?.email || 'guest@sanctuary.io'}</span>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40 font-mono">
              Synced
            </span>
          </div>

          {/* 1. Quick Pick Popular Books */}
          <div className="p-3 rounded-xl bg-[#12121b] border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick pick popular books:</span>
              </span>
              <span className="text-[10px] text-zinc-500">1-Click Auto Fill</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {POPULAR_QUICK_PICKS.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => handleQuickPick(item)}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-[#181824] hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer truncate max-w-[190px]"
                  title={`${item.title} by ${item.author}`}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Core Book Information: Book Title & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-red-400" />
                <span>Book Title *</span>
              </label>
              <input
                type="text"
                required
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="e.g. The 48 Laws of Power"
                className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-xl focus:outline-none focus:border-red-600/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Author *</label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Robert Greene"
                className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-xl focus:outline-none focus:border-red-600/60 transition-colors"
              />
            </div>
          </div>

          {/* 3. Total Chapters, Target Finish Date & Borrow Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <span>Total Chapters *</span>
              </label>
              <input
                type="number"
                min="1"
                max="300"
                required
                value={totalChapters}
                onChange={(e) => setTotalChapters(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-xl focus:outline-none focus:border-red-600/60 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>Target finish Date (Optional)</span>
              </label>
              <input
                type="date"
                value={targetFinishDate}
                onChange={(e) => setTargetFinishDate(e.target.value)}
                className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-xl focus:outline-none focus:border-red-600/60 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                <BookmarkCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span>Borrow status *</span>
              </label>
              <select
                value={borrowStatus}
                onChange={(e) => setBorrowStatus(e.target.value as BorrowStatus)}
                className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-xl focus:outline-none focus:border-red-600/60 transition-colors"
              >
                <option value="available">Available in Library</option>
                <option value="borrowed">Borrowed (Checked Out)</option>
                <option value="reserved">Reserved in Sanctuary</option>
                <option value="in_library">Sanctuary Archive</option>
              </select>
            </div>
          </div>

          {/* 4. Book Cover Artwork URL (Optional) & Direct Book URL (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Book Cover Artwork URL (Optional)</span>
              </label>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://covers.openlibrary.org/b/id/..."
                className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-xl focus:outline-none focus:border-red-600/60 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Direct Book URL (Optional)</span>
              </label>
              <input
                type="url"
                value={directBookUrl}
                onChange={(e) => setDirectBookUrl(e.target.value)}
                placeholder="https://openlibrary.org/works/OL..."
                className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-xl focus:outline-none focus:border-red-600/60 transition-colors font-mono"
              />
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 italic">
            Direct Book URL allows members who join the reading session to click and jump directly to the Open Library reading/borrow page.
          </p>

          {/* Cover Preview & Archetype Badge */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#12121c] border border-white/5">
            <div className="w-12 h-16 rounded-lg bg-black border border-white/10 overflow-hidden shrink-0">
              <img
                src={coverUrl || '/src/assets/images/reading_circle_dramatic_1790432613396.jpg'}
                alt="Cover Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex-1 text-xs">
              <div className="text-zinc-200 font-semibold">{bookTitle || 'Book Title Preview'}</div>
              <div className="text-zinc-400 text-[11px]">{author || 'Author Preview'}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 text-[10px] border border-amber-900/40 font-medium">
                  {darkArchetype}
                </span>
                {borrowStatus === 'borrowed' ? (
                  <span className="px-2 py-0.5 rounded bg-red-950/70 text-red-300 text-[10px] border border-red-800/60 font-semibold flex items-center gap-1">
                    <BookMarked className="w-2.5 h-2.5" />
                    <span>Borrowed Status Active</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-300 text-[10px] border border-emerald-800/40">
                    Available in Library
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 5. Club Note / Reading Synopsis (Optional) */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Club Note / Reading synopsis (Optional)</span>
            </label>
            <textarea
              rows={3}
              value={clubNote}
              onChange={(e) => setClubNote(e.target.value)}
              placeholder="Outline reading agenda, chapter pacing, key questions or synopsis for the cohort..."
              className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-xl focus:outline-none focus:border-red-600/60 transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!bookTitle.trim() || !author.trim() || totalChapters <= 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-red-950 hover:bg-red-900 border border-red-800/60 rounded-xl shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Create Reading Session</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

