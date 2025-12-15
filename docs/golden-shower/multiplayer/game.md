# GoldenEye Multiplayer Game

The complete multiplayer deathmatch game assembled from engine and network components.

## Player Class

```javascript
/**
 * Player entity
 */
GoldenShower.Player = class Player {
  constructor(id, isLocal = false) {
    this.id = id;
    this.isLocal = isLocal;

    // Transform
    this.pos = new GoldenShower.Vec3(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.velocity = new GoldenShower.Vec3(0, 0, 0);

    // Stats
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 0;
    this.kills = 0;
    this.deaths = 0;

    // Weapons
    this.weapon = 0;
    this.ammo = [0, 30, 0, 0, 0, 0, 0, 0]; // per weapon type
    this.weaponCooldown = 0;

    // State
    this.alive = true;
    this.respawnTimer = 0;
    this.invincibleTimer = 0;

    // Appearance
    this.color = Player.COLORS[id % Player.COLORS.length];
    this.name = `Player ${id + 1}`;

    // Interpolation (for remote players)
    this.targetPos = this.pos.clone();
    this.targetYaw = this.yaw;
  }

  static COLORS = [
    [0.2, 0.4, 0.9],  // Blue
    [0.9, 0.2, 0.2],  // Red
    [0.2, 0.8, 0.3],  // Green
    [0.9, 0.9, 0.2],  // Yellow
  ];

  static SPEED = 5.0;
  static JUMP_FORCE = 8.0;
  static GRAVITY = -20.0;
  static MOUSE_SENS = 0.002;

  update(dt, input) {
    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    if (this.isLocal && input) {
      this.handleInput(dt, input);
    } else {
      this.interpolate(dt);
    }

    // Physics
    this.velocity.y += Player.GRAVITY * dt;
    this.pos.add(this.velocity.clone().scale(dt));

    // Floor collision
    if (this.pos.y < 0) {
      this.pos.y = 0;
      this.velocity.y = 0;
    }

    // Cooldowns
    if (this.weaponCooldown > 0) {
      this.weaponCooldown -= dt;
    }
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
    }
  }

  handleInput(dt, input) {
    // Mouse look
    const { dx, dy } = input.consumeMouseDelta();
    this.yaw -= dx * Player.MOUSE_SENS;
    this.pitch -= dy * Player.MOUSE_SENS;
    this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));

    // Movement
    const move = input.getMovement();
    if (move.x !== 0 || move.z !== 0) {
      const forward = new GoldenShower.Vec3(
        Math.sin(this.yaw),
        0,
        Math.cos(this.yaw)
      );
      const right = new GoldenShower.Vec3(
        Math.cos(this.yaw),
        0,
        -Math.sin(this.yaw)
      );

      const moveDir = forward.scale(move.z).add(right.scale(move.x)).normalize();
      this.velocity.x = moveDir.x * Player.SPEED;
      this.velocity.z = moveDir.z * Player.SPEED;
    } else {
      this.velocity.x *= 0.9;
      this.velocity.z *= 0.9;
    }

    // Jump
    if (input.isKeyDown('Space') && this.pos.y === 0) {
      this.velocity.y = Player.JUMP_FORCE;
    }

    // Shoot
    if (input.isButtonDown(0) && this.weaponCooldown <= 0) {
      this.shoot();
    }
  }

  interpolate(dt) {
    this.pos.lerp(this.targetPos, 0.2);
    this.yaw += (this.targetYaw - this.yaw) * 0.2;
  }

  setRemoteState(state) {
    this.targetPos.set(state.x, state.y, state.z);
    this.targetYaw = state.yaw;
    this.pitch = state.pitch;
    this.health = state.health;
    this.weapon = state.weapon;
  }

  shoot() {
    if (this.ammo[this.weapon] <= 0 && this.weapon !== 0) return;

    this.weaponCooldown = GoldenShower.Weapons[this.weapon].cooldown;

    if (this.weapon !== 0) {
      this.ammo[this.weapon]--;
    }

    // Emit shot event
    GoldenShower.Network.sendEvent({
      type: 'shot',
      playerId: this.id,
      pos: this.pos.toArray(),
      yaw: this.yaw,
      pitch: this.pitch,
      weapon: this.weapon
    });

    return {
      origin: this.pos.clone().add(new GoldenShower.Vec3(0, 1.5, 0)),
      dir: new GoldenShower.Vec3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        Math.cos(this.yaw) * Math.cos(this.pitch)
      ),
      weapon: this.weapon
    };
  }

  takeDamage(amount, attackerId) {
    if (this.invincibleTimer > 0) return;

    // Armor absorbs some damage
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.5);
      this.armor -= absorbed;
      amount -= absorbed;
    }

    this.health -= amount;

    if (this.health <= 0) {
      this.die(attackerId);
    }
  }

  die(killerId) {
    this.alive = false;
    this.deaths++;
    this.respawnTimer = 3;

    GoldenShower.Network.sendEvent({
      type: 'death',
      playerId: this.id,
      killerId
    });
  }

  respawn() {
    this.alive = true;
    this.health = this.maxHealth;
    this.armor = 0;
    this.invincibleTimer = 2;

    // Get spawn point from arena
    const spawn = GoldenShower.Game.instance.arena.getSpawnPoint(this.id);
    this.pos.copy(spawn.pos);
    this.yaw = spawn.angle;

    // Reset weapons
    this.weapon = 1; // Pistol
    this.ammo = [0, 30, 0, 0, 0, 0, 0, 0];
  }

  getState() {
    return {
      playerId: this.id,
      x: this.pos.x,
      y: this.pos.y,
      z: this.pos.z,
      yaw: this.yaw,
      pitch: this.pitch,
      health: this.health,
      weapon: this.weapon,
      ammo: this.ammo[this.weapon],
      flags: (this.alive ? 1 : 0) | (this.invincibleTimer > 0 ? 2 : 0)
    };
  }
};
```

