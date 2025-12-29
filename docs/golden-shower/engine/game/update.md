# Game Update

Main update loop.

```javascript
/**
 * @udt Game.update
 * @extends Game
 * Update loop with input handling
 */
Object.assign(GS.Game.prototype, {
  update(dt) {
    if (!this.localPlayer) return;
    const p = this.localPlayer;

    if (this.chatOpen) { this.input.update(); return; }

    if (!p.alive) {
      p.respawnTime -= dt;
      if (p.respawnTime <= 0) this._respawnAtPoint(p);
      this.camera.pos = p.pos.clone();
      this.camera.pos.y += 1.7;
      this.input.update();
      return;
    }

    this.camera.handleInput(this.input);
    const speed = 8 * dt;
    const fwd = this.camera.getForward();
    const right = this.camera.getRight();
    const newPos = p.pos.clone();

    if (this.input.isDown('KeyW')) newPos.add(fwd.clone().scale(speed));
    if (this.input.isDown('KeyS')) newPos.add(fwd.clone().scale(-speed));
    if (this.input.isDown('KeyA')) newPos.add(right.clone().scale(-speed));
    if (this.input.isDown('KeyD')) newPos.add(right.clone().scale(speed));

    if (!this._checkCollision(newPos)) p.pos = newPos;
    // Expanded bounds for dock areas
    p.pos.x = Math.max(-42, Math.min(42, p.pos.x));
    p.pos.z = Math.max(-42, Math.min(42, p.pos.z));

    if (this.input.isDown('Space') && p.pos.y <= 0.1) p.vel.y = 8;
    p.vel.y -= 20 * dt;
    p.pos.y += p.vel.y * dt;
    if (p.pos.y < 0) { p.pos.y = 0; p.vel.y = 0; }

    p.yaw = this.camera.yaw;
    p.pitch = this.camera.pitch;
    this.camera.pos = p.pos.clone();
    this.camera.pos.y += 1.7;

    for (let i = 1; i <= 7; i++) { if (this.input.isDown(`Digit${i}`)) p.weapon = i - 1; }
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.hitMarkerTime > 0) this.hitMarkerTime -= dt;
    if (this.damageIndicatorTime > 0) this.damageIndicatorTime -= dt;

    // Update pickups
    this._updatePickups(dt);

    if (this.network) this.stateSync.update(p, this.network);
    this.input.update();
  }
});
```
