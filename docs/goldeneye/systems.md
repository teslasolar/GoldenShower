# GoldenEye 007 - Game Systems

## Engine
- Custom, built from scratch
- No existing FPS framework - used graphics textbooks
- Target: 1000-2000 triangles @ 30fps (achieved)

## Rendering Optimizations

### Grayscale Textures
- RGB textures = expensive
- Grayscale = 2x resolution possible
- Color added via vertex coloring

### STAN System (Navigation Mesh)
- "Stand" polygonal meshes per room
- Flagged for AI navigation
- Rooms as occlusion units

### Room-Based Culling
- Levels split into "rooms"
- Only visible rooms rendered
- AI dormant until rendered once

## AI System

### Sensory Inputs
- Visual detection (frustum-based)
- Audio detection (gunshots)
- Damage response
- Stripped-down for N64 constraints

### Behaviors
- Surrender probability (when aimed at)
- Alert propagation
- Guard states: patrol, alert, attack, flee

## Dev Tools
- Alias Wavefront v4 (pre-Maya) for 3D
- SGI Onyx 2 Reality Engine
- NINGEN (Nintendo dev software)
- Hacked Saturn controller (N64 controller not finalized)

## Hidden Features
- ZX Spectrum emulator + 10 Rare games (disabled, patch-unlockable)
