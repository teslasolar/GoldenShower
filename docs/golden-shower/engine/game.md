# Game Controller

Main game class with full multiplayer support, chat, shooting, and arena.

```javascript
/**
 * Game - Main game controller
 * Handles rendering, input, networking, combat, and chat
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

    // Game state
    this.mode = 'deathmatch';
    this.limit = 10;
    this.time = 600;
    this.running = false;

    // Arena
    this.walls = [];
    this.floor = null;
    this.playerMesh = null;

    // Combat
    this.shootCooldown = 0;
    this.lastShootTime = 0;

    // Chat
    this.chatMessages = [];
    this.chatInput = '';
    this.chatOpen = false;
    this.maxChatMessages = 10;

    // HUD elements
    this.hitMarkerTime = 0;
    this.damageIndicatorTime = 0;
    this.damageDirection = 0;

    // Events
    this.events = {};
  }

  on(e, fn) { (this.events[e] = this.events[e] || []).push(fn); }
  emit(e, d) { (this.events[e] || []).forEach(fn => fn(d)); }

  async init() {
    this.renderer.resize();
    window.addEventListener('resize', () => this.renderer.resize());

    const gl = this.renderer.gl;

    // Create floor
    this.floor = GS.Mesh.box(gl, 60, 0.5, 60, [0.25, 0.25, 0.3]);

    // Create arena walls
    this._createArena(gl);

    // Create player mesh template
    this.playerMesh = GS.Mesh.box(gl, 0.6, 1.8, 0.6, [1, 1, 1]);

    // Setup chat input handler
    this._setupChatInput();

    // Setup shooting handler
    this.canvas.addEventListener('click', () => this.shoot());

    console.log('[Game] Initialized');
  }

  _createArena(gl) {
    const wallColor = [0.4, 0.35, 0.3];
    const wallHeight = 3;

    // Outer walls
    this.walls.push({
      mesh: GS.Mesh.box(gl, 60, wallHeight, 1, wallColor),
      pos: new GS.Vec3(0, wallHeight / 2, 30),
      width: 60, depth: 1
    });
    this.walls.push({
      mesh: GS.Mesh.box(gl, 60, wallHeight, 1, wallColor),
      pos: new GS.Vec3(0, wallHeight / 2, -30),
      width: 60, depth: 1
    });
    this.walls.push({
      mesh: GS.Mesh.box(gl, 1, wallHeight, 60, wallColor),
      pos: new GS.Vec3(30, wallHeight / 2, 0),
      width: 1, depth: 60
    });
    this.walls.push({
      mesh: GS.Mesh.box(gl, 1, wallHeight, 60, wallColor),
      pos: new GS.Vec3(-30, wallHeight / 2, 0),
      width: 1, depth: 60
    });

    // Central pillar
    this.walls.push({
      mesh: GS.Mesh.box(gl, 6, wallHeight, 6, [0.5, 0.4, 0.35]),
      pos: new GS.Vec3(0, wallHeight / 2, 0),
      width: 6, depth: 6
    });

    // Corner pillars
    const cornerColor = [0.45, 0.4, 0.35];
    [[-18, -18], [18, -18], [-18, 18], [18, 18]].forEach(([x, z]) => {
      this.walls.push({
        mesh: GS.Mesh.box(gl, 4, wallHeight, 4, cornerColor),
        pos: new GS.Vec3(x, wallHeight / 2, z),
        width: 4, depth: 4
      });
    });

    // Cover walls
    [[-12, 0], [12, 0], [0, -12], [0, 12]].forEach(([x, z]) => {
      this.walls.push({
        mesh: GS.Mesh.box(gl, 6, 1.5, 1, wallColor),
        pos: new GS.Vec3(x, 0.75, z),
        width: 6, depth: 1
      });
    });
  }

  _setupChatInput() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (this.chatOpen) {
          if (this.chatInput.trim()) {
            this.sendChat(this.chatInput);
          }
          this.chatInput = '';
          this.chatOpen = false;
        } else {
          this.chatOpen = true;
        }
        e.preventDefault();
      } else if (this.chatOpen) {
        if (e.key === 'Escape') {
          this.chatOpen = false;
          this.chatInput = '';
        } else if (e.key === 'Backspace') {
          this.chatInput = this.chatInput.slice(0, -1);
        } else if (e.key.length === 1) {
          this.chatInput += e.key;
        }
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  setNetwork(network) {
    this.network = network;

    // Listen for state updates
    network.on('state', (msg) => {
      this.stateSync.receive(msg);
      const p = this.players.get(msg.id);
      if (p && !p.local) {
        p.pos.x = msg.x;
        p.pos.y = msg.y;
        p.pos.z = msg.z;
        p.yaw = msg.yaw;
        p.pitch = msg.pitch;
        p.health = msg.health;
        p.weapon = msg.weapon;
        p.alive = msg.alive;
      }
    });

    // Listen for shots
    network.on('shot', (msg) => {
      this._handleRemoteShot(msg);
    });

    // Listen for hits
    network.on('hit', (msg) => {
      if (msg.target === this.localPlayer?.id) {
        this._takeDamage(msg.damage, msg.from);
      }
    });

    // Listen for kills
    network.on('kill', (msg) => {
      this.addChat(`${msg.killerName} killed ${msg.victimName}`, '#ff4444');
      if (msg.killer === this.localPlayer?.id) {
        this.localPlayer.kills++;
        this.hitMarkerTime = 0.5;
      }
    });

    // Listen for chat
    network.on('chat', (msg) => {
      this.addChat(`${msg.name}: ${msg.text}`, msg.color || '#ffffff');
    });
  }

  addPlayer(id, local = false) {
    const p = new GS.Player(id, local);
    // Spawn at random position
    p.pos = new GS.Vec3(
      (Math.random() - 0.5) * 40,
      0,
      (Math.random() - 0.5) * 40
    );
    // Set color based on character
    const chars = GS.Characters || [];
    if (chars[p.character]) {
      p.color = chars[p.character].color;
    } else {
      p.color = [[0.2,0.4,0.9],[0.9,0.2,0.2],[0.2,0.8,0.3],[0.9,0.9,0.2]][this.players.size % 4];
    }
    this.players.set(id, p);
    if (local) {
      this.localPlayer = p;
      this.camera.pos = p.pos.clone();
      this.camera.pos.y += 1.7;
    }
    return p;
  }

  update(dt) {
    if (!this.localPlayer) return;

    const p = this.localPlayer;

    // Skip movement input if chatting
    if (this.chatOpen) {
      this.input.update();
      return;
    }

    // Skip input if dead
    if (!p.alive) {
      p.respawnTime -= dt;
      if (p.respawnTime <= 0) {
        this._respawn(p);
      }
      this.camera.pos = p.pos.clone();
      this.camera.pos.y += 1.7;
      this.input.update();
      return;
    }

    // Camera control
    this.camera.handleInput(this.input);

    // Movement
    const speed = 8 * dt;
    const fwd = this.camera.getForward();
    const right = this.camera.getRight();

    const newPos = p.pos.clone();

    if (this.input.isDown('KeyW')) {
      newPos.add(fwd.clone().scale(speed));
    }
    if (this.input.isDown('KeyS')) {
      newPos.add(fwd.clone().scale(-speed));
    }
    if (this.input.isDown('KeyA')) {
      newPos.add(right.clone().scale(-speed));
    }
    if (this.input.isDown('KeyD')) {
      newPos.add(right.clone().scale(speed));
    }

    // Collision check
    if (!this._checkCollision(newPos)) {
      p.pos = newPos;
    }

    // Keep in bounds
    p.pos.x = Math.max(-28, Math.min(28, p.pos.x));
    p.pos.z = Math.max(-28, Math.min(28, p.pos.z));

    // Jump
    if (this.input.isDown('Space') && p.pos.y <= 0.1) {
      p.vel.y = 8;
    }

    // Gravity
    p.vel.y -= 20 * dt;
    p.pos.y += p.vel.y * dt;
    if (p.pos.y < 0) {
      p.pos.y = 0;
      p.vel.y = 0;
    }

    // Update camera position
    p.yaw = this.camera.yaw;
    p.pitch = this.camera.pitch;
    this.camera.pos = p.pos.clone();
    this.camera.pos.y += 1.7;

    // Weapon switching (1-7 keys)
    for (let i = 1; i <= 7; i++) {
      if (this.input.isDown(`Digit${i}`)) {
        p.weapon = i - 1;
      }
    }

    // Shoot cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= dt;
    }

    // HUD timers
    if (this.hitMarkerTime > 0) this.hitMarkerTime -= dt;
    if (this.damageIndicatorTime > 0) this.damageIndicatorTime -= dt;

    // Network sync
    if (this.network) {
      this.stateSync.update(p, this.network);
    }

    this.input.update();
  }

  _checkCollision(pos) {
    const playerRadius = 0.4;

    for (const wall of this.walls) {
      const halfW = (wall.width || 1) / 2 + playerRadius;
      const halfD = (wall.depth || 1) / 2 + playerRadius;

      if (Math.abs(pos.x - wall.pos.x) < halfW &&
          Math.abs(pos.z - wall.pos.z) < halfD) {
        return true;
      }
    }
    return false;
  }

  shoot() {
    const p = this.localPlayer;
    if (!p || !p.alive || this.shootCooldown > 0 || this.chatOpen) return;

    const weapons = GS.Weapons || [{ dmg: 25, rate: 300, range: 50 }];
    const weapon = weapons[p.weapon] || weapons[0];

    // Check ammo
    if (p.weapon !== 0 && p.ammo[p.weapon] <= 0) return;

    // Use ammo
    if (p.weapon !== 0) p.ammo[p.weapon]--;

    // Set cooldown
    this.shootCooldown = (weapon.rate || 300) / 1000;

    // Create shot ray
    const origin = p.pos.clone();
    origin.y += 1.7;

    const dir = new GS.Vec3(
      Math.sin(p.yaw) * Math.cos(p.pitch),
      Math.sin(p.pitch),
      Math.cos(p.yaw) * Math.cos(p.pitch)
    );

    // Check hits on other players
    for (const [id, target] of this.players) {
      if (id === p.id || !target.alive) continue;

      const hit = this._rayHitPlayer(origin, dir, target, weapon.range || 50);
      if (hit) {
        // Send hit to network
        if (this.network) {
          this.network.send('hit', {
            target: id,
            from: p.id,
            damage: weapon.dmg || 25,
            weapon: p.weapon
          });
        }
        this.hitMarkerTime = 0.3;
        break;
      }
    }

    // Broadcast shot for visual effects
    if (this.network) {
      this.network.send('shot', {
        shooter: p.id,
        x: origin.x, y: origin.y, z: origin.z,
        dx: dir.x, dy: dir.y, dz: dir.z,
        weapon: p.weapon
      });
    }
  }

  _rayHitPlayer(origin, dir, player, range) {
    const toPlayer = player.pos.clone().sub(origin);
    toPlayer.y += 0.9;

    const dist = Math.sqrt(toPlayer.x * toPlayer.x + toPlayer.z * toPlayer.z);
    if (dist > range) return false;

    const t = toPlayer.x * dir.x + toPlayer.y * dir.y + toPlayer.z * dir.z;
    if (t < 0) return false;

    const closest = origin.clone().add(dir.clone().scale(t));
    const dx = player.pos.x - closest.x;
    const dz = player.pos.z - closest.z;
    const lateralDist = Math.sqrt(dx * dx + dz * dz);

    return lateralDist < 0.5 && Math.abs(closest.y - (player.pos.y + 0.9)) < 1.0;
  }

  _handleRemoteShot(msg) {
    // Visual feedback could be added here
  }

  _takeDamage(damage, fromId) {
    if (!this.localPlayer?.alive) return;

    const died = this.localPlayer.takeDamage(damage, fromId);
    this.damageIndicatorTime = 0.5;

    const attacker = this.players.get(fromId);
    if (attacker) {
      const dx = attacker.pos.x - this.localPlayer.pos.x;
      const dz = attacker.pos.z - this.localPlayer.pos.z;
      this.damageDirection = Math.atan2(dx, dz);
    }

    if (died) {
      const killer = this.players.get(fromId);
      if (this.network) {
        this.network.send('kill', {
          killer: fromId,
          victim: this.localPlayer.id,
          killerName: killer?.name || 'Unknown',
          victimName: this.localPlayer.name
        });
      }
      if (killer) killer.kills++;
    }
  }

  _respawn(player) {
    player.respawn(new GS.Vec3(
      (Math.random() - 0.5) * 40,
      0,
      (Math.random() - 0.5) * 40
    ));
    this.addChat('You respawned', '#00ff00');
  }

  sendChat(text) {
    if (!this.network || !this.localPlayer) {
      this.addChat(`You: ${text}`, '#ffffff');
      return;
    }

    this.network.send('chat', {
      name: this.localPlayer.name,
      text: text,
      color: '#ffffff'
    });

    this.addChat(`${this.localPlayer.name}: ${text}`, '#ffffff');
  }

  addChat(text, color = '#ffffff') {
    this.chatMessages.push({ text, color, time: Date.now() });
    if (this.chatMessages.length > this.maxChatMessages) {
      this.chatMessages.shift();
    }
  }

  render(alpha) {
    const gl = this.renderer.gl;
    this.camera.update(this.canvas.width / this.canvas.height);
    this.renderer.clear();

    gl.useProgram(this.renderer.prog);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.renderer.prog, 'uProj'), false, this.camera.proj.m);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.renderer.prog, 'uView'), false, this.camera.view.m);

    // Draw floor
    const model = new GS.Mat4();
    model.translate(0, -0.25, 0);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.renderer.prog, 'uModel'), false, model.m);
    this.floor?.draw();

    // Draw walls
    for (const wall of this.walls) {
      const wallModel = new GS.Mat4();
      wallModel.translate(wall.pos.x, wall.pos.y, wall.pos.z);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.renderer.prog, 'uModel'), false, wallModel.m);
      wall.mesh.draw();
    }

    // Draw other players
    for (const [id, player] of this.players) {
      if (id === this.localPlayer?.id || !player.alive) continue;

      const pModel = new GS.Mat4();
      pModel.translate(player.pos.x, player.pos.y + 0.9, player.pos.z);
      pModel.rotateY(player.yaw);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.renderer.prog, 'uModel'), false, pModel.m);
      this.playerMesh?.draw();
    }

    this._renderHUD();
  }

  _renderHUD() {
    if (!this.localPlayer) return;

    const p = this.localPlayer;
    const weapons = GS.Weapons || [];
    const weapon = weapons[p.weapon] || { name: 'Unarmed' };

    let hudHTML = `
      <div class="health">HP: ${Math.max(0, p.health)}</div>
      <div class="ammo">${weapon.name}: ${p.weapon === 0 ? '∞' : p.ammo[p.weapon]}</div>
      <div class="score">K: ${p.kills} | D: ${p.deaths}</div>
    `;

    if (!p.alive) {
      hudHTML += `<div style="color:#ff4444;font-size:20px;margin-top:10px">DEAD - Respawning in ${Math.ceil(p.respawnTime)}s</div>`;
    }

    document.getElementById('hud').innerHTML = hudHTML;

    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
      crosshair.style.color = this.hitMarkerTime > 0 ? '#ff0000' : 'rgba(255,255,255,0.8)';
    }

    this._renderChat();
  }

  _renderChat() {
    let chatDiv = document.getElementById('game-chat');
    if (!chatDiv) {
      chatDiv = document.createElement('div');
      chatDiv.id = 'game-chat';
      chatDiv.style.cssText = `
        position:fixed;bottom:100px;left:20px;max-width:400px;
        font-size:14px;font-family:monospace;text-shadow:1px 1px 2px black;
        pointer-events:none;z-index:100;
      `;
      document.body.appendChild(chatDiv);
    }

    const now = Date.now();
    const visible = this.chatMessages.filter(m => now - m.time < 10000);

    chatDiv.innerHTML = visible.map(m =>
      `<div style="color:${m.color};margin:2px 0">${m.text}</div>`
    ).join('');

    if (this.chatOpen) {
      chatDiv.innerHTML += `
        <div style="background:rgba(0,0,0,0.7);padding:5px;margin-top:5px">
          <span style="color:#888">Say:</span>
          <span style="color:#fff">${this.chatInput}_</span>
        </div>
      `;
    }
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

## Weapons Definition

```javascript
GS.Weapons = [
  { id: 0, name: 'Unarmed', dmg: 10, rate: 500, range: 2 },
  { id: 1, name: 'PP7', dmg: 25, rate: 300, range: 50 },
  { id: 2, name: 'KF7 Soviet', dmg: 15, rate: 100, range: 40, auto: true },
  { id: 3, name: 'Shotgun', dmg: 80, rate: 800, range: 15 },
  { id: 4, name: 'Sniper', dmg: 80, rate: 1500, range: 100 },
  { id: 5, name: 'Rocket', dmg: 150, rate: 2000, range: 50 },
  { id: 6, name: 'Golden Gun', dmg: 1000, rate: 1000, range: 50 }
];
```
