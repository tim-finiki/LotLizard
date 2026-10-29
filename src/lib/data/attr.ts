import type { Attributed, Attribution, ConfidenceLevel } from "@/lib/types";

export function attr(confidence: ConfidenceLevel, sourceIds: string[], notes?: string): Attribution {
  return { confidence, sourceIds, ...(notes ? { notes } : {}) };
}

export function fact<T>(value: T, confidence: ConfidenceLevel, sourceIds: string[], notes?: string): Attributed<T> {
  return { value, attribution: attr(confidence, sourceIds, notes) };
}
