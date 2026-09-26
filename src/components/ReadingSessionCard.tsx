import React, { useState } from 'react';
import { ReadingSession, SessionMilestone } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  User,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Bookmark,
  Users,
  Shield,
  Sparkles,
  BookOpen,
  Plus,
  ChevronRight,
  MessageSquare,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface ReadingSessionCardProps {
  session: ReadingSession;
  onToggleJoinSession: (sessionId: string) => void;
  onUpdateChapter?: (sessionId: string, newChapter: number) => void;
  onAddMilestone?: (sessionId: string, milestone: SessionMilestone) => void;
  onOpenDirectBook?: (url: string) => void;
}

export const ReadingSessionCard: React.FC<ReadingSessionCardProps> = ({
  session,
  onToggleJoinSession,
  onUpdateChapter,
  onAddMilestone,
  onOpenDirectBook,
}) => {
  const { user, isAdmin } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneNote, setMilestoneNote] = useState('');

  const isUserJoined = Boolean(user?.email && session.joinedUserEmails.includes(user.email));
  const isHostOrAdmin = Boolean(
    isAdmin || (user?.email && session.hostEmail?.toLowerCase() === user.email.toLowerCase())
  );

  const handleCopyInviteCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(session.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const currentChapter = session.currentChapter || 1;
  const progressPercent = Math.min(100, Math.round((currentChapter / session.totalChapters) * 100));

  const handleChapterIncrement = (delta: number) => {
    if (!onUpdateChapter) return;
    const nextChapter = Math.max(1, Math.min(session.totalChapters, currentChapter + delta));
    onUpdateChapter(session.id, nextChapter);
  };

  const handlePostMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneNote.trim() || !onAddMilestone) return;

    const newMilestone: SessionMilestone = {
      id: `ms_${Date.now()}`,
      chapter: currentChapter,
      note: milestoneNote.trim(),
      loggedBy: user?.name || 'Sanctuary Scholar',
      loggedByAvatar: user?.avatarUrl,
      timestamp: new Date().toISOString(),
    };

    onAddMilestone(session.id, newMilestone);
    setMilestoneNote('');
    setShowMilestoneModal(false);
  };

  const coverSrc =
    session.coverUrl || '/src/assets/images/reading_circle_dramatic_1790432613396.jpg';

  return (
    <div className="group relative rounded-2xl bg-[#0e0e16] border border-white/10 hover:border-white/20 p-4 md:p-5 transition-all duration-300 flex flex-col justify-between shadow-xl hover:shadow-2xl">
      {/* Top Section */}
      <div>
        <div className="flex gap-4">
          {/* Book Cover Artwork with 8k Dramatic Lighting Shadow */}
          <div className="relative aspect-[3/4] w-24 sm:w-28 rounded-xl bg-black border border-white/10 overflow-hidden shrink-0 shadow-lg group-hover:scale-[1.02] transition-transform duration-300">
            <img
              src={coverSrc}
              alt={session.bookTitle}
              className="w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            {session.darkArchetype && (
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-md text-[9px] font-semibold text-amber-300 border border-white/10">
                {session.darkArchetype}
              </div>
            )}
          </div>

          {/* Book Meta & Host Information */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Borrow Status Badge */}
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              {session.borrowStatus === 'borrowed' ? (
                <span className="px-2 py-0.5 rounded-md bg-red-950/70 text-red-300 border border-red-800/60 font-medium text-[10px]">
                  Borrowed
                </span>
              ) : session.borrowStatus === 'reserved' ? (
                <span className="px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-800/50 font-medium text-[10px]">
                  Reserved
                </span>
              ) : session.borrowStatus === 'in_library' ? (
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-white/10 font-medium text-[10px]">
                  Sanctuary Archive
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-emerald-950/50 text-emerald-300 border border-emerald-800/40 font-medium text-[10px]">
                  Available in Library
                </span>
              )}

              {session.targetFinishDate && (
                <span className="text-zinc-400 font-mono text-[10px] flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  <span>Target: {session.targetFinishDate}</span>
                </span>
              )}
            </div>

            {/* Book Title */}
            <h3 className="text-sm sm:text-base font-bold text-zinc-100 font-display line-clamp-2 leading-tight group-hover:text-amber-200 transition-colors">
              {session.bookTitle}
            </h3>

            {/* Author Name */}
            <div className="text-xs text-zinc-400 font-medium truncate">
              By {session.author}
            </div>

            {/* Hosted By with Avatar */}
            <div className="pt-1 flex items-center gap-1.5 text-xs text-zinc-300">
              <span className="text-zinc-400 text-[11px]">Hosted by:</span>
              <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                {session.hostAvatar ? (
                  <img
                    src={session.hostAvatar}
                    alt={session.hostedBy}
                    className="w-4 h-4 rounded-full object-cover border border-amber-500/40"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-zinc-800 text-[9px] flex items-center justify-center font-bold">
                    {session.hostedBy.charAt(0)}
                  </div>
                )}
                <span className="truncate max-w-[120px]">{session.hostedBy}</span>
                {session.hostRole === 'admin' && (
                  <span className="text-[9px] px-1 rounded bg-red-950 text-red-300 border border-red-800">
                    Dev Admin
                  </span>
                )}
              </div>
            </div>

            {/* Total Chapters & Member Stats */}
            <div className="pt-1 flex items-center gap-3 text-xs text-zinc-400 font-mono">
              <div className="flex items-center gap-1 text-amber-300">
                <Layers className="w-3.5 h-3.5" />
                <span className="font-semibold">Ch. {currentChapter} / {session.totalChapters}</span>
              </div>
              <div className="flex items-center gap-1 text-zinc-400">
                <Users className="w-3.5 h-3.5" />
                <span>{session.membersCount} in cohort</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Chapter Progress Bar */}
        <div className="mt-3.5 p-2.5 rounded-xl bg-[#12121b] border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400">Cohort Chapter Pacing:</span>
            <span className="text-amber-300 font-bold">{progressPercent}% complete</span>
          </div>
          
          <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-red-800 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Stepper Controls for Host / Joined Members */}
          {(isHostOrAdmin || isUserJoined) && onUpdateChapter && (
            <div className="pt-1 flex items-center justify-between text-xs">
              <span className="text-[10px] text-zinc-500">Update Milestone:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleChapterIncrement(-1)}
                  disabled={currentChapter <= 1}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 text-xs font-mono cursor-pointer"
                  title="Previous Chapter"
                >
                  -
                </button>
                <span className="px-2 py-0.5 text-xs font-mono text-zinc-200">Ch. {currentChapter}</span>
                <button
                  type="button"
                  onClick={() => handleChapterIncrement(1)}
                  disabled={currentChapter >= session.totalChapters}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 text-xs font-mono cursor-pointer"
                  title="Next Chapter"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(true)}
                  className="ml-1.5 px-2 py-0.5 rounded bg-red-950/70 hover:bg-red-900 border border-red-800/50 text-red-200 text-[10px] font-medium transition-colors cursor-pointer"
                >
                  Log Note
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Milestone Log Notes */}
        {session.milestones && session.milestones.length > 0 && (
          <div className="mt-2.5 space-y-1.5">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Recent Chapter Milestones:
            </div>
            {session.milestones.slice(-2).map((ms) => (
              <div
                key={ms.id}
                className="p-2 rounded-lg bg-[#141422] border border-white/5 text-[11px] text-zinc-300 flex items-start gap-2"
              >
                <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span className="font-semibold text-amber-300">Ch. {ms.chapter} · {ms.loggedBy}</span>
                    <span>{new Date(ms.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="line-clamp-2 mt-0.5 text-zinc-300">{ms.note}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Club Note / Reading Synopsis */}
        {session.clubNote && (
          <p className="mt-2.5 text-xs text-zinc-400 line-clamp-2 bg-[#12121b] p-2 rounded-xl border border-white/5 leading-relaxed italic">
            "{session.clubNote}"
          </p>
        )}
      </div>

      {/* Footer Controls: Invite Code, Direct Book Link, Join Toggle */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
        {/* Invite Code Pill with Copy Action */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyInviteCode}
            className="px-2.5 py-1 bg-[#141420] hover:bg-[#1a1a2b] border border-white/10 rounded-lg text-xs font-mono text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Click to copy Invite Code"
          >
            <span className="text-[10px] text-zinc-400 font-sans">Invite:</span>
            <span className="font-bold text-amber-300">{session.inviteCode}</span>
            {copiedCode ? (
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 text-zinc-500 shrink-0" />
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {session.directBookUrl && (
            <a
              href={session.directBookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/50 text-amber-200 hover:text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm"
              title="Open book in Open Library reader/borrow page"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Read on Open Library</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => onToggleJoinSession(session.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
              isUserJoined
                ? 'bg-emerald-950/60 hover:bg-red-950/60 text-emerald-300 hover:text-red-300 border border-emerald-800/50 hover:border-red-800/50'
                : 'bg-red-950 hover:bg-red-900 text-white border border-red-800/60'
            }`}
          >
            {isUserJoined ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Joined Cohort</span>
              </>
            ) : (
              <>
                <Users className="w-3.5 h-3.5" />
                <span>Join Session</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Milestone Note Modal */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0d0d14] border border-white/15 rounded-2xl p-5 shadow-2xl space-y-4">
            <h4 className="text-sm font-semibold text-zinc-100 font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Log Chapter {currentChapter} Milestone Note</span>
            </h4>
            <form onSubmit={handlePostMilestone} className="space-y-3">
              <textarea
                rows={3}
                required
                value={milestoneNote}
                onChange={(e) => setMilestoneNote(e.target.value)}
                placeholder={`Key insights, tactical takeaways, or psychological deductions from Chapter ${currentChapter}...`}
                className="w-full p-2.5 bg-[#14141f] border border-white/10 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-red-600/50"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-white/5 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-red-950 hover:bg-red-900 border border-red-800 rounded-lg"
                >
                  Record Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
