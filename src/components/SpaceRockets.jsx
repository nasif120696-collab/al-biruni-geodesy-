export function MicroRocketSVG({ className = 'w-6 h-6', flameColor = '#38bdf8' }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" className={className}>
      <path d="M15 26 L18 35 L21 26 Z" fill={flameColor} opacity="0.9" />
      <path d="M16.5 26 L18 32 L19.5 26 Z" fill="#ffffff" />
      <path d="M12 21 L8 26 L13 25 Z" fill="#fb7185" />
      <path d="M24 21 L28 26 L23 25 Z" fill="#fb7185" />
      <path d="M18 4 C13 11 13 20 14 26 L22 26 C23 20 23 11 18 4 Z" fill="#f8fafc" />
      <path d="M18 4 C16 7 15.2 9.5 15 11 L21 11 C20.8 9.5 20 7 18 4 Z" fill="#38bdf8" />
      <circle cx="18" cy="16" r="2.3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
    </svg>
  )
}

export default function SpaceRockets() {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      <div className="rocket-fly-1 fixed bottom-10 left-0 flex items-center gap-1 opacity-0">
        <MicroRocketSVG className="w-7 h-7 drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]" flameColor="#38bdf8" />
        <span className="font-mono text-[9px] text-sky-300/85 tracking-widest uppercase">NOAA-21</span>
      </div>
      <div className="rocket-fly-2 fixed bottom-1/3 left-0 flex items-center gap-1 opacity-0">
        <MicroRocketSVG className="w-6 h-6 drop-shadow-[0_0_12px_rgba(251,113,133,0.8)]" flameColor="#fb7185" />
        <span className="font-mono text-[9px] text-rose-300/85 tracking-widest uppercase">AQUA-MODIS</span>
      </div>
    </div>
  )
}