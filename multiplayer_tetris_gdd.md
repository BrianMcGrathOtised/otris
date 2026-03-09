# Multiplayer Tetris Web Game -- Game Design Document

## 1. Game Overview

**Game Title:** BlockFall Arena\
**Genre:** Competitive Multiplayer Puzzle\
**Platform:** Web Browser (HTML5 / JavaScript)\
**Networking:** WebSockets\
**Players:** 2--10 per match

BlockFall Arena is a real-time multiplayer Tetris-style game where
players compete to survive the longest while sending penalty blocks to
opponents. Players connect to a lobby, ready up, and then compete in
synchronized matches.

The game focuses on: - Low latency multiplayer gameplay - Competitive
mechanics (garbage blocks) - Simple lobby management - Easy browser
access

------------------------------------------------------------------------

# 2. Core Gameplay

## 2.1 Objective

Players place falling blocks to clear horizontal lines.

When a player clears lines: - Garbage blocks are sent to opponents. -
The last surviving player wins.

A player loses when: - Blocks reach the top of their board.

------------------------------------------------------------------------

# 3. Player Count

  Mode      Players
  --------- ---------
  Minimum   2
  Maximum   10

Matches begin when: - All players ready OR - Lobby host starts match

------------------------------------------------------------------------

# 4. Game Rules

## 4.1 Board

Standard Tetris board:

Width: 10 cells\
Height: 20 cells

Additional hidden rows above the board for spawning pieces.

------------------------------------------------------------------------

## 4.2 Pieces

Standard tetromino set:

-   I
-   O
-   T
-   S
-   Z
-   J
-   L

Randomization uses **7-bag system**.

------------------------------------------------------------------------

## 4.3 Controls

  Key           Action
  ------------- ------------
  Left Arrow    Move left
  Right Arrow   Move right
  Down Arrow    Soft drop
  Space         Hard drop
  Up Arrow      Rotate
  Shift/C       Hold piece

------------------------------------------------------------------------

## 4.4 Line Clears

  Lines Cleared   Effect
  --------------- ----------------
  1               No garbage
  2               Send 1 garbage
  3               Send 2 garbage
  4 (Tetris)      Send 4 garbage

Optional advanced mechanics (future): - T-Spins - Combos - Back-to-back
bonuses

------------------------------------------------------------------------

# 5. Multiplayer Mechanics

## 5.1 Garbage System

When a player clears lines:

1.  Garbage is queued for opponents
2.  Sent to random opponents or all opponents depending on mode
3.  Garbage rows appear from the bottom with one random gap

Example:

Player clears 3 lines\
→ Send 2 garbage rows\
→ Added to opponent queues

------------------------------------------------------------------------

## 5.2 Player Elimination

A player is eliminated when a new piece cannot spawn due to collision
with existing blocks.

Their board becomes frozen.

------------------------------------------------------------------------

## 5.3 Match End

Match ends when only one player remains alive.

Winner screen is displayed.

------------------------------------------------------------------------

# 6. Lobby System

Players connect through **lobbies**.

## 6.1 Lobby Creation

Players can create a lobby with:

-   Lobby Name
-   Max Players (2--10)
-   Public / Private
-   Password (optional)
-   Game Settings

The creator becomes **Lobby Host**.

------------------------------------------------------------------------

## 6.2 Lobby UI

Lobby screen displays:

-   Lobby Name
-   Player List
-   Ready Status
-   Chat
-   Game Settings
-   Start Button (Host Only)

Example:

    BlockFall Arena Lobby

    Players:
    [Host] Brian ✓
    Alice ✓
    Mike ✗
    Sarah ✓

    4 / 10 players

    [Start Game]

------------------------------------------------------------------------

## 6.3 Lobby Host Permissions

Lobby host can:

-   Kick players
-   Change game settings
-   Start game
-   Transfer host
-   Close lobby

------------------------------------------------------------------------

# 7. Game Settings

Lobby host configurable options:

  Setting             Options
  ------------------- ----------------------
  Max Players         2--10
  Starting Speed      Slow / Normal / Fast
  Garbage Targeting   Random / All
  Countdown Timer     3 / 5 / 10 seconds

