
    
  
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



function loadGoogleMapsScript(apiKey) {

  return new Promise((resolve, reject) => {

    if (window.google && window.google.maps) {

      resolve(window.google.maps)

      return

    }

    const existing = document.getElementById('google-maps-sdk')

    if (existing) {

      existing.addEventListener('load', () => resolve(window.google.maps))

      return

    }

    const script = document.createElement('script')

    script.id = 'google-maps-sdk'

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`

    script.async = true

    script.defer = true

    script.onload = () => resolve(window.google.maps)

    script.onerror = reject

    document.head.appendChild(script)

  })

}



export default function CurtainMapCard() {

  const { dataset } = useFireData()

  const mapBoxRef = useRef(null)

  const gmapRef = useRef(null)

