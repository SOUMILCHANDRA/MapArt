import { useState } from 'react'
import Sidebar from './components/Sidebar'
import MapGenerator from './modules/MapGenerator'
import CircuitBuilder3D from './modules/CircuitBuilder3D'

function App() {
  const [activeModule, setActiveModule] = useState('3d') // Start with 3D as requested

  return (
    <>
      <div className="title-bar-drag" />
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      <main className="main-content" style={{ height: '100vh' }}>
        {activeModule === 'map' ? <MapGenerator /> : <CircuitBuilder3D />}
      </main>
    </>
  )
}

export default App
