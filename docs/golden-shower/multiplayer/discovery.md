# Lobby Discovery

Find and list available game lobbies.

```javascript
class LobbyDiscovery {
  constructor(){
    this.lobbies=new Map();
    this.channel=new BroadcastChannel('gs-discovery');
    this.events={};
    this.channel.onmessage=e=>this._handleMsg(e.data);
    this._cleanupInterval=setInterval(()=>this._cleanup(),3000);
  }
  on(e,fn){(this.events[e]=this.events[e]||[]).push(fn)}
  emit(e,d){(this.events[e]||[]).forEach(fn=>fn(d))}
  _handleMsg(msg){
    if(msg.type==='advertise'){
      this.lobbies.set(msg.code,{code:msg.code,count:msg.count,max:msg.max,host:msg.host,t:Date.now()});
      this.emit('update',this.getLobbies());
    }else if(msg.type==='close'){
      this.lobbies.delete(msg.code);
      this.emit('update',this.getLobbies());
    }
  }
  _cleanup(){
    const now=Date.now();let changed=false;
    for(const[code,l]of this.lobbies){
      if(now-l.t>5000){this.lobbies.delete(code);changed=true}
    }
    if(changed)this.emit('update',this.getLobbies());
  }
  getLobbies(){return Array.from(this.lobbies.values())}
  stop(){clearInterval(this._cleanupInterval);this.channel.close()}
  static advertise(code,count,max,host){
    new BroadcastChannel('gs-discovery').postMessage({type:'advertise',code,count,max,host});
  }
  static close(code){
    new BroadcastChannel('gs-discovery').postMessage({type:'close',code});
  }
}
GS.LobbyDiscovery=LobbyDiscovery;
```
