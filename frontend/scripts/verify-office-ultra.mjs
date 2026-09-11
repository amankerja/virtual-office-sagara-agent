import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
const browser=await chromium.launch({channel:'chrome',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:1000}})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
await page.goto('http://localhost:5173/.verification/index.html?quality=ultra',{waitUntil:'domcontentloaded'})
await page.waitForFunction(()=>window.__getStore?.()?.controls)
await page.waitForTimeout(3500)
await page.screenshot({path:'docs/verification-office-3d/ultra-dark.png'})
await page.evaluate(()=>window.__fixture.setDark(false));await page.waitForTimeout(1500)
await page.screenshot({path:'docs/verification-office-3d/ultra-light.png'})
await page.getByRole('button',{name:'Command',exact:true}).click();await page.waitForTimeout(1800)
await page.screenshot({path:'docs/verification-office-3d/command-detail.png'})
const hdr=await page.evaluate(()=>{
  const {scene}=window.__getStore();let hdrMaterials=0
  scene.traverse(o=>{if(o.material?.emissiveIntensity>=4 && !o.material.toneMapped)hdrMaterials++})
  return hdrMaterials
})
assert.ok(hdr>0)
await page.evaluate(()=>window.__fixture.setQuality('balanced'));await page.waitForTimeout(800)
const toneMapping=await page.evaluate(()=>window.__getStore().gl.toneMapping)
assert.equal(toneMapping,4,'ACESFilmicToneMapping must be restored after leaving ultra')
assert.deepEqual(errors,[])
const result={passed:true,hdrMaterials:hdr,restoredToneMapping:toneMapping,errors}
console.log(JSON.stringify(result,null,2))
await writeFile('docs/verification-office-3d/ultra.json',JSON.stringify(result,null,2))
await browser.close()
