import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Hourglass, Calendar, Clock, Flame, BookOpen, Cpu } from 'lucide-react'
import { DataProvider, useFireData } from './context/DataContext'
import ScrollManager from './components/ScrollManager'
import LeftRail from './components/LeftRail'
import RotatingEarth from './components/RotatingEarth'
import CurtainMapCard from './components/CurtainMapCard'
import BurningCalendarCard from './components/BurningCalendarCard'

gsap.registerPlugin(ScrollTrigger)

function MissionControlDashboard() {
  const { dataset } = useFireData()
  const { stats } = dataset
  const rootRef = useRef(null)

  const [utc, setUtc] = useState(() => new Date().toISOString().slice(11, 19))
  const [selectedPlanet, setSelectedPlanet] = useState('global')
  const [activeSection, setActiveSection] = useState('sec-hud')

  const [distKm, setDistKm] = useState(0.9)
  const [hoursDiff, setHoursDiff] = useState(2.5)
  const isFused = distKm <= 1.5 && hoursDiff <= 6.0

  useEffect(() => {
    const timer = setInterval(() => setUtc(new Date().toISOString().slice(11, 19)), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.scroll-fade-item').forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 42, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              end: 'top 35%',
              toggleActions: 'play none none reverse',
            },
          }
        )
      })
    }, rootRef)

    return () => ctx.revert()
  }, [])

  const jumpTo = (id) => {
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const peakCluster = dataset.harmonized?.[0]

  return (
    <div ref={rootRef} className="min-h-screen py-4 sm:py-8 px-3 sm:px-6">
      <div className="astro-shell max-w-[1440px] mx-auto rounded-[32px] p-4 sm:p-7 flex gap-6">
        <LeftRail activeSection={activeSection} onJump={jumpTo} />

        <div className="flex-1 min-w-0 space-y-10">
          {/* TOP 4 TINTED KPI CARDS */}
          <section id="sec-hud" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="kpi-tint-1 rounded-3xl p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <Hourglass className="w-4 h-4 text-slate-300" />
                <span>Raw FIRMS Detections</span>
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-white mt-3">
                {stats.total_raw.toLocaleString()}
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">MODIS + 3 VIIRS Satellites</div>
            </div>

            <div className="kpi-tint-2 rounded-3xl p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs text-fuchsia-200/80 font-medium">
                <Calendar className="w-4 h-4 text-fuchsia-300" />
                <span>Harmonized Wildfire Events</span>
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-white mt-3">
                {stats.harmonized_count.toLocaleString()}
              </div>
              <div className="text-[11px] font-mono text-fuchsia-300 mt-1">{stats.reduction_pct}% Duplicate Clutter Cut</div>
            </div>

            <div className="kpi-tint-3 rounded-3xl p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs text-sky-200/80 font-medium">
                <Clock className="w-4 h-4 text-sky-300" />
                <span>Orbital Sync Time (UTC)</span>
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-white mt-3">
                {utc}
              </div>
              <div className="text-[11px] font-mono text-sky-300 mt-1">6.0h Overpass Window</div>
            </div>

            <div className="kpi-tint-4 rounded-3xl p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs text-amber-200/80 font-medium">
                <Flame className="w-4 h-4 text-amber-300" />
                <span>Cross-Sensor Confirmed</span>
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-white mt-3">
                {stats.cross_confirmed.toLocaleString()}
              </div>
              <div className="text-[11px] font-mono text-amber-300 mt-1">MODIS + VIIRS Dual-Lock</div>
            </div>
          </section>

          {/* CENTER HERO: ROTATING EARTH + RIGHT CHARTS & RINGS */}
          <section id="sec-earth" className="grid lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-6">
              <RotatingEarth
                selectedPlanet={selectedPlanet}
                onSelectPlanet={(p) => {
                  setSelectedPlanet(p)
                  if (p !== 'global') jumpTo('sec-map')
                }}
                peakCluster={peakCluster}
              />
            </div>

            <div className="lg:col-span-6 space-y-5">
              <div className="astro-card rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400">SEASONAL RADIATIVE FLUX (FRP WAVE)</span>
                  <span className="font-mono text-fuchsia-300 font-semibold">Peak: 12,048 MW</span>
                </div>
                <svg viewBox="0 0 420 95" className="w-full h-24 overflow-visible">
                  <defs>
                    <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d946ef" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#d946ef" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,78 Q35,68 65,42 T130,22 T195,55 T260,34 T330,18 T420,48 L420,95 L0,95 Z"
                    fill="url(#waveGrad)"
                  />
                  <path
                    d="M0,78 Q35,68 65,42 T130,22 T195,55 T260,34 T330,18 T420,48"
                    fill="none"
                    stroke="#e879f9"
                    strokeWidth="2.5"
                  />
                </svg>

                <div className="flex items-end justify-between gap-2 h-16 pt-2 px-2 border-t border-white/10">
                  {[35, 62, 95, 78, 44, 22, 18, 52, 88, 68, 40, 28].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        style={{ height: `${h}%` }}
                        className="w-1.5 rounded-full bg-gradient-to-t from-amber-400 to-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="astro-card rounded-3xl p-4 flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={() => jumpTo('sec-map')}
                  className="astro-pill-btn px-7 py-4 rounded-2xl text-sm tracking-wide hover:brightness-110 transition"
                >
                  Thermal Sync
                </button>
                <div className="pr-4">
                  <div className="font-mono text-2xl sm:text-3xl font-bold text-white">
                    {peakCluster ? `${Math.abs(peakCluster.lon).toFixed(1)}°` : '90.4°'}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      {peakCluster && peakCluster.lon < 0 ? 'W long' : 'E long'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Active Peak Cluster Coordinates
                  </div>
                </div>
              </div>

              <div className="astro-card rounded-3xl p-5 grid grid-cols-3 gap-3 text-center">
                {[
                  { pct: '94.7%', label: 'CLUTTER CUT', color: '#e879f9' },
                  { pct: '98.0%', label: 'DUAL CERTAINTY', color: '#38bdf8' },
                  { pct: '1.36×', label: 'OVERLAP RATIO', color: '#ffb067' },
                ].map((g, idx) => (
                  <div key={idx} className="flex flex-col items-center justify-center">
                    <div
                      style={{ borderColor: g.color }}
                      className="w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center bg-white/[0.02] shadow-inner"
                    >
                      <span className="font-mono text-sm font-bold text-white">{g.pct}</span>
                      <span className="font-mono text-[8px] text-slate-400 mt-0.5">{g.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SCROLL-REVEAL 1: SPLIT-SCREEN CURTAIN COMPARE MAP */}
          <section id="sec-map" className="scroll-fade-item">
            <CurtainMapCard />
          </section>

          {/* SCROLL-REVEAL 2: 26-YEAR BURNING CALENDAR & TOP CLUSTERS */}
          <section id="sec-calendar" className="scroll-fade-item">
            <BurningCalendarCard />
          </section>

          {/* SCROLL-REVEAL 3: METHODOLOGY, SIMULATOR & NASA CITATIONS */}
          <section id="sec-method" className="scroll-fade-item space-y-6">
            <div className="astro-card rounded-3xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-sky-400">
                    PHYSICAL ALGORITHM &amp; INTERACTIVE TESTBENCH
                  </span>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-amber-400" />
                    <span>1.5 km Spherical Chord Fusion &amp; 26-Year Calibration</span>
                  </h2>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <h3 className="font-display font-bold text-sm text-white">1. Why 1.5 km Spatial Radius?</h3>
                  <p>
                    MODIS resolves <strong className="text-white">1.0 km pixels at nadir</strong> (expanding up to ~4 km at scan edges), while VIIRS resolves <strong className="text-white">375 m pixels</strong>. A <strong className="text-amber-300">1.5 km spherical chord radius</strong> bridges pixel-center offsets and geolocation tolerance to merge duplicate alerts of one fire front without merging separate blazes.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <h3 className="font-display font-bold text-sm text-white">2. Making 2001–2026 Records Comparable</h3>
                  <p>
                    Using the <strong className="text-white">2012–2026 MODIS + VIIRS overlap period</strong>, we compute regional scaling factors (<strong className="text-sky-300">α = 1.35×–1.42×</strong>) and normalize activity into <strong className="text-white">harmonized burning days</strong>, flagging critical anomalies above <strong className="text-rose-400">Mean + 2 SD (μ + 2σ)</strong>.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Spatial Separation (MODIS ↔ VIIRS)</span>
                      <b className="font-mono text-amber-300">{distKm.toFixed(1)} km</b>
                    </div>
                    <input type="range" min="0.1" max="4.0" step="0.1" value={distKm} onChange={(e) => setDistKm(Number(e.target.value))} className="w-full accent-amber-400" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Orbital Overpass Time Delta</span>
                      <b className="font-mono text-amber-300">{hoursDiff.toFixed(1)} hrs</b>
                    </div>
                    <input type="range" min="0.5" max="12.0" step="0.5" value={hoursDiff} onChange={(e) => setHoursDiff(Number(e.target.value))} className="w-full accent-amber-400" />
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border flex flex-col justify-center ${isFused ? 'bg-emerald-500/10 border-emerald-400/40' : 'bg-amber-500/10 border-amber-400/40'}`}>
                  {isFused ? (
                    <div className="space-y-1">
                      <div className="font-mono font-bold text-emerald-300">✅ FUSED INTO 1 VERIFIED WILDFIRE EVENT</div>
                      <p className="text-slate-300">Satisfies ≤ 1.5 km spatial and ≤ 6.0 hr temporal criteria (+10% cross-sensor certainty boost).</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="font-mono font-bold text-amber-300">⚠️ PRESERVED AS 2 DISTINCT EVENTS</div>
                      <p className="text-slate-300">Exceeds 1.5 km or 6.0 hr threshold—preventing false merging of separate blazes.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="astro-card rounded-3xl p-6 grid md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5">
                <img
                  src="/banner.png"
                  alt="Al-Biruni Geodesy Fire Intelligence"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                  className="w-full rounded-2xl border border-amber-400/30 shadow-xl"
                />
              </div>
              <div className="md:col-span-7 space-y-2.5 text-xs text-slate-300">
                <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>NASA FIRMS Data Citations &amp; Transparency Disclosures</span>
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
                  <li>
                    <strong className="text-white">NASA FIRMS Active Fire Datasets (2025-11-14 to 2026-11-14):</strong> MODIS Collection 6.1 (1 km), Suomi-NPP VIIRS C2 (375 m), NOAA-20/J1 VIIRS C2 (375 m), and NOAA-21/J2 VIIRS C2 (375 m) Archive &amp; Near Real-Time (NRT) records (21,414,156 raw observations).
                  </li>
                  <li>
                    <strong className="text-white">Open-Source Software &amp; Basemaps:</strong> React, Vite, GSAP ScrollTrigger, Lenis, Leaflet, Python (pandas, numpy, scipy.spatial.cKDTree), and Esri World Imagery.
                  </li>
                  <li>
                    <strong className="text-white">Super Intelligence (SI) Acknowledgment:</strong> AI tools (Google Gemini) assisted with Python data streaming optimization, React dashboard scaffolding, and SI-generated team banner artwork; all scientific parameters and NASA datasets were verified by Team Al-Biruni Geodesy.
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <DataProvider>
      <ScrollManager />
      <MissionControlDashboard />
    </DataProvider>
  )
}