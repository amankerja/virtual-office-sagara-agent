interface Point { x: number; y: number; z: number }

export function clampCameraTarget(target: Point, camera: Point) {
  const x = Math.max(-15, Math.min(15, target.x))
  const y = Math.max(0, Math.min(4, target.y))
  const z = Math.max(-11, Math.min(11, target.z))
  camera.x += x - target.x
  camera.y += y - target.y
  camera.z += z - target.z
  target.x = x
  target.y = y
  target.z = z
}

// Rendering and follow targeting must use exactly the same desk spacing.
export function workstationPosition(index: number): [number, number, number] {
  return [((index % 3) - 1) * 3.3, 0, Math.floor(index / 3) * 3.5]
}