## Weapons

```javascript
/**
 * Weapon definitions
 */
GoldenShower.Weapons = [
  {
    id: 0,
    name: 'Unarmed',
    damage: 10,
    cooldown: 0.5,
    range: 2,
    spread: 0,
    ammoType: -1,
    automatic: false
  },
  {
    id: 1,
    name: 'PP7',
    damage: 25,
    cooldown: 0.3,
    range: 50,
    spread: 0.02,
    ammoType: 0,
    automatic: false
  },
  {
    id: 2,
    name: 'KF7 Soviet',
    damage: 15,
    cooldown: 0.1,
    range: 40,
    spread: 0.05,
    ammoType: 1,
    automatic: true
  },
  {
    id: 3,
    name: 'Shotgun',
    damage: 10,
    cooldown: 0.8,
    range: 15,
    spread: 0.15,
    pellets: 8,
    ammoType: 2,
    automatic: false
  },
  {
    id: 4,
    name: 'Sniper Rifle',
    damage: 80,
    cooldown: 1.5,
    range: 100,
    spread: 0.005,
    ammoType: 3,
    automatic: false,
    scope: true
  },
  {
    id: 5,
    name: 'Rocket Launcher',
    damage: 150,
    cooldown: 2.0,
    range: 50,
    spread: 0,
    ammoType: 4,
    automatic: false,
    explosive: true,
    blastRadius: 5
  },
  {
    id: 6,
    name: 'Golden Gun',
    damage: 1000, // One-shot kill
    cooldown: 1.0,
    range: 50,
    spread: 0,
    ammoType: 5,
    automatic: false
  }
];

/**
 * Damage multipliers by body part
 */
GoldenShower.DamageMultipliers = {
  head: 4.0,
  chest: 1.0,
  gut: 0.5,
  arm: 0.3,
  leg: 0.4
};
```

## Arena

