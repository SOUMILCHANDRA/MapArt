# MapArt

High‑performance Windows desktop application for F1 enthusiasts to create cinematic circuit visualizations.

[Quick Links: [Introduction](#introduction) · [Tech Stack](#tech-stack) · [Prerequisites / Requirements](#prerequisites--requirements) · [Installation](#installation) · [Configuration](#configuration) · [Usage](#usage) · [Project Structure](#project-structure) · [Features](#features) · [Development](#development) · [Contributing](#contributing) · [License](#license) · [FAQ](#faq)]

## Introduction

MapArt is an Electron‑based desktop tool that combines geographic data with artistic rendering. It lets users load vector map tiles, apply country flag palettes, crop precise export areas, and generate 3‑D circuit models with exaggerated elevation for dramatic visual effects. The application is tailored for F1 fans who want to produce broadcast‑style circuit artwork.

## Tech Stack

- **Electron** – Provides the native Windows desktop environment.  
- **React 19** – UI library for building interactive components.  
- **TypeScript 6** – Statically typed JavaScript for the renderer and main processes.  
- **Vite** – Fast development server and bundler.  
- **MapLibre GL JS** – Renders vector map tiles with a dark‑noir style.  
- **Three.js** – Generates and displays 3‑D track ribbons and terrain.  
- **OpenTopoData API** – Supplies elevation data for terrain integration.  

## Prerequisites / Requirements

- Windows 10 or later (64‑bit).  
- **Node.js** ≥ 20.x.  
- **npm** ≥ 10.x (or **yarn**).  
- Internet connection for fetching map tiles and elevation data.  

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/SOUMILCHANDRA/MapArt.git
   ```

2. Change to the project directory:

   ```bash
   cd MapArt
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. (Optional) Install the Electron builder globally for packaging:

   ```bash
   npm install -g electron-builder
   ```

## Configuration

The application uses a few environment variables that can be set in a `.env` file at the project root:

```dotenv
# URL of the Vite dev server (only needed in development)
VITE_DEV_SERVER_URL=http://localhost:5173

# OpenTopoData API endpoint (default is public, no key required)
OPENTOPO_API_URL=https://api.opentopodata.org/v1/srtm30m
```

If the variables are omitted, sensible defaults are applied.

## Usage

### Development mode

Run the Vite development server and launch Electron in one step:

```bash
npm run dev
```

The app will open automatically, pointing to the hot‑reloaded renderer.

### Production build

1. Compile TypeScript and bundle the renderer:

   ```bash
   npm run build
   ```

2. The compiled Electron app can be started with:

   ```bash
   npm run preview
   ```

3. To create an installer for Windows:

   ```bash
   npm run build   # already builds the Electron package
   electron-builder
   ```

The generated installer appears in the `release/` directory.

## Project Structure

| Path                | Description |
|---------------------|-------------|
| `electron/`         | Main and preload scripts for the Electron process. |
| `src/`              | React renderer source (components, styles, entry point). |
| `public/`           | Static assets served by Vite (icons, HTML template). |
| `dist/` & `dist-electron/` | Build output for the renderer and Electron main process. |
| `package.json`      | Project metadata, scripts, and dependencies. |
| `tsconfig.*.json`   | TypeScript configuration for app and node contexts. |
| `.eslintrc.js`      | ESLint configuration for code quality. |

## Features

- **Dynamic Stylization** – Load vector map tiles with a premium dark‑noir aesthetic.  
- **Flag Theme Engine** – Apply local country flag color palettes automatically.  
- **Precision Cropping** – Interactive drag‑rectangle tool to define exact export dimensions.  
- **Neon Overlays** – Customizable text blocks with draggable positioning and neon glow effects.  
- **Elevation Modeling** – Generate 3‑D track ribbons from real‑world GeoJSON paths.  
- **Terrain Integration** – Automated elevation sampling via OpenTopoData API with local caching.  
- **Topographic Drama** – 5× exaggerated elevation scale for striking visual impact.  
- **Smart Annotations** – Automatic turn detection (apex markers) and grade indicators for > 3 % slopes.  
- **Multi‑Format Export** – Export visualizations as PNG, JPEG, or WebGL‑compatible formats.

## Development

- **Linting** – Run ESLint with:

  ```bash
  npx eslint .
  ```

- **Type Checking** – Compile TypeScript without emitting files:

  ```bash
  npx tsc --noEmit
  ```

- **Testing** – No test suite is included yet; contributors are encouraged to add Jest or Vitest configurations.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.  
2. Create a feature branch (`git checkout -b feature/your-feature`).  
3. Commit your changes with clear messages.  
4. Open a pull request describing the changes and any relevant screenshots.

Ensure that linting and type‑checking pass before submitting.

## License

This project is licensed under the terms found in the `LICENSE` file at the repository root.

## FAQ

**Q: Does MapArt run on macOS or Linux?**  
A: Currently the application targets Windows only due to Electron packaging settings and native dependencies.

**Q: Can I use a custom map style?**  
A: Yes. Replace the MapLibre style URL in the renderer’s configuration (`src/main.tsx` or equivalent) with any valid style JSON.

**Q: Where are the cached elevation tiles stored?**  
A: Cached SRTM data is saved in the user’s application data directory under `MapArt/cache/`.  

---
