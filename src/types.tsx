export interface CrosswordWord {
  clue: string;
  answer: string;
  startx: number;
  starty: number;
  position: number;
  orientation: "across" | "down";
}

export interface CrosswordCellEntry {
  answer: string;
  char: string;
}

export type Cell = null | {
  entries: CrosswordCellEntry[];
};

export type Clue = {
  clue: string;
  answer: string;
};
