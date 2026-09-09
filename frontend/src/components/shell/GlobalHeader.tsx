import React from 'react'
import { useLocation } from 'react-router-dom'
import {
  Bell,
  Search,
  SlidersHorizontal,
  Menu,
  User,
  Radio,
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

const ROUTE_CONTEXT_MAP: Record<string, { title: string; section: string }> = {
  '/': { title: 'Command Center', section: 'COMMAND' },
  '/tasks': { title: 'Tasks', section: 'COMMAND' },
  '/approvals': { title: 'Approvals', section: 'COMMAND' },
  '/agents': { title: 'Agents', section: 'AGENTS' },
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
    <header className="flex h-14 w-full items-center justify-between border-b border-[#1e2436] bg-[#0b0e17] px-4 md:px-6 select-none shrink-0 z-20">
      {/* Left: Mobile Toggle & Page Context */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
          className="md:hidden text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#161a26]"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 text-xs font-mono-tech">
          <span className="text-[#64748b] hidden sm:inline">{currentRoute.section}</span>
          <span className="text-[#475569] hidden sm:inline">/</span>
          <span className="font-medium text-[#f1f5f9]">{currentRoute.title}</span>
        </div>
      </div>

      {/* Middle/Right: Controls, Health, Search, Attention, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Profile Filter Placeholder */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="xs"
              className="hidden lg:flex items-center gap-1.5 bg-[#0f121a] border-[#1e2436] text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#161a26]"
            >
              <SlidersHorizontal className="h-3 w-3 text-[#64748b]" />
              <span className="font-mono-tech text-[11px]">All Profiles</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[#0f121a] border-[#1e2436] text-[#f1f5f9]">
            <DropdownMenuLabel className="text-xs text-[#64748b] font-mono-tech uppercase">
              Filter by Profile
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#1e2436]" />
            <DropdownMenuItem className="text-xs focus:bg-[#161a26] focus:text-[#f1f5f9]">
              All Profiles (Default)
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-xs text-[#64748b]">
              No profiles loaded yet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Global Search / Command Palette Trigger */}
        <button
          type="button"
          onClick={() => {}}
          className="flex items-center gap-2 h-7 px-2.5 rounded-md bg-[#0f121a] border border-[#1e2436] text-xs text-[#64748b] hover:border-[#2b334d] hover:text-[#94a3b8] transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden md:inline font-mono-tech text-[11px]">Search or jump to...</span>
          <kbd className="hidden md:inline-flex h-4 items-center gap-0.5 rounded border border-[#1e2436] bg-[#161a26] px-1 text-[10px] text-[#94a3b8] font-mono-tech">
            ⌘K
          </kbd>
        </button>

        {/* Global System Health Indicator (Section 11 & 16: Not Connected placeholder) */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0f121a] border border-[#1e2436] text-[11px] font-mono-tech text-[#94a3b8]">
          <Radio className="h-3 w-3 text-[#64748b]" />
          <span className="hidden sm:inline text-[#64748b]">API:</span>
          <span className="text-[#94a3b8] font-medium">Not connected</span>
        </div>

        {/* Attention Indicator */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="relative text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#161a26]"
            >
              <Bell className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-[#0f121a] border-[#1e2436] text-[#f1f5f9]">
            <div className="flex items-center justify-between p-2">
              <span className="text-xs font-semibold uppercase tracking-wider font-mono-tech text-[#64748b]">
                Attention Queue
              </span>
              <Badge variant="outline" className="border-[#1e2436] text-[10px] font-mono-tech text-[#64748b]">
                0
              </Badge>
            </div>
            <DropdownMenuSeparator className="bg-[#1e2436]" />
            <div className="p-3 text-center text-xs text-[#64748b]">
              No active alerts or approvals pending.
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User / Settings Placeholder */}
        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-full bg-[#161a26] border border-[#1e2436] text-[#94a3b8] hover:text-[#f1f5f9]"
        >
          <User className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  )
}
