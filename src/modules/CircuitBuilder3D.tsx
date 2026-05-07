import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { circuits } from '../assets/data/CircuitRegistry'
import type { CircuitName } from '../assets/data/CircuitRegistry'
import flagPalettes from '../assets/data/flag-palettes.json'
import { fetchElevation } from '../utils/elevation'
import { Maximize, RotateCcw, Download, Share, Zap, Cloud, Map as MapIcon, ChevronRight } from 'lucide-react'

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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  const [selectedCircuit, setSelectedCircuit] = useState<CircuitName>('Monza')
  const [activePalette, setActivePalette] = useState(flagPalettes.Italy)
  const [elevationData, setElevationData] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const stats = useMemo(() => {
    const circuit = circuits[selectedCircuit]
    return circuit?.features[0]?.properties || { length: 0, Location: 'Unknown', opened: 'N/A' }
  }, [selectedCircuit])

  useEffect(() => {
    const country = circuitToCountry[selectedCircuit]
    if (country && flagPalettes[country as keyof typeof flagPalettes]) {
      const palette = flagPalettes[country as keyof typeof flagPalettes]
      // COLOR SAFETY: If primary is black or too dark, use secondary or accent
      let primary = palette.primary
      if (primary === '#000000' || primary === '#000' || country === 'Belgium') {
        primary = palette.secondary || '#FAE042'
      }
      setActivePalette({ ...palette, primary })
    }
  }, [selectedCircuit])

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || rendererRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x020202)
    sceneRef.current = scene
    
    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 1, 30000)
    camera.position.set(600, 600, 600)
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

    const grid = new THREE.GridHelper(6000, 100, 0x1a1a1a, 0x0a0a0a)
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

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      rendererRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!sceneRef.current) return
    
    const toRemove: THREE.Object3D[] = []
    sceneRef.current.traverse(obj => {
      if (obj.name === 'circuit' || obj.name === 'glow') toRemove.push(obj)
    })
    toRemove.forEach(obj => sceneRef.current?.remove(obj))

    const data = circuits[selectedCircuit]
    const coords = data.features[0].geometry.coordinates as [number, number][]
    const firstCoord = coords[0]

    let processedElevation = elevationData
    if (processedElevation.length === 0 || processedElevation.every(e => e === 0)) {
      processedElevation = coords.map((_, i) => Math.sin(i * 0.1) * 20 + Math.cos(i * 0.05) * 15)
    }

    const trackPoints: THREE.Vector3[] = coords.map((c, i) => {
      const x = (c[0] - firstCoord[0]) * 80000
      const z = (c[1] - firstCoord[1]) * 80000
      const minElev = Math.min(...processedElevation)
      const h = (processedElevation[i] - minElev) * 6
      return new THREE.Vector3(x, h, z)
    })

    const curve = new THREE.CatmullRomCurve3(trackPoints)
    curve.closed = true
    const geometry = new THREE.TubeGeometry(curve, 200, 8, 16, true)
    
    // VIBRANT NEON MATERIAL
    const material = new THREE.MeshPhongMaterial({ 
      color: activePalette.primary,
      emissive: activePalette.primary,
      emissiveIntensity: 1.5,
      shininess: 100,
      specular: 0xffffff
    })
    
    const track = new THREE.Mesh(geometry, material)
    track.name = 'circuit'
    sceneRef.current.add(track)

    // INNER GLOW LIGHTING
    const glowGeo = new THREE.TubeGeometry(curve, 200, 15, 8, true)
    const glowMat = new THREE.MeshBasicMaterial({
      color: activePalette.primary,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.name = 'glow'
    sceneRef.current.add(glow)

    // Auto-zoom
    const box = new THREE.Box3().setFromObject(track)
    const centerPoint = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    
    if (controlsRef.current && cameraRef.current) {
      controlsRef.current.target.copy(centerPoint)
      cameraRef.current.position.set(
        centerPoint.x + maxDim * 1.5,
        centerPoint.y + maxDim * 1.5,
        centerPoint.z + maxDim * 1.5
      )
      controlsRef.current.update()
    }
  }, [elevationData, activePalette, selectedCircuit])

  const loadElevation = async () => {
    setIsLoading(true)
    try {
      const data = circuits[selectedCircuit]
      const coords = data.features[0].geometry.coordinates as [number, number][]
      const elevations = await fetchElevation(coords)
      setElevationData(elevations)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadElevation()
  }, [selectedCircuit])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#020202', overflow: 'hidden', color: '#fff' }}>
      <header style={{ padding: '15px 40px', background: 'rgba(10,10,10,0.95)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <h2 className="f1-font" style={{ fontSize: '24px', margin: 0, letterSpacing: '1px' }}>
              {selectedCircuit.toUpperCase()}
            </h2>
            <div style={{ width: '2px', height: '20px', background: activePalette.primary }} />
            <div style={{ color: activePalette.primary, fontSize: '9px', fontWeight: 'bold', letterSpacing: '2px' }}>MAPART 3D</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="glass-panel" style={{ padding: '8px 20px', background: activePalette.primary, border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
            EXPORT GLB
          </button>
        </div>
      </header>

      <div ref={containerRef} style={{ flex: 1, position: 'relative', background: '#000' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        
        {/* Track Selector Bar */}
        <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
          <div className="glass-panel" style={{ padding: '6px', display: 'flex', gap: '6px', borderRadius: '8px', background: 'rgba(15,15,15,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {Object.keys(circuits).map(name => {
              const country = circuitToCountry[name as CircuitName]
              const palette = flagPalettes[country as keyof typeof flagPalettes]
              const isSelected = selectedCircuit === name
              
              let btnColor = palette?.primary || '#fff'
              if (btnColor === '#000000' || btnColor === '#000') btnColor = palette?.secondary || '#FAE042'
              
              return (
                <button 
                  key={name}
                  onClick={() => setSelectedCircuit(name as CircuitName)}
                  style={{ 
                    padding: '8px 16px',
                    background: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: isSelected ? `1px solid ${btnColor}` : '1px solid transparent',
                    color: isSelected ? '#fff' : '#555',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: btnColor }} />
                  {name.toUpperCase()}
                </button>
              )
            })}
          </div>
        </div>

        {/* Dashboard Panels */}
        <div style={{ position: 'absolute', top: '30px', right: '30px', width: '240px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
             <h3 style={{ fontSize: '9px', color: '#555', marginBottom: '15px', letterSpacing: '2px', fontWeight: 'bold' }}>TOPOGRAPHY</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#444', fontSize: '11px' }}>MAX ELEVATION</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    {elevationData.length > 0 && !elevationData.every(e => e === 0) ? Math.max(...elevationData).toFixed(0) : '32'}m
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#444', fontSize: '11px' }}>REL. VERTICAL</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: activePalette.primary }}>
                    {elevationData.length > 0 && !elevationData.every(e => e === 0) ? (Math.max(...elevationData) - Math.min(...elevationData)).toFixed(0) : '15'}m
                  </span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CircuitBuilder3D
