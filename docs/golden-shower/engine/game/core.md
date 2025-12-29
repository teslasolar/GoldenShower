# Game Core

Main game controller base.

```javascript
/**
 * @udt Game
 * Main game controller
 */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new GS.Renderer(canvas);
    this.input = new GS.Input(canvas);
    this.camera = new GS.Camera();
    this.players = new Map();
    this.localPlayer = null;
    this.network = null;
    this.stateSync = new GS.StateSync();
    this.mode = 'deathmatch';
    this.limit = 10;
    this.time = 600;
    this.running = false;
    this.walls = [];
    this.floor = null;
    this.playerMesh = null;
    this.shootCooldown = 0;
    this.lastShootTime = 0;
    this.chatMessages = [];
    this.chatInput = '';
    this.chatOpen = false;
    this.maxChatMessages = 10;
    this.hitMarkerTime = 0;
    this.damageIndicatorTime = 0;
    this.damageDirection = 0;
    this.events = {};
  }

  on(e, fn) { (this.events[e] = this.events[e] || []).push(fn); }
  emit(e, d) { (this.events[e] || []).forEach(fn => fn(d)); }

  async init() {
    this.renderer.resize();
    window.addEventListener('resize', () => this.renderer.resize());
    const gl = this.renderer.gl;
    this.floor = GS.Mesh.box(gl, 60, 0.5, 60, [0.25, 0.25, 0.3]);
    this._createArena(gl);
    this.playerMesh = GS.Mesh.box(gl, 0.6, 1.8, 0.6, [1, 1, 1]);
    this._setupChatInput();
    this.canvas.addEventListener('click', () => this.shoot());
    console.log('[Game] Initialized');
  }

  startMatch() {
    this.running = true;
    this.addChat('Match started! WASD to move, mouse to look, click to shoot', '#00ff00');
    this.addChat('Press Enter to chat, 1-7 to switch weapons', '#888888');
    console.log('[Game] Match started');
  }
}

GS.Game = Game;
```
