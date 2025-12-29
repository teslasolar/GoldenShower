# 🔫 GOLDEN SHOWER 🔫
## GoldenEye 007 Multiplayer Reconstruction
### by Konomi Systems

```
   ╔═══════════════════════════════════════════════════════════╗
   ║  ██████╗  ██████╗ ██╗     ██████╗ ███████╗███╗   ██╗     ║
   ║ ██╔════╝ ██╔═══██╗██║     ██╔══██╗██╔════╝████╗  ██║     ║
   ║ ██║  ███╗██║   ██║██║     ██║  ██║█████╗  ██╔██╗ ██║     ║
   ║ ██║   ██║██║   ██║██║     ██║  ██║██╔══╝  ██║╚██╗██║     ║
   ║ ╚██████╔╝╚██████╔╝███████╗██████╔╝███████╗██║ ╚████║     ║
   ║  ╚═════╝  ╚═════╝ ╚══════╝╚═════╝ ╚══════╝╚═╝  ╚═══╝     ║
   ║           S H O W E R   //   K O N O M I                 ║
   ╚═══════════════════════════════════════════════════════════╝
```

## 📦 LEGEND
```
🔫=Game  📄=MarkdownRunner  🌐=WebRTC  🎮=Input  🖥️=WebGL
🧊=Arena  🎯=Player  💀=Kill  🔄=StateSync  📡=P2P
🧠=GameAI  ⚡=Engine  📦=Lobby  🎲=Spawn  🔺=Vec3
```

---

## 🏗️ ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    GOLDEN SHOWER STACK                      │
├─────────────────────────────────────────────────────────────┤
│  📄 MarkdownRunner    │ Parse docs → Execute code           │
│  ⚡ Engine            │ WebGL + Math + Input + Loop         │
│  🌐 Network           │ WebRTC P2P + StateSync              │
│  📦 Lobby             │ Host/Join + Settings + Ready        │
│  🔫 Game              │ Players + Weapons + Arena           │
└─────────────────────────────────────────────────────────────┘

     GitHub Pages VM ◄──── WebRTC P2P ────► GitHub Pages VM
            │                                      │
            ▼                                      ▼
    ┌──────────────┐                      ┌──────────────┐
    │ 📄 Runner    │                      │ 📄 Runner    │
    │ ⚡ Engine    │◄─────📡 Sync────────►│ ⚡ Engine    │
    │ 🎯 Player 1  │                      │ 🎯 Player 2  │
    └──────────────┘                      └──────────────┘
```

---

## 🚀 QUICK START

```bash
# 1. Clone
git clone https://github.com/user/GoldenShower
cd GoldenShower

# 2. Serve (any static server)
python -m http.server 8000
# OR
npx serve .

# 3. Open browser
open http://localhost:8000

# 4. HOST game → share code → friends JOIN → PLAY
```

---

## 📄 MARKDOWN RUNNER

### Core: Parse Docs → Execute Game
```javascript
// 📄 Reconstructs game from documentation!
GoldenShower.run = async(url) => {
  const md = await fetch(url).then(r=>r.text());
  const blocks = md.match(/```(\w+)\n([\s\S]*?)```/g);
  blocks.forEach(b => {
    const [_,lang,code] = b.match(/```(\w+)\n([\s\S]*?)```/);
    if(lang==='javascript') eval(code); // execute!
  });
};

