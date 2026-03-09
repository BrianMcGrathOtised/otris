/**
 * Color definitions for each tetromino piece type.
 * Colors indexed by colorId (1-7, matching PieceType colorId in tetrominoes.ts).
 *
 * Color scheme: I=cyan, O=yellow, T=purple, S=green, Z=red, J=blue, L=orange.
 */

export interface PieceColorSet {
  /** Base fill color */
  base: string;
  /** Lighter variant for gradient top */
  light: string;
  /** Darker variant for gradient bottom */
  dark: string;
  /** Glow color (used for shadow blur) */
  glow: string;
}

const FALLBACK_COLOR: PieceColorSet = {
  base: '#888',
  light: '#aaa',
  dark: '#555',
  glow: '#888',
};

/**
 * Color palette for each piece type, indexed by colorId (1-7).
 */
export const PIECE_COLORS: Record<number, PieceColorSet> = {
  // I = cyan (colorId 1)
  1: {
    base: '#00e5ff',
    light: '#62efff',
    dark: '#008ba0',
    glow: '#00e5ff',
  },
  // O = yellow (colorId 2)
  2: {
    base: '#ffd600',
    light: '#ffff52',
    dark: '#c7a500',
    glow: '#ffd600',
  },
  // T = purple (colorId 3)
  3: {
    base: '#aa00ff',
    light: '#dc5cff',
    dark: '#7200ca',
    glow: '#aa00ff',
  },
  // S = green (colorId 4)
  4: {
    base: '#00e676',
    light: '#66ffa6',
    dark: '#00a050',
    glow: '#00e676',
  },
  // Z = red (colorId 5)
  5: {
    base: '#ff1744',
    light: '#ff6680',
    dark: '#c4001d',
    glow: '#ff1744',
  },
  // J = blue (colorId 6)
  6: {
    base: '#2979ff',
    light: '#75a7ff',
    dark: '#004ecb',
    glow: '#2979ff',
  },
  // L = orange (colorId 7)
  7: {
    base: '#ff9100',
    light: '#ffc246',
    dark: '#c56200',
    glow: '#ff9100',
  },
};

/**
 * Get the color set for a piece colorId.
 * Returns a fallback gray for unknown/empty IDs.
 */
export function getPieceColor(colorId: number): PieceColorSet {
  return PIECE_COLORS[colorId] ?? FALLBACK_COLOR;
}
