# 3D Grow Room Planner

Phone-first 2D/3D grow-room planning with GLB import, room scanning, rack layout, lighting coverage, and cultivation-specific design checks.

## Current foundation

- Babylon.js 3D room viewport
- GLB/GLTF import
- 2D room plan toggle
- Double-rack and grow-light placement primitives
- Scanner architecture for ARCore → RTAB-Map → Open3D

## Run locally

```bash
npm install
npm run dev
```

## Direction

The planner is designed to turn a camera scan or imported GLB into a calibrated room model, then help calculate rack count, light count, hanging positions, coverage, walkways, and estimated electrical/heat load.
