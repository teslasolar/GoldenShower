#!/usr/bin/env node
/**
 * GOLDEN SHOWER — Dynamic SVG Generator
 * Reads GitHub Issues as Tag DB, generates live SVG dashboard
 * Run: GH_TOKEN=xxx node scripts/gen-svg.js
 * Output: .github/badges/*.svg
 */
const https=require('https'),fs=require('fs'),path=require('path')
const REPO='teslasolar/goldenshower'
const OUT=path.join(__dirname,'..','badges')

function api(endpoint){return new Promise((ok,no)=>{
  const opts={hostname:'api.github.com',path:endpoint,headers:{'User-Agent':'gs-ci','Accept':'application/vnd.github.v3+json'}}
  if(process.env.GH_TOKEN)opts.headers.Authorization='token '+process.env.GH_TOKEN
  https.get(opts,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
    try{ok(JSON.parse(d))}catch(e){ok([])}})}).on('error',()=>ok([]))})}

function svg(w,h,body){return`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<style>text{font-family:Consolas,monospace;fill:#e0e0e0}
.bg{fill:#0a0a1a;rx:8}.gold{fill:#d4af37}.dim{fill:#666}.bar{rx:2}
.red{fill:#ff4444}.blue{fill:#4488ff}.green{fill:#44ff88}.purple{fill:#aa44ff}.cyan{fill:#44ddaa}</style>
<rect class="bg" width="${w}" height="${h}"/>${body}</svg>`}

function bar(x,y,w,h,pct,cls){return`<rect class="bar ${cls}" x="${x}" y="${y}" width="${Math.max(1,w*pct)}" height="${h}" opacity=".7"/><rect class="bar" x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#333" stroke-width="1"/>`}

