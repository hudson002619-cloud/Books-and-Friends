import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { SupabaseConfigState } from '../types';
import { SupabaseStatusBadge } from './SupabaseStatusBadge';
import { AuthModal } from './AuthModal';
import { UserProfileModal } from './UserProfileModal';
import { Shield, User, LogOut, BookOpen, Compass, Users, Sparkles, MessageSquareQuote, Camera, Edit } from 'lucide-react';

interface HeaderProps {
  activeTab: 'library' | 'explore' | 'discussions' | 'book_club' | 'admin';
  setActiveTab: (tab: 'library' | 'explore' | 'discussions' | 'book_club' | 'admin') => void;
  configState: SupabaseConfigState;
  onRefreshSupabase: () => void;
  onConfigUpdated: (newState: SupabaseConfigState) => void;
  sessionsCount?: number;
  discussionsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  configState,
  onRefreshSupabase,
  onConfigUpdated,
  sessionsCount = 3,
  discussionsCount = 2,
}) => {
  const { user, isAdmin, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  return (
    <>
      <header className="h-16 px-4 md:px-8 border-b border-white/10 dark-glass flex items-center justify-between sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark in display face */}
        <button
          onClick={() => setActiveTab('library')}
          className="text-lg md:text-xl font-bold tracking-tight text-zinc-100 font-display hover:text-amber-200 transition-colors shrink-0 cursor-pointer"
        >
          Books and Friends
        </button>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium">
          <button
            onClick={() => setActiveTab('library')}
            className={`transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'library'
                ? 'text-zinc-100 font-semibold border-b-2 border-red-700 pb-0.5'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-zinc-400" />
            <span>Sanctuary Vault</span>
          </button>

          <button
            onClick={() => setActiveTab('explore')}
            className={`transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'explore'
                ? 'text-zinc-100 font-semibold border-b-2 border-red-700 pb-0.5'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Compass className="w-4 h-4 text-zinc-400" />
            <span>Open Library Search</span>
          </button>

          <button
            onClick={() => setActiveTab('discussions')}
            className={`transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'discussions'
                ? 'text-zinc-100 font-semibold border-b-2 border-red-700 pb-0.5'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4 text-zinc-400" />
            <span>Reading Circles</span>
          </button>

          {/* Dedicated Book Club Navigation */}
          <button
            onClick={() => setActiveTab('book_club')}
            className={`transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'book_club'
                ? 'text-amber-200 font-semibold border-b-2 border-amber-600 pb-0.5'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Book Club</span>
          </button>

          {/* Admin Control Nav - Strictly Visible ONLY for Developer Admin */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-red-950/70 text-red-200 border border-red-700/60 shadow-sm'
                  : 'text-red-400 hover:text-red-300 hover:bg-red-950/30'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-red-400" />
              <span>Admin Console</span>
            </button>
          )}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          {/* Supabase Status Indicator - Strictly Visible ONLY for Developer Admin */}
          {isAdmin && (
            <SupabaseStatusBadge
              configState={configState}
              onRefresh={onRefreshSupabase}
              onConfigUpdated={onConfigUpdated}
            />
          )}

          {user ? (
            <div className="flex items-center gap-2">
              {/* Clickable Profile Dossier trigger */}
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="group flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#12121a] hover:bg-[#1a1a26] border border-white/10 hover:border-amber-500/40 transition-all cursor-pointer text-left shadow-sm"
                title="Open Scholar Dossier & Profile Photo Settings"
              >
                <div className="relative">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-7 h-7 rounded-full object-cover border border-amber-500/40 group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-300 border border-white/10 font-bold">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black" />
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-medium text-zinc-200 group-hover:text-amber-200 truncate max-w-[120px] transition-colors">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                    {user.role === 'admin' && <span className="text-red-400 font-semibold">Dev Admin</span>}
                    {user.role === 'scholar' && <span className="text-amber-400">Scholar</span>}
                    {user.role === 'member' && <span className="text-zinc-400">Member</span>}
                  </div>
                </div>
              </button>

              <button
                onClick={signOut}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
                title="Sign Out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setAuthModalMode('signin'); setAuthModalOpen(true); }}
                className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthModalMode('signup'); setAuthModalOpen(true); }}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-red-950 hover:bg-red-900 border border-red-800/60 rounded-lg transition-colors whitespace-nowrap shadow-sm cursor-pointer"
              >
                Join
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Secondary Tab Navigation */}
      <div className="md:hidden flex items-center justify-around px-2 py-2 bg-[#0a0a0f] border-b border-white/5 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('library')}
          className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === 'library' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'
          }`}
        >
          Vault
        </button>
        <button
          onClick={() => setActiveTab('explore')}
          className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === 'explore' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'
          }`}
        >
          Open Library
        </button>
        <button
          onClick={() => setActiveTab('discussions')}
          className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === 'discussions' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'
          }`}
        >
          Circles
        </button>
        <button
          onClick={() => setActiveTab('book_club')}
          className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === 'book_club' ? 'bg-amber-950/80 text-amber-200 border border-amber-800/60 font-medium' : 'text-zinc-400'
          }`}
        >
          Book Club
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'admin' ? 'bg-red-950 text-red-200 font-medium' : 'text-red-400'
            }`}
          >
            Admin
          </button>
        )}
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        sessionsHostedCount={sessionsCount}
        discussionsCount={discussionsCount}
      />
    </>
  );
};

