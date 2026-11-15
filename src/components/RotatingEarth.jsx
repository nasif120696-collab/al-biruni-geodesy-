import { useState } from 'react'

export default function RotatingEarth({ selectedPlanet, onSelectPlanet, peakCluster }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div className="relative flex flex-col items-center justify-center py-6 select-none">
      <div className="absolute w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-amber-500/20 via-rose-500/15 to-sky-500/20 blur-3xl pointer-events-none" />

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex items-center justify-center"
      >
        <div id="earth" className="transition-transform duration-500 hover:scale-[1.03]">
          <svg
            viewBox="0 0 360 360"
            className="geodesic-mesh absolute inset-0 w-full h-full pointer-events-none rounded-full"
          >
            <g stroke="rgba(255,255,255,0.42)" strokeWidth="0.9" fill="rgba(255,176,103,0.05)">
              <polygon points="155,25 215,45 170,95" />
              <polygon points="155,25 115,65 170,95" />
              <polygon points="215,45 245,105 170,95" />
              <polygon points="115,65 170,95 130,150" />
              <polygon points="170,95 245,105 190,165" />
              <polygon points="170,95 130,150 190,165" />
              <polygon points="130,150 190,165 110,215" />
              <polygon points="190,165 255,210 175,245" />
              <polygon points="130,150 110,215 175,245" />
              <polygon points="190,165 175,245 255,210" />
              <polygon points="110,215 175,245 140,305" />
              <polygon points="175,245 235,285 140,305" />
              <polygon points="175,245 255,210 235,285" />
              <polygon points="140,305 235,285 185,342" />
            </g>
            <circle cx="170" cy="95" r="3" fill="#38bdf8" />
            <circle cx="190" cy="165" r="3.5" fill="#fb7185" />
            <circle cx="175" cy="245" r="3" fill="#ffb067" />
            <circle cx="130" cy="150" r="2.5" fill="#ffffff" />
            <circle cx="245" cy="105" r="2.5" fill="#38bdf8" />
          </svg>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 font-mono text-xs text-white shadow-xl absolute -top-2 -right-12">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>
            Δr = 1.50 km • {peakCluster ? `${peakCluster.lat}°, ${peakCluster.lon}°` : '23.81°N, 90.41°E'}
          </span>
        </div>
      </div>

      <div className="w-full flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-4 px-2">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-300/90">
            {hovered ? 'MODIS 1KM + VIIRS 375M SYNCHRONIZED' : '3RD PLANET • ACTIVE THERMAL TELEMETRY'}
          </div>
          <h1 className="font-display text-5xl sm:text-7xl font-bold tracking-tight text-white leading-none mt-1">
            Earth
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Harmonized Global &amp; Bangladesh Wildfire Observatory
          </p>
        </div>

        <div className="flex sm:flex-col items-center gap-2 bg-white/[0.03] border border-white/10 p-1.5 rounded-2xl">
          {[
            { id: 'global', label: '🌍', title: 'Global Orbit' },
            { id: 'bangladesh', label: '🇧🇩', title: 'Bangladesh' },
            { id: 'amazon', label: '🔥', title: 'Amazon Basin' },
            { id: 'california', label: '🌲', title: 'N. America' },
          ].map((node) => (
            <button
              key={node.id}
              onClick={() => onSelectPlanet(node.id)}
              title={node.title}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition ${
                selectedPlanet === node.id
                  ? 'bg-gradient-to-br from-fuchsia-500/40 to-amber-500/40 border border-amber-300/60 scale-110 shadow-[0_0_15px_rgba(251,146,60,0.4)]'
                  : 'text-slate-400 hover:bg-white/10'
              }`}
            >
              {node.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}