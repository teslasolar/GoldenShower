# Lobby System

Host/join lobbies with ready state management.

```javascript
class Lobby {
  constructor(){
    this.code=null;this.isHost=false;this.localId=null;
    this.players=new Map();this.settings={mode:'deathmatch',limit:10,time:10,max:4};
    this.channel=null;this.events={};
  }
  on(e,fn){(this.events[e]=this.events[e]||[]).push(fn)}
  emit(e,d){(this.events[e]||[]).forEach(fn=>fn(d))}
  _genCode(){return Math.random().toString(36).substr(2,6).toUpperCase()}
  _genId(){return Math.random().toString(36).substr(2,8)}
  create(){
    this.code=this._genCode();this.isHost=true;
    this.localId=this._genId();this._initChannel();
    this._addPlayer({id:this.localId,name:'Host',ready:false,character:0});
    GS.LobbyDiscovery.advertise(this.code,1,this.settings.max,'Host');
    return this.code;
  }
  join(code){
    this.code=code.toUpperCase();this.isHost=false;
    this.localId=this._genId();this._initChannel();
    this._addPlayer({id:this.localId,name:'Player',ready:false,character:0});
    this.channel.postMessage({type:'join',player:{id:this.localId,name:'Player',ready:false,character:0}});
  }
  _initChannel(){
    this.channel=new BroadcastChannel('gs-lobby-'+this.code);
    this.channel.onmessage=e=>this._handleMsg(e.data);
  }
  _addPlayer(p){this.players.set(p.id,p);this.emit('update',this.getState())}
  _handleMsg(msg){
    if(msg.type==='join'&&this.isHost){this._addPlayer(msg.player);this._sync()}
    else if(msg.type==='sync'&&!this.isHost){
      const local=this.players.get(this.localId);this.players.clear();
      msg.players.forEach(p=>this.players.set(p.id,p));
      if(local&&!this.players.has(this.localId))this.players.set(this.localId,local);
      this.emit('update',this.getState());
    }
    else if(msg.type==='ready'){const p=this.players.get(msg.id);if(p){p.ready=msg.ready;this.emit('update',this.getState());if(this.isHost)this._sync()}}
    else if(msg.type==='char'){const p=this.players.get(msg.id);if(p){p.character=msg.char;this.emit('update',this.getState());if(this.isHost)this._sync()}}
    else if(msg.type==='start'){this.emit('game-launch',msg)}
  }
  _sync(){this.channel.postMessage({type:'sync',players:Array.from(this.players.values())})}
  setReady(ready){
    const p=this.players.get(this.localId);if(p)p.ready=ready;
    this.channel.postMessage({type:'ready',id:this.localId,ready});this.emit('update',this.getState());
  }
  setChar(char){
    const p=this.players.get(this.localId);if(p)p.character=char;
    this.channel.postMessage({type:'char',id:this.localId,char});this.emit('update',this.getState());
  }
  start(){
    if(!this.isHost)return;GS.LobbyDiscovery.close(this.code);
    this.channel.postMessage({type:'start',settings:this.settings,players:Array.from(this.players.values())});
    this.emit('game-launch',{settings:this.settings,players:Array.from(this.players.values())});
  }
  getState(){return{code:this.code,isHost:this.isHost,localId:this.localId,players:Array.from(this.players.values()),settings:this.settings}}
}
GS.Lobby=Lobby;
```
