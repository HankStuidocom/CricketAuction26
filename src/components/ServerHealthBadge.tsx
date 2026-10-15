import React, { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '../lib/api';
import { Activity, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export type ServerStatus = 'online' | 'waking' | 'offline' | 'checking';

interface ServerHealthBadgeProps {
  className?: string;
  compact?: boolean;
  showDetails?: boolean;
}

export function ServerHealthBadge({
  className = '',
  compact = false,
  showDetails = false
}: ServerHealthBadgeProps) {
  const [status, setStatus] = useState<ServerStatus>('checking');
  const [latency, setLatency] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<number>(Date.now());
  const [isPinging, setIsPinging] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      const baseUrl = getBackendUrl();
      const url = `${baseUrl}/api/health`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timeoutId);

      const elapsed = Math.round(performance.now() - start);

      if (res.ok) {
        setStatus('online');
        setLatency(elapsed);
      } else if (res.status === 502 || res.status === 503 || res.status === 504) {
        setStatus('waking');
        setLatency(null);
      } else {
        setStatus('offline');
        setLatency(null);
      }
    } catch {
      // Aborted or network failure (often cold start on free Render instance)
      setStatus('waking');
      setLatency(null);
    } finally {
      setIsPinging(false);
      setLastChecked(Date.now());
    }
  }, []);

  useEffect(() => {
    checkHealth();

    // Poll every 25s when online, or every 8s when waking/offline
    const intervalTime = status === 'online' ? 25000 : 8000;
    const interval = setInterval(checkHealth, intervalTime);

    return () => clearInterval(interval);
  }, [checkHealth, status]);

  if (compact) {
    return (
      <button
        onClick={checkHealth}
        disabled={isPinging}
        title={`Server status: ${status.toUpperCase()} (${status === 'online' ? `${latency ?? 0}ms` : 'Click to ping'})`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase transition-all duration-200 border cursor-pointer select-none ${
          status === 'online'
            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50'
            : status === 'waking'
            ? 'bg-amber-950/40 text-amber-400 border-amber-500/30 hover:border-amber-500/50 animate-pulse'
            : status === 'offline'
            ? 'bg-rose-950/40 text-rose-400 border-rose-500/30 hover:border-rose-500/50'
            : 'bg-slate-800/50 text-slate-400 border-slate-700/50'
        } ${className}`}
      >
        <span className="relative flex h-2 w-2">
          {status === 'online' && (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </>
          )}
          {status === 'waking' && (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </>
          )}
          {status === 'offline' && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          )}
          {status === 'checking' && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
          )}
        </span>

        <span className="truncate">
          {status === 'online'
            ? 'Live'
            : status === 'waking'
            ? 'Waking (~30s)'
            : status === 'offline'
            ? 'Offline'
            : 'Connecting...'}
        </span>

        {isPinging && <RefreshCw className="w-2.5 h-2.5 animate-spin opacity-70 ml-0.5" />}
      </button>
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs border backdrop-blur-md transition-all ${
        status === 'online'
          ? 'bg-emerald-950/20 text-emerald-300 border-emerald-500/20'
          : status === 'waking'
          ? 'bg-amber-950/25 text-amber-300 border-amber-500/30'
          : status === 'offline'
          ? 'bg-rose-950/25 text-rose-300 border-rose-500/30'
          : 'bg-slate-900/40 text-slate-400 border-slate-800'
      } ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {status === 'online' && (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </>
          )}
          {status === 'waking' && (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </>
          )}
          {status === 'offline' && (
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          )}
          {status === 'checking' && (
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400"></span>
          )}
        </span>

        <div className="min-w-0">
          <div className="font-semibold text-xs tracking-wide flex items-center gap-1.5">
            {status === 'online' && (
              <>
                <span>Server Online</span>
                {latency !== null && (
                  <span className="text-[10px] text-emerald-400/70 font-normal">({latency}ms)</span>
                )}
              </>
            )}
            {status === 'waking' && <span>Server Waking Up (~30s)</span>}
            {status === 'offline' && <span>Server Offline</span>}
            {status === 'checking' && <span>Checking Server Status...</span>}
          </div>

          {showDetails && status === 'waking' && (
            <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
              Render free instance is spinning up. The auction room and database will be ready in a moment.
            </p>
          )}
        </div>
      </div>

      <button
        onClick={checkHealth}
        disabled={isPinging}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0 disabled:opacity-50"
        title="Check server health now"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-amber-400' : ''}`} />
      </button>
    </div>
  );
}
