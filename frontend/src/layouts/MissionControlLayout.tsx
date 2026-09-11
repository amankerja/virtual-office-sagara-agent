import React from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/shell/AppSidebar'
import { GlobalHeader } from '@/components/shell/GlobalHeader'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useUIStore } from '@/stores/ui-store'
import { useRealtime } from '@/features/realtime'

export const MissionControlLayout: React.FC = () => {
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useUIStore()
  useRealtime()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors">
      {/* Desktop & Tablet Sidebar (Hidden on mobile < 768px) */}
      <div className="hidden md:flex h-full shrink-0">
        <AppSidebar isMobile={false} />
      </div>

      {/* Mobile Navigation Sheet */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72 max-w-[85vw] bg-surface-subtle border-r border-border">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <AppSidebar isMobile={true} />
        </SheetContent>
      </Sheet>

      {/* Main Viewport Container */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        <GlobalHeader />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 bg-background transition-colors">
          <div className="mx-auto max-w-7xl w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
