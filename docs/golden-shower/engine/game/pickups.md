# Game Pickups

Weapon, health, and armor pickups.

```javascript
/**
 * @udt Game.pickups
 * @extends Game
 * Pickup items spawning and collection
 */
Object.assign(GS.Game.prototype, {
  _initPickups() {
    this.pickups = [];
    this.pickupMeshes = {};
    const gl = this.renderer.gl;

    // Create pickup meshes
    this.pickupMeshes.health = GS.Mesh.box(gl, 0.5, 0.5, 0.5, [1, 0.2, 0.2]);
    this.pickupMeshes.armor = GS.Mesh.box(gl, 0.5, 0.5, 0.5, [0.2, 0.4, 1]);
    this.pickupMeshes.ammo = GS.Mesh.box(gl, 0.4, 0.3, 0.4, [1, 0.8, 0.2]);
    this.pickupMeshes.weapon = GS.Mesh.box(gl, 0.6, 0.2, 0.3, [0.6, 0.6, 0.6]);

    // Spawn locations
    const spawns = [
      // Health packs
      { type: 'health', pos: [0, 0.5, 20], value: 25, respawn: 30 },
      { type: 'health', pos: [0, 0.5, -20], value: 25, respawn: 30 },
      { type: 'health', pos: [20, 0.5, 0], value: 25, respawn: 30 },
      { type: 'health', pos: [-20, 0.5, 0], value: 25, respawn: 30 },
      // Armor
      { type: 'armor', pos: [0, 0.5, 35], value: 50, respawn: 45 },
      { type: 'armor', pos: [0, 0.5, -35], value: 50, respawn: 45 },
      // Ammo crates
      { type: 'ammo', pos: [15, 0.5, 15], value: 30, respawn: 20 },
      { type: 'ammo', pos: [-15, 0.5, 15], value: 30, respawn: 20 },
      { type: 'ammo', pos: [15, 0.5, -15], value: 30, respawn: 20 },
      { type: 'ammo', pos: [-15, 0.5, -15], value: 30, respawn: 20 },
      // Weapons at docks
      { type: 'weapon', pos: [35, 0.5, 0], weapon: 2, respawn: 60 },  // East - KF7
      { type: 'weapon', pos: [-35, 0.5, 0], weapon: 3, respawn: 60 }, // West - Shotgun
      { type: 'weapon', pos: [0, 0.5, 37], weapon: 4, respawn: 60 },  // North - Sniper
      { type: 'weapon', pos: [0, 0.5, -37], weapon: 5, respawn: 90 }, // South - Rocket
      // Golden Gun (center, rare)
      { type: 'weapon', pos: [0, 1.5, 0], weapon: 6, respawn: 180 }
    ];

    spawns.forEach(s => {
      this.pickups.push({
        ...s,
        pos: new GS.Vec3(s.pos[0], s.pos[1], s.pos[2]),
        active: true,
        timer: 0,
        rotation: Math.random() * Math.PI * 2
      });
    });
  },

  _updatePickups(dt) {
    if (!this.localPlayer) return;

    for (const p of this.pickups) {
      // Respawn timer
      if (!p.active) {
        p.timer -= dt;
        if (p.timer <= 0) p.active = true;
        continue;
      }

      // Rotate pickup
      p.rotation += dt * 2;

      // Check collection
      const dx = this.localPlayer.pos.x - p.pos.x;
      const dz = this.localPlayer.pos.z - p.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 1.5 && this.localPlayer.alive) {
        if (this._collectPickup(p)) {
          p.active = false;
          p.timer = p.respawn;
          // Broadcast collection
          if (this.network) {
            this.network.send('pickup', { type: p.type, pos: [p.pos.x, p.pos.z] });
          }
        }
      }
    }
  },

  _collectPickup(p) {
    const player = this.localPlayer;
    switch (p.type) {
      case 'health':
        if (player.health >= 100) return false;
        player.health = Math.min(100, player.health + p.value);
        this.addChat(`+${p.value} Health`, '#44ff44');
        return true;
      case 'armor':
        if (player.armor >= 100) return false;
        player.armor = Math.min(100, (player.armor || 0) + p.value);
        this.addChat(`+${p.value} Armor`, '#4444ff');
        return true;
      case 'ammo':
        for (let i = 1; i < player.ammo.length; i++) {
          player.ammo[i] = Math.min(99, player.ammo[i] + p.value);
        }
        this.addChat(`+${p.value} Ammo`, '#ffff44');
        return true;
      case 'weapon':
        player.weapon = p.weapon;
        player.ammo[p.weapon] = Math.min(99, player.ammo[p.weapon] + 30);
        const wep = (GS.Weapons || [])[p.weapon];
        this.addChat(`Picked up ${wep?.name || 'weapon'}!`, '#d4af37');
        return true;
    }
    return false;
  },

  _renderPickups() {
    const gl = this.renderer.gl;
    for (const p of this.pickups) {
      if (!p.active) continue;
      const mesh = this.pickupMeshes[p.type];
      if (!mesh) continue;

      const model = new GS.Mat4();
      model.translate(p.pos.x, p.pos.y + Math.sin(p.rotation) * 0.1, p.pos.z);
      model.rotateY(p.rotation);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.renderer.prog, 'uModel'), false, model.m);
      mesh.draw();
    }
  }
});
```
