import { useState, useMemo } from 'react'
import { Download, AlertTriangle, Search } from 'lucide-react'
import { useFireData } from '../context/DataContext'
import KineticHeading from './KineticHeading'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getCellColor(val, maxVal) {
  if (val <= 2) return 'rgba(255, 255, 255, 0.06)'
  const r = val / Math.max(1, maxVal)
  if (r < 0.25) return 'rgba(56, 189, 248, 0.35)'
  if (r < 0.52) return 'rgba(250, 204, 21, 0.58)'
  if (r < 0.78) return 'rgba(249, 115, 22, 0.82)'
  return 'rgba(251, 113, 133, 0.92)'
}

export default function BurningCalendarCard() {
  const { dataset, generate26YearCalendar } = useFireData()
  const [regionKey, setRegionKey] = useState('bangladesh')
  const [useCalibrated, setUseCalibrated] = useState(true)
  const [selectedCell, setSelectedCell] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const calendar = useMemo(() => generate26YearCalendar(regionKey), [regionKey, generate26YearCalendar])

  const maxCellVal = useMemo(() => {
    let m = 1
    calendar.rows.forEach((r) => r.months.forEach((c) => { const v = useCalibrated ? c.harmonizedDays : c.rawCount; if (v > m) m = v }))
    return m
  }, [calendar, useCalibrated])

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return (dataset.harmonized || []).filter((p) => !q || `${p.lat} ${p.lon} ${p.date} ${p.sensors}`.toLowerCase().includes(q)).slice(0, 25)
  }, [dataset.harmonized, searchQuery])

  const exportCSV = () => {
    const header = 'region,year,month,raw_count,harmonized_burning_days,z_score,critical_anomaly\n'
    const lines = []
    calendar.rows.forEach((r) => r.months.forEach((c) => lines.push(`"${calendar.preset.name}",${c.year},${MONTHS[c.month - 1]},${c.rawCount},${c.harmonizedDays},${c.zScore},${c.isAnomaly}`)))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([header + lines.join('\n')], { type: 'text/csv' }))
    a.download = `al_biruni_26yr_calendar_${regionKey}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="apple-glass-card rounded-[32px] p-5 sm:p-7 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-fuchsia-300">26-YEAR HARMONIZED ARCHIVE (2001–2026)</span>
            <KineticHeading text="Month × Year Burning Activity Calendar" className="font-display text-xl sm:text-3xl font-bold text-white mt-0.5" />
            <p className="font-mono text-xs text-slate-400 mt-0.5">{calendar.preset.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={regionKey} onChange={(e) => { setRegionKey(e.target.value); setSelectedCell(null) }} className="px-4 py-2 rounded-full bg-slate-900/90 border border-white/15 text-xs font-semibold text-white outline-none">
              <option value="bangladesh">🇧🇩 Bangladesh (Sundarbans &amp; Croplands)</option>
              <option value="california">🇺🇸 California &amp; Western N. America</option>
              <option value="amazon">🇧🇷 Amazon Basin, South America</option>
              <option value="australia">🇦🇺 Northern &amp; Western Australia</option>
            </select>
            <div className="inline-flex p-1 rounded-full apple-glass-pill">
              <button onClick={() => setUseCalibrated(true)} className={`px-3.5 py-1 rounded-full text-xs font-mono transition ${useCalibrated ? 'bg-white text-slate-950 font-bold' : 'text-slate-300'}`}>✨ Calibrated</button>
              <button onClick={() => setUseCalibrated(false)} className={`px-3.5 py-1 rounded-full text-xs font-mono transition ${!useCalibrated ? 'bg-rose-500/30 text-rose-200 font-bold' : 'text-slate-300'}`}>⚠️ Raw Era</button>
            </div>
            <button onClick={exportCSV} className="px-4 py-2 rounded-full apple-glass-pill text-xs font-mono text-sky-200 hover:bg-white/15 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> CSV</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl apple-glass-pill"><div className="text-[10px] font-mono text-slate-400 uppercase">Monthly Normal (μ)</div><div className="text-lg font-mono font-bold text-white mt-0.5">{calendar.stats.mean} days</div></div>
          <div className="p-4 rounded-2xl apple-glass-pill"><div className="text-[10px] font-mono text-slate-400 uppercase">Anomaly Cutoff (μ+2σ)</div><div className="text-lg font-mono font-bold text-amber-300 mt-0.5">≥ {calendar.stats.threshold} days</div></div>
          <div className="p-4 rounded-2xl apple-glass-pill"><div className="text-[10px] font-mono text-slate-400 uppercase">Critical Anomalies</div><div className="text-lg font-mono font-bold text-rose-400 mt-0.5">{calendar.stats.anomalyCount} periods</div></div>
          <div className="p-4 rounded-2xl apple-glass-pill"><div className="text-[10px] font-mono text-slate-400 uppercase">Overlap Scaling (α)</div><div className="text-lg font-mono font-bold text-sky-300 mt-0.5">{calendar.stats.alphaFactor}× ratio</div></div>
        </div>

        <div className="font-mono text-xs text-sky-200 px-4 py-2.5 rounded-2xl apple-glass-pill">
          {selectedCell ? (<><b>{MONTHS[selectedCell.month - 1]} {selectedCell.year}:</b> {selectedCell.harmonizedDays} harmonized burning days (Z-score: {selectedCell.zScore >= 0 ? '+' : ''}{selectedCell.zScore} SD) • {selectedCell.sensorEra}</>) : ('Click any Month × Year cell below to inspect Z-score & sensor calibration')}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 max-h-[440px]">
          <table className="w-full text-center border-collapse text-xs">
            <thead className="sticky top-0 bg-[#0d111e] z-10">
              <tr className="font-mono text-[11px] text-slate-400">
                <th className="py-2.5 px-3 text-left">Year</th>
                {MONTHS.map((m) => <th key={m} className="py-2.5 px-1.5">{m}</th>)}
                <th className="py-2.5 px-3 text-right">Annual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {calendar.rows.map((row) => (
                <tr key={row.year} className="hover:bg-white/[0.03]">
                  <td className="py-1.5 px-3 text-left font-mono font-bold text-white whitespace-nowrap">{row.year} <span className="text-[9px] text-slate-400">{row.year < 2012 ? 'MODIS' : 'M+V'}</span></td>
                  {row.months.map((cell) => {
                    const val = useCalibrated ? cell.harmonizedDays : cell.rawCount
                    return (
                      <td key={cell.key} className="p-1">
                        <div onClick={() => setSelectedCell(cell)} style={{ backgroundColor: getCellColor(val, maxCellVal) }} className={`cal-cell mx-auto text-white ${cell.isAnomaly && useCalibrated ? 'cal-anomaly' : ''}`}>{val}</div>
                      </td>
                    )
                  })}
                  <td className="py-1.5 px-3 text-right font-mono font-semibold text-sky-300">{useCalibrated ? row.annualHarmonized : row.annualRaw}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 rounded-2xl apple-glass-pill text-xs text-slate-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div><strong className="text-white">Plain-Language Takeaway:</strong> {calendar.preset.summary}</div>
        </div>
      </div>

      <div className="apple-glass-card rounded-[32px] p-5 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-white">🔥 Top Radiative Wildfire Clusters (global_harmonized_2.json)</h3>
            <p className="text-xs text-slate-400">Sorted by peak Fire Radiative Power (FRP) after 1.5 km spatial-temporal merging</p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Filter date, coords, sensor..." className="pl-9 pr-4 py-2 rounded-full apple-glass-pill text-xs text-white outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white/[0.04] font-mono text-[11px] text-slate-400">
                <th className="py-3 px-4">Coordinates</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Sensors</th>
                <th className="py-3 px-4">Merged</th>
                <th className="py-3 px-4">Peak FRP</th>
                <th className="py-3 px-4">Certainty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredEvents.map((p, i) => (
                <tr key={i} className="hover:bg-white/[0.04]">
                  <td className="py-2.5 px-4 font-mono text-white">{p.lat.toFixed(4)}°, {p.lon.toFixed(4)}°</td>
                  <td className="py-2.5 px-4 font-mono text-slate-300">{p.date}</td>
                  <td className="py-2.5 px-4"><span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] ${p.cross_confirmed ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30' : 'bg-white/10 text-slate-200'}`}>{p.sensors}</span></td>
                  <td className="py-2.5 px-4 font-mono text-slate-300">{p.merged_count}×</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-amber-300">{Number(p.frp_max).toLocaleString()} MW</td>
                  <td className="py-2.5 px-4 font-mono text-emerald-300 font-semibold">{Math.round((p.confidence || 0.78) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}