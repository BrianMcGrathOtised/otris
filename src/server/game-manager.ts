import { GameInstance } from './game-instance.js';
import { calculateGarbage } from './garbage.js';
import type { ServerEvent } from '../shared/protocol.js';

export interface GameEventSender {
  sendToPlayer(playerId: string, event: ServerEvent): void;
  broadcastToGame(lobbyId: string, event: ServerEvent, excludePlayerId?: string): void;
  getPlayerName(playerId: string): string;
}

export class GameManager {
  private games = new Map<string, GameInstance>();
  private playerToLobby = new Map<string, string>();
  private sender: GameEventSender;

  constructor(sender: GameEventSender) {
    this.sender = sender;
  }

  createGame(lobbyId: string, playerIds: string[]): GameInstance {
    const game = new GameInstance(lobbyId, playerIds);
    this.games.set(lobbyId, game);
    for (const id of playerIds) {
      this.playerToLobby.set(id, lobbyId);
    }
    return game;
  }

  getGame(lobbyId: string): GameInstance | undefined {
    return this.games.get(lobbyId);
  }

  getGameByPlayer(playerId: string): GameInstance | undefined {
    const lobbyId = this.playerToLobby.get(playerId);
    if (!lobbyId) return undefined;
    return this.games.get(lobbyId);
  }

  startGame(lobbyId: string): void {
    const game = this.games.get(lobbyId);
    if (!game) return;
    game.startGame();
    this.sender.broadcastToGame(lobbyId, { type: 'game_started' });
  }

  handleLinesCleared(lobbyId: string, playerId: string, count: number): void {
    const game = this.games.get(lobbyId);
    if (!game || game.status !== 'playing') return;

    const garbage = calculateGarbage(count);
    if (garbage === 0) return;

    const target = game.getRandomOpponent(playerId);
    if (!target) return;

    game.addGarbage(target, garbage);
    this.sender.sendToPlayer(target, {
      type: 'garbage_received',
      fromPlayerId: playerId,
      lines: garbage,
    });
  }

  handleBoardUpdate(lobbyId: string, playerId: string, board: number[][]): void {
    const game = this.games.get(lobbyId);
    if (!game || game.status !== 'playing') return;

    const player = game.getPlayer(playerId);
    const alive = player ? player.alive : false;

    this.sender.broadcastToGame(lobbyId, {
      type: 'opponent_board',
      playerId,
      playerName: this.sender.getPlayerName(playerId),
      board,
      alive,
    }, playerId);
  }

  handlePlayerDead(lobbyId: string, playerId: string): void {
    const game = this.games.get(lobbyId);
    if (!game || game.status !== 'playing') return;

    const placement = game.eliminatePlayer(playerId);
    if (placement === null) return;

    this.sender.broadcastToGame(lobbyId, {
      type: 'player_eliminated',
      playerId,
      placement,
      alivePlayers: game.getAlivePlayers(),
    });

    if (game.isMatchOver()) {
      const winnerId = game.getWinner();
      if (winnerId) {
        game.finishMatch();
        this.sender.broadcastToGame(lobbyId, {
          type: 'match_end',
          winnerId,
          winnerName: this.sender.getPlayerName(winnerId),
        });
      }
    }
  }

  removeGame(lobbyId: string): void {
    const game = this.games.get(lobbyId);
    if (game) {
      for (const playerId of game.getAlivePlayers()) {
        this.playerToLobby.delete(playerId);
      }
    }
    this.games.delete(lobbyId);
  }
}
