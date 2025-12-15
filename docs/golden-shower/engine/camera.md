# FPS Camera

```javascript
class Camera {
  constructor(){
    this.pos=new GS.Vec3(0,1.7,0);
    this.yaw=0;this.pitch=0;
    this.proj=new GS.Mat4();this.view=new GS.Mat4();
    this.sens=0.002;
  }
  handleInput(input){
    if(!input.locked)return;
    this.yaw-=input.mouse.dx*this.sens;
    this.pitch-=input.mouse.dy*this.sens;
    this.pitch=Math.max(-Math.PI/2+0.1,Math.min(Math.PI/2-0.1,this.pitch));
  }
  getForward(){
    return new GS.Vec3(
      Math.sin(this.yaw)*Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw)*Math.cos(this.pitch)
    ).norm();
  }
  getRight(){
    return new GS.Vec3(Math.cos(this.yaw),0,Math.sin(this.yaw));
  }
  update(asp){
    this.proj.perspective(Math.PI/3,asp,0.1,1000);
    const fwd=this.getForward();
    const target=this.pos.clone().add(fwd);
    this.view.lookAt(this.pos,target,new GS.Vec3(0,1,0));
  }
}
GS.Camera=Camera;
```
