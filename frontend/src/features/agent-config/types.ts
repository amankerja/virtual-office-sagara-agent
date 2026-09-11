export type ConfigHealthStatus =
  | 'COMPLETE'
  | 'NEEDS_ATTENTION'
  | 'INVALID_REFERENCE'
  | 'INCOMPLETE'
  | 'UNKNOWN'

export type ChangeAction = 'ADD_SKILL' | 'REMOVE_SKILL' | 'UPDATE_MODEL'

export interface ProfileDraftChange {
  id: string;
  profileId: string;
  field: 'skills' | 'model';
  action: ChangeAction;
  targetValue: string;
  targetLabel?: string;
  timestamp: string;
}

export interface ProfileConfigurationState {
  profileId: string;
  assignedSkillIds: string[];
  defaultModel?: string;
  health: ConfigHealthStatus;
}
