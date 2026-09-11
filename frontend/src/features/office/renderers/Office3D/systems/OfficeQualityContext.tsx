import { createContext, useContext } from 'react'
import { getQualityConfig } from './GraphicsQuality'
export const OfficeQualityContext = createContext(getQualityConfig('balanced'))
export const useOfficeQuality = () => useContext(OfficeQualityContext)