// Load entire game from docs
await GoldenShower.runAll([
  'engine/core.md',      // ⚡ WebGL+Math
  'multiplayer/network.md', // 🌐 P2P
  'multiplayer/lobby.md',   // 📦 Matchmaking
  'multiplayer/game.md'     // 🔫 GoldenEye
]);
```

### Supported Languages
```
javascript │ Execute in sandbox
html       │ Inject into DOM
css        │ Add stylesheet
glsl       │ Store for WebGL
json       │ Parse config
```

---

## ⚡ ENGINE CORE

### 🔺 Vec3 [3D Math]
```javascript
class Vec3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
  scale(s){this.x*=s;this.y*=s;this.z*=s;return this}
  dot(v){return this.x*v.x+this.y*v.y+this.z*v.z}
  len(){return Math.sqrt(this.x**2+this.y**2+this.z**2)}
  norm(){const l=this.len();if(l>0){this.x/=l;this.y/=l;this.z/=l}return this}
  lerp(v,t){this.x+=(v.x-this.x)*t;this.y+=(v.y-this.y)*t;this.z+=(v.z-this.z)*t;return this}
  clone(){return new Vec3(this.x,this.y,this.z)}
}
```

### 🖥️ WebGL Renderer
```javascript
class Renderer {
  constructor(c){
    this.gl=c.getContext('webgl2');
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);
  }
  clear(r=.1,g=.1,b=.15){
    const gl=this.gl;
    gl.clearColor(r,g,b,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  }
  // Shaders: vertex→transform, fragment→color+lighting
}
```

### 🎮 Input Handler
```javascript
class Input {
  keys={};mouse={dx:0,dy:0,locked:false};
  constructor(c){
    onkeydown=e=>this.keys[e.code]=true;
    onkeyup=e=>this.keys[e.code]=false;
    c.onclick=()=>c.requestPointerLock();
    onmousemove=e=>{if(this.mouse.locked){this.mouse.dx+=e.movementX;this.mouse.dy+=e.movementY}};
  }
  move(){return{x:(this.keys.KeyD?1:0)-(this.keys.KeyA?1:0),z:(this.keys.KeyW?1:0)-(this.keys.KeyS?1:0)}}
}
```

### 🔄 Game Loop [Fixed Timestep]
```javascript
class GameLoop {
  constructor(update,render){this.update=update;this.render=render;this.dt=1/60;this.acc=0}
  start(){this.run=true;this.last=performance.now()/1000;requestAnimationFrame(t=>this.tick(t))}
  tick(t){
    if(!this.run)return;
    const now=t/1000,dt=Math.min(now-this.last,.1);this.last=now;
    this.acc+=dt;
    while(this.acc>=this.dt){this.update(this.dt);this.acc-=this.dt}
    this.render(this.acc/this.dt);
    requestAnimationFrame(t=>this.tick(t));
  }
}
```

---

## 🌐 NETWORK LAYER

### WebRTC P2P [No Server Needed!]
```javascript
const Network = {
  peers: new Map(),
  ice: [{urls:'stun:stun.l.google.com:19302'}],

  async connect(peerId) {
    const pc = new RTCPeerConnection({iceServers:this.ice});
    const ch = pc.createDataChannel('game',{ordered:false,maxRetransmits:0});
    ch.onmessage = e => this.handleMsg(peerId,JSON.parse(e.data));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.signal(peerId,{type:'offer',sdp:pc.localDescription});
    this.peers.set(peerId,{pc,ch});
  },

  broadcast(msg) {
    for(const[id,{ch}]of this.peers)
      if(ch.readyState==='open') ch.send(JSON.stringify(msg));
  }
};
```

### 📡 Signaling Methods
```javascript
// Method 1: BroadcastChannel (same origin/GitHub Pages)
const Signal = {
  init(lobby) {
    this.ch = new BroadcastChannel(`golden-shower-${lobby}`);
    this.id = crypto.randomUUID();
    this.ch.onmessage = e => Network.handleSignal(e.data.from,e.data.signal);
    return this.id;
  },
  send(to,signal) { this.ch.postMessage({from:this.id,to,signal}); }
};

