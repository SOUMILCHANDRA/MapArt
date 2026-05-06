import React, { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import html2canvas from 'html2canvas'
import flagPalettes from '../assets/data/flag-palettes.json'
import { Search, Crop, Palette, Download, Type, Zap } from 'lucide-react'

const MapGenerator: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [activePalette, setActivePalette] = useState(flagPalettes.Italy)
  const [isPainting, setIsPainting] = useState(false)
  const [showCrop, setShowCrop] = useState(false)
  const [cropBox, setCropBox] = useState<{ start: [number, number], end: [number, number] } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [9.288, 45.621], // Monza
      zoom: 13,
    })

    map.current.on('load', () => {
      if (!map.current) return
      
      // Add a source for the crop rectangle
      map.current.addSource('crop-rect', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      map.current.addLayer({
        id: 'crop-outline',
        type: 'line',
        source: 'crop-rect',
        paint: {
          'line-color': '#fff',
          'line-width': 2,
          'line-dasharray': [2, 2]
        }
      })
    })

    let startPos: maplibregl.LngLat | null = null

    map.current.on('mousedown', (e) => {
      if (showCrop) {
        startPos = e.lngLat
      }
    })

    map.current.on('mousemove', (e) => {
      if (showCrop && startPos) {
        const endPos = e.lngLat
        const features: any[] = [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [startPos.lng, startPos.lat],
              [endPos.lng, startPos.lat],
              [endPos.lng, endPos.lat],
              [startPos.lng, endPos.lat],
              [startPos.lng, startPos.lat]
            ]]
          }
        }]
        ;(map.current?.getSource('crop-rect') as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features
        })
      }
    })

    map.current.on('mouseup', () => {
      startPos = null
    })

    map.current.on('click', (e) => {
      if (isPainting) {
        const features = map.current?.queryRenderedFeatures(e.point, { layers: ['road-primary', 'road-secondary', 'road-minor'] })
        if (features && features.length > 0) {
          const feature = features[0]
          map.current?.setFeatureState(
            { source: 'openmaptiles', sourceLayer: 'transportation', id: feature.id },
            { painted: true, color: activePalette.primary }
          )
        }
      }
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [showCrop])

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return
    
    const layers = [
      { id: 'road-primary', color: activePalette.primary },
      { id: 'road-secondary', color: activePalette.secondary },
      { id: 'road-minor', color: activePalette.accent }
    ]

    layers.forEach(({ id, color }) => {
      if (map.current?.getLayer(id)) {
        map.current.setPaintProperty(id, 'line-color', color)
      }
    })
  }, [activePalette])

  const handleSearch = async () => {
    if (!searchQuery) return
    // Simple geocoding simulation or using a real API if needed
    // For now, let's just alert
    console.log('Searching for:', searchQuery)
    // In a real app, use fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`)
  }

  const exportPoster = async () => {
    const posterElement = document.getElementById('poster-canvas')
    if (!posterElement) return
    
    // We combine the map canvas and the overlay
    // For simplicity, we just capture the whole poster area
    const canvas = await html2canvas(posterElement, {
      backgroundColor: '#000',
      useCORS: true,
      scale: 2 // High res
    })
    
    const link = document.createElement('a')
    link.download = `MapArt_Poster_${searchQuery || 'Circuit'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        padding: '20px 40px', 
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.8)',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <h2 className="f1-font" style={{ fontSize: '24px' }}>Map <span style={{ color: activePalette.primary }}>Art</span></h2>
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '5px 15px' }}>
            <Search size={16} style={{ color: '#666' }} />
            <input 
              type="text" 
              placeholder="Search City or Circuit..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ background: 'none', border: 'none', color: '#fff', padding: '8px', outline: 'none', width: '200px' }} 
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <button 
            className={`glass-panel ${showCrop ? 'active' : ''}`} 
            onClick={() => setShowCrop(!showCrop)}
            style={{ padding: '8px 15px', color: showCrop ? activePalette.primary : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Crop size={16} /> {showCrop ? 'Lock Region' : 'Select Region'}
          </button>
          <button 
            onClick={exportPoster}
            className="glass-panel" 
            style={{ padding: '8px 15px', color: activePalette.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
          >
            <Zap size={16} /> Export Poster
          </button>
        </div>
      </header>

      <div id="poster-canvas" style={{ flex: 1, position: 'relative', background: '#000' }}>
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        
        {/* Poster Text Overlay */}
        <div style={{ 
          position: 'absolute', 
          bottom: '10%', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          textAlign: 'center',
          pointerEvents: 'none' 
        }}>
          <h1 className="f1-font neon-glow" style={{ fontSize: '72px', color: activePalette.primary, margin: 0, fontWeight: 900 }}>
            {searchQuery.toUpperCase() || 'MONZA'}
          </h1>
          <p style={{ letterSpacing: '14px', fontSize: '20px', color: '#fff', opacity: 0.8, marginTop: '-5px', fontWeight: 600 }}>
            {searchQuery ? '2026 EDITION' : 'ITALY • 2026'}
          </p>
        </div>

        {/* Floating Controls */}
        <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="glass-panel" style={{ padding: '20px', width: '220px' }}>
            <h4 className="f1-font" style={{ marginBottom: '15px', fontSize: '14px' }}>Style Tools</h4>
            {/* Palette selection... */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {Object.entries(flagPalettes).slice(0, 20).map(([name, palette]: [string, any]) => (
                <div 
                  key={name}
                  onClick={() => setActivePalette(palette)}
                  style={{ 
                    width: '24px', 
                    height: '24px', 
                    background: palette.primary,
                    borderRadius: '3px',
                    cursor: 'pointer',
                    border: activePalette === palette ? '1.5px solid white' : 'none'
                  }}
                  title={name}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapGenerator
