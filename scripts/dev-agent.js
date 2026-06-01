#!/usr/bin/env node
/**
 * GOLDEN SHOWER — Dev Agent Server
 * Backend API that Playwright browser agents call to:
 * - Report errors / screenshots from the live game
 * - Get improvement suggestions
 * - Run tests / play sessions
 * - Create GitHub Issues from bugs found
 *
 * Run: node scripts/dev-agent.js [port]
 * API: http://localhost:5520/api/*
 */
const http=require('http'),fs=require('fs'),path=require('path'),{execSync}=require('child_process')
const PORT=process.argv[2]||5520
const ROOT=path.join(__dirname,'..')
const LOG_DIR=path.join(ROOT,'logs')
fs.mkdirSync(LOG_DIR,{recursive:true})

const state={
  sessions:[],errors:[],screenshots:[],suggestions:[],
  playTests:0,bugsFound:0,lastHeartbeat:null}

function log(msg){const ts=new Date().toISOString().substring(11,19);console.log(`[${ts}] ${msg}`)}

function parseBody(req){return new Promise(ok=>{let d='';req.on('data',c=>d+=c);req.on('end',()=>{try{ok(JSON.parse(d))}catch(e){ok({raw:d})}})})}

const ROUTES={
  // ═══ ERROR REPORTING ═══
  'POST /api/error':async(req)=>{
    const body=await parseBody(req)
    const entry={ts:Date.now(),msg:body.message,stack:body.stack,url:body.url,line:body.line}
    state.errors.push(entry)
    if(state.errors.length>200)state.errors.shift()
    fs.appendFileSync(path.join(LOG_DIR,'errors.jsonl'),JSON.stringify(entry)+'\n')
    log(`ERROR: ${body.message?.substring(0,80)}`)
    return{ok:true,total:state.errors.length}},

  // ═══ SCREENSHOT UPLOAD ═══
  'POST /api/screenshot':async(req)=>{
    const body=await parseBody(req)
    const name=`ss-${Date.now()}.png`
    if(body.dataUrl){
      const base64=body.dataUrl.replace(/^data:image\/\w+;base64,/,'')
      fs.writeFileSync(path.join(LOG_DIR,name),Buffer.from(base64,'base64'))}
    state.screenshots.push({ts:Date.now(),name,note:body.note||''})
    log(`SCREENSHOT: ${name} — ${body.note||''}`)
    return{ok:true,file:name}},

  // ═══ PLAY SESSION REPORT ═══
  'POST /api/session':async(req)=>{
    const body=await parseBody(req)
    state.sessions.push({ts:Date.now(),...body})
    state.playTests++
    fs.appendFileSync(path.join(LOG_DIR,'sessions.jsonl'),JSON.stringify(body)+'\n')
    log(`SESSION: ${body.duration}s, ${body.shots} shots, ${body.errors} errors, ${body.bots} bots`)
    return{ok:true,total:state.playTests}},

  // ═══ BUG → GITHUB ISSUE ═══
  'POST /api/bug':async(req)=>{
    const body=await parseBody(req)
    state.bugsFound++
    try{
      const title=`[dev-agent] ${body.title||'Bug found'}`
      const bugBody=`## Auto-detected by dev-agent\n\n**Error:** ${body.message}\n**URL:** ${body.url}\n**Stack:**\n\`\`\`\n${body.stack||'n/a'}\n\`\`\`\n**Session:** ${body.sessionId||'n/a'}\n**Timestamp:** ${new Date().toISOString()}`
      execSync(`gh issue create --repo teslasolar/goldenshower --title "${title.replace(/"/g,'\\"')}" --label "bug" --body "${bugBody.replace(/"/g,'\\"')}"`,{encoding:'utf8'})
      log(`BUG → GitHub Issue: ${title}`)
      return{ok:true,created:true}
    }catch(e){return{ok:false,error:e.message}}},

  // ═══ GET STATE ═══
  'GET /api/state':async()=>({...state,uptime:process.uptime()|0}),

  // ═══ GET ERRORS ═══
  'GET /api/errors':async()=>({errors:state.errors.slice(-50),total:state.errors.length}),

  // ═══ SUGGESTION FROM ERRORS ═══
  'GET /api/suggest':async()=>{
    const recent=state.errors.slice(-10)
    const suggestions=[]
    const msgs=recent.map(e=>e.msg||'')
    if(msgs.some(m=>m.includes('null')))suggestions.push({type:'null-check',fix:'Add guard: if(!obj)return'})
    if(msgs.some(m=>m.includes('undefined')))suggestions.push({type:'scope',fix:'Check variable hoisting — move const to module scope'})
    if(msgs.some(m=>m.includes('Canvas')||m.includes('context')))suggestions.push({type:'canvas',fix:'Ensure single context type per canvas (2d OR webgl, not both)'})
    if(msgs.some(m=>m.includes('shader')))suggestions.push({type:'shader',fix:'Check for attribute redefinition — remove explicit color attribute with vertexColors:true'})
    if(recent.length===0)suggestions.push({type:'clean',fix:'No errors detected — system healthy'})
    state.suggestions=suggestions
    return{suggestions,errorCount:recent.length}},

  // ═══ HEARTBEAT ═══
  'GET /api/heartbeat':async()=>{
    state.lastHeartbeat=Date.now()
    return{alive:true,ts:new Date().toISOString(),errors:state.errors.length,sessions:state.playTests,bugs:state.bugsFound}},

  // ═══ RUN PLAYWRIGHT TEST ═══
  'POST /api/test':async(req)=>{
    const body=await parseBody(req)
    const url=body.url||'http://localhost:5510/goldenshower/index.html'
    try{
      const result=execSync(`node test/play-test.js "${url}"`,{encoding:'utf8',timeout:45000,cwd:ROOT})
      log('TEST: completed')
      return{ok:true,output:result}
    }catch(e){return{ok:false,output:e.stdout||e.message}}},

  // ═══ TAG DB QUERY ═══
  'GET /api/tags':async()=>{
    try{
      const result=execSync('gh issue list --repo teslasolar/goldenshower --label tag --json title,labels,body --limit 50',{encoding:'utf8'})
      return JSON.parse(result)
    }catch(e){return{error:e.message}}},

  // ═══ KOTOBA EXEC ═══
  'POST /api/kotoba':async(req)=>{
    const body=await parseBody(req)
    const glyphs=body.glyphs||''
    log(`KOTOBA: ${glyphs}`)
    return{executed:glyphs,note:'Kotoba glyph execution — connect to compiler for full eval'}},
}