// Method 2: WebSocket (cross-origin) - optional
// Method 3: Manual copy/paste (serverless)
```

### 🔄 State Sync [20Hz]
```javascript
const StateSync = {
  RATE: 50, // ms
  buffer: new Map(),

  send(player) {
    Network.broadcast({
      type:'state',
      id:player.id,
      x:player.pos.x, y:player.pos.y, z:player.pos.z,
      yaw:player.yaw, pitch:player.pitch,
      hp:player.health, wpn:player.weapon
    });
  },

  interpolate(id,t) {
    const buf = this.buffer.get(id);
    if(!buf||buf.length<2) return null;
    // Lerp between buffered states for smooth movement
    const a=buf[0],b=buf[1],alpha=(t-a.t)/(b.t-a.t);
    return {x:a.x+(b.x-a.x)*alpha, y:a.y+(b.y-a.y)*alpha, z:a.z+(b.z-a.z)*alpha};
  }
};
```

---

## 🔫 GAME SYSTEMS

### 🎯 Player
```javascript
class Player {
  static SPEED=5; static JUMP=8; static GRAV=-20; static SENS=0.002;
  static COLORS=[[.2,.4,.9],[.9,.2,.2],[.2,.8,.3],[.9,.9,.2]];

  constructor(id,local=false) {
    this.id=id; this.local=local;
    this.pos=new Vec3(); this.vel=new Vec3();
    this.yaw=0; this.pitch=0;
    this.hp=100; this.armor=0;
    this.weapon=1; this.ammo=[0,30,0,0,0,0,0];
    this.kills=0; this.deaths=0;
    this.alive=true; this.respawnT=0;
    this.color=Player.COLORS[id%4];
  }

  update(dt,input) {
    if(!this.alive){this.respawnT-=dt;if(this.respawnT<=0)this.respawn();return}
    if(this.local&&input) this.handleInput(dt,input);
    this.vel.y+=Player.GRAV*dt;
    this.pos.add(this.vel.clone().scale(dt));
    if(this.pos.y<0){this.pos.y=0;this.vel.y=0}
  }

  handleInput(dt,input) {
    const{dx,dy}=input.consumeMouse();
    this.yaw-=dx*Player.SENS;
    this.pitch=Math.max(-1.5,Math.min(1.5,this.pitch-dy*Player.SENS));
    const m=input.move(),fwd=new Vec3(Math.sin(this.yaw),0,Math.cos(this.yaw));
    const right=new Vec3(Math.cos(this.yaw),0,-Math.sin(this.yaw));
    const dir=fwd.scale(m.z).add(right.scale(m.x)).norm();
    this.vel.x=dir.x*Player.SPEED;this.vel.z=dir.z*Player.SPEED;
    if(input.keys.Space&&this.pos.y===0)this.vel.y=Player.JUMP;
  }

  shoot(){/*raycast→hit detection→damage*/}
  takeDamage(amt,from){this.hp-=amt;if(this.hp<=0)this.die(from)}
  die(killer){this.alive=false;this.deaths++;this.respawnT=3}
  respawn(){this.alive=true;this.hp=100;this.pos.copy(Arena.getSpawn(this.id))}
}
```

### 🔫 Weapons
```javascript
const Weapons = [
  {id:0,name:'Unarmed',dmg:10,cd:.5,range:2,spread:0},
  {id:1,name:'PP7',dmg:25,cd:.3,range:50,spread:.02},
  {id:2,name:'KF7 Soviet',dmg:15,cd:.1,range:40,spread:.05,auto:true},
  {id:3,name:'Shotgun',dmg:10,cd:.8,range:15,spread:.15,pellets:8},
  {id:4,name:'Sniper',dmg:80,cd:1.5,range:100,spread:.005,scope:true},
  {id:5,name:'Rocket',dmg:150,cd:2,range:50,blast:5},
  {id:6,name:'Golden Gun',dmg:1000,cd:1,range:50} // ONE SHOT KILL
];

const DmgMult = {head:4,chest:1,gut:.5,arm:.3,leg:.4};
```

### 🧊 Arena
```javascript
class Arena {
  constructor(size=30) {
    this.size=size;
    this.spawns=this.genSpawns();
    this.lastUsed=[-9999,-9999,-9999,-9999];
  }
  genSpawns() {
    const s=this.size*.4;
    return [
      {pos:new Vec3(-s,0,-s),ang:Math.PI/4},
      {pos:new Vec3(s,0,-s),ang:Math.PI*3/4},
      {pos:new Vec3(s,0,s),ang:-Math.PI*3/4},
      {pos:new Vec3(-s,0,s),ang:-Math.PI/4}
    ];
  }
  getSpawn(id) {
    // Pick spawn furthest from other players, not recently used
    let best=0,bestScore=-Infinity;
    for(let i=0;i<this.spawns.length;i++){
      let score=performance.now()-this.lastUsed[i];
      if(score>bestScore){bestScore=score;best=i}
    }
    this.lastUsed[best]=performance.now();
    return this.spawns[best];
  }
}
```

### 📦 Lobby System
```javascript
class Lobby {
  constructor(){this.players=new Map();this.settings={mode:'dm',score:10,time:10}}

