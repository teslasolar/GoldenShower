/**
 * GOLDEN SHOWER — Browser Agent (inject into game page)
 * Reports errors, takes screenshots, monitors performance
 * Loaded by Playwright or manually via console
 *
 * Usage: page.addScriptTag({path:'scripts/browser-agent.js'})
 */
(function(){
const API='http://localhost:5520/api'
const SESSION_ID='gs-'+Date.now().toString(36)
let errorCount=0,startTime=Date.now()

// ═══ ERROR CAPTURE ═══
window.addEventListener('error',e=>{
  errorCount++
  fetch(API+'/error',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:e.message,stack:e.error?.stack,url:e.filename,line:e.lineno,sessionId:SESSION_ID})}).catch(()=>{})})

window.addEventListener('unhandledrejection',e=>{
  errorCount++
  fetch(API+'/error',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:'Promise: '+e.reason,sessionId:SESSION_ID})}).catch(()=>{})})

// ═══ HEARTBEAT (every 10s) ═══
setInterval(()=>{fetch(API+'/heartbeat').catch(()=>{})},10000)

// ═══ AUTO SCREENSHOT (every 30s) ═══
setInterval(()=>{
  const cv=document.querySelector('canvas')
  if(!cv)return
  try{
    const dataUrl=cv.toDataURL('image/png')
    fetch(API+'/screenshot',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({dataUrl,note:'auto-'+Math.floor((Date.now()-startTime)/1000)+'s',sessionId:SESSION_ID})}).catch(()=>{})
  }catch(e){}
},30000)

// ═══ SESSION REPORT (on unload) ═══
window.addEventListener('beforeunload',()=>{
  const duration=Math.floor((Date.now()-startTime)/1000)
  const data={sessionId:SESSION_ID,duration,errors:errorCount,
    shots:window.ME?.shots||0,bots:window.BOTS?.length||0,
    peers:window.PEERS?.size||0,blasts:window.blasts?.length||0,
    pos:window.ME?{x:ME.x,z:ME.z}:null}
  navigator.sendBeacon(API+'/session',JSON.stringify(data))})

// ═══ AUTO BUG REPORT (3+ same errors) ═══
const errBuckets={}
const origOnerror=window.onerror
window.onerror=function(msg,url,line,col,err){
  const key=msg+':'+line
  errBuckets[key]=(errBuckets[key]||0)+1
  if(errBuckets[key]===3){
    fetch(API+'/bug',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({title:msg.substring(0,60),message:msg,url,stack:err?.stack,line,sessionId:SESSION_ID})}).catch(()=>{})}
  if(origOnerror)return origOnerror.apply(this,arguments)}

// ═══ EXPOSE TO CONSOLE ═══
window.GS_AGENT={
  sessionId:SESSION_ID,
  screenshot(note){const cv=document.querySelector('canvas');if(!cv)return
    fetch(API+'/screenshot',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({dataUrl:cv.toDataURL('image/png'),note:note||'manual',sessionId:SESSION_ID})})},
  report(){return{sessionId:SESSION_ID,errors:errorCount,uptime:Math.floor((Date.now()-startTime)/1000),
    shots:window.ME?.shots,bots:window.BOTS?.length,peers:window.PEERS?.size}},
  bug(title,msg){fetch(API+'/bug',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({title,message:msg||title,sessionId:SESSION_ID})})}}

console.log(`[GS-Agent] Session ${SESSION_ID} · reporting to ${API}`)
})()
