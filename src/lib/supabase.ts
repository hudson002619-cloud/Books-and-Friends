import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  SupabaseConfigState,
  AdminAuditRecord,
  DarkBook,
  BookDiscussion,
  DiscussionComment,
  ReadingSession,
  SessionMilestone,
  User,
  ReadingTimerState,
  VaultFilterState,
  BookClubThread,
  BookClubComment,
  MemberGoal,
} from '../types';

// Storage keys for persistent background state & LocalStorage caching
const SUPABASE_URL_KEY = 'bf_supabase_url';
const SUPABASE_KEY_KEY = 'bf_supabase_anon_key';
const LOCAL_BOOKS_KEY = 'bf_local_books_db';
const LOCAL_DELETED_BOOKS_KEY = 'bf_local_deleted_books_keys';
const LOCAL_INITIALIZED_KEY = 'bf_has_initialized_db';
const LOCAL_DISCUSSIONS_KEY = 'bf_local_discussions_db';
const LOCAL_SESSIONS_KEY = 'bf_local_reading_sessions_db';
const LOCAL_BOOK_CLUB_THREADS_KEY = 'bf_local_book_club_threads_db';
const LOCAL_MEMBER_GOALS_KEY = 'bf_local_member_goals_db';
const LOCAL_AUDIT_KEY = 'bf_local_audit_db';
const LOCAL_BOOKMARKS_KEY = 'bf_user_bookmarks';
const LOCAL_TIMER_KEY = 'bf_reading_timer_state';
const LOCAL_VAULT_FILTERS_KEY = 'bf_vault_filters_state';
const LOCAL_USER_PROFILES_KEY = 'bf_user_profiles_cache';

// =========================================================================
// DELETED BOOKS TOMBSTONE MANAGEMENT (Guarantees deleted records never resurrect)
// =========================================================================

export function getDeletedBookKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_BOOKS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map((s: string) => String(s).toLowerCase().trim()) : []);
  } catch {
    return new Set();
  }
}

export function saveDeletedBookKeys(keys: Set<string>) {
  try {
    localStorage.setItem(LOCAL_DELETED_BOOKS_KEY, JSON.stringify(Array.from(keys)));
  } catch (e) {
    console.warn('[Supabase] Error saving deleted book keys:', e);
  }
}

export function addDeletedBookKey(id?: string, openLibraryKey?: string, title?: string) {
  const current = getDeletedBookKeys();
  if (id) current.add(String(id).toLowerCase().trim());
  if (openLibraryKey) current.add(String(openLibraryKey).toLowerCase().trim());
  if (title) current.add(String(title).toLowerCase().trim());
  saveDeletedBookKeys(current);
}

export function removeDeletedBookKey(id?: string, openLibraryKey?: string, title?: string) {
  const current = getDeletedBookKeys();
  if (id) current.delete(String(id).toLowerCase().trim());
  if (openLibraryKey) current.delete(String(openLibraryKey).toLowerCase().trim());
  if (title) current.delete(String(title).toLowerCase().trim());
  saveDeletedBookKeys(current);
}

export function isBookDeleted(book: Partial<DarkBook> | any, deletedKeys?: Set<string>): boolean {
  if (!book) return false;
  const keys = deletedKeys || getDeletedBookKeys();
  if (keys.size === 0) return false;

  const id = book.id ? String(book.id).toLowerCase().trim() : '';
  const openLibraryKey = book.openLibraryKey
    ? String(book.openLibraryKey).toLowerCase().trim()
    : (book.open_library_key ? String(book.open_library_key).toLowerCase().trim() : '');
  const title = book.title ? String(book.title).toLowerCase().trim() : '';

  if (id && keys.has(id)) return true;
  if (openLibraryKey && keys.has(openLibraryKey)) return true;
  if (title && keys.has(title)) return true;

  return false;
}

// Initial Curated Book Club Threads
export const INITIAL_BOOK_CLUB_THREADS: BookClubThread[] = [
  {
    id: 'thread_jung_shadow_01',
    bookId: 'book_archetypes',
    bookTitle: 'The Archetypes and The Collective Unconscious',
    bookAuthor: 'Carl Gustav Jung',
    coverUrl: 'https://covers.openlibrary.org/b/id/6979841-L.jpg',
    authorName: 'A. D. Hudson (Developer Admin)',
    authorEmail: 'adhudson504@gmail.com',
    authorRole: 'admin',
    authorAvatar: '/src/assets/images/profile_avatar_scholar_1790432624462.jpg',
    category: 'chapter_note',
    chapterNumber: 3,
    title: 'Chapter 3 Breakdown: The Shadow as Psychic Substratum',
    content: 'In Chapter 3, Jung clarifies that the Shadow is not merely evil or chaotic; it is 90% pure unrefined gold—instinctual creativity, vital energy, and unyielding will suppressed by societal conditioning. Denying it breeds explosive projections in group dynamics.',
    keyTakeaway: 'The shadow is only hostile when ignored or demonized. Integration transforms latent aggression into articulate authority.',
    archetypeTag: 'The Shadow',
    tags: ['Shadow Integration', 'Jungian Analysis', 'Archetypes', 'Chapter 3'],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    pinned: true,
    reactions: { '👁️': 24, '💡': 19, '🔥': 14, '⚖️': 9, '📌': 7 },
    userReactions: {
      '👁️': ['adhudson504@gmail.com', 'helena.vance@sanctuary.io'],
      '💡': ['helena.vance@sanctuary.io'],
      '🔥': ['julian.sterling@readingcircle.org'],
    },
    commentsCount: 3,
    comments: [
      {
        id: 'comm_bc_1',
        threadId: 'thread_jung_shadow_01',
        authorName: 'Helena Vance',
        authorEmail: 'helena.vance@sanctuary.io',
        authorRole: 'scholar',
        content: 'This explains why overly agreeable people experience sudden uncontrollable resentment. The shadow demands conscious expression.',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        reactions: { '💡': 8, '👁️': 5 },
        userReactions: { '💡': ['adhudson504@gmail.com'] },
      },
      {
        id: 'comm_bc_2',
        threadId: 'thread_jung_shadow_01',
        authorName: 'Julian Sterling',
        authorEmail: 'julian.sterling@readingcircle.org',
        authorRole: 'member',
        content: 'Fascinating correlation with Greene’s Law 38. The outer persona remains compliant, while the shadow strategizes in the background.',
        createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        replyToAuthor: 'Helena Vance',
        reactions: { '🔥': 6, '⚖️': 4 },
        userReactions: { '🔥': ['helena.vance@sanctuary.io'] },
      }
    ]
  },
  {
    id: 'thread_48laws_law16',
    bookId: 'book_48_laws',
    bookTitle: 'The 48 Laws of Power',
    bookAuthor: 'Robert Greene',
    coverUrl: 'https://covers.openlibrary.org/b/id/8231856-L.jpg',
    authorName: 'Helena Vance',
    authorEmail: 'helena.vance@sanctuary.io',
    authorRole: 'scholar',
    category: 'perspective',
    chapterNumber: 16,
    title: 'Perspective: The Psychological Mechanics of Strategic Absence (Law 16)',
    content: 'Too much circulation makes the price go down. The more you are seen and heard from, the more common you appear. When an established presence temporarily withdraws, respect multiplies through cognitive scarcity.',
    keyTakeaway: 'Create value through deliberate scarcity. Let your silence compel others to seek your counsel.',
    archetypeTag: 'The Strategist',
    tags: ['Law 16', 'Scarcity Bias', 'Social Power', 'Strategic Absence'],
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    pinned: false,
    reactions: { '💡': 31, '👁️': 18, '🔥': 11, '⚖️': 8, '📌': 12 },
    userReactions: {
      '💡': ['adhudson504@gmail.com', 'julian.sterling@readingcircle.org'],
      '📌': ['adhudson504@gmail.com'],
    },
    commentsCount: 2,
    comments: [
      {
        id: 'comm_bc_3',
        threadId: 'thread_48laws_law16',
        authorName: 'A. D. Hudson (Developer Admin)',
        authorEmail: 'adhudson504@gmail.com',
        authorRole: 'admin',
        authorAvatar: '/src/assets/images/profile_avatar_scholar_1790432624462.jpg',
        content: 'Precisely. In negotiation theory, this is the power of the empty chair. The party who fears absence less controls the frame.',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        reactions: { '👁️': 15, '💡': 11 },
        userReactions: { '👁️': ['helena.vance@sanctuary.io'] },
      }
    ]
  },
  {
    id: 'thread_cialdini_reciprocity',
    bookId: 'book_influence',
    bookTitle: 'Influence: The Psychology of Persuasion',
    bookAuthor: 'Robert B. Cialdini',
    coverUrl: 'https://covers.openlibrary.org/b/id/10543628-L.jpg',
    authorName: 'Julian Sterling',
    authorEmail: 'julian.sterling@readingcircle.org',
    authorRole: 'member',
    category: 'post_book',
    chapterNumber: 2,
    title: 'Post-Book Reflection: Weaponized Reciprocity & Subconscious Debt',
    content: 'Having finished Cialdini’s deep dive, the most chilling weapon is the uninvited favor. Humans harbor such an intense evolutionary aversion to being perceived as freeloaders that an unsolicited minor gesture can extract major concessions.',
    keyTakeaway: 'Identify unasked favors early. Reframe them mentally as sales tactics rather than genuine gifts.',
    archetypeTag: 'The Manipulator',
    tags: ['Influence', 'Reciprocity Traps', 'Behavioral Defense', 'Cialdini'],
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    pinned: false,
    reactions: { '👁️': 20, '💡': 16, '🔥': 9, '⚖️': 14, '📌': 5 },
    userReactions: {
      '⚖️': ['adhudson504@gmail.com'],
      '👁️': ['helena.vance@sanctuary.io'],
    },
    commentsCount: 1,
    comments: []
  }
];

