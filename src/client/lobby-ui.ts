/**
 * DOM-based lobby UI.
 *
 * Creates and manages all lobby HTML elements. The game canvas remains
 * separate — this module only shows/hides its own container and the
 * canvas container as needed.
 */

import type { ClientEvent } from '../shared/protocol.js';
import type { Connection } from './connection.js';
import {
  type LobbyState,
  createInitialState,
  setPlayerId,
  setPlayerName,
  setScreen,
  updateLobby,
  clearLobby,
  returnToLobby,
  addChatMessage,
  updateLobbyList,
  setError,
  clearError,
  setJoinTargetLobbyId,
  setPasswordPromptVisible,
  clearPasswordPrompt,
  isHost,
  getOwnPlayer,
} from './lobby-state.js';

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let state: LobbyState = createInitialState();
let connection: Connection | null = null;
let onGameStart: (() => void) | null = null;

// DOM references (set during init)
let lobbyRoot: HTMLDivElement;
let menuScreen: HTMLDivElement;
let createScreen: HTMLDivElement;
let lobbyScreen: HTMLDivElement;
let errorBanner: HTMLDivElement;
let passwordDialog: HTMLDivElement;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function send(event: ClientEvent): void {
  connection?.send(event);
}

function setState(next: LobbyState): void {
  state = next;
  renderState();
}

function showScreen(screen: 'menu' | 'create' | 'lobby'): void {
  menuScreen.style.display = screen === 'menu' ? 'block' : 'none';
  createScreen.style.display = screen === 'create' ? 'block' : 'none';
  lobbyScreen.style.display = screen === 'lobby' ? 'block' : 'none';
}

function showError(message: string): void {
  setState(setError(state, message));
  setTimeout(() => setState(clearError(state)), 5000);
}

// ---------------------------------------------------------------------------
// Build DOM
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (HTMLElement | string)[]
): HTMLElementTagNameMap[K] {
  const elem = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') {
      elem.className = v;
    } else {
      elem.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      elem.appendChild(document.createTextNode(child));
    } else {
      elem.appendChild(child);
    }
  }
  return elem;
}

function buildMenuScreen(): HTMLDivElement {
  const container = el('div', { id: 'menu-screen', className: 'lobby-screen' });

  const title = el('h1', { className: 'lobby-title' }, 'OTRIS');
  const subtitle = el('p', { className: 'lobby-subtitle' }, 'Multiplayer Tetris');

  const nameInput = el('input', {
    type: 'text',
    id: 'name-input',
    placeholder: 'Enter your name...',
    maxlength: '16',
    className: 'lobby-input',
  });

  const nameBtn = el('button', { className: 'lobby-btn lobby-btn-primary', id: 'set-name-btn' }, 'Set Name');
  nameBtn.addEventListener('click', () => {
    const name = (document.getElementById('name-input') as HTMLInputElement).value.trim();
    if (name) {
      setState(setPlayerName(state, name));
      send({ type: 'set_name', name });
    }
  });

  const nameRow = el('div', { className: 'lobby-row' }, nameInput, nameBtn);

  const createBtn = el('button', { className: 'lobby-btn lobby-btn-accent', id: 'create-lobby-btn' }, 'Create Lobby');
  createBtn.addEventListener('click', () => {
    setState(setScreen(state, 'create'));
  });

  const refreshBtn = el('button', { className: 'lobby-btn', id: 'refresh-btn' }, 'Refresh');
  refreshBtn.addEventListener('click', () => {
    send({ type: 'list_lobbies' });
  });

  const btnRow = el('div', { className: 'lobby-row' }, createBtn, refreshBtn);

  // Join by ID section (for private lobbies)
  const joinIdHeader = el('h2', { className: 'lobby-section-title' }, 'Join by Lobby ID');
  const joinIdInput = el('input', {
    type: 'text',
    id: 'join-id-input',
    placeholder: 'Enter lobby ID...',
    className: 'lobby-input',
  });
  const joinIdBtn = el('button', { className: 'lobby-btn lobby-btn-primary', id: 'join-by-id-btn' }, 'Join');
  joinIdBtn.addEventListener('click', () => {
    const lobbyId = (document.getElementById('join-id-input') as HTMLInputElement).value.trim();
    if (lobbyId) {
      setState(setJoinTargetLobbyId(state, lobbyId));
      send({ type: 'join_lobby', lobbyId });
    }
  });
  const joinIdRow = el('div', { className: 'lobby-row' }, joinIdInput, joinIdBtn);

  const listHeader = el('h2', { className: 'lobby-section-title' }, 'Public Lobbies');
  const lobbyList = el('div', { id: 'lobby-list', className: 'lobby-list' });

  container.append(title, subtitle, nameRow, btnRow, joinIdHeader, joinIdRow, listHeader, lobbyList);
  return container;
}

