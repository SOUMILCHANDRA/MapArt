# MapArt 🏎️🎨

MapArt is a high-performance Windows desktop application designed for F1 enthusiasts to create cinematic circuit visualizations. Built with **Electron**, **MapLibre GL JS**, and **Three.js**, it bridges the gap between geographic data and artistic design.

## 🌟 Features

### 🗺️ Map Art Generator
- **Dynamic Stylization**: Load vector map tiles via MapLibre GL JS with a premium dark-noir aesthetic.
- **Flag Theme Engine**: Automatically apply local country flag color palettes to road networks using an intelligent painting mode.
- **Precision Cropping**: Interactive drag-rectangle tool to define exact export dimensions.
- **Neon Overlays**: Customizable text blocks with draggable positioning and neon glow effects for a broadcast-style finish.

### 🏔️ 3D Circuit Builder
- **Elevation Modeling**: Generate 3D track ribbons based on real-world GeoJSON paths.
- **Terrain Integration**: Automated elevation sampling via OpenTopoData API (SRTM) with local caching.
- **Topographic Drama**: 5x exaggerated elevation scale for striking visual impact.
- **Smart Annotations**: Automatic turn detection (Apex markers) and elevation grade indicators (>3%).
- **Multi-Format Export**: High-resolution PNG renders and 3D GLB model exports.

## 🛠️ Tech Stack

- **Framework**: Electron + React + Vite
- **Graphics**: Three.js (3D) & MapLibre GL JS (Maps)
- **Styling**: Vanilla CSS with Glassmorphism & Framer Motion
- **Icons**: Lucide React
- **Data**: OpenStreetMap (via OpenFreeMap) & OpenTopoData

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
```bash
git clone https://github.com/SOUMILCHANDRA/MapArt.git
cd MapArt
npm install
```

### Development
```bash
npm run dev
```

### Building for Windows
```bash
npm run build
```
The installer will be generated in the `release/` directory.

## 📄 License
This project is for educational and creative purposes. F1 circuit data is sourced from open community repositories.

---
Created by **Soumil Chandra**
