import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
const version = process.argv[2] || 'after'
const quality = process.argv[3] || 'balanced'
const name = quality === 'balanced' ? version : `${version}-${quality}`
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const requests = []; const errors = []
page.on('request', r => requests.push(r.url()))
page.on('pageerror', e => errors.push(e.message))
await page.goto(`http://localhost:5173/.verification/index.html?version=${version}&quality=${quality}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)
console.log(await page.locator('body').innerText())
async function measure() { return page.evaluate(async () => {
  const canvas = document.querySelector('canvas')
  const store = window.__getStore?.()
  if (!store) return { error: 'R3F store unavailable', canvas: Boolean(canvas) }
  const { gl } = store
  const ext = gl.getContext().getExtension('WEBGL_debug_renderer_info')
  const renderer = ext ? gl.getContext().getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'
  const times = []; const calls = []; const start = performance.now(); let last = start
  await new Promise(resolve => {
    function frame(now) {
      times.push(now - last); last = now; calls.push(gl.info.render.calls)
      if (now - start < 10000) requestAnimationFrame(frame); else resolve()
    }
    requestAnimationFrame(frame)
  })
  times.sort((a,b) => a-b)
  return { renderer, fps: times.length / ((last-start)/1000), p95Ms: times[Math.floor(times.length*.95)],
    drawCalls: Math.max(...calls), triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries,
    textures: gl.info.memory.textures, desks: window.__fixture.scene.desks.length,
    effectiveTier: document.body.innerText.match(/QUALITY: ([A-Z]+)/)?.[1] }
}) }
const result = await measure()
await mkdir('docs/verification-office-3d', { recursive: true })
await page.screenshot({ path: `docs/verification-office-3d/${name}-dark.png` })
await page.evaluate(() => window.__fixture?.setDark(false))
await page.waitForTimeout(1500)
await page.screenshot({ path: `docs/verification-office-3d/${name}-light.png` })
const light = await measure()
const report = { ...result, light, quality, errors, externalRequests: [...new Set(requests.filter(u => /^https?:/.test(u) && !u.startsWith('http://127.0.0.1') && !u.startsWith('http://localhost')))] }
await writeFile(`docs/verification-office-3d/${name}.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
