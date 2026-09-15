import React, { useEffect, useState } from "react";
import { Cell, CrosswordWord } from "./types";

type NewWord = {
  word: string;
  startRow: number;
  startCol: number;
  direction: "horizontal" | "vertical";
  endRow: number;
  endCol: number;
};

interface CrosswordGridProps {
  data: Array<CrosswordWord | NewWord>;
  revealedWords: Set<string>;
}

const isNewWord = (w: any): w is NewWord =>
  w && typeof w === "object" && "word" in w && "startRow" in w && "startCol" in w && "direction" in w;

const normalize = (data: Array<CrosswordWord | NewWord>) => {
  const converted = data.map((w) => {
    if (isNewWord(w)) {
      const answer = w.word;
      const orientation = w.direction === "horizontal" ? "across" : "down";
      const startx = w.startCol + 1;
      const starty = w.startRow + 1;
      return { answer, orientation, startx, starty } as CrosswordWord;
    }
    return w as CrosswordWord;
  });

  const numberAt: Record<string, number> = {};
  let nextNumber = 1;

  converted.forEach((w) => {
    const key = `${w.startx},${w.starty}`;
    if (numberAt[key] == null) {
      numberAt[key] = nextNumber++;
    }
    if ((w as any).position == null) {
      (w as any).position = numberAt[key];
    }
  });

  return converted;
};

const CrosswordGrid: React.FC<CrosswordGridProps> = ({ data, revealedWords }) => {
  const [grid, setGrid] = useState<(Cell | null)[][]>([]);
  const [startSquares, setStartSquares] = useState<Record<string, number>>({});

  useEffect(() => {
    setGrid([]);
    setStartSquares({});

    const words = normalize(data);

    const placed = words.filter((w) => w.orientation && w.startx != null && w.starty != null);

    const maxX =
      Math.max(...placed.map((w) => (w.orientation === "across" ? w.startx + w.answer.length - 1 : w.startx))) + 1;

    const maxY =
      Math.max(...placed.map((w) => (w.orientation === "down" ? w.starty + w.answer.length - 1 : w.starty))) + 1;

    const _grid: (Cell | null)[][] = Array.from({ length: maxY }, () => Array.from({ length: maxX }, () => null));

    placed.forEach((word) => {
      const { startx, starty, answer, orientation } = word;
      const position = (word as any).position as number | undefined;

      if (position != null) {
        const key = `${startx - 1},${starty - 1}`;
        setStartSquares((prev) => ({
          ...prev,
          [key]: position,
        }));
      }

      for (let i = 0; i < answer.length; i++) {
        const x = startx - 1 + (orientation === "across" ? i : 0);
        const y = starty - 1 + (orientation === "down" ? i : 0);

        if (!_grid[y][x]) _grid[y][x] = { entries: [] };
        _grid[y][x]!.entries.push({ answer, char: answer[i] });
      }
    });

    while (_grid.length > 0 && _grid[_grid.length - 1].every((cell) => !cell)) {
      _grid.pop();
    }

    while (_grid[0]?.length && _grid.every((row) => !row[row.length - 1])) {
      _grid.forEach((row) => row.pop());
    }

    setGrid(_grid);
  }, [data]);

  if (grid.length === 0) return null;

  return (
    <div className="crossword-grid">
      {grid.map((row, rowIndex) => (
        <div key={rowIndex} className="crossword-row">
          {row.map((cell, colIndex) => {
            const key = `${colIndex},${rowIndex}`;
            const hasNumber = startSquares[key] !== undefined;

            const hasDash = cell?.entries?.some((e) => e.char === "-");
            const revealedEntry = cell?.entries?.find((e) => revealedWords.has(e.answer));
            const letter = hasDash ? "-" : revealedEntry ? revealedEntry.char.toUpperCase() : "";
            const isWhiteSpace = cell?.entries[0].char === " ";

            return (
              <div
                key={colIndex}
                className={`crossword-cell ${cell ? "filled" : "empty"} ${isWhiteSpace ? "whitespace" : ""}`}
              >
                {hasNumber && <span className="crossword-number">{startSquares[key]}</span>}
                <span className="crossword-letter">{letter}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default CrosswordGrid;
