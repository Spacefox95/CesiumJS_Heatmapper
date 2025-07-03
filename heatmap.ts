import { Math as CesiumMath, Matrix4, Transforms, Cartesian3, Cartographic, Ellipsoid } from 'cesium';

interface HeatmapCanvasPoint {
  x: number;
  y: number;
  lon: number;
  lat: number;
  value: number;
  radius: number;
}

type HeatmapConfig = {
  size: { width: number; height: number };
  radius?: number;
  maxOpacity?: number;
  minOpacity?: number;
  gradient?: Record<number, string>;
  container: HTMLElement;
  latLonToCanvas: (lon: number, lat: number) => { x: number; y: number };
};

export default class Heatmap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private shadowCanvas: HTMLCanvasElement;
  private shadowCtx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private gradient: Uint8ClampedArray;
  private data: HeatmapCanvasPoint[] = [];

  constructor(private config: HeatmapConfig) {
    const { container, size } = config;
    this.width = size.width;
    this.height = size.height;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d')!;

    this.shadowCanvas = document.createElement('canvas');
    this.shadowCanvas.width = this.width;
    this.shadowCanvas.height = this.height;
    this.shadowCtx = this.shadowCanvas.getContext('2d')!;

    container.appendChild(this.canvas);
    this.gradient = this.generateGradient(
      config.gradient || {
        0.25: 'blue',
        0.55: 'lime',
        0.85: 'yellow',
        1.0: 'red',
      },
    );
  }

  private generateGradient(grad: Record<number, string>): Uint8ClampedArray {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    for (const stop in grad) gradient.addColorStop(parseFloat(stop), grad[stop]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);
    return ctx.getImageData(0, 0, 256, 1).data;
  }

  private drawPoint(point: HeatmapCanvasPoint) {
    const boundary = this.sampleEllipseBoundaryPointsENU(point.lon, point.lat, point.radius, 256).map(
      ({ lon, lat }) => this.config.latLonToCanvas(lon, lat),
    );
    const color = this.valueToColor(point.value);
    this.drawWarpedEllipse(boundary, color);
  }

  private drawWarpedEllipse(points: { x: number; y: number }[], color: string) {
    if (points.length < 3) return;
    const ctx = this.shadowCtx;
    const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    let maxDistX = 0, maxDistY = 0;

    for (const p of points) {
      const distX = Math.abs(p.x - centerX);
      const distY = Math.abs(p.y - centerY);
      if (distX > maxDistX) maxDistX = distX;
      if (distY > maxDistY) maxDistY = distY;
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(maxDistX, maxDistY);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, 2 * Math.PI);
    ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ',0.3)');
    ctx.fill();
    ctx.strokeStyle = color.replace('rgb', 'rgba').replace(')', ',0.8)');
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private colorize() {
    const img = this.shadowCtx.getImageData(0, 0, this.width, this.height);
    const data = img.data;

    for (let i = 3; i < data.length; i += 4) {
      const alpha = data[i];
      const offset = Math.min(255, alpha) * 4;
      if (offset >= 0 && offset < this.gradient.length) {
        data[i - 3] = this.gradient[offset];
        data[i - 2] = this.gradient[offset + 1];
        data[i - 1] = this.gradient[offset + 2];
        data[i] = this.config.maxOpacity ? this.config.maxOpacity * 255 : alpha;
      }
    }

    this.ctx.putImageData(img, 0, 0);
  }

  private valueToColor(value: number): string {
    const min = 10, max = 5000;
    const clamped = Math.min(Math.max(value, min), max);
    const t = (clamped - min) / (max - min);
    const r = Math.round(255 * t);
    const g = Math.round(255 * (1 - t));
    const b = Math.round(255 * (1 - t));
    return `rgb(${r},${g},${b})`;
  }

  private clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.shadowCtx.clearRect(0, 0, this.width, this.height);
  }

  public setData(data: HeatmapCanvasPoint[]) {
    this.data = data;
    this.draw();
  }

  public addData(points: HeatmapCanvasPoint[]) {
    this.data.push(...points);
    this.draw();
  }

  public draw() {
    this.clear();
    for (const point of this.data) {
      this.drawPoint(point);
    }
    this.colorize();
  }

  public get renderer() {
    return { canvas: this.canvas };
  }

  private sampleEllipseBoundaryPointsENU(
    lon: number,
    lat: number,
    radius: number,
    numPoints = 256,
    ellipsoid = Ellipsoid.WGS84,
  ): { lon: number; lat: number }[] {
    const centerCartographic = Cartographic.fromDegrees(lon, lat);
    const centerCartesian = ellipsoid.cartographicToCartesian(centerCartographic);
    const enuTransform = Transforms.eastNorthUpToFixedFrame(centerCartesian);
    const result: { lon: number; lat: number }[] = [];

    for (let i = 0; i < numPoints; i++) {
      const theta = (2 * Math.PI * i) / numPoints;
      const x = radius * Math.cos(theta);
      const y = radius * Math.sin(theta);
      const localOffset = new Cartesian3(x, y, 0);
      const worldOffset = Matrix4.multiplyByPointAsVector(enuTransform, localOffset, new Cartesian3());
      const pointCartesian = Cartesian3.add(centerCartesian, worldOffset, new Cartesian3());
      const carto = ellipsoid.cartesianToCartographic(pointCartesian);
      result.push({
        lon: CesiumMath.toDegrees(carto.longitude),
        lat: CesiumMath.toDegrees(carto.latitude),
      });
    }

    return result;
  }

  static create(config: HeatmapConfig): Heatmap {
    return new Heatmap(config);
  }
}
