import express from 'express';
import cors from 'cors';
import compression from 'compression';
import multer from 'multer';
import Papa from 'papaparse';
import crypto from 'crypto';
import {
  initDatabase,
  getAllDatasets,
  getDatasetById,
  saveDataset,
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Force test connection to MongoDB
app.post('/api/test-db', async (req, res) => {
  try {
    const result = await testDbConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ connected: false, message: err.message });
  }
});

// 6. Clear Compute Cache Endpoint
app.delete('/api/cache', async (req, res) => {
  try {
    const cleared = await clearComputeCache();
    res.json({ success: true, message: `Đã xóa ${cleared} bản ghi cache thành công!`, clearedCount: cleared });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Get list of datasets
app.get('/api/datasets', async (req, res) => {
  try {
    const list = await getAllDatasets();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Get single dataset detail
app.get('/api/datasets/:id', async (req, res) => {
  try {
    const data = await getDatasetById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Không tìm thấy dataset' });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Upload and parse new dataset to MongoDB
app.post('/api/datasets/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng đính kèm file CSV!' });
    }

    const csvString = req.file.buffer.toString('utf-8');
    const parsed = Papa.parse<Record<string, any>>(csvString.trim(), {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    const rows = parsed.data;
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'File CSV rỗng hoặc sai định dạng!' });
    }

    const headers = Object.keys(rows[0] || {}).map(h => h.trim());
    let idCol: string | null = null;
    let labelCol: string | null = null;
    const featureCols: string[] = [];

    for (const col of headers) {
      const lower = col.toLowerCase();
      if (!idCol && (lower === 'id' || lower.endsWith('_id') || lower === 'index')) {
        idCol = col;
        continue;
      }
      const val = rows[0][col];
      if (typeof val === 'number') {
        featureCols.push(col);
      } else if (!labelCol) {
        labelCol = col;
      }
    }

    const datasetId = 'dataset_' + Date.now();
    const datasetName = req.file.originalname.replace('.csv', '');

    const newDataset = {
      id: datasetId,
      name: datasetName,
      filename: req.file.originalname,
      totalRows: rows.length,
      features: featureCols,
      labelColumn: labelCol,
      idColumn: idCol,
      rawRows: rows,
    };

    await saveDataset(newDataset);
    res.json(newDataset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. High-Performance Compute API with SHA-256 Multi-Tier Caching (LRU + MongoDB)
app.post('/api/compute', async (req, res) => {
  try {
    const { matrix, groundTruth, reductionConfig, clusteringConfig } = req.body;

    if (!matrix || matrix.length === 0) {
      return res.status(400).json({ error: 'Ma trận đặc trưng không hợp lệ' });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 11. Experiments History in MongoDB
app.get('/api/experiments', async (req, res) => {
  try {
    const list = await getAllExperiments();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/experiments', async (req, res) => {
  try {
    const { datasetId, datasetName, reductionMethod, clusteringMethod, k, silhouetteScore, ari, params } = req.body;

    const id = await saveExperiment({
      datasetId,
      datasetName,
      reductionMethod,
      clusteringMethod,
      k,
      silhouetteScore,
      ari,
      params: params || {},
    });

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Global Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 [Server Error]:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
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
