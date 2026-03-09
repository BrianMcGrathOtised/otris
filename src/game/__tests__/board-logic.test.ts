import { describe, it, expect } from 'vitest';
import {
  createBoard,
  isValidPosition,
  lockPiece,
  clearLines,
  isGameOver,
  BOARD_WIDTH,
  HIDDEN_ROWS,
  TOTAL_ROWS,
} from '../board';
import { getShape } from '../tetrominoes';

describe('isValidPosition', () => {
  it('returns true for a piece in empty space', () => {
    const board = createBoard();
    const shape = getShape('T', 0);
    // Place near middle of the board
    expect(isValidPosition(board, shape, 4, 10)).toBe(true);
  });

  it('returns false when piece is out of bounds left', () => {
    const board = createBoard();
    const shape = getShape('T', 0);
    expect(isValidPosition(board, shape, -2, 10)).toBe(false);
  });

  it('returns false when piece is out of bounds right', () => {
    const board = createBoard();
    const shape = getShape('T', 0);
    expect(isValidPosition(board, shape, BOARD_WIDTH, 10)).toBe(false);
  });

  it('returns false when piece is below the board', () => {
    const board = createBoard();
    const shape = getShape('T', 0);
    expect(isValidPosition(board, shape, 4, TOTAL_ROWS)).toBe(false);
  });

  it('returns false when piece overlaps existing blocks', () => {
    const board = createBoard();
    board[10]![5] = 1;
    const shape = getShape('T', 0);
    // T piece at rotation 0 occupies: (col+0,row+0), (col+1,row+0), (col+2,row+0), (col+1,row+1)
    // Place so col+1,row+1 = col=4,row=9 -> overlap at 5,10
    expect(isValidPosition(board, shape, 4, 9)).toBe(false);
  });

  it('allows piece to extend above the board (into hidden rows)', () => {
    const board = createBoard();
    const shape = getShape('I', 1); // vertical I piece
    // Should be valid even if extending into row 0/1 (hidden area)
    expect(isValidPosition(board, shape, 4, 0)).toBe(true);
  });

  it('returns false when piece row is negative (above hidden rows)', () => {
    const board = createBoard();
    const shape = getShape('I', 1); // vertical I piece
    expect(isValidPosition(board, shape, 4, -2)).toBe(false);
  });
});

describe('lockPiece', () => {
  it('writes piece cells onto the board', () => {
    const board = createBoard();
    const shape = getShape('T', 0);
    const pieceId = 3; // T piece type ID
    const newBoard = lockPiece(board, shape, 4, 10, pieceId);

    // T piece rotation 0: [0,1,0], [1,1,1], [0,0,0]
    expect(newBoard[10]![5]).toBe(pieceId);
    expect(newBoard[11]![4]).toBe(pieceId);
    expect(newBoard[11]![5]).toBe(pieceId);
    expect(newBoard[11]![6]).toBe(pieceId);
  });

  it('does not mutate the original board', () => {
    const board = createBoard();
    const shape = getShape('T', 0);
    lockPiece(board, shape, 4, 10, 3);
    expect(board[10]![5]).toBe(0);
  });
});

describe('clearLines', () => {
  it('clears a full row and shifts rows down', () => {
    const board = createBoard();
    // Fill the bottom row completely
    const bottomRow = TOTAL_ROWS - 1;
    for (let x = 0; x < BOARD_WIDTH; x++) {
      board[bottomRow]![x] = 1;
    }
    const { board: newBoard, linesCleared } = clearLines(board);
    expect(linesCleared).toBe(1);
    // Bottom row should now be empty (shifted from above)
    for (let x = 0; x < BOARD_WIDTH; x++) {
      expect(newBoard[bottomRow]![x]).toBe(0);
    }
  });

  it('clears multiple full rows', () => {
    const board = createBoard();
    const bottomRow = TOTAL_ROWS - 1;
    // Fill bottom 4 rows
    for (let y = bottomRow; y > bottomRow - 4; y--) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        board[y]![x] = 1;
      }
    }
    const { board: newBoard, linesCleared } = clearLines(board);
    expect(linesCleared).toBe(4);
    // All visible rows should be empty
    for (let y = HIDDEN_ROWS; y < TOTAL_ROWS; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        expect(newBoard[y]![x]).toBe(0);
      }
    }
  });

  it('returns 0 when no lines are full', () => {
    const board = createBoard();
    board[TOTAL_ROWS - 1]![0] = 1;
    const { linesCleared } = clearLines(board);
    expect(linesCleared).toBe(0);
  });

  it('preserves partial rows above cleared lines', () => {
    const board = createBoard();
    const bottomRow = TOTAL_ROWS - 1;
    // Fill bottom row
    for (let x = 0; x < BOARD_WIDTH; x++) {
      board[bottomRow]![x] = 1;
    }
    // Put a single block in the row above
    board[bottomRow - 1]![3] = 2;

    const { board: newBoard, linesCleared } = clearLines(board);
    expect(linesCleared).toBe(1);
    // The single block should have shifted down to the bottom row
    expect(newBoard[bottomRow]![3]).toBe(2);
  });

  it('does not mutate the original board', () => {
    const board = createBoard();
    const bottomRow = TOTAL_ROWS - 1;
    for (let x = 0; x < BOARD_WIDTH; x++) {
      board[bottomRow]![x] = 1;
    }
    clearLines(board);
    // Original board should still have the full row
    expect(board[bottomRow]![0]).toBe(1);
  });
});

describe('isGameOver', () => {
  it('returns false on an empty board', () => {
    const board = createBoard();
    const shape = getShape('T', 0);
    // Default spawn position: centered, top of visible area
    const spawnX = Math.floor((BOARD_WIDTH - shape[0]!.length) / 2);
    const spawnY = 0; // top of board (hidden rows)
    expect(isGameOver(board, shape, spawnX, spawnY)).toBe(false);
  });

  it('returns true when spawn position is blocked', () => {
    const board = createBoard();
    const shape = getShape('T', 0);
    const spawnX = Math.floor((BOARD_WIDTH - shape[0]!.length) / 2);
    const spawnY = 0;
    // Block the spawn area
    for (let x = 0; x < BOARD_WIDTH; x++) {
      board[0]![x] = 1;
      board[1]![x] = 1;
    }
    expect(isGameOver(board, shape, spawnX, spawnY)).toBe(true);
  });

  it('returns true when even hidden rows are partially blocked at spawn', () => {
    const board = createBoard();
    const shape = getShape('I', 0); // horizontal I piece: filled cells are in row index 1
    const spawnX = Math.floor((BOARD_WIDTH - shape[0]!.length) / 2);
    const spawnY = 0;
    // I piece rotation 0 has filled cells at shape row 1, so board row = spawnY + 1
    board[spawnY + 1]![spawnX] = 1;
    expect(isGameOver(board, shape, spawnX, spawnY)).toBe(true);
  });
});
