// UDT: Player · 聴 繋 · atom
// The local player state + input + physics
const ME={name:'Agent_'+Math.random().toString(36).substr(2,4).toUpperCase(),
x:0,y:1.6,z:0,yaw:0,pitch:0,vx:0,vy:0,vz:0,shots:0,color:'#d4af37'}
const keys={},mouse={dx:0,dy:0}
let locked=false,running=false,invertY=false

function updatePlayer(){
if(!running)return
const spd=.12,sens=.003
ME.yaw+=mouse.dx*sens
ME.pitch=Math.max(-.8,Math.min(.8,ME.pitch+(invertY?1:-1)*mouse.dy*sens))
mouse.dx=0;mouse.dy=0
const fwdX=Math.sin(ME.yaw),fwdZ=Math.cos(ME.yaw)
const rightX=Math.cos(ME.yaw),rightZ=-Math.sin(ME.yaw)
if(keys.KeyW){ME.x+=fwdX*spd;ME.z+=fwdZ*spd}
if(keys.KeyS){ME.x-=fwdX*spd;ME.z-=fwdZ*spd}
if(keys.KeyA){ME.x-=rightX*spd;ME.z-=rightZ*spd}
if(keys.KeyD){ME.x+=rightX*spd;ME.z+=rightZ*spd}
if(keys.Space&&ME.y<=1.6)ME.vy=.15
ME.vy-=.008;ME.y+=ME.vy;if(ME.y<1.6){ME.y=1.6;ME.vy=0}
ME.x=Math.max(-19,Math.min(19,ME.x));ME.z=Math.max(-19,Math.min(19,ME.z))
pollGamepad()}

window.ME=ME;window.keys=keys;window.mouse=mouse
window.updatePlayer=updatePlayer
