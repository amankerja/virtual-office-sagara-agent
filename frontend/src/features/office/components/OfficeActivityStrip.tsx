import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowRight } from 'lucide-react'
import { useActivity } from '@/api/hooks'
import { formatTimestampRelative } from '@/lib/formatters'

export const OfficeActivityStrip: React.FC = () => {
  const navigate = useNavigate()
  const { data: activities = [] } = useActivity()

  if (!activities || activities.length === 0) return null

  return (
    <div className="bg-surface border border-border rounded-xl p-3 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-mono-tech text-xs font-bold text-text-primary uppercase tracking-wider">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span>Recent Activity</span>
        </div>
        <button
          onClick={() => navigate('/activity')}
          className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
        >
          <span>View All Activity</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {activities.slice(0, 4).map((act) => (
          <div
            key={act.id}
            onClick={() => {
              if (act.correlationId) {
                navigate(`/activity?correlation=${act.correlationId}`)
              } else {
                navigate('/activity')
              }
            }}
            className="p-2 rounded-lg bg-surface-subtle border border-border/50 hover:border-primary/50 cursor-pointer transition-colors text-left"
          >
            <div className="flex items-center justify-between text-[10px] text-text-muted mb-1 font-mono-tech">
              <span className="font-bold text-text-secondary uppercase truncate max-w-25">
                {act.category}
              </span>
              <span>{formatTimestampRelative(act.timestamp)}</span>
            </div>
            <div className="text-[11px] font-medium text-text-primary truncate">
              {act.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