```javascript
/**
 * Multiplayer arena
 */
GoldenShower.Arena = class Arena {
  constructor(config) {
    this.name = config.name || 'Arena';
    this.size = config.size || 20;
    this.wallHeight = config.wallHeight || 4;

    this.spawnPoints = config.spawnPoints || this.generateSpawnPoints();
    this.weaponSpawns = config.weaponSpawns || [];
    this.pickups = [];

    this.lastSpawnUsed = [-1000, -1000, -1000, -1000];
  }

  generateSpawnPoints() {
    const s = this.size * 0.4;
    return [
      { pos: new GoldenShower.Vec3(-s, 0, -s), angle: Math.PI / 4 },
      { pos: new GoldenShower.Vec3( s, 0, -s), angle: Math.PI * 3 / 4 },
      { pos: new GoldenShower.Vec3( s, 0,  s), angle: -Math.PI * 3 / 4 },
      { pos: new GoldenShower.Vec3(-s, 0,  s), angle: -Math.PI / 4 },
      { pos: new GoldenShower.Vec3( 0, 0, -s), angle: Math.PI / 2 },
      { pos: new GoldenShower.Vec3( 0, 0,  s), angle: -Math.PI / 2 },
      { pos: new GoldenShower.Vec3(-s, 0,  0), angle: 0 },
      { pos: new GoldenShower.Vec3( s, 0,  0), angle: Math.PI },
    ];
  }

  getSpawnPoint(playerId) {
    const now = performance.now();
    let best = null;
    let bestScore = -Infinity;

    for (let i = 0; i < this.spawnPoints.length; i++) {
      let score = 0;

      // Prefer spawns not recently used
      const timeSinceUsed = now - this.lastSpawnUsed[i];
      score += Math.min(timeSinceUsed, 5000) / 1000;

      // Could add distance from other players here

      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }

    this.lastSpawnUsed[best] = now;
    return this.spawnPoints[best];
  }

  isInBounds(pos) {
    const s = this.size / 2;
    return pos.x >= -s && pos.x <= s && pos.z >= -s && pos.z <= s;
  }

  constrainPosition(pos) {
    const s = this.size / 2 - 0.5;
    pos.x = Math.max(-s, Math.min(s, pos.x));
    pos.z = Math.max(-s, Math.min(s, pos.z));
  }
};
```

## Game Class

