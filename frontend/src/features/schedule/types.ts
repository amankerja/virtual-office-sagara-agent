export type ScheduleItemType =
  | 'TASK'
  | 'REMINDER'
  | 'RECURRING_JOB'
  | 'CONTENT'
  | 'MAINTENANCE'
  | 'EVENT'

export type ScheduleStatus =
  | 'SCHEDULED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PAUSED'
  | 'CANCELLED'
  | 'MISSED'
  | 'UNKNOWN'

export type ScheduleSource =
  | 'PROTOTYPE'
  | 'MISSION_CONTROL'
  | 'EXTERNAL'
  | 'UNKNOWN'

export type RecurrenceFrequency =
  | 'NONE'
  | 'DAILY'
  | 'WEEKDAYS'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'CUSTOM'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number;
  byWeekDays?: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  cronExpression?: string;
  endType?: 'NEVER' | 'ON_DATE' | 'AFTER_COUNT';
  endDate?: string;
  occurrencesCount?: number;
}

export interface ScheduleItem {
  id: string;
  type: ScheduleItemType;
  title: string;
  description?: string;
  startAt: string; // ISO 8601
  endAt?: string;   // ISO 8601
  timezone?: string;
  recurrence?: RecurrenceRule;
  agentId?: string;
  profileId?: string;
  taskId?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: ScheduleStatus;
  source: ScheduleSource;
  notes?: string;
  createdAt: string;
}

export type ScheduleViewMode = 'month' | 'week' | 'day' | 'agenda'
