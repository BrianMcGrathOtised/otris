export interface GamePlayer {
  id: string;
  alive: boolean;
  garbageQueue: number;
}

export type GameStatus = 'countdown' | 'playing' | 'finished';

export class GameInstance {
  readonly lobbyId: string;
  private players: Map<string, GamePlayer>;
  readonly totalPlayers: number;
  status: GameStatus;

  constructor(lobbyId: string, playerIds: string[]) {
    this.lobbyId = lobbyId;
    this.totalPlayers = playerIds.length;
    this.status = 'countdown';
    this.players = new Map();
    for (const id of playerIds) {
      this.players.set(id, { id, alive: true, garbageQueue: 0 });
    }
  }

  startGame(): void {
    this.status = 'playing';
  }

  getPlayer(playerId: string): GamePlayer | undefined {
    return this.players.get(playerId);
  }

  getAlivePlayers(): string[] {
    const alive: string[] = [];
    for (const p of this.players.values()) {
      if (p.alive) alive.push(p.id);
    }
    return alive;
  }

  eliminatePlayer(playerId: string): number | null {
    const player = this.players.get(playerId);
    if (!player || !player.alive) return null;

    player.alive = false;
    const aliveCount = this.getAlivePlayers().length;
    // Placement = alive count + 1 (the player who just died)
    return aliveCount + 1;
  }

  isMatchOver(): boolean {
    return this.getAlivePlayers().length <= 1;
  }

  getWinner(): string | null {
    const alive = this.getAlivePlayers();
    if (alive.length === 1) return alive[0]!;
    return null;
  }

  finishMatch(): void {
    this.status = 'finished';
  }

  addGarbage(playerId: string, lines: number): void {
    const player = this.players.get(playerId);
    if (player) {
      player.garbageQueue += lines;
    }
  }

  clearGarbage(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.garbageQueue = 0;
    }
  }

  getRandomOpponent(playerId: string): string | null {
    const alive = this.getAlivePlayers().filter(id => id !== playerId);
    if (alive.length === 0) return null;
    return alive[Math.floor(Math.random() * alive.length)]!;
  }
}
