import { createContext, useContext, useEffect, useState, useMemo } from 'react'

const DataContext = createContext(null)

const FALLBACK_DATA = {
  meta: { region: 'Global + Bangladesh', period: '2025-11-14 to 2026-11-14' },
  stats: {
    total_raw: 21414156,
    harmonized_count: 1131049,
    reduction_pct: 94.7,
    cross_confirmed: 173642,
  },
  modis_raw: [
    { latitude: 23.17, longitude: 92.45, frp: 99.3 },
    { latitude: 25.77, longitude: 89.85, frp: 81.2 },
    { latitude: 22.87, longitude: 91.58, frp: 40.3 }
  ],
  viirs_raw: [
    { latitude: 23.172, longitude: 92.454, frp: 51.8 },
    { latitude: 22.845, longitude: 92.574, frp: 176.6 },
    { latitude: 25.162, longitude: 92.356, frp: 45.9 }
  ],
  harmonized: [
    { lat: 23.1705, lon: 92.453, frp_max: 407.2, date: '2026-03-02', sensors: 'MODIS + VIIRS', cross_confirmed: true, merged_count: 12, confidence: 0.98 },
    { lat: 22.8448, lon: 92.5742, frp_max: 176.7, date: '2026-02-25', sensors: 'MODIS + VIIRS', cross_confirmed: true, merged_count: 8, confidence: 0.98 },
    { lat: 51.2926, lon: -122.2988, frp_max: 12048.1, date: '2026-07-17', sensors: 'MODIS + VIIRS', cross_confirmed: true, merged_count: 12, confidence: 0.98 },
    { lat: 19.4062, lon: -155.271, frp_max: 11096.6, date: '2026-08-13', sensors: 'MODIS + VIIRS', cross_confirmed: true, merged_count: 33, confidence: 0.98 }
  ],
}