const server=http.createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers','Content-Type')
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}

  const key=`${req.method} ${req.url.split('?')[0]}`
  const handler=ROUTES[key]

  if(handler){
    try{
      const result=await handler(req)
      res.writeHead(200,{'Content-Type':'application/json'})
      res.end(JSON.stringify(result))
    }catch(e){
      res.writeHead(500,{'Content-Type':'application/json'})
      res.end(JSON.stringify({error:e.message}))}
  }else{
    // Dashboard HTML
    if(req.url==='/'){
      res.writeHead(200,{'Content-Type':'text/html'})
      res.end(`<!DOCTYPE html><html><head><title>GS Dev Agent</title>
<style>*{margin:0;padding:0}body{background:#0a0a1a;color:#e0e0e0;font:12px/1.4 Consolas,monospace;padding:20px}
h1{color:#d4af37;margin-bottom:10px}pre{background:#14141f;padding:10px;margin:8px 0;border-left:3px solid #d4af37;overflow-x:auto;font-size:11px}
.btn{background:#d4af37;color:#000;border:none;padding:8px 16px;cursor:pointer;font:bold 12px Consolas;margin:4px}
.btn:hover{background:#e4bf47}
#out{max-height:400px;overflow-y:auto}</style></head><body>
<h1>🔫 GOLDEN SHOWER · Dev Agent · :${PORT}</h1>
<div><button class="btn" onclick="f('/api/state')">State</button>
<button class="btn" onclick="f('/api/errors')">Errors</button>
<button class="btn" onclick="f('/api/suggest')">Suggest</button>
<button class="btn" onclick="f('/api/heartbeat')">Heartbeat</button>
<button class="btn" onclick="f('/api/tags')">Tags</button>
<button class="btn" onclick="fetch('/api/test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.json()).then(d=>show(d))">Run Test</button></div>
<pre id="out">Ready.</pre>
<script>async function f(u){const r=await fetch(u);show(await r.json())}
function show(d){document.getElementById('out').textContent=JSON.stringify(d,null,2)}</script>
</body></html>`)
    }else{res.writeHead(404);res.end('Not found')}
  }
})

server.listen(PORT,()=>{
  log(`Dev Agent running on http://localhost:${PORT}`)
  log(`Dashboard: http://localhost:${PORT}/`)
  log(`API: /api/state /api/errors /api/suggest /api/heartbeat /api/tags /api/test /api/bug /api/session /api/screenshot /api/kotoba`)
})
