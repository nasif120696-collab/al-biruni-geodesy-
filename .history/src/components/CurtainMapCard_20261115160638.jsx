import { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import { Crosshair, Download, Flame, Eye, Map as MapIcon, ZoomIn, ZoomOut } from 'lucide-react'
import { useFireData, haversineKm, REGIONAL_PRESETS } from '../context/DataContext'

export default function CurtainMapCard() {
  const { dataset } = useFireData()
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const baseLayerRef = useRef(null)
  const labelLayerRef = useRef(null)
  const cleanLayerRef = useRef(null)
  const rawLayerRef = useRef(null)
  const heatLayerRef = useRef(null)
  const radarLayerRef = useRef(null)

  const [basemapStyle, setBasemapStyle] = useState('tactical') // 'tactical' | 'satellite' | 'light'
  const [viewMode, setViewMode] = useState('split') // 'split' | 'clean' | 'raw'
  const [splitPct, setSplitPct] = useState(50)
  const [draggingCurtain, setDraggingCurtain] = useState(false)
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

  // Initialize crisp, readable map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return
    const map = L.map(mapContainerRef.current, {
      center: [22.0, 45.0],
      zoom: 3,
      zoomControl: false,
      preferCanvas: true,
    })

    // Default: Crisp CartoDB Dark Matter with clear country borders, coastlines & city names
    baseLayerRef.current = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap &copy; CARTO | NASA FIRMS',
        subdomains: 'abcd',
        maxZoom: 18,
      }
    ).addTo(map)

    labelLayerRef.current = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
      {
        subdomains: 'abcd',
        maxZoom: 18,
        pane: 'overlayPane',
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

  // Switch Basemap Style (Tactical Dark / Clear Satellite / High-Contrast Terrain)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (baseLayerRef.current) map.removeLayer(baseLayerRef.current)
    if (labelLayerRef.current) map.removeLayer(labelLayerRef.current)

    if (basemapStyle === 'satellite') {
      baseLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri | NASA FIRMS',
          maxZoom: 18,
          className: 'night-satellite-tiles',
        }
      ).addTo(map)
      labelLayerRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', maxZoom: 18 }
      ).addTo(map)
    } else if (basemapStyle === 'light') {
      baseLayerRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap &copy; CARTO | NASA FIRMS',
          subdomains: 'abcd',
          maxZoom: 18,
        }
      ).addTo(map)
    } else {
      baseLayerRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap &copy; CARTO | NASA FIRMS',
          subdomains: 'abcd',
          maxZoom: 18,
        }
      ).addTo(map)
      labelLayerRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', maxZoom: 18 }
      ).addTo(map)
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

  // Render crisp, non-cluttered zoom-adaptive markers
  useEffect(() => {
    const map = mapRef.current
    const rawGroup = rawLayerRef.current
    const cleanGroup = cleanLayerRef.current
    const heatGroup = heatLayerRef.current
    if (!map || !rawGroup || !cleanGroup || !heatGroup) return

    const drawMarkers = () => {
      const z = map.getZoom()
      const baseR = z <= 3 ? 2.2 : z <= 5 ? 3.2 : z <= 7 ? 4.5 : 6

      rawGroup.clearLayers()
      cleanGroup.clearLayers()
      heatGroup.clearLayers()

      if (viewMode !== 'clean') {
        ;(dataset.modis_raw || []).forEach((p) => {
          L.circleMarker([p.latitude, p.longitude], {
            pane: 'rawPane',
            radius: baseR + 0.8,
            color: '#ea580c',
            fillColor: '#f97316',
            fillOpacity: 0.65,
            weight: 0.8,
          })
            .bindPopup(`<div class="text-xs font-mono"><b class="text-orange-400">RAW MODIS (1 km)</b><br/>FRP: ${p.frp} MW</div>`)
            .addTo(rawGroup)
        })

        ;(dataset.viirs_raw || []).forEach((p) => {
          L.circleMarker([p.latitude, p.longitude], {
            pane: 'rawPane',
            radius: Math.max(1.8, baseR - 0.3),
            color: '#eab308',
            fillColor: '#fde047',
            fillOpacity: 0.8,
            weight: 0.4,
          })
            .bindPopup(`<div class="text-xs font-mono"><b class="text-yellow-300">RAW VIIRS (375 m)</b><br/>FRP: ${p.frp} MW</div>`)
            .addTo(rawGroup)
        })
      }

      if (viewMode !== 'raw') {
        filteredClean.slice(0, 3500).forEach((p) => {
          L.circleMarker([p.lat, p.lon], {
            pane: 'cleanPane',
            radius: p.cross_confirmed ? baseR + 0.6 : baseR,
            color: p.cross_confirmed ? '#0284c7' : '#e11d48',
            fillColor: p.cross_confirmed ? '#38bdf8' : '#fb7185',
            fillOpacity: 0.9,
            weight: 0.9,
          })
            .bindPopup(
              `<div class="text-xs space-y-1 min-w-[190px]">
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
              radius: Math.min(24, Math.max(8, Math.sqrt(p.frp_max || 20) * 0.55)),
              color: 'transparent',
              fillColor: p.frp_max >= 500 ? '#fb7185' : '#f59e0b',
              fillOpacity: 0.22,
            }).addTo(heatGroup)
          }
        })
      }
    }

    drawMarkers()
    map.on('zoomend', drawMarkers)
    return () => map.off('zoomend', drawMarkers)
  }, [dataset.modis_raw, dataset.viirs_raw, filteredClean, viewMode, showHeatmap])

  // 200 km Radar Click
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
        fillOpacity: 0.14,
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
    if (r && mapRef.current) mapRef.current.flyTo(r.center, r.zoom, { duration: 1.1 })
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
    <div className="astro-card rounded-3xl p-5 sm:p-6 space-y-4">
      {/* Header & Region Quick-Jump */}
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
          <button onClick={() => mapRef.current?.flyTo([22, 45], 3)} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs">🌍 Global</button>
          <button onClick={() => flyTo('bangladesh')} className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold">🇧🇩 Bangladesh</button>
          <button onClick={() => flyTo('amazon')} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs">🇧🇷 Amazon</button>
          <button onClick={() => flyTo('california')} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs">🇺🇸 N. America</button>
          <button onClick={() => flyTo('australia')} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs">🇦🇺 Australia</button>
        </div>
      </div>

      {/* Map Box with Draggable Curtain & Clear Legend */}
      <div
        onPointerMove={handleBoxPointerMove}
        onPointerUp={() => setDraggingCurtain(false)}
        onPointerLeave={() => setDraggingCurtain(false)}
        className="relative h-[500px] sm:h-[560px] w-full rounded-2xl overflow-hidden border border-white/15 select-none"
      >
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Draggable Curtain Handle */}
        {viewMode === 'split' && (
          <div
            style={{ left: `${splitPct}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_16px_#fbbf24] z-[500]"
          >
            <button
              type="button"
              onPointerDown={(e) => { e.stopPropagation(); setDraggingCurtain(true) }}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full bg-slate-950/95 border-2 border-amber-400 text-[11px] font-mono font-bold text-amber-300 whitespace-nowrap shadow-2xl cursor-ew-resize hover:scale-105 transition"
            >
              ◄ RAW | CLEAN ►
            </button>
          </div>
        )}

        {/* Top-Left: View Mode + Basemap Style Switcher */}
        <div className="absolute top-3 left-3 z-[600] flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/90 backdrop-blur-md border border-white/15">
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

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/90 backdrop-blur-md border border-white/15 text-[11px] font-mono">
            <MapIcon className="w-3.5 h-3.5 text-sky-400 ml-1.5" />
            {[
              { id: 'tactical', label: 'Dark Borders' },
              { id: 'satellite', label: 'Satellite' },
              { id: 'light', label: 'Day Map' },
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => setBasemapStyle(b.id)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  basemapStyle === b.id ? 'bg-sky-500/25 text-sky-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top-Right: Zoom Controls + GeoJSON Export */}
        <div className="absolute top-3 right-3 z-[600] flex items-center gap-1.5">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            title="Zoom In"
            className="p-2 rounded-xl bg-slate-950/90 border border-white/15 text-slate-200 hover:text-white"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            title="Zoom Out"
            className="p-2 rounded-xl bg-slate-950/90 border border-white/15 text-slate-200 hover:text-white"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={exportGeoJSON}
            className="px-3 py-2 rounded-xl bg-slate-950/90 backdrop-blur-md border border-white/15 text-[11px] font-mono text-sky-300 hover:border-sky-400 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> GeoJSON
          </button>
        </div>

        {/* Bottom-Right: Clear Map Legend so Judges & Users Immediately Understand the Dots */}
        <div className="absolute bottom-3 right-3 z-[600] p-3 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-white/15 text-[11px] font-mono space-y-1.5 shadow-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">SENSOR LEGEND</div>
          <div className="flex items-center gap-2 text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            <span>Raw MODIS (1 km clutter)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-300 inline-block" />
            <span>Raw VIIRS (375 m clutter)</span>
          </div>
          <div className="flex items-center gap-2 text-sky-300">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
            <span>Dual-Confirmed (MODIS+VIIRS)</span>
          </div>
          <div className="flex items-center gap-2 text-rose-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>Harmonized Fire Event</span>
          </div>
        </div>
      </div>

      {/* Bottom Controls Row */}
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