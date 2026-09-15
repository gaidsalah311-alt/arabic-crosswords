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

const normalizeWord = (word: string) => word.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "").replace(/ـ/g, "");

function chars(word: string): string[] {
  return Array.from(normalizeWord(word));
}

function canPlace(
  occupied: Map<string, string>,
  word: string[],
  x: number,
  y: number,
  direction: Direction,
): boolean {
  const dx = direction === "across" ? 1 : 0;
  const dy = direction === "down" ? 1 : 0;

  for (let index = 0; index < word.length; index += 1) {
    const cellX = x + dx * index;
    const cellY = y + dy * index;
    const key = `${cellX}:${cellY}`;
    const existing = occupied.get(key);
    if (existing && existing !== word[index]) return false;
  }
  return true;
}

function intersections(existing: PlacedEntry[], word: string[]): Array<{ x: number; y: number; direction: Direction }> {
  const options: Array<{ x: number; y: number; direction: Direction }> = [];
  for (const entry of existing) {
    for (const source of entry.cells) {
      for (let index = 0; index < word.length; index += 1) {
        if (word[index] !== source.char) continue;
        const direction: Direction = entry.direction === "across" ? "down" : "across";
        const x = direction === "across" ? source.x - index : source.x;
        const y = direction === "down" ? source.y - index : source.y;
        options.push({ x, y, direction });
      }
    }
  }
  return options;
}

export function createCrosswordBoard(entries: StageEntry[]): CrosswordBoard {
  const placed: PlacedEntry[] = [];
  const occupied = new Map<string, string>();
  const ordered = [...entries].sort((a, b) => b.word.length - a.word.length);

  ordered.forEach((entry, index) => {
    const word = chars(entry.word);
    let placement: { x: number; y: number; direction: Direction } | undefined;

    if (index === 0) {
      placement = { x: 0, y: 0, direction: "across" };
    } else {
      const options = intersections(placed, word).filter((candidate) => canPlace(occupied, word, candidate.x, candidate.y, candidate.direction));
      placement = options[0];

      if (!placement) {
        for (let distance = 1; distance < 24 && !placement; distance += 1) {
          const fallback = [
            { x: distance * 2, y: distance, direction: "down" as Direction },
            { x: -distance, y: distance * 2, direction: "across" as Direction },
          ];
          placement = fallback.find((candidate) => canPlace(occupied, word, candidate.x, candidate.y, candidate.direction));
        }
      }
    }

    if (!placement) return;
    const dx = placement.direction === "across" ? 1 : 0;
    const dy = placement.direction === "down" ? 1 : 0;
    const cells = word.map((char, charIndex) => ({ x: placement!.x + dx * charIndex, y: placement!.y + dy * charIndex, char }));
    cells.forEach((cell) => occupied.set(`${cell.x}:${cell.y}`, cell.char));
    placed.push({ ...entry, word: normalizeWord(entry.word), startX: placement.x, startY: placement.y, direction: placement.direction, cells });
  });

  const minX = Math.min(...placed.flatMap((entry) => entry.cells.map((cell) => cell.x)), 0);
  const minY = Math.min(...placed.flatMap((entry) => entry.cells.map((cell) => cell.y)), 0);
  const maxX = Math.max(...placed.flatMap((entry) => entry.cells.map((cell) => cell.x)), 0);
  const maxY = Math.max(...placed.flatMap((entry) => entry.cells.map((cell) => cell.y)), 0);
  const normalizedEntries = placed.map((entry) => ({
    ...entry,
    startX: entry.startX - minX,
    startY: entry.startY - minY,
    cells: entry.cells.map((cell) => ({ ...cell, x: cell.x - minX, y: cell.y - minY })),
  }));

  const cellMap = new Map<string, CrosswordCell>();
  normalizedEntries.forEach((entry, entryIndex) => {
    entry.cells.forEach((cell, cellIndex) => {
      const key = `${cell.x}:${cell.y}`;
      const current = cellMap.get(key);
      if (current) {
        if (!current.entryIds.includes(entry.id)) current.entryIds.push(entry.id);
      } else {
        cellMap.set(key, {
          ...cell,
          entryIds: [entry.id],
          number: cellIndex === 0 ? entryIndex + 1 : undefined,
        });
      }
    });
  });

  return {
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1),
    cells: Array.from(cellMap.values()),
    entries: normalizedEntries,
  };
}

export function cellKey(x: number, y: number): string {
  return `${x}:${y}`;
}

export function getEntryForCell(board: CrosswordBoard, key: string, preferredEntryId?: string): PlacedEntry | undefined {
  const cell = board.cells.find((candidate) => cellKey(candidate.x, candidate.y) === key);
  if (!cell) return undefined;
  return board.entries.find((entry) => entry.id === preferredEntryId) ?? board.entries.find((entry) => cell.entryIds.includes(entry.id));
}

export function entryAnswer(board: CrosswordBoard, entryId: string): string {
  return board.entries.find((entry) => entry.id === entryId)?.word ?? "";
}