function buildCreateScreen(): HTMLDivElement {
  const container = el('div', { id: 'create-screen', className: 'lobby-screen' });
  container.style.display = 'none';

  const title = el('h2', { className: 'lobby-section-title' }, 'Create Lobby');

  const nameLabel = el('label', { className: 'lobby-label' }, 'Lobby Name');
  const nameInput = el('input', {
    type: 'text',
    id: 'lobby-name-input',
    placeholder: 'My Lobby',
    className: 'lobby-input',
  });

  const maxLabel = el('label', { className: 'lobby-label' }, 'Max Players');
  const maxSelect = el('select', { id: 'max-players-select', className: 'lobby-input' });
  for (let i = 2; i <= 10; i++) {
    const opt = el('option', { value: String(i) }, String(i));
    if (i === 4) opt.selected = true;
    maxSelect.appendChild(opt);
  }

  const speedLabel = el('label', { className: 'lobby-label' }, 'Starting Speed');
  const speedSelect = el('select', { id: 'speed-select', className: 'lobby-input' });
  for (const [label, val] of [['Slow', '0.5'], ['Normal', '1'], ['Fast', '2']] as const) {
    const opt = el('option', { value: val }, label);
    if (val === '1') opt.selected = true;
    speedSelect.appendChild(opt);
  }

  const privateLabel = el('label', { className: 'lobby-label' });
  const privateCheck = el('input', { type: 'checkbox', id: 'private-check' });
  privateLabel.appendChild(privateCheck);
  privateLabel.appendChild(document.createTextNode(' Private Lobby'));

  const pwLabel = el('label', { className: 'lobby-label', id: 'pw-label', style: 'display:none' }, 'Password');
  const pwInput = el('input', {
    type: 'password',
    id: 'lobby-pw-input',
    placeholder: 'Password',
    className: 'lobby-input',
    style: 'display:none',
  });

  privateCheck.addEventListener('change', () => {
    const show = (privateCheck as HTMLInputElement).checked;
    pwLabel.style.display = show ? 'block' : 'none';
    pwInput.style.display = show ? 'block' : 'none';
  });

  const createBtn = el('button', { className: 'lobby-btn lobby-btn-accent', id: 'do-create-btn' }, 'Create');
  createBtn.addEventListener('click', () => {
    const maxPlayers = parseInt((document.getElementById('max-players-select') as HTMLSelectElement).value, 10);
    const startingSpeed = parseFloat((document.getElementById('speed-select') as HTMLSelectElement).value);
    const isPrivate = (document.getElementById('private-check') as HTMLInputElement).checked;
    const password = (document.getElementById('lobby-pw-input') as HTMLInputElement).value;

    send({
      type: 'create_lobby',
      settings: { maxPlayers, startingSpeed, isPrivate, password: isPrivate ? password : '' },
    });
  });

  const backBtn = el('button', { className: 'lobby-btn', id: 'back-to-menu-btn' }, 'Back');
  backBtn.addEventListener('click', () => {
    setState(setScreen(state, 'menu'));
  });

  const btnRow = el('div', { className: 'lobby-row' }, createBtn, backBtn);

  container.append(title, nameLabel, nameInput, maxLabel, maxSelect, speedLabel, speedSelect, privateLabel, pwLabel, pwInput, btnRow);
  return container;
}

