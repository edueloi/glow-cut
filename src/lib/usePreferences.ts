import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "./api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserPrefs {
  /** Default page size for list/table components */
  pageSize?: number;
  /** Per-table page size overrides (keyed by table id) */
  pageSizes?: Record<string, number>;
  /** View mode per page/tab (grid | list) keyed by page id */
  viewMode?: Record<string, string>;
  /** Sort state per page/tab keyed by page id */
  sortState?: Record<string, { key: string; order: "asc" | "desc" }>;
  /** Active filters saved per page/tab */
  filters?: Record<string, Record<string, string>>;
  /** Any additional ad-hoc preferences */
  [key: string]: unknown;
}

const DEFAULT_PAGE_SIZE = 15;
const PAGE_SIZE_OPTIONS = [5, 15, 30, 50, 100, 200] as const;
export type PageSizeOption = typeof PAGE_SIZE_OPTIONS[number];
export { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE };

// ─── Debounce helper ─────────────────────────────────────────────────────────

function useDebouncedSave(fn: (data: UserPrefs) => void, delay = 800) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((data: UserPrefs) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(data), delay);
  }, [fn, delay]);
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UsePreferencesReturn {
  prefs: UserPrefs;
  loading: boolean;
  /** Set an arbitrary preference key */
  set: (key: string, value: unknown) => void;
  /** Get page size for a specific table (falls back to global default) */
  getPageSize: (tableId: string) => number;
  /** Set page size for a specific table */
  setPageSize: (tableId: string, size: number) => void;
  /** Get view mode for a specific page/tab */
  getViewMode: (pageId: string) => string | undefined;
  /** Set view mode for a specific page/tab */
  setViewMode: (pageId: string, mode: string) => void;
}

export function usePreferences(): UsePreferencesReturn {
  const [prefs, setPrefs] = useState<UserPrefs>({});
  const [loading, setLoading] = useState(true);

  // Save to server (debounced)
  const saveToServer = useCallback(async (data: UserPrefs) => {
    try {
      await apiFetch("/api/preferences", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    } catch {
      // Silent fail — preferences are non-critical
    }
  }, []);

  const debouncedSave = useDebouncedSave(saveToServer);

  // Load preferences on mount
  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/preferences")
      .then(r => r.json())
      .then((data: UserPrefs) => {
        if (!cancelled) setPrefs(data || {});
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Merge update helper
  const update = useCallback((patch: Partial<UserPrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch };
      debouncedSave(patch);
      return next;
    });
  }, [debouncedSave]);

  const set = useCallback((key: string, value: unknown) => {
    update({ [key]: value });
  }, [update]);

  const getPageSize = useCallback((tableId: string): number => {
    return prefs.pageSizes?.[tableId] ?? prefs.pageSize ?? DEFAULT_PAGE_SIZE;
  }, [prefs]);

  const setPageSize = useCallback((tableId: string, size: number) => {
    setPrefs(prev => {
      const next = {
        ...prev,
        pageSizes: { ...(prev.pageSizes || {}), [tableId]: size },
      };
      debouncedSave({ pageSizes: next.pageSizes });
      return next;
    });
  }, [debouncedSave]);

  const getViewMode = useCallback((pageId: string): string | undefined => {
    return prefs.viewMode?.[pageId];
  }, [prefs]);

  const setViewMode = useCallback((pageId: string, mode: string) => {
    setPrefs(prev => {
      const next = {
        ...prev,
        viewMode: { ...(prev.viewMode || {}), [pageId]: mode },
      };
      debouncedSave({ viewMode: next.viewMode });
      return next;
    });
  }, [debouncedSave]);

  return { prefs, loading, set, getPageSize, setPageSize, getViewMode, setViewMode };
}
