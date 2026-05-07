import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { circuits } from '../assets/data/CircuitRegistry'
import type { CircuitName } from '../assets/data/CircuitRegistry'
import flagPalettes from '../assets/data/flag-palettes.json'
import { fetchElevation } from '../utils/elevation'
import { Maximize, RotateCcw, Download, Share, Zap, Cloud, Map as MapIcon } from 'lucide-react'

const circuitToCountry: Record<CircuitName, string> = {
  Monza: 'Italy',
  Silverstone: 'UK',
  Spa: 'Belgium',
  Monaco: 'Monaco',
  Suzuka: 'Japan',
  Interlagos: 'Brazil',
  Austin: 'USA'
}

const CircuitBuilder3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const trackRef = useRef<THREE.Group | null>(null)
  
  const [selectedCircuit, setSelectedCircuit] = useState<CircuitName>('Monza')
  const [activePalette, setActivePalette] = useState(flagPalettes.Italy)
  const [elevationData, setElevationData] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync palette when circuit changes to provide immersive national branding
  useEffect(() => {
    const country = circuitToCountry[selectedCircuit]
    if (country && flagPalettes[country]) {
      setActivePalette(flagPalettes[country])
    }
  }, [selectedCircuit])

  const stats = React.useMemo(() => {
    const circuit = circuits[selectedCircuit]
    return circuit?.features[0]?.properties || { length: 0, Location: 'Unknown', opened: 'N/A' }
  }, [selectedCircuit])

  const loadElevation = async () => {
    setIsLoading(true)
    setError(null)
    setElevationData([])
    
    const cacheKey = `elevation_${selectedCircuit}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setElevationData(JSON.parse(cached))
      setIsLoading(false)
      return
    }

    try {
      const data = circuits[selectedCircuit]
      const coords = data.features[0].geometry.coordinates as [number, number][]
      const elevations = await fetchElevation(coords)
      localStorage.setItem(cacheKey, JSON.stringify(elevations))
      setElevationData(elevations)
    } catch (err) {
      console.error('Failed to load elevation:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadElevation()
  }, [selectedCircuit])

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050505)
    scene.fog = new THREE.FogExp2(0x050505, 0.001)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      10000
    )
    camera.position.set(500, 500, 500)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.screenSpacePanning = false
    controls.maxPolarAngle = Math.PI / 2
    controlsRef.current = controls

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(100, 200, 100)
    scene.add(directionalLight)

    // Animation loop
    let frameId: number
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, []) // Initialize once

  useEffect(() => {
    if (sceneRef.current && !isLoading) {
      buildTrack(sceneRef.current)
    }
  }, [elevationData, activePalette, isLoading, selectedCircuit])

  const buildTrack = (scene: THREE.Scene) => {
    const trackPoints: THREE.Vector3[] = []
    try {
      // Correct cleanup: remove only mesh/group objects, keep lights
      const toRemove: THREE.Object3D[] = []
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Group || obj instanceof THREE.GridHelper) {
          toRemove.push(obj)
        }
      })
      toRemove.forEach(obj => scene.remove(obj))

    const data = circuits[selectedCircuit]
    const coords = data.features[0].geometry.coordinates as [number, number][]
    
    if (!coords || coords.length === 0) return

    // Center the track perfectly using bounding box
    const lats = coords.map(p => p[1])
    const lngs = coords.map(p => p[0])
    const center = [
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
      (Math.min(...lats) + Math.max(...lats)) / 2
    ]

    const scale = 80000 // Optimized factor to map GPS degrees to visible Three.js world units
    
    // Defensive elevation calculation
    const validElevationData = elevationData.filter(e => typeof e === 'number' && !isNaN(e))
    const minElev = validElevationData.length > 0 ? Math.min(...validElevationData) : 0
    
    coords.forEach((coord: any, i: number) => {
      const x = (coord[0] - center[0]) * scale
      const z = (coord[1] - center[1]) * scale
      
      const rawElev = elevationData[i]
      const elev = (typeof rawElev === 'number' && !isNaN(rawElev)) ? rawElev : 0
      const y = (elev - minElev) * 5
      
      trackPoints.push(new THREE.Vector3(x, y, z))
    })

    const curve = new THREE.CatmullRomCurve3(trackPoints)
    curve.closed = true
    const geometry = new THREE.TubeGeometry(curve, Math.max(100, trackPoints.length * 2), 8, 16, true)
    const material = new THREE.MeshPhongMaterial({ 
      color: activePalette.primary,
      emissive: activePalette.primary,
      emissiveIntensity: 0.5,
      shininess: 100,
      specular: 0x444444
    })
    
    const track = new THREE.Mesh(geometry, material)
    track.name = 'circuitMesh'
    scene.add(track)

    // Ensure there is at least one light if children was cleared too aggressively
    if (!scene.children.some(c => c instanceof THREE.Light)) {
      scene.add(new THREE.AmbientLight(0xffffff, 0.8))
      const sun = new THREE.DirectionalLight(0xffffff, 1)
      sun.position.set(100, 200, 100)
      scene.add(sun)
    }

    // Turn Detection & Labels
    const threshold = 0.2 
    for (let i = 1; i < trackPoints.length - 1; i++) {
      const pPrev = trackPoints[i-1]
      const pCurr = trackPoints[i]
      const pNext = trackPoints[i+1]

      if (!pPrev || !pCurr || !pNext) continue

      const v1 = new THREE.Vector3().subVectors(pCurr, pPrev).normalize()
      const v2 = new THREE.Vector3().subVectors(pNext, pCurr).normalize()
      
      // Turn labels
      if (v1.angleTo(v2) > threshold) {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(2),
          new THREE.MeshBasicMaterial({ color: activePalette.secondary })
        )
        sphere.position.copy(pCurr).add(new THREE.Vector3(0, 8, 0))
        scene.add(sphere)
        i += 15 // Skip ahead
        continue 
      }

      // Elevation Grade Labels (>3% grade)
      const dist = pCurr.distanceTo(pPrev)
      if (dist > 0) {
        const rise = pCurr.y - pPrev.y
        const grade = (rise / dist) * 100
        if (Math.abs(grade) > 3) {
          const gradeMarker = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            new THREE.MeshBasicMaterial({ color: activePalette.accent })
          )
          gradeMarker.position.copy(pCurr).add(new THREE.Vector3(0, 12, 0))
          scene.add(gradeMarker)
          i += 25 // Avoid crowding
        }
      }
    }

    // Shadow plane
    const shadowGeo = new THREE.PlaneGeometry(2000, 2000)
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.3 })
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat)
    shadowPlane.rotation.x = -Math.PI / 2
    shadowPlane.position.y = -50
    scene.add(shadowPlane)
    
    const grid = new THREE.GridHelper(2000, 50, 0x333333, 0x222222)
    grid.position.y = -50.1
    scene.add(grid)

    // Auto-center camera if requested or on first build
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
    } catch (err: any) {
      console.error('Track build error:', err)
      setError(err.message || 'An error occurred during 3D rendering')
    }
  }

  const exportPNG = () => {
    if (!rendererRef.current) return
    const link = document.createElement('a')
    link.download = `MapArt_3D_${selectedCircuit}.png`
    link.href = rendererRef.current.domElement.toDataURL('image/png')
    link.click()
  }

  const exportGLB = () => {
    if (!sceneRef.current) return
    const exporter = new GLTFExporter()
    exporter.parse(
      sceneRef.current,
      (gltf) => {
        const link = document.createElement('a')
        link.download = `MapArt_3D_${selectedCircuit}.glb`
        const blob = new Blob([JSON.stringify(gltf)], { type: 'application/octet-stream' })
        link.href = URL.createObjectURL(blob)
        link.click()
      },
      (error) => {
        console.error('An error happened during GLTF export', error)
      },
      { binary: true }
    )
  }

  const resetView = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(500, 500, 500)
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
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
        zIndex: 10
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div>
            <h2 className="f1-font" style={{ fontSize: '24px' }}>{selectedCircuit} <span style={{ color: activePalette.primary }}>3D</span></h2>
            <p style={{ color: '#666', fontSize: '12px' }}>{(stats.length / 1000).toFixed(3)} KM • {stats.Location} • {stats.opened}</p>
          </div>
          <select 
            className="glass-panel" 
            value={selectedCircuit}
            onChange={(e) => setSelectedCircuit(e.target.value as CircuitName)}
            style={{ background: 'var(--bg-sidebar)', color: '#fff', border: '1px solid var(--glass-border)', padding: '8px 15px', outline: 'none', cursor: 'pointer', borderRadius: '8px' }}
          >
            {Object.keys(circuits).map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={exportPNG} className="glass-panel" style={{ padding: '8px 15px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Render PNG
          </button>
          <button onClick={exportGLB} className="glass-panel" style={{ padding: '8px 15px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share size={16} /> Export GLB
          </button>
        </div>
      </header>

      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        
        {isLoading && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            background: 'rgba(0,0,0,0.8)', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center',
            zIndex: 5
          }}>
            <Cloud size={48} className="neon-glow" style={{ color: activePalette.primary, marginBottom: '20px' }} />
            <h3 className="f1-font">Sampling Topography...</h3>
            <p style={{ color: '#666', marginTop: '10px' }}>Fetching SRTM data for {selectedCircuit}</p>
          </div>
        )}

        {error && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            background: 'rgba(20,0,0,0.9)', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center',
            zIndex: 6,
            padding: '40px',
            textAlign: 'center'
          }}>
            <Zap size={48} style={{ color: '#ff4d4d', marginBottom: '20px' }} />
            <h3 className="f1-font" style={{ color: '#ff4d4d' }}>Telemetry Error</h3>
            <p style={{ color: '#ccc', marginTop: '10px', maxWidth: '400px' }}>{error}</p>
            <button 
              onClick={() => loadElevation()}
              className="glass-panel" 
              style={{ marginTop: '30px', padding: '10px 25px', color: '#fff', cursor: 'pointer' }}
            >
              Retry Sync
            </button>
          </div>
        )}
        
        {/* Floating Controls */}
        <div style={{ position: 'absolute', bottom: '30px', left: '30px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="glass-panel" style={{ 
            padding: '10px 20px', 
            borderRadius: '12px',
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: isLoading ? activePalette.accent : '#00ff00',
              boxShadow: isLoading ? `0 0 10px ${activePalette.accent}` : '0 0 10px #00ff00'
            }} />
            <span style={{ fontSize: '12px', color: '#aaa', fontWeight: 600 }}>
              {isLoading ? 'SYNCING TELEMETRY...' : 'CIRCUIT DATA LIVE'}
            </span>
          </div>
          <div className="glass-panel" style={{ padding: '20px', width: '260px' }}>
            <h4 className="f1-font" style={{ marginBottom: '15px', fontSize: '14px' }}>Flag Theme</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(flagPalettes).slice(0, 12).map(([name, palette]: [string, any]) => (
                <div 
                  key={name}
                  onClick={() => setActivePalette(palette)}
                  style={{ 
                    width: '30px', 
                    height: '30px', 
                    background: palette.primary,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: activePalette === palette ? '2px solid white' : 'none'
                  }}
                  title={name}
                />
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={resetView} className="glass-panel" style={{ width: '50px', height: '50px', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <RotateCcw size={20} />
            </button>
            <button className="glass-panel" style={{ width: '50px', height: '50px', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Maximize size={20} />
            </button>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="glass-panel" style={{ position: 'absolute', top: '30px', right: '30px', padding: '20px', width: '220px' }}>
          <h4 className="f1-font" style={{ marginBottom: '15px', fontSize: '14px' }}>Elevation Stats</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ color: '#888' }}>Highest</span>
            <span>{elevationData.length > 0 ? Math.max(...elevationData).toFixed(0) : '---'}m</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ color: '#888' }}>Lowest</span>
            <span>{elevationData.length > 0 ? Math.min(...elevationData).toFixed(0) : '---'}m</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888' }}>Rel. Vertical</span>
            <span style={{ color: activePalette.accent }}>
              {elevationData.length > 0 ? (Math.max(...elevationData) - Math.min(...elevationData)).toFixed(0) : '---'}m
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CircuitBuilder3D
// Build optimization pass 1
// Build optimization pass 2
// Build optimization pass 3
// Build optimization pass 4
// Build optimization pass 5
// Build optimization pass 6
// Build optimization pass 7
// Build optimization pass 8
// Build optimization pass 9
// Build optimization pass 10
// Build optimization pass 11
// Build optimization pass 12
// Build optimization pass 13
// Build optimization pass 14
