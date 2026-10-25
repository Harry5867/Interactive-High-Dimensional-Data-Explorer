import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import Papa from 'papaparse';
import {
  ParsedDataset,
  DataPoint,
  ReductionConfig,
  ClusteringConfig,
  ColorMode,
  EvaluationMetrics,
  ReductionMethod,
} from './types';
import { parseCSVString, extractFeatureMatrix } from './utils/dataParser';
import { computePCA } from './algorithms/pca';
import { computeTSNE } from './algorithms/tsne';
import { computeUMAP } from './algorithms/umap';
import { computeKMeans } from './algorithms/kmeans';
import { computeDBSCAN } from './algorithms/dbscan';
import { computeSilhouetteScore, computeARI } from './algorithms/metrics';
import { initLiveTSNE, stepLiveTSNE, LiveTSNEState } from './algorithms/liveOptimization';
import { ThreeCanvas } from './components/ThreeCanvas';
import { ControlSidebar } from './components/ControlSidebar';
import { MetricsPanel } from './components/MetricsPanel';
import { DataInspector } from './components/DataInspector';
import { ExperimentsModal, ExperimentRecord } from './components/ExperimentsModal';
import { ElbowModal } from './components/ElbowModal';
import { SecurityModal } from './components/SecurityModal';

export function App() {
  const [dataset, setDataset] = useState<ParsedDataset | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<DataPoint | null>(null);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [dbStatus, setDbStatus] = useState<string>('Đang kiểm tra...');

  // Elbow Modal, Security Modal & PCA Biplot State
  const [isElbowModalOpen, setIsElbowModalOpen] = useState<boolean>(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);
  const [pcaComponents, setPcaComponents] = useState<number[][] | undefined>(undefined);
  const [featureMatrix, setFeatureMatrix] = useState<number[][]>([]);
  const [biplotVisible, setBiplotVisible] = useState<boolean>(false);
  const [biplotTopK, setBiplotTopK] = useState<number>(6);
  const [biplotScale, setBiplotScale] = useState<number>(30);

  // Dual Viewport State
  const [isDualView, setIsDualView] = useState<boolean>(false);
  const [dualSecondaryMethod, setDualSecondaryMethod] = useState<ReductionMethod>('t-SNE');
  const [dualDataPoints, setDualDataPoints] = useState<DataPoint[]>([]);

  // Throttled Camera Sync to prevent destroying Viewport B during orbit
  const [syncedCamPos, setSyncedCamPos] = useState<THREE.Vector3 | null>(null);
  const [syncedTargetPos, setSyncedTargetPos] = useState<THREE.Vector3 | null>(null);
  const syncRafRef = useRef<number | null>(null);

  // Live Optimization State
  const [isLiveAnimating, setIsLiveAnimating] = useState<boolean>(false);
  const [liveCurrentIter, setLiveCurrentIter] = useState<number>(0);
  const liveStateRef = useRef<LiveTSNEState | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Experiments & MongoDB Database state
  const [isExperimentsModalOpen, setIsExperimentsModalOpen] = useState(false);
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([]);
  const [isSavingExperiment, setIsSavingExperiment] = useState(false);

  const [reductionConfig, setReductionConfig] = useState<ReductionConfig>({
    method: 'PCA',
    normalization: 'z-score',
    perplexity: 30,
    learningRate: 100,
    iterations: 250,
    nNeighbors: 15,
    minDist: 0.1,
  });

  const [clusteringConfig, setClusteringConfig] = useState<ClusteringConfig>({
    method: 'K-Means',
    k: 2,
    epsilon: 3.5,
    minPts: 5,
  });

  const [colorMode, setColorMode] = useState<ColorMode>('ground-truth');
  const [selectedColorFeature, setSelectedColorFeature] = useState<string>('');

  const [metrics, setMetrics] = useState<EvaluationMetrics>({
    silhouetteScore: null,
    adjustedRandIndex: null,
    clusterCounts: {},
  });

  // Check Database connection health periodically
  useEffect(() => {
    const checkDbHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setDbStatus(data.database || 'Online');
        }
      } catch (e) {
        setDbStatus('In-Memory Mode');
      }
    };
    checkDbHealth();
    const interval = setInterval(checkDbHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // 1. Initial Load: Fetch from Backend MongoDB API or fallback
  const loadInitialDataset = useCallback(async () => {
    try {
      setIsComputing(true);
      setLoadingMessage('Đang nạp dữ liệu từ MongoDB...');
      
      const res = await fetch('/api/datasets');
      if (res.ok) {
        const datasetsList = await res.json();
        if (datasetsList.length > 0) {
          const firstId = datasetsList[0].id;
          const detailRes = await fetch(`/api/datasets/${firstId}`);
          if (detailRes.ok) {
            const data = await detailRes.json();
            const parsed: ParsedDataset = {
              name: data.name,
              totalRows: data.totalRows,
              headers: Object.keys(data.rawRows[0] || {}),
              idColumn: data.idColumn,
              labelColumn: data.labelColumn,
              featureColumns: data.features,
              rawRows: data.rawRows,
            };
            setDataset(parsed);
            setSelectedFeatures(parsed.featureColumns);
            if (parsed.featureColumns.length > 0) {
              setSelectedColorFeature(parsed.featureColumns[0]);
            }
            return;
          }
        }
      }

      // Fallback
      const staticRes = await fetch('/data.csv');
      const text = await staticRes.text();
      const parsed = parseCSVString(text, 'Wisconsin Breast Cancer');
      setDataset(parsed);
      setSelectedFeatures(parsed.featureColumns);
      if (parsed.featureColumns.length > 0) {
        setSelectedColorFeature(parsed.featureColumns[0]);
      }
    } catch (err: any) {
      console.warn('Lỗi kết nối API, dùng fallback local:', err);
      const staticRes = await fetch('/data.csv');
      const text = await staticRes.text();
      const parsed = parseCSVString(text, 'Wisconsin Breast Cancer');
      setDataset(parsed);
      setSelectedFeatures(parsed.featureColumns);
      if (parsed.featureColumns.length > 0) {
        setSelectedColorFeature(parsed.featureColumns[0]);
      }
    } finally {
      setIsComputing(false);
      setLoadingMessage('');
    }
  }, []);

  useEffect(() => {
    loadInitialDataset();
  }, [loadInitialDataset]);

  // 2. Upload file directly to Backend MongoDB
  const handleFileUpload = async (file: File) => {
    try {
      setIsComputing(true);
      setLoadingMessage('Đang tải file lên Backend & lưu vào MongoDB...');

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/datasets/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const parsed: ParsedDataset = {
          name: data.name,
          totalRows: data.totalRows,
          headers: Object.keys(data.rawRows[0] || {}),
          idColumn: data.idColumn,
          labelColumn: data.labelColumn,
          featureColumns: data.features,
          rawRows: data.rawRows,
        };
        setDataset(parsed);
        setSelectedFeatures(parsed.featureColumns);
        if (parsed.featureColumns.length > 0) {
          setSelectedColorFeature(parsed.featureColumns[0]);
        }
      } else {
        const text = await file.text();
        const parsed = parseCSVString(text, file.name);
        setDataset(parsed);
        setSelectedFeatures(parsed.featureColumns);
        if (parsed.featureColumns.length > 0) {
          setSelectedColorFeature(parsed.featureColumns[0]);
        }
      }
    } catch (err: any) {
      alert('Lỗi tải file: ' + err.message);
    } finally {
      setIsComputing(false);
      setLoadingMessage('');
    }
  };

  const handleLoadPreloaded = async (type: 'cancer' | 'wholesale' | 'synthetic') => {
    if (type === 'cancer') {
      loadInitialDataset();
    } else if (type === 'wholesale') {
      try {
        setIsComputing(true);
        setLoadingMessage('Đang nạp dữ liệu Wholesale...');
        const res = await fetch('/wholesale.csv');
        const text = await res.text();
        const parsed = parseCSVString(text, 'Wholesale Customers');
        setDataset(parsed);
        setSelectedFeatures(parsed.featureColumns);
        if (parsed.featureColumns.length > 0) {
          setSelectedColorFeature(parsed.featureColumns[0]);
        }
      } finally {
        setIsComputing(false);
        setLoadingMessage('');
      }
    }
  };

  const handleToggleFeature = (col: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(col) ? prev.filter((f) => f !== col) : [...prev, col]
    );
  };

  const handleSelectAllFeatures = () => {
    if (dataset) setSelectedFeatures(dataset.featureColumns);
  };

  const handleDeselectAllFeatures = () => {
    setSelectedFeatures([]);
  };

  const computeCoordinates = (matrix: number[][], method: ReductionMethod) => {
    if (method === 'PCA') {
      return computePCA(matrix);
    } else if (method === 't-SNE') {
      const coords = computeTSNE(matrix, {
        perplexity: reductionConfig.perplexity,
        learningRate: reductionConfig.learningRate,
        iterations: reductionConfig.iterations,
      });
      return { coordinates: coords };
    } else {
      const coords = computeUMAP(matrix, {
        nNeighbors: reductionConfig.nNeighbors,
        minDist: reductionConfig.minDist,
      });
      return { coordinates: coords };
    }
  };

  // 3. Pipeline Calculation: Can execute via Backend API or locally
  const runPipeline = useCallback(async () => {
    if (!dataset || selectedFeatures.length < 3) return;

    setIsComputing(true);
    setLoadingMessage('Đang tính toán giảm chiều & phân cụm 3D...');

    await new Promise((r) => setTimeout(r, 40));

    try {
      const matrix = extractFeatureMatrix(
        dataset.rawRows,
        selectedFeatures,
        reductionConfig.normalization
      );
      setFeatureMatrix(matrix);

      const groundTruth = dataset.labelColumn
        ? dataset.rawRows.map((r) => r[dataset.labelColumn!])
        : [];

      let coordinates: [number, number, number][] = [];
      let clusterAssignments: number[] = [];
      let sil: number | null = null;
      let ari: number | null = null;
      let expVar: [number, number, number] | undefined = undefined;
      let totalExpVar: number | undefined = undefined;
      let clusterCounts: Record<number, number> = {};
      let noiseCount = 0;
      let wasFromBackend = false;

      // 1. Try Backend Compute API first (with SHA-256 Multi-Tier Caching & Gzip)
      try {
        const computeRes = await fetch('/api/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matrix,
            groundTruth,
            reductionConfig,
            clusteringConfig,
          }),
        });

        if (computeRes.ok) {
          const computeData = await computeRes.json();
          coordinates = computeData.coordinates;
          clusterAssignments = computeData.clusterAssignments;
          sil = computeData.silhouetteScore;
          ari = computeData.adjustedRandIndex;
          expVar = computeData.explainedVariance;
          totalExpVar = computeData.totalExplainedVariance;
          clusterCounts = computeData.clusterCounts || {};
          noiseCount = computeData.noiseCount || 0;
          if (computeData.components) {
            setPcaComponents(computeData.components);
          } else {
            setPcaComponents(undefined);
          }
          wasFromBackend = true;
        }
      } catch (err) {
        // Fallback gracefully to client-side compute
      }

      // 2. Client-Side Fallback if Backend is unreachable
      if (!wasFromBackend) {
        const primaryRes = computeCoordinates(matrix, reductionConfig.method);
        coordinates = primaryRes.coordinates;

        if (reductionConfig.method === 'PCA' && (primaryRes as any).components) {
          setPcaComponents((primaryRes as any).components);
        } else {
          setPcaComponents(undefined);
        }

        if (clusteringConfig.method === 'K-Means') {
          const kRes = computeKMeans(coordinates, clusteringConfig.k);
          clusterAssignments = kRes.clusters;
        } else if (clusteringConfig.method === 'DBSCAN') {
          const dbRes = computeDBSCAN(coordinates, clusteringConfig.epsilon, clusteringConfig.minPts);
          clusterAssignments = dbRes.clusters;
          noiseCount = dbRes.noiseCount;
        } else {
          clusterAssignments = new Array(coordinates.length).fill(0);
        }

        sil = computeSilhouetteScore(coordinates, clusterAssignments);
        ari = dataset.labelColumn ? computeARI(groundTruth, clusterAssignments) : null;

        for (const c of clusterAssignments) {
          if (c >= 0) clusterCounts[c] = (clusterCounts[c] || 0) + 1;
        }

        expVar = (primaryRes as any).explainedVariance;
        totalExpVar = (primaryRes as any).totalExplainedVariance;
      }

      setMetrics({
        silhouetteScore: sil,
        adjustedRandIndex: ari,
        explainedVariance: expVar,
        totalVarianceExplained: totalExpVar,
        clusterCounts,
        noiseCount,
      });

      // Assemble Primary DataPoints
      const points: DataPoint[] = dataset.rawRows.map((row, idx) => {
        const id = dataset.idColumn ? row[dataset.idColumn] : idx + 1;
        const label = dataset.labelColumn ? row[dataset.labelColumn] : undefined;

        const originalFeatures: Record<string, number> = {};
        for (const col of dataset.featureColumns) {
          originalFeatures[col] = Number(row[col]);
        }

        const coord = coordinates[idx] || [0, 0, 0];

        return {
          id,
          originalFeatures,
          label,
          x: coord[0],
          y: coord[1],
          z: coord[2],
          cluster: clusterAssignments[idx] ?? 0,
        };
      });

      setDataPoints(points);

      // ALWAYS prepare Dual DataPoints using the secondary method
      const secMethod = dualSecondaryMethod === reductionConfig.method ? (reductionConfig.method === 'PCA' ? 't-SNE' : 'PCA') : dualSecondaryMethod;
      const secondaryRes = computeCoordinates(matrix, secMethod);
      const secCoords = secondaryRes.coordinates;

      const dualPoints: DataPoint[] = dataset.rawRows.map((row, idx) => {
        const id = dataset.idColumn ? row[dataset.idColumn] : idx + 1;
        const label = dataset.labelColumn ? row[dataset.labelColumn] : undefined;

        const originalFeatures: Record<string, number> = {};
        for (const col of dataset.featureColumns) {
          originalFeatures[col] = Number(row[col]);
        }

        const coord = secCoords[idx] || [0, 0, 0];

        return {
          id,
          originalFeatures,
          label,
          x: coord[0],
          y: coord[1],
          z: coord[2],
          cluster: clusterAssignments[idx] ?? 0,
        };
      });

      setDualDataPoints(dualPoints);
    } catch (err: any) {
      console.error(err);
      alert('Lỗi tính toán: ' + err.message);
    } finally {
      setIsComputing(false);
      setLoadingMessage('');
    }
  }, [dataset, selectedFeatures, reductionConfig, clusteringConfig, dualSecondaryMethod]);

  useEffect(() => {
    if (dataset && selectedFeatures.length >= 3) {
      runPipeline();
    }
  }, [dataset, runPipeline]);

  // 4. LIVE OPTIMIZATION ANIMATION LOOP FOR t-SNE / UMAP
  const handleToggleLiveAnimation = () => {
    if (isLiveAnimating) {
      setIsLiveAnimating(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      if (!dataset || selectedFeatures.length < 3) return;

      if (!liveStateRef.current || liveStateRef.current.isCompleted) {
        const matrix = extractFeatureMatrix(
          dataset.rawRows,
          selectedFeatures,
          reductionConfig.normalization
        );
        liveStateRef.current = initLiveTSNE(
          matrix,
          reductionConfig.perplexity,
          reductionConfig.learningRate,
          reductionConfig.iterations
        );
      }

      setIsLiveAnimating(true);
      runLiveLoop();
    }
  };

  const handleResetLiveAnimation = () => {
    setIsLiveAnimating(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (dataset && selectedFeatures.length >= 3) {
      const matrix = extractFeatureMatrix(
        dataset.rawRows,
        selectedFeatures,
        reductionConfig.normalization
      );
      const state = initLiveTSNE(
        matrix,
        reductionConfig.perplexity,
        reductionConfig.learningRate,
        reductionConfig.iterations
      );
      liveStateRef.current = state;
      setLiveCurrentIter(0);

      setDataPoints((prev) =>
        prev.map((pt, idx) => ({
          ...pt,
          x: state.Y[idx * 3] || 0,
          y: state.Y[idx * 3 + 1] || 0,
          z: state.Y[idx * 3 + 2] || 0,
        }))
      );
    }
  };

  const runLiveLoop = () => {
    const state = liveStateRef.current;
    if (!state || state.isCompleted) {
      setIsLiveAnimating(false);
      return;
    }

    const newCoords = stepLiveTSNE(state, 4);
    setLiveCurrentIter(state.currentIter);

    setDataPoints((prev) =>
      prev.map((pt, idx) => {
        const c = newCoords[idx] || [0, 0, 0];
        return {
          ...pt,
          x: c[0],
          y: c[1],
          z: c[2],
        };
      })
    );

    if (!state.isCompleted) {
      animFrameRef.current = requestAnimationFrame(runLiveLoop);
    } else {
      setIsLiveAnimating(false);
    }
  };

  // 5. Throttled Dual Viewport Camera Synchronization
  const handlePrimaryCameraChange = (camPos: THREE.Vector3, targetPos: THREE.Vector3) => {
    if (isDualView) {
      if (syncRafRef.current) return;
      syncRafRef.current = requestAnimationFrame(() => {
        setSyncedCamPos(camPos.clone());
        setSyncedTargetPos(targetPos.clone());
        syncRafRef.current = null;
      });
    }
  };

  // 6. Save Experiment to MongoDB
  const handleSaveExperiment = async () => {
    if (!dataset) return;
    try {
      setIsSavingExperiment(true);
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId: dataset.name,
          datasetName: dataset.name,
          reductionMethod: reductionConfig.method,
          clusteringMethod: clusteringConfig.method,
          k: clusteringConfig.k,
          silhouetteScore: metrics.silhouetteScore,
          ari: metrics.adjustedRandIndex,
          params: {
            reduction: reductionConfig,
            clustering: clusteringConfig,
          },
        }),
      });
      if (res.ok) {
        alert('✅ Đã lưu kết quả thí nghiệm thành công vào CSDL MongoDB!');
        fetchExperiments();
      }
    } catch (e: any) {
      alert('Không thể lưu thí nghiệm: ' + e.message);
    } finally {
      setIsSavingExperiment(false);
    }
  };

  const fetchExperiments = async () => {
    try {
      const res = await fetch('/api/experiments');
      if (res.ok) {
        const data = await res.json();
        setExperiments(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenHistory = () => {
    fetchExperiments();
    setIsExperimentsModalOpen(true);
  };

  // 7. EXPORT ENRICHED CSV WITH 3D COORDINATES & PREDICTED CLUSTERS
  const handleExportCSV = () => {
    if (!dataset || dataPoints.length === 0) return;

    try {
      const rowsToExport = dataPoints.map((pt) => {
        return {
          id: pt.id,
          label_ground_truth: pt.label ?? '',
          predicted_cluster: pt.cluster === -1 ? 'Noise' : pt.cluster,
          coord_x_3d: Number(pt.x.toFixed(4)),
          coord_y_3d: Number(pt.y.toFixed(4)),
          coord_z_3d: Number(pt.z.toFixed(4)),
          ...pt.originalFeatures,
        };
      });

      const csvContent = Papa.unparse(rowsToExport);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dataset.name.replace(/\s+/g, '_')}_3D_Clustered_Results.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Lỗi xuất file CSV: ' + e.message);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      {/* 1. Control Sidebar */}
      <ControlSidebar
        datasetName={dataset ? dataset.name : 'Đang tải...'}
        totalRows={dataset ? dataset.totalRows : 0}
        featureColumns={dataset ? dataset.featureColumns : []}
        selectedFeatures={selectedFeatures}
        onToggleFeature={handleToggleFeature}
        onSelectAllFeatures={handleSelectAllFeatures}
        onDeselectAllFeatures={handleDeselectAllFeatures}
        reductionConfig={reductionConfig}
        onChangeReductionConfig={setReductionConfig}
        clusteringConfig={clusteringConfig}
        onChangeClusteringConfig={setClusteringConfig}
        colorMode={colorMode}
        onChangeColorMode={setColorMode}
        selectedColorFeature={selectedColorFeature}
        onChangeSelectedColorFeature={setSelectedColorFeature}
        onFileUpload={handleFileUpload}
        onLoadPreloadedDataset={handleLoadPreloaded}
        isComputing={isComputing}
        onRunComputation={runPipeline}
        isDualView={isDualView}
        onToggleDualView={() => setIsDualView(!isDualView)}
        dualSecondaryMethod={dualSecondaryMethod}
        onChangeDualSecondaryMethod={(m) => {
          setDualSecondaryMethod(m);
        }}
        isLiveAnimating={isLiveAnimating}
        onToggleLiveAnimation={handleToggleLiveAnimation}
        onResetLiveAnimation={handleResetLiveAnimation}
        liveCurrentIter={liveCurrentIter}
        liveMaxIter={reductionConfig.iterations}
        onExportCSV={handleExportCSV}
        dbStatus={dbStatus}
        onOpenElbowModal={() => setIsElbowModalOpen(true)}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        pcaComponents={pcaComponents}
        explainedVariance={metrics.explainedVariance}
        totalVarianceExplained={metrics.totalVarianceExplained}
        biplotVisible={biplotVisible}
        onToggleBiplot={() => setBiplotVisible(!biplotVisible)}
        biplotTopK={biplotTopK}
        onChangeBiplotTopK={setBiplotTopK}
        biplotScale={biplotScale}
        onChangeBiplotScale={setBiplotScale}
      />

      {/* 2. Main 3D Viewport Area */}
      <div className="flex-1 relative flex flex-col h-full overflow-hidden">
        {/* Single vs Dual Viewport Rendering */}
        <div className="flex-1 w-full h-full flex">
          {/* Viewport 1 (Primary) */}
          <div className="flex-1 h-full relative">
            <ThreeCanvas
              dataPoints={dataPoints}
              colorMode={colorMode}
              selectedFeature={selectedColorFeature}
              onSelectPoint={setSelectedPoint}
              selectedPoint={selectedPoint}
              reductionMethod={reductionConfig.method}
              onCameraChange={handlePrimaryCameraChange}
              titleBadge={isDualView ? `MÀN HÌNH A: ${reductionConfig.method} 3D` : undefined}
              pcaComponents={pcaComponents}
              featureNames={selectedFeatures}
              showBiplot={biplotVisible}
              onToggleBiplot={() => setBiplotVisible(!biplotVisible)}
              biplotTopK={biplotTopK}
              biplotScale={biplotScale}
            />
          </div>

          {/* Viewport 2 (Dual Secondary with Camera Synchronization) */}
          {isDualView && (
            <div className="flex-1 h-full relative border-l-2 border-indigo-600/50">
              <ThreeCanvas
                dataPoints={dualDataPoints.length > 0 ? dualDataPoints : dataPoints}
                colorMode={colorMode}
                selectedFeature={selectedColorFeature}
                onSelectPoint={setSelectedPoint}
                selectedPoint={selectedPoint}
                reductionMethod={dualSecondaryMethod}
                syncCameraPos={syncedCamPos}
                syncTargetPos={syncedTargetPos}
                titleBadge={`MÀN HÌNH B: ${dualSecondaryMethod} 3D (Đồng bộ)`}
              />
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {isComputing && (
          <div className="absolute inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <div className="text-sm font-semibold tracking-wide text-indigo-300">
              {loadingMessage || 'Đang xử lý tính toán...'}
            </div>
          </div>
        )}

        {/* Selected Data Point Inspector */}
        <DataInspector
          point={selectedPoint}
          onClose={() => setSelectedPoint(null)}
        />

        {/* Bottom Floating Compact Metrics Panel */}
        <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
          <MetricsPanel
            metrics={metrics}
            reductionMethod={reductionConfig.method}
            hasGroundTruth={Boolean(dataset?.labelColumn)}
            onSaveExperiment={handleSaveExperiment}
            onOpenHistory={handleOpenHistory}
            isSaving={isSavingExperiment}
          />
        </div>
      </div>

      {/* Experiments History Modal */}
      <ExperimentsModal
        isOpen={isExperimentsModalOpen}
        onClose={() => setIsExperimentsModalOpen(false)}
        experiments={experiments}
        onRefresh={fetchExperiments}
      />

      {/* Elbow Method & Silhouette Analysis Modal */}
      <ElbowModal
        isOpen={isElbowModalOpen}
        onClose={() => setIsElbowModalOpen(false)}
        featureMatrix={featureMatrix.length > 0 ? featureMatrix : (dataset ? extractFeatureMatrix(dataset.rawRows, selectedFeatures, reductionConfig.normalization) : [])}
        currentK={clusteringConfig.k}
        onApplyK={(k) => {
          setClusteringConfig((prev) => ({ ...prev, k }));
          setTimeout(() => runPipeline(), 60);
        }}
      />

      {/* Security Center & LAN Sharing Modal */}
      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        dbStatus={dbStatus}
        onRefreshDb={async () => {
          try {
            const res = await fetch('/api/health');
            if (res.ok) {
              const data = await res.json();
              setDbStatus(data.database || 'Online');
            }
          } catch (e) {
            setDbStatus('In-Memory Mode');
          }
        }}
      />
    </div>
  );
}

export default App;
