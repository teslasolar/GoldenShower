// UDT: Input · 入 · atom
// Keyboard + mouse + gamepad
let gamepadIdx=null

document.addEventListener('keydown',e=>{keys[e.code]=true
if(e.code==='Enter'&&document.activeElement!==document.getElementById('chat-input')){document.getElementById('chat-input').focus();e.preventDefault()}
if(e.code==='KeyI'){invertY=!invertY;addChat('','Mouse Y: '+(invertY?'inverted':'normal'),true)}})
document.addEventListener('keyup',e=>keys[e.code]=false)
document.addEventListener('mousemove',e=>{if(locked){mouse.dx+=e.movementX;mouse.dy+=e.movementY}})
document.addEventListener('mousedown',e=>{if(locked&&e.button===0)fireBlast()})
document.addEventListener('pointerlockchange',()=>locked=!!document.pointerLockElement)

window.addEventListener('gamepadconnected',e=>{gamepadIdx=e.gamepad.index
addChat('','🎮 Gamepad: '+e.gamepad.id.substring(0,30),true)})
window.addEventListener('gamepaddisconnected',()=>{gamepadIdx=null;addChat('','🎮 Disconnected',true)})

function pollGamepad(){
if(gamepadIdx===null)return
const gp=navigator.getGamepads()[gamepadIdx];if(!gp)return
const dz=.15,ms=.15,ls=.04
const lx=Math.abs(gp.axes[0])>dz?gp.axes[0]:0,ly=Math.abs(gp.axes[1])>dz?gp.axes[1]:0
const rx=Math.abs(gp.axes[2])>dz?gp.axes[2]:0,ry=Math.abs(gp.axes[3])>dz?gp.axes[3]:0
if(ly){ME.x+=Math.sin(ME.yaw)*ly*ms;ME.z+=Math.cos(ME.yaw)*ly*ms}
if(lx){ME.x+=Math.cos(ME.yaw)*lx*ms;ME.z-=Math.sin(ME.yaw)*lx*ms}
ME.yaw+=rx*ls;ME.pitch=Math.max(-.8,Math.min(.8,ME.pitch-ry*ls))
if(gp.buttons[0]?.pressed&&ME.y<=1.6)ME.vy=.15
if(gp.buttons[7]?.pressed||gp.buttons[5]?.pressed){if(!gp._fc){fireBlast();gp._fc=8}else gp._fc--}else gp._fc=0}

window.pollGamepad=pollGamepad;window.gamepadIdx=gamepadIdx
