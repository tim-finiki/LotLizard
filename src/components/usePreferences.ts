"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_PREFERENCES, type RankingPreferences } from "@/lib/ranking";

const KEY = "lotlizard:prefs:v1";
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: RankingPreferences } | null = null;
/** Used when localStorage is unavailable (e.g. blocked in private mode). */
let memoryRaw: string | null = null;

function getRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return memoryRaw;
  }
}

function read(): RankingPreferences {
  const raw = getRaw();
  if (cache && cache.raw === raw) return cache.value;
  let value = DEFAULT_PREFERENCES;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<RankingPreferences>;
      value = { ...DEFAULT_PREFERENCES, ...parsed, weights: { ...DEFAULT_PREFERENCES.weights, ...parsed.weights } };
    } catch {
      // Corrupt value: ignore.
    }
  }
  cache = { raw, value };
  return value;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** Ranking preferences persisted on this device (no account needed). */
export function usePreferences(): [RankingPreferences, (next: RankingPreferences) => void] {
  const prefs = useSyncExternalStore(subscribe, read, () => DEFAULT_PREFERENCES);
  const set = useCallback((next: RankingPreferences) => {
    const raw = JSON.stringify(next);
    try {
      window.localStorage.setItem(KEY, raw);
    } catch {
      memoryRaw = raw;
    }
    listeners.forEach((l) => l());
  }, []);
  return [prefs, set];
}
