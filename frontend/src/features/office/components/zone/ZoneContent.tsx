import React, { memo } from 'react';
import type { Office2_5DPalette, Zone2_5DConfig } from '../../renderers/Office2_5D/Office2_5DPalette';
import type { OfficeZoneType, OfficeRuntimeProjection, OfficeVaultProjection, OfficeCollaborationItem, OfficeApprovalProjection } from '@/features/office/types/office';
import { RuntimeRoom } from '../RuntimeRoom';
import { ArtifactVault } from '../ArtifactVault';
import { ApprovalPod } from '../ApprovalPod';
import { CollaborationZone } from '../CollaborationZone';

interface ZoneContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  type: OfficeZoneType;
  isDark: boolean;
  palette: Office2_5DPalette;
  visual: Zone2_5DConfig;
  // Props for specific facility stations
  runtimeSummary?: OfficeRuntimeProjection;
  vaultSummary?: OfficeVaultProjection;
  collaborationItems?: OfficeCollaborationItem[];
  approvalSummary?: OfficeApprovalProjection;
}

export const ZoneContent: React.FC<ZoneContentProps> = memo(({
  x,
  y,
  width,
  height,
  type,
  isDark,
  palette: _palette,
  visual: _visual,
  runtimeSummary,
  vaultSummary,
  collaborationItems,
  approvalSummary,
}) => {
  switch (type) {
    case 'RUNTIME':
      if (runtimeSummary) {
        return (
          <RuntimeRoom
            summary={runtimeSummary}
            isDark={isDark}
            position={{ x: x + width / 2, y: y + height / 2 }}
          />
        );
      }
      return null;
    case 'VAULT':
      if (vaultSummary) {
        return (
          <ArtifactVault
            summary={vaultSummary}
            isDark={isDark}
            position={{ x: x + width / 2, y: y + height / 2 }}
          />
        );
      }
      return null;
    case 'APPROVAL':
      if (approvalSummary) {
        return (
          <ApprovalPod
            summary={approvalSummary}
            isDark={isDark}
            position={{ x: x + width / 2, y: y + height / 2 }}
          />
        );
      }
      return null;
    case 'COLLABORATION':
      if (collaborationItems) {
        return (
          <CollaborationZone
            items={collaborationItems}
            isDark={isDark}
            position={{ x: x + width / 2, y: y + height / 2 }}
          />
        );
      }
      return null;
    default:
      return null;
  }
});
