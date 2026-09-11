export const OFFICE_DEPTH = {
  FLOOR: 0,
  FLOOR_MATERIAL_INLAY: 1,
  RUG: 2,
  THRESHOLD: 4,
  FURNITURE_BASE: 6,
  LOW_PARTITION: 12,
  WALL_BASE: 18, // pengganti wallT=10 hardcoded
  DESK_HEIGHT: 20,
  WALL_TOP: 34, // pengganti wallH=26 hardcoded, dinaikkan agar depth lebih terasa
  GLASS_TOP: 34,
  SIGN_HEIGHT: 42,
} as const;

export const OFFICE_LIGHT = {
  direction: "top-left",
  shadowOffsetX: 4,
  shadowOffsetY: 6,
} as const;

import type { OfficeZoneType } from "../types/office";

export const ZONE_TIER: Record<OfficeZoneType, 1 | 2 | 3> = {
  COMMAND: 1,
  APPROVAL: 1,
  RUNTIME: 1,
  DEV_ZONE: 2,
  CAREER_ZONE: 2,
  MARKETING_ZONE: 2,
  COLLABORATION: 2,
  VAULT: 3,
  SPECIALIST: 2, // Default to Tier 2 if not explicitly defined
};

