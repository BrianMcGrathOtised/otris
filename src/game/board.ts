export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const HIDDEN_ROWS = 2;
export const TOTAL_ROWS = BOARD_HEIGHT + HIDDEN_ROWS;

export type Cell = number; // 0 = empty, 1-7 = piece type
export type Board = Cell[][];

export function createBoard(): Board {
  return Array.from({ length: TOTAL_ROWS }, () => Array(BOARD_WIDTH).fill(0) as Cell[]);
}