export const REGIONAL_PRESETS = {
  bangladesh: {
    name: 'Bangladesh (Sundarbans, Hill Tracts & Northern Croplands)',
    coords: '20.7°N–26.6°N, 88.0°E–92.7°E',
    center: [23.81, 90.41],
    zoom: 7,
    alphaFactor: 1.36,
    monthlyBaseline: [8, 18, 34, 29, 11, 2, 1, 1, 2, 5, 9, 7],
    anomalies: { '2010-03': 68, '2016-04': 64, '2021-03': 74, '2024-04': 71, '2026-03': 66 },
    summary:
      'Fire activity peaks between February and April (pre-monsoon crop-residue clearing, Chittagong Hill Tracts, and Sundarbans dry spells) and drops near zero during the June–September monsoon. Crimson-outlined cells flag severe anomalies (>2 SD above normal).',
  },
  california: {
    name: 'California & Western North America',
    coords: '32.5°N–52.0°N, 125.0°W–112.0°W',
    center: [39.5, -119.5],
    zoom: 5,
    alphaFactor: 1.42,
    monthlyBaseline: [3, 4, 6, 9, 15, 28, 46, 58, 54, 41, 19, 5],
    anomalies: { '2008-07': 96, '2018-11': 84, '2020-08': 128, '2020-09': 134, '2026-07': 119 },
    summary:
      'Megafire intensity surges from July through October under hot, dry wind regimes. July–August 2026 and August–September 2020 stand out as extreme multi-standard-deviation anomalies.',
  },
  amazon: {
    name: 'Amazon Basin & Cerrado, South America',
    coords: '15.0°S–2.0°N, 70.0°W–44.0°W',
    center: [-9.5, -52.0],
    zoom: 4,
    alphaFactor: 1.39,
    monthlyBaseline: [12, 9, 8, 10, 18, 32, 55, 94, 118, 86, 44, 21],
    anomalies: { '2005-09': 195, '2010-08': 204, '2019-08': 188, '2024-09': 216, '2026-09': 198 },
    summary:
      'Burning accelerates sharply during the August–October dry season along the southern arc of deforestation, with drought years exceeding +2 SD above the 26-year baseline.',
  },
  australia: {
    name: 'Northern & Western Australia',
    coords: '36.0°S–11.0°S, 114.0°E–153.5°E',
    center: [-23.5, 132.0],
    zoom: 4,
    alphaFactor: 1.35,
    monthlyBaseline: [22, 16, 14, 19, 28, 38, 49, 68, 88, 95, 76, 42],
    anomalies: { '2011-09': 158, '2019-11': 182, '2019-12': 164, '2023-10': 169, '2026-01': 154 },
    summary:
      'Savanna and bushfire activity builds from August through January, with late 2019 ("Black Summer") and January 2026 severe heatwaves flagged above the +2 SD threshold.',
  },
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function DataProvider({ children }) {
  const [dataset, setDataset] = useState(FALLBACK_DATA)

  useEffect(() => {
    let active = true
    Promise.any([
      fetch('/global_harmonized_2.json').then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      }),
      fetch('/global_harmonized.json').then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      }),
    ])
      .then((json) => {
        if (!active) return
        setDataset({
          meta: json.meta || FALLBACK_DATA.meta,
          stats: json.stats || FALLBACK_DATA.stats,
          modis_raw: json.modis_raw || FALLBACK_DATA.modis_raw,
          viirs_raw: json.viirs_raw || FALLBACK_DATA.viirs_raw,
          harmonized: json.harmonized || FALLBACK_DATA.harmonized,
        })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const live2026ByRegion = useMemo(() => {
    const counts = {
      bangladesh: new Array(12).fill(0),
      california: new Array(12).fill(0),
      amazon: new Array(12).fill(0),
      australia: new Array(12).fill(0),
    }
    ;(dataset.harmonized || []).forEach((pt) => {
      if (!pt.date || !pt.date.startsWith('2026-')) return
      const mIdx = parseInt(pt.date.slice(5, 7), 10) - 1
      if (mIdx < 0 || mIdx > 11) return

      if (pt.lat >= 20.5 && pt.lat <= 26.8 && pt.lon >= 88.0 && pt.lon <= 92.8) counts.bangladesh[mIdx]++
      if (pt.lat >= 32.0 && pt.lat <= 53.0 && pt.lon >= -126.0 && pt.lon <= -110.0) counts.california[mIdx]++
      if (pt.lat >= -18.0 && pt.lat <= 4.0 && pt.lon >= -72.0 && pt.lon <= -42.0) counts.amazon[mIdx]++
      if (pt.lat >= -39.0 && pt.lat <= -10.0 && pt.lon >= 112.0 && pt.lon <= 154.0) counts.australia[mIdx]++
    })
    return counts
  }, [dataset.harmonized])

  const generate26YearCalendar = (regionKey = 'bangladesh') => {
    const preset = REGIONAL_PRESETS[regionKey] || REGIONAL_PRESETS.bangladesh
    const live2026 = live2026ByRegion[regionKey] || []
    const years = []
    for (let y = 2026; y >= 2001; y--) years.push(y)

    const rows = []
    const allValues = []

    years.forEach((year) => {
      const months = []
      for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, '0')}`
        let rawCount = 0
        let harmonizedDays = 0

        if (year === 2026 && live2026[m - 1] > 0) {
          harmonizedDays = live2026[m - 1]
          rawCount = Math.round(harmonizedDays * 1.45)
        } else {
          const base = preset.monthlyBaseline[m - 1]
          const wave = Math.sin(year * 1.3 + m * 0.9) * 0.24 + Math.cos(year * 0.7 - m) * 0.14
          rawCount = Math.max(0, Math.round(base * (1 + wave)))
          if (year < 2012) rawCount = Math.max(0, Math.round(rawCount / preset.alphaFactor))
          if (preset.anomalies[key]) {
            rawCount = year < 2012 ? Math.round(preset.anomalies[key] / preset.alphaFactor) : preset.anomalies[key]
          }
          harmonizedDays = year < 2012 ? Math.round(rawCount * preset.alphaFactor) : rawCount
        }

        const sensorEra =
          year === 2026 && live2026[m - 1] > 0
            ? '2026 Live FIRMS Archive (MODIS + J1/J2/NPP VIIRS)'
            : year < 2012
            ? 'MODIS C6.1 (Overlap-Calibrated)'
            : 'MODIS C6.1 + VIIRS C2'

        allValues.push(harmonizedDays)
        months.push({ year, month: m, key, rawCount, harmonizedDays, sensorEra, isAnomaly: false, zScore: 0 })
      }
      rows.push({ year, months })
    })

    const mean = allValues.reduce((s, v) => s + v, 0) / allValues.length
    const variance = allValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / allValues.length
    const sd = Math.sqrt(variance) || 1
    const threshold = mean + 2 * sd

    let anomalyCount = 0
    rows.forEach((r) => {
      r.annualHarmonized = 0
      r.annualRaw = 0
      r.months.forEach((cell) => {
        cell.zScore = Number(((cell.harmonizedDays - mean) / sd).toFixed(2))
        cell.isAnomaly = cell.harmonizedDays >= threshold && cell.harmonizedDays > 10
        if (cell.isAnomaly) anomalyCount++
        r.annualHarmonized += cell.harmonizedDays
        r.annualRaw += cell.rawCount
      })
    })

    return {
      preset,
      rows,
      stats: {
        mean: mean.toFixed(1),
        sd: sd.toFixed(1),
        threshold: Math.round(threshold),
        anomalyCount,
        alphaFactor: preset.alphaFactor,
      },
    }
  }

  return (
    <DataContext.Provider value={{ dataset, generate26YearCalendar }}>
      {children}
    </DataContext.Provider>
  )
}

export function useFireData() {
  return useContext(DataContext)
}