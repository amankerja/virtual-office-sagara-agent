import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  ShieldCheck,
  Bot,
  UserCog,
  Building2,
  Activity,
  Cpu,
  Server,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ThemeSwitcher } from '@/components/shell/ThemeSwitcher'
import { SagaraLogo } from '@/components/ui/SagaraLogo'
import { cn } from '@/lib/utils'
import { useGatewayTelemetry } from '@/api/hooks'

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: 'COMMAND',
    items: [
      { label: 'Command Center', path: '/', icon: LayoutDashboard },
      { label: 'Tasks', path: '/tasks', icon: CheckSquare },
      { label: 'Schedule', path: '/schedule', icon: CalendarDays },
      { label: 'Approvals', path: '/approvals', icon: ShieldCheck },
    ],
  },
  {
    title: 'AGENTS',
    items: [
      { label: 'Agents', path: '/agents', icon: Bot },
      { label: 'Agent Configuration', path: '/agent-config', icon: UserCog },
      { label: 'Virtual Office', path: '/office', icon: Building2 },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Activity', path: '/activity', icon: Activity },
      { label: 'Skills', path: '/skills', icon: Cpu },
      { label: 'Runtime', path: '/runtime', icon: Server },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
]

interface AppSidebarProps {
  isMobile?: boolean;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ isMobile = false }) => {
  const { isSidebarCollapsed, toggleSidebar, setMobileSidebarOpen } = useUIStore()
  const { data: gateway } = useGatewayTelemetry()

  // On mobile drawer, always show expanded view with labels
  const collapsed = isMobile ? false : isSidebarCollapsed

  const isHealthy = gateway?.state === 'HEALTHY'
  const isDegraded = gateway?.state === 'DEGRADED' || gateway?.state === 'STALE'
  const isOffline = gateway?.state === 'OFFLINE'
  const dotColor = isHealthy
    ? 'bg-emerald-500'
    : isDegraded
      ? 'bg-amber-500'
      : isOffline
        ? 'bg-rose-500'
        : 'bg-text-muted/60'
  const statusTitle = `${gateway?.state || 'Environment'} • Mission Control V1 (PRIVATE)`

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-border bg-surface-subtle transition-all duration-200 select-none z-30 shrink-0 h-full',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between px-3.5 border-b border-border">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-interactive/10 border border-interactive/30">
            <SagaraLogo size={24} className="h-6 w-6" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold text-text-primary tracking-wider uppercase">
                Sagara Agentic
              </span>
              <span className="text-[10px] text-text-muted tracking-tight font-mono-tech">
                Virtual Office & Control
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle (only on desktop/tablet) */}
        {!isMobile ? (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleSidebar}
            className="hidden md:flex text-text-muted hover:text-text-primary hover:bg-surface-raised min-h-8 min-w-8"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : (
          /* Mobile Close Button (min 44x44px touch target) */
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex md:hidden text-text-muted hover:text-text-primary hover:bg-surface-raised min-h-11 min-w-11"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAVIGATION_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <h2 className="px-2 text-[10px] font-semibold text-text-muted tracking-wider uppercase font-mono-tech">
                {section.title}
              </h2>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const IconComponent = item.icon
                const content = (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => {
                      if (isMobile) setMobileSidebarOpen(false)
                    }}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors min-h-10 sm:min-h-8',
                        isActive
                          ? 'bg-interactive/10 text-interactive border border-interactive/30 font-semibold'
                          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary border border-transparent'
                      )
                    }
                  >
                    <IconComponent className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </NavLink>
                )

                if (collapsed) {
                  return (
                    <Tooltip key={item.path} delayDuration={150}>
                      <TooltipTrigger asChild>
                        <div>{content}</div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-surface-overlay border-border text-xs text-text-primary">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return content
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer: Theme Segmented Control on Mobile, System State on Desktop */}
      <div className="p-3 border-t border-border bg-surface-subtle space-y-2">
        {isMobile && (
          <div className="space-y-1.5 pb-1">
            <span className="px-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider font-mono-tech">
              Theme Mode
            </span>
            <ThemeSwitcher variant="segmented" className="w-full justify-between" />
          </div>
        )}

        {!collapsed ? (
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-surface border border-border text-[11px] text-text-secondary">
            <span className="flex items-center gap-1.5 font-medium">
              <span className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />
              <span>Sagara Agentic V1</span>
            </span>
            <span className="text-[10px] font-semibold text-text-muted px-1.5 py-0.5 rounded bg-surface-raised border border-border">
              PRIVATE
            </span>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <span className={cn('h-2 w-2 rounded-full', dotColor)} title={statusTitle} />
          </div>
        )}
      </div>
    </aside>
  )
}
