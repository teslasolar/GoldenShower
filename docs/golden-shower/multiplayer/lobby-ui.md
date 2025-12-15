# Lobby UI

Renders lobby state and handles user interactions.

```javascript
class LobbyUI {
  constructor(el){this.el=el;this.lobby=null}
  bind(lobby){
    this.lobby=lobby;
    lobby.on('update',()=>this.render());
    lobby.on('game-launch',()=>{this.el.style.display='none'});
  }
  render(){
    const L=this.lobby;if(!L)return;
    const chars=GS.Characters||[];
    const players=Array.from(L.players.values());
    const localPlayer=players.find(p=>p.id===L.localId);
    const allReady=players.length>0&&players.every(p=>p.ready);
    this.el.innerHTML=`
      <div class="lobby-panel">
        <h2>LOBBY: ${L.code}</h2>
        <div class="players-list"><h3>PLAYERS (${players.length}/${L.settings.max})</h3>
          ${players.map(p=>`<div class="player-row ${p.ready?'ready':''}">
            <span class="player-name">${p.name}</span>
            <span class="player-char">${chars[p.character]?.name||'?'}</span>
            <span class="player-status">${p.ready?'READY':'NOT READY'}</span>
          </div>`).join('')}
        </div>
        <div class="character-select"><h3>CHARACTER</h3>
          <div class="characters">${chars.map((c,i)=>
            `<button class="char-btn" data-c="${i}">${c.name}</button>`
          ).join('')}</div>
        </div>
        <div class="actions">
          <button id="readyBtn" class="btn btn-ready">${localPlayer?.ready?'UNREADY':'READY'}</button>
          ${L.isHost?`<button id="startBtn" class="btn btn-start" ${allReady?'':'disabled'}>START</button>`:''}
          <button id="leaveBtn" class="btn btn-leave">LEAVE</button>
        </div>
      </div>`;
    this._bind();
  }
  _bind(){
    const L=this.lobby;
    document.getElementById('readyBtn')?.addEventListener('click',()=>{
      const players=Array.from(L.players.values());
      const p=players.find(x=>x.id===L.localId);
      L.setReady(!p?.ready);
    });
    document.getElementById('startBtn')?.addEventListener('click',()=>L.start());
    document.getElementById('leaveBtn')?.addEventListener('click',()=>location.reload());
    document.querySelectorAll('.char-btn').forEach(b=>
      b.addEventListener('click',()=>L.setChar(parseInt(b.dataset.c)))
    );
  }
}
GS.LobbyUI=LobbyUI;
```
