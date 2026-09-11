import type { OfficeZoneType } from '../types/office';

export type OfficeZoneAnchorType = OfficeZoneType | 'LOUNGE';

export const ZONE_ANCHORS: Record<OfficeZoneAnchorType, { x: number; y: number }> = {
  COMMAND: { x: 205, y: 190 },
  DEV_ZONE: { x: 700, y: 190 },
  CAREER_ZONE: { x: 1195, y: 190 },
  MARKETING_ZONE: { x: 205, y: 512 },
  COLLABORATION: { x: 700, y: 512 },
  RUNTIME: { x: 205, y: 795 },
  APPROVAL: { x: 700, y: 795 },
  VAULT: { x: 1195, y: 795 },
  LOUNGE: { x: 1195, y: 512 },
  SPECIALIST: { x: 0, y: 0 },
};
