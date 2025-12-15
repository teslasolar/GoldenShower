# Game Lobby System

Lobby management for connecting players before a match.

## Lobby Manager

```javascript
/**
 * Lobby manager for pre-game setup
 */
GoldenShower.Lobby = class Lobby {
  constructor() {
    this.code = null;
    this.players = new Map();
    this.isHost = false;
    this.localPlayerId = null;

    this.settings = {
      gameMode: 'deathmatch',
      scoreLimit: 10,
      timeLimit: 10,
      weaponSet: 'all',
      arena: 'temple',
      maxPlayers: 4
    };

    this.state = 'waiting'; // waiting, countdown, playing
    this.countdownTimer = 0;
  }

  /**
   * Create a new lobby (host)
   */
  create() {
    this.code = this.generateCode();
    this.isHost = true;
    this.localPlayerId = crypto.randomUUID();

    // Initialize signaling
    this.initSignaling();

    // Add self as first player
    this.addPlayer({
      id: this.localPlayerId,
      name: 'Host',
      ready: false,
      character: 0
    });

    return this.code;
  }

  /**
   * Join an existing lobby
   */
  join(code) {
    this.code = code.toUpperCase();
    this.isHost = false;
    this.localPlayerId = crypto.randomUUID();

    // Initialize signaling
    this.initSignaling();

    return this.localPlayerId;
  }

  /**
   * Generate a random lobby code
   */
  generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Initialize signaling channel
   */
  initSignaling() {
    // Use BroadcastChannel for same-origin (GitHub Pages)
    this.channel = new BroadcastChannel(`golden-shower-lobby-${this.code}`);

    this.channel.onmessage = (e) => {
      this.handleMessage(e.data);
    };

    // Announce presence
    this.broadcast({
      type: 'player-join',
      player: {
        id: this.localPlayerId,
        name: this.isHost ? 'Host' : 'Player',
        ready: false,
        character: 0
      }
    });
  }

  /**
   * Handle lobby messages
   */
  handleMessage(msg) {
    switch (msg.type) {
      case 'player-join':
        this.addPlayer(msg.player);
        // If host, send full state
        if (this.isHost) {
          this.broadcast({
            type: 'lobby-state',
            players: Array.from(this.players.values()),
            settings: this.settings
          });
        }
        break;

      case 'player-leave':
        this.removePlayer(msg.playerId);
        break;

      case 'player-ready':
        this.setPlayerReady(msg.playerId, msg.ready);
        break;

      case 'player-character':
        this.setPlayerCharacter(msg.playerId, msg.character);
        break;

      case 'lobby-state':
        // Sync state from host
        if (!this.isHost) {
          this.players.clear();
          msg.players.forEach(p => this.players.set(p.id, p));
          this.settings = msg.settings;
          this.emit('state-update');
        }
        break;

      case 'settings-update':
        if (!this.isHost) {
          this.settings = msg.settings;
          this.emit('settings-update');
        }
        break;

      case 'game-start':
        this.startCountdown();
        break;

      case 'signal':
        // WebRTC signaling pass-through
        if (msg.to === this.localPlayerId) {
          GoldenShower.Network.handleSignal(msg.from, msg.signal);
        }
        break;
    }
  }

  /**
   * Broadcast message to lobby
   */
  broadcast(msg) {
    msg.from = this.localPlayerId;
    this.channel.postMessage(msg);
  }

  /**
   * Add player to lobby
   */
  addPlayer(player) {
    if (this.players.size >= this.settings.maxPlayers) {
      console.warn('[Lobby] Max players reached');
      return false;
    }

    this.players.set(player.id, player);
    this.emit('player-joined', player);
    return true;
  }

  /**
   * Remove player from lobby
   */
  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      this.players.delete(playerId);
      this.emit('player-left', player);
    }
  }

  /**
   * Set player ready state
   */
  setPlayerReady(playerId, ready) {
    const player = this.players.get(playerId);
    if (player) {
      player.ready = ready;
      this.emit('player-ready', { playerId, ready });

      // Check if all ready
      if (this.isHost && this.allReady()) {
        this.emit('all-ready');
      }
    }
  }

  /**
   * Toggle local player ready
   */
  toggleReady() {
    const player = this.players.get(this.localPlayerId);
    if (player) {
      player.ready = !player.ready;
      this.broadcast({
        type: 'player-ready',
        playerId: this.localPlayerId,
        ready: player.ready
      });
    }
  }

  /**
   * Set player character
   */
  setPlayerCharacter(playerId, character) {
    const player = this.players.get(playerId);
    if (player) {
      player.character = character;
      this.emit('player-character', { playerId, character });
    }
  }

  /**
   * Check if all players ready
   */
  allReady() {
    if (this.players.size < 2) return false;
    for (const [id, player] of this.players) {
      if (!player.ready) return false;
    }
    return true;
  }

  /**
   * Update settings (host only)
   */
  updateSettings(settings) {
    if (!this.isHost) return;

    Object.assign(this.settings, settings);
    this.broadcast({
      type: 'settings-update',
      settings: this.settings
    });

    this.emit('settings-update');
  }

  /**
   * Start game countdown (host only)
   */
  startGame() {
    if (!this.isHost) return;
    if (!this.allReady()) {
      console.warn('[Lobby] Not all players ready');
      return;
    }

    this.broadcast({ type: 'game-start' });
    this.startCountdown();
  }

  /**
   * Countdown before game starts
   */
  startCountdown() {
    this.state = 'countdown';
    this.countdownTimer = 3;

    const tick = () => {
      this.emit('countdown', this.countdownTimer);

      if (this.countdownTimer <= 0) {
        this.launchGame();
      } else {
        this.countdownTimer--;
        setTimeout(tick, 1000);
      }
    };

    tick();
  }

  /**
   * Launch the actual game
   */
  async launchGame() {
    this.state = 'playing';

    // Establish WebRTC connections between all players
    await this.establishPeerConnections();

    // Start the game
    this.emit('game-launch', {
      players: Array.from(this.players.values()),
      settings: this.settings
    });
  }

  /**
   * Establish P2P connections between players
   */
  async establishPeerConnections() {
    // Set up signaling pass-through
    GoldenShower.Network.setSignalMethod({
      send: (peerId, signal) => {
        this.broadcast({
          type: 'signal',
          to: peerId,
          signal
        });
      }
    });

    GoldenShower.Network.localPlayerId = this.localPlayerId;
    GoldenShower.Network.isHost = this.isHost;

    // If host, initiate connections to all players
    if (this.isHost) {
      for (const [id, player] of this.players) {
        if (id !== this.localPlayerId) {
          await GoldenShower.Network.connectTo(id);
        }
      }
    }

    // Wait for connections
    return new Promise(resolve => {
      const checkConnections = () => {
        const connected = GoldenShower.Network.peers.size;
        const needed = this.players.size - 1;

        if (connected >= needed) {
          resolve();
        } else {
          setTimeout(checkConnections, 100);
        }
      };

      setTimeout(checkConnections, 500);
    });
  }

  /**
   * Leave lobby
   */
  leave() {
    this.broadcast({
      type: 'player-leave',
      playerId: this.localPlayerId
    });

    this.channel.close();
    this.players.clear();
    this.state = 'waiting';
  }

  // Simple event emitter
  _events = {};
  on(event, fn) {
    this._events[event] = this._events[event] || [];
    this._events[event].push(fn);
  }
  emit(event, data) {
    (this._events[event] || []).forEach(fn => fn(data));
  }
};

/**
 * Character definitions
 */
GoldenShower.Characters = [
  { id: 0, name: 'James Bond', color: [0.2, 0.2, 0.4] },
  { id: 1, name: 'Natalya', color: [0.6, 0.3, 0.3] },
  { id: 2, name: 'Trevelyan', color: [0.4, 0.4, 0.2] },
  { id: 3, name: 'Oddjob', color: [0.3, 0.3, 0.3] },
  { id: 4, name: 'Jaws', color: [0.5, 0.5, 0.5] },
  { id: 5, name: 'Baron Samedi', color: [0.1, 0.1, 0.1] },
  { id: 6, name: 'Xenia', color: [0.5, 0.2, 0.3] },
  { id: 7, name: 'Mayday', color: [0.3, 0.2, 0.5] },
];

/**
 * Arena definitions
 */
GoldenShower.Arenas = [
  { id: 'temple', name: 'Temple', size: 30 },
  { id: 'complex', name: 'Complex', size: 40 },
  { id: 'facility', name: 'Facility', size: 35 },
  { id: 'bunker', name: 'Bunker', size: 25 },
  { id: 'library', name: 'Library', size: 20 },
  { id: 'stack', name: 'Stack', size: 30 },
];

/**
 * Weapon set definitions
 */
GoldenShower.WeaponSets = [
  { id: 'slappers', name: 'Slappers Only', weapons: [0] },
  { id: 'pistols', name: 'Pistols', weapons: [1] },
  { id: 'automatics', name: 'Automatics', weapons: [2] },
  { id: 'power', name: 'Power Weapons', weapons: [3, 4] },
  { id: 'rockets', name: 'Rockets', weapons: [5] },
  { id: 'golden', name: 'Golden Gun', weapons: [6, 1] },
  { id: 'all', name: 'All Weapons', weapons: [1, 2, 3, 4, 5, 6] },
];
```

