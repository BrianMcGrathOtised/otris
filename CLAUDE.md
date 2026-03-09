# Otris

Competitive multiplayer Tetris-style web game for 2-10 players.

## Tech Stack

- **Frontend:** TypeScript, HTML5 Canvas, Vite
- **Backend:** Node.js, TypeScript, ws (WebSocket)
- **Testing:** Vitest (TDD required)
- **Deployment:** DigitalOcean Droplet

## Project Structure

- `multiplayer_tetris_gdd.md` — Game Design Document
- `.oes/PROJECT.md` — Requirements and decisions
- `.oes/ROADMAP.md` — Phased delivery plan

## Conventions

- TypeScript strict mode
- TDD: write tests before implementation
- Game logic must be pure and testable (separate from rendering)
- Client-server communication via WebSocket events
- Canvas rendering with gradient/glow visual style
