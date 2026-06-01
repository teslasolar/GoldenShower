#!/usr/bin/env node
/**
 * GOLDEN SHOWER — Unified SVG Dashboard Generator
 * Reads GitHub API → generates ONE nested SVG with all panels
 * + heartbeat endpoint for live status
 * Run: GH_TOKEN=xxx node scripts/gen-svg.js
 */
const https=require('https'),fs=require('fs'),path=require('path')
const REPO='teslasolar/goldenshower'
const OUT=path.join(__dirname,'..','badges')

function api(ep){return new Promise((ok,no)=>{
  const opts={hostname:'api.github.com',path:ep,headers:{'User-Agent':'gs-ci','Accept':'application/vnd.github.v3+json'}}
  if(process.env.GH_TOKEN)opts.headers.Authorization='token '+process.env.GH_TOKEN
  https.get(opts,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{ok(JSON.parse(d))}catch(e){ok([])}})}).on('error',()=>ok([]))})}

const hs=(h,s,l)=>`hsl(${h},${s}%,${l}%)`
const bar=(x,y,w,h,pct,col)=>`<rect x="${x}" y="${y}" width="${Math.max(1,w*Math.min(1,pct))}" height="${h}" fill="${col}" opacity=".7" rx="2"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#333" rx="2"/>`

