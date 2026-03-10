const GARBAGE_TABLE: Record<number, number> = {
  0: 0,
  1: 0,
  2: 1,
  3: 2,
  4: 4,
};

export function calculateGarbage(linesCleared: number): number {
  return GARBAGE_TABLE[linesCleared] ?? 0;
}
