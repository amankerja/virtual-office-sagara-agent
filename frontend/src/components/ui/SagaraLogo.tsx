import React from 'react'

interface SagaraLogoProps {
  className?: string
  size?: number
}

export const SagaraLogo: React.FC<SagaraLogoProps> = ({ className = 'h-8 w-8', size = 32 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id="sagaraGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      
      {/* Outer Hexagon Frame */}
      <polygon
        points="256,32 448,144 448,368 256,480 64,368 64,144"
        fill="none"
        stroke="url(#sagaraGlowGrad)"
        strokeWidth="32"
        strokeLinejoin="round"
      />
      
      {/* Inner Core Hexagon */}
      <polygon
        points="256,96 384,176 384,336 256,416 128,336 128,176"
        fill="url(#sagaraGlowGrad)"
        fillOpacity="0.15"
        stroke="url(#sagaraGlowGrad)"
        strokeWidth="12"
      />
      
      {/* Stylized 'S' Agentic Circuit Ribbon */}
      <path
        d="M 340,165 L 220,165 C 170,165 160,215 210,245 L 302,275 C 352,305 340,355 290,355 L 172,355"
        fill="none"
        stroke="url(#sagaraGlowGrad)"
        strokeWidth="38"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Glowing Core Nodes */}
      <circle cx="256" cy="260" r="26" fill="#00f2fe" />
      <circle cx="340" cy="165" r="16" fill="#00f2fe" />
      <circle cx="172" cy="355" r="16" fill="#8b5cf6" />
    </svg>
  )
}
