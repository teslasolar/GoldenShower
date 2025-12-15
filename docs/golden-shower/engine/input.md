# Input Handler

```javascript
class Input {
  constructor(el){
    this.keys={};this.mouse={x:0,y:0,dx:0,dy:0,left:false,right:false};
    this.locked=false;
    document.addEventListener('keydown',e=>this.keys[e.code]=true);
    document.addEventListener('keyup',e=>this.keys[e.code]=false);
    el.addEventListener('click',()=>el.requestPointerLock?.());
    document.addEventListener('pointerlockchange',()=>{
      this.locked=document.pointerLockElement===el;
    });
    document.addEventListener('mousemove',e=>{
      if(this.locked){this.mouse.dx+=e.movementX;this.mouse.dy+=e.movementY}
    });
    el.addEventListener('mousedown',e=>{
      if(e.button===0)this.mouse.left=true;
      if(e.button===2)this.mouse.right=true;
    });
    el.addEventListener('mouseup',e=>{
      if(e.button===0)this.mouse.left=false;
      if(e.button===2)this.mouse.right=false;
    });
    el.addEventListener('contextmenu',e=>e.preventDefault());
  }
  update(){
    this.mouse.dx=0;this.mouse.dy=0;
  }
  isDown(k){return!!this.keys[k]}
}
GS.Input=Input;
```
