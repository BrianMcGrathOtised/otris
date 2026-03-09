import { describe, it, expect } from 'vitest';
import { createBoard, BOARD_WIDTH, TOTAL_ROWS } from '../board';

describe('createBoard', () => {
  it('creates a board with correct dimensions', () => {
    const board = createBoard();
    expect(board.length).toBe(TOTAL_ROWS);
    expect(board[0]!.length).toBe(BOARD_WIDTH);
  });

  it('creates an empty board', () => {
    const board = createBoard();
    for (const row of board) {
      for (const cell of row) {
        expect(cell).toBe(0);
      }
    }
  });
});
