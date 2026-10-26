import express from 'express';
import cors from 'cors';
import compression from 'compression';
import multer from 'multer';
import crypto from 'crypto';
import { parseCSVString } from '../src/utils/dataParser';
import {
  ClusteringConfig,
  DatasetDocument,
  JsonValue,
  ReductionConfig,
} from '../src/types';
import {
  initDatabase,
  getAllDatasets,
  getDatasetById,
  saveDataset,
  updateDataset,
  deleteDataset,
  getAllExperiments,
  saveExperiment,
  isMongoConnected,
  testDbConnection,
  getComputeCache,
  saveComputeCache,
  clearComputeCache,
  getSystemHealth,
} from './db';
import { computePCA } from '../src/algorithms/pca';
import { computeTSNE } from '../src/algorithms/tsne';
import { computeUMAP } from '../src/algorithms/umap';
import { computeKMeans } from '../src/algorithms/kmeans';
import { computeDBSCAN } from '../src/algorithms/dbscan';
import { computeSilhouetteScore, computeARI } from '../src/algorithms/metrics';

const app = express();
const PORT = process.env.PORT || 5000;

// 1. High-Performance Middlewares: Gzip Compression & Security CORS
app.use(compression({
  threshold: 1024, // Only compress responses > 1KB
  level: 6,
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// 2. Structured Request Timing & Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') {
      console.log(`📡 [HTTP] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

const upload = multer({ storage: multer.memoryStorage() });

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumberMatrix(value: unknown): value is number[][] {
  return Array.isArray(value)
    && value.length > 0
    && value.every((row) => Array.isArray(row)
      && row.length > 0
      && row.every((item) => typeof item === 'number' && Number.isFinite(item)));
}

function isReductionConfig(value: unknown): value is ReductionConfig {
  if (!isRecord(value)) return false;
  return (value.method === 'PCA' || value.method === 't-SNE' || value.method === 'UMAP')
    && (value.normalization === 'z-score' || value.normalization === 'min-max' || value.normalization === 'none')
    && typeof value.perplexity === 'number'
    && typeof value.learningRate === 'number'
    && typeof value.iterations === 'number'
    && typeof value.nNeighbors === 'number'
    && typeof value.minDist === 'number';
}

function isClusteringConfig(value: unknown): value is ClusteringConfig {
  if (!isRecord(value)) return false;
  return (value.method === 'K-Means' || value.method === 'DBSCAN' || value.method === 'None')
    && typeof value.k === 'number'
    && typeof value.epsilon === 'number'
    && typeof value.minPts === 'number';
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

// 3. Health check & DB status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isMongoConnected ? 'MongoDB Atlas (Cloud)' : 'In-Memory (Ready for MongoDB)',
    timestamp: new Date().toISOString(),
  });
});

// 4. Detailed Enterprise System Health & RAM Monitoring
app.get('/api/system-health', async (req, res) => {
  try {
    const health = await getSystemHealth();
    res.json(health);
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

// 5. Force test connection to MongoDB
app.post('/api/test-db', async (req, res) => {
  try {
    const result = await testDbConnection();
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ connected: false, message: errorMessage(err) });
  }
});

// 6. Clear Compute Cache Endpoint
app.delete('/api/cache', async (req, res) => {
  try {
    const cleared = await clearComputeCache();
    res.json({ success: true, message: `Đã xóa ${cleared} bản ghi cache thành công!`, clearedCount: cleared });
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

// 7. Get list of datasets
app.get('/api/datasets', async (req, res) => {
  try {
    const list = await getAllDatasets();
    res.json(list);
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

// 8. Get single dataset detail
app.get('/api/datasets/:id', async (req, res) => {
  try {
    const data = await getDatasetById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Không tìm thấy dataset' });
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

// 9. Upload and parse new dataset to MongoDB
app.post('/api/datasets/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng đính kèm file CSV!' });
    }

    const csvString = req.file.buffer.toString('utf-8');
    const parsed = parseCSVString(csvString, req.file.originalname);
    const newDataset: DatasetDocument = {
      id: `dataset_${Date.now()}`,
      name: req.file.originalname.replace(/\.csv$/i, ''),
      filename: req.file.originalname,
      totalRows: parsed.totalRows,
      features: parsed.featureColumns,
      labelColumn: parsed.labelColumn,
      idColumn: parsed.idColumn,
      rawRows: parsed.rawRows,
      createdAt: new Date().toISOString(),
    };

    await saveDataset(newDataset);
    res.json(newDataset);
  } catch (err: unknown) {
    res.status(400).json({ error: errorMessage(err) });
  }
});

// 10. Update dataset name / metadata
app.patch('/api/datasets/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Tên bộ dữ liệu không hợp lệ.' });
    }
    const updated = await updateDataset(req.params.id, { name: name.trim() });
    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy bộ dữ liệu để cập nhật.' });
    }
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

// 11. Delete dataset
app.delete('/api/datasets/:id', async (req, res) => {
  try {
    const success = await deleteDataset(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Không tìm thấy bộ dữ liệu để xóa.' });
    }
    res.json({ success: true, message: 'Đã xóa bộ dữ liệu thành công.' });
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

// 12. High-Performance Compute API with SHA-256 Multi-Tier Caching (LRU + MongoDB)
app.post('/api/compute', async (req, res) => {
  try {
    const body: unknown = req.body;
    if (!isRecord(body)
      || !isNumberMatrix(body.matrix)
      || !Array.isArray(body.groundTruth)
      || !isReductionConfig(body.reductionConfig)
      || !isClusteringConfig(body.clusteringConfig)) {
      return res.status(400).json({ error: 'Tham số tính toán không hợp lệ.' });
    }
    const { matrix, groundTruth, reductionConfig, clusteringConfig } = body;
    if (!groundTruth.every((value) => value === null
      || typeof value === 'string'
      || typeof value === 'number'
      || typeof value === 'boolean')) {
      return res.status(400).json({ error: 'Nhãn dữ liệu không hợp lệ.' });
    }

    // Generate Deterministic Cache Key (Fingerprint of Data & Parameters)
    const cacheKey = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          rows: matrix.length,
          cols: matrix[0]?.length || 0,
          head: matrix[0]?.slice(0, 6),
          mid: matrix[Math.floor(matrix.length / 2)]?.slice(0, 6),
          reduction: reductionConfig,
          clustering: clusteringConfig,
        })
      )
      .digest('hex');

    // Check Multi-Tier Cache first (Sub-millisecond hit)
    const cachedResult = await getComputeCache(cacheKey);
    if (cachedResult) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Key', cacheKey);
      return res.json({
        ...cachedResult,
        fromCache: true,
        computeTimeMs: 0,
      });
    }

    const startTime = Date.now();

    // Step A: Dimensionality Reduction
    let coordinates: [number, number, number][] = [];
    let explainedVariance: [number, number, number] | undefined;
    let totalExplainedVariance: number | undefined;
    let components: number[][] | undefined;

    if (reductionConfig.method === 'PCA') {
      const pcaRes = computePCA(matrix);
      coordinates = pcaRes.coordinates;
      explainedVariance = pcaRes.explainedVariance;
      totalExplainedVariance = pcaRes.totalExplainedVariance;
      components = pcaRes.components;
    } else if (reductionConfig.method === 't-SNE') {
      coordinates = computeTSNE(matrix, {
        perplexity: reductionConfig.perplexity || 30,
        learningRate: reductionConfig.learningRate || 100,
        iterations: reductionConfig.iterations || 250,
      });
    } else if (reductionConfig.method === 'UMAP') {
      coordinates = computeUMAP(matrix, {
        nNeighbors: reductionConfig.nNeighbors || 15,
        minDist: reductionConfig.minDist || 0.1,
      });
    }

    // Step B: Clustering
    let clusterAssignments: number[] = [];
    let noiseCount = 0;

    if (clusteringConfig.method === 'K-Means') {
      const kmeansRes = computeKMeans(coordinates, clusteringConfig.k || 2);
      clusterAssignments = kmeansRes.clusters;
    } else if (clusteringConfig.method === 'DBSCAN') {
      const dbscanRes = computeDBSCAN(
        coordinates,
        clusteringConfig.epsilon || 3.5,
        clusteringConfig.minPts || 5
      );
      clusterAssignments = dbscanRes.clusters;
      noiseCount = dbscanRes.noiseCount;
    } else {
      clusterAssignments = new Array(coordinates.length).fill(0);
    }

    // Step C: Metrics Evaluation
    const silhouette = computeSilhouetteScore(coordinates, clusterAssignments);
    let ari: number | null = null;
    if (groundTruth && groundTruth.length === clusterAssignments.length) {
      ari = computeARI(groundTruth, clusterAssignments);
    }

    const clusterCounts: Record<number, number> = {};
    for (const c of clusterAssignments) {
      if (c >= 0) clusterCounts[c] = (clusterCounts[c] || 0) + 1;
    }

    const computeTimeMs = Date.now() - startTime;

    const resultPayload = {
      coordinates,
      clusterAssignments,
      silhouetteScore: silhouette,
      adjustedRandIndex: ari,
      explainedVariance,
      totalExplainedVariance,
      components,
      clusterCounts,
      noiseCount,
    };

    // Asynchronously write to Cache (Non-blocking response)
    saveComputeCache(cacheKey, resultPayload).catch(console.error);

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Cache-Key', cacheKey);
    res.json({
      ...resultPayload,
      fromCache: false,
      computeTimeMs,
    });
  } catch (error: unknown) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

// 11. Experiments History in MongoDB
app.get('/api/experiments', async (req, res) => {
  try {
    const list = await getAllExperiments();
    res.json(list);
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

app.post('/api/experiments', async (req, res) => {
  try {
    const body: unknown = req.body;
    if (!isRecord(body)
      || typeof body.datasetId !== 'string'
      || typeof body.datasetName !== 'string'
      || typeof body.reductionMethod !== 'string'
      || typeof body.clusteringMethod !== 'string'
      || typeof body.k !== 'number'
      || !(typeof body.silhouetteScore === 'number' || body.silhouetteScore === null)
      || !(typeof body.ari === 'number' || body.ari === null)
      || (body.params !== undefined && !isJsonValue(body.params))) {
      return res.status(400).json({ error: 'Thông tin thí nghiệm không hợp lệ.' });
    }

    const id = await saveExperiment({
      datasetId: body.datasetId,
      datasetName: body.datasetName,
      reductionMethod: body.reductionMethod,
      clusteringMethod: body.clusteringMethod,
      k: body.k,
      silhouetteScore: body.silhouetteScore,
      ari: body.ari,
      params: isRecord(body.params) && isJsonValue(body.params) ? body.params : {},
    });

    res.json({ success: true, id });
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

// 12. Global Error Handling Middleware
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  console.error('💥 [Server Error]:', err);
  const message = errorMessage(err);
  res.status(500).json({
    success: false,
    error: message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  });
});

// 13. Initialize Database & Graceful Start
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 [Fullstack Backend] Running on http://localhost:${PORT}`);
      console.log(`⚡ [Performance Middleware] Gzip Compression Enabled`);
      console.log(`🧠 [Compute Caching] Multi-tier SHA-256 LRU + MongoDB Cache Active`);
    });
  })
  .catch(console.error);

// Graceful Shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 [Server] Đang đóng ứng dụng an toàn...');
  process.exit(0);
});