async function main(){
  fs.mkdirSync(OUT,{recursive:true})
  const [issues,repo,commits]=await Promise.all([
    api(`/repos/${REPO}/issues?state=all&per_page=100`),
    api(`/repos/${REPO}`),
    api(`/repos/${REPO}/commits?per_page=10`)])

  const open=Array.isArray(issues)?issues.filter(i=>i.state==='open'&&!i.pull_request):[]
  const closed=Array.isArray(issues)?issues.filter(i=>i.state==='closed'&&!i.pull_request):[]
  const prs=Array.isArray(issues)?issues.filter(i=>i.pull_request):[]
  const labels={};(Array.isArray(issues)?issues:[]).forEach(i=>(i.labels||[]).forEach(l=>{labels[l.name]=(labels[l.name]||0)+1}))
  const stars=repo.stargazers_count||0,forks=repo.forks_count||0,watchers=repo.watchers_count||0
  const recentCommits=Array.isArray(commits)?commits.slice(0,8):[]

  // ═══ MAIN DASHBOARD SVG ═══
  const dw=480,dh=320
  let dash=''
  dash+=`<text x="240" y="24" text-anchor="middle" font-size="14" class="gold" font-weight="bold">🔫 GOLDEN SHOWER · LIVE DASHBOARD</text>`
  dash+=`<line x1="20" y1="32" x2="460" y2="32" stroke="#333"/>`
  // stats row
  const stats=[['⭐',stars,'Stars'],['🍴',forks,'Forks'],['👁',watchers,'Watch'],['📋',open.length,'Open'],['✅',closed.length,'Closed'],['🔀',prs.length,'PRs']]
  stats.forEach(([emoji,val,label],i)=>{const bx=25+i*76
    dash+=`<text x="${bx}" y="55" font-size="11">${emoji}</text>`
    dash+=`<text x="${bx+16}" y="55" font-size="13" class="gold" font-weight="bold">${val}</text>`
    dash+=`<text x="${bx}" y="68" font-size="8" class="dim">${label}</text>`})
  dash+=`<line x1="20" y1="76" x2="460" y2="76" stroke="#222"/>`
  // label distribution
  dash+=`<text x="25" y="94" font-size="10" class="dim">LABEL DISTRIBUTION</text>`
  const labelArr=Object.entries(labels).sort((a,b)=>b[1]-a[1]).slice(0,8)
  const maxLabel=Math.max(1,...labelArr.map(l=>l[1]))
  const colors=['gold','red','blue','green','purple','cyan','gold','red']
  labelArr.forEach(([name,count],i)=>{const by=102+i*20
    dash+=`<text x="25" y="${by+11}" font-size="9" class="dim">${name.substring(0,16)}</text>`
    dash+=bar(130,by,280,14,count/maxLabel,colors[i%colors.length])
    dash+=`<text x="${415}" y="${by+11}" font-size="9" class="gold">${count}</text>`})
  // recent commits
  const cy=102+Math.max(labelArr.length,1)*20+10
  dash+=`<line x1="20" y1="${cy-4}" x2="460" y2="${cy-4}" stroke="#222"/>`
  dash+=`<text x="25" y="${cy+10}" font-size="10" class="dim">RECENT COMMITS</text>`
  recentCommits.slice(0,5).forEach((c,i)=>{const yy=cy+22+i*16
    const msg=(c.commit?.message||'').split('\n')[0].substring(0,50)
    const sha=(c.sha||'').substring(0,7)
    const author=c.commit?.author?.name||'?'
    dash+=`<text x="25" y="${yy}" font-size="8" class="cyan">${sha}</text>`
    dash+=`<text x="75" y="${yy}" font-size="8">${msg}</text>`
    dash+=`<text x="420" y="${yy}" font-size="7" class="dim">${author.substring(0,10)}</text>`})
  fs.writeFileSync(path.join(OUT,'dashboard.svg'),svg(dw,dh,dash))
  console.log(`dashboard.svg (${dw}x${dh})`)

  // ═══ CHARACTERS SVG ═══
  const chars=[
    {name:'Auric',color:'#d4af37',trait:'Balanced'},
    {name:'Janus',color:'#c0c0c0',trait:'Mirror'},
    {name:'Cipher',color:'#44ddaa',trait:'Hacker'},
    {name:'Colossus',color:'#aaaacc',trait:'Tank'},
    {name:'Imp',color:'#333',trait:'Speed'},
    {name:'Viper',color:'#ff4444',trait:'Aggro'},
    {name:'Mayday',color:'#aa44ff',trait:'Heavy'},
    {name:'Samedi',color:'#ffffff',trait:'Undead'}]
  let charSvg=`<text x="200" y="20" text-anchor="middle" font-size="12" class="gold" font-weight="bold">CHARACTERS</text>`
  chars.forEach((c,i)=>{const cx2=25+(i%4)*100,cy2=35+Math.floor(i/4)*55
    charSvg+=`<rect x="${cx2}" y="${cy2}" width="90" height="45" rx="4" fill="${c.color}" opacity=".15" stroke="${c.color}" stroke-width="1" stroke-opacity=".4"/>`
    charSvg+=`<text x="${cx2+45}" y="${cy2+20}" text-anchor="middle" font-size="10" font-weight="bold" fill="${c.color}">${c.name}</text>`
    charSvg+=`<text x="${cx2+45}" y="${cy2+35}" text-anchor="middle" font-size="8" class="dim">${c.trait}</text>`})
  fs.writeFileSync(path.join(OUT,'characters.svg'),svg(400,150,charSvg))
  console.log('characters.svg')

  // ═══ WEAPONS SVG ═══
  const wpns=[{n:'Unarmed',d:10,c:'#888'},{n:'Sidearm',d:25,c:'#aaa'},{n:'Carbine',d:15,c:'#4488ff'},
    {n:'Shotgun',d:80,c:'#ff8844'},{n:'Marksman',d:80,c:'#44ff88'},{n:'Launcher',d:150,c:'#ff4444'},
    {n:'Gilded',d:1000,c:'#d4af37'}]
  let wpnSvg=`<text x="200" y="20" text-anchor="middle" font-size="12" class="gold" font-weight="bold">WEAPONS</text>`
  wpns.forEach((w,i)=>{const wy=30+i*22
    wpnSvg+=`<text x="25" y="${wy+14}" font-size="9" fill="${w.c}" font-weight="bold">${w.n}</text>`
    wpnSvg+=bar(100,wy+2,250,14,Math.min(1,w.d/200),'gold')
    wpnSvg+=`<text x="${360}" y="${wy+14}" font-size="9" class="gold">${w.d}${w.d>=1000?'💀':''}</text>`})
  fs.writeFileSync(path.join(OUT,'weapons.svg'),svg(400,190,wpnSvg))
  console.log('weapons.svg')

  // ═══ MAPS SVG ═══
  const maps=[{n:'Refinery',sz:'Med',t:'Industrial'},{n:'Shrine',sz:'Lrg',t:'Stone'},
    {n:'Tower',sz:'Sml',t:'Vertical'},{n:'Labyrinth',sz:'Med',t:'Corridors'},
    {n:'Archive',sz:'Lrg',t:'Multi-floor'},{n:'Vault',sz:'Med',t:'Underground'}]
  let mapSvg=`<text x="200" y="20" text-anchor="middle" font-size="12" class="gold" font-weight="bold">MAPS</text>`
  maps.forEach((m,i)=>{const mx=20+(i%3)*130,my=30+Math.floor(i/3)*50
    mapSvg+=`<rect x="${mx}" y="${my}" width="120" height="40" rx="4" fill="#14141f" stroke="#d4af37" stroke-width="1" stroke-opacity=".3"/>`
    mapSvg+=`<text x="${mx+60}" y="${my+18}" text-anchor="middle" font-size="10" class="gold" font-weight="bold">${m.n}</text>`
    mapSvg+=`<text x="${mx+60}" y="${my+32}" text-anchor="middle" font-size="8" class="dim">${m.t} · ${m.sz}</text>`})
  fs.writeFileSync(path.join(OUT,'maps.svg'),svg(400,130,mapSvg))
  console.log('maps.svg')

  // ═══ KQTT NETWORK SVG ═══
  let netSvg=`<text x="200" y="20" text-anchor="middle" font-size="12" class="gold" font-weight="bold">KQTT P2P NETWORK</text>`
  netSvg+=`<text x="200" y="55" text-anchor="middle" font-size="24" class="cyan">◉</text>`
  netSvg+=`<text x="200" y="75" text-anchor="middle" font-size="9" class="dim">WebRTC DataChannel</text>`
  const nodes=[{x:60,y:50,l:'Player A'},{x:340,y:50,l:'Player B'},{x:100,y:100,l:'Player C'},{x:300,y:100,l:'Player D'}]
  nodes.forEach(n=>{netSvg+=`<circle cx="${n.x}" cy="${n.y}" r="12" fill="none" stroke="#44ddaa" stroke-width="1" opacity=".6"/>`
    netSvg+=`<line x1="${n.x}" y1="${n.y}" x2="200" y2="55" stroke="#44ddaa" stroke-width="1" opacity=".2" stroke-dasharray="4"/>`
    netSvg+=`<text x="${n.x}" y="${n.y+28}" text-anchor="middle" font-size="7" class="dim">${n.l}</text>`})
  netSvg+=`<text x="200" y="130" text-anchor="middle" font-size="8" class="dim">0 servers · DHT discovery · 20Hz state sync</text>`
  fs.writeFileSync(path.join(OUT,'network.svg'),svg(400,145,netSvg))
  console.log('network.svg')

  console.log(`\nGenerated 5 SVGs in ${OUT}/`)
}
main().catch(e=>console.error(e))
