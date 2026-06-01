// UDT: Combat · 波 衝 弾 · molecule
// Blasts + FEMTO AI bots
const blasts=[]
const T=Math.PI*2,Rn=Math.random,FL=Math.floor,MN=Math.min,MX=Math.max

function fireBlast(){
const dx=-Math.sin(ME.yaw)*Math.cos(ME.pitch),dy=Math.sin(ME.pitch),dz=-Math.cos(ME.yaw)*Math.cos(ME.pitch)
blasts.push({x:ME.x,y:ME.y,z:ME.z,dx:dx*.5,dy:dy*.5,dz:dz*.5,life:1,hue:Rn(),owner:ME.name})
ME.shots++;broadcastBlast(dx,dy,dz)}

const BOTS=[
{name:'🤖 Auric',x:8,y:1.6,z:8,yaw:0,color:'#d4af37',state:'patrol',fireCd:0,
 waypoints:[[8,8],[8,-8],[-8,-8],[-8,8]],wpIdx:0,aggro:0,personality:'balanced'},
{name:'🔴 Viper',x:-10,y:1.6,z:5,yaw:Math.PI,color:'#ff4444',state:'hunt',fireCd:0,
 waypoints:[[-10,5],[-10,-10],[10,-10],[10,5]],wpIdx:0,aggro:.7,personality:'aggressive'},
{name:'🟣 Mayday',x:0,y:1.6,z:-12,yaw:0,color:'#aa44ff',state:'patrol',fireCd:0,
 waypoints:[[0,-12],[12,0],[0,12],[-12,0]],wpIdx:0,aggro:.3,personality:'defensive'},
{name:'⚪ Samedi',x:-6,y:1.6,z:-6,yaw:1,color:'#cccccc',state:'wander',fireCd:0,
 waypoints:[[-6,-6],[6,-6],[6,6],[-6,6]],wpIdx:0,aggro:.5,personality:'erratic'}]

function femtoDecide(bot,dt){
const dx=ME.x-bot.x,dz=ME.z-bot.z,dist=Math.sqrt(dx*dx+dz*dz)
const angleToPlayer=Math.atan2(-dx,-dz)
const huntW=bot.aggro+MN(1,8/dist)*.5
if(huntW>.5&&dist<18){bot.state='hunt'
  bot.yaw+=(angleToPlayer-bot.yaw)*.06
  bot.x-=Math.sin(bot.yaw)*(.06+bot.aggro*.04);bot.z-=Math.cos(bot.yaw)*(.06+bot.aggro*.04)
  bot.fireCd-=dt
  if(dist<15&&bot.fireCd<=0){bot.fireCd=.8+Rn()*(1-bot.aggro)
    blasts.push({x:bot.x,y:bot.y,z:bot.z,dx:-Math.sin(bot.yaw)*.5,dy:(Rn()-.5)*.05,dz:-Math.cos(bot.yaw)*.5,life:1,hue:Rn(),owner:bot.name})}}
else{bot.state='patrol'
  const wp=bot.waypoints[bot.wpIdx],wx=wp[0]-bot.x,wz=wp[1]-bot.z
  if(Math.sqrt(wx*wx+wz*wz)<1.5)bot.wpIdx=(bot.wpIdx+1)%bot.waypoints.length
  bot.yaw+=(Math.atan2(-wx,-wz)-bot.yaw)*.04
  bot.x-=Math.sin(bot.yaw)*.04;bot.z-=Math.cos(bot.yaw)*.04}
if(bot.personality==='erratic'&&Rn()<.02){bot.yaw+=Rn()*2-1;bot.wpIdx=FL(Rn()*bot.waypoints.length)}
bot.x=MX(-19,MN(19,bot.x));bot.z=MX(-19,MN(19,bot.z))}

function updateCombat(dt){BOTS.forEach(b=>femtoDecide(b,dt))}

window.blasts=blasts;window.BOTS=BOTS;window.fireBlast=fireBlast;window.updateCombat=updateCombat
