# Game Render

Rendering and HUD.

```javascript
/**
 * @udt Game.render
 * @extends Game
 * Rendering and HUD display
 */
Object.assign(GS.Game.prototype, {
  render(alpha) {
    const gl = this.renderer.gl;
    this.camera.update(this.canvas.width / this.canvas.height);
    this.renderer.clear();

    gl.useProgram(this.renderer.prog);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.renderer.prog, 'uProj'), false, this.camera.proj.m);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.renderer.prog, 'uView'), false, this.camera.view.m);

    const model = new GS.Mat4();
    model.translate(0, -0.25, 0);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.renderer.prog, 'uModel'), false, model.m);
    this.floor?.draw();

    for (const wall of this.walls) {
      const wallModel = new GS.Mat4();
      wallModel.translate(wall.pos.x, wall.pos.y, wall.pos.z);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.renderer.prog, 'uModel'), false, wallModel.m);
      wall.mesh.draw();
    }

    for (const [id, player] of this.players) {
      if (id === this.localPlayer?.id || !player.alive) continue;
      const pModel = new GS.Mat4();
      pModel.translate(player.pos.x, player.pos.y + 0.9, player.pos.z);
      pModel.rotateY(player.yaw);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.renderer.prog, 'uModel'), false, pModel.m);
      this.playerMesh?.draw();
    }

    this._renderHUD();
  },

  _renderHUD() {
    if (!this.localPlayer) return;
    const p = this.localPlayer;
    const weapons = GS.Weapons || [];
    const weapon = weapons[p.weapon] || { name: 'Unarmed' };
    let hudHTML = `<div class="health">HP: ${Math.max(0, p.health)}</div><div class="ammo">${weapon.name}: ${p.weapon === 0 ? '∞' : p.ammo[p.weapon]}</div><div class="score">K: ${p.kills} | D: ${p.deaths}</div>`;
    if (!p.alive) hudHTML += `<div style="color:#ff4444;font-size:20px;margin-top:10px">DEAD - Respawning in ${Math.ceil(p.respawnTime)}s</div>`;
    document.getElementById('hud').innerHTML = hudHTML;
    const crosshair = document.getElementById('crosshair');
    if (crosshair) crosshair.style.color = this.hitMarkerTime > 0 ? '#ff0000' : 'rgba(255,255,255,0.8)';
    this._renderChat();
  }
});
```
