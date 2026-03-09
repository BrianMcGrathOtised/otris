import { describe, it, expect } from 'vitest';
import {
  TETROMINOES,
  PieceType,
  getShape,
  SRS_WALL_KICKS,
  SRS_WALL_KICKS_I,
} from '../tetrominoes';

describe('TETROMINOES', () => {
  it('defines all 7 piece types', () => {
    const types: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    for (const type of types) {
      expect(TETROMINOES[type]).toBeDefined();
    }
  });

  it('each piece has exactly 4 rotation states', () => {
    for (const [, piece] of Object.entries(TETROMINOES)) {
      expect(piece.shapes.length).toBe(4);
    }
  });

  it('each rotation state is a 2D matrix of 0s and 1s', () => {
    for (const [, piece] of Object.entries(TETROMINOES)) {
      for (const shape of piece.shapes) {
        for (const row of shape) {
          for (const cell of row) {
            expect(cell === 0 || cell === 1).toBe(true);
          }
        }
      }
    }
  });

  it('each rotation state has exactly 4 filled cells', () => {
    for (const [, piece] of Object.entries(TETROMINOES)) {
      for (const shape of piece.shapes) {
        const count = shape.flat().filter((c) => c === 1).length;
        expect(count).toBe(4);
      }
    }
  });

  it('I piece uses 4x4 matrix', () => {
    for (const shape of TETROMINOES.I.shapes) {
      expect(shape.length).toBe(4);
      for (const row of shape) {
        expect(row.length).toBe(4);
      }
    }
  });

  it('O piece uses 4x4 matrix', () => {
    for (const shape of TETROMINOES.O.shapes) {
      expect(shape.length).toBe(4);
      for (const row of shape) {
        expect(row.length).toBe(4);
      }
    }
  });

  it('T, S, Z, J, L pieces use 3x3 matrix', () => {
    const types: PieceType[] = ['T', 'S', 'Z', 'J', 'L'];
    for (const type of types) {
      for (const shape of TETROMINOES[type].shapes) {
        expect(shape.length).toBe(3);
        for (const row of shape) {
          expect(row.length).toBe(3);
        }
      }
    }
  });
});

describe('getShape', () => {
  it('returns the correct shape for a given piece and rotation', () => {
    const shape = getShape('T', 0);
    expect(shape).toEqual(TETROMINOES.T.shapes[0]);
  });

  it('wraps rotation index modulo 4', () => {
    expect(getShape('T', 4)).toEqual(getShape('T', 0));
    expect(getShape('T', -1)).toEqual(getShape('T', 3));
  });
});

describe('SRS wall kicks', () => {
  it('SRS_WALL_KICKS has entries for all rotation transitions', () => {
    const keys = ['0>1', '1>0', '1>2', '2>1', '2>3', '3>2', '3>0', '0>3'];
    for (const key of keys) {
      expect(SRS_WALL_KICKS[key]).toBeDefined();
      expect(SRS_WALL_KICKS[key]!.length).toBe(4);
    }
  });

  it('SRS_WALL_KICKS_I has entries for all rotation transitions', () => {
    const keys = ['0>1', '1>0', '1>2', '2>1', '2>3', '3>2', '3>0', '0>3'];
    for (const key of keys) {
      expect(SRS_WALL_KICKS_I[key]).toBeDefined();
      expect(SRS_WALL_KICKS_I[key]!.length).toBe(4);
    }
  });

  it('wall kick offsets are [x, y] tuples', () => {
    for (const offsets of Object.values(SRS_WALL_KICKS)) {
      for (const [x, y] of offsets!) {
        expect(typeof x).toBe('number');
        expect(typeof y).toBe('number');
      }
    }
  });
});