// Initial Member Goals for community accountability
export const INITIAL_MEMBER_GOALS: MemberGoal[] = [
  {
    id: 'goal_1',
    userEmail: 'adhudson504@gmail.com',
    userName: 'A. D. Hudson (Dev Admin)',
    userAvatar: '/src/assets/images/profile_avatar_scholar_1790432624462.jpg',
    bookTitle: 'The 48 Laws of Power',
    targetChapters: 48,
    completedChapters: 28,
    deadline: '2026-11-15',
    reflectionNote: 'Dissecting laws 20-35 on psychological unpredictability and reputation shielding.',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'goal_2',
    userEmail: 'helena.vance@sanctuary.io',
    userName: 'Helena Vance',
    bookTitle: 'The Archetypes and The Collective Unconscious',
    targetChapters: 12,
    completedChapters: 8,
    deadline: '2026-10-30',
    reflectionNote: 'Writing comprehensive thesis on archetypal symbols in modern literature.',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'goal_3',
    userEmail: 'julian.sterling@readingcircle.org',
    userName: 'Julian Sterling',
    bookTitle: 'Influence: The Psychology of Persuasion',
    targetChapters: 8,
    completedChapters: 8,
    deadline: '2026-09-25',
    reflectionNote: 'Completed all 6 influence weapons with defense protocols cataloged.',
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
  }
];

// Initial Curated Reading Sessions for the book club
export const INITIAL_READING_SESSIONS: ReadingSession[] = [
  {
    id: 'session_48_laws',
    bookId: 'book_48_laws',
    bookTitle: 'The 48 Laws of Power',
    author: 'Robert Greene',
    totalChapters: 48,
    currentChapter: 16,
    targetFinishDate: '2026-11-15',
    borrowStatus: 'in_library',
    coverUrl: 'https://covers.openlibrary.org/b/id/8231856-L.jpg',
    directBookUrl: 'https://openlibrary.org/books/OL24364998M',
    clubNote: 'Focus on Machiavellian defense mechanisms and modern social power dynamics. 3 chapters examined weekly.',
    hostedBy: 'A. D. Hudson (Developer Admin)',
    hostEmail: 'adhudson504@gmail.com',
    hostRole: 'admin',
    hostAvatar: '/src/assets/images/profile_avatar_scholar_1790432624462.jpg',
    inviteCode: 'SANCT-4819',
    membersCount: 18,
    joinedUserEmails: ['adhudson504@gmail.com', 'helena.vance@sanctuary.io'],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    darkArchetype: 'The Strategist',
    status: 'active',
    lastActivityAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    milestones: [
      {
        id: 'ms_1',
        chapter: 1,
        note: 'Never Outshine the Master: Psychological vulnerability dissection completed.',
        loggedBy: 'A. D. Hudson',
        loggedByAvatar: '/src/assets/images/profile_avatar_scholar_1790432624462.jpg',
        timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: 'ms_2',
        chapter: 4,
        note: 'Always Say Less Than Necessary: Discourse and silence negotiation tactics.',
        loggedBy: 'A. D. Hudson',
        loggedByAvatar: '/src/assets/images/profile_avatar_scholar_1790432624462.jpg',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      }
    ]
  },
  {
    id: 'session_archetypes',
    bookId: 'book_archetypes',
    bookTitle: 'The Archetypes and The Collective Unconscious',
    author: 'Carl Gustav Jung',
    totalChapters: 12,
    currentChapter: 4,
    targetFinishDate: '2026-10-30',
    borrowStatus: 'borrowed',
    coverUrl: 'https://covers.openlibrary.org/b/id/6979841-L.jpg',
    directBookUrl: 'https://openlibrary.org/works/OL26333555M',
    clubNote: 'Deep psychological dissection into the Shadow self, confrontation techniques, and unconscious archetypes.',
    hostedBy: 'Helena Vance',
    hostEmail: 'helena.vance@sanctuary.io',
    hostRole: 'scholar',
    inviteCode: 'JUNG-9021',
    membersCount: 14,
    joinedUserEmails: ['helena.vance@sanctuary.io', 'julian.sterling@readingcircle.org'],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    darkArchetype: 'The Shadow',
    status: 'active',
    lastActivityAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    milestones: [
      {
        id: 'ms_jung_1',
        chapter: 2,
        note: 'Archetypes as autonomous psychic structures: shadow projection analysis.',
        loggedBy: 'Helena Vance',
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
      }
    ]
  },
  {
    id: 'session_influence',
    bookId: 'book_influence',
    bookTitle: 'Influence: The Psychology of Persuasion',
    author: 'Robert B. Cialdini',
    totalChapters: 8,
    currentChapter: 2,
    targetFinishDate: '2026-11-01',
    borrowStatus: 'available',
    coverUrl: 'https://covers.openlibrary.org/b/id/10543628-L.jpg',
    directBookUrl: 'https://openlibrary.org/works/OL27204918M',
    clubNote: 'Analyzing weaponized cognitive biases, social proof, and reciprocal compliance traps.',
    hostedBy: 'Julian Sterling',
    hostEmail: 'julian.sterling@readingcircle.org',
    hostRole: 'member',
    inviteCode: 'INFL-7734',
    membersCount: 9,
    joinedUserEmails: ['julian.sterling@readingcircle.org'],
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    darkArchetype: 'The Manipulator',
    status: 'active',
    lastActivityAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    milestones: [
      {
        id: 'ms_infl_1',
        chapter: 1,
        note: 'Weapons of Automatic Influence: Fixed-action patterns dissected.',
        loggedBy: 'Julian Sterling',
        timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
      }
    ]
  },
];