  create() {
    this.code=Math.random().toString(36).substr(2,6).toUpperCase();
    this.isHost=true;
    this.initSignal();
    return this.code;
  }

  join(code) {
    this.code=code;
    this.isHost=false;
    this.initSignal();
  }

  initSignal() {
    this.ch=new BroadcastChannel(`gs-lobby-${this.code}`);
    this.id=crypto.randomUUID();
    this.ch.onmessage=e=>this.handleMsg(e.data);
    this.announce();
  }

  allReady(){return this.players.size>=2&&[...this.players.values()].every(p=>p.ready)}
  start(){if(this.allReady())this.broadcast({type:'start'})}
}
```

---

## 📊 GAME MODES

```
MODE_DEATHMATCH     │ First to kill limit wins
MODE_LICENSE_TO_KILL│ One-shot kills
MODE_LIVING_DAYLIGHTS│ Flag capture
MODE_GOLDEN_GUN     │ Golden Gun spawns, one-shot
```

### Characters
```javascript
const Characters = [
  {id:0,name:'James Bond',color:[.2,.2,.4],scale:1.0},
  {id:1,name:'Natalya',color:[.6,.3,.3],scale:.9},
  {id:2,name:'Trevelyan',color:[.4,.4,.2],scale:1.0},
  {id:3,name:'Oddjob',color:[.3,.3,.3],scale:.75}, // CONTROVERSIAL!
  {id:4,name:'Jaws',color:[.5,.5,.5],scale:1.2},
  {id:5,name:'Baron Samedi',color:[.1,.1,.1],scale:1.0}
];
```

---

## 📁 FILE STRUCTURE

```
GoldenShower/
├── index.html                    # Root redirect
├── README.md                     # This file
└── docs/
    ├── goldeneye/               # N64 technical docs
    │   ├── multiplayer.md       # Original MP reference
    │   ├── code-patterns.md     # Reconstruction patterns
    │   └── ...
    └── golden-shower/           # KONOMI RECONSTRUCTION
        ├── index.html           # 🎮 Main entry point
        ├── README.md            # Project overview
        ├── runner/
        │   ├── markdown-runner.js  # 📄 Doc executor
        │   └── README.md
        ├── engine/
        │   └── core.md          # ⚡ WebGL+Math+Input
        └── multiplayer/
            ├── network.md       # 🌐 WebRTC P2P
            ├── lobby.md         # 📦 Matchmaking
            └── game.md          # 🔫 Game logic
```

---

## 🎮 CONTROLS

```
┌────────────────────────────────────────┐
│  W        │ Forward                    │
│  A        │ Strafe Left                │
│  S        │ Backward                   │
│  D        │ Strafe Right               │
│  Mouse    │ Look/Aim                   │
│  L-Click  │ Shoot                      │
│  Space    │ Jump                       │
│  1-6      │ Switch Weapon              │
│  Tab      │ Scoreboard                 │
│  Esc      │ Release Mouse              │
└────────────────────────────────────────┘
```

---

## 📡 MULTIPLAYER FLOW

```
1. HOST clicks [HOST]
   └─► Generates 6-char code: "ABC123"
   └─► Creates BroadcastChannel
   └─► Waits for players

2. PLAYER enters code, clicks [JOIN]
   └─► Connects to same BroadcastChannel
   └─► Appears in lobby

3. All players click [READY]
   └─► Host can click [START]

