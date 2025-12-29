# Game Arena

Arena wall creation.

```javascript
/**
 * @udt Game.arena
 * @extends Game
 * Arena walls and collision
 */
Object.assign(GS.Game.prototype, {
  _createArena(gl) {
    const wallColor = [0.4, 0.35, 0.3];
    const wallHeight = 3;
    // Outer walls
    this.walls.push({ mesh: GS.Mesh.box(gl, 60, wallHeight, 1, wallColor), pos: new GS.Vec3(0, wallHeight / 2, 30), width: 60, depth: 1 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 60, wallHeight, 1, wallColor), pos: new GS.Vec3(0, wallHeight / 2, -30), width: 60, depth: 1 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 1, wallHeight, 60, wallColor), pos: new GS.Vec3(30, wallHeight / 2, 0), width: 1, depth: 60 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 1, wallHeight, 60, wallColor), pos: new GS.Vec3(-30, wallHeight / 2, 0), width: 1, depth: 60 });
    // Central pillar
    this.walls.push({ mesh: GS.Mesh.box(gl, 6, wallHeight, 6, [0.5, 0.4, 0.35]), pos: new GS.Vec3(0, wallHeight / 2, 0), width: 6, depth: 6 });
    // Corner pillars
    const cornerColor = [0.45, 0.4, 0.35];
    [[-18, -18], [18, -18], [-18, 18], [18, 18]].forEach(([x, z]) => {
      this.walls.push({ mesh: GS.Mesh.box(gl, 4, wallHeight, 4, cornerColor), pos: new GS.Vec3(x, wallHeight / 2, z), width: 4, depth: 4 });
    });
    // Cover walls
    [[-12, 0], [12, 0], [0, -12], [0, 12]].forEach(([x, z]) => {
      this.walls.push({ mesh: GS.Mesh.box(gl, 6, 1.5, 1, wallColor), pos: new GS.Vec3(x, 0.75, z), width: 6, depth: 1 });
    });
  },

  _checkCollision(pos) {
    const r = 0.4;
    for (const wall of this.walls) {
      const halfW = (wall.width || 1) / 2 + r;
      const halfD = (wall.depth || 1) / 2 + r;
      if (Math.abs(pos.x - wall.pos.x) < halfW && Math.abs(pos.z - wall.pos.z) < halfD) return true;
    }
    return false;
  }
});
```
