# Lobby System

Host/join lobbies with P2P WebRTC connections and ready state management.

```javascript
/**
 * Lobby - Game lobby with real P2P connections via KQTT
 * Supports both same-origin (BroadcastChannel) and cross-origin (WebRTC) peers
 */
class Lobby {
  constructor() {
    this.code = null;
    this.isHost = false;
    this.localId = null;
    this.players = new Map();
    this.settings = { mode: 'deathmatch', limit: 10, time: 10, max: 4 };
    this.network = null;
    this.events = {};
    this.pendingOffers = new Map();  // For WebRTC offer/answer tracking
    this.connectionMode = 'local';   // 'local' (BroadcastChannel) or 'p2p' (WebRTC)
  }

  on(e, fn) { (this.events[e] = this.events[e] || []).push(fn); }
  emit(e, d) { (this.events[e] || []).forEach(fn => fn(d)); }
  off(e, fn) {
    if (this.events[e]) {
      this.events[e] = this.events[e].filter(f => f !== fn);
    }
  }

  _genCode() { return Math.random().toString(36).substr(2, 6).toUpperCase(); }

  /**
   * Create a new lobby as host
   */
  create() {
    this.code = this._genCode();
    this.isHost = true;

    // Initialize network
    this.network = new GS.Network();
    this.network.init(this.code);
    this.localId = this.network.localId;

    this._setupNetworkHandlers();
    this._addPlayer({
      id: this.localId,
      name: 'Host',
      ready: false,
      character: 0
    });

    // Advertise on local discovery
    GS.LobbyDiscovery.advertise(this.code, 1, this.settings.max, 'Host');

    console.log(`[Lobby] Created lobby: ${this.code}`);
    return this.code;
  }

  /**
   * Join an existing lobby
   */
  join(code) {
    this.code = code.toUpperCase();
    this.isHost = false;

    // Initialize network
    this.network = new GS.Network();
    this.network.init(this.code);
    this.localId = this.network.localId;

    this._setupNetworkHandlers();
    this._addPlayer({
      id: this.localId,
      name: 'Player',
      ready: false,
      character: 0
    });

    // Announce join to local peers
    this.network.send('join', {
      player: {
        id: this.localId,
        name: 'Player',
        ready: false,
        character: 0
      }
    });

    console.log(`[Lobby] Joined lobby: ${this.code}`);
  }

  /**
   * Generate a WebRTC offer for P2P connection
   * Used when peers are on different origins/devices
   */
  async createP2POffer() {
    if (!this.network) throw new Error('Lobby not initialized');
    const offerText = await this.network.getOffer();
    return {
      code: this.code,
      offer: offerText,
      peerId: this.localId
    };
  }

  /**
   * Accept a WebRTC offer and return answer
   * Used by joining peer
   */
  async acceptP2POffer(offerText) {
    if (!this.network) {
      // Initialize network if not already done
      this.network = new GS.Network();
      this.network.init(this.code || 'P2P');
      this.localId = this.network.localId;
      this._setupNetworkHandlers();
    }

    const answerText = await this.network.acceptOffer(offerText);
    this.connectionMode = 'p2p';

    return {
      answer: answerText,
      peerId: this.localId
    };
  }

  /**
   * Accept a WebRTC answer to complete P2P connection
   * Used by host after joiner responds
   */
  async acceptP2PAnswer(answerText) {
    if (!this.network) throw new Error('Lobby not initialized');

    const peerId = await this.network.acceptAnswer(answerText);
    this.connectionMode = 'p2p';

    console.log(`[Lobby] P2P connection established with: ${peerId}`);
    return peerId;
  }

  _setupNetworkHandlers() {
    // Player join
    this.network.on('join', (msg) => {
      if (this.isHost) {
        this._addPlayer(msg.player);
        this._sync();
        GS.LobbyDiscovery.advertise(
          this.code,
          this.players.size,
          this.settings.max,
          'Host'
        );
      }
    });

    // Sync from host
    this.network.on('sync', (msg) => {
      if (!this.isHost) {
        const local = this.players.get(this.localId);
        this.players.clear();
        msg.players.forEach(p => this.players.set(p.id, p));
        // Ensure local player is in list
        if (local && !this.players.has(this.localId)) {
          this.players.set(this.localId, local);
        }
        this.emit('update', this.getState());
      }
    });

    // Ready state change
    this.network.on('ready', (msg) => {
      const p = this.players.get(msg.id);
      if (p) {
        p.ready = msg.ready;
        this.emit('update', this.getState());
        if (this.isHost) this._sync();
      }
    });

    // Character selection
    this.network.on('char', (msg) => {
      const p = this.players.get(msg.id);
      if (p) {
        p.character = msg.char;
        this.emit('update', this.getState());
        if (this.isHost) this._sync();
      }
    });

    // Name change
    this.network.on('name', (msg) => {
      const p = this.players.get(msg.id);
      if (p) {
        p.name = msg.name;
        this.emit('update', this.getState());
        if (this.isHost) this._sync();
      }
    });

    // Game start
    this.network.on('start', (msg) => {
      this.emit('game-launch', msg);
    });

    // Peer connection events
    this.network.on('peer-join', (e) => {
      console.log(`[Lobby] Peer connected: ${e.peerId}`);
      this.emit('peer-connected', e);
    });

    this.network.on('peer-leave', (e) => {
      console.log(`[Lobby] Peer disconnected: ${e.peerId}`);
      // Remove player if they disconnect
      if (this.players.has(e.peerId)) {
        this.players.delete(e.peerId);
        this.emit('update', this.getState());
        if (this.isHost) {
          this._sync();
          GS.LobbyDiscovery.advertise(
            this.code,
            this.players.size,
            this.settings.max,
            'Host'
          );
        }
      }
      this.emit('peer-disconnected', e);
    });
  }

  _addPlayer(p) {
    this.players.set(p.id, p);
    this.emit('update', this.getState());
  }

  _sync() {
    this.network.send('sync', {
      players: Array.from(this.players.values()),
      settings: this.settings
    });
  }

  /**
   * Set local player ready state
   */
  setReady(ready) {
    const p = this.players.get(this.localId);
    if (p) p.ready = ready;
    this.network.send('ready', { id: this.localId, ready });
    this.emit('update', this.getState());
  }

  /**
   * Set local player character
   */
  setChar(char) {
    const p = this.players.get(this.localId);
    if (p) p.character = char;
    this.network.send('char', { id: this.localId, char });
    this.emit('update', this.getState());
  }

  /**
   * Set local player name
   */
  setName(name) {
    const p = this.players.get(this.localId);
    if (p) p.name = name;
    this.network.send('name', { id: this.localId, name });
    this.emit('update', this.getState());
  }

  /**
   * Update game settings (host only)
   */
  setSettings(settings) {
    if (!this.isHost) return;
    this.settings = { ...this.settings, ...settings };
    this._sync();
  }

  /**
   * Check if all players are ready
   */
  allReady() {
    if (this.players.size < 1) return false;
    for (const p of this.players.values()) {
      if (!p.ready) return false;
    }
    return true;
  }

  /**
   * Start the game (host only)
   */
  start() {
    if (!this.isHost) return;

    GS.LobbyDiscovery.close(this.code);

    const data = {
      settings: this.settings,
      players: Array.from(this.players.values())
    };

    this.network.send('start', data);
    this.emit('game-launch', data);
  }

  /**
   * Get current lobby state
   */
  getState() {
    return {
      code: this.code,
      isHost: this.isHost,
      localId: this.localId,
      players: Array.from(this.players.values()),
      settings: this.settings,
      connectionMode: this.connectionMode,
      peerCount: this.network ? this.network.getPeers().length : 0
    };
  }

  /**
   * Get network stats
   */
  getNetworkStats() {
    return this.network ? this.network.getStats() : null;
  }

  /**
   * Leave the lobby
   */
  leave() {
    if (this.isHost) {
      GS.LobbyDiscovery.close(this.code);
    }
    if (this.network) {
      this.network.close();
      this.network = null;
    }
    this.players.clear();
    this.code = null;
  }
}

GS.Lobby = Lobby;
```
