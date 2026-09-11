import { useEffect, useState } from 'react'
import { qualityForWidth } from './behavior'
import type { AnimationSettings } from './controller'

export function useAnimationSettings(): AnimationSettings {
  const read = (): AnimationSettings => ({ quality: qualityForWidth(window.innerWidth), reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches })
  const [settings, setSettings] = useState(read)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setSettings(read())
    window.addEventListener('resize', update)
    media.addEventListener('change', update)
    return () => { window.removeEventListener('resize', update); media.removeEventListener('change', update) }
  }, [])
  return settings
}
