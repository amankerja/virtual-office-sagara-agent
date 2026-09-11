import React from 'react'
import { useLocation } from 'react-router-dom'
import {
  Bell,
  Search,
  SlidersHorizontal,
  Menu,
  User,
} from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ThemeSwitcher } from '@/components/shell/ThemeSwitcher'
import { RealtimeStatus } from '@/features/realtime'

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
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useUIStore()

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

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono-tech">
          <span className="text-text-muted hidden md:inline">{currentRoute.section}</span>
          <span className="text-text-muted/60 hidden md:inline">/</span>
          <span className="font-medium text-text-primary text-xs sm:text-sm">{currentRoute.title}</span>
        </div>
      </div>

      {/* Middle/Right: Controls, Health, Search, Attention, Theme, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Profile Filter Placeholder (Desktop only) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="xs"
              className="hidden lg:flex items-center gap-1.5 bg-surface border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <SlidersHorizontal className="h-3 w-3 text-text-muted" />
              <span className="font-mono-tech text-[11px]">All Profiles</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-surface-overlay border-border text-text-primary">
            <DropdownMenuLabel className="text-[10px] text-text-muted font-mono-tech uppercase">
              Filter by Profile
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-xs focus:bg-surface-hover focus:text-text-primary">
              All Profiles (Default)
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-xs text-text-muted">
              No profiles loaded yet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Global Search Trigger (Desktop & Tablet) */}
        <button
          type="button"
          onClick={() => {}}
          className="hidden sm:flex items-center gap-2 h-7 px-2.5 rounded-md bg-surface border border-border text-xs text-text-muted hover:border-border-strong hover:text-text-secondary transition-colors"
          aria-label="Search"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden lg:inline font-mono-tech text-[11px]">Search or jump to...</span>
          <kbd className="hidden lg:inline-flex h-4 items-center gap-0.5 rounded border border-border bg-surface-raised px-1 text-[10px] text-text-muted font-mono-tech">
            ⌘K
          </kbd>
        </button>

        {/* Global Realtime Connection Status Indicator */}
        <RealtimeStatus className="hidden sm:flex" />

        {/* Attention Indicator */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="relative text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors min-h-10 min-w-10 sm:min-h-7 sm:min-w-7"
              aria-label="Attention Queue"
            >
              <Bell className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-surface-overlay border-border text-text-primary">
            <div className="flex items-center justify-between p-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider font-mono-tech text-text-muted">
                Attention Queue
              </span>
              <Badge variant="outline" className="border-border text-[10px] font-mono-tech text-text-muted">
                0
              </Badge>
            </div>
            <DropdownMenuSeparator className="bg-border" />
            <div className="p-3 text-center text-xs text-text-muted">
              No active alerts or approvals pending.
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Switcher (Desktop, Tablet, Mobile) */}
        <ThemeSwitcher />

        {/* User Profile Placeholder */}
        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-full bg-surface-raised border border-border text-text-secondary hover:text-text-primary min-h-9 min-w-9 sm:min-h-7 sm:min-w-7"
          aria-label="User Account"
        >
          <User className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  )
}