function buildLobbyScreen(): HTMLDivElement {
  const container = el('div', { id: 'lobby-screen', className: 'lobby-screen' });
  container.style.display = 'none';

  const header = el('h2', { id: 'lobby-header', className: 'lobby-section-title' }, 'Lobby');
  const settingsDiv = el('div', { id: 'lobby-settings', className: 'lobby-settings' });

  const playerList = el('div', { id: 'player-list', className: 'player-list' });

  // Chat panel
  const chatPanel = el('div', { className: 'chat-panel' });
  const chatMessages = el('div', { id: 'chat-messages', className: 'chat-messages' });
  const chatInput = el('input', {
    type: 'text',
    id: 'chat-input',
    placeholder: 'Type a message...',
    className: 'lobby-input',
    maxlength: '200',
  });
  const chatSendBtn = el('button', { className: 'lobby-btn', id: 'chat-send-btn' }, 'Send');

  const sendChat = () => {
    const input = document.getElementById('chat-input') as HTMLInputElement;
    const message = input.value.trim();
    if (message) {
      send({ type: 'send_chat', message });
      input.value = '';
    }
  };
  chatSendBtn.addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChat();
  });

  const chatRow = el('div', { className: 'lobby-row' }, chatInput, chatSendBtn);
  chatPanel.append(chatMessages, chatRow);

  // Action buttons
  const readyBtn = el('button', { className: 'lobby-btn lobby-btn-accent', id: 'ready-btn' }, 'Ready');
  readyBtn.addEventListener('click', () => {
    const own = getOwnPlayer(state);
    if (own) {
      send({ type: 'player_ready', ready: !own.ready });
    }
  });

  const startBtn = el('button', { className: 'lobby-btn lobby-btn-primary', id: 'start-btn' }, 'Start Game');
  startBtn.addEventListener('click', () => {
    send({ type: 'start_game' });
  });

  const leaveBtn = el('button', { className: 'lobby-btn lobby-btn-danger', id: 'leave-btn' }, 'Leave');
  leaveBtn.addEventListener('click', () => {
    send({ type: 'leave_lobby' });
    setState(clearLobby(state));
  });

  const actionRow = el('div', { className: 'lobby-row' }, readyBtn, startBtn, leaveBtn);

  container.append(header, settingsDiv, playerList, chatPanel, actionRow);
  return container;
}

function buildPasswordDialog(): HTMLDivElement {
  const overlay = el('div', { id: 'password-dialog', className: 'password-overlay' });
  overlay.style.display = 'none';

  const dialog = el('div', { className: 'password-dialog' });
  const title = el('h3', { className: 'lobby-section-title' }, 'Password Required');
  const pwInput = el('input', {
    type: 'password',
    id: 'password-prompt-input',
    placeholder: 'Enter lobby password...',
    className: 'lobby-input',
  });

  const submitBtn = el('button', { className: 'lobby-btn lobby-btn-accent', id: 'password-submit-btn' }, 'Join');
  const cancelBtn = el('button', { className: 'lobby-btn', id: 'password-cancel-btn' }, 'Cancel');

  const submitPassword = () => {
    const password = (document.getElementById('password-prompt-input') as HTMLInputElement).value;
    const lobbyId = state.joinTargetLobbyId;
    if (lobbyId) {
      send({ type: 'join_lobby', lobbyId, password });
    }
    setState(clearPasswordPrompt(state));
  };

  submitBtn.addEventListener('click', submitPassword);
  pwInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitPassword();
  });
  cancelBtn.addEventListener('click', () => {
    setState(clearPasswordPrompt(state));
  });

  const btnRow = el('div', { className: 'lobby-row' }, submitBtn, cancelBtn);
  dialog.append(title, pwInput, btnRow);
  overlay.appendChild(dialog);
  return overlay;
}

// ---------------------------------------------------------------------------
// Render state into DOM
// ---------------------------------------------------------------------------

