/**
 * GOLDEN SHOWER — Unit Tests
 * Tests game data, markdown docs, and rebrand compliance
 */
const fs=require('fs'),path=require('path')
let pass=0,fail=0
function test(name,fn){try{fn();pass++;console.log(`  ✓ ${name}`)}catch(e){fail++;console.error(`  ✗ ${name}: ${e.message}`)}}
function eq(a,b){if(a!==b)throw new Error(`expected ${b}, got ${a}`)}
function ok(v,msg){if(!v)throw new Error(msg||'assertion failed')}

console.log('\n🔫 GOLDEN SHOWER — Unit Tests\n')

// ═══ DOC STRUCTURE ═══
console.log('  Docs:')
test('characters dir exists',()=>ok(fs.existsSync('docs/golden-shower/characters')))
test('weapons dir exists',()=>ok(fs.existsSync('docs/golden-shower/weapons')))
test('maps dir exists',()=>ok(fs.existsSync('docs/golden-shower/maps')))
test('engine dir exists',()=>ok(fs.existsSync('docs/golden-shower/engine')))
test('multiplayer dir exists',()=>ok(fs.existsSync('docs/golden-shower/multiplayer')))

const chars=fs.readdirSync('docs/golden-shower/characters').filter(f=>f.endsWith('.md')&&!f.startsWith('_'))
test(`8 character files (got ${chars.length})`,()=>eq(chars.length,8))

const weapons=fs.readdirSync('docs/golden-shower/weapons').filter(f=>f.endsWith('.md')&&!f.startsWith('_'))
test(`7 weapon files (got ${weapons.length})`,()=>eq(weapons.length,7))

const maps=fs.readdirSync('docs/golden-shower/maps').filter(f=>f.endsWith('.md')&&!f.startsWith('_'))
test(`6 map files (got ${maps.length})`,()=>eq(maps.length,6))

// ═══ MARKDOWN RUNNER ═══
console.log('\n  Core:')
test('markdown-runner.js exists',()=>ok(fs.existsSync('core/markdown-runner.js')))
test('index.html exists',()=>ok(fs.existsSync('index.html')))
test('game index exists',()=>ok(fs.existsSync('docs/golden-shower/index.html')))

// ═══ REBRAND COMPLIANCE ═══
console.log('\n  Rebrand:')
const BANNED=['James Bond','007 -','GoldenEye 007','Rare Ltd','Nintendo','MI6','Q Branch']
test('REBRAND.md exists',()=>ok(fs.existsSync('REBRAND.md')))
test('README has no banned IP',()=>{
  const readme=fs.readFileSync('README.md','utf8')
  BANNED.forEach(term=>ok(!readme.includes(term),`README contains "${term}"`))})

// ═══ PACKAGE ═══
console.log('\n  Package:')
test('package.json valid',()=>{const p=JSON.parse(fs.readFileSync('package.json','utf8'));ok(p.name==='goldenshower')})
test('package has test script',()=>{const p=JSON.parse(fs.readFileSync('package.json','utf8'));ok(p.scripts.test)})

// ═══ KQTT ═══
console.log('\n  KQTT:')
test('kqtt docs exist',()=>ok(fs.existsSync('docs/golden-shower/multiplayer/kqtt')))
const kqttFiles=fs.readdirSync('docs/golden-shower/multiplayer/kqtt').filter(f=>f.endsWith('.md'))
test(`kqtt has ${kqttFiles.length} docs`,()=>ok(kqttFiles.length>=5))

// ═══ RESULTS ═══
console.log(`\n  ${pass} passed, ${fail} failed\n`)
process.exit(fail?1:0)
