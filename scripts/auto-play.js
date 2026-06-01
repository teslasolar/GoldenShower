#!/usr/bin/env node
/**
 * GOLDEN SHOWER — Auto-Play Agent
 * Playwright bot that enters the game, plays autonomously, reports findings
 * Run: node scripts/auto-play.js [url] [duration_seconds]
 */
const {chromium}=require('playwright')
const URL=process.argv[2]||'http://localhost:5510/goldenshower/index.html'
const DURATION=parseInt(process.argv[3]||'30')

async function main(){
  console.log(`\n🤖 GOLDEN SHOWER Auto-Play Agent`)
  console.log(`URL: ${URL}`)
  console.log(`Duration: ${DURATION}s\n`)

  const browser=await chromium.launch({headless:false})
  const page=await browser.newPage({viewport:{width:1280,height:720}})

  // Inject browser agent
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:15000})
  await page.waitForTimeout(1000)
  await page.addScriptTag({path:'scripts/browser-agent.js'})
  console.log('✓ Browser agent injected')

  // Enter lobby
  await page.click('#intro')
  await page.waitForTimeout(500)
  console.log('✓ Entered lobby')

  // Auto-play loop
  const startTime=Date.now()
  let movePhase=0,shotsFired=0

  while((Date.now()-startTime)/1000<DURATION){
    // Random movement
    const moveKeys=['KeyW','KeyA','KeyS','KeyD']
    const key=moveKeys[movePhase%4]
    await page.keyboard.down(key)
    await page.waitForTimeout(300+Math.random()*500)
    await page.keyboard.up(key)

    // Random shooting
    if(Math.random()<.4){
      await page.mouse.click(640+Math.random()*200-100,360+Math.random()*100-50)
      shotsFired++}

    // Jump occasionally
    if(Math.random()<.1){
      await page.keyboard.down('Space')
      await page.waitForTimeout(100)
      await page.keyboard.up('Space')}

    // Look around
    await page.mouse.move(640+Math.random()*400-200,360+Math.random()*200-100)

    movePhase++

    // Status every 5 phases
    if(movePhase%5===0){
      const state=await page.evaluate('({x:ME.x.toFixed(1),z:ME.z.toFixed(1),shots:ME.shots,bots:BOTS.map(b=>b.state),blasts:blasts.length,errors:window.GS_AGENT?.report().errors||0})')
      const elapsed=((Date.now()-startTime)/1000).toFixed(0)
      console.log(`  [${elapsed}s] pos(${state.x},${state.z}) shots:${state.shots} blasts:${state.blasts} bots:${state.bots.join('/')} errors:${state.errors}`)}}

  // Final report
  const final=await page.evaluate('window.GS_AGENT?.report()')
  console.log(`\n📊 Final Report:`)
  console.log(`  Session: ${final?.sessionId}`)
  console.log(`  Errors: ${final?.errors}`)
  console.log(`  Shots: ${final?.shots}`)
  console.log(`  Bots: ${final?.bots}`)
  console.log(`  Uptime: ${final?.uptime}s`)

  // Screenshot
  await page.screenshot({path:'logs/auto-play-final.png'})
  console.log(`  Screenshot: logs/auto-play-final.png`)

  await page.waitForTimeout(2000)
  await browser.close()
  console.log(`\n✅ Auto-play complete (${DURATION}s)\n`)
}
main().catch(e=>{console.error(e);process.exit(1)})
