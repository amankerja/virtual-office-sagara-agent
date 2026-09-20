import React from 'react'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Box,
  LayoutGrid,
  List,
  Search,
  Filter,
  Layers,
  X,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { OfficeRenderMode, GraphicsQuality } from '../renderers/Office3D/types'

interface OfficeControlsProps {
  viewMode: OfficeRenderMode
  onViewModeChange: (mode: OfficeRenderMode) => void
  quality?: GraphicsQuality
  onQualityChange?: (quality: GraphicsQuality) => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
  stateFilter: string
  onStateFilterChange: (state: string) => void
  zoneFilter: string
  onZoneFilterChange: (zone: string) => void
}

const STATE_FILTER_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'All States', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Idle', value: 'IDLE' },
  { label: 'Recently Active', value: 'RECENTLY_ACTIVE' },
  { label: 'Awaiting Approval', value: 'AWAITING_APPROVAL' },
  { label: 'Degraded', value: 'DEGRADED' },
  { label: 'Error', value: 'ERROR' },
  { label: 'Offline', value: 'OFFLINE' },
  { label: 'Config Incomplete', value: 'CONFIGURATION_INCOMPLETE' },
]

const ZONE_FILTER_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'All Zones', value: 'ALL' },
  { label: 'Command Room', value: 'COMMAND' },
  { label: 'Specialist Work Zone', value: 'SPECIALIST' },
  { label: 'Collaboration Zone', value: 'COLLABORATION' },
  { label: 'Approval Pod', value: 'APPROVAL' },
  { label: 'Server / Runtime Room', value: 'RUNTIME' },
  { label: 'Artifact Vault', value: 'VAULT' },
]

const QUALITY_OPTIONS: Array<{ label: string; value: GraphicsQuality; desc: string }> = [
  { label: 'Low', value: 'low', desc: 'No shadows, 1x DPR (Best battery/low-end)' },
  { label: 'Balanced', value: 'balanced', desc: 'Soft shadows, 1.5x DPR (Recommended)' },
  { label: 'Ultra', value: 'ultra', desc: 'Full shadows & lights, 2x DPR (High-end)' },
]

export const OfficeControls: React.FC<OfficeControlsProps> = ({
  viewMode,
  onViewModeChange,
  quality = 'balanced',
  onQualityChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
  searchQuery,
  onSearchChange,
  stateFilter,
  onStateFilterChange,
  zoneFilter,
  onZoneFilterChange,
}) => {
  const isFiltered = stateFilter !== 'ALL' || zoneFilter !== 'ALL' || searchQuery.trim() !== ''

  const handleClearFilters = () => {
    onStateFilterChange('ALL')
    onZoneFilterChange('ALL')
    onSearchChange('')
  }

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-surface border border-border rounded-xl">
      {/* Left: View Mode Toggle, Zoom, Quality */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Multi-Renderer Mode Switcher (Section 1: [ Immersive 3D ] [ Efficient 2.5D ] [ List ]) */}
        <div className="inline-flex items-center p-0.5 bg-surface-subtle rounded-lg border border-border">
          <Button
            variant={viewMode === '3d' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('3d')}
            className={`h-8 px-2.5 text-xs gap-1.5 font-medium ${
              viewMode === '3d'
                ? 'bg-surface shadow-xs text-interactive font-semibold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Box className="h-3.5 w-3.5" />
            <span>Immersive 3D</span>
          </Button>

          <Button
            variant={viewMode === '2.5d' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('2.5d')}
            className={`h-8 px-2.5 text-xs gap-1.5 font-medium ${
              viewMode === '2.5d'
                ? 'bg-surface shadow-xs text-text-primary font-semibold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Efficient 2.5D</span>
          </Button>

          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className={`h-8 px-2.5 text-xs gap-1.5 font-medium ${
              viewMode === 'list'
                ? 'bg-surface shadow-xs text-text-primary font-semibold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>List View</span>
          </Button>
        </div>

        {/* 3D Graphics Quality Dropdown */}
        {viewMode === '3d' && onQualityChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 border-border bg-surface text-text-secondary hover:text-text-primary font-mono-tech"
              >
                <Sparkles className="h-3.5 w-3.5 text-interactive" />
                <span>Quality: {quality.toUpperCase()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60 bg-surface-raised dark:bg-slate-900 border-border text-text-primary opacity-100 shadow-2xl">
              <DropdownMenuLabel className="text-xs font-mono-tech uppercase">
                Graphics Quality Preset
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {QUALITY_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => onQualityChange(opt.value)}
                  className={`flex flex-col items-start gap-0.5 text-xs cursor-pointer ${
                    quality === opt.value ? 'font-bold text-interactive bg-surface-hover' : ''
                  }`}
                >
                  <div className="font-semibold uppercase font-mono-tech">{opt.label}</div>
                  <span className="text-[10px] text-text-muted font-normal">{opt.desc}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Zoom Controls (Available in 2.5D View) */}
        {viewMode === '2.5d' && (
          <div className="inline-flex items-center gap-1 bg-surface-subtle p-0.5 rounded-lg border border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={onZoomOut}
              disabled={zoom <= 0.6}
              title="Zoom Out (-)"
              className="h-8 w-8 text-text-secondary hover:text-text-primary"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] font-mono-tech px-1.5 text-text-secondary w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onZoomIn}
              disabled={zoom >= 1.75}
              title="Zoom In (+)"
              className="h-8 w-8 text-text-secondary hover:text-text-primary"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onFit}
              title="Fit to View"
              className="h-8 px-2 text-xs text-text-secondary hover:text-text-primary gap-1"
            >
              <Maximize2 className="h-3 w-3" />
              <span className="hidden sm:inline">Fit</span>
            </Button>
          </div>
        )}

        {/* Operational Telemetry Badge */}
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-sans text-[10px] h-7 px-2 gap-1"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          LIVE
        </Badge>
      </div>

      {/* Right: Search & Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="relative w-full sm:w-48 lg:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <Input
            type="search"
            placeholder="Find agent, task, zone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 pr-3 h-8 text-xs bg-surface-subtle border-border focus:border-primary"
          />
        </div>

        {/* State Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-border bg-surface text-text-secondary hover:text-text-primary"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>
                {stateFilter === 'ALL'
                  ? 'State'
                  : STATE_FILTER_OPTIONS.find((o) => o.value === stateFilter)?.label || stateFilter}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs font-mono-tech uppercase">Filter by State</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATE_FILTER_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onStateFilterChange(opt.value)}
                className={`text-xs ${stateFilter === opt.value ? 'font-bold text-primary' : ''}`}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Zone Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-border bg-surface text-text-secondary hover:text-text-primary"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>
                {zoneFilter === 'ALL'
                  ? 'Zone'
                  : ZONE_FILTER_OPTIONS.find((o) => o.value === zoneFilter)?.label || zoneFilter}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs font-mono-tech uppercase">Filter by Zone</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ZONE_FILTER_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onZoneFilterChange(opt.value)}
                className={`text-xs ${zoneFilter === opt.value ? 'font-bold text-primary' : ''}`}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters Button */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 px-2 text-xs text-text-muted hover:text-text-primary gap-1"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>
        )}
      </div>
    </div>
  )
}
