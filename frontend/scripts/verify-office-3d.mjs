import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const results = []; const errors = []; const requests = []
page.on('pageerror', e => errors.push(e.message))
page.on('request', r => requests.push(r.url()))
const pause = ms => page.waitForTimeout(ms)
const state = () => page.evaluate(() => {
  const { camera, controls, scene, gl } = window.__getStore()
  return { position: camera.position.toArray(), target: controls.target.toArray(), distance: controls.getDistance(),
    fov: camera.fov, env: scene.environment?.uuid, fog: scene.fog?.color.getHexString(),
    lights: scene.children.flatMap(function visit(o) { return [o, ...o.children.flatMap(visit)] }).filter(o => o.isLight).length,
    shadows: gl.shadowMap.enabled, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures }
})
const delta = (a, b) => Math.hypot(...a.map((v,i) => v-b[i]))
async function check(name, fn) {
  try { const detail = await fn(); results.push({ name, passed: true, detail }); console.log(`PASS ${name}`) }
  catch(e) { results.push({ name, passed: false, error: e.message }); console.log(`FAIL ${name}: ${e.message}`) }
}
await page.goto('http://localhost:5173/.verification/index.html', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => window.__getStore?.()?.controls)
await pause(4000)

await check('balanced: four lights, shadows, no postprocessing import', async () => {
  assert.equal((await state()).lights, 4)
  assert.equal((await state()).shadows, true)
  assert.equal(requests.some(u => /OfficePostProcessing|react-three_postprocessing/.test(u)), false)
})
await check('all seven presets and FOV', async () => {
  for (const [label, target, fov] of [
    ['Overview',[-1,.5,-1],40],['Command',[-9,1.4,-4],36],['Dev Zone',[-7,1.2,4],38],
    ['Specialist',[7,1.2,4],38],['Approval',[0,1.5,-4],34],['Server Room',[9,1.4,-4.5],35],['Vault',[0,1.2,-8.5],34],
  ]) {
    await page.getByRole('button',{name:label,exact:true}).click(); await pause(1700)
    const s=await state(); assert.ok(delta(s.target,target)<.03,label); assert.equal(s.fov,fov)
  }
})
await check('zoom buttons persist, clamp 6..48, repeated reset works', async () => {
  await page.getByRole('button',{name:'Reset view',exact:true}).click(); await pause(1700)
  const initial=await state()
  await page.getByRole('button',{name:'Zoom in',exact:true}).click(); await pause(500)
  const zoomed=await state(); assert.ok(zoomed.distance<initial.distance*.9)
  await pause(1200); assert.ok(Math.abs((await state()).distance-zoomed.distance)<.02)
  for(let i=0;i<15;i++) await page.getByRole('button',{name:'Zoom in',exact:true}).click()
  assert.ok(Math.abs((await state()).distance-6)<.02)
  for(let i=0;i<22;i++) await page.getByRole('button',{name:'Zoom out',exact:true}).click()
  assert.ok(Math.abs((await state()).distance-48)<.02)
  await page.getByRole('button',{name:'Reset view',exact:true}).click();await pause(1700)
  assert.ok(delta((await state()).target,[-1,.5,-1])<.03)
})
await check('on-screen pan all directions and bounds preserve camera offset', async () => {
  for(const name of ['Pan left','Pan right','Pan up','Pan down']) {
    const before=await state();await page.getByRole('button',{name,exact:true}).click();await pause(120)
    assert.ok(delta((await state()).target,before.target)>.1,name)
  }
  await page.evaluate(() => {
    const {controls,camera}=window.__getStore()
    controls.target.set(200,30,-200);camera.position.copy(controls.target).add({x:8,y:10,z:8})
  });await pause(120)
  const s=await state();assert.ok(s.target[0]<=15 && s.target[2]>=-11 && s.target[1]<=4)
  assert.ok(delta(s.position.map((v,i)=>v-s.target[i]),[8,10,8])<.1)
})
await check('mouse orbit, right drag pan and wheel zoom remain under user control', async () => {
  await page.getByRole('button',{name:'Reset view',exact:true}).click();await pause(1700)
  const before=await state()
  await page.mouse.move(700,300);await page.mouse.down();await page.mouse.move(840,360,{steps:12});await page.mouse.up();await pause(1000)
  const orbit=await state();assert.ok(delta(before.position,orbit.position)>1)
  await pause(1000);assert.ok(delta((await state()).position,orbit.position)<.1)
  await page.mouse.move(700,300);await page.mouse.down({button:'right'});await page.mouse.move(770,330,{steps:10});await page.mouse.up({button:'right'});await pause(800)
  assert.ok(delta((await state()).target,orbit.target)>.1)
  const preZoom=await state();await page.mouse.wheel(0,-200);await pause(700);assert.ok((await state()).distance<preZoom.distance)
})
await check('follow tracks exact workstation, Esc/F and manual exit retain behavior', async () => {
  await page.evaluate(() => window.__fixture.setFocused(window.__fixture.scene.desks[0].agentId));await pause(150)
  await page.getByRole('button',{name:/^Follow /}).click();await pause(1700)
  assert.ok(delta((await state()).target,[-8.5,1.2,-3])<.03)
  await page.keyboard.press('Escape');await pause(1700);assert.ok(delta((await state()).target,[-1,.5,-1])<.03)
  await page.getByRole('button',{name:/^Follow /}).click();await pause(1000)
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();await pause(400)
  await page.getByRole('button',{name:/^Follow /}).waitFor()
  await page.keyboard.press('f');await pause(1700);assert.ok(delta((await state()).target,[-1,.5,-1])<.03)
})

