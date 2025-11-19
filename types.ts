export enum QCMode {
  ALIGNMENT = 'ALIGNMENT',
  TIMEGRAPHER = 'TIMEGRAPHER'
}

export interface TimegrapherMetrics {
  rate: number; // seconds per day
  amplitude: number; // degrees
  beatError: number; // ms
  liftAngle?: number; // degrees, optional
  analysis: string; // AI generated summary
}

export interface AlignmentAnalysis {
  verdict: 'Excellent' | 'Acceptable' | 'Reject';
  issues: string[];
  summary: string;
}

export interface OverlayConfig {
  type: 'indices' | 'grid' | 'crosshair';
  color: string;
  rotation: number; // degrees
  scale: number; // percentage
  offsetX: number; // pixels
  offsetY: number; // pixels
}

export interface ImageState {
  rotation: number;
  scale: number;
  x: number;
  y: number;
}