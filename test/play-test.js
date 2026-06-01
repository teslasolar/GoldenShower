/**
 * GOLDEN SHOWER — Playwright Play Test
 * Opens the lobby, enters, moves around, shoots, verifies bots exist
 * Run: node test/play-test.js [url]
 */
let chromium
try{({chromium}=require('playwright'))}catch(e){({chromium}=require('playwright-core'))}
const URL=process.argv[2]||'http://localhost:5510/goldenshower/index.html'

async function main(){
  console.log('\n🔫 GOLDEN SHOWER — Play Test\n')
  console.log(`URL: ${URL}`)

  const browser=await chromium.launch({headless:false,args:['--disable-blink-features=AutomationControlled']})
  const page=await browser.newPage({viewport:{width:1280,height:720}})
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))

  // Load
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:15000})
  await page.waitForTimeout(2000)
  console.log('✓ Page loaded')

  // Click to enter lobby
  await page.click('#intro')
  await page.waitForTimeout(1000)
  console.log('✓ Entered lobby')

  // Check game state
  const state=await page.evaluate('({running,bots:BOTS.length,name:ME.name,x:ME.x,z:ME.z})')
  console.log(`✓ State: running=${state.running} bots=${state.bots} name=${state.name}`)

  // Simulate movement — WASD
  for(const key of['KeyW','KeyW','KeyW','KeyD','KeyD','KeyW']){
    await page.keyboard.down(key)
    await page.waitForTimeout(200)
    await page.keyboard.up(key)}
  const pos=await page.evaluate('({x:ME.x.toFixed(1),z:ME.z.toFixed(1)})')
  console.log(`✓ Moved to (${pos.x}, ${pos.z})`)

  // Simulate shooting
  for(let i=0;i<5;i++){
    await page.mouse.click(640,360)
    await page.waitForTimeout(150)}
  const shots=await page.evaluate('ME.shots')
  console.log(`✓ Fired ${shots} shots`)

  // Check bots are alive and moving
  await page.waitForTimeout(2000)
  const botState=await page.evaluate('BOTS.map(b=>({name:b.name,state:b.state,x:b.x.toFixed(1),z:b.z.toFixed(1)}))')
  botState.forEach(b=>console.log(`  🤖 ${b.name}: ${b.state} at (${b.x},${b.z})`))
  console.log(`✓ ${botState.length} bots active`)

  // Check blasts exist
  const blastCount=await page.evaluate('blasts.length')
  console.log(`✓ ${blastCount} active blasts`)

  // Screenshot
  await page.screenshot({path:'test/play-test-screenshot.png'})
  console.log('✓ Screenshot: test/play-test-screenshot.png')

  // Check for errors
  console.log(`\n  JS errors: ${errors.length}`)
  errors.slice(0,3).forEach(e=>console.log(`  ✗ ${e.substring(0,80)}`))

  const pass=errors.length===0&&state.running&&state.bots===4&&shots>=3
  console.log(`\n${pass?'✅ ALL PASS':'❌ ISSUES FOUND'}\n`)

  await page.waitForTimeout(3000)
  await browser.close()
  process.exit(pass?0:1)
}
main().catch(e=>{console.error(e);process.exit(1)})
