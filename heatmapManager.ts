import { CustomDataSource, Entity, ImageMaterialProperty, Rectangle } from 'cesium';
import Heatmap from './heatmap';

export interface HeatPoint {
  centerLongitudeDeg: number;
  centerLatitudeDeg: number;
  diameterKm?: number;
  value?: number;
}

interface WGS84BoundingBox {
  north: number;
  east: number;
  south: number;
  west: number;
}

interface HeatmapCanvasPoint {
  x: number;
  y: number;
  lon: number;
  lat: number;
  value: number;
  radius: number;
}

export default class HeatmapManager {
  viewer: any;
  heatmapCollection: CustomDataSource;
  private heatmapInstance: Heatmap | null = null;
  private container: HTMLDivElement | null = null;
  private layer: Entity | null = null;
  private rectangle: Rectangle | null = null;
  private bounds: WGS84BoundingBox | null = null;
  private latLonToCanvas!: (lon: number, lat: number) => { x: number; y: number };
  private canvasWidth = 2000;
  private canvasHeight = 1000;

  constructor(viewer: any) {
    this.viewer = viewer;
    this.heatmapCollection = new CustomDataSource('heatmap');
    this.viewer.dataSources.add(this.heatmapCollection);
  }

  public create(bounds: WGS84BoundingBox, options: Partial<Parameters<typeof Heatmap.create>[0]> = {}): void {
    const width = this.canvasWidth;
    const height = Math.round(((bounds.north - bounds.south) / (bounds.east - bounds.west)) * width);
    this.canvasHeight = height;

    this.container = this.createContainer(width, height);

    this.latLonToCanvas = (lon, lat) => ({
      x: ((lon - bounds.west) / (bounds.east - bounds.west)) * width,
      y: ((bounds.north - lat) / (bounds.north - bounds.south)) * height,
    });

    this.heatmapInstance = Heatmap.create({
      container: this.container,
      size: { width, height },
      radius: options.radius ?? Math.round(Math.min(width, height) / 20),
      gradient: options.gradient,
      maxOpacity: options.maxOpacity,
      minOpacity: options.minOpacity,
      latLonToCanvas: this.latLonToCanvas,
    });

    this.bounds = bounds;
    this.rectangle = Rectangle.fromDegrees(bounds.west, bounds.south, bounds.east, bounds.north);
  }

  public setWGS84Data(points: HeatPoint[]): boolean {
    if (!this.heatmapInstance || !this.container || !this.bounds || !this.rectangle) {
      console.warn('HeatmapManager: not initialized');
      return false;
    }

    const heatmapData: HeatmapCanvasPoint[] = points.map((p) => {
      const { x, y } = this.latLonToCanvas(p.centerLongitudeDeg, p.centerLatitudeDeg);
      const radiusMeter = (p.diameterKm ?? 40) * 500;
      return {
        x: Math.round(x),
        y: Math.round(y),
        lon: p.centerLongitudeDeg,
        lat: p.centerLatitudeDeg,
        value: p.value ?? 1,
        radius: radiusMeter,
      };
    });

    this.heatmapInstance.setData(heatmapData);
    this.updateLayer();
    return true;
  }

  public updateLayer(): void {
    if (!this.heatmapInstance || !this.rectangle) return;

    if (this.layer) {
      this.viewer.entities.remove(this.layer);
    }

    this.layer = this.heatmapCollection.entities.add({
      show: true,
      rectangle: {
        coordinates: this.rectangle,
        material: new ImageMaterialProperty({
          image: this.heatmapInstance.renderer.canvas,
          transparent: true,
        }),
      },
    });
  }

  public show(visible: boolean): void {
    if (this.layer) {
      this.layer.show = visible;
    }
  }

  public clear(): void {
    if (this.layer) {
      this.heatmapCollection.entities.remove(this.layer);
      this.layer = null;
    }

    if (this.container?.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }

    this.heatmapInstance = null;
    this.container = null;
    this.rectangle = null;
    this.bounds = null;
  }

  private createContainer(width: number, height: number): HTMLDivElement {
    const c = document.createElement('div');
    c.setAttribute('style', `width: ${width}px; height: ${height}px; margin: 0px; display: none;`);
    document.body.appendChild(c);
    return c;
  }
}