```javascript
/**
 * Main game controller
 */
GoldenShower.Game = class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new GoldenShower.Renderer(canvas);
    this.input = new GoldenShower.Input(canvas);
    this.camera = new GoldenShower.Camera();

    this.players = new Map();
    this.localPlayer = null;
    this.arena = null;

    this.meshes = {};
    this.projectiles = [];

    // Match state
    this.gameMode = 'deathmatch';
    this.scoreLimit = 10;
    this.timeLimit = 10 * 60; // 10 minutes
    this.matchTime = 0;
    this.matchStarted = false;

    Game.instance = this;
  }

  async init() {
    // Create meshes
    const playerGeom = GoldenShower.Primitives.player();
    this.meshes.player = this.renderer.createMesh(
      playerGeom.vertices,
      playerGeom.indices
    );

    const floorGeom = GoldenShower.Primitives.plane(30, 30);
    this.meshes.floor = this.renderer.createMesh(
      floorGeom.vertices,
      floorGeom.indices
    );

    // Create arena
    this.arena = new GoldenShower.Arena({
      name: 'Temple',
      size: 30
    });

    // Setup network events
    this.setupNetworkEvents();

    // Update camera aspect
    this.camera.setAspect(this.canvas.width / this.canvas.height);

    console.log('[Game] Initialized');
  }

  setupNetworkEvents() {
    GoldenShower.Network.on('peer-connected', ({ peerId }) => {
      this.addPlayer(peerId, false);
    });

    GoldenShower.Network.on('peer-disconnected', ({ peerId }) => {
      this.removePlayer(peerId);
    });

    GoldenShower.Network.on('state-update', ({ peerId, state }) => {
      const player = this.players.get(peerId);
      if (player) {
        player.setRemoteState(state);
      }
    });

    GoldenShower.Network.on('game-event', ({ peerId, event }) => {
      this.handleGameEvent(peerId, event);
    });
  }

  handleGameEvent(fromId, event) {
    switch (event.type) {
      case 'shot':
        this.handleShot(fromId, event);
        break;
      case 'death':
        this.handleDeath(event.playerId, event.killerId);
        break;
    }
  }

  handleShot(fromId, event) {
    const shooter = this.players.get(fromId);
    if (!shooter) return;

    const weapon = GoldenShower.Weapons[event.weapon];
    const origin = GoldenShower.Vec3.fromArray(event.pos);
    origin.y += 1.5;

    const dir = new GoldenShower.Vec3(
      Math.sin(event.yaw) * Math.cos(event.pitch),
      Math.sin(event.pitch),
      Math.cos(event.yaw) * Math.cos(event.pitch)
    );

    // Check hits against other players
    for (const [id, player] of this.players) {
      if (id === fromId || !player.alive) continue;

      // Simple cylinder collision
      const toPlayer = player.pos.clone().sub(origin);
      toPlayer.y = 0;

      const t = dir.clone();
      t.y = 0;
      t.normalize();

      const dot = toPlayer.dot(t);
      if (dot < 0 || dot > weapon.range) continue;

      const closest = t.clone().scale(dot);
      const dist = closest.sub(toPlayer).length();

      if (dist < 0.5) { // Hit radius
        // Determine body part (simplified)
        const hitY = origin.y + dir.y * dot;
        let part = 'chest';
        if (hitY > player.pos.y + 1.5) part = 'head';
        else if (hitY < player.pos.y + 0.8) part = 'leg';

        const damage = weapon.damage * GoldenShower.DamageMultipliers[part];
        player.takeDamage(damage, fromId);

        if (!player.alive) {
          shooter.kills++;
        }
      }
    }
  }

  handleDeath(playerId, killerId) {
    const player = this.players.get(playerId);
    const killer = this.players.get(killerId);

    if (player) {
      player.alive = false;
      player.deaths++;
      player.respawnTimer = 3;
    }

    if (killer && killer !== player) {
      killer.kills++;

      // Check win condition
      if (killer.kills >= this.scoreLimit) {
        this.endMatch(killer);
      }
    }
  }

  addPlayer(id, isLocal = false) {
    const player = new GoldenShower.Player(id, isLocal);
    const spawn = this.arena.getSpawnPoint(this.players.size);
    player.pos.copy(spawn.pos);
    player.yaw = spawn.angle;

    this.players.set(id, player);

    if (isLocal) {
      this.localPlayer = player;
    }

    console.log(`[Game] Player ${id} joined`);
    return player;
  }

  removePlayer(id) {
    this.players.delete(id);
    console.log(`[Game] Player ${id} left`);
  }

  getPlayer(id) {
    return this.players.get(id);
  }

  update(dt) {
    if (!this.matchStarted) return;

    this.matchTime += dt;

    // Update all players
    for (const [id, player] of this.players) {
      if (player.isLocal) {
        player.update(dt, this.input);
        this.arena.constrainPosition(player.pos);

        // Sync state
        GoldenShower.StateSync.update(player);
      } else {
        player.update(dt, null);
      }
    }

    // Update camera to follow local player
    if (this.localPlayer && this.localPlayer.alive) {
      this.camera.pos.copy(this.localPlayer.pos);
      this.camera.pos.y += 1.6;
      this.camera.yaw = this.localPlayer.yaw;
      this.camera.pitch = this.localPlayer.pitch;
    }

    this.camera.update();

    // Check time limit
    if (this.timeLimit > 0 && this.matchTime >= this.timeLimit) {
      this.endMatch(this.getWinner());
    }
  }

  render(alpha) {
    const gl = this.renderer.gl;

    this.renderer.resize();
    this.renderer.clear(0.15, 0.15, 0.2);

    const program = this.renderer.programs.player;
    gl.useProgram(program);

    // Set light direction
    const lightLoc = gl.getUniformLocation(program, 'uLightDir');
    gl.uniform3f(lightLoc, 0.5, 1.0, 0.3);

    // Draw floor
    const floorModel = new GoldenShower.Mat4();
    this.renderer.setMatrices(program, this.camera.projection, this.camera.view, floorModel);
    const floorColorLoc = gl.getUniformLocation(program, 'uPlayerColor');
    gl.uniform3f(floorColorLoc, 0.3, 0.3, 0.35);
    this.renderer.drawMesh(this.meshes.floor);

    // Draw players
    for (const [id, player] of this.players) {
      if (!player.alive) continue;
      if (player === this.localPlayer) continue; // Don't draw self in first person

      const model = new GoldenShower.Mat4();
      model.translate(player.pos.x, player.pos.y + 0.9, player.pos.z);
      model.rotateY(player.yaw);

      this.renderer.setMatrices(program, this.camera.projection, this.camera.view, model);

      const colorLoc = gl.getUniformLocation(program, 'uPlayerColor');
      gl.uniform3f(colorLoc, ...player.color);

      this.renderer.drawMesh(this.meshes.player);
    }

    // Draw HUD
    this.renderHUD();
  }

  renderHUD() {
    // HUD is drawn via HTML overlay for simplicity
    if (this.localPlayer) {
      const hud = document.getElementById('hud');
      if (hud) {
        hud.innerHTML = `
          <div class="health">HP: ${this.localPlayer.health}</div>
          <div class="ammo">${GoldenShower.Weapons[this.localPlayer.weapon].name}: ${this.localPlayer.ammo[this.localPlayer.weapon]}</div>
          <div class="score">Kills: ${this.localPlayer.kills} Deaths: ${this.localPlayer.deaths}</div>
        `;
      }
    }
  }

  startMatch() {
    this.matchStarted = true;
    this.matchTime = 0;

    // Respawn all players
    for (const [id, player] of this.players) {
      player.respawn();
    }

    console.log('[Game] Match started');
  }

  endMatch(winner) {
    this.matchStarted = false;
    console.log(`[Game] Match ended. Winner: ${winner?.name || 'Draw'}`);

    // Show results
    alert(`Match Over!\nWinner: ${winner?.name || 'Draw'}`);
  }

  getWinner() {
    let best = null;
    let bestKills = -1;

    for (const [id, player] of this.players) {
      if (player.kills > bestKills) {
        bestKills = player.kills;
        best = player;
      }
    }

    return best;
  }
};
```

