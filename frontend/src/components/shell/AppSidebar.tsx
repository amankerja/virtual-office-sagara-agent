import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckSquare,
  ShieldCheck,
  Bot,
  Building2,
  Activity,
  Cpu,
  Server,
  Settings,
  ChevronLeft,
  ChevronRight,
  Terminal,
} from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

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
      { label: 'Approvals', path: '/approvals', icon: ShieldCheck },
    ],
  },
  {
    title: 'AGENTS',
    items: [
      { label: 'Agents', path: '/agents', icon: Bot },
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

export const AppSidebar: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar, setMobileSidebarOpen } = useUIStore()

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-[#1e2436] bg-[#0b0e17] transition-all duration-200 select-none z-30 shrink-0 h-full',
        isSidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between px-3.5 border-b border-[#1e2436]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 border border-blue-500/30 text-blue-400">
            <Terminal className="h-4 w-4" />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-[#f1f5f9] tracking-wider uppercase">
                Sagara
              </span>
              <span className="text-[10px] text-[#64748b] tracking-tight font-mono-tech">
                Mission Control
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={toggleSidebar}
          className="hidden md:flex text-[#64748b] hover:text-[#f1f5f9] hover:bg-[#161a26]"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAVIGATION_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isSidebarCollapsed && (
              <h2 className="px-2 text-[10px] font-semibold text-[#64748b] tracking-wider uppercase font-mono-tech">
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
                    onClick={() => setMobileSidebarOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 font-semibold'
                          : 'text-[#94a3b8] hover:bg-[#161a26] hover:text-[#f1f5f9] border border-transparent'
                      )
                    }
                  >
                    <IconComponent className="h-4 w-4 shrink-0" />
                    {!isSidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </NavLink>
                )

                if (isSidebarCollapsed) {
                  return (
                    <Tooltip key={item.path} delayDuration={150}>
                      <TooltipTrigger asChild>
                        <div>{content}</div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-[#161a26] border-[#1e2436] text-xs text-[#f1f5f9]">
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

      {/* Footer System State */}
      <div className="p-2 border-t border-[#1e2436] bg-[#0b0e17]">
        {!isSidebarCollapsed ? (
          <div className="flex items-center justify-between px-2 py-1.5 rounded bg-[#0f121a] border border-[#1e2436] text-[11px] font-mono-tech text-[#64748b]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              v0.1.0-local
            </span>
            <span className="text-[10px] text-[#475569]">SANDBOX</span>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <span className="h-2 w-2 rounded-full bg-slate-500" title="v0.1.0-local (SANDBOX)" />
          </div>
        )}
      </div>
    </aside>
  )
}