async function clickWorld(point, hover=false) {
  const coords=await page.evaluate(point=>{
    const {camera,gl}=window.__getStore();const projected=camera.position.clone().set(...point).project(camera)
    const r=gl.domElement.getBoundingClientRect()
    return {x:r.x+(projected.x+1)*r.width/2,y:r.y+(1-projected.y)*r.height/2}
  },point)
  await page.mouse.move(coords.x,coords.y);if(!hover)await page.mouse.click(coords.x,coords.y);await pause(150)
}
await check('agent select and hover callbacks', async()=>{
  await page.getByRole('button',{name:'Command',exact:true}).click();await pause(1700)
  await page.evaluate(()=>{window.__events=[]})
  await clickWorld([-8.5,1.45,-3],true);await clickWorld([-8.5,1.45,-3])
  const ev=await page.evaluate(()=>window.__events)
  assert.ok(ev.some(e=>e.kind==='hover' && e.id));assert.ok(ev.some(e=>e.kind==='agent'))
  await page.mouse.move(5,5);await pause(100)
  assert.ok((await page.evaluate(()=>window.__events)).some(e=>e.kind==='hover' && e.id===null))
})
await check('approval, instanced server rack and vault callbacks', async()=>{
  for(const [label,kind,point] of [['Approval','approval',[0,1,-4]],['Server Room','server',[7.3,1.5,-5.3]],['Vault','vault',[0,.7,-8.05]]]) {
    await page.getByRole('button',{name:label,exact:true}).click();await pause(1700)
    await page.evaluate(()=>{window.__events=[]});await clickWorld(point)
    assert.ok((await page.evaluate(()=>window.__events)).some(e=>e.kind===kind),kind)
  }
})
await check('dark/light switch reuses environment and updates fog', async()=>{
  const before=await state();await page.evaluate(()=>window.__fixture.setDark(false));await pause(500)
  const after=await state();assert.equal(after.env,before.env);assert.notEqual(after.fog,before.fog)
})
await check('low: only two lights, no shadow maps or contact passes', async()=>{
  await page.evaluate(()=>window.__fixture.setQuality('low'));await pause(1200)
  const s=await state();assert.equal(s.lights,2);assert.equal(s.shadows,false)
})
await check('desktop ultra loads isolated effects; leaving ultra disables them', async()=>{
  await page.evaluate(()=>window.__fixture.setQuality('ultra'));await pause(2500)
  assert.ok(requests.some(u=>u.includes('OfficePostProcessing')))
  assert.equal((await state()).lights,6)
  await page.screenshot({path:'docs/verification-office-3d/ultra-light.png'})
  await page.evaluate(()=>window.__fixture.setQuality('balanced'));await pause(1000)
  assert.equal((await state()).lights,4)
})
await check('remount restores shared geometry and procedural environment', async()=>{
  await page.evaluate(()=>window.__fixture.setMounted(false));await pause(300)
  await page.evaluate(()=>window.__fixture.setMounted(true));await pause(2200)
  assert.ok((await state()).env);assert.ok((await state()).geometries>0)
})

const touch = await browser.newPage({viewport:{width:820,height:1180},hasTouch:true,isMobile:true})
const touchRequests=[];touch.on('request',r=>touchRequests.push(r.url()));touch.on('pageerror',e=>errors.push(e.message))
await check('touch: one-finger rotate, two-finger pan/pinch; ultra capped on tablet', async()=>{
  await touch.goto('http://localhost:5173/.verification/index.html?quality=ultra',{waitUntil:'domcontentloaded'})
  await touch.waitForFunction(()=>window.__getStore?.()?.controls);await touch.waitForTimeout(2500)
  assert.equal(touchRequests.some(u=>u.includes('OfficePostProcessing')),false)
  const get=()=>touch.evaluate(()=>{const {controls,camera}=window.__getStore();return {p:camera.position.toArray(),t:controls.target.toArray(),d:controls.getDistance()}})
  const cdp=await touch.context().newCDPSession(touch)
  const send=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints})
  const before=await get()
  await send('touchStart',[{x:300,y:350,id:1}]);await send('touchMove',[{x:410,y:395,id:1}]);await send('touchEnd',[])
  await touch.waitForTimeout(700);const rotated=await get();assert.ok(delta(rotated.p,before.p)>1)
  await send('touchStart',[{x:270,y:350,id:1},{x:410,y:350,id:2}])
  await send('touchMove',[{x:330,y:400,id:1},{x:470,y:400,id:2}]);await send('touchEnd',[])
  await touch.waitForTimeout(700);const panned=await get();assert.ok(delta(panned.t,rotated.t)>.1)
  await send('touchStart',[{x:270,y:350,id:1},{x:410,y:350,id:2}])
  await send('touchMove',[{x:220,y:350,id:1},{x:460,y:350,id:2}]);await send('touchEnd',[])
  await touch.waitForTimeout(700);assert.ok((await get()).d<panned.d)
  await touch.screenshot({path:'docs/verification-office-3d/tablet.png'})
})
await check('no uncaught browser errors',async()=>assert.deepEqual(errors,[]))
await writeFile('docs/verification-office-3d/interactions.json',JSON.stringify({results,errors},null,2))
await browser.close()
if(results.some(r=>!r.passed))process.exitCode=1
