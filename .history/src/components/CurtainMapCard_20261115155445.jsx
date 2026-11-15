import { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import { Crosshair, Download, Flame, Eye } from 'lucide-react'
import { useFireData, haversineKm, REGIONAL_PRESETS } from '../context/DataContext'

export default function CurtainMapCard() {
  const { dataset } = useFireData()
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const cleanLayerRef = useRef(null)
  const rawLayerRef = useRef(null)
  const heatLayerRef = useRef(null)
  const radarLayerRef = useRef(null)

  const [viewMode, setViewMode] = useState('split')
  const [splitPct, setSplitPct] = useState(50)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [onlyDual, setOnlyDual] = useState(false)
  const [minFrp, setMinFrp] = useState(20)
  const [scanActive, setScanActive] = useState(false)
  const [scanResult, setScanResult] = useState(null)

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
      zoom: 5,
      zoomControl: false,
      preferCanvas: true,
    })

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri | NASA FIRMS',
        maxZoom: 18,
        className: 'night-satellite-tiles',
      }
    ).addTo(map)

    map.createPane('rawPane').style.zIndex = 410
    map.createPane('cleanPane').style.zIndex = 420

    cleanLayerRef.current = L.layerGroup().addTo(map)
    rawLayerRef.current = L.layerGroup().addTo(map)
    heatLayerRef.current = L.layerGroup().addTo(map)
    radarLayerRef.current = L.layerGroup().addTo(map)

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const fn = () => updateClip(splitPct, viewMode)
    fn()
    map.on('move zoom viewreset resize', fn)
    return () => map.off('move zoom viewreset resize', fn)
  }, [splitPct, viewMode])

  useEffect(() => {
    const rawGroup = rawLayerRef.current
    if (!rawGroup) return
    rawGroup.clearLayers()
    if (viewMode === 'clean') return

    ;(dataset.modis_raw || []).forEach((p) => {
      L.circleMarker([p.latitude, p.longitude], {
        pane: 'rawPane',
        radius: 5,
        color: '#f97316',
        fillColor: '#f97316',
        fillOpacity: 0.55,
        weight: 1,
      }).addTo(rawGroup)
    })

    ;(dataset.viirs_raw || []).forEach((p) => {
      L.circleMarker([p.latitude, p.longitude], {
        pane: 'rawPane',
        radius: 3,
        color: '#facc15',
        fillColor: '#facc15',
        fillOpacity: 0.72,
        weight: 0.5,
      }).addTo(rawGroup)
    })
  }, [dataset.modis_raw, dataset.viirs_raw, viewMode])

  useEffect(() => {
    const cleanGroup = cleanLayerRef.current
    const heatGroup = heatLayerRef.current
    if (!cleanGroup || !heatGroup) return
    cleanGroup.clearLayers()
    heatGroup.clearLayers()

    if (viewMode !== 'raw') {
      filteredClean.slice(0, 4000).forEach((p) => {
        L.circleMarker([p.lat, p.lon], {
          pane: 'cleanPane',
          radius: p.cross_confirmed ? 4.5 : 3,
          color: p.cross_confirmed ? '#38bdf8' : '#fb7185',
          fillColor: p.cross_confirmed ? '#38bdf8' : '#fb7185',
          fillOpacity: 0.92,
          weight: 1,
        })
          .bindPopup(
            `<div class="text-xs space-y-1">
              <div class="font-mono font-bold ${p.cross_confirmed ? 'text-sky-400' : 'text-rose-400'}">
                ${p.cross_confirmed ? '✅ DUAL-SENSOR VERIFIED' : '🛰️ HARMONIZED FIRE'}
              </div>
              <div>Peak FRP: <b>${p.frp_max} MW</b></div>
              <div>Merged: <b>${p.merged_count}×</b> (${p.sensors})</div>
              <div class="text-[10px] text-slate-400 font-mono">${p.date} • ${p.lat}°, ${p.lon}°</div>
            </div>`
          )
          .addTo(cleanGroup)

        if (showHeatmap) {
          L.circleMarker([p.lat, p.lon], {
            pane: 'cleanPane',
            radius: Math.min(26, Math.max(10, Math.sqrt(p.frp_max || 20) * 0.65)),
            color: 'transparent',
            fillColor: p.frp_max >= 500 ? '#fb7185' : '#f59e0b',
            fillOpacity: 0.22,
          }).addTo(heatGroup)
        }
      })
    }
  }, [filteredClean, viewMode, showHeatmap])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const onClick = (e) => {
      if (!scanActive) return
      const { lat, lng } = e.latlng
      radarLayerRef.current.clearLayers()
      L.circle([lat, lng], {
        radius: 200000,
        color: '#38bdf8',
        fillColor: '#38bdf8',
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '6, 6',
      }).addTo(radarLayerRef.current)

      const hits = filteredClean.filter((p) => haversineKm(lat, lng, p.lat, p.lon) <= 200)
      const dual = hits.filter((p) => p.cross_confirmed).length
      const peak = hits.length ? Math.max(...hits.map((p) => p.frp_max || 0)) : 0
      setScanResult({ lat: lat.toFixed(2), lon: lng.toFixed(2), count: hits.length, dual, peak: peak.toFixed(1) })
    }
    map.on('click', onClick)
    return () => map.off('click', onClick)
  }, [scanActive, filteredClean])

  const flyTo = (key) => {
    const r = REGIONAL_PRESETS[key]
    if (r && mapRef.current) mapRef.current.flyTo(r.center, r.zoom, { duration: 1.2 })
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

  return (
    <div className="astro-card rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
            SPATIAL HARMONIZATION WORKSTATION
          </span>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
            Split-Screen Curtain Compare Map (Raw vs. 1.5 km Clean)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => mapRef.current?.flyTo([20, 15], 2)} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs">🌍 Global</button>
          <button onClick={() => flyTo('bangladesh')} className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">🇧🇩 Bangladesh</button>
          <button onClick={() => flyTo('amazon')} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs">🇧🇷 Amazon</button>
          <button onClick={() => flyTo('california')} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs">🇺🇸 N. America</button>
          <button onClick={() => flyTo('australia')} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs">🇦🇺 Australia</button>
        </div>
      </div>

      <div className="relative h-[470px] sm:h-[540px] w-full rounded-2xl overflow-hidden border border-white/10">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {viewMode === 'split' && (
          <div
            style={{ left: `${splitPct}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_16px_#fbbf24] z-[500] pointer-events-none"
          >
            <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full bg-slate-950/90 border border-amber-400 text-[10px] font-mono text-amber-300 whitespace-nowrap">
              ◄ RAW | CLEAN ►
            </div>
          </div>
        )}

        <div className="absolute top-3 left-3 z-[600] flex items-center gap-1 p-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/15">
          {['split', 'clean', 'raw'].map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-3 py-1 rounded-lg text-[11px] font-mono uppercase transition ${
                viewMode === m ? 'bg-amber-500/25 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          onClick={exportGeoJSON}
          className="absolute top-3 right-3 z-[600] px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/15 text-[11px] font-mono text-sky-300 hover:border-sky-400 flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> Export GeoJSON
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex justify-between font-mono text-[11px] mb-1">
            <span className="text-slate-400">Curtain Split</span>
            <span className="text-amber-300">{splitPct}%</span>
          </div>
          <input type="range" min="5" max="95" value={splitPct} onChange={(e) => setSplitPct(Number(e.target.value))} className="w-full accent-amber-400" />
        </div>

        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex justify-between font-mono text-[11px] mb-1">
            <span className="text-slate-400">Min Peak FRP</span>
            <span className="text-rose-400">{minFrp} MW</span>
          </div>
          <input type="range" min="0" max="2000" step="50" value={minFrp} onChange={(e) => setMinFrp(Number(e.target.value))} className="w-full accent-rose-400" />
        </div>

        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-center gap-1.5">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-1.5 text-slate-300"><Eye className="w-3.5 h-3.5 text-sky-400" /> Dual-Sensor Only</span>
            <input type="checkbox" checked={onlyDual} onChange={(e) => setOnlyDual(e.target.checked)} className="accent-sky-400" />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-1.5 text-slate-300"><Flame className="w-3.5 h-3.5 text-amber-400" /> Thermal Glow</span>
            <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} className="accent-amber-400" />
          </label>
        </div>

        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-center">
          <button
            onClick={() => {
              setScanActive(!scanActive)
              if (scanActive) { radarLayerRef.current?.clearLayers(); setScanResult(null) }
            }}
            className={`w-full py-2 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              scanActive ? 'astro-pill-btn' : 'bg-rose-500/20 border border-rose-400/40 text-rose-200'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{scanActive ? 'Click on Map...' : '200 km Radar Scan'}</span>
          </button>
          {scanResult && (
            <div className="font-mono text-[10px] text-sky-300 mt-1.5 text-center">
              {scanResult.count} fires • {scanResult.dual} dual • {scanResult.peak} MW
            </div>
          )}
        </div>
      </div>
    </div>
  )
}