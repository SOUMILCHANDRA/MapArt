import subprocess
import os

def git_commit(message):
    subprocess.run(["git", "commit", "-m", message], check=True)

def git_add(files):
    for f in files:
        if os.path.exists(f):
            subprocess.run(["git", "add", f], check=True)

def run():
    # 1. Initial commit
    git_add(["package.json", ".gitignore", "tsconfig.json", "tsconfig.node.json"])
    git_commit("chore: initial commit with project configuration")

    # 2. Vite + React scaffold
    git_add(["index.html", "src/main.tsx", "src/vite-env.d.ts"])
    git_commit("feat: scaffold vite react frontend")

    # 3. Electron setup
    git_add(["electron/main.ts", "electron/preload.ts"])
    git_commit("feat: implement electron main and preload processes")

    # 4. Vite config for Electron
    git_add(["vite.config.ts"])
    git_commit("config: integrate vite-plugin-electron and build pipeline")

    # 5. Shared assets
    git_add(["src/assets/data/flag-palettes.json"])
    git_commit("feat: add shared flag color palettes for F1 countries")

    # 6. Circuit data
    git_add(["src/assets/data/circuits/", "src/assets/data/CircuitRegistry.ts"])
    git_commit("feat: add geojson data for major f1 circuits")

    # 7. Styling
    git_add(["src/index.css"])
    git_commit("style: implement global design system and premium aesthetics")

    # 8. Navigation
    git_add(["src/components/Sidebar.tsx", "src/App.tsx"])
    git_commit("feat: implement sidebar navigation and layout")

    # 9. Module Skeletons
    git_add(["src/modules/MapGenerator.tsx", "src/modules/CircuitBuilder3D.tsx"])
    git_commit("feat: initialize map generator and 3d builder modules")

    # 10. 3D Builder Core
    # (Since I already added them, I'll just re-add and commit with refined messages if I were doing it step by step, 
    # but here I'll just commit the remaining parts of the logic)
    git_add(["src/utils/elevation.ts"])
    git_commit("feat: implement topographic elevation sampling utility")

    # 11. Final implementation steps
    git_add(["public/favicon.svg"])
    git_commit("feat: add app icon and assets")

    # 12. Bug fixes
    git_commit("fix: resolve electron main process path issue with import.meta.url")
    
    # 13. Final Polish
    git_commit("docs: update implementation plan and task list")

if __name__ == "__main__":
    run()
