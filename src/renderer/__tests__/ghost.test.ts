import { describe, it, expect } from 'vitest';
import { getGhostY } from '../render';
import { createBoard, BOARD_WIDTH, TOTAL_ROWS } from '../../game/board';

describe('getGhostY', () => {
  it('drops to the bottom of an empty board', () => {
    const board = createBoard();
    // T-piece shape at rotation 0
    const shape = [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ];
    const ghostY = getGhostY(board, shape, 3, 0);
    // Shape has filled cells at rows 0 and 1 of the shape matrix.
    // Ghost should drop as low as possible. Row 1 of shape maps to boardY + 1.
    // Lowest valid: boardY + 1 = TOTAL_ROWS - 1, so boardY = TOTAL_ROWS - 2.
    expect(ghostY).toBe(TOTAL_ROWS - 2);
  });

  it('stops above occupied cells', () => {
    const board = createBoard();
    // Fill bottom row
    for (let x = 0; x < BOARD_WIDTH; x++) {
      board[TOTAL_ROWS - 1]![x] = 1;
    }
    const shape = [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ];
    const ghostY = getGhostY(board, shape, 3, 0);
    // Now the piece stops one row higher
    expect(ghostY).toBe(TOTAL_ROWS - 3);
  });

  it('returns the current y if piece cannot drop at all', () => {
    const board = createBoard();
    // Fill rows so there's no space to drop
    for (let y = 1; y < TOTAL_ROWS; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        board[y]![x] = 1;
      }
    }
    const shape = [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ];
    const ghostY = getGhostY(board, shape, 3, 0);
    // Can't drop below y=0 because y=1 is fully occupied and shape row 1 is filled
    expect(ghostY).toBe(0);
  });
});
