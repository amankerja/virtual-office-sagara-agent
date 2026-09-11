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
  [30.4, 2.8, .3, 0, 1.4, -11.35], [.3, 2.8, 22.4, -15.2, 1.4, 0],
  [.3, 2.8, 22.4, 15.2, 1.4, 0], [30.4, .9, .3, 0, .45, 11.25],
])
export const WALL_CAP_GEOMETRY = mergeBoxes([
  [30.4, .08, .4, 0, 2.82, -11.35], [.4, .08, 22.4, -15.2, 2.82, 0],
  [.4, .08, 22.4, 15.2, 2.82, 0], [30.4, .06, .38, 0, .92, 11.25],
])
const grid = [
  ...[-8, -6, -4, -2, 0, 2, 4, 6, 8].map(z => new THREE.PlaneGeometry(30.4, .025).rotateX(-Math.PI/2).translate(0, .013, z)),
  ...[-12, -10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10, 12].map(x => new THREE.PlaneGeometry(.025, 22.4).rotateX(-Math.PI/2).translate(x, .013, 0)),
]
export const GRID_GEOMETRY = mergeGeometries(grid)!
grid.forEach(part => part.dispose())
// One plane already is the cheapest representation of the primary floor.
export const FLOOR_GEOMETRY = new THREE.PlaneGeometry(30.4, 22.4).rotateX(-Math.PI/2).translate(0, .008, 0)
