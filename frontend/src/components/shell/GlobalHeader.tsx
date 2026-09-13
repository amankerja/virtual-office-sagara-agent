import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Menu, ShieldCheck } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ThemeSwitcher } from '@/components/shell/ThemeSwitcher'
import { RealtimeStatus } from '@/features/realtime'
import { useApprovals } from '@/api/hooks'

const ROUTE_CONTEXT_MAP: Record<string, { title: string; section: string }> = {
  '/': { title: 'Command Center', section: 'COMMAND' },
  '/tasks': { title: 'Tasks', section: 'COMMAND' },
  '/schedule': { title: 'Schedule', section: 'COMMAND' },
  '/approvals': { title: 'Approvals', section: 'COMMAND' },
  '/agents': { title: 'Agents', section: 'AGENTS' },
  '/agent-config': { title: 'Agent & Profile Configuration', section: 'AGENTS' },
  '/office': { title: 'Virtual Office', section: 'AGENTS' },
  '/activity': { title: 'Activity', section: 'OPERATIONS' },
  '/skills': { title: 'Skills', section: 'OPERATIONS' },
  '/runtime': { title: 'Runtime', section: 'OPERATIONS' },
  '/settings': { title: 'Settings', section: 'SYSTEM' },
}

export const GlobalHeader: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useUIStore()

  const { data: approvals = [] } = useApprovals()
  const pendingApprovals = approvals.filter((a) => a.state === 'PENDING')
  const pendingCount = pendingApprovals.length

  const currentRoute = ROUTE_CONTEXT_MAP[location.pathname] || {
    title: 'Mission Control',
    section: 'OPERATIONS',
  }

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-border bg-surface-subtle px-3 sm:px-4 md:px-6 select-none shrink-0 z-20 transition-colors">
      {/* Left: Mobile Toggle & Page Context */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Hamburger Button with 44x44px touch target */}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
          className="md:hidden text-text-secondary hover:text-text-primary hover:bg-surface-raised min-h-11 min-w-11"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          <span className="text-text-muted text-[11px] uppercase tracking-wider font-semibold hidden md:inline">
            {currentRoute.section}
          </span>
          <span className="text-text-muted/60 hidden md:inline">/</span>
          <span className="font-semibold text-text-primary text-xs sm:text-sm">
            {currentRoute.title}
          </span>
        </div>
      </div>

      {/* Right: Realtime status, Execution LOCKED, Functional Attention, Theme */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Persistent Execution LOCKED Safety Badge */}
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-semibold tracking-wide"
          title="Execution Safety Gate: LOCKED (Policy V3 enforces SAFE_READ_ONLY / Zero Production Mutations)"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
          <span>LOCKED</span>
        </div>

        {/* Global Realtime Connection Status Indicator */}
        <RealtimeStatus className="hidden sm:flex" />

        {/* Functional Attention Indicator (Connected to real approvals data) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="relative text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors min-h-10 min-w-10 sm:min-h-8 sm:min-w-8"
              aria-label={`Attention Queue (${pendingCount} pending)`}
            >
              <Bell className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 bg-surface-overlay border-border text-text-primary">
            <div className="flex items-center justify-between p-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Attention Queue
              </span>
              <Badge
                variant="outline"
                className={
                  pendingCount > 0
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px]'
                    : 'border-border text-[10px] text-text-muted'
                }
              >
                {pendingCount} PENDING
              </Badge>
            </div>
            <DropdownMenuSeparator className="bg-border" />
            {pendingCount === 0 ? (
              <div className="p-3 text-center text-xs text-text-muted flex flex-col items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>No pending approvals or alerts.</span>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y divide-border/60">
                {pendingApprovals.slice(0, 4).map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => navigate(`/approvals?approval=${item.id}`)}
                    className="p-2.5 cursor-pointer focus:bg-surface-hover flex flex-col items-start gap-1 text-xs"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-text-primary truncate">{item.actionType}</span>
                      <span className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">
                        {item.risk}
                      </span>
                    </div>
                    <span className="text-[11px] text-text-muted line-clamp-1">{item.description}</span>
                  </DropdownMenuItem>
                ))}
                <div className="p-2 text-center border-t border-border">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => navigate('/approvals')}
                    className="w-full text-xs text-interactive hover:text-interactive-hover"
                  >
                    View all approvals →
                  </Button>
                </div>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Switcher */}
        <ThemeSwitcher />
      </div>
    </header>
  )
}
