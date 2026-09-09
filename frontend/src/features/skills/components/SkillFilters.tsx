import React from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface SkillFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  healthFilter: string;
  onHealthChange: (h: string) => void;
  installationFilter: string;
  onInstallationChange: (i: string) => void;
  executionFilter: string;
  onExecutionChange: (e: string) => void;
  profileFilter: string;
  onProfileChange: (p: string) => void;
  availableProfiles: string[];
  onReset: () => void;
  hasActiveFilters: boolean;
}

export const SkillFilters: React.FC<SkillFiltersProps> = ({
  searchQuery,
  onSearchChange,
  healthFilter,
  onHealthChange,
  installationFilter,
  onInstallationChange,
  executionFilter,
  onExecutionChange,
  profileFilter,
  onProfileChange,
  availableProfiles,
  onReset,
  hasActiveFilters,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
          <Input
            placeholder="Search skills by name, ID, category..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-xs bg-surface border-border focus:border-interactive font-mono-tech"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-text-muted hover:text-text-primary"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Health Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="xs"
                className={cn(
                  'border-border bg-surface text-text-secondary hover:text-text-primary min-h-8 text-xs',
                  healthFilter !== 'All' && 'border-interactive text-interactive font-semibold'
                )}
              >
                <Filter className="mr-1 h-3 w-3 text-text-muted" />
                <span className="font-mono-tech text-[11px]">Health: {healthFilter}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-surface-overlay border-border text-text-primary">
              <DropdownMenuLabel className="text-[10px] text-text-muted uppercase font-mono-tech">
                Filter by Health
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {['All', 'healthy', 'degraded', 'missing', 'unknown'].map((h) => (
                <DropdownMenuItem
                  key={h}
                  onClick={() => onHealthChange(h)}
                  className={cn('text-xs cursor-pointer capitalize', healthFilter === h && 'text-interactive font-semibold')}
                >
                  {h}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Installation Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="xs"
                className={cn(
                  'border-border bg-surface text-text-secondary hover:text-text-primary min-h-8 text-xs',
                  installationFilter !== 'All' && 'border-interactive text-interactive font-semibold'
                )}
              >
                <span className="font-mono-tech text-[11px]">Install: {installationFilter}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-surface-overlay border-border text-text-primary">
              <DropdownMenuLabel className="text-[10px] text-text-muted uppercase font-mono-tech">
                Installation State
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {['All', 'installed', 'missing', 'unknown'].map((i) => (
                <DropdownMenuItem
                  key={i}
                  onClick={() => onInstallationChange(i)}
                  className={cn('text-xs cursor-pointer capitalize', installationFilter === i && 'text-interactive font-semibold')}
                >
                  {i}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Execution Evidence Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="xs"
                className={cn(
                  'border-border bg-surface text-text-secondary hover:text-text-primary min-h-8 text-xs',
                  executionFilter !== 'All' && 'border-interactive text-interactive font-semibold'
                )}
              >
                <span className="font-mono-tech text-[11px]">Execution: {executionFilter.replace(/_/g, ' ')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-surface-overlay border-border text-text-primary">
              <DropdownMenuLabel className="text-[10px] text-text-muted uppercase font-mono-tech">
                Execution Evidence
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {[
                'All',
                'observed_active',
                'requested',
                'execution_unknown',
                'completed',
                'failed',
                'not_observed',
              ].map((ex) => (
                <DropdownMenuItem
                  key={ex}
                  onClick={() => onExecutionChange(ex)}
                  className={cn('text-xs cursor-pointer capitalize', executionFilter === ex && 'text-interactive font-semibold')}
                >
                  {ex.replace(/_/g, ' ')}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dynamic Profile Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="xs"
                className={cn(
                  'border-border bg-surface text-text-secondary hover:text-text-primary min-h-8 text-xs',
                  profileFilter !== 'All' && 'border-interactive text-interactive font-semibold'
                )}
              >
                <span className="font-mono-tech text-[11px]">Profile: {profileFilter}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-surface-overlay border-border text-text-primary">
              <DropdownMenuLabel className="text-[10px] text-text-muted uppercase font-mono-tech">
                Dynamic Profiles ({availableProfiles.length})
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => onProfileChange('All')}
                className={cn('text-xs cursor-pointer', profileFilter === 'All' && 'text-interactive font-semibold')}
              >
                All Profiles
              </DropdownMenuItem>
              {availableProfiles.map((p) => (
                <DropdownMenuItem
                  key={p}
                  onClick={() => onProfileChange(p)}
                  className={cn('text-xs cursor-pointer truncate', profileFilter === p && 'text-interactive font-semibold')}
                >
                  {p}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reset Filters CTA */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onReset}
              className="text-text-muted hover:text-rose-500 min-h-8 text-xs"
              title="Reset all filters"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
