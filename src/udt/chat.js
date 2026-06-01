// UDT: Chat · 唱 · atom
function addChat(name,text,sys){const log=document.getElementById('chat-log')
const d=document.createElement('div')
d.innerHTML=sys?`<span class="sys">${text}</span>`:`<span class="name">${name}:</span> ${text}`
log.appendChild(d);log.scrollTop=log.scrollHeight}
document.getElementById('chat-input').addEventListener('keydown',e=>{
if(e.key==='Enter'&&e.target.value.trim()){
const msg=e.target.value.trim();addChat(ME.name,msg);broadcastChat(msg);e.target.value='';e.target.blur();e.preventDefault()}
if(e.key==='Escape')e.target.blur()})
window.addChat=addChat
