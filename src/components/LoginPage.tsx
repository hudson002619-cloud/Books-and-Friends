import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Key, Check, Info, Lock, Mail, User as UserIcon } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError('Passwords do not match. Please verify your password entry.');
          setLoading(false);
          return;
        }

        const res = await signUp(email, password, name);
        if (!res.success) {
          setError(res.error || 'Registration failed. Please check your credentials.');
        } else if (res.isExistingUser) {
          setSuccessNotice('Existing account found. Connected to your central cloud profile & synchronized across devices!');
        } else {
          setSuccessNotice('Account created successfully! Synchronized to cloud database...');
        }
      } else {
        const res = await signIn(email, password);
        if (!res.success) {
          setError(res.error || 'Invalid email or password.');
        } else {
          setSuccessNotice('Signed in successfully! Cloud profile synchronized...');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#075985] bg-gradient-to-br from-[#0c4a6e] via-[#0284c7] to-[#0369a1] p-4 relative overflow-hidden font-sans select-text">
      {/* Subtle Background Lighting & Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.2),rgba(255,255,255,0))]" />
      
      {/* Brand Header */}
      <div className="absolute top-6 md:top-8 text-center text-white/90 z-10 px-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-display drop-shadow-md">
          BOOKS AND FRIENDS
        </h1>
        <p className="text-xs md:text-sm text-cyan-100/80 mt-1">
          Dark Psychology Sanctuary & Analytical Reading Circle
        </p>
      </div>

      {/* Main Authentication Card - Clean and Secure */}
      <div className="relative z-20 w-full max-w-[420px] bg-white rounded-lg shadow-2xl p-7 md:p-9 text-slate-800 transition-all border border-white/20 mt-16 md:mt-12 mb-6">
        <h2 className="text-2xl md:text-3xl font-normal text-center text-slate-700 mb-6 font-sans">
          {isSignUp ? 'Sign Up' : 'Login'}
        </h2>

        {error && (
          <div className="mb-5 p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded flex items-start gap-2 animate-fadeIn">
            <span className="font-bold shrink-0">!</span>
            <span>{error}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-5 p-3 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded flex items-start gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-normal text-slate-700 mb-1">
                Full Name:
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
                className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-normal text-slate-700 mb-1">
              Email:
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-normal text-slate-700 mb-1">
              Password:
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 transition"
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-sm font-normal text-slate-700 mb-1">
                Confirm Password:
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 transition"
              />
            </div>
          )}

          {/* Show Password Checkbox */}
          <div className="flex items-center pt-1">
            <input
              type="checkbox"
              id="showPasswordToggle"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600 cursor-pointer"
            />
            <label
              htmlFor="showPasswordToggle"
              className="ml-2 block text-sm text-slate-700 select-none cursor-pointer"
            >
              Show Password
            </label>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#006687] hover:bg-[#005570] active:bg-[#00445a] text-white text-sm font-semibold tracking-wider uppercase rounded transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Verifying...</span>
              ) : isSignUp ? (
                <span>SIGN UP</span>
              ) : (
                <span>SIGN IN</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer Links (Forgot Password & Toggle Sign Up/Sign In) */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center space-y-2 text-sm text-slate-600">
          <div>
            <button
              type="button"
              onClick={() => setForgotModalOpen(true)}
              className="text-[#006687] hover:underline cursor-pointer"
            >
              Forgot Username / Password?
            </button>
          </div>
          <div>
            {isSignUp ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setError(null);
                  }}
                  className="text-[#006687] font-medium hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setError(null);
                  }}
                  className="text-[#006687] font-medium hover:underline cursor-pointer"
                >
                  Sign up
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Username/Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm w-full text-slate-800 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-700" />
              <span>Password Recovery</span>
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              If you have forgotten your password or username, please sign in with your registered email address or create a new reader account using Sign Up.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-slate-900">
                <Info className="w-3.5 h-3.5 text-cyan-700" />
                <span>Account Notice</span>
              </div>
              <p className="text-slate-600">
                For administrative security clearance, administrators must use their designated credentials. All reader progress and discussions are automatically preserved under your registered email.
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="py-1.5 px-4 bg-[#006687] text-white text-xs font-semibold rounded hover:bg-[#005570] transition cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