4. Countdown 3...2...1...GO!
   └─► WebRTC P2P connections established
   └─► Game begins!

5. During game:
   └─► State sync @ 20Hz
   └─► Inputs processed locally
   └─► Hits validated by shooter
   └─► First to kill limit wins!
```

---

## 🔧 PERFORMANCE TARGETS

```
📄 Markdown Parse: <100ms for all docs
⚡ Render:         60 FPS @ 1080p
🌐 Network:       <50ms latency (LAN)
🔄 State Sync:    20 updates/sec
💾 Memory:        <100MB total
📦 Load Time:     <3s cold start
```

---

## 🏁 SUCCESS METRICS

```
✓ No backend server required
✓ Runs on GitHub Pages
✓ 4-player multiplayer works
✓ <5s to join game
✓ Smooth 60fps gameplay
✓ Game reconstructed from docs
✓ Works in Chrome/Firefox/Safari
```

---

## 🔨 BUILD ORDER

```
1. 📄 MarkdownRunner  │ Parse & execute docs
2. ⚡ Engine.Math     │ Vec3, Mat4
3. ⚡ Engine.Renderer │ WebGL setup
4. ⚡ Engine.Input    │ Keyboard + Mouse
5. ⚡ Engine.Loop     │ Fixed timestep
6. 🌐 Network.P2P     │ WebRTC connections
7. 🌐 Network.Signal  │ BroadcastChannel
8. 🌐 Network.Sync    │ State interpolation
9. 📦 Lobby           │ Host/Join/Ready
10.🔫 Game.Player     │ Movement + Combat
11.🔫 Game.Weapons    │ Damage + Effects
12.🔫 Game.Arena      │ Spawns + Bounds
13.🎮 Integration     │ Wire it all together
```

---

## 🧪 TEST LOCALLY

```javascript
// Quick single-player test (press Q on menu)
async function quickPlay() {
  await GoldenShower.runAll([
    'engine/core.md',
    'multiplayer/network.md',
    'multiplayer/game.md'
  ]);
  const game = new GoldenShower.Game(canvas);
  await game.init();
  game.addPlayer('local', true);
  new GameLoop(dt=>game.update(dt), a=>game.render(a)).start();
  game.startMatch();
}
```

---

## 🌐 DEPLOY TO GITHUB PAGES

```bash
# 1. Push to GitHub
git add . && git commit -m "Golden Shower" && git push

# 2. Enable Pages
# Settings → Pages → Source: main branch → /root

# 3. Access at:
https://username.github.io/GoldenShower/
```

---

## 🎯 KONOMI SYSTEM INTEGRATION

Golden Shower can integrate with the full Konomi stack:

```javascript
// Future: AI-controlled bots using FemtoLLM
class AIBot extends Player {
  constructor(id) {
    super(id, false);
    this.brain = new FemtoLLM(); // 16-dim nano model
  }

  async think() {
    const state = this.perceive(); // see enemies, health, ammo
    const action = await this.brain.proc(JSON.stringify(state));
    this.execute(action); // move, shoot, dodge
  }
}

// Future: Distributed game servers on BlockArray
class GameServer {
  constructor() {
    this.array = new BlockArray((10,10,10)); // 1000 game instances
    this.evgpu = new eVGPU(4); // CPU-based compute
  }
}
```

---

## 📜 LICENSE

Educational reconstruction project.
Original GoldenEye 007 © 1997 Rare/Nintendo.
Reconstruction by Konomi Systems.

---

```
   ╔══════════════════════════════════════════════════════════╗
   ║                                                          ║
   ║   "For England, James?"                                  ║
   ║   "No. For me."                                          ║
   ║                                                          ║
   ║                    - GoldenEye 007                       ║
   ║                                                          ║
   ╠══════════════════════════════════════════════════════════╣
   ║          🔫 GOLDEN SHOWER by KONOMI SYSTEMS 🔫           ║
   ╚══════════════════════════════════════════════════════════╝
```

**PLAY NOW**: [Open index.html](./docs/golden-shower/index.html) | **Q** for quick test
