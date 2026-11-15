import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ChevronLeft, ChevronRight, Rocket } from 'lucide-react'
import { MicroRocketSVG } from './SpaceRockets'
import { useFireData } from '../context/DataContext'

const ORBITAL_MODES = [
  {
    title: 'AL-BIRUNI',
    subtitle: 'GLOBAL FIRE FUSION & GEODESY',
    stat1Label: 'CONSTELLATION', stat1Val: 'MODIS + VIIRS',
    stat2Label: 'FUSION RADIUS', stat2Val: '1.50 km',
    stat3Label: 'CLUTTER CUT', stat3Val: '94.7% Reduced',
    stat4Label: 'PEAK RADIATIVE', stat4Val: '12,048 MW',
  },
  {
    title: 'BANGLADESH',
    subtitle: 'SUNDARBANS & CROPLANDS',
    stat1Label: 'FOCUS ZONE', stat1Val: 'Sundarbans & CHT',
    stat2Label: 'RAW SIGNALS', stat2Val: '21,414,156',
    stat3Label: 'VERIFIED FIRES', stat3Val: '1,131,049',
    stat4Label: 'DUAL CONFIRMED', stat4Val: '173,642 Events',
  },
  {
    title: 'CHRONOS',
    subtitle: '26-YEAR BURNING ARCHIVE',
    stat1Label: 'TIMELINE', stat1Val: '2001 – 2026',
    stat2Label: 'OVERLAP RATIO', stat2Val: 'α = 1.36×',
    stat3Label: 'ANOMALY RULE', stat3Val: '> +2.0 SD',
    stat4Label: 'DATA SOURCE', stat4Val: 'NASA FIRMS C2',
  },
]

export default function OpeningPortal({ onEnterDashboard }) {
  const { dataset } = useFireData()
  const [slideIdx, setSlideIdx] = useState(0)
  const [launching, setLaunching] = useState(false)
  const portalRef = useRef(null)
  const titleRef = useRef(null)

  const current = ORBITAL_MODES[slideIdx]

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.opening-stagger',
        { opacity: 0, y: 26, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, stagger: 0.12, ease: 'power3.out' }
      )
    }, portalRef)
    return () => ctx.revert()
  }, [])

  const changeSlide = (dir) => {
    const next = (slideIdx + dir + ORBITAL_MODES.length) % ORBITAL_MODES.length
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: dir > 0 ? 24 : -24, letterSpacing: '0.28em', filter: 'blur(6px)' },
        { opacity: 1, y: 0, letterSpacing: '0.14em', filter: 'blur(0px)', duration: 0.55, ease: 'power3.out' }
      )
    }
    setSlideIdx(next)
  }

  const handleLetsGo = () => {
    setLaunching(true)
    gsap.to(portalRef.current, {
      opacity: 0, scale: 1.06, filter: 'blur(12px)', duration: 0.65, ease: 'power3.inOut', onComplete: onEnterDashboard,
    })
  }

  return (
    <div ref={portalRef} className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-8 bg-[#04060c]/95 backdrop-blur-2xl overflow-hidden">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[540px] h-[540px] rounded-full border border-white/[0.04]" />
        <div className="w-[780px] h-[780px] rounded-full border border-white/[0.04] absolute" />
        <div className="w-[1040px] h-[1040px] rounded-full border border-white/[0.03] absolute" />
      </div>

      <div className="apple-glass relative w-full max-w-[1160px] h-[86vh] max-h-[760px] rounded-[36px] px-6 sm:px-12 py-7 flex flex-col justify-between overflow-hidden">
        <div className="opening-stagger flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <img
              src="/banner.png"
              alt="Al-Biruni Logo"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
              className="w-10 h-10 rounded-full object-cover border border-amber-400/50 shadow-md"
            />
            <div className="hidden sm:block">
              <div className="font-mono text-[11px] tracking-[0.22em] text-slate-200 uppercase font-bold">AL-BIRUNI GEODESY • NASA FIRMS</div>
              <div className="font-mono text-[10px] text-emerald-400">{dataset.stats.total_raw.toLocaleString()} SATELLITE RECORDS READY</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rocket-hover hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full apple-glass-pill text-[11px] font-mono text-sky-300">
              <MicroRocketSVG className="w-4 h-4" />
              <span>ORBITAL SYNC v4.2</span>
            </div>
            <button
              onClick={handleLetsGo}
              className="px-6 py-2.5 rounded-full bg-white text-slate-950 font-semibold text-xs sm:text-sm tracking-wide shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition flex items-center gap-2"
            >
              <span>{launching ? 'Launching...' : "Let's Go"}</span>
              <Rocket className={`w-3.5 h-3.5 text-rose-500 ${launching ? 'translate-x-2 -translate-y-2 transition' : ''}`} />
            </button>
          </div>
        </div>

        <div className="relative flex-1 flex items-center justify-center my-2">
          <h1 ref={titleRef} className="opening-stagger font-display text-[44px] sm:text-[88px] lg:text-[112px] font-bold tracking-[0.14em] text-white/95 uppercase select-none text-center leading-none z-10 pointer-events-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] -mt-28 sm:-mt-36">
            {current.title}
          </h1>
          <div className="opening-stagger absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[38%] z-20">
            <div id="earth" />
            <div className="rocket-hover absolute -top-4 -right-6 flex items-center gap-1 px-2.5 py-1 rounded-full apple-glass-pill">
              <MicroRocketSVG className="w-5 h-5" flameColor="#34d399" />
              <span className="font-mono text-[9px] text-emerald-300">VIIRS 375m</span>
            </div>
          </div>
        </div>

        <div className="opening-stagger flex items-center justify-between gap-4 z-30">
          <button onClick={() => changeSlide(-1)} aria-label="Previous Mode" className="w-12 h-12 rounded-full apple-glass-pill flex items-center justify-center text-slate-200 hover:text-white hover:scale-105 transition shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="apple-glass-pill flex-1 max-w-2xl rounded-2xl sm:rounded-3xl px-5 sm:px-8 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div>
              <div className="font-mono text-[9px] sm:text-[10px] tracking-widest text-slate-400 uppercase">{current.stat1Label}</div>
              <div className="font-display text-xs sm:text-sm font-semibold text-white mt-0.5">{current.stat1Val}</div>
            </div>
            <div>
              <div className="font-mono text-[9px] sm:text-[10px] tracking-widest text-slate-400 uppercase">{current.stat2Label}</div>
              <div className="font-mono text-xs sm:text-sm font-semibold text-sky-300 mt-0.5">{current.stat2Val}</div>
            </div>
            <div>
              <div className="font-mono text-[9px] sm:text-[10px] tracking-widest text-slate-400 uppercase">{current.stat3Label}</div>
              <div className="font-mono text-xs sm:text-sm font-semibold text-emerald-300 mt-0.5">{current.stat3Val}</div>
            </div>
            <div>
              <div className="font-mono text-[9px] sm:text-[10px] tracking-widest text-slate-400 uppercase">{current.stat4Label}</div>
              <div className="font-mono text-xs sm:text-sm font-semibold text-amber-300 mt-0.5">{current.stat4Val}</div>
            </div>
          </div>
          <button onClick={() => changeSlide(1)} aria-label="Next Mode" className="w-12 h-12 rounded-full apple-glass-pill flex items-center justify-center text-slate-200 hover:text-white hover:scale-105 transition shrink-0">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}