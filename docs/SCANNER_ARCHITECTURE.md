# Scanner architecture

## Recommended hybrid pipeline

```text
Android camera + ARCore
        -> frame/depth/pose capture
        -> RTAB-Map reconstruction and loop closure
        -> Open3D point-cloud cleanup and mesh simplification
        -> room calibration and semantic extraction
        -> planner scene (2D + 3D)
```

## Why this split exists

- **ARCore** is the phone capture layer. It supplies camera pose, planes, and depth where supported.
- **RTAB-Map** is the mapping layer. It is intended for visual/RGB-D SLAM, loop closure, and map reconstruction.
- **Open3D** is the geometry layer. It is useful for filtering, registration, segmentation, measurements, normals, meshing, and export.

## Android capture contract

The future scanner module should record:

- RGB frames with timestamps
- Depth frames with timestamps when available
- Camera intrinsics
- ARCore camera pose per frame
- Plane detections and tracking quality
- Optional manual calibration measurement

The planner must accept a simplified `RoomScan` artifact rather than depend directly on one scanner implementation. This lets us add external LiDAR or Bluetooth laser-distance-meter support later.

```ts
type RoomScan = {
  source: 'arcore' | 'rtabmap' | 'external-lidar';
  unit: 'meter' | 'foot';
  calibration: { knownDistance: number; measuredDistance: number };
  meshUrl?: string;
  pointCloudUrl?: string;
  planes: Array<{ type: 'floor' | 'wall' | 'ceiling' | 'opening'; width: number; height: number; transform: number[] }>;
};
```

## Measurement confidence

The app should show confidence instead of pretending every scan is architectural-grade:

- high: calibrated scan with stable tracking and depth support
- medium: ARCore depth-from-motion with good coverage
- low: sparse camera reconstruction or manually estimated geometry

No scan should be used for construction or electrical work without independent verification.
