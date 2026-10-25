export type ReductionMethod = 'PCA' | 't-SNE' | 'UMAP';
export type ClusteringMethod = 'K-Means' | 'DBSCAN' | 'None';
export type ColorMode = 'ground-truth' | 'cluster' | 'feature';
export type NormalizationMethod = 'z-score' | 'min-max' | 'none';

export interface DataPoint {
  id: string | number;
  originalFeatures: Record<string, number>;
  label?: string | number;
  // 3D coordinates after reduction
  x: number;
  y: number;
  z: number;
  // Assigned cluster (-1 for noise in DBSCAN)
  cluster: number;
}

export interface ParsedDataset {
  name: string;
  totalRows: number;
  headers: string[];
  idColumn: string | null;
  labelColumn: string | null;
  featureColumns: string[];
  rawRows: Record<string, any>[];
}

export interface ReductionConfig {
  method: ReductionMethod;
  normalization: NormalizationMethod;
  // t-SNE parameters
  perplexity: number;
  learningRate: number;
  iterations: number;
  // UMAP parameters
  nNeighbors: number;
  minDist: number;
}

export interface ClusteringConfig {
  method: ClusteringMethod;
  // K-Means
  k: number;
  // DBSCAN
  epsilon: number;
  minPts: number;
}

export interface EvaluationMetrics {
  silhouetteScore: number | null;
  adjustedRandIndex: number | null;
  explainedVariance?: [number, number, number]; // For PCA [PC1, PC2, PC3]
  totalVarianceExplained?: number;
  clusterCounts: Record<number, number>;
  noiseCount?: number;
}
