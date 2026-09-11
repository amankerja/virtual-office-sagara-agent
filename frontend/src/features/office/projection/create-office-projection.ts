import { buildOfficeScene, type BuildOfficeSceneParams } from '../layout/office-layout-engine'
import type { OfficeSceneProjection } from '../types/office'

/**
 * createOfficeProjection:
 * Pure projection service mapping AgentProjection, DelegationProjection, TaskProjection,
 * and ApprovalProjection into the spatial OfficeSceneProjection.
 *
 * Conforms to Prompt 06 Section 40, 41, 54.
 */
export function createOfficeProjection(params: BuildOfficeSceneParams): OfficeSceneProjection {
  return buildOfficeScene(params)
}
