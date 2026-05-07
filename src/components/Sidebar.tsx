import React from 'react'
import { Map, Box, Settings, Share } from 'lucide-react'

interface SidebarProps {
  activeModule: string
  setActiveModule: (module: string) => void
}

const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule }) => {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo" style={{ marginBottom: '40px', color: '#ff1801' }}>
        <Box size={32} />
      </div>
      
      <div 
        className={`sidebar-item ${activeModule === 'map' ? 'active' : ''}`}
        onClick={() => setActiveModule('map')}
        title="Map Art Generator"
      >
        <Map size={24} />
        <span>Map Generator</span>
      </div>

      <div 
        className={`sidebar-item ${activeModule === '3d' ? 'active' : ''}`}
        onClick={() => setActiveModule('3d')}
        title="3D Circuit Builder"
      >
        <Box size={24} />
        <span>3D Builder</span>
      </div>

      <div style={{ flex: 1 }} />

      <div className="sidebar-item">
        <Settings size={24} />
        <span>Settings</span>
      </div>
      
      <div className="sidebar-item" onClick={() => window.open('https://github.com/soumil-chandra', '_blank')}>
        <Share size={24} />
        <span>GitHub</span>
      </div>
    </nav>
  )
}

export default Sidebar
