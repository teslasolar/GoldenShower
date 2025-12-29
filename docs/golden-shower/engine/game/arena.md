# Game Arena

Arena with cardinal docks (N/E/S/W).

```javascript
/**
 * @udt Game.arena
 * @extends Game
 * Arena walls, docks, and collision
 */
Object.assign(GS.Game.prototype, {
  _createArena(gl) {
    const wallColor = [0.4, 0.35, 0.3];
    const dockColor = [0.3, 0.25, 0.2];
    const crateColor = [0.5, 0.35, 0.2];
    const metalColor = [0.35, 0.4, 0.45];
    const wallHeight = 3;

    // Outer walls with gaps for docks
    // North wall (gap in center for dock)
    this.walls.push({ mesh: GS.Mesh.box(gl, 22, wallHeight, 1, wallColor), pos: new GS.Vec3(-19, wallHeight/2, 30), width: 22, depth: 1 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 22, wallHeight, 1, wallColor), pos: new GS.Vec3(19, wallHeight/2, 30), width: 22, depth: 1 });
    // South wall
    this.walls.push({ mesh: GS.Mesh.box(gl, 22, wallHeight, 1, wallColor), pos: new GS.Vec3(-19, wallHeight/2, -30), width: 22, depth: 1 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 22, wallHeight, 1, wallColor), pos: new GS.Vec3(19, wallHeight/2, -30), width: 22, depth: 1 });
    // East wall
    this.walls.push({ mesh: GS.Mesh.box(gl, 1, wallHeight, 22, wallColor), pos: new GS.Vec3(30, wallHeight/2, -19), width: 1, depth: 22 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 1, wallHeight, 22, wallColor), pos: new GS.Vec3(30, wallHeight/2, 19), width: 1, depth: 22 });
    // West wall
    this.walls.push({ mesh: GS.Mesh.box(gl, 1, wallHeight, 22, wallColor), pos: new GS.Vec3(-30, wallHeight/2, -19), width: 1, depth: 22 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 1, wallHeight, 22, wallColor), pos: new GS.Vec3(-30, wallHeight/2, 19), width: 1, depth: 22 });

    // NORTH DOCK - Platform with crates
    this.walls.push({ mesh: GS.Mesh.box(gl, 16, 0.3, 10, dockColor), pos: new GS.Vec3(0, 0.15, 35), width: 16, depth: 10 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 2, 2, 2, crateColor), pos: new GS.Vec3(-5, 1, 37), width: 2, depth: 2 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 2, 2, 2, crateColor), pos: new GS.Vec3(5, 1, 38), width: 2, depth: 2 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 3, 1.5, 1, metalColor), pos: new GS.Vec3(0, 0.75, 39), width: 3, depth: 1 });

    // SOUTH DOCK - Cargo area
    this.walls.push({ mesh: GS.Mesh.box(gl, 16, 0.3, 10, dockColor), pos: new GS.Vec3(0, 0.15, -35), width: 16, depth: 10 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 3, 2.5, 3, crateColor), pos: new GS.Vec3(-4, 1.25, -36), width: 3, depth: 3 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 2, 1.5, 2, crateColor), pos: new GS.Vec3(4, 0.75, -37), width: 2, depth: 2 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 1, 3, 8, metalColor), pos: new GS.Vec3(7, 1.5, -35), width: 1, depth: 8 });

    // EAST DOCK - Industrial
    this.walls.push({ mesh: GS.Mesh.box(gl, 10, 0.3, 16, dockColor), pos: new GS.Vec3(35, 0.15, 0), width: 10, depth: 16 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 2, 3, 2, metalColor), pos: new GS.Vec3(37, 1.5, -5), width: 2, depth: 2 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 2, 3, 2, metalColor), pos: new GS.Vec3(37, 1.5, 5), width: 2, depth: 2 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 4, 1, 6, crateColor), pos: new GS.Vec3(38, 0.5, 0), width: 4, depth: 6 });

    // WEST DOCK - Storage
    this.walls.push({ mesh: GS.Mesh.box(gl, 10, 0.3, 16, dockColor), pos: new GS.Vec3(-35, 0.15, 0), width: 10, depth: 16 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 2, 2, 2, crateColor), pos: new GS.Vec3(-36, 1, -4), width: 2, depth: 2 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 2, 2, 2, crateColor), pos: new GS.Vec3(-38, 1, -4), width: 2, depth: 2 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 2, 2, 2, crateColor), pos: new GS.Vec3(-37, 3, -4), width: 2, depth: 2 });
    this.walls.push({ mesh: GS.Mesh.box(gl, 3, 1.5, 4, crateColor), pos: new GS.Vec3(-37, 0.75, 4), width: 3, depth: 4 });

    // Central pillar
    this.walls.push({ mesh: GS.Mesh.box(gl, 6, wallHeight, 6, [0.5, 0.4, 0.35]), pos: new GS.Vec3(0, wallHeight/2, 0), width: 6, depth: 6 });

    // Corner pillars
    const cornerColor = [0.45, 0.4, 0.35];
    [[-18, -18], [18, -18], [-18, 18], [18, 18]].forEach(([x, z]) => {
      this.walls.push({ mesh: GS.Mesh.box(gl, 4, wallHeight, 4, cornerColor), pos: new GS.Vec3(x, wallHeight/2, z), width: 4, depth: 4 });
    });

    // Inner cover walls
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
