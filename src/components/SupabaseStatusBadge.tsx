import React, { useState } from 'react';
import { SupabaseConfigState } from '../types';
import { SupabaseConfigModal } from './SupabaseConfigModal';
import { Database, RefreshCw } from 'lucide-react';

interface SupabaseStatusBadgeProps {
  configState: SupabaseConfigState;
  onRefresh: () => void;
  onConfigUpdated: (newState: SupabaseConfigState) => void;
}

export const SupabaseStatusBadge: React.FC<SupabaseStatusBadgeProps> = ({
  configState,
  onRefresh,
  onConfigUpdated,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1 text-xs font-medium bg-[#13131a] hover:bg-[#1c1c27] text-zinc-300 hover:text-white border border-white/10 rounded-lg transition-all"
          title="Supabase Database Status & Configuration"
        >
          <Database className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline">Supabase:</span>
          {configState.isValidating ? (
            <span className="flex items-center gap-1 text-zinc-400">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Validating
            </span>
          ) : configState.isConnected ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected ({configState.latencyMs}ms)
            </span>
          ) : configState.isConfigured ? (
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Degraded
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Local DB
            </span>
          )}
        </button>

        <button
          onClick={onRefresh}
          className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors rounded hover:bg-white/5"
          title="Re-validate Supabase Connection"
          aria-label="Revalidate database connection"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${configState.isValidating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <SupabaseConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        configState={configState}
        onConfigUpdated={onConfigUpdated}
      />
    </>
  );
};
