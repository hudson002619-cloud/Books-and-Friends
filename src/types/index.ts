export type UserRole = 'admin' | 'scholar' | 'member';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  bio?: string;
  archetypeAffinity?: string;
  favoriteBook?: string;
  readingGoalPerMonth?: number;
  booksReadCount?: number;
}

export type BorrowStatus = 'available' | 'borrowed' | 'reserved' | 'in_library';

export interface SessionMilestone {
  id: string;
  chapter: number;
  note: string;
  loggedBy: string;
  loggedByAvatar?: string;
  timestamp: string;
}

export interface ReadingSession {
  id: string;
  bookId?: string;
  bookTitle: string;
  author: string;
  totalChapters: number;
  currentChapter?: number;
  targetFinishDate?: string;
  borrowStatus: BorrowStatus;
  coverUrl?: string;
  directBookUrl?: string;
  clubNote?: string;
  hostedBy: string;
  hostEmail: string;
  hostRole?: UserRole;
  hostAvatar?: string;
  inviteCode: string;
  membersCount: number;
  joinedUserEmails: string[];
  createdAt: string;
  darkArchetype?: string;
  status: 'active' | 'upcoming' | 'completed';
  milestones?: SessionMilestone[];
  lastActivityAt?: string;
}

export interface DarkBook {
  id: string;
  openLibraryKey: string;
  title: string;
  author: string;
  coverUrl: string;
  firstPublishYear?: number;
  isbn?: string[];
  subjects: string[];
  darkArchetype: 'The Shadow' | 'The Strategist' | 'The Manipulator' | 'The Alchemist' | 'The Stoic' | 'The Sovereign';
  synopsis: string;
  curatorNotes?: string;
  rating: number;
  addedBy: string;
  createdAt: string;
  discussionCount: number;
  status: 'reading' | 'archive' | 'featured';
  workDetails?: OpenLibraryWorkDetails;
}

export interface ReadingTimerState {
  isActive: boolean;
  bookId: string | null;
  bookTitle: string;
  author: string;
  startTime: number | null; // timestamp when started
  accumulatedSeconds: number; // accumulated time from previous paused sessions
  totalMinutesTarget: number;
  chapterMilestone?: number;
  mode: 'focus' | 'ambient' | 'pomodoro';
}

export interface VaultFilterState {
  archetype: string;
  status: 'all' | 'reading' | 'featured' | 'archive';
  searchQuery: string;
  sortBy: 'featured' | 'rating' | 'newest' | 'title';
  onlyBookmarked?: boolean;
}

export interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
  edition_count?: number;
  ratings_average?: number;
  isbn?: string[];
  fromCache?: boolean;
}

export interface OpenLibraryWorkDetails {
  key: string;
  title: string;
  description?: string;
  covers?: number[];
  subjects?: string[];
  first_publish_date?: string;
  latest_revision?: number;
  authors?: { author: { key: string }; type?: { key: string } }[];
  author_names?: string[];
  excerpts?: { excerpt: string; comment?: string }[];
  isbn_10?: string[];
  isbn_13?: string[];
  coversUrl?: string;
  rawJson?: any;
}

export interface CacheStats {
  hits: number;
  misses: number;
  searchEntries: number;
  workEntries: number;
  totalCached: number;
  estimatedSizeKb: number;
  lastAccessed: string | null;
}

export interface PipelineStageInfo {
  stage: 'idle' | 'input' | 'network' | 'process' | 'output' | 'error';
  query: string;
  endpoint: string;
  statusText: string;
  durationMs: number;
  resultCount: number;
  isCached?: boolean;
  error?: string;
}

export interface DiscussionComment {
  id: string;
  discussionId: string;
  authorName: string;
  authorEmail: string;
  authorRole: UserRole;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  likes: number;
  likedByEmails?: string[];
}

export interface BookDiscussion {
  id: string;
  bookId: string;
  bookTitle: string;
  authorName: string;
  authorEmail: string;
  authorRole: UserRole;
  authorAvatar?: string;
  title: string;
  content: string;
  archetypeTag: string;
  createdAt: string;
  upvotes: number;
  upvotedByEmails?: string[];
  comments: DiscussionComment[];
  pinned?: boolean;
}

// Dedicated Book Club Feature Types
export type BookClubCategory = 'perspective' | 'chapter_note' | 'post_book' | 'member_goal' | 'general';

export interface BookClubComment {
  id: string;
  threadId: string;
  authorName: string;
  authorEmail: string;
  authorRole: UserRole;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  replyToAuthor?: string;
  reactions: Record<string, number>;
  userReactions: Record<string, string[]>;
}

export interface BookClubThread {
  id: string;
  bookId?: string;
  bookTitle: string;
  bookAuthor?: string;
  coverUrl?: string;
  authorName: string;
  authorEmail: string;
  authorRole: UserRole;
  authorAvatar?: string;
  category: BookClubCategory;
  chapterNumber?: number;
  title: string;
  content: string;
  keyTakeaway?: string;
  archetypeTag: string;
  tags: string[];
  createdAt: string;
  pinned?: boolean;
  reactions: Record<string, number>;
  userReactions: Record<string, string[]>;
  commentsCount: number;
  comments: BookClubComment[];
}

export interface MemberGoal {
  id: string;
  userEmail: string;
  userName: string;
  userAvatar?: string;
  bookTitle: string;
  targetChapters: number;
  completedChapters: number;
  deadline: string;
  reflectionNote: string;
  status: 'in_progress' | 'completed';
  createdAt: string;
}

export interface AdminAuditRecord {
  id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' | 'SCHEMA_VALIDATE';
  table: string;
  performedBy: string;
  timestamp: string;
  details: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
}

export interface SupabaseConfigState {
  isConfigured: boolean;
  isConnected: boolean;
  isValidating: boolean;
  url: string;
  anonKey: string;
  maskedKey: string;
  latencyMs: number | null;
  error: string | null;
  mode: 'live' | 'local_fallback';
  checkedAt: string | null;
}
