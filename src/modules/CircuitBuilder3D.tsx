import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { motion, AnimatePresence } from 'framer-motion'
import flagPalettes from '../assets/data/flag-palettes.json'
import { ALL_F1_TRACKS, TRACK_TO_COUNTRY, COUNTRY_CODE_TO_NAME } from '../assets/data/TrackList'
import { resolveTrackLocation } from '../utils/track-resolver'
import { fetchElevation } from '../utils/elevation'
import { Search, X, Loader2, Download, Maximize, RotateCcw, Share, ChevronRight } from 'lucide-react'

const CircuitBuilder3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  const [selectedTrack, setSelectedTrack] = useState('Monza')
  const [activePalette, setActivePalette] = useState(flagPalettes.Italy)
  const [elevationData, setElevationData] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [trackData, setTrackData] = useState<any>(null)

  const filteredTracks = useMemo(() => {
    return ALL_F1_TRACKS.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [searchQuery])

  // Update palette based on track
  useEffect(() => {
    let country = TRACK_TO_COUNTRY[selectedTrack]
    if (country && flagPalettes[country as keyof typeof flagPalettes]) {
      const palette = flagPalettes[country as keyof typeof flagPalettes]
      // COLOR SAFETY: If primary is black or too dark, use secondary or accent
      let primary = palette.primary
      if (primary === '#000000' || primary === '#000' || country === 'Belgium') {
        primary = palette.secondary || '#FAE042'
      }
      setActivePalette({ ...palette, primary })
    }
  }, [selectedTrack])

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || rendererRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x020202)
    sceneRef.current = scene
    
    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 1, 40000)
    camera.position.set(1000, 1000, 1000)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true, 
      preserveDrawingBuffer: true 
    })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controlsRef.current = controls

    const grid = new THREE.GridHelper(8000, 120, 0x1a1a1a, 0x0a0a0a)
    grid.position.y = -50
    scene.add(grid)

    scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    const sun = new THREE.DirectionalLight(0xffffff, 1.5)
    sun.position.set(1000, 2000, 1000)
    scene.add(sun)

    let frameId: number
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      if (controlsRef.current) controlsRef.current.update()
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(prev => !prev)
      }
      if (e.key === 'Escape') setIsSearchOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
      renderer.dispose()
      rendererRef.current = null
    }
  }, [])

  // Resolve track data and fetch elevation
  useEffect(() => {
    const loadTrack = async () => {
      setIsLoading(true)
      const result = await resolveTrackLocation(selectedTrack)
      
      if (result && result.data) {
        setTrackData(result.data)
        const coords = result.data.features[0].geometry.coordinates as [number, number][]
        
        // Fetch real elevation
        try {
          const elevations = await fetchElevation(coords)
          setElevationData(elevations)
        } catch (e) {
          console.warn('Elevation fetch failed, using synthetic data')
          setElevationData(coords.map((_, i) => Math.sin(i * 0.1) * 20 + Math.cos(i * 0.05) * 15))
        }

        // Update palette if inferred from country code
        if (result.countryCode && !TRACK_TO_COUNTRY[selectedTrack]) {
          const countryName = COUNTRY_CODE_TO_NAME[result.countryCode]
          if (countryName && flagPalettes[countryName as keyof typeof flagPalettes]) {
             const palette = flagPalettes[countryName as keyof typeof flagPalettes]
             let primary = palette.primary
             if (primary === '#000000' || primary === '#000' || countryName === 'Belgium') {
               primary = palette.secondary || '#FAE042'
             }
             setActivePalette({ ...palette, primary })
          }
        }
      } else if (result) {
        // Just geocoded center, no racing line
        setTrackData(null)
        setElevationData([])
      }
      setIsLoading(false)
    }
    loadTrack()
  }, [selectedTrack])

  // Re-render 3D scene when data or palette changes
  useEffect(() => {
    if (!sceneRef.current || !trackData) return
    
    // Cleanup existing circuit
    const toRemove: THREE.Object3D[] = []
    sceneRef.current.traverse(obj => {
      if (obj.name === 'circuit' || obj.name === 'glow') toRemove.push(obj)
    })
    toRemove.forEach(obj => sceneRef.current?.remove(obj))

    const coords = trackData.features[0].geometry.coordinates as [number, number][]
    const firstCoord = coords[0]

    let processedElevation = elevationData
    if (processedElevation.length === 0 || processedElevation.every(e => e === 0)) {
      processedElevation = coords.map((_, i) => Math.sin(i * 0.1) * 20 + Math.cos(i * 0.05) * 15)
    }

    const trackPoints: THREE.Vector3[] = coords.map((c, i) => {
      // Scale factor for visibility in 3D space
      const x = (c[0] - firstCoord[0]) * 100000
      const z = -(c[1] - firstCoord[1]) * 100000 // Invert Z for Three.js
      const minElev = Math.min(...processedElevation)
      const h = (processedElevation[i] - minElev) * 8 // Elevation drama
      return new THREE.Vector3(x, h, z)
    })

    const curve = new THREE.CatmullRomCurve3(trackPoints)
    curve.closed = true
    const geometry = new THREE.TubeGeometry(curve, 256, 10, 16, true)
    
    const material = new THREE.MeshPhongMaterial({ 
      color: activePalette.primary,
      emissive: activePalette.primary,
      emissiveIntensity: 1.2,
      shininess: 100,
      specular: 0xffffff
    })
    
    const track = new THREE.Mesh(geometry, material)
    track.name = 'circuit'
    sceneRef.current.add(track)

    // INNER GLOW
    const glowGeo = new THREE.TubeGeometry(curve, 256, 18, 8, true)
    const glowMat = new THREE.MeshBasicMaterial({
      color: activePalette.primary,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.name = 'glow'
    sceneRef.current.add(glow)

    // Auto-zoom & transition
    const box = new THREE.Box3().setFromObject(track)
    const centerPoint = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    
    if (controlsRef.current && cameraRef.current) {
      // Smoothly look at the new center
      controlsRef.current.target.lerp(centerPoint, 0.1)
      
      const targetPos = new THREE.Vector3(
        centerPoint.x + maxDim * 1.6,
        centerPoint.y + maxDim * 1.2,
        centerPoint.z + maxDim * 1.6
      )
      
      // Simple lerp for camera position transition
      cameraRef.current.position.lerp(targetPos, 0.1)
      controlsRef.current.update()
    }
  }, [elevationData, activePalette, trackData])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#020202', overflow: 'hidden', color: '#fff' }}>
      <header style={{ padding: '20px 40px', background: 'rgba(10,10,10,0.98)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <h2 className="f1-font" style={{ fontSize: '22px', margin: 0, letterSpacing: '2px', fontWeight: 900 }}>
              {selectedTrack.toUpperCase()}
            </h2>
            <div style={{ width: '2px', height: '24px', background: activePalette.primary }} />
            <div style={{ color: activePalette.primary, fontSize: '10px', fontWeight: 900, letterSpacing: '3px' }}>3D BUILDER</div>
          </div>
          
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="glass-panel" 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 25px', color: '#555', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '100px' }}
          >
            <Search size={14} /> 
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px' }}>SEARCH... (Ctrl+K)</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {isLoading && <Loader2 size={18} className="animate-spin" style={{ color: activePalette.primary }} />}
          <button 
            className="f1-font"
            style={{ 
              padding: '12px 30px', 
              background: activePalette.primary, 
              border: 'none', 
              color: activePalette.primary === '#FFFFFF' ? '#000' : '#fff', 
              fontWeight: 900, 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontSize: '11px',
              letterSpacing: '1px',
              boxShadow: `0 0 20px ${activePalette.primary}44`
            }}
          >
            EXPORT GLB
          </button>
        </div>
      </header>

      <div ref={containerRef} style={{ flex: 1, position: 'relative', background: '#000' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        
        {/* Track Selector (Small preview of next/prev) */}
        <div style={{ position: 'absolute', bottom: '30px', left: '30px', zIndex: 20 }}>
           <div className="glass-panel" style={{ padding: '15px 25px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '9px', color: '#444', fontWeight: 900, letterSpacing: '2px' }}>LOCATION</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{TRACK_TO_COUNTRY[selectedTrack]?.toUpperCase() || 'WORLD CIRCUIT'}</span>
           </div>
        </div>

        {/* Dashboard Panels */}
        <div style={{ position: 'absolute', top: '30px', right: '30px', width: '260px', pointerEvents: 'none' }}>
          <div className="glass-panel" style={{ padding: '25px', pointerEvents: 'auto' }}>
             <h3 style={{ fontSize: '10px', color: '#555', marginBottom: '20px', letterSpacing: '3px', fontWeight: 900 }}>TOPOGRAPHIC ANALYTICS</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#444', fontSize: '11px', fontWeight: 600 }}>PEAK ALTITUDE</span>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>
                    {elevationData.length > 0 && !elevationData.every(e => e === 0) ? Math.max(...elevationData).toFixed(0) : '32'}m
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#444', fontSize: '11px', fontWeight: 600 }}>VERTICAL GAIN</span>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: activePalette.primary }}>
                    {elevationData.length > 0 && !elevationData.every(e => e === 0) ? (Math.max(...elevationData) - Math.min(...elevationData)).toFixed(0) : '15'}m
                  </span>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#444', fontSize: '11px', fontWeight: 600 }}>DRAMA SCALE</span>
                  <span style={{ fontSize: '14px', fontWeight: 900, color: '#fff' }}>8.0x</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(15px)', zIndex: 1000, display: 'flex', justifyContent: 'center', paddingTop: '100px' }}
          >
            <motion.div 
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-panel" 
              style={{ width: '650px', maxHeight: '600px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px' }}
            >
              <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <Search size={22} style={{ color: activePalette.primary }} />
                <input 
                  autoFocus
                  placeholder="Search 80+ F1 Circuits..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: '20px', outline: 'none', fontWeight: 300 }}
                />
                <X size={22} style={{ cursor: 'pointer', color: '#444' }} onClick={() => setIsSearchOpen(false)} />
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                {filteredTracks.map(track => (
                  <motion.div 
                    whileHover={{ x: 5, background: 'rgba(255,255,255,0.03)' }}
                    key={track}
                    onClick={() => { setSelectedTrack(track); setIsSearchOpen(false); }}
                    style={{ 
                      padding: '18px 25px', 
                      borderRadius: '12px', 
                      cursor: 'pointer',
                      background: selectedTrack === track ? `${activePalette.primary}15` : 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: selectedTrack === track ? activePalette.primary : 'rgba(255,255,255,0.1)' }} />
                      <span style={{ color: selectedTrack === track ? activePalette.primary : '#fff', fontWeight: selectedTrack === track ? 700 : 400, fontSize: '15px' }}>{track}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '10px', color: '#444', letterSpacing: '1px' }}>{TRACK_TO_COUNTRY[track]?.toUpperCase()}</span>
                      <ChevronRight size={14} style={{ color: '#222' }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CircuitBuilder3D
