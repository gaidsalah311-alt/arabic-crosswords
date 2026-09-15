import type { StageEntry } from "./content";

export type Direction = "across" | "down";

export type PlacedEntry = StageEntry & {
  direction: Direction;
  startX: number;
  startY: number;
  cells: Array<{ x: number; y: number; char: string }>;
};

export type CrosswordCell = {
  x: number;
  y: number;
  char: string;
  number?: number;
  entryIds: string[];
};

export type CrosswordBoard = {
  width: number;
  height: number;
  cells: CrosswordCell[];
  entries: PlacedEntry[];
};

/** Normalize Arabic variants once so clue answers and the grid use the same alphabet. */
export function normalizeWord(word: string): string {
  return word
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/ـ/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .trim();
}

function chars(word: string): string[] {
  return Array.from(normalizeWord(word));
}

function key(x: number, y: number): string {
  return `${x}:${y}`;
}

function occupiedHas(occupied: Map<string, string>, x: number, y: number): boolean {
  return occupied.has(key(x, y));
}

function candidateCells(word: string[], x: number, y: number, direction: Direction) {
  const dx = direction === "across" ? 1 : 0;
  const dy = direction === "down" ? 1 : 0;
  return word.map((char, index) => ({ x: x + dx * index, y: y + dy * index, char }));
}

/**
 * True crossword placement rules:
 * - overlapping cells must contain the same letter;
 * - non-overlapping cells cannot touch another word orthogonally;
 * - the cell immediately before/after an entry must be empty.
 */
function canPlace(
  occupied: Map<string, string>,
  word: string[],
  x: number,
  y: number,
  direction: Direction,
): boolean {
  const cells = candidateCells(word, x, y, direction);
  const dx = direction === "across" ? 1 : 0;
  const dy = direction === "down" ? 1 : 0;

  const before = { x: x - dx, y: y - dy };
  const after = { x: x + dx * word.length, y: y + dy * word.length };
  if (occupiedHas(occupied, before.x, before.y) || occupiedHas(occupied, after.x, after.y)) return false;

  for (const cell of cells) {
    const existing = occupied.get(key(cell.x, cell.y));
    if (existing && existing !== cell.char) return false;
    if (existing) continue;

    const perpendicular = direction === "across"
      ? [{ x: cell.x, y: cell.y - 1 }, { x: cell.x, y: cell.y + 1 }]
      : [{ x: cell.x - 1, y: cell.y }, { x: cell.x + 1, y: cell.y }];

    if (perpendicular.some((neighbor) => occupiedHas(occupied, neighbor.x, neighbor.y))) return false;
  }
  return true;
}

function intersections(existing: PlacedEntry[], word: string[]): Array<{ x: number; y: number; direction: Direction }> {
  const options: Array<{ x: number; y: number; direction: Direction }> = [];
  const seen = new Set<string>();
  for (const entry of existing) for (const source of entry.cells) for (let index = 0; index < word.length; index += 1) {
    if (word[index] !== source.char) continue;
    const direction: Direction = entry.direction === "across" ? "down" : "across";
    const x = direction === "across" ? source.x - index : source.x;
    const y = direction === "down" ? source.y - index : source.y;
    const optionKey = `${x}:${y}:${direction}`;
    if (!seen.has(optionKey)) { seen.add(optionKey); options.push({ x, y, direction }); }
  }
  return options;
}

function scorePlacement(occupied: Map<string, string>, word: string[], x: number, y: number, direction: Direction): number {
  const cells = candidateCells(word, x, y, direction);
  const intersectionsCount = cells.filter((cell) => occupied.has(key(cell.x, cell.y))).length;
  return intersectionsCount * 100 - Math.abs(x) - Math.abs(y);
}

