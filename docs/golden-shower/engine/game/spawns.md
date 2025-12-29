# Game Spawn Points

Player spawn point system.

```javascript
/**
 * @udt Game.spawns
 * @extends Game
 * Spawn point management
 */
Object.assign(GS.Game.prototype, {
  _initSpawns() {
    // Spawn points around the arena
    this.spawnPoints = [
      // Main arena corners
      { x: -22, z: -22 },
      { x: 22, z: -22 },
      { x: -22, z: 22 },
      { x: 22, z: 22 },
      // Near docks
      { x: 0, z: 32 },   // North dock entrance
      { x: 0, z: -32 },  // South dock entrance
      { x: 32, z: 0 },   // East dock entrance
      { x: -32, z: 0 },  // West dock entrance
      // Inner positions
      { x: -10, z: -10 },
      { x: 10, z: -10 },
      { x: -10, z: 10 },
      { x: 10, z: 10 },
      // Dock interiors
      { x: 0, z: 36 },   // North dock
      { x: 0, z: -36 },  // South dock
      { x: 36, z: 0 },   // East dock
      { x: -36, z: 0 }   // West dock
    ];
  },

  _getSpawnPoint() {
    // Find spawn furthest from enemies
    let bestSpawn = this.spawnPoints[0];
    let bestScore = -Infinity;

    for (const spawn of this.spawnPoints) {
      let minEnemyDist = Infinity;

      for (const [id, p] of this.players) {
        if (p.local || !p.alive) continue;
        const dx = spawn.x - p.pos.x;
        const dz = spawn.z - p.pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        minEnemyDist = Math.min(minEnemyDist, dist);
      }

      // Add randomness to prevent predictable spawns
      const score = minEnemyDist + Math.random() * 10;
      if (score > bestScore) {
        bestScore = score;
        bestSpawn = spawn;
      }
    }

    return new GS.Vec3(bestSpawn.x, 0, bestSpawn.z);
  },

  _respawnAtPoint(player) {
    const spawn = this._getSpawnPoint();
    player.respawn(spawn);
    this.addChat('You respawned', '#00ff00');
  }
});
```
