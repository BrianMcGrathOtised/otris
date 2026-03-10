import { describe, it, expect } from 'vitest';
import { createBoard, insertGarbageRows, BOARD_WIDTH, TOTAL_ROWS } from '../board';

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

describe('insertGarbageRows', () => {
  it('adds garbage rows at the bottom of the board', () => {
    const board = createBoard();
    const result = insertGarbageRows(board, 2, 3); // 2 rows, gap at column 3
    // Bottom 2 rows should be garbage (cell value 8)
    const lastRow = result[TOTAL_ROWS - 1]!;
    expect(lastRow[3]).toBe(0); // gap
    expect(lastRow[0]).toBe(8); // garbage cell
    expect(lastRow[5]).toBe(8); // garbage cell
  });

  it('shifts existing board content up', () => {
    const board = createBoard();
    // Place a block at the bottom row
    board[TOTAL_ROWS - 1]![0] = 1;
    const result = insertGarbageRows(board, 1, 5);
    // The block should have moved up by 1
    expect(result[TOTAL_ROWS - 2]![0]).toBe(1);
    // Bottom row is now garbage
    expect(result[TOTAL_ROWS - 1]![5]).toBe(0); // gap
    expect(result[TOTAL_ROWS - 1]![0]).toBe(8); // garbage
  });

  it('preserves board dimensions', () => {
    const board = createBoard();
    const result = insertGarbageRows(board, 4, 7);
    expect(result.length).toBe(TOTAL_ROWS);
    expect(result[0]!.length).toBe(BOARD_WIDTH);
  });

  it('does not mutate the original board', () => {
    const board = createBoard();
    board[TOTAL_ROWS - 1]![0] = 1;
    const result = insertGarbageRows(board, 1, 5);
    // Original should be unchanged
    expect(board[TOTAL_ROWS - 1]![0]).toBe(1);
    expect(result).not.toBe(board);
  });

  it('handles inserting 0 rows', () => {
    const board = createBoard();
    const result = insertGarbageRows(board, 0, 0);
    expect(result.length).toBe(TOTAL_ROWS);
  });

  it('each garbage row has exactly one gap', () => {
    const board = createBoard();
    const result = insertGarbageRows(board, 3, 4);
    for (let i = TOTAL_ROWS - 3; i < TOTAL_ROWS; i++) {
      const row = result[i]!;
      const emptyCount = row.filter(c => c === 0).length;
      expect(emptyCount).toBe(1);
      expect(row[4]).toBe(0);
    }
  });
});
