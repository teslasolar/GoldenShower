/**
 * Golden Shower - Complete Game Bundle
 * by Konomi Systems
 *
 * All-in-one file for multiplayer GoldenEye
 */

(function(global) {
  'use strict';

  const GS = global.GoldenShower || {};
  global.GoldenShower = GS;

  // ==========================================
  // MATH
  // ==========================================

  class Vec3 {
    constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
    set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
    copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}
    clone(){return new Vec3(this.x,this.y,this.z)}
    add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}
    sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
    scale(s){this.x*=s;this.y*=s;this.z*=s;return this}
    dot(v){return this.x*v.x+this.y*v.y+this.z*v.z}
    cross(v){
      const x=this.y*v.z-this.z*v.y;
      const y=this.z*v.x-this.x*v.z;
      const z=this.x*v.y-this.y*v.x;
      return new Vec3(x,y,z);
    }
    length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}
    lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}
    normalize(){const l=this.length();if(l>0){this.x/=l;this.y/=l;this.z/=l}return this}
    distanceTo(v){return Math.sqrt((v.x-this.x)**2+(v.y-this.y)**2+(v.z-this.z)**2)}
    lerp(v,t){this.x+=(v.x-this.x)*t;this.y+=(v.y-this.y)*t;this.z+=(v.z-this.z)*t;return this}
    toArray(){return[this.x,this.y,this.z]}
    static fromArray(a){return new Vec3(a[0],a[1],a[2])}
  }
  GS.Vec3 = Vec3;

  class Mat4 {
    constructor(){this.elements=new Float32Array(16);this.identity()}
    identity(){
      const e=this.elements;
      e[0]=1;e[4]=0;e[8]=0;e[12]=0;
      e[1]=0;e[5]=1;e[9]=0;e[13]=0;
      e[2]=0;e[6]=0;e[10]=1;e[14]=0;
      e[3]=0;e[7]=0;e[11]=0;e[15]=1;
      return this;
    }
    perspective(fov,aspect,near,far){
      const f=1/Math.tan(fov/2),nf=1/(near-far);
      const e=this.elements;
      e[0]=f/aspect;e[1]=0;e[2]=0;e[3]=0;
      e[4]=0;e[5]=f;e[6]=0;e[7]=0;
      e[8]=0;e[9]=0;e[10]=(far+near)*nf;e[11]=-1;
      e[12]=0;e[13]=0;e[14]=2*far*near*nf;e[15]=0;
      return this;
    }
    lookAt(eye,target,up){
      const z=new Vec3(eye.x-target.x,eye.y-target.y,eye.z-target.z).normalize();
      const x=up.clone().cross(z).normalize();
      const y=z.clone().cross(x);
      const e=this.elements;
      e[0]=x.x;e[4]=x.y;e[8]=x.z;e[12]=-x.dot(eye);
      e[1]=y.x;e[5]=y.y;e[9]=y.z;e[13]=-y.dot(eye);
      e[2]=z.x;e[6]=z.y;e[10]=z.z;e[14]=-z.dot(eye);
      e[3]=0;e[7]=0;e[11]=0;e[15]=1;
      return this;
    }
    translate(x,y,z){
      const e=this.elements;
      e[12]+=e[0]*x+e[4]*y+e[8]*z;
      e[13]+=e[1]*x+e[5]*y+e[9]*z;
      e[14]+=e[2]*x+e[6]*y+e[10]*z;
      return this;
    }
    rotateY(angle){
      const c=Math.cos(angle),s=Math.sin(angle);
      const e=this.elements;
      const e0=e[0],e4=e[4],e8=e[8],e2=e[2],e6=e[6],e10=e[10];
      e[0]=e0*c+e2*s;e[4]=e4*c+e6*s;e[8]=e8*c+e10*s;
      e[2]=e2*c-e0*s;e[6]=e6*c-e4*s;e[10]=e10*c-e8*s;
      return this;
    }
  }
  GS.Mat4 = Mat4;

  // ==========================================
  // RENDERER
  // ==========================================

  class Renderer {
    constructor(canvas){
      this.canvas=canvas;
      this.gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
      if(!this.gl)throw new Error('WebGL not supported');
      this.programs={};
      this.init();
    }
    init(){
      const gl=this.gl;
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      this.programs.default=this.createProgram(VERT_SHADER,FRAG_SHADER);
    }
    createProgram(vs,fs){
      const gl=this.gl;
      const v=gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(v,vs);gl.compileShader(v);
      const f=gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(f,fs);gl.compileShader(f);
      const p=gl.createProgram();
      gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);
      return p;
    }
    resize(){
      const c=this.canvas,dpr=window.devicePixelRatio||1;
      const w=c.clientWidth*dpr,h=c.clientHeight*dpr;
      if(c.width!==w||c.height!==h){c.width=w;c.height=h;this.gl.viewport(0,0,w,h)}
    }
    clear(r=0.1,g=0.1,b=0.15){
      const gl=this.gl;
      gl.clearColor(r,g,b,1);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    }
    createMesh(verts,idxs){
      const gl=this.gl;
      const vbo=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
      const ebo=gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idxs),gl.STATIC_DRAW);
      return{vbo,ebo,count:idxs.length};
    }
    drawMesh(mesh,proj,view,model,color){
      const gl=this.gl,p=this.programs.default;
      gl.useProgram(p);
      gl.uniformMatrix4fv(gl.getUniformLocation(p,'uProj'),false,proj.elements);
      gl.uniformMatrix4fv(gl.getUniformLocation(p,'uView'),false,view.elements);
      gl.uniformMatrix4fv(gl.getUniformLocation(p,'uModel'),false,model.elements);
      gl.uniform3fv(gl.getUniformLocation(p,'uColor'),color);
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vbo);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ebo);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
      gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
    }
  }
  GS.Renderer = Renderer;

  const VERT_SHADER = `
    attribute vec3 aPos;
    attribute vec3 aNorm;
    uniform mat4 uProj,uView,uModel;
    varying vec3 vNorm;
    void main(){
      vNorm=mat3(uModel)*aNorm;
      gl_Position=uProj*uView*uModel*vec4(aPos,1.0);
    }`;
  const FRAG_SHADER = `
    precision mediump float;
    varying vec3 vNorm;
    uniform vec3 uColor;
    void main(){
      vec3 n=normalize(vNorm);
      vec3 l=normalize(vec3(0.5,1.0,0.3));
      float d=max(dot(n,l),0.0);
      gl_FragColor=vec4(uColor*(0.3+d*0.7),1.0);
    }`;

  // ==========================================
  // PRIMITIVES
  // ==========================================

  GS.Primitives = {
    box(w=1,h=1,d=1){
      const x=w/2,y=h/2,z=d/2;
      const v=[
        -x,-y,z,0,0,1, x,-y,z,0,0,1, x,y,z,0,0,1, -x,y,z,0,0,1,
        x,-y,-z,0,0,-1, -x,-y,-z,0,0,-1, -x,y,-z,0,0,-1, x,y,-z,0,0,-1,
        -x,y,z,0,1,0, x,y,z,0,1,0, x,y,-z,0,1,0, -x,y,-z,0,1,0,
        -x,-y,-z,0,-1,0, x,-y,-z,0,-1,0, x,-y,z,0,-1,0, -x,-y,z,0,-1,0,
        x,-y,z,1,0,0, x,-y,-z,1,0,0, x,y,-z,1,0,0, x,y,z,1,0,0,
        -x,-y,-z,-1,0,0, -x,-y,z,-1,0,0, -x,y,z,-1,0,0, -x,y,-z,-1,0,0
      ];
      const i=[0,1,2,0,2,3,4,5,6,4,6,7,8,9,10,8,10,11,12,13,14,12,14,15,16,17,18,16,18,19,20,21,22,20,22,23];
      return{vertices:v,indices:i};
    },
    plane(w=10,d=10){
      const x=w/2,z=d/2;
      const v=[-x,0,-z,0,1,0, x,0,-z,0,1,0, x,0,z,0,1,0, -x,0,z,0,1,0];
      const i=[0,2,1,0,3,2];
      return{vertices:v,indices:i};
    }
  };

  // ==========================================
  // INPUT
  // ==========================================

  class Input {
    constructor(canvas){
      this.canvas=canvas;
      this.keys={};
      this.mouse={dx:0,dy:0,buttons:0,locked:false};
      this._setup();
    }
    _setup(){
      window.addEventListener('keydown',e=>{this.keys[e.code]=true});
      window.addEventListener('keyup',e=>{this.keys[e.code]=false});
      this.canvas.addEventListener('click',()=>{if(!this.mouse.locked)this.canvas.requestPointerLock()});
      document.addEventListener('pointerlockchange',()=>{this.mouse.locked=document.pointerLockElement===this.canvas});
      document.addEventListener('mousemove',e=>{if(this.mouse.locked){this.mouse.dx+=e.movementX;this.mouse.dy+=e.movementY}});
      this.canvas.addEventListener('mousedown',e=>{this.mouse.buttons|=(1<<e.button)});
      this.canvas.addEventListener('mouseup',e=>{this.mouse.buttons&=~(1<<e.button)});
    }
    consumeMouseDelta(){const{dx,dy}=this.mouse;this.mouse.dx=0;this.mouse.dy=0;return{dx,dy}}
    isKey(code){return!!this.keys[code]}
    isButton(b){return!!(this.mouse.buttons&(1<<b))}
    getMovement(){
      let x=0,z=0;
      if(this.isKey('KeyW')||this.isKey('ArrowUp'))z+=1;
      if(this.isKey('KeyS')||this.isKey('ArrowDown'))z-=1;
      if(this.isKey('KeyA')||this.isKey('ArrowLeft'))x-=1;
      if(this.isKey('KeyD')||this.isKey('ArrowRight'))x+=1;
      return{x,z};
    }
  }
  GS.Input = Input;

  // ==========================================
  // CAMERA
  // ==========================================

  class Camera {
    constructor(){
      this.pos=new Vec3(0,1.6,0);
      this.yaw=0;this.pitch=0;
      this.proj=new Mat4();
      this.view=new Mat4();
      this.fov=Math.PI/3;
    }
    setAspect(a){this.proj.perspective(this.fov,a,0.1,100)}
    update(){
      const t=new Vec3(
        this.pos.x+Math.sin(this.yaw)*Math.cos(this.pitch),
        this.pos.y+Math.sin(this.pitch),
        this.pos.z+Math.cos(this.yaw)*Math.cos(this.pitch)
      );
      this.view.lookAt(this.pos,t,new Vec3(0,1,0));
    }
  }
  GS.Camera = Camera;

  // ==========================================
  // GAME LOOP
  // ==========================================

  class GameLoop {
    constructor(update,render){this.update=update;this.render=render;this.running=false;this.dt=1/60;this.acc=0}
    start(){this.running=true;this.last=performance.now()/1000;requestAnimationFrame(t=>this.tick(t))}
    stop(){this.running=false}
    tick(t){
      if(!this.running)return;
      const now=t/1000,dt=Math.min(now-this.last,0.1);
      this.last=now;this.acc+=dt;
      while(this.acc>=this.dt){this.update(this.dt);this.acc-=this.dt}
      this.render(this.acc/this.dt);
      requestAnimationFrame(t=>this.tick(t));
    }
  }
  GS.GameLoop = GameLoop;

  // ==========================================
  // WEAPONS
  // ==========================================

  GS.Weapons = [
    {id:0,name:'Unarmed',dmg:10,cd:0.5,range:2},
    {id:1,name:'PP7',dmg:25,cd:0.3,range:50},
    {id:2,name:'KF7 Soviet',dmg:15,cd:0.1,range:40},
    {id:3,name:'Shotgun',dmg:80,cd:0.8,range:15},
    {id:4,name:'Sniper',dmg:80,cd:1.5,range:100},
    {id:5,name:'Rocket',dmg:150,cd:2,range:50},
    {id:6,name:'Golden Gun',dmg:1000,cd:1,range:50}
  ];

  GS.Characters = [
    {id:0,name:'James Bond',color:[0.2,0.2,0.4]},
    {id:1,name:'Natalya',color:[0.6,0.3,0.3]},
    {id:2,name:'Trevelyan',color:[0.4,0.4,0.2]},
    {id:3,name:'Oddjob',color:[0.3,0.3,0.3]},
    {id:4,name:'Jaws',color:[0.5,0.5,0.5]},
    {id:5,name:'Baron Samedi',color:[0.1,0.1,0.1]}
  ];

  // ==========================================
  // PLAYER
  // ==========================================

  class Player {
    static SPEED=5;static JUMP=8;static GRAV=-20;static SENS=0.002;
    static COLORS=[[0.2,0.4,0.9],[0.9,0.2,0.2],[0.2,0.8,0.3],[0.9,0.9,0.2]];

    constructor(id,local=false){
      this.id=id;this.local=local;
      this.pos=new Vec3();this.vel=new Vec3();
      this.yaw=0;this.pitch=0;
      this.health=100;this.maxHealth=100;
      this.weapon=1;this.ammo=[0,30,60,8,5,3,1];
      this.weaponCooldown=0;
      this.kills=0;this.deaths=0;
      this.alive=true;this.respawnTimer=0;this.invincibleTimer=0;
      this.color=Player.COLORS[id%4]||[0.5,0.5,0.5];
      this.name='Player'+(id+1);
      this.targetPos=this.pos.clone();this.targetYaw=0;
    }

    update(dt,input){
      if(!this.alive){this.respawnTimer-=dt;if(this.respawnTimer<=0)this.respawn();return}
      if(this.local&&input)this.handleInput(dt,input);
      else this.interpolate(dt);
      this.vel.y+=Player.GRAV*dt;
      this.pos.add(this.vel.clone().scale(dt));
      if(this.pos.y<0){this.pos.y=0;this.vel.y=0}
      if(this.weaponCooldown>0)this.weaponCooldown-=dt;
      if(this.invincibleTimer>0)this.invincibleTimer-=dt;
    }

    handleInput(dt,input){
      const{dx,dy}=input.consumeMouseDelta();
      this.yaw-=dx*Player.SENS;
      this.pitch=Math.max(-1.5,Math.min(1.5,this.pitch-dy*Player.SENS));
      const m=input.getMovement();
      if(m.x!==0||m.z!==0){
        const fwd=new Vec3(Math.sin(this.yaw),0,Math.cos(this.yaw));
        const right=new Vec3(Math.cos(this.yaw),0,-Math.sin(this.yaw));
        const dir=fwd.scale(m.z).add(right.scale(m.x)).normalize();
        this.vel.x=dir.x*Player.SPEED;this.vel.z=dir.z*Player.SPEED;
      }else{this.vel.x*=0.9;this.vel.z*=0.9}
      if(input.isKey('Space')&&this.pos.y===0)this.vel.y=Player.JUMP;
    }

    interpolate(dt){this.pos.lerp(this.targetPos,0.2);this.yaw+=(this.targetYaw-this.yaw)*0.2}

    setRemoteState(s){
      this.targetPos.set(s.x,s.y,s.z);
      this.targetYaw=s.yaw;this.pitch=s.pitch;
      this.health=s.health;this.weapon=s.weapon;this.alive=s.alive;
    }

    shoot(){
      if(this.weaponCooldown>0)return null;
      if(this.ammo[this.weapon]<=0&&this.weapon!==0)return null;
      this.weaponCooldown=GS.Weapons[this.weapon].cd;
      if(this.weapon!==0)this.ammo[this.weapon]--;
      return{
        origin:this.pos.clone().add(new Vec3(0,1.5,0)),
        dir:new Vec3(Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),Math.cos(this.yaw)*Math.cos(this.pitch)),
        weapon:this.weapon,shooter:this.id
      };
    }

    takeDamage(amt,from){
      if(this.invincibleTimer>0)return false;
      this.health-=amt;
      if(this.health<=0){this.die(from);return true}
      return false;
    }

    die(killerId){this.alive=false;this.deaths++;this.respawnTimer=3}

    respawn(){
      this.alive=true;this.health=this.maxHealth;this.invincibleTimer=2;
      this.pos.set((Math.random()-0.5)*15,0,(Math.random()-0.5)*15);
      this.weapon=1;this.ammo=[0,30,60,8,5,3,1];
    }

    getState(){
      return{id:this.id,x:this.pos.x,y:this.pos.y,z:this.pos.z,yaw:this.yaw,pitch:this.pitch,
        health:this.health,weapon:this.weapon,alive:this.alive,kills:this.kills,deaths:this.deaths};
    }
  }
  GS.Player = Player;

  // ==========================================
  // NETWORK
  // ==========================================

  GS.Network = {
    peers: new Map(),
    localId: null,
    events: {},

    on(e,fn){(this.events[e]=this.events[e]||[]).push(fn)},
    emit(e,d){(this.events[e]||[]).forEach(fn=>fn(d))},

    broadcast(msg){
      for(const[id,{ch}]of this.peers){
        if(ch&&ch.readyState==='open')ch.send(JSON.stringify(msg));
      }
    },

    sendState(state){this.broadcast({type:'state',state})},
    sendEvent(event){this.broadcast({type:'event',event})}
  };

  // ==========================================
  // LOBBY
  // ==========================================

  class Lobby {
    constructor(){
      this.code=null;
      this.players=new Map();
      this.isHost=false;
      this.localId=null;
      this.settings={gameMode:'deathmatch',scoreLimit:10,timeLimit:10,maxPlayers:4};
      this.channel=null;
      this.events={};
    }

    on(e,fn){(this.events[e]=this.events[e]||[]).push(fn)}
    emit(e,d){(this.events[e]||[]).forEach(fn=>fn(d))}

    create(){
      this.code=this._genCode();
      this.isHost=true;
      this.localId=this._genId();
      this._initChannel();
      this._addPlayer({id:this.localId,name:'Host',ready:false,character:0});
      console.log('[Lobby] Created:',this.code);
      return this.code;
    }

    join(code){
      this.code=code.toUpperCase();
      this.isHost=false;
      this.localId=this._genId();
      this._initChannel();
      // Add self to players (will get synced with host's list)
      this._addPlayer({id:this.localId,name:'Player',ready:false,character:0});
      console.log('[Lobby] Joining:',this.code);
      return this.localId;
    }

    _genCode(){
      const c='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let s='';for(let i=0;i<6;i++)s+=c[Math.floor(Math.random()*c.length)];
      return s;
    }

    _genId(){return Math.random().toString(36).substr(2,9)}

    _initChannel(){
      this.channel=new BroadcastChannel('golden-shower-'+this.code);
      this.channel.onmessage=e=>this._handleMsg(e.data);
      // Announce self
      setTimeout(()=>{
        this._broadcast({type:'join',player:{id:this.localId,name:this.isHost?'Host':'Player',ready:false,character:0}});
      },100);
    }

    _broadcast(msg){
      msg.from=this.localId;
      this.channel.postMessage(msg);
    }

    _handleMsg(msg){
      if(msg.from===this.localId)return;
      console.log('[Lobby] Received:',msg.type,msg);

      switch(msg.type){
        case 'join':
          this._addPlayer(msg.player);
          // Host sends full state to new player
          if(this.isHost){
            this._broadcast({type:'sync',players:Array.from(this.players.values()),settings:this.settings});
          }
          break;
        case 'sync':
          if(!this.isHost){
            // Save local player state
            const localP=this.players.get(this.localId);
            this.players.clear();
            msg.players.forEach(p=>this.players.set(p.id,p));
            // Ensure local player is in the list
            if(localP&&!this.players.has(this.localId)){
              this.players.set(this.localId,localP);
            }
            this.settings=msg.settings;
            this.emit('update');
          }
          break;
        case 'ready':
          const p=this.players.get(msg.playerId);
          if(p){p.ready=msg.ready;this.emit('update')}
          break;
        case 'character':
          const pc=this.players.get(msg.playerId);
          if(pc){pc.character=msg.character;this.emit('update')}
          break;
        case 'leave':
          this.players.delete(msg.playerId);
          this.emit('update');
          break;
        case 'start':
          this._startCountdown();
          break;
      }
    }

    _addPlayer(p){
      if(this.players.size>=this.settings.maxPlayers)return;
      this.players.set(p.id,p);
      this.emit('update');
      console.log('[Lobby] Player added:',p.name);
    }

    toggleReady(){
      const p=this.players.get(this.localId);
      if(p){
        p.ready=!p.ready;
        this._broadcast({type:'ready',playerId:this.localId,ready:p.ready});
        this.emit('update');
      }
    }

    setCharacter(charId){
      const p=this.players.get(this.localId);
      if(p){
        p.character=charId;
        this._broadcast({type:'character',playerId:this.localId,character:charId});
        this.emit('update');
      }
    }

    allReady(){
      if(this.players.size<2)return false;
      for(const[id,p]of this.players)if(!p.ready)return false;
      return true;
    }

    startGame(){
      if(!this.isHost||!this.allReady())return;
      this._broadcast({type:'start'});
      this._startCountdown();
    }

    _startCountdown(){
      let count=3;
      this.emit('countdown',count);
      const tick=()=>{
        count--;
        if(count>0){
          this.emit('countdown',count);
          setTimeout(tick,1000);
        }else{
          this.emit('countdown',0);
          setTimeout(()=>{
            this.emit('game-launch',{players:Array.from(this.players.values()),settings:this.settings});
          },500);
        }
      };
      setTimeout(tick,1000);
    }

    leave(){
      this._broadcast({type:'leave',playerId:this.localId});
      if(this.channel)this.channel.close();
    }
  }
  GS.Lobby = Lobby;

  // ==========================================
  // LOBBY UI
  // ==========================================

  class LobbyUI {
    constructor(container){this.container=container;this.lobby=null}

    bind(lobby){
      this.lobby=lobby;
      lobby.on('update',()=>this.render());
      lobby.on('countdown',n=>this.showCountdown(n));
      lobby.on('game-launch',()=>{this.container.style.display='none'});
    }

    render(){
      const L=this.lobby;
      if(!L)return;
      const players=Array.from(L.players.values());
      const localPlayer=L.players.get(L.localId);

      this.container.innerHTML=`
        <div class="lobby-panel">
          <h2>LOBBY: ${L.code}</h2>
          <div class="players-list">
            <h3>PLAYERS (${players.length}/${L.settings.maxPlayers})</h3>
            ${players.map(p=>`
              <div class="player-row ${p.ready?'ready':''}">
                <span class="player-name">${p.name}${p.id===L.localId?' (You)':''}</span>
                <span class="player-char">${GS.Characters[p.character]?.name||'Bond'}</span>
                <span class="player-status">${p.ready?'READY':'NOT READY'}</span>
              </div>
            `).join('')}
          </div>
          <div class="characters">
            <h3>SELECT CHARACTER</h3>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
              ${GS.Characters.map((c,i)=>`
                <button class="char-btn" data-char="${i}" style="${localPlayer?.character===i?'border-color:#d4af37;color:#fff':''}">${c.name}</button>
              `).join('')}
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-ready" id="readyBtn">${localPlayer?.ready?'NOT READY':'READY'}</button>
            ${L.isHost?`<button class="btn btn-start" id="startBtn" ${L.allReady()?'':'disabled'}>START</button>`:''}
            <button class="btn btn-leave" id="leaveBtn">LEAVE</button>
          </div>
        </div>
      `;
      this._attachEvents();
    }

    _attachEvents(){
      const L=this.lobby;
      document.getElementById('readyBtn')?.addEventListener('click',()=>L.toggleReady());
      document.getElementById('startBtn')?.addEventListener('click',()=>L.startGame());
      document.getElementById('leaveBtn')?.addEventListener('click',()=>{L.leave();location.reload()});
      document.querySelectorAll('.char-btn').forEach(btn=>{
        btn.addEventListener('click',()=>L.setCharacter(parseInt(btn.dataset.char)));
      });
    }

    showCountdown(n){
      this.container.innerHTML=`<div class="countdown"><h1>${n>0?n:'GO!'}</h1></div>`;
    }
  }
  GS.LobbyUI = LobbyUI;

  // ==========================================
  // ARENA
  // ==========================================

  class Arena {
    constructor(size=20){
      this.size=size;
      this.spawns=[];
      const s=size*0.4;
      this.spawns=[
        {pos:new Vec3(-s,0,-s),angle:Math.PI/4},
        {pos:new Vec3(s,0,-s),angle:Math.PI*3/4},
        {pos:new Vec3(s,0,s),angle:-Math.PI*3/4},
        {pos:new Vec3(-s,0,s),angle:-Math.PI/4}
      ];
    }
    getSpawn(idx){return this.spawns[idx%this.spawns.length]}
    constrain(pos){
      const s=this.size/2-0.5;
      pos.x=Math.max(-s,Math.min(s,pos.x));
      pos.z=Math.max(-s,Math.min(s,pos.z));
    }
  }
  GS.Arena = Arena;

  // ==========================================
  // GAME
  // ==========================================

  class Game {
    constructor(canvas){
      this.canvas=canvas;
      this.renderer=new Renderer(canvas);
      this.input=new Input(canvas);
      this.camera=new Camera();
      this.players=new Map();
      this.localPlayer=null;
      this.arena=new Arena(25);
      this.meshes={};
      this.matchStarted=false;
      this.scoreLimit=10;
      this.timeLimit=600;
      this.matchTime=0;
      Game.instance=this;
    }

    async init(){
      const box=GS.Primitives.box(0.6,1.8,0.6);
      this.meshes.player=this.renderer.createMesh(box.vertices,box.indices);
      const floor=GS.Primitives.plane(30,30);
      this.meshes.floor=this.renderer.createMesh(floor.vertices,floor.indices);
      this.camera.setAspect(this.canvas.width/this.canvas.height);
      this._setupNetwork();
    }

    _setupNetwork(){
      GS.Network.on('state',(s)=>{
        const p=this.players.get(s.id);
        if(p&&!p.local)p.setRemoteState(s);
      });
    }

    addPlayer(id,local=false){
      const p=new Player(id,local);
      const spawn=this.arena.getSpawn(this.players.size);
      p.pos.copy(spawn.pos);p.yaw=spawn.angle;
      this.players.set(id,p);
      if(local){this.localPlayer=p;GS.Network.localId=id}
      return p;
    }

    update(dt){
      if(!this.matchStarted)return;
      this.matchTime+=dt;
      for(const[id,p]of this.players){
        if(p.local){
          p.update(dt,this.input);
          this.arena.constrain(p.pos);
          if(this.input.isButton(0)){
            const shot=p.shoot();
            if(shot)this._handleShot(shot);
          }
          GS.Network.sendState(p.getState());
        }else{
          p.update(dt,null);
        }
      }
      if(this.localPlayer&&this.localPlayer.alive){
        this.camera.pos.copy(this.localPlayer.pos);
        this.camera.pos.y+=1.6;
        this.camera.yaw=this.localPlayer.yaw;
        this.camera.pitch=this.localPlayer.pitch;
      }
      this.camera.update();
    }

    _handleShot(shot){
      for(const[id,p]of this.players){
        if(id===shot.shooter||!p.alive)continue;
        const dist=shot.origin.distanceTo(p.pos);
        if(dist>GS.Weapons[shot.weapon].range)continue;
        const toP=p.pos.clone().sub(shot.origin);toP.y+=1;
        const dot=toP.normalize().dot(shot.dir);
        if(dot>0.95){
          const killed=p.takeDamage(GS.Weapons[shot.weapon].dmg,shot.shooter);
          if(killed){
            this.localPlayer.kills++;
            if(this.localPlayer.kills>=this.scoreLimit)this.endMatch();
          }
        }
      }
    }

    render(alpha){
      this.renderer.resize();
      this.renderer.clear(0.15,0.15,0.2);
      const floorModel=new Mat4();
      this.renderer.drawMesh(this.meshes.floor,this.camera.proj,this.camera.view,floorModel,[0.3,0.3,0.35]);
      for(const[id,p]of this.players){
        if(!p.alive||p===this.localPlayer)continue;
        const model=new Mat4();
        model.translate(p.pos.x,p.pos.y+0.9,p.pos.z);
        model.rotateY(p.yaw);
        this.renderer.drawMesh(this.meshes.player,this.camera.proj,this.camera.view,model,p.color);
      }
    }

    startMatch(){this.matchStarted=true;this.matchTime=0;console.log('[Game] Match started')}
    endMatch(){this.matchStarted=false;alert('Match Over! Winner: '+this.localPlayer?.name)}
  }
  GS.Game = Game;

  console.log('[GoldenShower] Game bundle loaded');

})(typeof window!=='undefined'?window:global);
