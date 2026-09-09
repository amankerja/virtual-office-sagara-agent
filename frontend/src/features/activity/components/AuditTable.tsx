import React from 'react'
import {
  formatTimestampRelative,
  formatTimeOnly,
} from '@/lib/formatters'
import { AuditOutcomeBadge } from '@/components/shared/AuditOutcomeBadge'
import { AuditActorBadge } from '@/components/shared/AuditActorBadge'
import { ChevronRight, GitFork } from 'lucide-react'
import type { AuditRecord } from '@/types/audit'

interface AuditTableProps {
  records: AuditRecord[]
  selectedRecordId?: string | null
  onSelectRecord: (record: AuditRecord) => void
  onFilterCorrelation?: (correlationId: string) => void
}

export const AuditTable: React.FC<AuditTableProps> = ({
  records,
  selectedRecordId,
  onSelectRecord,
  onFilterCorrelation,
}) => {
  if (records.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-border rounded-lg bg-surface">
        <p className="text-xs text-text-secondary">No audit accountability records match current criteria.</p>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg bg-surface overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-subtle border-b border-border text-text-secondary font-mono-tech uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-4 font-semibold w-36">Timestamp</th>
              <th className="py-2.5 px-3 font-semibold w-36">Actor</th>
              <th className="py-2.5 px-4 font-semibold">Action</th>
              <th className="py-2.5 px-3 font-semibold w-40">Target</th>
              <th className="py-2.5 px-3 font-semibold w-28">Outcome</th>
              <th className="py-2.5 px-3 font-semibold w-36">Correlation</th>
              <th className="py-2.5 px-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {records.map((record) => {
              const isSelected = selectedRecordId === record.id

              return (
                <tr
                  key={record.id}
                  onClick={() => onSelectRecord(record)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-surface-subtle font-medium text-text-primary'
                      : 'hover:bg-surface-subtle/50 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {/* Timestamp */}
                  <td className="py-2.5 px-4 font-mono-tech whitespace-nowrap">
                    <span className="text-text-primary">
                      {formatTimeOnly(record.timestamp)}
                    </span>
                    <span className="text-[10px] text-text-muted ml-1.5">
                      {formatTimestampRelative(record.timestamp)}
                    </span>
                  </td>

                  {/* Actor */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <AuditActorBadge
                      actorType={record.actor.type}
                      label={record.actor.label || record.actor.id}
                    />
                  </td>

                  {/* Action */}
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-text-primary truncate max-w-xs font-mono-tech text-[11px]">
                      {record.action}
                    </div>
                    {record.reason && (
                      <div className="text-[11px] text-text-muted truncate max-w-xs mt-0.5">
                        {record.reason}
                      </div>
                    )}
                  </td>

                  {/* Target */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {record.target ? (
                      <div className="truncate max-w-36">
                        <span className="font-medium text-text-primary text-[11px] block">
                          {record.target.label || record.target.id}
                        </span>
                        {record.target.type && (
                          <span className="text-[10px] font-mono-tech text-text-muted">
                            {record.target.type}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>

                  {/* Outcome */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <AuditOutcomeBadge outcome={record.outcome} />
                  </td>

                  {/* Correlation */}
                  <td className="py-2.5 px-3 whitespace-nowrap font-mono-tech text-[11px]">
                    {record.correlationId ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onFilterCorrelation && record.correlationId) {
                            onFilterCorrelation(record.correlationId)
                          }
                        }}
                        className="inline-flex items-center gap-1 text-text-muted hover:text-primary hover:underline"
                        title="Filter correlation"
                      >
                        <GitFork className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-28">{record.correlationId}</span>
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Arrow */}
                  <td className="py-2.5 px-3 text-right">
                    <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked List (Section 54) */}
      <div className="md:hidden divide-y divide-border">
        {records.map((record) => {
          const isSelected = selectedRecordId === record.id

          return (
            <div
              key={record.id}
              onClick={() => onSelectRecord(record)}
              className={`p-3.5 space-y-2 cursor-pointer transition-colors ${
                isSelected ? 'bg-surface-subtle' : 'hover:bg-surface-subtle/50'
              }`}
            >
              {/* Header: Actor + Outcome & Time */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <AuditActorBadge
                    actorType={record.actor.type}
                    label={record.actor.label}
                  />
                  <AuditOutcomeBadge outcome={record.outcome} />
                </div>
                <span className="text-[11px] font-mono-tech text-text-muted">
                  {formatTimestampRelative(record.timestamp)}
                </span>
              </div>

              {/* Action */}
              <p className="text-xs font-semibold font-mono-tech text-text-primary">
                {record.action}
              </p>

              {/* Target & Reason */}
              <div className="flex items-center justify-between gap-2 text-[11px] text-text-secondary pt-1 border-t border-border/40">
                <span className="font-mono-tech truncate">
                  {record.target ? `Target: ${record.target.label || record.target.id}` : ''}
                </span>
                {record.correlationId && (
                  <span className="font-mono-tech text-text-muted truncate">
                    {record.correlationId}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
