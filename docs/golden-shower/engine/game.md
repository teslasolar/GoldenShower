# Game Controller

Main game class that ties everything together.

```javascript
class Game {
  constructor(canvas){
    this.canvas=canvas;
    this.renderer=new GS.Renderer(canvas);
    this.input=new GS.Input(canvas);
    this.camera=new GS.Camera();
    this.players=new Map();
    this.localPlayer=null;
    this.mode='deathmatch';this.limit=10;this.time=600;
  }
  async init(){
    this.renderer.resize();
    window.addEventListener('resize',()=>this.renderer.resize());
    this.floor=GS.Mesh.box(this.renderer.gl,50,0.2,50,[0.3,0.3,0.3]);
  }
  addPlayer(id,local=false){
    const p=new GS.Player(id,local);
    this.players.set(id,p);
    if(local)this.localPlayer=p;
    return p;
  }
  update(dt){
    if(!this.localPlayer)return;
    const p=this.localPlayer;
    this.camera.handleInput(this.input);
    const speed=5*dt;
    const fwd=this.camera.getForward();
    const right=this.camera.getRight();
    if(this.input.isDown('KeyW'))p.pos.add(fwd.clone().scale(speed));
    if(this.input.isDown('KeyS'))p.pos.add(fwd.clone().scale(-speed));
    if(this.input.isDown('KeyA'))p.pos.add(right.clone().scale(-speed));
    if(this.input.isDown('KeyD'))p.pos.add(right.clone().scale(speed));
    p.yaw=this.camera.yaw;p.pitch=this.camera.pitch;
    this.camera.pos=p.pos.clone();this.camera.pos.y+=1.7;
    this.input.update();
  }
  render(alpha){
    const gl=this.renderer.gl;
    this.camera.update(this.canvas.width/this.canvas.height);
    this.renderer.clear();
    gl.useProgram(this.renderer.prog);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.renderer.prog,'uProj'),false,this.camera.proj.m);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.renderer.prog,'uView'),false,this.camera.view.m);
    const model=new GS.Mat4();
    gl.uniformMatrix4fv(gl.getUniformLocation(this.renderer.prog,'uModel'),false,model.m);
    this.floor?.draw();
  }
  startMatch(){console.log('[Game] Match started')}
}
GS.Game=Game;
```
