import { stageKey, totalStageCount, LEVEL_COUNT, STAGES_PER_LEVEL } from "./content";

export type SavedProgress = {
  completed: Record<string, { completedAt: string; hintsUsed: number }>;
  lastPlayed?: { level: number; stage: number };
  hints: number;
};

const STORAGE_KEY = "arabic-crosswords-progress-v1";
const DEFAULT_PROGRESS: SavedProgress = { completed: {}, hints: 5 };

export function loadProgress(): SavedProgress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return {
      completed: parsed.completed ?? {},
      lastPlayed: parsed.lastPlayed,
      hints: typeof parsed.hints === "number" ? Math.max(0, parsed.hints) : DEFAULT_PROGRESS.hints,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: SavedProgress): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  window.dispatchEvent(new CustomEvent("crosswords-progress-updated"));
}

export function markStageComplete(progress: SavedProgress, level: number, stage: number, hintsUsed: number): SavedProgress {
  return {
    ...progress,
    completed: {
      ...progress.completed,
      [stageKey(level, stage)]: { completedAt: new Date().toISOString(), hintsUsed },
    },
    lastPlayed: { level, stage },
  };
}

export function isStageComplete(progress: SavedProgress, level: number, stage: number): boolean {
  return Boolean(progress.completed[stageKey(level, stage)]);
}

export function isStageUnlocked(progress: SavedProgress, level: number, stage: number): boolean {
  if (level === 1 && stage === 1) return true;
  if (stage > 1) return isStageComplete(progress, level, stage - 1);
  return isStageComplete(progress, level - 1, STAGES_PER_LEVEL);
}

export function completedCount(progress: SavedProgress): number {
  return Math.min(totalStageCount(), Object.keys(progress.completed).length);
}

export function completedLevelCount(progress: SavedProgress): number {
  return Array.from({ length: LEVEL_COUNT }, (_, index) => index + 1).filter((level) => isStageComplete(progress, level, STAGES_PER_LEVEL)).length;
}

export function resetProgress(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("crosswords-progress-updated"));
}
