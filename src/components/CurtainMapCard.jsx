import { useEffect, useRef, useState, useMemo } from 'react'

import { Crosshair, Download, Flame, Eye, Map as MapIcon, ZoomIn, ZoomOut } from 'lucide-react'

import { useFireData, haversineKm, REGIONAL_PRESETS } from '../context/DataContext'



const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY



const DARK_TACTICAL_STYLE = [

  { elementType: 'geometry', stylers: [{ color: '#0b0f19' }] },

  { elementType: 'labels.text.stroke', stylers: [{ color: '#070a12' }] },

  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },

  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#38bdf8' }, { weight: 1.1 }] },

  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#e2e8f0' }] },

  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },

  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },

  { featureType: 'poi', stylers: [{ visibility: 'off' }] },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },

  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },

  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050811' }] },

  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },

]



let googleMapsPromise = null

function loadGoogleMapsScript(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (!apiKey) return Promise.reject(new Error('Google Maps API key is missing.'))
  if (googleMapsPromise) return googleMapsPromise

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('google-maps-sdk')

    const handleLoad = () => {
      if (window.google?.maps) {
        resolve(window.google.maps)
      } else {
        googleMapsPromise = null
        reject(new Error('Google Maps loaded, but the Maps API was not available.'))
      }
    }

    const handleError = () => {
      googleMapsPromise = null
      reject(new Error('Unable to load the Google Maps JavaScript API.'))
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = 'google-maps-sdk'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`
    script.async = true
    script.defer = true
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.head.appendChild(script)
  })

  return googleMapsPromise
}

export default function CurtainMapCard() {

  const { dataset } = useFireData()

  const mapBoxRef = useRef(null)

  const gmapRef = useRef(null)

  const infoWindowRef = useRef(null)

  const markersRef = useRef([])

  const radarCircleRef = useRef(null)

  const scanActiveRef = useRef(false)



  const [basemapStyle, setBasemapStyle] = useState('tactical') // 'tactical' | 'hybrid' | 'terrain'

  const [viewMode, setViewMode] = useState('split') // 'split' | 'clean' | 'raw'

  const [splitPct, setSplitPct] = useState(50)

  const [draggingCurtain, setDraggingCurtain] = useState(false)

  const [showHeatmap, setShowHeatmap] = useState(false)

  const [onlyDual, setOnlyDual] = useState(false)

  const [minFrp, setMinFrp] = useState(20)

  const [scanActive, setScanActive] = useState(false)

  const [scanResult, setScanResult] = useState(null)
  const [mapReady, setMapReady] = useState(false)



  useEffect(() => {

    scanActiveRef.current = scanActive

  }, [scanActive])



  const filteredClean = useMemo(() => {

    return (dataset.harmonized || []).filter((p) => {

      if (onlyDual && !p.cross_confirmed) return false

      if ((p.frp_max || 0) < minFrp) return false

      return true

    })

  }, [dataset.harmonized, onlyDual, minFrp])



  // Initialize Google Map

  useEffect(() => {

    let mounted = true

    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY in your environment.')
      return () => {
        mounted = false
      }
    }

    loadGoogleMapsScript(GOOGLE_MAPS_API_KEY)

      .then((gmaps) => {

        if (!mounted || !mapBoxRef.current || gmapRef.current) return



        const map = new gmaps.Map(mapBoxRef.current, {

          center: { lat: 23.81, lng: 90.41 },

          zoom: 4,

          disableDefaultUI: true,

          gestureHandling: 'greedy',

          backgroundColor: '#07070c',

          styles: DARK_TACTICAL_STYLE,

          mapTypeId: 'roadmap',

        })



        infoWindowRef.current = new gmaps.InfoWindow()

        gmapRef.current = map
        setMapReady(true)

      })

      .catch((err) => console.error('Google Maps load failed:', err))



    return () => {

      mounted = false

    }

  }, [])



  // Switch Google Map Type (Dark Tactical / Satellite Hybrid / Terrain)

  useEffect(() => {

    const map = gmapRef.current

    if (!map) return

    if (basemapStyle === 'hybrid') {

      map.setMapTypeId('hybrid')

      map.setOptions({ styles: null })

    } else if (basemapStyle === 'terrain') {

      map.setMapTypeId('terrain')

      map.setOptions({ styles: null })

    } else {

      map.setMapTypeId('roadmap')

      map.setOptions({ styles: DARK_TACTICAL_STYLE })

    }

  }, [basemapStyle, mapReady])



  // Radar Click Listener

  useEffect(() => {

    const map = gmapRef.current

    if (!map || !window.google?.maps) return



    const listener = map.addListener('click', (e) => {

      if (!scanActiveRef.current) return

      const lat = e.latLng.lat()

      const lng = e.latLng.lng()



      if (radarCircleRef.current) radarCircleRef.current.setMap(null)

      radarCircleRef.current = new window.google.maps.Circle({

        map,

        center: { lat, lng },

        radius: 200000,

        strokeColor: '#38bdf8',

        strokeOpacity: 0.9,

        strokeWeight: 2,

        fillColor: '#38bdf8',

        fillOpacity: 0.14,

      })



      const hits = filteredClean.filter((p) => haversineKm(lat, lng, p.lat, p.lon) <= 200)

      const dual = hits.filter((p) => p.cross_confirmed).length

      const peak = hits.length ? Math.max(...hits.map((p) => p.frp_max || 0)) : 0

      setScanResult({

        lat: lat.toFixed(2),

        lon: lng.toFixed(2),

        count: hits.length,

        dual,

        peak: peak.toFixed(1),

      })

    })



    return () => window.google.maps.event.removeListener(listener)

  }, [filteredClean, mapReady])



  // Render Curtain-Aware Google Maps Markers (Left = Raw Clutter, Right = 1.5 km Clean Harmonized)

  useEffect(() => {

    const map = gmapRef.current

    if (!map || !window.google?.maps) return



    const renderMarkers = () => {

      markersRef.current.forEach((m) => m.setMap(null))

      markersRef.current = []



      const bounds = map.getBounds()

      const ne = bounds?.getNorthEast()

      const sw = bounds?.getSouthWest()

      const splitLng = sw && ne ? sw.lng() + (ne.lng() - sw.lng()) * (splitPct / 100) : 0

      const z = map.getZoom() || 4

      const scale = z <= 3 ? 3.2 : z <= 5 ? 4.5 : z <= 7 ? 6 : 7.5



      // 1. Raw Detections (Left of Curtain in Split Mode, or All in Raw Mode)

      if (viewMode !== 'clean') {

        const showRawPoint = (lng) => {

          if (viewMode === 'raw') return true

          if (!sw || !ne) return true

          return lng <= splitLng

        }



        ;(dataset.modis_raw || []).forEach((p) => {

          if (!showRawPoint(p.longitude)) return

          const marker = new window.google.maps.Marker({

            position: { lat: p.latitude, lng: p.longitude },

            map,

            icon: {

              path: window.google.maps.SymbolPath.CIRCLE,

              scale: scale + 1,

              fillColor: '#f97316',

              fillOpacity: 0.65,

              strokeColor: '#ea580c',

              strokeWeight: 1,

            },

          })

          marker.addListener('click', () => {

            infoWindowRef.current?.setContent(

              `<div style="color:#0f172a;font-family:monospace;font-size:12px;">

                <b style="color:#ea580c;">RAW MODIS (1 km)</b><br/>FRP: ${p.frp} MW

              </div>`

            )

            infoWindowRef.current?.open(map, marker)

          })

          markersRef.current.push(marker)

        })



        ;(dataset.viirs_raw || []).forEach((p) => {

          if (!showRawPoint(p.longitude)) return

          const marker = new window.google.maps.Marker({

            position: { lat: p.latitude, lng: p.longitude },

            map,

            icon: {

              path: window.google.maps.SymbolPath.CIRCLE,

              scale: Math.max(2.5, scale - 0.5),

              fillColor: '#fde047',

              fillOpacity: 0.85,

              strokeColor: '#ca8a04',

              strokeWeight: 0.6,

            },

          })

          marker.addListener('click', () => {

            infoWindowRef.current?.setContent(

              `<div style="color:#0f172a;font-family:monospace;font-size:12px;">

                <b style="color:#ca8a04;">RAW VIIRS (375 m)</b><br/>FRP: ${p.frp} MW

              </div>`

            )

            infoWindowRef.current?.open(map, marker)

          })

          markersRef.current.push(marker)

        })

      }



      // 2. Harmonized Clean Events (Right of Curtain in Split Mode, or All in Clean Mode)

      if (viewMode !== 'raw') {

        const showCleanPoint = (lng) => {

          if (viewMode === 'clean') return true

          if (!sw || !ne) return true

          return lng > splitLng

        }



        filteredClean.slice(0, 1800).forEach((p) => {

          if (!showCleanPoint(p.lon)) return



          if (showHeatmap) {

            const glow = new window.google.maps.Marker({

              position: { lat: p.lat, lng: p.lon },

              map,

              clickable: false,

              icon: {

                path: window.google.maps.SymbolPath.CIRCLE,

                scale: Math.min(26, Math.max(11, Math.sqrt(p.frp_max || 20) * 0.65)),

                fillColor: p.frp_max >= 500 ? '#fb7185' : '#f59e0b',

                fillOpacity: 0.22,

                strokeWeight: 0,

              },

            })

            markersRef.current.push(glow)

          }



          const marker = new window.google.maps.Marker({

            position: { lat: p.lat, lng: p.lon },

            map,

            icon: {

              path: window.google.maps.SymbolPath.CIRCLE,

              scale: p.cross_confirmed ? scale + 0.8 : scale,

              fillColor: p.cross_confirmed ? '#38bdf8' : '#fb7185',

              fillOpacity: 0.95,

              strokeColor: p.cross_confirmed ? '#0284c7' : '#be123c',

              strokeWeight: 1.2,

            },

          })



          marker.addListener('click', () => {

            infoWindowRef.current?.setContent(

              `<div style="color:#0f172a;font-family:sans-serif;font-size:12px;line-height:1.45;min-width:190px;">

                <div style="font-weight:700;color:${p.cross_confirmed ? '#0284c7' : '#e11d48'};">

                  ${p.cross_confirmed ? '✅ DUAL-SENSOR VERIFIED' : '🛰️ HARMONIZED FIRE'}

                </div>

                <div><b>Peak FRP:</b> ${p.frp_max} MW</div>

                <div><b>Merged Alerts:</b> ${p.merged_count}× (${p.sensors})</div>

                <div style="color:#475569;font-family:monospace;font-size:11px;">${p.date} • ${p.lat}°, ${p.lon}°</div>

              </div>`

            )

            infoWindowRef.current?.open(map, marker)

          })



          markersRef.current.push(marker)

        })

      }

    }



    renderMarkers()

    const idleListener = map.addListener('idle', renderMarkers)

    return () => window.google.maps.event.removeListener(idleListener)

  }, [dataset.modis_raw, dataset.viirs_raw, filteredClean, viewMode, splitPct, showHeatmap, mapReady])



  const flyTo = (key) => {

    const r = REGIONAL_PRESETS[key]

    if (r && gmapRef.current) {

      gmapRef.current.panTo({ lat: r.center[0], lng: r.center[1] })

      gmapRef.current.setZoom(r.zoom)

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

    <div className="astro-card rounded-3xl p-5 sm:p-6 space-y-4">

      <div className="flex flex-wrap items-center justify-between gap-3">

        <div>

          <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400">

            GOOGLE MAPS SATELLITE &amp; TACTICAL ENGINE

          </span>

          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">

            Split-Screen Curtain Compare Map (Raw vs. 1.5 km Clean)

          </h2>

        </div>



        <div className="flex flex-wrap items-center gap-1.5">

          <button

            onClick={() => {

              gmapRef.current?.panTo({ lat: 20, lng: 30 })

              gmapRef.current?.setZoom(2)

            }}

            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs"

          >

            🌍 Global

          </button>

          <button

            onClick={() => flyTo('bangladesh')}

            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold"

          >

            🇧🇩 Bangladesh

          </button>

          <button onClick={() => flyTo('amazon')} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs">

            🇧🇷 Amazon

          </button>

          <button onClick={() => flyTo('california')} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs">

            🇺🇸 N. America

          </button>

          <button onClick={() => flyTo('australia')} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs">

            🇦🇺 Australia

          </button>

        </div>

      </div>



      {/* Google Map Canvas + Curtain Overlay */}

      <div

        onPointerMove={handleBoxPointerMove}

        onPointerUp={() => setDraggingCurtain(false)}

        onPointerLeave={() => setDraggingCurtain(false)}

        className="relative h-[500px] sm:h-[560px] w-full rounded-2xl overflow-hidden border border-white/15 select-none"

      >

        <div ref={mapBoxRef} className="w-full h-full z-0" />



        {viewMode === 'split' && (

          <div

            style={{ left: `${splitPct}%` }}

            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_16px_#fbbf24] z-[500]"

          >

            <button

              type="button"

              onPointerDown={(e) => {

                e.stopPropagation()

                setDraggingCurtain(true)

              }}

              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full bg-slate-950/95 border-2 border-amber-400 text-[11px] font-mono font-bold text-amber-300 whitespace-nowrap shadow-2xl cursor-ew-resize hover:scale-105 transition"

            >

              ◄ RAW | CLEAN ►

            </button>

          </div>

        )}



        {/* Top-Left: View Mode + Google Basemap Switcher */}

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

              { id: 'tactical', label: 'Dark Tactical' },

              { id: 'hybrid', label: 'Google Satellite' },

              { id: 'terrain', label: 'Terrain' },

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

            onClick={() => gmapRef.current?.setZoom((gmapRef.current.getZoom() || 4) + 1)}

            title="Zoom In"

            className="p-2 rounded-xl bg-slate-950/90 border border-white/15 text-slate-200 hover:text-white"

          >

            <ZoomIn className="w-4 h-4" />

          </button>

          <button

            onClick={() => gmapRef.current?.setZoom((gmapRef.current.getZoom() || 4) - 1)}

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



        {/* Bottom-Right: Sensor Legend */}

        <div className="absolute bottom-6 right-3 z-[600] p-3 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-white/15 text-[11px] font-mono space-y-1.5 shadow-xl">

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

          <input

            type="range"

            min="5"

            max="95"

            value={splitPct}

            onChange={(e) => setSplitPct(Number(e.target.value))}

            className="w-full accent-amber-400"

          />

        </div>



        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">

          <div className="flex justify-between font-mono text-[11px] mb-1">

            <span className="text-slate-400">Min Peak FRP</span>

            <span className="text-rose-400">{minFrp} MW</span>

          </div>

          <input

            type="range"

            min="0"

            max="2000"

            step="50"

            value={minFrp}

            onChange={(e) => setMinFrp(Number(e.target.value))}

            className="w-full accent-rose-400"

          />

        </div>



        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-center gap-1.5">

          <label className="flex items-center justify-between cursor-pointer">

            <span className="flex items-center gap-1.5 text-slate-300">

              <Eye className="w-3.5 h-3.5 text-sky-400" /> Dual-Sensor Only

            </span>

            <input

              type="checkbox"

              checked={onlyDual}

              onChange={(e) => setOnlyDual(e.target.checked)}

              className="accent-sky-400"

            />

          </label>

          <label className="flex items-center justify-between cursor-pointer">

            <span className="flex items-center gap-1.5 text-slate-300">

              <Flame className="w-3.5 h-3.5 text-amber-400" /> Thermal Glow

            </span>

            <input

              type="checkbox"

              checked={showHeatmap}

              onChange={(e) => setShowHeatmap(e.target.checked)}

              className="accent-amber-400"

            />

          </label>

        </div>



        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-center">

          <button

            onClick={() => {

              setScanActive(!scanActive)

              if (scanActive) {

                if (radarCircleRef.current) radarCircleRef.current.setMap(null)

                setScanResult(null)

              }

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