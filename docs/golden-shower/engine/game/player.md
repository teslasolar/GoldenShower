# Game Player

Player management.

```javascript
/**
 * @udt Game.player
 * @extends Game
 * Add players and network setup
 */
Object.assign(GS.Game.prototype, {
  addPlayer(id, local = false) {
    const p = new GS.Player(id, local);
    p.pos = new GS.Vec3((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40);
    const chars = GS.Characters || [];
    if (chars[p.character]) { p.color = chars[p.character].color; }
    else { p.color = [[0.2,0.4,0.9],[0.9,0.2,0.2],[0.2,0.8,0.3],[0.9,0.9,0.2]][this.players.size % 4]; }
    this.players.set(id, p);
    if (local) {
      this.localPlayer = p;
      this.camera.pos = p.pos.clone();
      this.camera.pos.y += 1.7;
    }
    return p;
  },

  setNetwork(network) {
    this.network = network;
    network.on('state', (msg) => {
      this.stateSync.receive(msg);
      const p = this.players.get(msg.id);
      if (p && !p.local) {
        p.pos.x = msg.x; p.pos.y = msg.y; p.pos.z = msg.z;
        p.yaw = msg.yaw; p.pitch = msg.pitch; p.health = msg.health;
        p.weapon = msg.weapon; p.alive = msg.alive;
      }
    });
    network.on('shot', (msg) => this._handleRemoteShot(msg));
    network.on('hit', (msg) => { if (msg.target === this.localPlayer?.id) this._takeDamage(msg.damage, msg.from); });
    network.on('kill', (msg) => {
      this.addChat(`${msg.killerName} killed ${msg.victimName}`, '#ff4444');
      if (msg.killer === this.localPlayer?.id) { this.localPlayer.kills++; this.hitMarkerTime = 0.5; }
    });
    network.on('chat', (msg) => this.addChat(`${msg.name}: ${msg.text}`, msg.color || '#ffffff'));
  }
});
```
