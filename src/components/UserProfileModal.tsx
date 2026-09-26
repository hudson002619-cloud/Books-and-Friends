import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  User as UserIcon,
  Camera,
  Upload,
  Sparkles,
  Shield,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Flame,
  Award,
  Bookmark,
  Layers,
  Save,
  Trash2,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionsHostedCount?: number;
  discussionsCount?: number;
}

const PRESET_AVATARS = [
  {
    name: 'Scholar Archetype',
    url: '/src/assets/images/profile_avatar_scholar_1790432624462.jpg',
  },
  {
    name: 'Dramatic Circle',
    url: '/src/assets/images/reading_circle_dramatic_1790432613396.jpg',
  },
  {
    name: 'Sanctuary Vault',
    url: '/src/assets/images/hero_dark_library_1790432601708.jpg',
  },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  sessionsHostedCount = 2,
  discussionsCount = 3,
}) => {
  const { user, updateProfile, isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [archetypeAffinity, setArchetypeAffinity] = useState(user?.archetypeAffinity || 'The Shadow');
  const [favoriteBook, setFavoriteBook] = useState(user?.favoriteBook || 'The 48 Laws of Power');
  const [booksReadCount, setBooksReadCount] = useState<number>(user?.booksReadCount || 12);
  const [readingGoalPerMonth, setReadingGoalPerMonth] = useState<number>(user?.readingGoalPerMonth || 3);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever modal opens
  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl || '');
      setArchetypeAffinity(user.archetypeAffinity || 'The Shadow');
      setFavoriteBook(user.favoriteBook || 'The 48 Laws of Power');
      setBooksReadCount(user.booksReadCount ?? 12);
      setReadingGoalPerMonth(user.readingGoalPerMonth ?? 3);
      setError(null);
      setSavedSuccess(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  // Handle Photo File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarUrl(result);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read image file. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Full Name or Alias cannot be blank.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl || undefined,
        archetypeAffinity,
        favoriteBook: favoriteBook.trim(),
        booksReadCount: Number(booksReadCount) || 0,
        readingGoalPerMonth: Number(readingGoalPerMonth) || 3,
      });

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile to Supabase cluster.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0d0d14] border border-white/10 rounded-2xl p-5 md:p-7 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-950 via-amber-600/70 to-zinc-900" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-950/60 border border-red-800/40 text-red-400">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-zinc-100 font-display">
                  Sanctuary Scholar Dossier
                </h2>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 text-[10px] font-mono font-semibold">
                    Dev Admin
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-zinc-800 border border-white/10 text-zinc-300 text-[10px] font-mono">
                    {user.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Manage profile avatar, psychological archetype affinity, and reading milestones
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
        <form onSubmit={handleSave} className="overflow-y-auto pr-1 space-y-5 flex-1 mt-4">
          {error && (
            <div className="p-3 text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Scholar profile dossier successfully synchronized across Sanctuary & Supabase.</span>
            </div>
          )}

          {/* 1. Photo Avatar Upload Section */}
          <div className="p-4 rounded-xl bg-[#11111a] border border-white/10 flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-black border-2 border-amber-500/40 overflow-hidden shadow-xl relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-2xl font-bold text-zinc-400 font-display">
                    {name.charAt(0) || 'S'}
                  </div>
                )}

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-zinc-200 cursor-pointer text-[10px] gap-1"
                >
                  <Camera className="w-5 h-5 text-amber-400" />
                  <span>Change Photo</span>
                </div>
              </div>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-red-950 hover:bg-red-900 border border-red-700 text-red-300 shadow-md transition-colors"
                  title="Remove avatar photo"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="text-xs font-semibold text-zinc-200 flex items-center justify-center sm:justify-start gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload Custom Profile Photo</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Upload your portrait photo (PNG, JPEG, WEBP) to personalize your scholar presence in community discussions and reading sessions.
              </p>

              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-800/60 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Photo File</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {/* Preset Avatars */}
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="text-[10px] text-zinc-500">Presets:</span>
                  {PRESET_AVATARS.map((preset, idx) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setAvatarUrl(preset.url)}
                      className="w-7 h-7 rounded-lg border border-white/10 hover:border-amber-400/80 overflow-hidden transition-all shrink-0"
                      title={preset.name}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Scholar Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-[#12121b] border border-white/5 text-center">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Books Read</div>
              <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">{booksReadCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#12121b] border border-white/5 text-center">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Monthly Goal</div>
              <div className="text-lg font-bold text-zinc-200 font-mono mt-0.5">{readingGoalPerMonth} vols</div>
            </div>
            <div className="p-3 rounded-xl bg-[#12121b] border border-white/5 text-center">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Active Sessions</div>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{sessionsHostedCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#12121b] border border-white/5 text-center">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Discourse Theses</div>
              <div className="text-lg font-bold text-red-400 font-mono mt-0.5">{discussionsCount}</div>
            </div>
          </div>

          {/* 3. Core Profile Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Scholar Alias / Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Helena Vance"
                className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-xl focus:outline-none focus:border-red-600/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Sanctuary Email (Verified Identity)
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-3 py-2 text-xs text-zinc-400 bg-[#101018] border border-white/5 rounded-xl font-mono cursor-not-allowed"
              />
            </div>
          </div>

          {/* 4. Psychological Archetype Affinity & Favorite Tome */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Archetype Affinity</span>
              </label>
              <select
                value={archetypeAffinity}
                onChange={(e) => setArchetypeAffinity(e.target.value)}
                className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-xl focus:outline-none focus:border-red-600/60 transition-colors"
              >
                <option value="The Shadow">The Shadow (Jungian Psychoanalysis)</option>
                <option value="The Strategist">The Strategist (Machiavellian Power)</option>
                <option value="The Manipulator">The Manipulator (Compliance Psychology)</option>
                <option value="The Sovereign">The Sovereign (Calculated Realpolitik)</option>
                <option value="The Stoic">The Stoic (Cognitive Self-Mastery)</option>
                <option value="The Alchemist">The Alchemist (Subconscious Transformation)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-red-400" />
                <span>Primary Favorite Tome</span>
              </label>
              <input
                type="text"
                value={favoriteBook}
                onChange={(e) => setFavoriteBook(e.target.value)}
                placeholder="e.g. The Archetypes and The Collective Unconscious"
                className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-xl focus:outline-none focus:border-red-600/60 transition-colors"
              />
            </div>
          </div>

          {/* 5. Metrics Adjustment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Books Read Count
              </label>
              <input
                type="number"
                min="0"
                max="999"
                value={booksReadCount}
                onChange={(e) => setBooksReadCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-xl focus:outline-none focus:border-red-600/60 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Monthly Target Goal (Volumes)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={readingGoalPerMonth}
                onChange={(e) => setReadingGoalPerMonth(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-xl focus:outline-none focus:border-red-600/60 transition-colors font-mono"
              />
            </div>
          </div>

          {/* 6. Bio / Scholar Philosophy */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Scholar Biography & Psychological Creed
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Outline your research focus, shadow integration methods, or philosophical areas of interest..."
              className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-xl focus:outline-none focus:border-red-600/60 transition-colors leading-relaxed"
            />
          </div>

          {/* Actions */}
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
              disabled={isSaving || !name.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-red-950 hover:bg-red-900 border border-red-800/60 rounded-xl shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Persisting Profile...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Scholar Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
