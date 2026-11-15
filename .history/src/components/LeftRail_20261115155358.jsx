import { LayoutGrid, Globe, Flame, Calendar, Cpu, Sliders } from 'lucide-react'

export default function LeftRail({ activeSection, onJump }) {
  const navItems = [
    { id: 'sec-hud', icon: LayoutGrid, label: 'Telemetry' },
    { id: 'sec-earth', icon: Globe, label: 'Earth Sync' },
    { id: 'sec-map', icon: Flame, label: 'Curtain Map' },
    { id: 'sec-calendar', icon: Calendar, label: '26-Yr Grid' },
    { id: 'sec-method', icon: Cpu, label: 'Algorithm' },
  ]

  return (
    <aside className="hidden lg:flex flex-col justify-between w-52 shrink-0 py-6 pr-4 border-r border-white/[0.07]">
      <div className="space-y-8">
        <div className="px-3">
          <div className="font-display font-bold text-xl tracking-tight text-white flex items-center gap-1.5">
            <span>Al-Biruni</span>
            <span className="text-amber-400 text-sm">✦</span>
          </div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-slate-400 uppercase mt-0.5">
            GEODESY // FIRMS
          </div>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => onJump(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-r-2xl text-xs font-medium transition text-left ${
                  active
                    ? 'bg-gradient-to-r from-fuchsia-600/35 to-amber-500/20 text-white border-l-2 border-amber-400 shadow-[0_0_20px_rgba(217,70,239,0.2)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-amber-300' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="px-3 space-y-2 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2 text-emerald-400">
          <Sliders className="w-3.5 h-3.5" />
          <span>4 Satellites Synced</span>
        </div>
        <div className="text-[10px] text-slate-500">NASA Space Apps 2026</div>
      </div>
    </aside>
  )
}