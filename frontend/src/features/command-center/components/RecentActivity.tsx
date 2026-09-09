import React from 'react'
import { Link } from 'react-router-dom'
import type { ActivityEvent } from '@/types/runtime'
import { SectionCard } from '@/components/shared/SectionCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { ArrowUpRight, Activity, Clock, Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'

interface RecentActivityProps {
  events: ActivityEvent[];
  isLoading?: boolean;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ events, isLoading = false }) => {
  const getLevelIcon = (level: ActivityEvent['level']) => {
    switch (level) {
      case 'ERROR':
        return <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
      case 'WARN':
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
      case 'DEBUG':
        return <Info className="h-3.5 w-3.5 text-text-muted" />
      case 'INFO':
      default:
        return <CheckCircle2 className="h-3.5 w-3.5 text-interactive" />
    }
  }

  return (
    <SectionCard
      title="Recent Activity"
      description="Chronological event log of autonomous actions, security boundaries, and capability invocations."
      action={
        <Button variant="ghost" size="xs" asChild className="text-text-muted hover:text-text-primary">
          <Link to="/activity" className="flex items-center gap-1 font-mono-tech text-[11px]">
            Full Activity Log
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Button>
      }
      contentClassName="p-0"
    >
      {isLoading ? (
        <div className="p-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-surface-subtle animate-pulse border border-border" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Activity}
            title="Event Stream Inactive"
            description="No recent operational telemetry logged in this session."
            className="py-8"
          />
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {events.map((event) => (
            <div
              key={event.id}
              className="p-3 sm:px-4 sm:py-3 hover:bg-surface-hover transition-colors flex items-start justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {getLevelIcon(event.level)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary text-xs font-mono-tech truncate">
                      {event.source}
                    </span>
                    <span className="text-[10px] uppercase font-mono-tech text-text-muted px-1.5 py-0.2 rounded bg-surface-subtle border border-border">
                      {event.level}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                    {event.message}
                  </p>
                </div>
              </div>

              <span className="flex items-center gap-1 text-[11px] font-mono-tech text-text-muted shrink-0 mt-0.5">
                <Clock className="h-3 w-3" />
                {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
