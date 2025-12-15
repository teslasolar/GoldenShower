# State Synchronization

20Hz state sync with interpolation buffer.

```javascript
class StateSync {
  constructor(){
    this.rate=1000/20;this.last=0;
    this.buffer=new Map();
  }
  update(player,net){
    const now=performance.now();
    if(now-this.last>=this.rate){
      net.send('state',player.getState());
      this.last=now;
    }
  }
  receive(state){
    const buf=this.buffer.get(state.id)||[];
    buf.push({t:performance.now(),s:state});
    while(buf.length>20)buf.shift();
    this.buffer.set(state.id,buf);
  }
  interpolate(id,time){
    const buf=this.buffer.get(id);
    if(!buf||buf.length<2)return null;
    const target=time-100;
    let b=null,a=null;
    for(let i=0;i<buf.length-1;i++){
      if(buf[i].t<=target&&buf[i+1].t>=target){
        b=buf[i];a=buf[i+1];break;
      }
    }
    if(!b||!a)return buf[buf.length-1].s;
    const t=(target-b.t)/(a.t-b.t);
    return{
      ...a.s,
      x:b.s.x+(a.s.x-b.s.x)*t,
      y:b.s.y+(a.s.y-b.s.y)*t,
      z:b.s.z+(a.s.z-b.s.z)*t
    };
  }
}
GS.StateSync=StateSync;
```
