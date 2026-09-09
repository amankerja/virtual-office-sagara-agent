import React, { useState } from 'react'
import {
  Bot,
  Search,
  Filter,
  LayoutGrid,
  List,
  Plus,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
          <Badge variant="outline" className="border-[#1e2436] bg-[#0f121a] text-[#94a3b8] font-mono-tech text-[10px]">
            {agents.length} REGISTERED
          </Badge>
        }
        actions={
          <Button
            size="xs"
            disabled
            className="bg-blue-600/80 text-white cursor-not-allowed opacity-50"
            title="Backend connection required to register new agents"
          >
            <Plus className="mr-1 h-3 w-3" />
            Register Agent
          </Button>
        }
      />

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg bg-[#0f121a] border border-[#1e2436]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748b]" />
          <Input
            type="text"
            placeholder="Search agents by name, role, or capability..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-[#090b10] border-[#1e2436] text-[#f1f5f9] placeholder:text-[#64748b] focus-visible:ring-blue-500/50"
          />
        </div>

        {/* Filters and View Toggles */}
        <div className="flex items-center gap-2">
          {/* Status Filter Placeholder */}
          <Button
            variant="outline"
            size="xs"
            disabled
            className="border-[#1e2436] bg-[#090b10] text-[#94a3b8] hover:text-[#f1f5f9]"
          >
            <Filter className="mr-1.5 h-3 w-3 text-[#64748b]" />
            <span className="font-mono-tech text-[11px]">All Statuses</span>
          </Button>

          {/* Role Filter Placeholder */}
          <Button
            variant="outline"
            size="xs"
            disabled
            className="border-[#1e2436] bg-[#090b10] text-[#94a3b8] hover:text-[#f1f5f9]"
          >
            <span className="font-mono-tech text-[11px]">All Roles</span>
          </Button>

          {/* View Mode Placeholder */}
          <div className="flex items-center rounded-md border border-[#1e2436] bg-[#090b10] p-0.5">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon-xs"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-[#1e2436] text-[#f1f5f9]' : 'text-[#64748b]'}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon-xs"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-[#1e2436] text-[#f1f5f9]' : 'text-[#64748b]'}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Agent Grid / List Container */}
      <div className="w-full">
        {agents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No Agents Registered"
            description="The agent directory is currently empty. Connected agent projections from Sagara Mission Control API will populate automatically."
            className="py-16"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Dynamic Agent Cards will render here in subsequent phases */}
          </div>
        )}
      </div>
    </div>
  )
}
