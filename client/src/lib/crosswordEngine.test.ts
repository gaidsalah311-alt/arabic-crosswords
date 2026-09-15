import { describe, expect, it } from "vitest";
import { LEVELS } from "./content";
import { createCrosswordBoard, normalizeWord } from "./crosswordEngine";

describe("Arabic crossword engine", () => {
  it("normalizes Arabic letter variants consistently", () => {
    expect(normalizeWord("أَإِآـىؤئ")).toBe("ااايوي");
  });

  it("builds all 500 stages with every entry placed", () => {
    for (const level of LEVELS) for (const stage of level.stages) {
      const board = createCrosswordBoard(stage.entries);
      expect(board.entries.length, stage.id).toBe(stage.entries.length);
      expect(board.cells.length, stage.id).toBeGreaterThan(0);
    }
  });

  it("never creates illegal parallel touching", () => {
    for (const level of LEVELS) for (const stage of level.stages) {
      const board = createCrosswordBoard(stage.entries);
      const occupied = new Map(board.cells.map((cell) => [`${cell.x}:${cell.y}`, cell.char]));
      for (const entry of board.entries) {
        const ownCells = new Set(entry.cells.map((cell) => `${cell.x}:${cell.y}`));
        for (const cell of entry.cells) {
          const neighbors = entry.direction === "across"
            ? [[cell.x, cell.y - 1], [cell.x, cell.y + 1]]
            : [[cell.x - 1, cell.y], [cell.x + 1, cell.y]];
          for (const [x, y] of neighbors) {
            const neighborKey = `${x}:${y}`;
            const isValidCrossing = board.entries.some((other) => other.id !== entry.id
              && other.direction !== entry.direction
              && other.cells.some((otherCell) => otherCell.x === cell.x && otherCell.y === cell.y)
              && other.cells.some((otherCell) => otherCell.x === x && otherCell.y === y));
            expect(ownCells.has(neighborKey) || !occupied.has(neighborKey) || isValidCrossing, stage.id).toBe(true);
          }
        }
      }
    }
  });
});
