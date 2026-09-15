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
  points: number;
  achievements: string[];
  settings: { sound: boolean; reducedMotion: boolean };
  currentGame?: SavedGame;
};

const STORAGE_KEY = "arabic-crosswords-progress-v3";
const LEGACY_KEYS = ["arabic-crosswords-progress-v2", "arabic-crosswords-progress-v1"];
const DEFAULT_PROGRESS: SavedProgress = { completed: {}, hints: 5, points: 0, achievements: [], settings: { sound: true, reducedMotion: false } };

function sanitizeProgress(value: unknown): SavedProgress {
  if (!value || typeof value !== "object") return { ...DEFAULT_PROGRESS, settings: { ...DEFAULT_PROGRESS.settings } };
  const parsed = value as Partial<SavedProgress>;
  const settings = parsed.settings && typeof parsed.settings === "object" ? parsed.settings as Partial<SavedProgress["settings"]> : {};
  return {
    completed: parsed.completed && typeof parsed.completed === "object" ? parsed.completed : {},
    lastPlayed: parsed.lastPlayed,
    hints: typeof parsed.hints === "number" ? Math.max(0, parsed.hints) : DEFAULT_PROGRESS.hints,
    points: typeof parsed.points === "number" ? Math.max(0, Math.floor(parsed.points)) : 0,
    achievements: Array.isArray(parsed.achievements) ? parsed.achievements.filter((item): item is string => typeof item === "string") : [],
    settings: { sound: settings.sound !== false, reducedMotion: settings.reducedMotion === true },
    currentGame: parsed.currentGame,
  };
}

export function loadProgress(): SavedProgress {
  if (typeof window === "undefined") return { ...DEFAULT_PROGRESS, settings: { ...DEFAULT_PROGRESS.settings } };
  try {
    const raw = [STORAGE_KEY, ...LEGACY_KEYS].map((key) => window.localStorage.getItem(key)).find(Boolean);
    return raw ? sanitizeProgress(JSON.parse(raw)) : { ...DEFAULT_PROGRESS, settings: { ...DEFAULT_PROGRESS.settings } };
  } catch {
    return { ...DEFAULT_PROGRESS, settings: { ...DEFAULT_PROGRESS.settings } };
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
  const stageId = stageKey(level, stage);
  const completed = { ...progress.completed, [stageId]: { completedAt: new Date().toISOString(), hintsUsed } };
  const achievements = new Set(progress.achievements);
  const count = Object.keys(completed).length;
  if (count >= 1) achievements.add("first-stage");
  if (count >= 10) achievements.add("ten-stages");
  if (count >= 50) achievements.add("fifty-stages");
  if (count >= totalStageCount()) achievements.add("all-stages");
  return {
    ...withoutGame,
    completed,
    points: progress.points + (progress.completed[stageId] ? 0 : 100 + Math.max(0, 25 - hintsUsed * 5)),
    achievements: Array.from(achievements),
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
  LEGACY_KEYS.forEach((key) => window.localStorage.removeItem(key));
  window.dispatchEvent(new CustomEvent("crosswords-progress-updated"));
}
