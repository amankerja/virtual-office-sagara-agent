import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

type Box = [number, number, number, number, number, number]
function mergeBoxes(boxes: Box[]) {
  const parts = boxes.map(([w, h, d, x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z))
  const merged = mergeGeometries(parts)!
  parts.forEach(part => part.dispose())
  return merged
}

export const WALL_GEOMETRY = mergeBoxes([
  // Main Office North Wall
  [30.4, 2.8, .3, 0, 1.4, -11.35],
  // Main Office West Wall
  [.3, 2.8, 22.4, -15.2, 1.4, 0],
  // Main Office South Wall
  [30.4, .9, .3, 0, .45, 11.25],
  // Main Office East Wall (North Segment)
  [.3, 2.8, 11.2, 15.2, 1.4, -5.6],
  // Main Office East Wall (South Segment)
  [.3, 2.8, 8.2, 15.2, 1.4, 7.1],
  // Main Office Skyway Lintel Header
  [.3, 0.6, 3.0, 15.2, 2.5, 1.5],

  // ── Annex Building Perimeter Walls ──
  // Annex West Wall (North Segment) — spans z=-6.5 to 0
  [.3, 2.8, 6.5, 17.25, 1.4, -3.25],
  // Annex West Wall (South Segment) — spans z=3.0 to 12.5
  [.3, 2.8, 9.5, 17.25, 1.4, 7.75],
  // Annex West Skyway Lintel Header
  [.3, 0.6, 3.0, 17.25, 2.5, 1.5],
  // Annex East Wall
  [.3, 2.8, 19.0, 29.75, 1.4, 3.0],
  // Annex North Wall
  [12.5, 2.8, .3, 23.5, 1.4, -6.5],
  // Annex South Wall
  [12.5, 2.8, .3, 23.5, 1.4, 12.5],
])

export const WALL_CAP_GEOMETRY = mergeBoxes([
  [30.4, .08, .4, 0, 2.82, -11.35],
  [.4, .08, 22.4, -15.2, 2.82, 0],
  [.4, .08, 22.4, 15.2, 2.82, 0],
  [30.4, .06, .38, 0, .92, 11.25],
  // Annex caps
  [12.5, .08, .4, 23.5, 2.82, -6.5],
  [12.5, .08, .4, 23.5, 2.82, 12.5],
  [.4, .08, 19.0, 29.75, 2.82, 3.0],
])

// ── Architectural Floor Tile Grid Lines (Main Office & Annex) ──
const gridLines = [
  // Main Office Z-grid lines (East-West lines)
  ...[-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10].map(z => new THREE.PlaneGeometry(30.4, 0.035).rotateX(-Math.PI / 2).translate(0, 0.013, z)),
  // Main Office X-grid lines (North-South lines)
  ...[-14, -12, -10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10, 12, 14].map(x => new THREE.PlaneGeometry(0.035, 22.4).rotateX(-Math.PI / 2).translate(x, 0.013, 0)),
  // Annex Building Z-grid lines
  ...[-5, -3, -1, 1, 3, 5, 7, 9, 11].map(z => new THREE.PlaneGeometry(12.5, 0.035).rotateX(-Math.PI / 2).translate(23.5, 0.014, z)),
  // Annex Building X-grid lines
  ...[18, 20, 22, 24, 26, 28].map(x => new THREE.PlaneGeometry(0.035, 19.0).rotateX(-Math.PI / 2).translate(x, 0.014, 3.0)),
]
export const GRID_GEOMETRY = mergeGeometries(gridLines)!
gridLines.forEach(part => part.dispose())

export const FLOOR_GEOMETRY = new THREE.PlaneGeometry(30.4, 22.4).rotateX(-Math.PI / 2).translate(0, 0.008, 0)

// ── Perimeter Wall Base Ambient Occlusion Skirting Shadows ──
export const WALL_BASE_SHADOW_GEOMETRY = mergeBoxes([
  // Main Office North wall base AO
  [30.4, 0.01, 0.40, 0, 0.012, -11.0],
  // Main Office West wall base AO
  [0.40, 0.01, 22.4, -14.9, 0.012, 0],
  // Main Office South wall base AO
  [30.4, 0.01, 0.40, 0, 0.012, 10.9],
  // Annex North wall base AO
  [12.5, 0.01, 0.40, 23.5, 0.012, -6.2],
  // Annex South wall base AO
  [12.5, 0.01, 0.40, 23.5, 0.012, 12.2],
  // Annex East wall base AO
  [0.40, 0.01, 19.0, 29.4, 0.012, 3.0],
])
