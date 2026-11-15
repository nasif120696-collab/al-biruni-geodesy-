import { useState, useMemo } from 'react'
import { DataProvider, useFireData } from './context/DataContext'
import ScrollManager from './components/ScrollManager'
import OpeningPortal from './components/OpeningPortal'
import SpaceRockets from './components/SpaceRockets'
import CurtainMapCard from './components/CurtainMapCard'
import BurningCalendarCard from './components/BurningCalendarCard'
import KineticHeading from './components/KineticHeading'
import { Flame, Calendar, Cpu, Rocket, Sparkles, Activity, MapPin } from 'lucide-react'

function DashboardContent({ onReopenPortal }) {
  const { dataset } = useFireData()
  const { stats, harmonized } = dataset

  const [activeLocation, setActiveLocation] = useState('Global / Bangladesh')
  const [latLon, setLatLon] = useState({ lat: 23.81, lon: 90.41 })
  const [frpInput, setFrpInput] = useState(320)

  const regionalClusters = useMemo(() => {
    return (harmonized || []).filter((p) => {
      const dist = Math.abs(p.lat - latLon.lat) + Math.abs(p.lon - latLon.lon)
      return dist < 15
    })
  }, [harmonized, latLon])

  const avgRegionalFRP = useMemo(() => {
    if (regionalClusters.length === 0) return 320
    const sum = regionalClusters.reduce((acc, curr) => acc + (curr.frp_max || 200), 0)
    return Math.round(sum / regionalClusters.length)
  }, [regionalClusters])

  const calculatedRiskScore = Math.min(99, Math.round((regionalClusters.length * 2.2 + (avgRegionalFRP / 75)) * 0.75))
  const estCarbonTons = Math.round(avgRegionalFRP * 0.42)

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen pb-24 relative">
      <header className="sticky top-4 z-[1000] max-w-[1380px] mx-auto px-4">
        <div className="apple-glass rounded-full px-5 py-2.5 flex items-center justify-between gap-3 shadow-2xl">
          <button onClick={onReopenPortal} className="flex items-center gap-2.5 text-left group shrink-0" title="Return to Portal">
            <img src="/banner.png" alt="Logo" onError={(e) => { e.currentTarget.style.display = 'none' }} className="w-8 h-8 rounded-full object-cover border border-amber-400/50 shadow" />
            <div>
              <span className="font-display font-bold text-xs tracking-wider text-white block leading-none">AL-BIRUNI</span>
              <span className="font-mono text-[8px] tracking-[0.15em] text-sky-300 uppercase">GEODESY // FIRMS</span>
            </div>
          </button>

          <nav className="hidden xl:flex items-center gap-1 font-medium text-xs">
            <button onClick={() => scrollToSection('dash-hero')} className="px-3 py-1.5 rounded-full text-slate-200 hover:bg-white/15 transition">Telemetry</button>
            <button onClick={() => scrollToSection('dash-map')} className="px-3 py-1.5 rounded-full text-slate-200 hover:bg-white/15 transition flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-rose-400" /> Curtain Map</button>
            <button onClick={() => scrollToSection('dash-predictor')} className="px-3 py-1.5 rounded-full text-slate-200 hover:bg-white/15 transition flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-amber-400" /> AI Predictor</button>
            <button onClick={() => scrollToSection('dash-calendar')} className="px-3 py-1.5 rounded-full text-slate-200 hover:bg-white/15 transition flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-amber-300" /> Calendar</button>
            <button onClick={() => scrollToSection('dash-lab')} className="px-3 py-1.5 rounded-full text-slate-200 hover:bg-white/15 transition flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-sky-400" /> Lab</button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onReopenPortal} className="px-3.5 py-1.5 rounded-full bg-white text-slate-950 text-xs font-semibold hover:scale-105 transition flex items-center gap-1.5 shadow">
              <Rocket className="w-3.5 h-3.5 text-sky-600" /><span>Portal</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1380px] mx-auto px-4 sm:px-8 pt-10 space-y-12">
        <section id="dash-hero" className="apple-glass rounded-[36px] p-6 sm:p-10 grid lg:grid-cols-12 items-center gap-8 relative overflow-hidden">
          <div className="lg:col-span-12 space-y-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full apple-glass-pill font-mono text-[11px] text-sky-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>NASA SPACE APPS 2026 • LEAFLET ZERO-KEY MAP</span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Orbital Wildfire Intelligence &amp; Sensor Sync
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
              Reconciling <strong className="text-white font-mono">{stats.total_raw.toLocaleString()}</strong> raw detections into <strong className="text-emerald-300 font-mono">{stats.harmonized_count.toLocaleString()}</strong> verified wildfire events[cite: 5].
            </p>
          </div>
        </section>

        {/* AI WILDFIRE SPREAD & THREAT PREDICTOR */}
        <section id="dash-predictor" className="apple-glass-card rounded-[32px] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" /> LOCATION-AWARE PREDICTOR: {activeLocation.toUpperCase()}
              </span>
              <KineticHeading text="Real-time Wildfire Spread & Threat Forecast" className="font-display text-xl sm:text-3xl font-bold text-white mt-0.5" />
            </div>
            <div className="px-4 py-2 rounded-2xl apple-glass-pill font-mono text-xs text-sky-200">
              Analyzed from {regionalClusters.length} Harmonized Clusters ({latLon.lat.toFixed(2)}°, {latLon.lon.toFixed(2)}°)
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-4 md:col-span-2 p-6 rounded-2xl apple-glass-pill">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="font-mono text-[10px] text-slate-400 uppercase">Target Region Lat/Lon</div>
                  <div className="font-mono text-sm font-bold text-white mt-1">{latLon.lat.toFixed(4)}°, {latLon.lon.toFixed(4)}°</div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="font-mono text-[10px] text-slate-400 uppercase">Detected Regional Clusters</div>
                  <div className="font-mono text-sm font-bold text-emerald-300 mt-1">{regionalClusters.length} Hotspots</div>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                *The AI Threat Predictor dynamically reads coordinate telemetry from your search or regional preset on the map below to compute authentic risk scores.
              </p>
            </div>

            <div className="p-6 rounded-2xl apple-glass-pill flex flex-col justify-between text-center space-y-3">
              <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">Regional Threat Index</div>
              <div className={`font-display text-4xl sm:text-5xl font-bold ${calculatedRiskScore > 70 ? 'text-rose-500 animate-pulse' : calculatedRiskScore > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {calculatedRiskScore} / 100
              </div>
              <div className="font-mono text-xs text-slate-200">
                Avg Peak FRP: <strong className="text-amber-300">{avgRegionalFRP} MW</strong><br />
                Est. Carbon Flux: <strong className="text-rose-300">{estCarbonTons} t/hr</strong>
              </div>
            </div>
          </div>
        </section>

        <section id="dash-map">
          <CurtainMapCard onLocationChange={(name, lat, lon) => { setActiveLocation(name); setLatLon({ lat, lon }); }} />
        </section>

        <section id="dash-calendar">
          <BurningCalendarCard />
        </section>
      </main>
    </div>
  )
}

export default function App() {
  const [entered, setEntered] = useState(false)

  return (
    <DataProvider>
      <ScrollManager />
      <SpaceRockets />
      {!entered && <OpeningPortal onEnterDashboard={() => setEntered(true)} />}
      <DashboardContent onReopenPortal={() => setEntered(false)} />
    </DataProvider>
  )
}