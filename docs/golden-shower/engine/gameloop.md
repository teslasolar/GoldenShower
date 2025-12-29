# Fixed Timestep Game Loop

```javascript
class GameLoop {
  constructor(update,render){
    this.update=update;this.render=render;
    this.dt=1/60;this.acc=0;this.last=0;
    this.running=false;this.fps=0;this.frames=0;
    this.fpsTime=0;
  }
  start(){
    this.running=true;this.last=performance.now();
    this._loop();
  }
  stop(){this.running=false}
  _loop(){
    if(!this.running)return;
    const now=performance.now();
    const frame=(now-this.last)/1000;
    this.last=now;this.acc+=frame;
    this.frames++;this.fpsTime+=frame;
    if(this.fpsTime>=1){
      this.fps=this.frames;this.frames=0;this.fpsTime=0;
    }
    while(this.acc>=this.dt){
      this.update(this.dt);this.acc-=this.dt;
    }
    this.render(this.acc/this.dt);
    requestAnimationFrame(()=>this._loop());
  }
}
GS.GameLoop=GameLoop;
```