## Bootstrap

```javascript
/**
 * Initialize and start the game
 */
GoldenShower.bootstrap = async function(canvasId = 'game', lobbyCode = null) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    throw new Error(`Canvas #${canvasId} not found`);
  }

  // Create game instance
  const game = new GoldenShower.Game(canvas);
  await game.init();

  // Setup networking
  if (lobbyCode) {
    const signaling = GoldenShower.Signaling.BroadcastChannel;
    GoldenShower.Network.setSignalMethod(signaling);

    const playerId = signaling.init(lobbyCode);
    GoldenShower.Network.localPlayerId = playerId;

    game.addPlayer(playerId, true);
  } else {
    // Single player / local testing
    game.addPlayer('local', true);
  }

  // Start game loop
  const loop = new GoldenShower.GameLoop(
    (dt) => game.update(dt),
    (alpha) => game.render(alpha)
  );

  loop.start();
  game.startMatch();

  console.log('[GoldenShower] Game running');
  return game;
};
```

## HTML Entry Point

```html {"noexec": true}
<!DOCTYPE html>
<html>
<head>
  <title>Golden Shower - GoldenEye Multiplayer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #111;
      overflow: hidden;
      font-family: monospace;
    }
    #game {
      width: 100vw;
      height: 100vh;
      display: block;
    }
    #hud {
      position: fixed;
      bottom: 20px;
      left: 20px;
      color: #0f0;
      font-size: 18px;
      text-shadow: 2px 2px #000;
    }
    #hud .health { color: #f00; }
    #hud .ammo { color: #ff0; }
    #hud .score { color: #0ff; margin-top: 10px; }
    #crosshair {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: #fff;
      font-size: 24px;
      pointer-events: none;
    }
    #lobby {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9);
      padding: 30px;
      border: 2px solid #gold;
      color: #fff;
      text-align: center;
    }
    #lobby input {
      padding: 10px;
      font-size: 18px;
      margin: 10px;
    }
    #lobby button {
      padding: 10px 30px;
      font-size: 18px;
      cursor: pointer;
      background: #d4af37;
      border: none;
    }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <div id="hud"></div>
  <div id="crosshair">+</div>

  <div id="lobby">
    <h1>GOLDEN SHOWER</h1>
    <p>GoldenEye Multiplayer</p>
    <p>by Konomi Systems</p>
    <br>
    <input type="text" id="lobby-code" placeholder="Lobby Code">
    <br>
    <button onclick="joinGame()">JOIN GAME</button>
    <button onclick="hostGame()">HOST GAME</button>
  </div>

  <script src="runner/markdown-runner.js"></script>
  <script>
    async function startGame(lobbyCode) {
      document.getElementById('lobby').style.display = 'none';

      // Load game from markdown docs
      await GoldenShower.runAll([
        'engine/core.md',
        'multiplayer/network.md',
        'multiplayer/game.md'
      ]);

      // Bootstrap the game
      await GoldenShower.bootstrap('game', lobbyCode);
    }

    function joinGame() {
      const code = document.getElementById('lobby-code').value.trim();
      if (code) startGame(code);
    }

    function hostGame() {
      const code = Math.random().toString(36).substr(2, 6).toUpperCase();
      document.getElementById('lobby-code').value = code;
      alert(`Share this lobby code with friends: ${code}`);
      startGame(code);
    }
  </script>
</body>
</html>
```

## Quick Start

1. Open the HTML file in a browser
2. Click "Host Game" to create a lobby
3. Share the lobby code with friends
4. Friends enter the code and click "Join Game"
5. Click the canvas to lock the mouse
6. WASD to move, mouse to look, left-click to shoot

## Controls

| Key | Action |
|-----|--------|
| W/A/S/D | Move |
| Mouse | Look |
| Left Click | Shoot |
| Space | Jump |
| 1-6 | Switch weapon |
| Tab | Scoreboard |