------------------------------------------------------------------------

# 8. Network Architecture

## 8.1 Communication Model

Client--Server using **WebSockets**.

    Browser Client
        ↓
    WebSocket Server
        ↓
    Lobby State Manager
    Game Instance Manager

------------------------------------------------------------------------

## 8.2 Server Responsibilities

Server handles:

-   Lobby management
-   Player connections
-   Match synchronization
-   Garbage distribution
-   Player elimination
-   Game state broadcasting

Clients simulate gameplay locally for performance.

Server validates major events.

------------------------------------------------------------------------

## 8.3 Client Responsibilities

Client handles:

-   Rendering
-   Input
-   Local piece physics
-   Sending events to server

------------------------------------------------------------------------

# 9. WebSocket Events

## 9.1 Connection

Client → Server

-   connect
-   join_lobby
-   create_lobby
-   leave_lobby

------------------------------------------------------------------------

## 9.2 Lobby Events

Client → Server

-   player_ready
-   start_game
-   send_chat
-   kick_player

Server → Clients

-   lobby_update
-   player_joined
-   player_left
-   chat_message
-   game_starting

------------------------------------------------------------------------

## 9.3 Game Events

Client → Server

-   piece_locked
-   lines_cleared
-   player_dead

Server → Clients

-   garbage_received
-   player_eliminated
-   board_state_update
-   match_end

------------------------------------------------------------------------

# 10. Synchronization Strategy

To reduce bandwidth, clients run local simulation.

Server sends only:

-   line clears
-   garbage events
-   player death

Optional spectator updates:

-   compressed board snapshot every 1--2 seconds

------------------------------------------------------------------------

# 11. UI Layout

## 11.1 In Game

Main player board centered.

Opponent boards shown as mini boards.

Example layout:

    Opponent Boards

    [P2] [P3] [P4]

            Player Board

    [P5] [P6] [P7]

------------------------------------------------------------------------

## 11.2 HUD

Displays:

-   Lines cleared
-   Garbage queue
-   Hold piece
-   Next pieces (5 preview)

------------------------------------------------------------------------

# 12. Technology Stack

Frontend:

-   HTML5
-   CSS
-   JavaScript
-   Canvas API

Optional:

-   PixiJS
-   React

Backend:

-   Node.js
-   WebSocket (ws or Socket.io)
-   Redis (optional scaling)

------------------------------------------------------------------------

# 13. Data Structures

## Player

``` json
{
  "id": "string",
  "name": "string",
  "ready": false,
  "alive": true,
  "socketId": "string"
}
```

## Lobby

``` json
{
  "lobbyId": "string",
  "hostId": "string",
  "players": [],
  "settings": {},
  "status": "waiting | playing"
}
```

## Game Instance

``` json
{
  "gameId": "string",
  "players": [],
  "alivePlayers": [],
  "garbageQueue": {}
}
```

------------------------------------------------------------------------

# 14. Disconnection Handling

During Lobby: - Remove player

During Match: - Mark player as eliminated

Optional: reconnect support in future versions.

------------------------------------------------------------------------

# 15. Anti-Cheat Measures

Server validates:

-   Impossible line clears
-   Abnormal game speed
-   Excessive piece placement rates

Optional improvement: - Server authoritative line clears

------------------------------------------------------------------------

# 16. Performance Targets

  Metric               Target
  -------------------- -------------
  Latency              \<150ms
  Lobby join           \<1 second
  Match start          \<3 seconds
  Players per server   100+

------------------------------------------------------------------------

# 17. Future Features

Potential future additions:

-   Ranked matchmaking
-   Spectator mode
-   Replays
-   Custom skins
-   Tournament brackets
-   Mobile support

------------------------------------------------------------------------

# 18. MVP Scope

Minimum viable product:

-   Lobby creation
-   2--10 player matches
-   Garbage mechanics
-   WebSocket networking
-   Basic UI
-   Player elimination
-   Winner screen
