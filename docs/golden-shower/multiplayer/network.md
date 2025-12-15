# Network Core

BroadcastChannel-based networking for same-origin multiplayer.

```javascript
class Network {
  constructor(){
    this.peers=new Map();this.channel=null;
    this.localId=null;this.events={};
  }
  on(e,fn){(this.events[e]=this.events[e]||[]).push(fn)}
  emit(e,d){(this.events[e]||[]).forEach(fn=>fn(d))}
  init(code){
    this.channel=new BroadcastChannel('gs-'+code);
    this.localId=Math.random().toString(36).substr(2,8);
    this.channel.onmessage=e=>this._handleMsg(e.data);
  }
  _handleMsg(msg){
    if(msg.from===this.localId)return;
    this.emit(msg.type,msg);
  }
  send(type,data){
    if(!this.channel)return;
    this.channel.postMessage({type,from:this.localId,...data});
  }
  broadcast(type,data){this.send(type,data)}
  close(){if(this.channel)this.channel.close()}
}
GS.Network=Network;
```