// Initial curated dark psychology books for the sanctuary
export const INITIAL_DARK_BOOKS: DarkBook[] = [
  {
    id: 'book_48_laws',
    openLibraryKey: 'OL24364998M',
    title: 'The 48 Laws of Power',
    author: 'Robert Greene',
    coverUrl: 'https://covers.openlibrary.org/b/id/8231856-L.jpg',
    firstPublishYear: 1998,
    subjects: ['Psychology', 'Power', 'Philosophy', 'Strategy', 'Human Nature'],
    darkArchetype: 'The Strategist',
    synopsis: 'Amoral, cunning, ruthless, and instructive, this multi-million-copy New York Times bestseller is the definitive manual for anyone interested in gaining, observing, or defending against ultimate control.',
    curatorNotes: 'Crucial reading for identifying covert power dynamics in social circles.',
    rating: 4.8,
    addedBy: 'adhudson504@gmail.com',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    discussionCount: 14,
    status: 'featured',
  },
  {
    id: 'book_archetypes',
    openLibraryKey: 'OL26333555M',
    title: 'The Archetypes and The Collective Unconscious',
    author: 'Carl Gustav Jung',
    coverUrl: 'https://covers.openlibrary.org/b/id/6979841-L.jpg',
    firstPublishYear: 1959,
    subjects: ['Analytical Psychology', 'Shadow Self', 'Unconscious', 'Mythology'],
    darkArchetype: 'The Shadow',
    synopsis: 'Jungian psychology foundational treatise exploring the archetypes that inhabit the deepest subterranean layers of the human psyche, including the confrontational Shadow.',
    curatorNotes: 'Essential for shadow integration and psychoanalytic discussion circles.',
    rating: 4.9,
    addedBy: 'adhudson504@gmail.com',
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    discussionCount: 22,
    status: 'reading',
  },
  {
    id: 'book_prince',
    openLibraryKey: 'OL25418430M',
    title: 'The Prince',
    author: 'Niccolò Machiavelli',
    coverUrl: 'https://covers.openlibrary.org/b/id/8741362-L.jpg',
    firstPublishYear: 1532,
    subjects: ['Political Philosophy', 'Machiavellianism', 'Statecraft', 'Pragmatism'],
    darkArchetype: 'The Sovereign',
    synopsis: 'A groundbreaking renaissance treatise on political realism, analyzing how power is acquired, maintained, and wielded without sentimental moral delusions.',
    curatorNotes: 'A classic archetype study on realpolitik and calculated statecraft.',
    rating: 4.7,
    addedBy: 'adhudson504@gmail.com',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    discussionCount: 9,
    status: 'archive',
  },
  {
    id: 'book_influence',
    openLibraryKey: 'OL27204918M',
    title: 'Influence: The Psychology of Persuasion',
    author: 'Robert B. Cialdini',
    coverUrl: 'https://covers.openlibrary.org/b/id/10543628-L.jpg',
    firstPublishYear: 1984,
    subjects: ['Social Psychology', 'Cognitive Bias', 'Persuasion', 'Compliance'],
    darkArchetype: 'The Manipulator',
    synopsis: 'The foundational scientific investigation into the six universal weapons of automatic compliance and psychological influence.',
    curatorNotes: 'Key defense mechanism against algorithmic and interpersonal coercion.',
    rating: 4.85,
    addedBy: 'adhudson504@gmail.com',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    discussionCount: 17,
    status: 'reading',
  }
];

export const INITIAL_DISCUSSIONS: BookDiscussion[] = [
  {
    id: 'disc_1',
    bookId: 'book_archetypes',
    bookTitle: 'The Archetypes and The Collective Unconscious',
    authorName: 'A. D. Hudson (Developer Admin)',
    authorEmail: 'adhudson504@gmail.com',
    authorRole: 'admin',
    authorAvatar: '/src/assets/images/profile_avatar_scholar_1790432624462.jpg',
    title: 'Shadow Projection in Modern Digital Hierarchies',
    content: 'When an individual refuses to acknowledge their predatory impulses, Jung posits that those impulses do not vanish; rather, they are projected onto perceived ideological rivals. In our digital book salon, how do we observe this in contemporary debate?',
    archetypeTag: 'The Shadow',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    upvotes: 28,
    upvotedByEmails: ['helena.vance@sanctuary.io', 'julian.sterling@readingcircle.org'],
    pinned: true,
    comments: [
      {
        id: 'comm_1',
        discussionId: 'disc_1',
        authorName: 'Helena Vance',
        authorEmail: 'helena.vance@sanctuary.io',
        authorRole: 'scholar',
        content: 'Echoing Law 38 from Greene: "Think as you like but behave like others". The shadow becomes more dangerous when wrapped in moral virtue signaling.',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        likes: 12,
        likedByEmails: ['adhudson504@gmail.com'],
      },
      {
        id: 'comm_2',
        discussionId: 'disc_1',
        authorName: 'Julian Sterling',
        authorEmail: 'julian.sterling@readingcircle.org',
        authorRole: 'member',
        content: 'The antidote is ruthless self-inquiry before external accusation. Jung called it the hardest psychological labor.',
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        likes: 7,
        likedByEmails: ['helena.vance@sanctuary.io'],
      }
    ]
  },
  {
    id: 'disc_2',
    bookId: 'book_48_laws',
    bookTitle: 'The 48 Laws of Power',
    authorName: 'Marcus Thorne',
    authorEmail: 'marcus.t@academia.edu',
    authorRole: 'scholar',
    title: 'Deconstructing Law 4: Always Say Less Than Necessary',
    content: 'Silence creates a vacuum that humans instinctively feel compelled to fill. In negotiations, verbal restraint transforms ordinary commentary into calculated gravity.',
    archetypeTag: 'The Strategist',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    upvotes: 19,
    upvotedByEmails: ['adhudson504@gmail.com'],
    comments: []
  }
];

// Default Active Supabase Configuration
export const DEFAULT_SUPABASE_URL = 'https://enxcpgofxzdiyvjfvurw.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_D1Tqnk6xFWOfLR6D9qiVMw_nruUrc9p';

// Helper to mask key
export function maskKey(key: string): string {
  if (!key || key.length < 10) return '••••••••••••';
  return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
}

// Get configured credentials
export function getStoredSupabaseCredentials() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  
  const customUrl = (localStorage.getItem(SUPABASE_URL_KEY) || '').trim();
  const customKey = (localStorage.getItem(SUPABASE_KEY_KEY) || '').trim();

  const url = customUrl || envUrl || DEFAULT_SUPABASE_URL;
  const anonKey = customKey || envKey || DEFAULT_SUPABASE_ANON_KEY;

  return { url, anonKey, isCustom: Boolean(customUrl || customKey) };
}

// Save custom credentials
export function saveCustomSupabaseCredentials(url: string, anonKey: string) {
  if (url) localStorage.setItem(SUPABASE_URL_KEY, url.trim());
  else localStorage.removeItem(SUPABASE_URL_KEY);

  if (anonKey) localStorage.setItem(SUPABASE_KEY_KEY, anonKey.trim());
  else localStorage.removeItem(SUPABASE_KEY_KEY);
  
  // Clear cached client instance to recreate with new configuration
  supabaseClientInstance = null;
}

// Initialize Client
let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseCredentials();
  if (!url || !anonKey) return null;

  try {
    if (!supabaseClientInstance) {
      supabaseClientInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
    }
    return supabaseClientInstance;
  } catch (err) {
    console.warn('[Supabase] Client instantiation error:', err);
    return null;
  }
}

