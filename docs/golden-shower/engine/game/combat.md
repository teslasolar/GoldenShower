# Game Combat

Shooting and damage.

```javascript
/**
 * @udt Game.combat
 * @extends Game
 * Shooting and damage handling
 */
Object.assign(GS.Game.prototype, {
  shoot() {
    const p = this.localPlayer;
    if (!p || !p.alive || this.shootCooldown > 0 || this.chatOpen) return;
    const weapons = GS.Weapons || [{ dmg: 25, rate: 300, range: 50 }];
    const weapon = weapons[p.weapon] || weapons[0];
    if (p.weapon !== 0 && p.ammo[p.weapon] <= 0) return;
    if (p.weapon !== 0) p.ammo[p.weapon]--;
    this.shootCooldown = (weapon.rate || 300) / 1000;
    const origin = p.pos.clone(); origin.y += 1.7;
    const dir = new GS.Vec3(Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), Math.cos(p.yaw) * Math.cos(p.pitch));
    for (const [id, target] of this.players) {
      if (id === p.id || !target.alive) continue;
      if (this._rayHitPlayer(origin, dir, target, weapon.range || 50)) {
        if (this.network) this.network.send('hit', { target: id, from: p.id, damage: weapon.dmg || 25, weapon: p.weapon });
        this.hitMarkerTime = 0.3;
        break;
      }
    }
    if (this.network) this.network.send('shot', { shooter: p.id, x: origin.x, y: origin.y, z: origin.z, dx: dir.x, dy: dir.y, dz: dir.z, weapon: p.weapon });
  },

  _rayHitPlayer(origin, dir, player, range) {
    const toPlayer = player.pos.clone().sub(origin); toPlayer.y += 0.9;
    const dist = Math.sqrt(toPlayer.x * toPlayer.x + toPlayer.z * toPlayer.z);
    if (dist > range) return false;
    const t = toPlayer.x * dir.x + toPlayer.y * dir.y + toPlayer.z * dir.z;
    if (t < 0) return false;
    const closest = origin.clone().add(dir.clone().scale(t));
    const dx = player.pos.x - closest.x, dz = player.pos.z - closest.z;
    return Math.sqrt(dx * dx + dz * dz) < 0.5 && Math.abs(closest.y - (player.pos.y + 0.9)) < 1.0;
  },

  _handleRemoteShot(msg) {},

  _takeDamage(damage, fromId) {
    if (!this.localPlayer?.alive) return;
    const died = this.localPlayer.takeDamage(damage, fromId);
    this.damageIndicatorTime = 0.5;
    const attacker = this.players.get(fromId);
    if (attacker) { this.damageDirection = Math.atan2(attacker.pos.x - this.localPlayer.pos.x, attacker.pos.z - this.localPlayer.pos.z); }
    if (died && this.network) {
      this.network.send('kill', { killer: fromId, victim: this.localPlayer.id, killerName: attacker?.name || 'Unknown', victimName: this.localPlayer.name });
      if (attacker) attacker.kills++;
    }
  },

  _respawn(player) { player.respawn(new GS.Vec3((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40)); this.addChat('You respawned', '#00ff00'); }
});
```
