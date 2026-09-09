import React, { useState } from 'react'
import {
  Bot,
  Search,
  Filter,
  LayoutGrid,
  List,
  Plus,
  SlidersHorizontal,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { AgentProjection } from '@/types/agent'

export const AgentsPage: React.FC = () => {
  // Support arbitrary future AgentProjection[] array without hardcoded profiles
  const [agents] = useState<AgentProjection[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        description="Comprehensive agent fleet directory, dynamic capability matrix, and instance projections."
        badge={
          <Badge variant="outline" className="border-border bg-surface text-text-muted font-mono-tech text-[10px]">
            {agents.length} REGISTERED
          </Badge>
        }
        actions={
          <Button
            size="xs"
            disabled
            className="bg-interactive/80 text-primary-foreground cursor-not-allowed opacity-50 min-h-[36px] sm:min-h-[28px]"
            title="Backend connection required to register new agents"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Register Agent
          </Button>
        }
      />

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg bg-surface border border-border transition-colors">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <Input
            type="text"
            placeholder="Search agents by name, role, or capability..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 sm:h-8 text-xs bg-background border-border text-text-primary placeholder:text-text-muted focus-visible:ring-interactive/50"
          />
        </div>

        {/* Desktop Filters */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            disabled
            className="border-border bg-background text-text-secondary hover:text-text-primary min-h-[32px]"
          >
            <Filter className="mr-1.5 h-3 w-3 text-text-muted" />
            <span className="font-mono-tech text-[11px]">All Statuses</span>
          </Button>

          <Button
            variant="outline"
            size="xs"
            disabled
            className="border-border bg-background text-text-secondary hover:text-text-primary min-h-[32px]"
          >
            <span className="font-mono-tech text-[11px]">All Roles</span>
          </Button>

          {/* View Mode */}
          <div className="flex items-center rounded-md border border-border bg-background p-0.5">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon-xs"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-surface-raised text-text-primary' : 'text-text-muted'}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon-xs"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-surface-raised text-text-primary' : 'text-text-muted'}
              title="List View"
              aria-label="List View"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Mobile Filters Dropdown (< 640px) */}
        <div className="flex sm:hidden items-center justify-between gap-2 pt-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 justify-center border-border bg-background text-text-secondary min-h-[44px]"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4 text-text-muted" />
                <span className="font-mono-tech text-xs">Filter Options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-surface-overlay border-border text-text-primary">
              <DropdownMenuLabel className="text-[10px] text-text-muted font-mono-tech uppercase">
                Status Filter
              </DropdownMenuLabel>
              <DropdownMenuItem disabled className="text-xs text-text-muted">
                All Statuses (Default)
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuLabel className="text-[10px] text-text-muted font-mono-tech uppercase">
                Role Filter
              </DropdownMenuLabel>
              <DropdownMenuItem disabled className="text-xs text-text-muted">
                All Roles (Default)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center rounded-md border border-border bg-background p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon-xs"
              onClick={() => setViewMode('grid')}
              className={cn('min-h-[40px] min-w-[40px]', viewMode === 'grid' ? 'bg-surface-raised text-text-primary' : 'text-text-muted')}
              aria-label="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon-xs"
              onClick={() => setViewMode('list')}
              className={cn('min-h-[40px] min-w-[40px]', viewMode === 'list' ? 'bg-surface-raised text-text-primary' : 'text-text-muted')}
              aria-label="List View"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Agent Grid / List Container (1 col mobile, 2 col tablet, 3-4 col desktop) */}
      <div className="w-full">
        {agents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No Agents Registered"
            description="The agent directory is currently empty. Connected agent projections from Sagara Mission Control API will populate automatically."
            className="py-12 sm:py-16"
          />
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'flex flex-col space-y-3'}>
            {/* Dynamic Agent Cards will render here in subsequent phases */}
          </div>
        )}
      </div>
    </div>
  )
}
