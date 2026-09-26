import React, { useState } from 'react';
import { useAuth, ADMIN_EMAIL, ADMIN_PASSWORD } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, User as UserIcon, X, ShieldAlert, Sparkles, LogIn, UserPlus, KeyRound, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
}) => {
  const { signIn, signUp, switchDemoRole } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  
  // Password visibility states: masked (***) by default
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const res = await signIn(email, password);
        if (!res.success) {
          setError(res.error || 'Authentication failed. Please verify credentials.');
        } else {
          setSuccessMsg('Authentication verified. Welcome to the Sanctuary.');
          setTimeout(() => {
            onClose();
          }, 600);
        }
      } else {
        // Sign Up validation
        if (password !== confirmPassword) {
          setError('Passwords do not match. Please ensure both fields are identical.');
          setLoading(false);
          return;
        }

        const res = await signUp(email, password, name);
        if (!res.success) {
          setError(res.error || 'Registration failed.');
        } else {
          setSuccessMsg('Account registered successfully. Initiating sanctuary session...');
          setTimeout(() => {
            onClose();
          }, 600);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDeveloperAdmin = () => {
    setEmail(ADMIN_EMAIL);
    setPassword(ADMIN_PASSWORD);
    setConfirmPassword(ADMIN_PASSWORD);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0d0d13] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden">
        {/* Cinematic Rim Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-950 via-red-600/70 to-slate-900" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 font-display">
              {mode === 'signin' ? 'Enter The Sanctuary' : 'Initiate Membership'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {mode === 'signin'
                ? 'Sign in to access your dark psychology reading vault'
                : 'Create an account to join reading circles and salons'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors rounded-lg hover:bg-white/5"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center p-1 mb-4 bg-[#14141d] rounded-lg border border-white/5">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'signin'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'signup'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign Up
          </button>
        </div>

          {error && (
            <div className="p-3 mb-4 text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-lg flex items-start gap-2 animate-fadeIn">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 mb-4 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/50 rounded-lg flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Full Name or Scholar Alias</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Helena Vance"
                className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-lg focus:outline-none focus:border-red-600/60 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-zinc-400" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@domain.com or adhudson504@gmail.com"
              className="w-full px-3 py-2 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-lg focus:outline-none focus:border-red-600/60 transition-colors font-mono"
            />
          </div>

          {/* Password Field with Show/Hide Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Password</span>
              </label>

              {/* Show Password toggle text button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer select-none"
                title={showPassword ? 'Mask password characters' : 'Unmask password characters'}
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3 h-3 text-red-400" />
                    <span className="text-red-300">Hide Password</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 text-zinc-400" />
                    <span>Show Password</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={showPassword ? 'mYZuMr4W1hjEqE0q' : '••••••••••••'}
                className="w-full px-3 py-2 pr-10 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-lg focus:outline-none focus:border-red-600/60 transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label={showPassword ? 'Hide password characters' : 'Show password characters'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-red-400" />
                ) : (
                  <Eye className="w-4 h-4 text-zinc-400" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              {showPassword
                ? 'Characters unmasked: Password is visible.'
                : 'Characters masked: Click Show Password or eye icon to reveal.'}
            </p>
          </div>

          {/* Confirm Password Field (Sign Up Only) with its own Show/Hide Toggle */}
          {mode === 'signup' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Confirm Password</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer select-none"
                  title={showConfirmPassword ? 'Mask confirmation characters' : 'Unmask confirmation characters'}
                >
                  {showConfirmPassword ? (
                    <>
                      <EyeOff className="w-3 h-3 text-red-400" />
                      <span className="text-red-300">Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3 text-zinc-400" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={showConfirmPassword ? 'Confirm password text' : '••••••••••••'}
                  className="w-full px-3 py-2 pr-10 text-xs text-zinc-100 bg-[#161622] border border-white/10 rounded-lg focus:outline-none focus:border-red-600/60 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4 text-red-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 mt-2 text-xs font-semibold text-white bg-red-950 hover:bg-red-900 border border-red-700/60 rounded-lg shadow-lg hover:shadow-red-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Authenticating with Sanctuary Security...</span>
              </span>
            ) : mode === 'signin' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Sanctuary</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Sanctuary Account</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
