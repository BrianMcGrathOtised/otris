export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type Shape = number[][];

export interface Piece {
  type: PieceType;
  colorId: number; // 1-7, used as Cell value on the board
  shapes: [Shape, Shape, Shape, Shape]; // 4 rotation states (0, R, 2, L)
}

// SRS rotation states for all 7 tetrominoes
// Rotation indices: 0=spawn, 1=R(clockwise), 2=180, 3=L(counter-clockwise)

const I: Piece = {
  type: 'I',
  colorId: 1,
  shapes: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  ],
};

const O: Piece = {
  type: 'O',
  colorId: 2,
  shapes: [
    [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  ],
};

const T: Piece = {
  type: 'T',
  colorId: 3,
  shapes: [
    [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],
};

const S: Piece = {
  type: 'S',
  colorId: 4,
  shapes: [
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 0, 0],
      [0, 1, 1],
      [1, 1, 0],
    ],
    [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],
};

const Z: Piece = {
  type: 'Z',
  colorId: 5,
  shapes: [
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  ],
};

const J: Piece = {
  type: 'J',
  colorId: 6,
  shapes: [
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  ],
};

const L: Piece = {
  type: 'L',
  colorId: 7,
  shapes: [
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0],
    ],
    [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
  ],
};

export const TETROMINOES: Record<PieceType, Piece> = { I, O, T, S, Z, J, L };

export const ALL_PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

/**
 * Get the shape matrix for a piece type at a given rotation.
 * Rotation wraps modulo 4 (supports negative values).
 */
export function getShape(type: PieceType, rotation: number): Shape {
  const r = ((rotation % 4) + 4) % 4;
  return TETROMINOES[type].shapes[r as 0 | 1 | 2 | 3];
}

// SRS wall kick data
// Key format: "fromRotation>toRotation"
// Each entry is an array of [dx, dy] offsets to try (excluding the base position).
// dy is positive downward (board coordinate system).
type WallKickTable = Record<string, [number, number][]>;

// Wall kicks for T, S, Z, J, L (all non-I, non-O pieces)
export const SRS_WALL_KICKS: WallKickTable = {
  '0>1': [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1>0': [[1, 0], [1, 1], [0, -2], [1, -2]],
  '1>2': [[1, 0], [1, 1], [0, -2], [1, -2]],
  '2>1': [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2>3': [[1, 0], [1, -1], [0, 2], [1, 2]],
  '3>2': [[-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3>0': [[-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0>3': [[1, 0], [1, -1], [0, 2], [1, 2]],
};

// Wall kicks for I piece (different offsets)
export const SRS_WALL_KICKS_I: WallKickTable = {
  '0>1': [[-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1>0': [[2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1>2': [[-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2>1': [[1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2>3': [[2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3>2': [[-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3>0': [[1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0>3': [[-1, 0], [2, 0], [-1, -2], [2, 1]],
};

/**
 * Create a shuffled bag of all 7 piece types (Fisher-Yates shuffle).
 */
export function createBag(): PieceType[] {
  const bag = [...ALL_PIECE_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j]!, bag[i]!];
  }
  return bag;
}
