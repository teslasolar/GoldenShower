// UDT: Network · 群 · molecule
// BroadcastChannel + MQTT P2P
const PEERS=new Map()
const bc=new BroadcastChannel('golden-shower-lobby')
let mqtt=null

bc.onmessage=e=>{const d=e.data
if(d.type==='pos')PEERS.set(d.name,{x:d.x,y:d.y,z:d.z,yaw:d.yaw,color:d.color,t:Date.now()})
if(d.type==='chat')addChat(d.name,d.text)
if(d.type==='blast')blasts.push({x:d.x,y:d.y,z:d.z,dx:d.dx,dy:d.dy,dz:d.dz,life:1,hue:d.hue,owner:d.name})
if(d.type==='join')addChat('',d.name+' joined',true)
if(d.type==='leave')PEERS.delete(d.name)}

function broadcast(msg){bc.postMessage(msg);if(mqtt)try{mqtt.send(JSON.stringify(msg))}catch(e){}}
function broadcastPos(){broadcast({type:'pos',name:ME.name,x:ME.x,y:ME.y,z:ME.z,yaw:ME.yaw,color:ME.color})}
function broadcastChat(text){broadcast({type:'chat',name:ME.name,text})}
function broadcastBlast(dx,dy,dz){broadcast({type:'blast',name:ME.name,x:ME.x,y:ME.y,z:ME.z,dx:dx*.5,dy:dy*.5,dz:dz*.5,hue:Math.random()})}

function tryMQTT(){
const brokers=['wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081/mqtt']
try{mqtt=new WebSocket(brokers[Math.floor(Math.random()*brokers.length)])
mqtt.binaryType='arraybuffer'
mqtt.onopen=()=>addChat('','Connected to global P2P',true)
mqtt.onclose=()=>{mqtt=null;addChat('','P2P disconnected — local mode',true)}
mqtt.onerror=()=>{mqtt=null}}catch(e){}}

function cullPeers(){const now=Date.now();PEERS.forEach((p,k)=>{if(now-p.t>10000)PEERS.delete(k)})}

window.PEERS=PEERS;window.broadcast=broadcast;window.broadcastPos=broadcastPos
window.broadcastChat=broadcastChat;window.broadcastBlast=broadcastBlast;window.tryMQTT=tryMQTT;window.cullPeers=cullPeers
