// UDT: Renderer · 景 幀 目 · organism
// Canvas 2D software 3D renderer + arena geometry
const cv=document.getElementById('cv')
cv.width=innerWidth;cv.height=innerHeight
const ctx=cv.getContext('2d')
window.addEventListener('resize',()=>{cv.width=innerWidth;cv.height=innerHeight})
let hasWebGPU=false
if(navigator.gpu)navigator.gpu.requestAdapter().then(a=>{if(a){hasWebGPU=true;addChat('','⚡ WebGPU available',true)}}).catch(()=>{})

const T2=Math.PI*2
function proj(x,y,z){
const dx=x-ME.x,dy=y-ME.y,dz=z-ME.z
const cx=Math.cos(-ME.yaw),sx=Math.sin(-ME.yaw),cy=Math.cos(-ME.pitch),sy=Math.sin(-ME.pitch)
const rx=dx*cx+dz*sx,rz=-dx*sx+dz*cx
const ry2=dy*cy-rz*sy,rz2=dy*sy+rz*cy
if(rz2<.1)return null
const fov=cv.width*.8
return{sx:cv.width/2+rx/rz2*fov,sy:cv.height/2-ry2/rz2*fov,d:rz2}}

const FLOOR_LINES=[],WALLS=[],PILLARS=[]
for(let i=-20;i<=20;i++){FLOOR_LINES.push({x1:i,z1:-20,x2:i,z2:20});FLOOR_LINES.push({x1:-20,z1:i,x2:20,z2:i})}
for(let i=0;i<4;i++){const a=i*T2/4,r=20
WALLS.push({x1:Math.cos(a)*r,z1:Math.sin(a)*r,x2:Math.cos(a+T2/4)*r,z2:Math.sin(a+T2/4)*r,h:4})}
for(let i=0;i<8;i++){const a=i*T2/8,r=12;PILLARS.push({x:Math.cos(a)*r,z:Math.sin(a)*r,r:.4,h:5})}

function render(){
const w=cv.width,h=cv.height,MX=Math.max
ctx.fillStyle='#0a0a0f';ctx.fillRect(0,0,w,h)
const skyG=ctx.createLinearGradient(0,0,0,h/2)
skyG.addColorStop(0,'#0a0a1a');skyG.addColorStop(1,'#14142a');ctx.fillStyle=skyG;ctx.fillRect(0,0,w,h/2)
ctx.strokeStyle='rgba(212,175,55,.06)';ctx.lineWidth=1
FLOOR_LINES.forEach(l=>{const a=proj(l.x1,0,l.z1),b=proj(l.x2,0,l.z2)
if(a&&b&&a.d<40&&b.d<40){ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.stroke()}})
ctx.strokeStyle='rgba(212,175,55,.15)';ctx.lineWidth=2
WALLS.forEach(w2=>{const corners=[[w2.x1,0,w2.z1],[w2.x2,0,w2.z2],[w2.x2,w2.h,w2.z2],[w2.x1,w2.h,w2.z1]]
const pp=corners.map(c=>proj(...c)).filter(Boolean)
if(pp.length>=3){ctx.beginPath();pp.forEach((p,i)=>i?ctx.lineTo(p.sx,p.sy):ctx.moveTo(p.sx,p.sy));ctx.closePath();ctx.stroke()}})
ctx.strokeStyle='rgba(212,175,55,.2)';PILLARS.forEach(p=>{
const b=proj(p.x,0,p.z),t=proj(p.x,p.h,p.z)
if(b&&t&&b.d<35){const sz=MX(2,20/b.d);ctx.beginPath();ctx.moveTo(b.sx,b.sy);ctx.lineTo(t.sx,t.sy);ctx.stroke()
ctx.fillStyle='rgba(212,175,55,.1)';ctx.fillRect(t.sx-sz,t.sy,sz*2,b.sy-t.sy)}})
// entities
function drawEntity(x,y,z,name,color,state){const pp=proj(x,y-.3,z);if(!pp||pp.d>40)return
const sz=MX(6,80/pp.d);ctx.fillStyle=color;ctx.fillRect(pp.sx-sz/2,pp.sy-sz*2,sz,sz*2)
ctx.beginPath();ctx.arc(pp.sx,pp.sy-sz*2.2,sz*.4,0,T2);ctx.fill()
if(state){ctx.fillStyle=state==='hunt'?'#ff4444':'#44ff44';ctx.beginPath();ctx.arc(pp.sx,pp.sy-sz*2.8,sz*.15,0,T2);ctx.fill()}
ctx.fillStyle='#fff';ctx.font=MX(7,10-pp.d*.15)+'px Courier New';ctx.textAlign='center';ctx.fillText(name,pp.sx,pp.sy-sz*2.8-6)}
BOTS.forEach(b=>drawEntity(b.x,b.y,b.z,b.name,b.color,b.state))
PEERS.forEach((p,n)=>drawEntity(p.x,p.y||1.6,p.z,n,p.color||'#888'))
// blasts
for(let i=blasts.length-1;i>=0;i--){const b=blasts[i]
b.x+=b.dx;b.y+=b.dy;b.z+=b.dz;b.life-=.015
const bp=proj(b.x,b.y,b.z)
if(bp&&bp.d<50){const sz=MX(2,30/bp.d)*b.life
ctx.fillStyle=`hsla(${b.hue*360},80%,60%,${b.life*.6})`;ctx.beginPath();ctx.arc(bp.sx,bp.sy,sz,0,T2);ctx.fill()
ctx.strokeStyle=`hsla(${b.hue*360},80%,80%,${b.life*.3})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(bp.sx,bp.sy,sz*1.5,0,T2);ctx.stroke()}
if(b.life<=0)blasts.splice(i,1)}}

window.render=render;window.proj=proj;window.hasWebGPU=hasWebGPU;window.cv=cv
