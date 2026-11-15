import { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import { Crosshair, Download, Flame, Eye, Map as MapIcon, ZoomIn, ZoomOut, Search } from 'lucide-react'
import { useFireData, haversineKm, REGIONAL_PRESETS } from '../context/DataContext'
import KineticHeading from './KineticHeading'

export default function CurtainMapCard({ onLocationChange }) {
  const { dataset } = useFireData()
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const baseLayerRef = useRef(null)
  const cleanLayerRef = useRef(null)
  const rawLayerRef = useRef(null)
  const heatLayerRef = useRef(null)
  const radarLayerRef = useRef(null)

  const [basemapStyle, setBasemapStyle] = useState('standard')
  const [viewMode, setViewMode] = useState('split')
  const [splitPct, setSplitPct] = useState(50)
  const [draggingCurtain, setDraggingCurtain] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [onlyDual, setOnlyDual] = useState(false)
  const [minFrp, setMinFrp] = useState(20)
  const [scanActive, setScanActive] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredClean = useMemo(() => {
    return (dataset.harmonized || []).filter((p) => {
      if (onlyDual && !p.cross_confirmed) return false
      if ((p.frp_max || 0) < minFrp) return false
      return true
    })
  }, [dataset.harmonized, onlyDual, minFrp])

  const updateClip = (pct, mode) => {
    const map = mapRef.current
    if (!map) return
    const cleanPane = map.getPane('cleanPane')
    const rawPane = map.getPane('rawPane')
    if (!cleanPane || !rawPane) return

    if (mode !== 'split') {
      cleanPane.style.clip = ''
      rawPane.style.clip = ''
      return
    }
    const size = map.getSize()
    const nw = map.containerPointToLayerPoint([0, 0])
    const se = map.containerPointToLayerPoint([size.x, size.y])
    const splitX = nw.x + (se.x - nw.x) * (pct / 100)
    rawPane.style.clip = `rect(${nw.y}px, ${splitX}px, ${se.y}px, ${nw.x}px)`
    cleanPane.style.clip = `rect(${nw.y}px, ${se.x}px, ${se.y}px, ${splitX}px)`
  }

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return
    const map = L.map(mapContainerRef.current, {
      center: [23.81, 90.41],
      zoom: 4,
      zoomControl: false,
      preferCanvas: true,
    })

    baseLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map)

    map.createPane('rawPane').style.zIndex = 410
    map.createPane('cleanPane').style.zIndex = 420

    cleanLayerRef.current = L.layerGroup().addTo(map)
    rawLayerRef.current = L.layerGroup().addTo(map)
    heatLayerRef.current = L.layerGroup().addTo(map)
    radarLayerRef.current = L.layerGroup().addTo(map)

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (baseLayerRef.current) map.removeLayer(baseLayerRef.current)

    if (basemapStyle === 'satellite') {
      baseLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri', maxZoom: 18,
      }).addTo(map)
    } else if (basemapStyle === 'topo') {
      baseLayerRef.current = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenTopoMap', maxZoom: 17,
      }).addTo(map)
    } else {
      baseLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap', maxZoom: 18,
      }).addTo(map)
    }
  }, [basemapStyle])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const fn = () => updateClip(splitPct, viewMode)
    fn()
    map.on('move zoom viewreset resize', fn)
    return () => map.off('move zoom viewreset resize', fn)
  }, [splitPct, viewMode])

  useEffect(() => {
    const map = mapRef.current
    const rawGroup = rawLayerRef.current
    const cleanGroup = cleanLayerRef.current
    const heatGroup = heatLayerRef.current
    if (!map || !rawGroup || !cleanGroup || !heatGroup) return

    const drawMarkers = () => {
      const z = map.getZoom()
      const baseR = z <= 3 ? 2.5 : z <= 5 ? 3.8 : z <= 7 ? 5.2 : 7

      rawGroup.clearLayers()
      cleanGroup.clearLayers()
      heatGroup.clearLayers()

      if (viewMode !== 'clean') {
        ;(dataset.modis_raw || []).forEach((p) => {
          L.circleMarker([p.latitude, p.longitude], {
            pane: 'rawPane', radius: baseR + 0.8, color: '#ea580c', fillColor: '#f97316', fillOpacity: 0.7, weight: 0.8,
          }).bindPopup(`<div class="text-xs font-mono"><b class="text-orange-600">RAW MODIS (1 km)</b><br/>FRP: ${p.frp} MW</div>`).addTo(rawGroup)
        })

        ;(dataset.viirs_raw || []).forEach((p) => {
          L.circleMarker([p.latitude, p.longitude], {
            pane: 'rawPane', radius: Math.max(2, baseR - 0.4), color: '#ca8a04', fillColor: '#fde047', fillOpacity: 0.85, weight: 0.6,
          }).bindPopup(`<div class="text-xs font-mono"><b class="text-yellow-600">RAW VIIRS (375 m)</b><br/>FRP: ${p.frp} MW</div>`).addTo(rawGroup)
        })
      }

      if (viewMode !== 'raw') {
        filteredClean.slice(0, 3500).forEach((p) => {
          if (showHeatmap) {
            L.circleMarker([p.lat, p.lon], {
              pane: 'cleanPane',
              radius: Math.min(32, Math.max(12, Math.sqrt(p.frp_max || 20) * 0.85)),
              color: 'transparent',
              fillColor: p.frp_max >= 500 ? '#ef4444' : '#f59e0b',
              fillOpacity: 0.35,
            }).addTo(heatGroup)
          }

          L.circleMarker([p.lat, p.lon], {
            pane: 'cleanPane', radius: p.cross_confirmed ? baseR + 1 : baseR, color: p.cross_confirmed ? '#0284c7' : '#be123c', fillColor: p.cross_confirmed ? '#38bdf8' : '#fb7185', fillOpacity: 0.96, weight: 1.2,
          }).bindPopup(
            `<div class="text-xs space-y-1 min-w-[190px]">
              <div class="font-mono font-bold ${p.cross_confirmed ? 'text-sky-600' : 'text-rose-600'}">
                ${p.cross_confirmed ? '✅ DUAL-SENSOR VERIFIED' : '🛰️ HARMONIZED FIRE'}
              </div>
              <div>Peak FRP: <b>${p.frp_max} MW</b></div>
              <div>Merged: <b>${p.merged_count}×</b> (${p.sensors})</div>
              <div class="text-[10px] text-slate-500 font-mono">${p.date} • ${p.lat}°, ${p.lon}°</div>
            </div>`
          ).addTo(cleanGroup)
        })
      }
    }

    drawMarkers()
    map.on('zoomend', drawMarkers)
    return () => map.off('zoomend', drawMarkers)
  }, [dataset.modis_raw, dataset.viirs_raw, filteredClean, viewMode, showHeatmap])

  const handleLocationSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      if (data && data.length > 0) {
        const { lat, lon } = data[0]
        const parsedLat = parseFloat(lat)
        const parsedLon = parseFloat(lon)
        mapRef.current?.flyTo([parsedLat, parsedLon], 8, { duration: 1.5 })
        if (onLocationChange) onLocationChange(searchQuery, parsedLat, parsedLon)
      } else {
        alert('Location not found.')
      }
    } catch (err) {
      console.error('Search failed:', err)
    }
  }

  const flyTo = (key) => {
    const r = REGIONAL_PRESETS[key]
    if (r && mapRef.current) {
      mapRef.current.flyTo(r.center, r.zoom, { duration: 1.1 })
      if (onLocationChange) onLocationChange(r.name, r.center[0], r.center[1])
    }
  }

  const exportGeoJSON = () => {
    const fc = {
      type: 'FeatureCollection',
      features: filteredClean.slice(0, 5000).map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
        properties: p,
      })),
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' }))
    a.download = 'al_biruni_harmonized_hotspots.geojson'
    a.click()
  }

  const handleBoxPointerMove = (e) => {
    if (!draggingCurtain) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100))
    setSplitPct(Math.round(pct))
  }

  return (
    <div className="apple-glass-card rounded-[32px] p-5 sm:p-7 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-sky-400">
            OPEN-SOURCE LEAFLET ENGINE • ZERO API KEY REQUIRED
          </span>
          <KineticHeading
            text="Split-Screen Curtain Compare Map"
            className="font-display text-xl sm:text-3xl font-bold text-white mt-0.5"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleLocationSearch} className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-300 absolute left-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search place (e.g., Dhaka, California)..."
              className="pl-9 pr-4 py-1.5 rounded-full apple-glass-pill text-xs text-white placeholder-slate-300 outline-none w-48 sm:w-56 focus:w-64 transition-all"
            />
          </form>

          <button onClick={() => { mapRef.current?.flyTo([20, 15], 2); if (onLocationChange) onLocationChange('Global', 20, 15); }} className="px-3.5 py-1.5 rounded-full apple-glass-pill text-xs text-white font-medium hover:bg-white/20 transition">🌍 Global</button>
          <button onClick={() => flyTo('bangladesh')} className="px-3.5 py-1.5 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 text-xs font-semibold hover:bg-emerald-500/40 transition">🇧🇩 Bangladesh</button>
          <button onClick={() => flyTo('amazon')} className="px-3.5 py-1.5 rounded-full apple-glass-pill text-xs text-white font-medium hover:bg-white/20 transition">🇧🇷 Amazon</button>
          <button onClick={() => flyTo('california')} className="px-3.5 py-1.5 rounded-full apple-glass-pill text-xs text-white font-medium hover:bg-white/20 transition">🇺🇸 N. America</button>
          <button onClick={() => flyTo('australia')} className="px-3.5 py-1.5 rounded-full apple-glass-pill text-xs text-white font-medium hover:bg-white/20 transition">🇦🇺 Australia</button>
        </div>
      </div>

      <div
        onPointerMove={handleBoxPointerMove}
        onPointerUp={() => setDraggingCurtain(false)}
        onPointerLeave={() => setDraggingCurtain(false)}
        className="relative h-[500px] sm:h-[560px] w-full rounded-[24px] overflow-hidden border border-white/15 select-none shadow-2xl bg-slate-900"
      >
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {viewMode === 'split' && (
          <div
            style={{ left: `${splitPct}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_20px_#38bdf8] z-[500]"
          >
            <button
              type="button"
              onPointerDown={(e) => { e.stopPropagation(); setDraggingCurtain(true) }}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-full bg-slate-950/90 border border-white/40 text-[11px] font-mono font-bold text-white whitespace-nowrap shadow-2xl cursor-ew-resize hover:scale-105 transition"
            >
              ◄ RAW | CLEAN ►
            </button>
          </div>
        )}

        <div className="absolute top-3 left-3 z-[600] flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-full bg-slate-950/85 backdrop-blur-xl border border-white/20 shadow-lg">
            {['split', 'clean', 'raw'].map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3.5 py-1 rounded-full text-[11px] font-mono uppercase font-bold transition ${viewMode === m ? 'bg-white text-slate-950 shadow' : 'text-slate-200 hover:text-white'}`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-full bg-slate-950/85 backdrop-blur-xl border border-white/20 shadow-lg text-[11px] font-mono">
            <MapIcon className="w-3.5 h-3.5 text-sky-400 ml-2" />
            {[
              { id: 'standard', label: 'Standard' },
              { id: 'satellite', label: 'Satellite' },
              { id: 'topo', label: 'Topography' },
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => setBasemapStyle(b.id)}
                className={`px-3 py-1 rounded-full font-bold transition ${basemapStyle === b.id ? 'bg-sky-500 text-white shadow' : 'text-slate-200 hover:text-white'}`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute top-3 right-3 z-[600] flex items-center gap-1.5">
          <button onClick={() => mapRef.current?.zoomIn()} className="p-2.5 rounded-full bg-slate-950/85 backdrop-blur-xl border border-white/25 text-white hover:scale-105 transition shadow"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={() => mapRef.current?.zoomOut()} className="p-2.5 rounded-full bg-slate-950/85 backdrop-blur-xl border border-white/25 text-white hover:scale-105 transition shadow"><ZoomOut className="w-4 h-4" /></button>
          <button onClick={exportGeoJSON} className="px-4 py-2 rounded-full bg-slate-950/85 backdrop-blur-xl border border-white/25 text-[11px] font-mono text-sky-200 font-bold hover:bg-white/20 flex items-center gap-1.5 transition shadow"><Download className="w-3.5 h-3.5" /> GeoJSON</button>
        </div>

        <div className="absolute bottom-5 right-3 z-[600] p-3.5 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-white/25 text-[11px] font-mono space-y-1.5 shadow-2xl text-slate-100">
          <div className="text-[10px] text-sky-300 uppercase tracking-wider font-bold">SENSOR LEGEND</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /><span>Raw MODIS (1 km clutter)</span></div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /><span>Raw VIIRS (375 m clutter)</span></div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /><span>Dual-Confirmed (MODIS+VIIRS)</span></div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /><span>Harmonized Fire Event</span></div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
        <div className="p-3.5 rounded-2xl apple-glass-pill">
          <div className="flex justify-between font-mono text-[11px] mb-1.5"><span className="text-slate-300">Curtain Split</span><span className="text-sky-300 font-bold">{splitPct}%</span></div>
          <input type="range" min="5" max="95" value={splitPct} onChange={(e) => setSplitPct(Number(e.target.value))} className="w-full accent-sky-400" />
        </div>
        <div className="p-3.5 rounded-2xl apple-glass-pill">
          <div className="flex justify-between font-mono text-[11px] mb-1.5"><span className="text-slate-300">Min Peak FRP</span><span className="text-rose-300 font-bold">{minFrp} MW</span></div>
          <input type="range" min="0" max="2000" step="50" value={minFrp} onChange={(e) => setMinFrp(Number(e.target.value))} className="w-full accent-rose-400" />
        </div>
        <div className="p-3.5 rounded-2xl apple-glass-pill flex flex-col justify-center gap-2">
          <label className="flex items-center justify-between cursor-pointer"><span className="flex items-center gap-1.5 text-slate-200"><Eye className="w-3.5 h-3.5 text-sky-400" /> Dual-Sensor Only</span><input type="checkbox" checked={onlyDual} onChange={(e) => setOnlyDual(e.target.checked)} className="accent-sky-400" /></label>
          <label className="flex items-center justify-between cursor-pointer"><span className="flex items-center gap-1.5 text-slate-200"><Flame className="w-3.5 h-3.5 text-amber-400" /> Thermal Glow</span><input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} className="accent-amber-400" /></label>
        </div>
        <div className="p-3.5 rounded-2xl apple-glass-pill flex flex-col justify-center">
          <button
            onClick={() => { setScanActive(!scanActive); if (scanActive) { radarLayerRef.current?.clearLayers(); setScanResult(null) } }}
            className={`w-full py-2.5 rounded-full font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition ${scanActive ? 'bg-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'bg-sky-500/25 border border-sky-400/50 text-sky-200 hover:bg-sky-500/40'}`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{scanActive ? 'Click on Map...' : '200 km Radar Scan'}</span>
          </button>
          {scanResult && <div className="font-mono text-[10px] text-sky-300 mt-1.5 text-center">{scanResult.count} fires • {scanResult.dual} dual • {scanResult.peak} MW</div>}
        </div>
      </div>
    </div>
  )
}