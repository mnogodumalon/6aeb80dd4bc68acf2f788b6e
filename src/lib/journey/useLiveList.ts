/**
 * useLiveList — records that keep up with the platform, on EITHER door.
 *
 * The internal flow page and the public page (a beamer view, a public
 * counter) both read through a JourneyPort; this hook polls `port.list`,
 * pauses while the tab is hidden, never toasts a failed poll (the rows stay,
 * `stale` says so) and refreshes at once on the assistant's
 * `assistant:data-changed` (S-1, 03.11.2026). The dashboard's typed sibling is
 * `useLiveRecords` in `@/hooks/useLiveRecords` (internal door only, with a
 * pending-write overlay); this one is door-agnostic and deliberately plain.
 *
 *   const live = useLiveList(port, 'beitraege', { intervalMs: 10000, list: { filter: "r.v_freigabe == 'ja'" } });
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EntityKey } from './rules';
import type { JourneyPort, JourneyRecord, ListOptions } from './port';

export interface LiveListOptions {
  /** Poll every … ms (default 15 000; 0 = first load + events only). */
  intervalMs?: number;
  /** Skip polls while the tab is hidden, fetch once on return (default true). */
  pauseHidden?: boolean;
  /** Keep the last rows when a poll fails and mark them stale (default true). */
  keepOnError?: boolean;
  /** The port's list options (filter, limit, …). */
  list?: ListOptions;
  enabled?: boolean;
}

export interface LiveListState {
  records: JourneyRecord[];
  loading: boolean;
  error: Error | null;
  stale: boolean;
  lastSync: Date | null;
  reload: () => Promise<void>;
}

export function useLiveList(port: JourneyPort | null | undefined, entity: EntityKey, options: LiveListOptions = {}): LiveListState {
  const { intervalMs = 15_000, pauseHidden = true, keepOnError = true, enabled = true } = options;
  const listKey = JSON.stringify(options.list ?? {});
  const [records, setRecords] = useState<JourneyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [stale, setStale] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const alive = useRef(true);
  const seq = useRef(0);

  const fetchOnce = useCallback(async () => {
    if (!enabled || !port) return;
    const my = ++seq.current;
    try {
      const rows = await port.list(entity, JSON.parse(listKey) as ListOptions);
      if (!alive.current || my !== seq.current) return;   // a newer fetch answered already
      setRecords(rows); setError(null); setStale(false); setLastSync(new Date());
    } catch (err) {
      if (!alive.current || my !== seq.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
      setStale(true);
      if (!keepOnError) setRecords([]);
    } finally {
      if (alive.current && my === seq.current) setLoading(false);
    }
  }, [port, entity, listKey, enabled, keepOnError]);

  useEffect(() => {
    alive.current = true;
    void fetchOnce();
    return () => { alive.current = false; };
  }, [fetchOnce]);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => { if (!(pauseHidden && typeof document !== 'undefined' && document.hidden)) void fetchOnce(); };
    const timer = intervalMs > 0 ? window.setInterval(tick, intervalMs) : null;
    const onVisible = () => { if (!document.hidden) void fetchOnce(); };
    const onChanged = () => { void fetchOnce(); };
    if (pauseHidden) document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('assistant:data-changed', onChanged);
    return () => {
      if (timer !== null) window.clearInterval(timer);
      if (pauseHidden) document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('assistant:data-changed', onChanged);
    };
  }, [fetchOnce, intervalMs, pauseHidden, enabled]);

  return { records, loading, error, stale, lastSync, reload: fetchOnce };
}