function placeEntries(entries: StageEntry[]): PlacedEntry[] {
  const ordered = [...entries].map((entry) => ({ entry, word: chars(entry.word) })).filter(({ word }) => word.length > 0).sort((a, b) => b.word.length - a.word.length);
  if (!ordered.length) return [];

  const fallbackLayout = (): PlacedEntry[] => {
    let y = 0;
    return ordered.map(({ entry, word }) => {
      const cells = candidateCells(word, 0, y, "across");
      y += 2;
      return { ...entry, word: word.join(""), startX: 0, startY: cells[0].y, direction: "across", cells };
    });
  };

  const tryRoot = (rootIndex: number): PlacedEntry[] | undefined => {
    const occupied = new Map<string, string>();
    const placed: PlacedEntry[] = [];
    const root = ordered[rootIndex];
    const rootX = -Math.floor(root.word.length / 2);
    const rootCells = candidateCells(root.word, rootX, 0, "across");
    rootCells.forEach((cell) => occupied.set(key(cell.x, cell.y), cell.char));
    placed.push({ ...root.entry, word: root.word.join(""), startX: rootX, startY: 0, direction: "across", cells: rootCells });
    const pending = ordered.filter((_, index) => index !== rootIndex);

    const search = (remaining: typeof pending): boolean => {
      if (!remaining.length) return true;
      const candidatesByWord = remaining.map((item, pendingIndex) => {
        const options = intersections(placed, item.word)
          .filter((candidate) => canPlace(occupied, item.word, candidate.x, candidate.y, candidate.direction))
          .sort((a, b) => scorePlacement(occupied, item.word, b.x, b.y, b.direction) - scorePlacement(occupied, item.word, a.x, a.y, a.direction));
        return { item, pendingIndex, options };
      }).sort((a, b) => a.options.length - b.options.length);
      const selected = candidatesByWord[0];
      if (!selected || selected.options.length === 0) return false;

      for (const option of selected.options) {
        const cells = candidateCells(selected.item.word, option.x, option.y, option.direction);
        const entry: PlacedEntry = { ...selected.item.entry, word: selected.item.word.join(""), startX: option.x, startY: option.y, direction: option.direction, cells };
        const added: string[] = [];
        for (const cell of cells) {
          const cellKey = key(cell.x, cell.y);
          if (!occupied.has(cellKey)) { occupied.set(cellKey, cell.char); added.push(cellKey); }
        }
        placed.push(entry);
        if (search(remaining.filter((_, index) => index !== selected.pendingIndex))) return true;
        placed.pop();
        added.forEach((cellKey) => occupied.delete(cellKey));
      }
      return false;
    };
    return search(pending) ? placed : undefined;
  };

  for (let rootIndex = 0; rootIndex < ordered.length; rootIndex += 1) {
    const result = tryRoot(rootIndex);
    if (result) return result;
  }
  // Keep every answer playable when a stage has no strict connected solution.
  return fallbackLayout();
}

export function createCrosswordBoard(entries: StageEntry[]): CrosswordBoard {
  const placed = placeEntries(entries);
  if (!placed.length) return { width: 1, height: 1, cells: [], entries: [] };
  const minX = Math.min(...placed.flatMap((entry) => entry.cells.map((cell) => cell.x)));
  const minY = Math.min(...placed.flatMap((entry) => entry.cells.map((cell) => cell.y)));
  const maxX = Math.max(...placed.flatMap((entry) => entry.cells.map((cell) => cell.x)));
  const maxY = Math.max(...placed.flatMap((entry) => entry.cells.map((cell) => cell.y)));
  const normalizedEntries = placed.map((entry) => ({ ...entry, startX: entry.startX - minX, startY: entry.startY - minY, cells: entry.cells.map((cell) => ({ ...cell, x: cell.x - minX, y: cell.y - minY })) }));

  const cellMap = new Map<string, CrosswordCell>();
  normalizedEntries.forEach((entry) => entry.cells.forEach((cell) => {
    const cellKey = key(cell.x, cell.y), current = cellMap.get(cellKey);
    if (current) { if (!current.entryIds.includes(entry.id)) current.entryIds.push(entry.id); }
    else cellMap.set(cellKey, { ...cell, entryIds: [entry.id] });
  }));

  const starts = new Map<string, number>();
  let number = 1;
  for (let y = 0; y <= maxY - minY; y += 1) for (let x = 0; x <= maxX - minX; x += 1) {
    const cell = cellMap.get(key(x, y));
    if (cell && normalizedEntries.some((entry) => entry.startX === x && entry.startY === y)) starts.set(key(x, y), number++);
  }
  cellMap.forEach((cell, cellKey) => { cell.number = starts.get(cellKey); });

  return { width: maxX - minX + 1, height: maxY - minY + 1, cells: Array.from(cellMap.values()), entries: normalizedEntries };
}

export function cellKey(x: number, y: number): string { return `${x}:${y}`; }
export function getEntryForCell(board: CrosswordBoard, key: string, preferredEntryId?: string): PlacedEntry | undefined {
  const cell = board.cells.find((candidate) => cellKey(candidate.x, candidate.y) === key);
  if (!cell) return undefined;
  return board.entries.find((entry) => entry.id === preferredEntryId) ?? board.entries.find((entry) => cell.entryIds.includes(entry.id));
}
export function entryAnswer(board: CrosswordBoard, entryId: string): string { return board.entries.find((entry) => entry.id === entryId)?.word ?? ""; }
