import React from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/app/theme-provider'
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

interface ThemeSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'segmented';
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className,
  variant = 'dropdown',
}) => {
  const { preference, resolvedTheme, setTheme } = useTheme()

  if (variant === 'segmented') {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-lg border border-border bg-surface-subtle p-1 gap-1',
          className
        )}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
            preference === 'light'
              ? 'bg-surface text-text-primary shadow-xs border border-border'
              : 'text-text-muted hover:text-text-primary'
          )}
          title="Light Theme"
        >
          <Sun className="h-3.5 w-3.5" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
            preference === 'dark'
              ? 'bg-surface text-text-primary shadow-xs border border-border'
              : 'text-text-muted hover:text-text-primary'
          )}
          title="Dark Theme"
        >
          <Moon className="h-3.5 w-3.5" />
          <span>Dark</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('system')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
            preference === 'system'
              ? 'bg-surface text-text-primary shadow-xs border border-border'
              : 'text-text-muted hover:text-text-primary'
          )}
          title="System Theme"
        >
          <Monitor className="h-3.5 w-3.5" />
          <span>System</span>
        </button>
      </div>
    )
  }

  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className={cn(
            'text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors min-h-9 min-w-9 sm:min-h-7 sm:min-w-7',
            className
          )}
          title={`Appearance: ${preference.toUpperCase()}`}
          aria-label="Theme selector"
        >
          <CurrentIcon className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-surface-overlay border-border text-text-primary">
        <DropdownMenuLabel className="text-[10px] font-semibold text-text-muted uppercase tracking-wider font-mono-tech">
          Appearance
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={cn(
            'flex items-center justify-between text-xs cursor-pointer focus:bg-surface-hover focus:text-text-primary',
            preference === 'light' && 'font-semibold text-interactive'
          )}
        >
          <span className="flex items-center gap-2">
            <Sun className="h-3.5 w-3.5" />
            Light
          </span>
          {preference === 'light' && <span className="text-[10px] font-mono-tech">●</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={cn(
            'flex items-center justify-between text-xs cursor-pointer focus:bg-surface-hover focus:text-text-primary',
            preference === 'dark' && 'font-semibold text-interactive'
          )}
        >
          <span className="flex items-center gap-2">
            <Moon className="h-3.5 w-3.5" />
            Dark
          </span>
          {preference === 'dark' && <span className="text-[10px] font-mono-tech">●</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={cn(
            'flex items-center justify-between text-xs cursor-pointer focus:bg-surface-hover focus:text-text-primary',
            preference === 'system' && 'font-semibold text-interactive'
          )}
        >
          <span className="flex items-center gap-2">
            <Monitor className="h-3.5 w-3.5" />
            System
          </span>
          {preference === 'system' && <span className="text-[10px] font-mono-tech">●</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
