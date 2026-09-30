import type { Hardness } from '@/hooks/usePredictionsDashboard';

export const COOKING_DURATIONS = [
  { minutes: 20, key: 'hardness_20m' },
  { minutes: 30, key: 'hardness_30m' },
  { minutes: 40, key: 'hardness_40m' },
] as const;

/** Shortest cooking duration whose predicted hardness reaches the threshold, or null if none does. */
export function cookedAfter(hardness: Hardness, thresholdN: number): number | null {
  const hit = COOKING_DURATIONS.find(d => hardness[d.key] <= thresholdN);
  return hit ? hit.minutes : null;
}

export function formatNewtons(value: number): string {
  return Math.round(value).toLocaleString();
}
