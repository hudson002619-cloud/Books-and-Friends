import React, { useState } from 'react';
import { SupabaseConfigState } from '../types';
import { saveCustomSupabaseCredentials, validateSupabaseConnection, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from '../lib/supabase';
import { SUPABASE_ADMIN_FRAMEWORK_SQL } from './AdminPanel';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, X, Shield, Server, Key, Globe, Code2, Copy, CheckCheck } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  configState: SupabaseConfigState;
  onConfigUpdated: (newState: SupabaseConfigState) => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  configState,
  onConfigUpdated,
}) => {
  const [urlInput, setUrlInput] = useState(configState.url);
  const [keyInput, setKeyInput] = useState(configState.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    // Save inputs
    saveCustomSupabaseCredentials(urlInput, keyInput);

    // Validate
    const newState = await validateSupabaseConnection();
    onConfigUpdated(newState);
    setIsTesting(false);

    if (newState.isConnected) {
      setTestResult({
        success: true,
        message: `Successfully connected to Supabase REST cluster (${newState.latencyMs}ms latency).`,
        latency: newState.latencyMs ?? undefined,
      });
    } else if (newState.isConfigured) {
      setTestResult({
        success: false,
        message: newState.error || 'Connection failed. Please verify your Project URL and Anon Public Key.',
      });
    } else {
      setTestResult({
        success: true,
        message: 'Credentials cleared. Operating in Client-Side Sanctuary Database Engine.',
      });
    }
  };

  const handleResetToEnv = async () => {
    saveCustomSupabaseCredentials('', '');
    setUrlInput(import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL);
    setKeyInput(import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY);
    setIsTesting(true);
    const newState = await validateSupabaseConnection();
    onConfigUpdated(newState);
    setIsTesting(false);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_ADMIN_FRAMEWORK_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#0e0e14] border border-white/10 rounded-xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-900/60 via-amber-600/40 to-slate-800/80" />

        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-950/40 border border-red-800/30 text-red-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 font-display">Supabase Database Diagnostics</h2>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                <span>Books and Friends Core Storage</span>
                <span>·</span>
                <span>Developer Admin Framework</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto pr-1 space-y-4 flex-1">
          {/* Live Status Overview */}
          <div className="p-3.5 rounded-lg bg-[#14141d] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Connection Health</span>
              <div className="flex items-center gap-1.5">
                {configState.isConnected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-400">Live Supabase Cluster ({configState.latencyMs}ms)</span>
                  </>
                ) : configState.isConfigured ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-medium text-amber-400">Degraded / Unreachable</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-xs font-medium text-blue-300">Sanctuary Client DB (Local Active)</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Runtime Target</span>
              <span className="font-mono text-zinc-300 truncate max-w-[280px]">
                {configState.url || 'Client Memory / Persistent Storage'}
              </span>
            </div>

            {configState.error && (
              <div className="p-2 mt-2 text-xs text-red-300 bg-red-950/30 border border-red-900/40 rounded">
                {configState.error}
              </div>
            )}
          </div>

          {/* Toggle SQL Setup View */}
          <div className="flex items-center justify-between p-2.5 bg-[#12121c] border border-white/5 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Code2 className="w-4 h-4 text-amber-400" />
              <span>Supabase Admin Schema & RLS SQL Setup</span>
            </div>
            <button
              type="button"
              onClick={() => setShowSql(!showSql)}
              className="px-2.5 py-1 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/40 rounded transition-colors cursor-pointer"
            >
              {showSql ? 'Hide SQL Code' : 'View SQL Setup'}
            </button>
          </div>

          {showSql && (
            <div className="space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>PostgreSQL Migration Script</span>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center gap-1 text-red-300 hover:text-red-200 cursor-pointer"
                >
                  {copiedSql ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied to Clipboard' : 'Copy All SQL'}</span>
                </button>
              </div>
              <div className="p-3 bg-black rounded-lg border border-white/10 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-[220px]">
                <pre>{SUPABASE_ADMIN_FRAMEWORK_SQL}</pre>
              </div>
            </div>
          )}

          {/* Configuration Form */}
          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-zinc-400" />
                <span>Supabase Project URL (VITE_SUPABASE_URL)</span>
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3 py-2 text-xs text-zinc-200 bg-[#161622] border border-white/10 rounded-lg focus:outline-none focus:border-amber-500/50 font-mono transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-zinc-400" />
                <span>Anon Public Key (VITE_SUPABASE_ANON_KEY)</span>
              </label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 text-xs text-zinc-200 bg-[#161622] border border-white/10 rounded-lg focus:outline-none focus:border-amber-500/50 font-mono transition-colors"
              />
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                    : 'bg-red-950/20 border-red-800/40 text-red-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                )}
                <div>
                  <p className="font-medium">{testResult.message}</p>
                  {testResult.latency && (
                    <p className="text-[11px] text-zinc-400 mt-0.5">Roundtrip ping completed in {testResult.latency}ms.</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleResetToEnv}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline transition-colors cursor-pointer"
              >
                Reset to .env defaults
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isTesting}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-red-900/80 hover:bg-red-800 border border-red-700/50 rounded-lg transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating...</span>
                    </>
                  ) : (
                    <>
                      <Server className="w-3.5 h-3.5" />
                      <span>Test & Save Connection</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-amber-500/80" />
            Developer Admin: adhudson504@gmail.com
          </span>
          <span>Tables: books, discussions, profiles, audit_logs</span>
        </div>
      </div>
    </div>
  );
};
