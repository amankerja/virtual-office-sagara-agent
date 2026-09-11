import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
const browser = await chromium.launch({channel:'chrome',headless:true})
const results=[]
for(const scenario of [
  {name:'production 2.5d excludes Three.js',url:'/office?view=2.5d'},
  {name:'production list excludes Three.js',url:'/office?view=list'},
  {name:'mobile defaults to 2.5d',url:'/office',mobile:true},
  {name:'no WebGL defaults to 2.5d',url:'/office',noWebGL:true},
  {name:'production balanced excludes postprocessing',url:'/office?view=3d',three:true},
]) {
  const page=await browser.newPage({viewport:{width:scenario.mobile?390:1440,height:1000},hasTouch:Boolean(scenario.mobile),isMobile:Boolean(scenario.mobile)})
  const requests=[];const errors=[]
  page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message))
  if(scenario.noWebGL)await page.addInitScript(()=>{
    const get=HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args)}
  })
  try {
    await page.goto(`http://127.0.0.1:4173${scenario.url}`,{waitUntil:'domcontentloaded'})
    await page.getByRole('button',{name:'Immersive 3D',exact:true}).waitFor()
    await page.waitForTimeout(2200)
    const immersive=requests.some(u=>/ImmersiveOffice3D.*\.js/.test(u))
    assert.equal(immersive,Boolean(scenario.three))
    assert.equal(requests.some(u=>/OfficePostProcessing.*\.js/.test(u)),false)
    assert.deepEqual(errors,[])
    if(scenario.three)assert.ok(await page.locator('canvas').count()>0)
    results.push({name:scenario.name,passed:true})
  } catch(e) {results.push({name:scenario.name,passed:false,error:e.message,errors})}
  await page.close()
}
console.log(JSON.stringify(results,null,2))
await writeFile('docs/verification-office-3d/routes.json',JSON.stringify(results,null,2))
await browser.close()
if(results.some(r=>!r.passed))process.exitCode=1
