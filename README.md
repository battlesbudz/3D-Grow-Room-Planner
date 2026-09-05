# 3D Grow Room Planner

Phone-first 2D/3D grow-room planning with GLB import, room scanning, rack layout, lighting coverage, and cultivation-specific design checks.

## Current foundation

- Babylon.js 3D room viewport
- GLB/GLTF import
- 2D room plan toggle
- Double-rack and grow-light placement primitives
- Scanner architecture for ARCore → RTAB-Map → Open3D

## Android scanner build

The first APK milestone is intentionally scanner-first. It opens directly into an ARCore scene, reports tracking/plane/depth state, lets the user import a GLB from Android storage, and anchors the imported model to the first detected floor plane. Rack and light placement are deferred until this scan/import workflow is tested on the phone.

Build locally with Android Studio or use the `Build Android scanner APK` GitHub Actions workflow.

## Run locally

```bash
npm install
npm run dev
```

## Direction

The planner is designed to turn a camera scan or imported GLB into a calibrated room model, then help calculate rack count, light count, hanging positions, coverage, walkways, and estimated electrical/heat load.
