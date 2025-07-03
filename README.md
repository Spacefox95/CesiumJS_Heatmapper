# Cesium Heatmap Renderer

Render beautiful and geographically accurate heatmaps on a 3D Cesium globe.

## ✨ Features

- Accurate heatmap rendering using geographic projection
- Canvas-based rendering with custom gradients
- Warped ellipses to account for projection distortion
- Easy to integrate with any Cesium app

## 📦 Installation

Clone or download this repository and place the `src/` folder in your project.

Make sure you have the following peer dependencies:

```bash
npm install cesium

## Usage

import HeatmapManager from './HeatmapManager';

const viewer = new Cesium.Viewer("cesiumContainer");
const heatmap = new HeatmapManager(viewer);

heatmap.create({
  west: -180,
  east: 180,
  south: -90,
  north: 90
});

heatmap.setWGS84Data([
  {
    centerLatitudeDeg: 48.8566,
    centerLongitudeDeg: 2.3522,
    value: 25,
    diameterKm: 100
  },
  {
    centerLatitudeDeg: 51.5074,
    centerLongitudeDeg: -0.1278,
    value: 30,
    diameterKm: 120
  },
  {
    centerLatitudeDeg: 40.7128,
    centerLongitudeDeg: -74.0060,
    value: 45,
    diameterKm: 150
  },
  {
    centerLatitudeDeg: 35.6895,
    centerLongitudeDeg: 139.6917,
    value: 60,
    diameterKm: 130
  },
  {
    centerLatitudeDeg: -33.8688,
    centerLongitudeDeg: 151.2093,
    value: 50,
    diameterKm: 140
  },
  {
    centerLatitudeDeg: 55.7558,
    centerLongitudeDeg: 37.6173,
    value: 20,
    diameterKm: 100
  },
  {
    centerLatitudeDeg: 52.52,
    centerLongitudeDeg: 13.4050,
    value: 35,
    diameterKm: 110
  },
  {
    centerLatitudeDeg: 34.0522,
    centerLongitudeDeg: -118.2437,
    value: 55,
    diameterKm: 160
  },
  {
    centerLatitudeDeg: 19.4326,
    centerLongitudeDeg: -99.1332,
    value: 40,
    diameterKm: 120
  },
  {
    centerLatitudeDeg: -23.5505,
    centerLongitudeDeg: -46.6333,
    value: 38,
    diameterKm: 180
  },
]);
