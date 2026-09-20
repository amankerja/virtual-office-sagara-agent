import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// GPU render targets belong to a renderer/context. Cache once per renderer, including
// StrictMode remounts; never share a render target between unrelated WebGL contexts.
const environments = new WeakMap<THREE.WebGLRenderer, THREE.WebGLRenderTarget>()
export function getRoomEnvironment(renderer: THREE.WebGLRenderer) {
  let target = environments.get(renderer)
  if (!target) {
    const room = new RoomEnvironment()
    const generator = new THREE.PMREMGenerator(renderer)
    try {
      target = generator.fromScene(room, 0.04, 0.1, 100, { size: 128 })
      environments.set(renderer, target)
    } finally {
      room.dispose()
      generator.dispose()
    }
  }
  return target.texture
}

export function releaseRoomEnvironment(renderer: THREE.WebGLRenderer) {
  environments.get(renderer)?.dispose()
  environments.delete(renderer)
}

// Neutral luminance variation; palette tokens supply all hue. No canvas, fetch or RNG.
const noiseData = new Uint8Array(128 * 128 * 4)
let seed = 137
for (let i = 0; i < noiseData.length; i += 4) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  const shade = 237 + (seed % 19)
  noiseData[i] = noiseData[i + 1] = noiseData[i + 2] = shade
  noiseData[i + 3] = 255
}
export const surfaceNoise = new THREE.DataTexture(noiseData, 128, 128)
surfaceNoise.wrapS = surfaceNoise.wrapT = THREE.RepeatWrapping
surfaceNoise.repeat.set(8, 8)
surfaceNoise.magFilter = THREE.LinearFilter
surfaceNoise.minFilter = THREE.LinearMipmapLinearFilter
surfaceNoise.generateMipmaps = true
surfaceNoise.needsUpdate = true

export function generateWoodFloorTexture(): THREE.CanvasTexture {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return new THREE.CanvasTexture(null as unknown as HTMLCanvasElement)
  }
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#8b5e3c'
    ctx.fillRect(0, 0, 512, 512)

    const plankHeight = 32
    const plankColors = ['#a67c52', '#8b5e3c', '#9c6f46', '#b88a5c', '#7c5030']

    for (let y = 0; y < 512; y += plankHeight) {
      const color = plankColors[Math.floor(y / plankHeight) % plankColors.length]
      ctx.fillStyle = color
      ctx.fillRect(0, y, 512, plankHeight - 2)

      ctx.fillStyle = '#4a2f19'
      ctx.fillRect(0, y + plankHeight - 2, 512, 2)

      const shift = ((Math.floor(y / plankHeight)) % 3) * 128
      for (let x = shift; x < 512; x += 256) {
        ctx.fillRect(x, y, 2, plankHeight - 2)
      }

      ctx.fillStyle = 'rgba(74, 47, 25, 0.12)'
      for (let g = 0; g < 6; g++) {
        const gy = y + 4 + g * 4
        ctx.fillRect(0, gy, 512, 1)
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(12, 10)
  texture.needsUpdate = true
  return texture
}

export const woodFloorTexture = generateWoodFloorTexture()

const constructors = {
  box: THREE.BoxGeometry, plane: THREE.PlaneGeometry, cylinder: THREE.CylinderGeometry,
  ring: THREE.RingGeometry, sphere: THREE.SphereGeometry, circle: THREE.CircleGeometry,
  dodecahedron: THREE.DodecahedronGeometry, octahedron: THREE.OctahedronGeometry,
}
const geometries = new Map<string, THREE.BufferGeometry>()
export function getGeometry(kind: keyof typeof constructors, args: number[]) {
  const key = `${kind}:${args.join(',')}`
  let geometry = geometries.get(key)
  if (!geometry) {
    const Constructor = constructors[kind]
    geometry = new Constructor(...args)
    geometries.set(key, geometry)
  }
  return geometry
}
export type MaterialProps = THREE.MeshPhysicalMaterialParameters & { kind?: 'standard' | 'physical' | 'basic' }
export const materials = new Map<string, THREE.Material>()
