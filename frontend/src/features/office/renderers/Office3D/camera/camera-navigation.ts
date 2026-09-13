export interface Point { x: number; y: number; z: number }

export interface WasdKeys {
  w: boolean
  a: boolean
  s: boolean
  d: boolean
  shift?: boolean
}

export interface WasdMovementOptions {
  baseSpeed?: number
  boostMultiplier?: number
}

export const DEFAULT_WASD_BASE_SPEED = 6.0
export const DEFAULT_WASD_BOOST_MULTIPLIER = 2.0

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

export function calculateWasdMovement(
  keys: WasdKeys,
  cameraForward: Point,
  deltaSeconds: number,
  options?: WasdMovementOptions
): Point {
  if (deltaSeconds <= 0) return { x: 0, y: 0, z: 0 }
  if (!keys.w && !keys.a && !keys.s && !keys.d) return { x: 0, y: 0, z: 0 }

  // 1. Flatten Y component of camera forward vector
  let forwardX = cameraForward.x
  let forwardZ = cameraForward.z
  const forwardLen = Math.hypot(forwardX, forwardZ)

  if (forwardLen > 0.0001) {
    forwardX /= forwardLen
    forwardZ /= forwardLen
  } else {
    // If looking straight down/up, default forward to negative Z
    forwardX = 0
    forwardZ = -1
  }

  // 2. Derive horizontal right vector via cross product with UP (0, 1, 0):
  // right = forward x up -> (forward.z * 0 - forward.y * 1, ..., forward.x * 1 - 0) -> (-forwardZ, 0, forwardX)
  const rightX = -forwardZ
  const rightZ = forwardX

  // 3. Compose movement vector from WASD
  let moveX = 0
  let moveZ = 0
  if (keys.w) {
    moveX += forwardX
    moveZ += forwardZ
  }
  if (keys.s) {
    moveX -= forwardX
    moveZ -= forwardZ
  }
  if (keys.d) {
    moveX += rightX
    moveZ += rightZ
  }
  if (keys.a) {
    moveX -= rightX
    moveZ -= rightZ
  }

  // 4. Normalize diagonal movement
  const moveLen = Math.hypot(moveX, moveZ)
  if (moveLen <= 0.0001) {
    return { x: 0, y: 0, z: 0 }
  }
  moveX /= moveLen
  moveZ /= moveLen

  // 5. Multiply by speed * delta
  const baseSpeed = options?.baseSpeed ?? DEFAULT_WASD_BASE_SPEED
  const multiplier = keys.shift ? (options?.boostMultiplier ?? DEFAULT_WASD_BOOST_MULTIPLIER) : 1.0
  const speed = baseSpeed * multiplier
  const distance = speed * deltaSeconds

  return {
    x: moveX * distance,
    y: 0,
    z: moveZ * distance,
  }
}

export function applyWasdMovement(
  camera: Point,
  target: Point,
  keys: WasdKeys,
  cameraForward: Point,
  deltaSeconds: number,
  options?: WasdMovementOptions
): boolean {
  const move = calculateWasdMovement(keys, cameraForward, deltaSeconds, options)
  if (move.x === 0 && move.z === 0) return false

  // Apply identical translation to camera and target
  camera.x += move.x
  camera.z += move.z
  target.x += move.x
  target.z += move.z

  // Clamp target and adjust camera to preserve camera-target relationship
  clampCameraTarget(target, camera)
  return true
}

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

