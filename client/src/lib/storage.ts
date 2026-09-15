import { stageKey, totalStageCount, LEVEL_COUNT, STAGES_PER_LEVEL } from "./content";

export type SavedGame = {
  level: number;
  stage: number;
  answers: Record<string, string>;
  selectedKey: string;
  selectedEntryId: string;
  hintsUsed: number;
  savedAt: string;
};

export type SavedProgress = {
  completed: Record<string, { completedAt: string; hintsUsed: number }>;
  lastPlayed?: { level: number; stage: number };
  hints: number;
  currentGame?: SavedGame;
};

const STORAGE_KEY = "arabic-crosswords-progress-v2";
const LEGACY_KEY = "arabic-crosswords-progress-v1";
const DEFAULT_PROGRESS: SavedProgress = { completed: {}, hints: 5 };

function sanitizeProgress(value: unknown): SavedProgress {
  if (!value || typeof value !== "object") return { ...DEFAULT_PROGRESS };
  const parsed = value as Partial<SavedProgress>;
  return {
    completed: parsed.completed && typeof parsed.completed === "object" ? parsed.completed : {},
    lastPlayed: parsed.lastPlayed,
    hints: typeof parsed.hints === "number" ? Math.max(0, parsed.hints) : DEFAULT_PROGRESS.hints,
    currentGame: parsed.currentGame,
  };
}

export function loadProgress(): SavedProgress {
  if (typeof window === "undefined") return { ...DEFAULT_PROGRESS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    return raw ? sanitizeProgress(JSON.parse(raw)) : { ...DEFAULT_PROGRESS };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: SavedProgress): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  window.dispatchEvent(new CustomEvent("crosswords-progress-updated"));
}

export function saveCurrentGame(progress: SavedProgress, game: SavedGame): SavedProgress {
  const next = { ...progress, lastPlayed: { level: game.level, stage: game.stage }, currentGame: game };
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function markStageComplete(progress: SavedProgress, level: number, stage: number, hintsUsed: number): SavedProgress {
  const { currentGame: _currentGame, ...withoutGame } = progress;
  return {
    ...withoutGame,
    completed: { ...progress.completed, [stageKey(level, stage)]: { completedAt: new Date().toISOString(), hintsUsed } },
    lastPlayed: { level, stage },
  };
}

export function isStageComplete(progress: SavedProgress, level: number, stage: number): boolean { return Boolean(progress.completed[stageKey(level, stage)]); }
export function isStageUnlocked(progress: SavedProgress, level: number, stage: number): boolean {
  if (level === 1 && stage === 1) return true;
  if (stage > 1) return isStageComplete(progress, level, stage - 1);
  return isStageComplete(progress, level - 1, STAGES_PER_LEVEL);
}
export function completedCount(progress: SavedProgress): number { return Math.min(totalStageCount(), Object.keys(progress.completed).length); }
export function completedLevelCount(progress: SavedProgress): number { return Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1).filter((level) => isStageComplete(progress, level, STAGES_PER_LEVEL)).length; }
export function resetProgress(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_KEY);
  window.dispatchEvent(new CustomEvent("crosswords-progress-updated"));
}
