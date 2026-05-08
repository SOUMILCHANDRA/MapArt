import React, { useEffect, useRef, useState, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import html2canvas from 'html2canvas'
import flagPalettes from '../assets/data/flag-palettes.json'
import { circuits } from '../assets/data/CircuitRegistry'
import { ALL_F1_TRACKS, TRACK_SLUGS, CIRCUIT_COORDINATES, TRACK_TO_COUNTRY } from '../assets/data/TrackList'
import { Search, Crop, Download, Zap, Map as MapIcon, X, ChevronRight, History, Loader2, Info } from 'lucide-react'

const MapGenerator: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [selectedTrack, setSelectedTrack] = useState('Autodromo Nazionale Monza')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLocating, setIsLocating] = useState(false)

  const filteredTracks = useMemo(() => {
    return ALL_F1_TRACKS.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [searchQuery])

  // DYNAMIC TRACER: Registry -> GitHub -> OSM Overpass -> Nominatim
  const resolveTrackData = async (trackName: string) => {
    // 1. Check Priority Coordinate Registry (Ensures correct city/continent)
    const priorityCenter = CIRCUIT_COORDINATES[trackName]
    
    const slug = TRACK_SLUGS[trackName]
    let geojsonData = null

    // 2. Try Primary GitHub Library (High Res)
    if (slug) {
      try {
        const response = await fetch(`https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits/${slug}.geojson`)
        if (response.ok) {
          geojsonData = await response.json()
        }
      } catch (e) { console.warn('GitHub fetch failed') }
    }

    // 3. Try OSM Overpass API (Live Trace)
    if (!geojsonData) {
      try {
        const query = `[out:json];way["leisure"="track"]["sport"="motor_racing"]["name"~"${trackName.split(' ')[0]}",i];(._;>;);out;`;
        const osmResponse = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
        const osmData = await osmResponse.json()
        
        if (osmData.elements.length > 0) {
          const nodes: Record<number, [number, number]> = {}
          osmData.elements.filter((e: any) => e.type === 'node').forEach((n: any) => {
            nodes[n.id] = [n.lon, n.lat]
          })
          const way = osmData.elements.find((e: any) => e.type === 'way')
          if (way && way.nodes) {
            const coordinates = way.nodes.map((id: number) => nodes[id]).filter(Boolean)
            geojsonData = {
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                geometry: { type: 'LineString', coordinates },
                properties: { name: trackName }
              }]
            }
          }
        }
      } catch (e) { console.warn('OSM Trace failed') }
    }

    // 4. Fallback Geocoder if no priority center
    let finalCenter = priorityCenter
    if (!finalCenter) {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trackName)}`)
        const json = await response.json()
        if (json.length > 0) {
          finalCenter = [parseFloat(json[0].lon), parseFloat(json[0].lat)]
        }
      } catch (e) { console.warn('Geocoding failed') }
    }

    return { center: finalCenter, data: geojsonData }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(prev => !prev)
      }
      if (e.key === 'Escape') setIsSearchOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [9.281, 45.619],
      zoom: 14,
    })

    map.current.on('load', () => {
      if (!map.current) return
      map.current.addSource('circuit-path', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.current.addLayer({
        id: 'circuit-glow',
        type: 'line',
        source: 'circuit-path',
        paint: { 'line-color': '#ff1801', 'line-width': 10, 'line-blur': 8, 'line-opacity': 0.5 }
      })
      map.current.addLayer({
        id: 'circuit-main',
        type: 'line',
        source: 'circuit-path',
        paint: { 'line-color': '#ff1801', 'line-width': 3 }
      })
    })
  }, [])

  useEffect(() => {
    const updateTrack = async () => {
      if (!map.current) return
      setIsLocating(true)
      
      const result = await resolveTrackData(selectedTrack)
      
      const source = map.current.getSource('circuit-path') as maplibregl.GeoJSONSource
      if (source) {
        source.setData(result.data || { type: 'FeatureCollection', features: [] })
      }
      
      let flyCenter = result.center
      if (!flyCenter && result.data) {
        const geom = result.data.features[0].geometry
        flyCenter = geom.type === 'Polygon' ? geom.coordinates[0][0] : geom.coordinates[0]
      }

      if (flyCenter) {
        map.current.flyTo({ 
          center: flyCenter as [number, number], 
          zoom: 14.8, 
          speed: 1.5,
          essential: true 
        })
      }
      setIsLocating(false)
    }
    updateTrack()
  }, [selectedTrack])

  const exportPoster = async () => {
    const posterElement = document.getElementById('poster-canvas')
    if (!posterElement) return
    const canvas = await html2canvas(posterElement, {
      backgroundColor: '#000',
      useCORS: true,
      scale: 3
    })
    const link = document.createElement('a')
    link.download = `MAPART_${selectedTrack.toUpperCase()}_POSTER.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#000', color: '#fff' }}>
      <header style={{ padding: '20px 40px', background: 'rgba(5,5,5,0.95)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <h2 className="f1-font" style={{ fontSize: '22px', margin: 0 }}>MAP <span style={{ color: '#ff1801' }}>ART</span></h2>
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="glass-panel" 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 20px', color: '#888', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Search size={16} /> <span style={{ fontSize: '12px' }}>Search 80+ F1 Circuits... (Ctrl+K)</span>
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {isLocating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff1801', fontSize: '10px', fontWeight: 'bold' }}>
              <Loader2 size={14} className="animate-spin" /> TRACING TRACK...
            </div>
          )}
          <button onClick={exportPoster} className="glass-panel" style={{ padding: '10px 25px', background: '#ff1801', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
            DOWNLOAD POSTER
          </button>
        </div>
      </header>

      <div id="poster-canvas" style={{ flex: 1, position: 'relative' }}>
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        
        <div style={{ position: 'absolute', bottom: '8%', width: '100%', textAlign: 'center', pointerEvents: 'none' }}>
          <h1 className="f1-font" style={{ fontSize: '90px', color: '#ff1801', margin: 0, textShadow: '0 0 30px rgba(255,24,1,0.3)', lineHeight: 1.1 }}>
            {selectedTrack.toUpperCase()}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
             <div style={{ height: '1px', width: '40px', background: 'rgba(255,255,255,0.1)' }} />
             <p style={{ letterSpacing: '10px', fontSize: '12px', color: '#fff', opacity: 0.6, margin: 0 }}>
               {TRACK_TO_COUNTRY[selectedTrack] ? TRACK_TO_COUNTRY[selectedTrack].toUpperCase() : 'HISTORICAL CIRCUIT'} • 2026 EDITION
             </p>
             <div style={{ height: '1px', width: '40px', background: 'rgba(255,255,255,0.1)' }} />
          </div>
        </div>
      </div>

      {isSearchOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
          <div className="glass-panel" style={{ width: '600px', maxHeight: '600px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <Search size={20} style={{ color: '#ff1801' }} />
              <input 
                autoFocus
                placeholder="Search Adelaide, Kyalami, Fuji, etc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: '18px', outline: 'none' }}
              />
              <X size={20} style={{ cursor: 'pointer', color: '#444' }} onClick={() => setIsSearchOpen(false)} />
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {filteredTracks.map(track => (
                <div 
                  key={track}
                  onClick={() => { setSelectedTrack(track); setIsSearchOpen(false); }}
                  style={{ 
                    padding: '12px 20px', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    background: selectedTrack === track ? 'rgba(255,24,1,0.1)' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div>
                    <div style={{ color: selectedTrack === track ? '#ff1801' : '#fff', fontWeight: 'bold', fontSize: '14px' }}>{track}</div>
                    <div style={{ fontSize: '10px', color: '#444' }}>{TRACK_TO_COUNTRY[track] || 'HISTORICAL'}</div>
                  </div>
                  <ChevronRight size={16} style={{ color: '#222' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MapGenerator
