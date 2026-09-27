// =========================================================================
// BOOKS AND FRIENDS - COMPLETE SUPABASE SQL SCHEMA & MIGRATION SCRIPT
// Target Developer Admin: adhudson504@gmail.com
// Full Privileges: INSERT, UPDATE, DELETE, SELECT
// =========================================================================

export const SUPABASE_ADMIN_FRAMEWORK_SQL = `-- =========================================================================
-- BOOKS AND FRIENDS - SUPABASE DATABASE SCHEMA & ADMIN ROLE FRAMEWORK
-- Complete Schema Migration & Dedicated Book Club Extension
-- Target Developer Admin: adhudson504@gmail.com
-- Full Privileges: INSERT, UPDATE, DELETE, SELECT
-- =========================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Custom Role & Status Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'scholar', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dark_archetype AS ENUM (
        'The Shadow', 
        'The Strategist', 
        'The Manipulator', 
        'The Sovereign', 
        'The Stoic', 
        'The Alchemist'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE book_status AS ENUM ('reading', 'featured', 'archive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table (Strict User Privacy)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    avatar_url TEXT,
    bio TEXT,
    archetype_affinity TEXT DEFAULT 'The Strategist',
    favorite_book TEXT,
    reading_goal_per_month INT DEFAULT 3,
    books_read_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Books Catalog Table (Developer Admin Managed)
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    open_library_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    cover_url TEXT NOT NULL,
    first_publish_year INT,
    subjects TEXT[] DEFAULT '{}',
    dark_archetype dark_archetype NOT NULL DEFAULT 'The Strategist',
    synopsis TEXT NOT NULL,
    curator_notes TEXT,
    rating NUMERIC(3,2) DEFAULT 4.80,
    added_by TEXT NOT NULL,
    status book_status NOT NULL DEFAULT 'reading',
    discussion_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Reading Sessions Table (Cohort Synchronization)
CREATE TABLE IF NOT EXISTS public.reading_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
    book_title TEXT NOT NULL,
    author TEXT NOT NULL,
    total_chapters INT NOT NULL DEFAULT 12,
    current_chapter INT NOT NULL DEFAULT 1,
    target_finish_date TEXT,
    borrow_status TEXT DEFAULT 'available',
    cover_url TEXT,
    direct_book_url TEXT,
    club_note TEXT,
    hosted_by TEXT NOT NULL,
    host_email TEXT NOT NULL,
    host_role user_role NOT NULL DEFAULT 'member',
    host_avatar TEXT,
    invite_code TEXT UNIQUE NOT NULL,
    members_count INT DEFAULT 1,
    joined_user_emails TEXT[] DEFAULT '{}',
    dark_archetype TEXT DEFAULT 'The Strategist',
    status TEXT DEFAULT 'active',
    milestones JSONB DEFAULT '[]'::jsonb,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Reading Circles & Theses Table (Classic)
CREATE TABLE IF NOT EXISTS public.discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    book_title TEXT NOT NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_role user_role NOT NULL DEFAULT 'member',
    author_avatar TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    archetype_tag TEXT NOT NULL,
    upvotes INT DEFAULT 1,
    upvoted_by_emails TEXT[] DEFAULT '{}',
    pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Discussion Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_role user_role NOT NULL DEFAULT 'member',
    author_avatar TEXT,
    content TEXT NOT NULL,
    likes INT DEFAULT 0,
    liked_by_emails TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Dedicated Book Club Discussions & Reflections Table
CREATE TABLE IF NOT EXISTS public.book_club_discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
    book_title TEXT NOT NULL,
    book_author TEXT,
    cover_url TEXT,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_role user_role NOT NULL DEFAULT 'member',
    author_avatar TEXT,
    category TEXT NOT NULL DEFAULT 'perspective', -- 'perspective', 'chapter_note', 'post_book', 'member_goal', 'general'
    chapter_number INT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    key_takeaway TEXT,
    archetype_tag TEXT NOT NULL DEFAULT 'The Strategist',
    tags TEXT[] DEFAULT '{}',
    pinned BOOLEAN DEFAULT false,
    reactions JSONB DEFAULT '{"👁️": 0, "💡": 0, "🔥": 0, "⚖️": 0, "📌": 0}'::jsonb,
    user_reactions JSONB DEFAULT '{}'::jsonb,
    comments_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Book Club Thread Comments Table
CREATE TABLE IF NOT EXISTS public.book_club_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES public.book_club_discussions(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_role user_role NOT NULL DEFAULT 'member',
    author_avatar TEXT,
    content TEXT NOT NULL,
    reply_to_author TEXT,
    reactions JSONB DEFAULT '{}'::jsonb,
    user_reactions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Club Member Reactions Table
CREATE TABLE IF NOT EXISTS public.club_member_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES public.book_club_discussions(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.book_club_comments(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT,
    reaction_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Member Goals Table (Community Accountability)
CREATE TABLE IF NOT EXISTS public.member_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    book_title TEXT NOT NULL,
    target_chapters INT NOT NULL DEFAULT 10,
    completed_chapters INT NOT NULL DEFAULT 0,
    deadline TEXT,
    reflection_note TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Developer Admin Audit Logs Table (Exclusive Admin Access)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 13. INDEXES FOR FAST PERFORMANCE & FILTERING
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_books_open_library_key ON public.books(open_library_key);
CREATE INDEX IF NOT EXISTS idx_book_club_category ON public.book_club_discussions(category);
CREATE INDEX IF NOT EXISTS idx_book_club_chapter ON public.book_club_discussions(chapter_number);
CREATE INDEX IF NOT EXISTS idx_book_club_created_at ON public.book_club_discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_club_comments_thread ON public.book_club_comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_member_goals_user ON public.member_goals(user_email);

-- =========================================================================
-- 14. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- =========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_club_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_club_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_member_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 15. Helper Function: Is Developer Admin Verification (Strict Security Boundary)
CREATE OR REPLACE FUNCTION public.is_developer_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        (auth.jwt() ->> 'email') = 'adhudson504@gmail.com'
        OR current_setting('request.jwt.claims', true)::json->>'email' = 'adhudson504@gmail.com'
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.email = 'adhudson504@gmail.com'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 16. ROW LEVEL SECURITY (RLS) POLICIES ENFORCEMENT
-- =========================================================================

-- PROFILES: Strict User Isolation & Developer Admin Authority
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can only insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR public.is_developer_admin());
CREATE POLICY "Users can only update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_developer_admin()) WITH CHECK (auth.uid() = id OR public.is_developer_admin());
CREATE POLICY "Users can only delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = id OR public.is_developer_admin());

-- BOOKS: Developer Admin Exclusive Authority (INSERT, UPDATE, DELETE)
CREATE POLICY "Books are viewable by all users" ON public.books FOR SELECT USING (true);
CREATE POLICY "Developer Admin full INSERT on books" ON public.books FOR INSERT WITH CHECK (public.is_developer_admin());
CREATE POLICY "Developer Admin full UPDATE on books" ON public.books FOR UPDATE USING (public.is_developer_admin()) WITH CHECK (public.is_developer_admin());
CREATE POLICY "Developer Admin full DELETE on books" ON public.books FOR DELETE USING (public.is_developer_admin());

-- READING SESSIONS: Host / Admin Scoped Modifications
CREATE POLICY "Reading sessions viewable by all" ON public.reading_sessions FOR SELECT USING (true);
CREATE POLICY "Users can create reading sessions" ON public.reading_sessions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR public.is_developer_admin());
CREATE POLICY "Hosts or Admin can update sessions" ON public.reading_sessions FOR UPDATE USING ((auth.jwt() ->> 'email') = host_email OR public.is_developer_admin()) WITH CHECK ((auth.jwt() ->> 'email') = host_email OR public.is_developer_admin());
CREATE POLICY "Hosts or Admin can delete sessions" ON public.reading_sessions FOR DELETE USING ((auth.jwt() ->> 'email') = host_email OR public.is_developer_admin());

-- DISCUSSIONS: Author / Admin Scoped Modifications
CREATE POLICY "Discussions are viewable by all" ON public.discussions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create discussions" ON public.discussions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR public.is_developer_admin());
CREATE POLICY "Authors or Admin can update discussions" ON public.discussions FOR UPDATE USING ((auth.jwt() ->> 'email') = author_email OR public.is_developer_admin()) WITH CHECK ((auth.jwt() ->> 'email') = author_email OR public.is_developer_admin());
CREATE POLICY "Authors or Admin can delete discussions" ON public.discussions FOR DELETE USING ((auth.jwt() ->> 'email') = author_email OR public.is_developer_admin());

-- COMMENTS: Author / Admin Scoped Modifications
CREATE POLICY "Comments are viewable by all" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR public.is_developer_admin());
CREATE POLICY "Authors or Admin can update comments" ON public.comments FOR UPDATE USING ((auth.jwt() ->> 'email') = author_email OR public.is_developer_admin()) WITH CHECK ((auth.jwt() ->> 'email') = author_email OR public.is_developer_admin());
CREATE POLICY "Authors or Admin can delete comments" ON public.comments FOR DELETE USING ((auth.jwt() ->> 'email') = author_email OR public.is_developer_admin());

-- BOOK CLUB DISCUSSIONS: Author / Admin Scoped Modifications
CREATE POLICY "Book club discussions viewable by all" ON public.book_club_discussions FOR SELECT USING (true);
CREATE POLICY "Anyone can post book club discussions" ON public.book_club_discussions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR public.is_developer_admin());
CREATE POLICY "Authors or Dev Admin can update book club discussions" ON public.book_club_discussions FOR UPDATE USING ((auth.jwt() ->> 'email') = author_email OR auth.uid() = author_id OR public.is_developer_admin()) WITH CHECK ((auth.jwt() ->> 'email') = author_email OR auth.uid() = author_id OR public.is_developer_admin());
CREATE POLICY "Authors or Dev Admin can delete book club discussions" ON public.book_club_discussions FOR DELETE USING ((auth.jwt() ->> 'email') = author_email OR auth.uid() = author_id OR public.is_developer_admin());

-- BOOK CLUB COMMENTS: Author / Admin Scoped Modifications
CREATE POLICY "Book club comments viewable by all" ON public.book_club_comments FOR SELECT USING (true);
CREATE POLICY "Anyone can post book club comments" ON public.book_club_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR public.is_developer_admin());
CREATE POLICY "Authors or Dev Admin can update book club comments" ON public.book_club_comments FOR UPDATE USING ((auth.jwt() ->> 'email') = author_email OR auth.uid() = author_id OR public.is_developer_admin()) WITH CHECK ((auth.jwt() ->> 'email') = author_email OR auth.uid() = author_id OR public.is_developer_admin());
CREATE POLICY "Authors or Dev Admin can delete book club comments" ON public.book_club_comments FOR DELETE USING ((auth.jwt() ->> 'email') = author_email OR auth.uid() = author_id OR public.is_developer_admin());

-- MEMBER GOALS: Strictly Scoped to User's Own Account (or Dev Admin)
CREATE POLICY "Member goals viewable by all" ON public.member_goals FOR SELECT USING (true);
CREATE POLICY "Users can create own member goals" ON public.member_goals FOR INSERT WITH CHECK ((auth.jwt() ->> 'email') = user_email OR public.is_developer_admin());
CREATE POLICY "Users can only update own member goals" ON public.member_goals FOR UPDATE USING ((auth.jwt() ->> 'email') = user_email OR public.is_developer_admin()) WITH CHECK ((auth.jwt() ->> 'email') = user_email OR public.is_developer_admin());
CREATE POLICY "Users can only delete own member goals" ON public.member_goals FOR DELETE USING ((auth.jwt() ->> 'email') = user_email OR public.is_developer_admin());

-- AUDIT LOGS: Developer Admin Exclusive Access (Strict Security Clearance)
CREATE POLICY "Developer Admin has exclusive access to audit logs" ON public.audit_logs FOR ALL USING (public.is_developer_admin()) WITH CHECK (public.is_developer_admin());

-- =========================================================================
-- 17. INITIAL CURATED BOOKS SEED DATA
-- =========================================================================
INSERT INTO public.books (open_library_key, title, author, cover_url, first_publish_year, subjects, dark_archetype, synopsis, curator_notes, rating, added_by, status)
VALUES
('OL24364998M', 'The 48 Laws of Power', 'Robert Greene', 'https://covers.openlibrary.org/b/id/8231856-L.jpg', 1998, ARRAY['Psychology', 'Power', 'Philosophy', 'Strategy'], 'The Strategist', 'Amoral, cunning, ruthless, and instructive manual for gaining, observing, or defending against ultimate control.', 'Crucial reading for identifying covert power dynamics in social circles.', 4.80, 'adhudson504@gmail.com', 'featured'),
('OL26333555M', 'The Archetypes and The Collective Unconscious', 'Carl Gustav Jung', 'https://covers.openlibrary.org/b/id/6979841-L.jpg', 1959, ARRAY['Analytical Psychology', 'Shadow Self', 'Unconscious'], 'The Shadow', 'Jungian psychology foundational treatise exploring archetypes that inhabit deepest subterranean layers.', 'Essential for shadow integration.', 4.90, 'adhudson504@gmail.com', 'reading'),
('OL25418430M', 'The Prince', 'Niccolò Machiavelli', 'https://covers.openlibrary.org/b/id/8741362-L.jpg', 1532, ARRAY['Political Philosophy', 'Machiavellianism', 'Statecraft'], 'The Sovereign', 'Groundbreaking renaissance treatise on political realism and calculated statecraft.', 'Classic study on realpolitik.', 4.70, 'adhudson504@gmail.com', 'archive'),
('OL27204918M', 'Influence: The Psychology of Persuasion', 'Robert B. Cialdini', 'https://covers.openlibrary.org/b/id/10543628-L.jpg', 1984, ARRAY['Social Psychology', 'Cognitive Bias', 'Persuasion'], 'The Manipulator', 'The foundational investigation into the six universal weapons of automatic compliance.', 'Key defense mechanism against manipulation.', 4.85, 'adhudson504@gmail.com', 'reading')
ON CONFLICT (open_library_key) DO NOTHING;
`;
