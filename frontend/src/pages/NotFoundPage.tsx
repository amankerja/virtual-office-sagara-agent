import React from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 transition-colors">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 mb-4">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight text-text-primary mb-2 font-mono-tech">
        404 — Route Not Found
      </h1>
      <p className="text-xs text-text-secondary max-w-sm mb-6 leading-relaxed">
        The requested Mission Control sector does not exist or has not been provisioned in this release.
      </p>
      <Button asChild size="sm" className="bg-interactive hover:bg-interactive-hover text-white font-mono-tech text-xs min-h-[40px] sm:min-h-[32px]">
        <Link to="/">
          <Home className="mr-1.5 h-3.5 w-3.5" />
          Return to Command Center
        </Link>
      </Button>
    </div>
  )
}
