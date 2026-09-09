import React from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/shell/AppSidebar'
import { GlobalHeader } from '@/components/shell/GlobalHeader'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useUIStore } from '@/stores/ui-store'

export const MissionControlLayout: React.FC = () => {
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useUIStore()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090b10] text-[#f1f5f9]">
      {/* Desktop Sidebar (hidden on small mobile screens) */}
      <div className="hidden md:flex h-full shrink-0">
        <AppSidebar />
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-[#0b0e17] border-r border-[#1e2436]">
          <AppSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        <GlobalHeader />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#090b10]">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