## Lobby UI

```javascript
/**
 * Lobby UI renderer
 */
GoldenShower.LobbyUI = class LobbyUI {
  constructor(container) {
    this.container = container;
    this.lobby = null;
  }

  bind(lobby) {
    this.lobby = lobby;

    lobby.on('player-joined', () => this.render());
    lobby.on('player-left', () => this.render());
    lobby.on('player-ready', () => this.render());
    lobby.on('settings-update', () => this.render());
    lobby.on('countdown', (n) => this.showCountdown(n));
    lobby.on('game-launch', (data) => this.onGameLaunch(data));
  }

  render() {
    const lobby = this.lobby;
    if (!lobby) return;

    this.container.innerHTML = `
      <div class="lobby-panel">
        <h2>LOBBY: ${lobby.code}</h2>

        <div class="players-list">
          <h3>PLAYERS (${lobby.players.size}/${lobby.settings.maxPlayers})</h3>
          ${Array.from(lobby.players.values()).map(p => `
            <div class="player-row ${p.ready ? 'ready' : ''}">
              <span class="player-name">${p.name}</span>
              <span class="player-char">${GoldenShower.Characters[p.character].name}</span>
              <span class="player-status">${p.ready ? 'READY' : 'NOT READY'}</span>
            </div>
          `).join('')}
        </div>

        ${lobby.isHost ? `
          <div class="settings">
            <h3>SETTINGS</h3>
            <label>
              Mode:
              <select id="gameMode">
                <option value="deathmatch" ${lobby.settings.gameMode === 'deathmatch' ? 'selected' : ''}>Deathmatch</option>
                <option value="license" ${lobby.settings.gameMode === 'license' ? 'selected' : ''}>License to Kill</option>
                <option value="flag" ${lobby.settings.gameMode === 'flag' ? 'selected' : ''}>Living Daylights</option>
              </select>
            </label>
            <label>
              Score Limit:
              <input type="number" id="scoreLimit" value="${lobby.settings.scoreLimit}" min="1" max="50">
            </label>
            <label>
              Time Limit (min):
              <input type="number" id="timeLimit" value="${lobby.settings.timeLimit}" min="1" max="30">
            </label>
            <label>
              Weapons:
              <select id="weaponSet">
                ${GoldenShower.WeaponSets.map(ws => `
                  <option value="${ws.id}" ${lobby.settings.weaponSet === ws.id ? 'selected' : ''}>${ws.name}</option>
                `).join('')}
              </select>
            </label>
            <label>
              Arena:
              <select id="arena">
                ${GoldenShower.Arenas.map(a => `
                  <option value="${a.id}" ${lobby.settings.arena === a.id ? 'selected' : ''}>${a.name}</option>
                `).join('')}
              </select>
            </label>
          </div>
        ` : ''}

        <div class="character-select">
          <h3>SELECT CHARACTER</h3>
          <div class="characters">
            ${GoldenShower.Characters.map(c => `
              <button class="char-btn" data-char="${c.id}">${c.name}</button>
            `).join('')}
          </div>
        </div>

        <div class="actions">
          <button id="readyBtn" class="btn-ready">
            ${lobby.players.get(lobby.localPlayerId)?.ready ? 'NOT READY' : 'READY'}
          </button>
          ${lobby.isHost ? `
            <button id="startBtn" class="btn-start" ${lobby.allReady() ? '' : 'disabled'}>
              START GAME
            </button>
          ` : ''}
          <button id="leaveBtn" class="btn-leave">LEAVE</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const lobby = this.lobby;

    // Ready button
    document.getElementById('readyBtn')?.addEventListener('click', () => {
      lobby.toggleReady();
    });

    // Start button
    document.getElementById('startBtn')?.addEventListener('click', () => {
      lobby.startGame();
    });

    // Leave button
    document.getElementById('leaveBtn')?.addEventListener('click', () => {
      lobby.leave();
      window.location.reload();
    });

    // Character buttons
    document.querySelectorAll('.char-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const char = parseInt(btn.dataset.char);
        lobby.setPlayerCharacter(lobby.localPlayerId, char);
        lobby.broadcast({
          type: 'player-character',
          playerId: lobby.localPlayerId,
          character: char
        });
      });
    });

    // Settings (host only)
    if (lobby.isHost) {
      ['gameMode', 'scoreLimit', 'timeLimit', 'weaponSet', 'arena'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', (e) => {
          const value = e.target.type === 'number' ? parseInt(e.target.value) : e.target.value;
          lobby.updateSettings({ [id]: value });
        });
      });
    }
  }

  showCountdown(n) {
    this.container.innerHTML = `
      <div class="countdown">
        <h1>${n > 0 ? n : 'GO!'}</h1>
      </div>
    `;
  }

  onGameLaunch(data) {
    this.container.style.display = 'none';
  }
};
```

## Usage

```javascript {"noexec": true}
// Create lobby UI
const lobbyUI = new GoldenShower.LobbyUI(document.getElementById('lobby-container'));

// Host a game
const lobby = new GoldenShower.Lobby();
const code = lobby.create();
console.log(`Lobby code: ${code}`);

// Or join existing
// lobby.join('ABC123');

lobbyUI.bind(lobby);
lobbyUI.render();

// When game launches
lobby.on('game-launch', async ({ players, settings }) => {
  const game = new GoldenShower.Game(document.getElementById('game'));
  await game.init();

  // Add all players
  players.forEach(p => {
    game.addPlayer(p.id, p.id === lobby.localPlayerId);
  });

  // Apply settings
  game.gameMode = settings.gameMode;
  game.scoreLimit = settings.scoreLimit;
  game.timeLimit = settings.timeLimit * 60;

  // Start
  game.startMatch();
});
```
