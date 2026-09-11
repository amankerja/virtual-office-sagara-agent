import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
const browser=await chromium.launch({channel:'chrome',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:1000}})
const results=[];const errors=[]
page.on('pageerror',e=>errors.push(e.message))
async function check(name,fn){try{const detail=await fn();results.push({name,passed:true,detail});console.log(`PASS ${name}`)}catch(e){results.push({name,passed:false,error:e.message});console.log(`FAIL ${name}: ${e.message}`)}}
await page.goto('http://localhost:5173/.verification/index.html',{waitUntil:'domcontentloaded'})
await page.waitForFunction(()=>window.__getStore?.()?.controls)
await check('sustained healthy FPS does not trigger fallback',async()=>{
  await page.waitForTimeout(20000)
  assert.ok((await page.locator('body').innerText()).includes('QUALITY: BALANCED'))
})
await check('sustained slow frames automatically downgrade; no oscillation',async()=>{
  await page.evaluate(()=>{
    window.__busy=true
    const deadline=performance.now()+12000
    function busy(){if(!window.__busy || performance.now()>deadline)return;const t=performance.now();while(performance.now()-t<65){};requestAnimationFrame(busy)}
    requestAnimationFrame(busy)
  })
  await page.waitForFunction(()=>document.body.innerText.includes('QUALITY: LOW (AUTO)'),{},{timeout:16000})
  await page.evaluate(()=>{window.__busy=false})
  await page.waitForTimeout(1500)
  assert.ok((await page.locator('body').innerText()).includes('QUALITY: LOW (AUTO)'))
})
await check('reduced-motion preset snaps without interpolation',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.getByRole('button',{name:'Command',exact:true}).click()
  const target=await page.evaluate(()=>window.__getStore().controls.target.toArray())
  assert.ok(Math.hypot(target[0]+9,target[1]-1.4,target[2]+4)<.01)
})
await check('delegation worker callback remains connected after layout update',async()=>{
  const point=await page.evaluate(()=>{
    const fixture=window.__fixture,scene=fixture.scene
    const cmd=scene.desks.find(d=>d.zone==='COMMAND') || scene.desks[0]
    const desk=scene.desks.find(d=>d.agentId!==cmd.agentId && d.zone==='DEV_ZONE')
    const worker={id:'verification-worker',delegationId:'verification-delegation',parentAgentId:desk.agentId,
      position:{x:0,y:0},state:'RUNNING',taskTitle:'Verification worker',startedAt:'2026-09-10T00:00:00Z'}
    fixture.setScene({...scene,workers:[worker]})
    return [-7.5-3.3+1.65,1.05,4.5+.5+.2]
  })
  await page.getByRole('button',{name:'Dev Zone',exact:true}).click();await page.waitForTimeout(700)
  const coords=await page.evaluate(point=>{
    const {camera,gl}=window.__getStore();const v=camera.position.clone().set(...point).project(camera)
    const r=gl.domElement.getBoundingClientRect();return {x:r.x+(v.x+1)*r.width/2,y:r.y+(1-v.y)*r.height/2}
  },point)
  await page.mouse.click(coords.x,coords.y)
  assert.ok((await page.evaluate(()=>window.__events)).some(e=>e.kind==='delegation' && e.id==='verification-delegation'))
})
await check('no runtime errors',async()=>assert.deepEqual(errors,[]))
await writeFile('docs/verification-office-3d/runtime.json',JSON.stringify({results,errors},null,2))
await browser.close()
if(results.some(r=>!r.passed))process.exitCode=1