async function main(){
  fs.mkdirSync(OUT,{recursive:true})
  const [issues,repo,commits]=await Promise.all([
    api(`/repos/${REPO}/issues?state=all&per_page=100`),
    api(`/repos/${REPO}`),
    api(`/repos/${REPO}/commits?per_page=8`)])

  const iss=Array.isArray(issues)?issues.filter(i=>!i.pull_request):[]
  const prs=Array.isArray(issues)?issues.filter(i=>i.pull_request):[]
  const open=iss.filter(i=>i.state==='open'),closed=iss.filter(i=>i.state==='closed')
  const labels={};iss.forEach(i=>(i.labels||[]).forEach(l=>{labels[l.name]=(labels[l.name]||0)+1}))
  const stars=repo.stargazers_count||0,forks=repo.forks_count||0
  const cArr=Array.isArray(commits)?commits.slice(0,6):[]
  const now=new Date().toISOString().replace('T',' ').substring(0,16)

  const chars=[{n:'Auric',c:'#d4af37',t:'Balanced'},{n:'Janus',c:'#c0c0c0',t:'Mirror'},{n:'Cipher',c:'#44ddaa',t:'Hacker'},
    {n:'Colossus',c:'#8888bb',t:'Tank'},{n:'Imp',c:'#666',t:'Speed'},{n:'Viper',c:'#ff4444',t:'Aggro'},
    {n:'Mayday',c:'#aa44ff',t:'Heavy'},{n:'Samedi',c:'#ddd',t:'Undead'}]
  const wpns=[{n:'Unarmed',d:10,c:'#888'},{n:'Sidearm',d:25,c:'#ccc'},{n:'Carbine',d:15,c:'#4488ff'},
    {n:'Shotgun',d:80,c:'#ff8844'},{n:'Marksman',d:80,c:'#44ff88'},{n:'Launcher',d:150,c:'#ff4444'},{n:'Gilded',d:1000,c:'#d4af37'}]
  const maps=[{n:'Refinery',t:'Industrial',s:'M'},{n:'Shrine',t:'Stone',s:'L'},{n:'Tower',t:'Vertical',s:'S'},
    {n:'Labyrinth',t:'Corridors',s:'M'},{n:'Archive',t:'Multi-floor',s:'L'},{n:'Vault',t:'Underground',s:'M'}]

  // ═══ HEARTBEAT JSON ═══
  const heartbeat={ts:now,repo:REPO,stars,forks,issues:{open:open.length,closed:closed.length},
    prs:prs.length,labels,commits:cArr.map(c=>({sha:c.sha?.substring(0,7),msg:c.commit?.message?.split('\n')[0]?.substring(0,60),author:c.commit?.author?.name})),
    characters:chars.length,weapons:wpns.length,maps:maps.length,status:'alive'}
  fs.writeFileSync(path.join(OUT,'heartbeat.json'),JSON.stringify(heartbeat,null,2))

  // ═══ ONE UNIFIED SVG ═══
  const W=520,H=720
  let s=''

  // bg
  s+=`<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0a1a"/><stop offset="1" stop-color="#14142a"/></linearGradient></defs>`
  s+=`<rect width="${W}" height="${H}" fill="url(#bg)" rx="10"/>`

  // ─── HEADER ───
  s+=`<text x="${W/2}" y="28" text-anchor="middle" font-size="16" fill="#d4af37" font-weight="bold" font-family="monospace">🔫 GOLDEN SHOWER</text>`
  s+=`<text x="${W/2}" y="44" text-anchor="middle" font-size="9" fill="#666" font-family="monospace">Retro Arena FPS · Konomi Systems · ${now}</text>`

  // ─── HEARTBEAT PULSE ───
  s+=`<circle cx="490" cy="22" r="5" fill="#0f0" opacity=".8"><animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".4;1;.4" dur="2s" repeatCount="indefinite"/></circle>`
  s+=`<text x="478" y="26" text-anchor="end" font-size="7" fill="#0f0" font-family="monospace">LIVE</text>`

  // ─── STATS STRIP ───
  s+=`<rect x="10" y="52" width="${W-20}" height="30" rx="4" fill="#14141f" stroke="#333" stroke-width="1"/>`
  const statItems=[['⭐',stars],['🍴',forks],['📋',open.length+'/'+closed.length],['🔀',prs.length],['🔫',wpns.length],['🎮',chars.length],['🗺',maps.length]]
  statItems.forEach(([emoji,val],i)=>{const bx=22+i*72
    s+=`<text x="${bx}" y="72" font-size="11" font-family="monospace" fill="#fff">${emoji} <tspan fill="#d4af37" font-weight="bold">${val}</tspan></text>`})

  // ─── CHARACTERS PANEL ───
  let py=92
  s+=`<rect x="10" y="${py}" width="${W-20}" height="58" rx="4" fill="#14141f" stroke="#d4af3722"/>`
  s+=`<text x="20" y="${py+14}" font-size="8" fill="#888" font-family="monospace">CHARACTERS</text>`
  chars.forEach((c,i)=>{const cx=18+i*62,cy2=py+22
    s+=`<rect x="${cx}" y="${cy2}" width="56" height="28" rx="3" fill="${c.c}" fill-opacity=".1" stroke="${c.c}" stroke-opacity=".4"/>`
    s+=`<text x="${cx+28}" y="${cy2+13}" text-anchor="middle" font-size="8" fill="${c.c}" font-weight="bold" font-family="monospace">${c.n}</text>`
    s+=`<text x="${cx+28}" y="${cy2+23}" text-anchor="middle" font-size="6" fill="#666" font-family="monospace">${c.t}</text>`})

  // ─── WEAPONS PANEL ───
  py=158
  s+=`<rect x="10" y="${py}" width="250" height="${wpns.length*18+20}" rx="4" fill="#14141f" stroke="#d4af3722"/>`
  s+=`<text x="20" y="${py+14}" font-size="8" fill="#888" font-family="monospace">WEAPONS</text>`
  wpns.forEach((w,i)=>{const wy=py+22+i*18
    s+=`<text x="20" y="${wy+11}" font-size="8" fill="${w.c}" font-weight="bold" font-family="monospace">${w.n}</text>`
    s+=bar(90,wy,130,13,Math.min(1,w.d/200),w.c)
    s+=`<text x="226" y="${wy+11}" font-size="8" fill="#d4af37" font-family="monospace">${w.d}${w.d>=1000?'💀':''}</text>`})

  // ─── MAPS PANEL ───
  const mpY=158
  s+=`<rect x="268" y="${mpY}" width="242" height="${maps.length*18+20}" rx="4" fill="#14141f" stroke="#d4af3722"/>`
  s+=`<text x="278" y="${mpY+14}" font-size="8" fill="#888" font-family="monospace">MAPS</text>`
  maps.forEach((m,i)=>{const my=mpY+22+i*18
    s+=`<rect x="278" y="${my}" width="222" height="14" rx="2" fill="#1a1a2a"/>`
    s+=`<text x="284" y="${my+11}" font-size="8" fill="#d4af37" font-weight="bold" font-family="monospace">${m.n}</text>`
    s+=`<text x="360" y="${my+11}" font-size="7" fill="#666" font-family="monospace">${m.t} · ${m.s}</text>`})

  // ─── LABEL DISTRIBUTION ───
  py=300
  const labelArr=Object.entries(labels).sort((a,b)=>b[1]-a[1]).slice(0,6)
  const maxL=Math.max(1,...labelArr.map(l=>l[1]))
  s+=`<rect x="10" y="${py}" width="${W-20}" height="${labelArr.length*16+22}" rx="4" fill="#14141f" stroke="#d4af3722"/>`
  s+=`<text x="20" y="${py+14}" font-size="8" fill="#888" font-family="monospace">TAG DB · LABELS</text>`
  const lColors=['#d4af37','#ff4444','#4488ff','#44ff88','#aa44ff','#44ddaa']
  labelArr.forEach(([name,count],i)=>{const ly=py+22+i*16
    s+=`<text x="20" y="${ly+10}" font-size="7" fill="#aaa" font-family="monospace">${name.substring(0,20)}</text>`
    s+=bar(140,ly,310,12,count/maxL,lColors[i%lColors.length])
    s+=`<text x="${460}" y="${ly+10}" font-size="8" fill="#d4af37" font-family="monospace">${count}</text>`})

  // ─── COMMITS ───
  py=300+Math.max(labelArr.length,1)*16+32
  s+=`<rect x="10" y="${py}" width="${W-20}" height="${cArr.length*14+22}" rx="4" fill="#14141f" stroke="#d4af3722"/>`
  s+=`<text x="20" y="${py+14}" font-size="8" fill="#888" font-family="monospace">RECENT COMMITS</text>`
  cArr.forEach((c,i)=>{const cy=py+24+i*14
    const sha=(c.sha||'').substring(0,7),msg=(c.commit?.message||'').split('\n')[0].substring(0,45)
    s+=`<text x="20" y="${cy}" font-size="7" fill="#44ddaa" font-family="monospace">${sha}</text>`
    s+=`<text x="70" y="${cy}" font-size="7" fill="#ccc" font-family="monospace">${msg}</text>`})

  // ─── NETWORK DIAGRAM ───
  py=py+cArr.length*14+32
  s+=`<rect x="10" y="${py}" width="${W-20}" height="80" rx="4" fill="#14141f" stroke="#d4af3722"/>`
  s+=`<text x="20" y="${py+14}" font-size="8" fill="#888" font-family="monospace">KQTT P2P NETWORK</text>`
  const hub={x:W/2,y:py+50}
  s+=`<circle cx="${hub.x}" cy="${hub.y}" r="8" fill="none" stroke="#44ddaa" stroke-width="2"><animate attributeName="r" values="6;10;6" dur="3s" repeatCount="indefinite"/></circle>`
  s+=`<text x="${hub.x}" y="${hub.y+3}" text-anchor="middle" font-size="6" fill="#44ddaa" font-family="monospace">HUB</text>`
  const peers=[{x:80,y:py+40,n:'A'},{x:180,y:py+65,n:'B'},{x:340,y:py+35,n:'C'},{x:440,y:py+60,n:'D'}]
  peers.forEach(p=>{
    s+=`<line x1="${p.x}" y1="${p.y}" x2="${hub.x}" y2="${hub.y}" stroke="#44ddaa" stroke-width="1" stroke-dasharray="3" opacity=".3"><animate attributeName="opacity" values=".1;.5;.1" dur="${1.5+Math.random()}" repeatCount="indefinite"/></line>`
    s+=`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#44ddaa" opacity=".5"/>`
    s+=`<text x="${p.x}" y="${p.y+12}" text-anchor="middle" font-size="6" fill="#666" font-family="monospace">${p.n}</text>`})
  s+=`<text x="${W/2}" y="${py+75}" text-anchor="middle" font-size="7" fill="#555" font-family="monospace">0 servers · WebRTC · DHT discovery</text>`

  // ─── FOOTER ───
  py=py+90
  s+=`<text x="${W/2}" y="${py}" text-anchor="middle" font-size="7" fill="#444" font-family="monospace">konomi systems · no servers no rules no pants</text>`

  const finalH=py+10
  const out=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${finalH}" viewBox="0 0 ${W} ${finalH}">\n${s}\n</svg>`
  fs.writeFileSync(path.join(OUT,'dashboard.svg'),out)
  console.log(`dashboard.svg ${W}x${finalH}`)

  // ═══ HEARTBEAT BADGE (tiny) ═══
  const hb=`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20" viewBox="0 0 120 20">
<rect width="120" height="20" rx="3" fill="#14141f"/>
<circle cx="10" cy="10" r="4" fill="#0f0"><animate attributeName="r" values="3;5;3" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values=".5;1;.5" dur="1.5s" repeatCount="indefinite"/></circle>
<text x="20" y="14" font-size="10" fill="#0f0" font-family="monospace">alive</text>
<text x="55" y="14" font-size="9" fill="#d4af37" font-family="monospace">⭐${stars} 🍴${forks}</text>
</svg>`
  fs.writeFileSync(path.join(OUT,'heartbeat.svg'),hb)
  console.log('heartbeat.svg')
  console.log('heartbeat.json')
  console.log(`\n${Object.keys(labels).length} labels, ${iss.length} issues, ${cArr.length} commits`)
}
main().catch(e=>console.error(e))