// Connection Validator
export async function validateSupabaseConnection(): Promise<SupabaseConfigState> {
  const { url, anonKey } = getStoredSupabaseCredentials();
  const cleanUrl = (url || '').trim().replace(/\/$/, '');
  const cleanKey = (anonKey || '').trim();
  const startTime = performance.now();

  const baseState: SupabaseConfigState = {
    isConfigured: Boolean(cleanUrl && cleanKey),
    isConnected: false,
    isValidating: true,
    url: cleanUrl,
    anonKey: cleanKey,
    maskedKey: maskKey(cleanKey),
    latencyMs: null,
    error: null,
    mode: 'local_fallback',
    checkedAt: new Date().toISOString(),
  };

  if (!cleanUrl || !cleanKey) {
    baseState.isValidating = false;
    baseState.error = 'No Supabase credentials configured. Running in persistent Sanctuary Client-Side Database Engine.';
    return baseState;
  }

  try {
    const parsed = new URL(cleanUrl);
    if (!parsed.protocol.startsWith('http')) {
      throw new Error('Supabase URL must use http:// or https://');
    }
  } catch (e: any) {
    baseState.isValidating = false;
    baseState.error = `Invalid Supabase Project URL format: ${e.message}`;
    return baseState;
  }

  try {
    // 1. Try GoTrue Auth Health or REST endpoint
    let isAlive = false;
    let responseStatus = 0;
    let responseStatusText = '';

    try {
      const restResponse = await fetch(`${cleanUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': cleanKey,
          'Authorization': `Bearer ${cleanKey}`,
          'Accept': 'application/json',
        }
      });
      responseStatus = restResponse.status;
      responseStatusText = restResponse.statusText;

      if (restResponse.ok || restResponse.status === 200 || restResponse.status === 404 || restResponse.status === 300) {
        isAlive = true;
      }
    } catch {
      // Try auth health fallback
    }

    if (!isAlive) {
      try {
        const authResponse = await fetch(`${cleanUrl}/auth/v1/health`, {
          method: 'GET',
          headers: {
            'apikey': cleanKey,
          }
        });
        if (authResponse.ok || authResponse.status === 200) {
          isAlive = true;
        } else if (responseStatus === 0) {
          responseStatus = authResponse.status;
          responseStatusText = authResponse.statusText;
        }
      } catch {
        // network error
      }
    }

    const elapsed = Math.round(performance.now() - startTime);

    if (isAlive) {
      baseState.isConnected = true;
      baseState.isValidating = false;
      baseState.latencyMs = elapsed;
      baseState.mode = 'live';
      baseState.error = null;
    } else if (responseStatus === 401) {
      baseState.isValidating = false;
      baseState.latencyMs = elapsed;
      baseState.error = `HTTP 401 Unauthorized: The Supabase Anon Key is invalid or does not match this project. Please copy the exact Project URL and "anon" Public Key from Supabase Dashboard > Project Settings > API.`;
      baseState.mode = 'local_fallback';
    } else if (responseStatus > 0) {
      baseState.isValidating = false;
      baseState.latencyMs = elapsed;
      baseState.error = `Server responded with status HTTP ${responseStatus} (${responseStatusText || 'Check Supabase configuration'}). Running in local persistent mode.`;
      baseState.mode = 'local_fallback';
    } else {
      baseState.isValidating = false;
      baseState.latencyMs = elapsed;
      baseState.error = `Connection Failed: Unable to reach host "${cleanUrl}". Please check that the URL is correct and active.`;
      baseState.mode = 'local_fallback';
    }
  } catch (err: any) {
    baseState.isValidating = false;
    baseState.latencyMs = Math.round(performance.now() - startTime);
    baseState.error = `Network connection failed: ${err.message || 'Unable to connect to host'}`;
    baseState.mode = 'local_fallback';
  }

  return baseState;
}

// =========================================================================
// SUPABASE REAL PERSISTENCE & BIDIRECTIONAL SYNC ENGINE
// =========================================================================

export type CloudSyncStatus = 'synced' | 'diverged' | 'syncing' | 'offline';

let currentCloudSyncStatus: CloudSyncStatus = 'synced';
const syncListeners = new Set<(status: CloudSyncStatus) => void>();

export function getCloudSyncStatus(): CloudSyncStatus {
  return currentCloudSyncStatus;
}

export function setCloudSyncStatus(status: CloudSyncStatus) {
  currentCloudSyncStatus = status;
  syncListeners.forEach((listener) => {
    try {
      listener(status);
    } catch {
      // ignore
    }
  });
}

export function subscribeToCloudSyncStatus(callback: (status: CloudSyncStatus) => void): () => void {
  syncListeners.add(callback);
  callback(currentCloudSyncStatus);
  return () => {
    syncListeners.delete(callback);
  };
}

// Consolidate orphaned records (reading sessions, goals, discussions) into primary identity
export async function consolidateUserOrphanedRecords(
  email: string,
  userId: string,
  name?: string,
  avatarUrl?: string
): Promise<void> {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanEmail) return;

  const client = getSupabaseClient();
  if (!client) return;

  try {
    // 1. Consolidate reading sessions
    await client
      .from('reading_sessions')
      .update({
        host_id: userId,
        ...(name ? { hosted_by: name } : {}),
        ...(avatarUrl ? { host_avatar: avatarUrl } : {}),
      })
      .ilike('host_email', cleanEmail);

    // 2. Consolidate member goals
    await client
      .from('member_goals')
      .update({
        ...(name ? { user_name: name } : {}),
        ...(avatarUrl ? { user_avatar: avatarUrl } : {}),
      })
      .ilike('user_email', cleanEmail);

    // 3. Consolidate book discussions
    await client
      .from('discussions')
      .update({
        ...(name ? { author_name: name } : {}),
        ...(avatarUrl ? { author_avatar: avatarUrl } : {}),
      })
      .ilike('author_email', cleanEmail);

    // 4. Consolidate book club discussions
    await client
      .from('book_club_discussions')
      .update({
        author_id: userId,
        ...(name ? { author_name: name } : {}),
        ...(avatarUrl ? { author_avatar: avatarUrl } : {}),
      })
      .ilike('author_email', cleanEmail);

    // 5. Consolidate book club comments
    await client
      .from('book_club_comments')
      .update({
        author_id: userId,
        ...(name ? { author_name: name } : {}),
        ...(avatarUrl ? { author_avatar: avatarUrl } : {}),
      })
      .ilike('author_email', cleanEmail);
  } catch (err) {
    console.warn('[Supabase] Client-side orphan consolidation note:', err);
  }
}

// Books Persistence
export async function syncBooksFromSupabase(): Promise<DarkBook[]> {
  const local = getLocalBooks();
  const deletedKeys = getDeletedBookKeys();
  const client = getSupabaseClient();
  if (!client) {
    setCloudSyncStatus('offline');
    return local;
  }

  try {
    const { data, error } = await client
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Failed to sync books from remote cluster:', error);
      setCloudSyncStatus('diverged');
      return local;
    }

    if (!data || data.length === 0) {
      // Remote is empty, seed active non-deleted local books to Supabase
      if (local.length > 0) {
        for (const b of local) {
          if (!isBookDeleted(b, deletedKeys)) {
            persistBookToSupabase(b).catch(() => {});
          }
        }
      }
      return local;
    }

    // Process remote rows
    const remoteBooks: DarkBook[] = [];

    for (const row of data) {
      const mapped: DarkBook = {
        id: row.id || `bk_${Date.now()}`,
        openLibraryKey: row.open_library_key,
        title: row.title,
        author: row.author,
        coverUrl: row.cover_url,
        firstPublishYear: row.first_publish_year,
        subjects: row.subjects || [],
        darkArchetype: row.dark_archetype || 'The Strategist',
        synopsis: row.synopsis || '',
        curatorNotes: row.curator_notes || '',
        rating: Number(row.rating) || 4.8,
        addedBy: row.added_by || 'adhudson504@gmail.com',
        createdAt: row.created_at || new Date().toISOString(),
        discussionCount: Number(row.discussion_count) || 0,
        status: row.status || 'reading',
      };

      if (isBookDeleted(mapped, deletedKeys)) {
        if (row.id) client.from('books').delete().eq('id', row.id).then();
        if (row.open_library_key) client.from('books').delete().eq('open_library_key', row.open_library_key).then();
      } else {
        remoteBooks.push(mapped);
      }
    }

    // Clear stale local storage keys and strictly adopt the Supabase database as source of truth
    localStorage.removeItem(LOCAL_BOOKS_KEY);
    saveLocalBooks(remoteBooks);
    setCloudSyncStatus('synced');
    return remoteBooks;
  } catch (err) {
    console.warn('[Supabase] Failed to sync books from remote cluster, using local cache:', err);
    setCloudSyncStatus('diverged');
    return local;
  }
}

export async function persistBookToSupabase(book: DarkBook): Promise<void> {
  // Remove from deleted tombstone so it's active
  removeDeletedBookKey(book.id, book.openLibraryKey, book.title);

  // Update local cache
  const local = getLocalBooks();
  const index = local.findIndex(
    (b) =>
      b.id === book.id ||
      (book.openLibraryKey && b.openLibraryKey === book.openLibraryKey) ||
      b.title.toLowerCase() === book.title.toLowerCase()
  );

  let updatedList: DarkBook[];
  if (index >= 0) {
    updatedList = [...local];
    updatedList[index] = { ...updatedList[index], ...book };
  } else {
    updatedList = [book, ...local];
  }
  saveLocalBooks(updatedList);

  const client = getSupabaseClient();
  if (!client) return;

  try {
    const payload: any = {
      open_library_key: book.openLibraryKey,
      title: book.title,
      author: book.author,
      cover_url: book.coverUrl,
      first_publish_year: book.firstPublishYear,
      subjects: book.subjects || [],
      dark_archetype: book.darkArchetype,
      synopsis: book.synopsis,
      curator_notes: book.curatorNotes,
      rating: book.rating,
      added_by: book.addedBy || 'adhudson504@gmail.com',
      status: book.status,
      updated_at: new Date().toISOString(),
    };

    if (book.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(book.id)) {
      payload.id = book.id;
    }

    await client.from('books').upsert(payload, { onConflict: 'open_library_key' });
  } catch (err) {
    console.warn('[Supabase] Persist book error (safely retained in localStorage):', err);
  }
}

export async function deleteBookFromSupabase(
  target: DarkBook | { id: string; openLibraryKey?: string; title?: string } | string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();

  const id = typeof target === 'string' ? target : (target?.id || '');
  const openLibraryKey = typeof target === 'object' && target.openLibraryKey ? target.openLibraryKey : (typeof target === 'string' && !target.includes('-') ? target : '');
  const title = typeof target === 'object' && 'title' in target && target.title ? target.title : '';

  // 1. Permanently register in tombstone
  addDeletedBookKey(id, openLibraryKey, title);

  // 2. Immediately purge from local storage cache
  const local = getLocalBooks();
  const deletedKeys = getDeletedBookKeys();
  const filteredLocal = local.filter((b) => {
    if (isBookDeleted(b, deletedKeys)) return false;
    if (id && (b.id === id || b.openLibraryKey === id)) return false;
    if (openLibraryKey && (b.openLibraryKey === openLibraryKey || b.id === openLibraryKey)) return false;
    if (title && b.title.toLowerCase() === title.toLowerCase()) return false;
    return true;
  });
  saveLocalBooks(filteredLocal);

  // 3. Execute deletes across remote Supabase database
  if (client) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      if (isUuid) {
        await client.from('books').delete().eq('id', id);
      }
      if (openLibraryKey) {
        await client.from('books').delete().eq('open_library_key', openLibraryKey);
      }
      if (title) {
        await client.from('books').delete().ilike('title', title);
      }
      if (id && !isUuid) {
        await client.from('books').delete().eq('open_library_key', id);
      }
    } catch (err) {
      console.warn('[Supabase] Remote delete error (safely removed from local & tombstone):', err);
    }
  }

  return { success: true };
}

export async function deleteDiscussionFromSupabase(discussionId: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  const local = getLocalDiscussions();
  saveLocalDiscussions(local.filter((d) => d.id !== discussionId));

  if (!client) return { success: true };

  try {
    const { error } = await client.from('discussions').delete().eq('id', discussionId);
    if (error) {
      console.error('[Supabase] Delete discussion error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase] Delete discussion exception:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

// Discussions Persistence
export async function syncDiscussionsFromSupabase(): Promise<BookDiscussion[]> {
  const local = getLocalDiscussions();
  const client = getSupabaseClient();
  if (!client) {
    setCloudSyncStatus('offline');
    return local;
  }

  try {
    const { data: discussionsData, error: discErr } = await client
      .from('discussions')
      .select('*, comments(*)')
      .order('created_at', { ascending: false });

    if (discErr) {
      console.warn('[Supabase] Failed to sync discussions:', discErr);
      setCloudSyncStatus('diverged');
      return local;
    }

    if (!discussionsData || discussionsData.length === 0) {
      return local;
    }

    const mapped: BookDiscussion[] = discussionsData.map((d: any) => ({
      id: d.id,
      bookId: d.book_id || 'general',
      bookTitle: d.book_title || 'General Salon',
      authorName: d.author_name,
      authorEmail: d.author_email,
      authorRole: d.author_role || 'member',
      authorAvatar: d.author_avatar,
      title: d.title,
      content: d.content,
      archetypeTag: d.archetype_tag || 'The Shadow',
      createdAt: d.created_at,
      upvotes: Number(d.upvotes) || 1,
      upvotedByEmails: d.upvoted_by_emails || [],
      pinned: Boolean(d.pinned),
      comments: (d.comments || []).map((c: any) => ({
        id: c.id,
        discussionId: c.discussion_id || d.id,
        authorName: c.author_name,
        authorEmail: c.author_email,
        authorRole: c.author_role || 'member',
        authorAvatar: c.author_avatar,
        content: c.content,
        createdAt: c.created_at,
        likes: Number(c.likes) || 0,
        likedByEmails: c.liked_by_emails || [],
      })),
    }));

    // Clear stale local storage and store strictly remote database rows
    localStorage.removeItem(LOCAL_DISCUSSIONS_KEY);
    saveLocalDiscussions(mapped);
    setCloudSyncStatus('synced');
    return mapped;
  } catch (err) {
    console.warn('[Supabase] Failed to sync discussions, using local cache:', err);
    setCloudSyncStatus('diverged');
    return local;
  }
}

export async function persistDiscussionToSupabase(discussion: BookDiscussion): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('discussions').upsert({
      id: discussion.id.startsWith('disc_') ? undefined : discussion.id,
      book_title: discussion.bookTitle,
      author_name: discussion.authorName,
      author_email: discussion.authorEmail,
      author_role: discussion.authorRole,
      author_avatar: discussion.authorAvatar,
      title: discussion.title,
      content: discussion.content,
      archetype_tag: discussion.archetypeTag,
      upvotes: discussion.upvotes,
      upvoted_by_emails: discussion.upvotedByEmails || [],
    });
  } catch (err) {
    console.warn('[Supabase] Persist discussion error:', err);
  }
}

export async function persistCommentToSupabase(comment: DiscussionComment): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('comments').upsert({
      discussion_id: comment.discussionId,
      author_name: comment.authorName,
      author_email: comment.authorEmail,
      author_role: comment.authorRole,
      author_avatar: comment.authorAvatar,
      content: comment.content,
      likes: comment.likes,
      liked_by_emails: comment.likedByEmails || [],
    });
  } catch (err) {
    console.warn('[Supabase] Persist comment error:', err);
  }
}

// Reading Sessions Persistence
export async function syncSessionsFromSupabase(): Promise<ReadingSession[]> {
  const local = getLocalReadingSessions();
  const client = getSupabaseClient();
  if (!client) {
    setCloudSyncStatus('offline');
    return local;
  }

  try {
    const { data, error } = await client
      .from('reading_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Failed to sync sessions:', error);
      setCloudSyncStatus('diverged');
      return local;
    }

    if (!data || data.length === 0) {
      return local;
    }

    const mapped: ReadingSession[] = data.map((s: any) => ({
      id: s.id,
      bookId: s.book_id,
      bookTitle: s.book_title,
      author: s.author,
      totalChapters: Number(s.total_chapters) || 12,
      currentChapter: Number(s.current_chapter) || 1,
      targetFinishDate: s.target_finish_date,
      borrowStatus: s.borrow_status || 'available',
      coverUrl: s.cover_url,
      directBookUrl: s.direct_book_url,
      clubNote: s.club_note,
      hostedBy: s.hosted_by,
      hostEmail: s.host_email,
      hostRole: s.host_role || 'member',
      hostAvatar: s.host_avatar,
      inviteCode: s.invite_code,
      membersCount: Number(s.members_count) || 1,
      joinedUserEmails: s.joined_user_emails || [s.host_email],
      createdAt: s.created_at,
      darkArchetype: s.dark_archetype,
      status: s.status || 'active',
      milestones: s.milestones || [],
      lastActivityAt: s.last_activity_at || s.created_at,
    }));

    // Clear stale local storage and store strictly remote database rows
    localStorage.removeItem(LOCAL_SESSIONS_KEY);
    saveLocalReadingSessions(mapped);
    setCloudSyncStatus('synced');
    return mapped;
  } catch (err) {
    console.warn('[Supabase] Failed to sync sessions, using local cache:', err);
    setCloudSyncStatus('diverged');
    return local;
  }
}

export async function persistSessionToSupabase(session: ReadingSession): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('reading_sessions').upsert({
      book_title: session.bookTitle,
      author: session.author,
      total_chapters: session.totalChapters,
      current_chapter: session.currentChapter,
      target_finish_date: session.targetFinishDate,
      borrow_status: session.borrowStatus,
      cover_url: session.coverUrl,
      direct_book_url: session.directBookUrl,
      club_note: session.clubNote,
      hosted_by: session.hostedBy,
      host_email: session.hostEmail,
      host_role: session.hostRole,
      host_avatar: session.hostAvatar,
      invite_code: session.inviteCode,
      members_count: session.membersCount,
      joined_user_emails: session.joinedUserEmails,
      dark_archetype: session.darkArchetype,
      status: session.status,
      milestones: session.milestones,
      last_activity_at: session.lastActivityAt || new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Supabase] Persist session error:', err);
  }
}

export async function deleteSessionFromSupabase(sessionId: string): Promise<{ success: boolean; error?: string }> {
  const local = getLocalReadingSessions();
  saveLocalReadingSessions(local.filter((s) => s.id !== sessionId));

  const client = getSupabaseClient();
  if (!client) return { success: true };

  try {
    const { error } = await client.from('reading_sessions').delete().eq('id', sessionId);
    if (error) {
      console.error('[Supabase] Delete session error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase] Delete session exception:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

// User Profiles Cloud Database Engine & Multi-Device Sync
export function mapProfileRowToUser(row: any): User {
  const email = (row.email || '').toLowerCase().trim();
  const isAdminEmail = email === 'adhudson504@gmail.com';
  
  return {
    id: row.id || `usr_${email.replace(/[^a-z0-9]/gi, '_')}`,
    email,
    name: row.name || email.split('@')[0] || 'Sanctuary Scholar',
    role: isAdminEmail ? 'admin' : (row.role === 'admin' ? 'member' : (row.role || 'member')),
    avatarUrl: row.avatar_url || (isAdminEmail ? '/src/assets/images/profile_avatar_scholar_1790432624462.jpg' : undefined),
    bio: row.bio || (isAdminEmail ? 'Lead Architect & Developer Administrator of Books and Friends.' : 'Books and Friends reader & participant.'),
    archetypeAffinity: row.archetype_affinity || (isAdminEmail ? 'The Sovereign' : 'The Strategist'),
    favoriteBook: row.favorite_book || (isAdminEmail ? 'The 48 Laws of Power' : ''),
    readingGoalPerMonth: Number(row.reading_goal_per_month) || 3,
    booksReadCount: Number(row.books_read_count) || (isAdminEmail ? 48 : 0),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export async function fetchUserProfileByEmail(email: string): Promise<User | null> {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail) return null;

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (!error && data) {
        const user = mapProfileRowToUser(data);
        // Cache to local storage as secondary backup
        const profiles = getStoredUserProfiles();
        profiles[cleanEmail] = user;
        localStorage.setItem(LOCAL_USER_PROFILES_KEY, JSON.stringify(profiles));
        return user;
      }
    } catch (err) {
      console.warn('[Supabase] Failed to fetch profile from cloud database:', err);
    }
  }

  // Fallback to local cache if offline
  const profiles = getStoredUserProfiles();
  return profiles[cleanEmail] || null;
}

export async function fetchAllProfilesFromSupabase(): Promise<Record<string, User>> {
  const client = getSupabaseClient();
  const localProfiles = getStoredUserProfiles();
  if (!client) return localProfiles;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const mergedMap: Record<string, User> = { ...localProfiles };
      for (const row of data) {
        if (row.email) {
          const u = mapProfileRowToUser(row);
          mergedMap[u.email.toLowerCase()] = u;
        }
      }
      localStorage.setItem(LOCAL_USER_PROFILES_KEY, JSON.stringify(mergedMap));
      return mergedMap;
    }
  } catch (err) {
    console.warn('[Supabase] Failed to fetch all profiles:', err);
  }

  return localProfiles;
}

export async function persistUserProfileToSupabase(user: User): Promise<User> {
  const cleanEmail = user.email.toLowerCase().trim();
  const isAdminEmail = cleanEmail === 'adhudson504@gmail.com';

  // Optimistically cache locally
  const profiles = getStoredUserProfiles();
  const resolvedRole = isAdminEmail ? 'admin' : (user.role === 'admin' ? 'member' : user.role);
  const userToSave: User = {
    ...user,
    email: cleanEmail,
    role: resolvedRole,
  };
  profiles[cleanEmail] = userToSave;
  localStorage.setItem(LOCAL_USER_PROFILES_KEY, JSON.stringify(profiles));

  const client = getSupabaseClient();
  if (!client) return userToSave;

  try {
    const payload: any = {
      email: cleanEmail,
      name: userToSave.name,
      role: userToSave.role,
      avatar_url: userToSave.avatarUrl || null,
      bio: userToSave.bio || '',
      archetype_affinity: userToSave.archetypeAffinity || 'The Strategist',
      favorite_book: userToSave.favoriteBook || '',
      reading_goal_per_month: Number(userToSave.readingGoalPerMonth) || 3,
      books_read_count: Number(userToSave.booksReadCount) || 0,
      updated_at: new Date().toISOString(),
    };

    // If ID is a valid UUID, include it in payload
    if (userToSave.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userToSave.id)) {
      payload.id = userToSave.id;
    }

    const { data, error } = await client
      .from('profiles')
      .upsert(payload, { onConflict: 'email' })
      .select('*')
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Persist profile warning:', error);
      return userToSave;
    }

    if (data) {
      const canonicalUser = mapProfileRowToUser(data);
      profiles[cleanEmail] = canonicalUser;
      localStorage.setItem(LOCAL_USER_PROFILES_KEY, JSON.stringify(profiles));
      return canonicalUser;
    }
  } catch (err) {
    console.warn('[Supabase] Persist profile exception (safely cached):', err);
  }

  return userToSave;
}

export function subscribeToUserProfile(email: string, onUpdate: (user: User) => void): () => void {
  const client = getSupabaseClient();
  const cleanEmail = email.toLowerCase().trim();
  if (!client || !cleanEmail) return () => {};

  try {
    const channelName = `profile_live_${cleanEmail.replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `email=eq.${cleanEmail}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.email) {
            const updatedUser = mapProfileRowToUser(payload.new);
            // Update local storage cache
            const profiles = getStoredUserProfiles();
            profiles[cleanEmail] = updatedUser;
            localStorage.setItem(LOCAL_USER_PROFILES_KEY, JSON.stringify(profiles));
            onUpdate(updatedUser);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        client.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  } catch (e) {
    console.warn('[Supabase] Realtime profile subscription error:', e);
    return () => {};
  }
}

export function getStoredUserProfiles(): Record<string, User> {
  try {
    const raw = localStorage.getItem(LOCAL_USER_PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// =========================================================================
// LOCAL STORAGE PERSISTENCE ENGINE (BACKGROUND EXECUTION & RETENTION)
// =========================================================================

export function getLocalBooks(): DarkBook[] {
  try {
    const isInitialized = localStorage.getItem(LOCAL_INITIALIZED_KEY);
    const raw = localStorage.getItem(LOCAL_BOOKS_KEY);
    const deletedKeys = getDeletedBookKeys();
    let books: DarkBook[] = [];

    if (!isInitialized) {
      localStorage.setItem(LOCAL_INITIALIZED_KEY, 'true');
      books = INITIAL_DARK_BOOKS.filter((b) => !isBookDeleted(b, deletedKeys));
      localStorage.setItem(LOCAL_BOOKS_KEY, JSON.stringify(books));
      return books;
    }

    if (raw) {
      books = JSON.parse(raw);
    } else {
      books = [];
    }

    return books.filter((b) => !isBookDeleted(b, deletedKeys));
  } catch {
    return [];
  }
}

export function saveLocalBooks(books: DarkBook[]) {
  localStorage.setItem(LOCAL_BOOKS_KEY, JSON.stringify(books));
}

export function getLocalDiscussions(): BookDiscussion[] {
  try {
    const raw = localStorage.getItem(LOCAL_DISCUSSIONS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_DISCUSSIONS_KEY, JSON.stringify(INITIAL_DISCUSSIONS));
      return INITIAL_DISCUSSIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DISCUSSIONS;
  }
}

export function saveLocalDiscussions(discussions: BookDiscussion[]) {
  localStorage.setItem(LOCAL_DISCUSSIONS_KEY, JSON.stringify(discussions));
}

export function getLocalReadingSessions(): ReadingSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(INITIAL_READING_SESSIONS));
      return INITIAL_READING_SESSIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_READING_SESSIONS;
  }
}

export function saveLocalReadingSessions(sessions: ReadingSession[]) {
  localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
}

// Bookmarks / Reading List Persistence
export function getStoredBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : ['book_48_laws', 'book_archetypes'];
  } catch {
    return ['book_48_laws', 'book_archetypes'];
  }
}

export function saveStoredBookmarks(bookmarks: string[]) {
  localStorage.setItem(LOCAL_BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export function toggleStoredBookmark(bookId: string): string[] {
  const current = getStoredBookmarks();
  const exists = current.includes(bookId);
  const updated = exists ? current.filter((id) => id !== bookId) : [...current, bookId];
  saveStoredBookmarks(updated);
  return updated;
}

// Background Reading Timer Persistence (Runs accurately across tab closures & refreshes)
export function getStoredReadingTimer(): ReadingTimerState {
  try {
    const raw = localStorage.getItem(LOCAL_TIMER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[Timer] Error parsing timer state:', e);
  }

  return {
    isActive: false,
    bookId: 'book_48_laws',
    bookTitle: 'The 48 Laws of Power',
    author: 'Robert Greene',
    startTime: null,
    accumulatedSeconds: 0,
    totalMinutesTarget: 30,
    chapterMilestone: 16,
    mode: 'focus',
  };
}

export function saveStoredReadingTimer(timer: ReadingTimerState) {
  localStorage.setItem(LOCAL_TIMER_KEY, JSON.stringify(timer));
}

// Vault Filters Persistence
export function getStoredVaultFilters(): VaultFilterState {
  try {
    const raw = localStorage.getItem(LOCAL_VAULT_FILTERS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }

  return {
    archetype: 'all',
    status: 'all',
    searchQuery: '',
    sortBy: 'featured',
    onlyBookmarked: false,
  };
}

export function saveStoredVaultFilters(filters: VaultFilterState) {
  localStorage.setItem(LOCAL_VAULT_FILTERS_KEY, JSON.stringify(filters));
}

// =========================================================================
// BOOK CLUB PERSISTENCE & COMMUNITY SYNC ENGINE
// =========================================================================

export async function syncBookClubThreadsFromSupabase(): Promise<BookClubThread[]> {
  const local = getLocalBookClubThreads();
  const client = getSupabaseClient();
  if (!client) {
    setCloudSyncStatus('offline');
    return local;
  }

  try {
    const { data, error } = await client
      .from('book_club_discussions')
      .select('*, book_club_comments(*)')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Failed to sync book club threads:', error);
      setCloudSyncStatus('diverged');
      return local;
    }

    if (!data || data.length === 0) {
      return local;
    }

    const mapped: BookClubThread[] = data.map((row: any) => ({
      id: row.id,
      bookId: row.book_id,
      bookTitle: row.book_title || 'General Psychological Salon',
      bookAuthor: row.book_author,
      coverUrl: row.cover_url,
      authorName: row.author_name,
      authorEmail: row.author_email,
      authorRole: row.author_role || 'member',
      authorAvatar: row.author_avatar,
      category: row.category || 'perspective',
      chapterNumber: row.chapter_number ? Number(row.chapter_number) : undefined,
      title: row.title,
      content: row.content,
      keyTakeaway: row.key_takeaway,
      archetypeTag: row.archetype_tag || 'The Strategist',
      tags: row.tags || [],
      createdAt: row.created_at || new Date().toISOString(),
      pinned: Boolean(row.pinned),
      reactions: row.reactions || { '👁️': 0, '💡': 0, '🔥': 0, '⚖️': 0, '📌': 0 },
      userReactions: row.user_reactions || {},
      commentsCount: Number(row.comments_count) || (row.book_club_comments?.length || 0),
      comments: (row.book_club_comments || []).map((c: any) => ({
        id: c.id,
        threadId: c.thread_id || row.id,
        authorName: c.author_name,
        authorEmail: c.author_email,
        authorRole: c.author_role || 'member',
        authorAvatar: c.author_avatar,
        content: c.content,
        createdAt: c.created_at,
        replyToAuthor: c.reply_to_author,
        reactions: c.reactions || {},
        userReactions: c.user_reactions || {},
      })),
    }));

    // Clear stale local storage and store strictly remote database rows
    localStorage.removeItem(LOCAL_BOOK_CLUB_THREADS_KEY);
    saveLocalBookClubThreads(mapped);
    setCloudSyncStatus('synced');
    return mapped;
  } catch (err) {
    console.warn('[Supabase] Failed to sync book club threads from remote cluster:', err);
    setCloudSyncStatus('diverged');
    return local;
  }
}

export async function persistBookClubThreadToSupabase(thread: BookClubThread): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('book_club_discussions').upsert({
      id: thread.id.startsWith('thread_') ? undefined : thread.id,
      book_title: thread.bookTitle,
      book_author: thread.bookAuthor,
      cover_url: thread.coverUrl,
      author_name: thread.authorName,
      author_email: thread.authorEmail,
      author_role: thread.authorRole,
      author_avatar: thread.authorAvatar,
      category: thread.category,
      chapter_number: thread.chapterNumber,
      title: thread.title,
      content: thread.content,
      key_takeaway: thread.keyTakeaway,
      archetype_tag: thread.archetypeTag,
      tags: thread.tags,
      pinned: thread.pinned,
      reactions: thread.reactions,
      user_reactions: thread.userReactions,
      comments_count: thread.commentsCount,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Supabase] Persist book club thread error:', err);
  }
}

export async function persistBookClubCommentToSupabase(comment: BookClubComment): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('book_club_comments').upsert({
      thread_id: comment.threadId,
      author_name: comment.authorName,
      author_email: comment.authorEmail,
      author_role: comment.authorRole,
      author_avatar: comment.authorAvatar,
      content: comment.content,
      reply_to_author: comment.replyToAuthor,
      reactions: comment.reactions,
      user_reactions: comment.userReactions,
    });
  } catch (err) {
    console.warn('[Supabase] Persist book club comment error:', err);
  }
}

export async function deleteBookClubThreadFromSupabase(threadId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('book_club_discussions').delete().eq('id', threadId);
  } catch (err) {
    console.warn('[Supabase] Delete book club thread error:', err);
  }
}

export async function syncMemberGoalsFromSupabase(): Promise<MemberGoal[]> {
  const local = getLocalMemberGoals();
  const client = getSupabaseClient();
  if (!client) {
    setCloudSyncStatus('offline');
    return local;
  }

  try {
    const { data, error } = await client
      .from('member_goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Failed to sync member goals:', error);
      setCloudSyncStatus('diverged');
      return local;
    }

    if (!data || data.length === 0) {
      return local;
    }

    const mapped: MemberGoal[] = data.map((row: any) => ({
      id: row.id,
      userEmail: row.user_email,
      userName: row.user_name,
      userAvatar: row.user_avatar,
      bookTitle: row.book_title,
      targetChapters: Number(row.target_chapters) || 10,
      completedChapters: Number(row.completed_chapters) || 0,
      deadline: row.deadline || '',
      reflectionNote: row.reflection_note || '',
      status: row.status || 'in_progress',
      createdAt: row.created_at || new Date().toISOString(),
    }));

    // Clear stale local storage and store strictly remote database rows
    localStorage.removeItem(LOCAL_MEMBER_GOALS_KEY);
    saveLocalMemberGoals(mapped);
    setCloudSyncStatus('synced');
    return mapped;
  } catch (err) {
    console.warn('[Supabase] Failed to sync member goals:', err);
    setCloudSyncStatus('diverged');
    return local;
  }
}

// Master Force Cloud Sync to resolve all local/remote divergence and re-seed single source of truth
export async function forceCloudSyncAll(): Promise<{
  success: boolean;
  books: DarkBook[];
  discussions: BookDiscussion[];
  sessions: ReadingSession[];
  threads: BookClubThread[];
  goals: MemberGoal[];
  profiles: Record<string, User>;
}> {
  setCloudSyncStatus('syncing');

  try {
    const [books, discussions, sessions, threads, goals, profiles] = await Promise.all([
      syncBooksFromSupabase(),
      syncDiscussionsFromSupabase(),
      syncSessionsFromSupabase(),
      syncBookClubThreadsFromSupabase(),
      syncMemberGoalsFromSupabase(),
      fetchAllProfilesFromSupabase(),
    ]);

    setCloudSyncStatus('synced');
    return {
      success: true,
      books,
      discussions,
      sessions,
      threads,
      goals,
      profiles,
    };
  } catch (e) {
    console.error('[Supabase] Force cloud sync failed:', e);
    setCloudSyncStatus('diverged');
    return {
      success: false,
      books: getLocalBooks(),
      discussions: getLocalDiscussions(),
      sessions: getLocalReadingSessions(),
      threads: getLocalBookClubThreads(),
      goals: getLocalMemberGoals(),
      profiles: getStoredUserProfiles(),
    };
  }
}

export async function persistMemberGoalToSupabase(goal: MemberGoal): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('member_goals').upsert({
      user_email: goal.userEmail,
      user_name: goal.userName,
      user_avatar: goal.userAvatar,
      book_title: goal.bookTitle,
      target_chapters: goal.targetChapters,
      completed_chapters: goal.completedChapters,
      deadline: goal.deadline,
      reflection_note: goal.reflectionNote,
      status: goal.status,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Supabase] Persist member goal error:', err);
  }
}

// Local Storage for Book Club Threads & Member Goals
export function getLocalBookClubThreads(): BookClubThread[] {
  try {
    const raw = localStorage.getItem(LOCAL_BOOK_CLUB_THREADS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_BOOK_CLUB_THREADS_KEY, JSON.stringify(INITIAL_BOOK_CLUB_THREADS));
      return INITIAL_BOOK_CLUB_THREADS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_BOOK_CLUB_THREADS;
  }
}

export function saveLocalBookClubThreads(threads: BookClubThread[]) {
  localStorage.setItem(LOCAL_BOOK_CLUB_THREADS_KEY, JSON.stringify(threads));
}

export function getLocalMemberGoals(): MemberGoal[] {
  try {
    const raw = localStorage.getItem(LOCAL_MEMBER_GOALS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_MEMBER_GOALS_KEY, JSON.stringify(INITIAL_MEMBER_GOALS));
      return INITIAL_MEMBER_GOALS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_MEMBER_GOALS;
  }
}

export function saveLocalMemberGoals(goals: MemberGoal[]) {
  localStorage.setItem(LOCAL_MEMBER_GOALS_KEY, JSON.stringify(goals));
}

// Audit Logs
export function getAdminAuditLogs(): AdminAuditRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    if (!raw) {
      const initialLogs: AdminAuditRecord[] = [
        {
          id: 'audit_01',
          action: 'SCHEMA_VALIDATE',
          table: 'public.books',
          performedBy: 'adhudson504@gmail.com',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          details: 'Initialized dark psychology schema indices, RLS policies and foreign keys',
          status: 'SUCCESS'
        },
        {
          id: 'audit_02',
          action: 'INSERT',
          table: 'public.books',
          performedBy: 'adhudson504@gmail.com',
          timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
          details: 'Curated and ingested Carl Jung: The Archetypes and The Collective Unconscious',
          status: 'SUCCESS'
        }
      ];
      localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(initialLogs));
      return initialLogs;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function recordAuditLog(log: Omit<AdminAuditRecord, 'id' | 'timestamp'>) {
  const current = getAdminAuditLogs();
  const entry: AdminAuditRecord = {
    ...log,
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [entry, ...current].slice(0, 100);
  localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(updated));

  // Also push to Supabase if connected
  const client = getSupabaseClient();
  if (client) {
    Promise.resolve(
      client.from('audit_logs').insert({
        action: entry.action,
        table_name: entry.table,
        performed_by: entry.performedBy,
        details: entry.details,
        status: entry.status,
      })
    ).catch(() => {});
  }

  return entry;
}