function renderState(): void {
  showScreen(state.screen);

  // Error banner
  if (state.errorMessage) {
    errorBanner.textContent = state.errorMessage;
    errorBanner.style.display = 'block';
  } else {
    errorBanner.style.display = 'none';
  }

  // Password dialog
  if (passwordDialog) {
    passwordDialog.style.display = state.passwordPromptVisible ? 'flex' : 'none';
    if (state.passwordPromptVisible) {
      const input = document.getElementById('password-prompt-input') as HTMLInputElement | null;
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  }

  // Menu: restore name input if player already has a name
  if (state.screen === 'menu' && state.playerName) {
    const nameInput = document.getElementById('name-input') as HTMLInputElement | null;
    if (nameInput && !nameInput.value) {
      nameInput.value = state.playerName;
    }
  }

  // Menu: lobby list
  const lobbyListEl = document.getElementById('lobby-list');
  if (lobbyListEl && state.screen === 'menu') {
    lobbyListEl.innerHTML = '';
    if (state.lobbyList.length === 0) {
      lobbyListEl.appendChild(el('p', { className: 'lobby-empty' }, 'No public lobbies available'));
    } else {
      for (const entry of state.lobbyList) {
        const row = el('div', { className: 'lobby-list-entry' });
        const info = el(
          'span',
          {},
          `${entry.hostName}'s lobby (${entry.playerCount}/${entry.maxPlayers})`,
        );
        const joinBtn = el('button', { className: 'lobby-btn lobby-btn-small' }, 'Join');
        joinBtn.addEventListener('click', () => {
          setState(setJoinTargetLobbyId(state, entry.id));
          send({ type: 'join_lobby', lobbyId: entry.id });
        });
        row.append(info, joinBtn);
        lobbyListEl.appendChild(row);
      }
    }
  }

  // Lobby screen
  if (state.screen === 'lobby' && state.lobby) {
    const lobby = state.lobby;

    // Header
    const header = document.getElementById('lobby-header');
    if (header) header.textContent = `Lobby: ${lobby.id}`;

    // Settings display (editable for host, read-only for others)
    const settingsDiv = document.getElementById('lobby-settings');
    if (settingsDiv) {
      const speedLabel = lobby.settings.startingSpeed <= 0.5 ? 'Slow' : lobby.settings.startingSpeed >= 2 ? 'Fast' : 'Normal';
      settingsDiv.innerHTML = '';

      if (isHost(state)) {
        // Editable settings for host
        const maxLabel = el('label', { className: 'lobby-label' }, 'Max Players ');
        const maxSelect = el('select', { id: 'lobby-max-select', className: 'lobby-input' });
        maxSelect.style.width = 'auto';
        maxSelect.style.display = 'inline-block';
        for (let i = 2; i <= 10; i++) {
          const opt = el('option', { value: String(i) }, String(i));
          if (i === lobby.settings.maxPlayers) opt.selected = true;
          maxSelect.appendChild(opt);
        }
        maxSelect.addEventListener('change', () => {
          send({
            type: 'change_settings',
            settings: { maxPlayers: parseInt(maxSelect.value, 10) },
          });
        });

        const speedLabelEl = el('label', { className: 'lobby-label' }, 'Speed ');
        const speedSelect = el('select', { id: 'lobby-speed-select', className: 'lobby-input' });
        speedSelect.style.width = 'auto';
        speedSelect.style.display = 'inline-block';
        for (const [lbl, val] of [['Slow', '0.5'], ['Normal', '1'], ['Fast', '2']] as const) {
          const opt = el('option', { value: val }, lbl);
          if (parseFloat(val) === lobby.settings.startingSpeed) opt.selected = true;
          speedSelect.appendChild(opt);
        }
        speedSelect.addEventListener('change', () => {
          send({
            type: 'change_settings',
            settings: { startingSpeed: parseFloat(speedSelect.value) },
          });
        });

        const privacyLabel = el('span', { className: 'settings-info' }, ` | ${lobby.settings.isPrivate ? 'Private' : 'Public'}`);
        const row = el('div', { className: 'lobby-row' }, maxLabel, maxSelect, speedLabelEl, speedSelect, privacyLabel);
        settingsDiv.appendChild(row);
      } else {
        // Read-only for non-host
        settingsDiv.appendChild(
          el(
            'p',
            { className: 'settings-info' },
            `Max Players: ${lobby.settings.maxPlayers} | Speed: ${speedLabel} | ${lobby.settings.isPrivate ? 'Private' : 'Public'}`,
          ),
        );
      }
    }

    // Player list
    const playerListEl = document.getElementById('player-list');
    if (playerListEl) {
      playerListEl.innerHTML = '';
      for (const player of lobby.players) {
        const readyIcon = player.ready ? '\u2714' : '\u2718';
        const readyClass = player.ready ? 'ready-yes' : 'ready-no';
        const hostTag = player.id === lobby.hostId ? ' (Host)' : '';
        const row = el(
          'div',
          { className: 'player-entry' },
          el('span', { className: readyClass }, readyIcon),
          el('span', {}, ` ${player.name}${hostTag}`),
        );

        // Kick button: visible to host, not on themselves
        if (isHost(state) && player.id !== state.playerId) {
          const kickBtn = el('button', { className: 'lobby-btn lobby-btn-danger lobby-btn-small' }, 'Kick');
          kickBtn.addEventListener('click', () => {
            send({ type: 'kick_player', playerId: player.id });
          });
          row.appendChild(kickBtn);
        }

        playerListEl.appendChild(row);
      }
    }

    // Chat
    const chatEl = document.getElementById('chat-messages');
    if (chatEl) {
      chatEl.innerHTML = '';
      for (const msg of state.chatMessages) {
        const line = el('div', { className: 'chat-line' },
          el('span', { className: 'chat-name' }, `${msg.playerName}: `),
          el('span', {}, msg.message),
        );
        chatEl.appendChild(line);
      }
      chatEl.scrollTop = chatEl.scrollHeight;
    }

    // Ready button text
    const readyBtn = document.getElementById('ready-btn');
    if (readyBtn) {
      const own = getOwnPlayer(state);
      readyBtn.textContent = own?.ready ? 'Unready' : 'Ready';
    }

    // Start button visibility (host only)
    const startBtn = document.getElementById('start-btn') as HTMLButtonElement | null;
    if (startBtn) {
      startBtn.style.display = isHost(state) ? 'inline-block' : 'none';
    }
  }
}

// ---------------------------------------------------------------------------
// Server event wiring
// ---------------------------------------------------------------------------

function handleServerEvent(conn: Connection): void {
  conn.onEvent((event) => {
    switch (event.type) {
      case 'welcome':
        setState(setPlayerId(state, event.playerId));
        // Request lobby list on connect
        send({ type: 'list_lobbies' });
        break;

      case 'lobby_update':
        setState(updateLobby(state, event.lobby));
        break;

      case 'lobby_list':
        setState(updateLobbyList(state, event));
        break;

      case 'chat_message':
        setState(addChatMessage(state, event));
        break;

      case 'player_joined':
        // Handled via lobby_update
        break;

      case 'player_left':
        // If the current player was kicked, return to menu
        if (event.playerId === state.playerId) {
          setState(clearLobby(state));
        }
        // Other players leaving is handled via lobby_update
        break;

      case 'game_starting':
        // Transition to game
        lobbyRoot.style.display = 'none';
        if (onGameStart) onGameStart();
        break;

      case 'error':
        // If the error is about password and we have a join target, show password prompt
        if (event.message.toLowerCase().includes('password') && state.joinTargetLobbyId) {
          setState(setPasswordPromptVisible(state, true));
        } else {
          showError(event.message);
        }
        break;
    }
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface LobbyUIOptions {
  connection: Connection;
  onGameStart: () => void;
}

export function initLobbyUI(options: LobbyUIOptions): { destroy: () => void } {
  connection = options.connection;
  onGameStart = options.onGameStart;
  state = createInitialState();

  // Build root container
  lobbyRoot = el('div', { id: 'lobby-root' });
  errorBanner = el('div', { id: 'error-banner', className: 'error-banner' });
  errorBanner.style.display = 'none';
  errorBanner.addEventListener('click', () => {
    setState(clearError(state));
  });

  menuScreen = buildMenuScreen();
  createScreen = buildCreateScreen();
  lobbyScreen = buildLobbyScreen();

  passwordDialog = buildPasswordDialog();
  lobbyRoot.append(errorBanner, menuScreen, createScreen, lobbyScreen, passwordDialog);
  document.body.appendChild(lobbyRoot);

  // Wire server events
  handleServerEvent(options.connection);

  // Initial render
  renderState();

  return {
    destroy() {
      lobbyRoot.remove();
      connection = null;
      onGameStart = null;
    },
  };
}

export function showLobbyUI(): void {
  if (lobbyRoot) {
    lobbyRoot.style.display = 'block';
    // If we have an active lobby (returning from match), stay on lobby screen
    if (state.lobby) {
      setState(returnToLobby(state));
    } else {
      setState(clearLobby(state));
      send({ type: 'list_lobbies' });
    }
  }
}

export function hideLobbyUI(): void {
  if (lobbyRoot) {
    lobbyRoot.style.display = 'none';
  }
}
