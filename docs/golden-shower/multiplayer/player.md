# Player Class

```javascript
class Player {
  constructor(id,local=false){
    this.id=id;this.local=local;
    this.pos=new GS.Vec3(0,0,0);
    this.vel=new GS.Vec3(0,0,0);
    this.yaw=0;this.pitch=0;
    this.health=100;this.armor=0;
    this.weapon=1;this.ammo=[0,30,0,0,0,0,0];
    this.kills=0;this.deaths=0;
    this.alive=true;this.respawnTime=0;
    this.name='Player';this.character=0;
    this.color=[0.5,0.5,0.5];
  }
  takeDamage(amt,from){
    if(!this.alive)return false;
    const armor=Math.min(this.armor,amt*0.5);
    this.armor-=armor;
    this.health-=amt-armor;
    if(this.health<=0){
      this.alive=false;this.deaths++;
      this.respawnTime=3;return true;
    }
    return false;
  }
  respawn(pos){
    this.pos=pos.clone();this.vel=new GS.Vec3();
    this.health=100;this.armor=0;
    this.weapon=1;this.ammo=[0,30,0,0,0,0,0];
    this.alive=true;
  }
  getState(){
    return{id:this.id,x:this.pos.x,y:this.pos.y,z:this.pos.z,
      yaw:this.yaw,pitch:this.pitch,health:this.health,
      weapon:this.weapon,alive:this.alive};
  }
}
GS.Player=Player;
```
