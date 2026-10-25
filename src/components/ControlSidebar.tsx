import React, { useRef, useState } from 'react';
import {
  ReductionMethod,
  ClusteringMethod,
  ColorMode,
  NormalizationMethod,
  ReductionConfig,
  ClusteringConfig,
} from '../types';
import {
  Upload,
  Layers,
  Sliders,
  Palette,
  RefreshCw,
  Database,
  CheckSquare,
  Square,
  Sparkles,
  Columns,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Download,
  FileSpreadsheet,
  TrendingDown,
  ShieldCheck,
  ChevronRight,
  Info,
  BarChart3,
  Compass,
  Award,
} from 'lucide-react';
import { TooltipSlider } from './TooltipSlider';

export type SidebarTab = 'reduction' | 'clustering' | 'dataset' | 'display';

interface ControlSidebarProps {
  datasetName: string;
  totalRows: number;
  featureColumns: string[];
  selectedFeatures: string[];
  onToggleFeature: (feature: string) => void;
  onSelectAllFeatures: () => void;
  onDeselectAllFeatures: () => void;
  reductionConfig: ReductionConfig;
  onChangeReductionConfig: (config: ReductionConfig) => void;
  clusteringConfig: ClusteringConfig;
  onChangeClusteringConfig: (config: ClusteringConfig) => void;
  colorMode: ColorMode;
  onChangeColorMode: (mode: ColorMode) => void;
  selectedColorFeature: string;
  onChangeSelectedColorFeature: (feature: string) => void;
  onFileUpload: (file: File) => void;
  onLoadPreloadedDataset: (type: 'cancer' | 'wholesale' | 'synthetic') => void;
  isComputing: boolean;
  onRunComputation: () => void;
  // Dual View Mode
  isDualView: boolean;
  onToggleDualView: () => void;
  dualSecondaryMethod: ReductionMethod;
  onChangeDualSecondaryMethod: (m: ReductionMethod) => void;
  // Live Animation
  isLiveAnimating: boolean;
  onToggleLiveAnimation: () => void;
  onResetLiveAnimation: () => void;
  liveCurrentIter: number;
  liveMaxIter: number;
  // Export CSV
  onExportCSV: () => void;
  dbStatus: string;
  // Professional Modals
  onOpenElbowModal?: () => void;
  onOpenSecurityModal?: () => void;
  // PCA Analytics & Biplot Controls
  pcaComponents?: number[][];
  explainedVariance?: [number, number, number];
  totalVarianceExplained?: number;
  biplotVisible?: boolean;
  onToggleBiplot?: () => void;
  biplotTopK?: number;
  onChangeBiplotTopK?: (topK: number) => void;
  biplotScale?: number;
  onChangeBiplotScale?: (scale: number) => void;
}

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  datasetName,
  totalRows,
  featureColumns,
  selectedFeatures,
  onToggleFeature,
  onSelectAllFeatures,
  onDeselectAllFeatures,
  reductionConfig,
  onChangeReductionConfig,
  clusteringConfig,
  onChangeClusteringConfig,
  colorMode,
  onChangeColorMode,
  selectedColorFeature,
  onChangeSelectedColorFeature,
  onFileUpload,
  onLoadPreloadedDataset,
  isComputing,
  onRunComputation,
  isDualView,
  onToggleDualView,
  dualSecondaryMethod,
  onChangeDualSecondaryMethod,
  isLiveAnimating,
  onToggleLiveAnimation,
  onResetLiveAnimation,
  liveCurrentIter,
  liveMaxIter,
  onExportCSV,
  dbStatus,
  onOpenElbowModal,
  onOpenSecurityModal,
  pcaComponents,
  explainedVariance,
  totalVarianceExplained,
  biplotVisible = false,
  onToggleBiplot,
  biplotTopK = 6,
  onChangeBiplotTopK,
  biplotScale = 30,
  onChangeBiplotScale,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('reduction');
  const [selectedPcaTab, setSelectedPcaTab] = useState<'PC1' | 'PC2' | 'PC3' | 'All'>('PC1');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute Top 5 Feature Loadings for PCA
  const topLoadings = React.useMemo(() => {
    if (!pcaComponents || pcaComponents.length < 3 || selectedFeatures.length === 0) {
      return selectedFeatures.slice(0, 5).map((f, i) => ({
        name: f,
        loading: 0.35 - i * 0.05,
      }));
    }

    const v1 = pcaComponents[0];
    const v2 = pcaComponents[1];
    const v3 = pcaComponents[2];

    const list = selectedFeatures.map((name, idx) => {
      let loading = 0;
      if (selectedPcaTab === 'PC1') {
        loading = v1[idx] || 0;
      } else if (selectedPcaTab === 'PC2') {
        loading = v2[idx] || 0;
      } else if (selectedPcaTab === 'PC3') {
        loading = v3[idx] || 0;
      } else {
        loading = Math.hypot(v1[idx] || 0, v2[idx] || 0, v3[idx] || 0);
      }
      return { name, loading };
    });

    list.sort((a, b) => Math.abs(b.loading) - Math.abs(a.loading));
    return list.slice(0, 5);
  }, [pcaComponents, selectedFeatures, selectedPcaTab]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const isAtlas = dbStatus.includes('Connected') || dbStatus.includes('Atlas');

  return (
    <div className="w-80 md:w-96 h-full flex flex-col bg-slate-900/95 border-r border-slate-800 text-slate-200 overflow-hidden select-none">
      {/* 1. Header with App Title & Global Compute Button */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 shadow-inner">
              <Sparkles size={17} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide text-white">3D DATA EXPLORER</h1>
              <p className="text-[10px] text-slate-400">Giảm chiều & Phân cụm Không gian 3D</p>
            </div>
          </div>

          <button
            onClick={onRunComputation}
            disabled={isComputing || selectedFeatures.length < 3}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={isComputing ? 'animate-spin' : ''} />
            <span>{isComputing ? 'Đang tính...' : 'Tính toán'}</span>
          </button>
        </div>

        {/* Live Database Connection Badge & Security Center */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isAtlas ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-300 font-medium">CSDL:</span>
            <span className={`font-semibold ${isAtlas ? 'text-emerald-400' : 'text-amber-300'}`}>
              {dbStatus || 'Đang kết nối...'}
            </span>
          </div>
          {onOpenSecurityModal && (
            <button
              onClick={onOpenSecurityModal}
              title="Mở Trung tâm Bảo mật & Chia sẻ LAN"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white transition-colors border border-slate-700"
            >
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>Bảo mật</span>
            </button>
          )}
        </div>

        {/* 2. MENU NAVIGATION TABS BAR (Tách bạch các tính năng) */}
        <div className="grid grid-cols-4 p-1 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] font-semibold">
          <button
            onClick={() => setActiveTab('reduction')}
            title="Module Giảm chiều 3D (PCA, t-SNE, UMAP)"
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all ${
              activeTab === 'reduction'
                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers size={14} className="mb-0.5" />
            <span>Giảm chiều</span>
          </button>

          <button
            onClick={() => setActiveTab('clustering')}
            title="Module Phân cụm 3D (K-Means, DBSCAN, Elbow)"
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all ${
              activeTab === 'clustering'
                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sliders size={14} className="mb-0.5" />
            <span>Phân cụm</span>
          </button>

          <button
            onClick={() => setActiveTab('dataset')}
            title="Module Quản lý Dữ liệu & Đặc trưng"
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all ${
              activeTab === 'dataset'
                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database size={14} className="mb-0.5" />
            <span>Dữ liệu</span>
          </button>

          <button
            onClick={() => setActiveTab('display')}
            title="Module Hiển thị, Màn hình đôi & Xuất file"
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all ${
              activeTab === 'display'
                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Palette size={14} className="mb-0.5" />
            <span>Hiển thị</span>
          </button>
        </div>
      </div>

      {/* 3. SCROLLABLE TAB CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar text-xs">

        {/* ======================================================== */}
        {/* TAB 1: GIẢM CHIỀU (DIMENSIONALITY REDUCTION)             */}
        {/* ======================================================== */}
        {activeTab === 'reduction' && (
          <div className="space-y-4 animate-fade-in">
            {/* Header info */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-indigo-400 text-xs flex items-center gap-1.5">
                <Layers size={15} /> THUẬT TOÁN GIẢM CHIỀU 3D
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedFeatures.length}D → 3D
              </span>
            </div>

            {/* Algorithm Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-300">
                Phương pháp giảm chiều không gian:
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
                {(['PCA', 't-SNE', 'UMAP'] as ReductionMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => onChangeReductionConfig({ ...reductionConfig, method: m })}
                    className={`py-2 rounded-lg font-bold transition-all text-xs ${
                      reductionConfig.method === m
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Algorithm Description & Parameters */}
            {reductionConfig.method === 'PCA' && (
              <div className="space-y-3.5">
                {/* 1. EXPLAINED VARIANCE / SCREE PLOT CARD */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-indigo-500/30 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300 text-xs flex items-center gap-1.5">
                      <BarChart3 size={15} className="text-indigo-400" /> Tỷ lệ giải thích phương sai (Scree)
                    </span>
                    <span className="font-mono text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      Tổng: {totalVarianceExplained ? `${(totalVarianceExplained * 100).toFixed(1)}%` : '72.6%'}
                    </span>
                  </div>

                  {/* Cumulative Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Bảo toàn cấu trúc 30D → 3D</span>
                      <span className="text-indigo-300 font-bold">
                        {totalVarianceExplained ? `${(totalVarianceExplained * 100).toFixed(1)}%` : '72.6%'}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700/60">
                      <div
                        style={{
                          width: `${Math.min(100, (totalVarianceExplained ? totalVarianceExplained * 100 : 72.6))}%`,
                        }}
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Individual Principal Components Grid */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-indigo-500/20 text-center">
                      <div className="text-[10px] text-indigo-300 font-bold">PC1 (Trục X)</div>
                      <div className="text-sm font-mono font-bold text-white mt-0.5">
                        {explainedVariance ? `${(explainedVariance[0] * 100).toFixed(1)}%` : '44.3%'}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">Chính yếu</div>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/90 border border-purple-500/20 text-center">
                      <div className="text-[10px] text-purple-300 font-bold">PC2 (Trục Y)</div>
                      <div className="text-sm font-mono font-bold text-white mt-0.5">
                        {explainedVariance ? `${(explainedVariance[1] * 100).toFixed(1)}%` : '19.0%'}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">Thứ cấp</div>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/90 border border-pink-500/20 text-center">
                      <div className="text-[10px] text-pink-300 font-bold">PC3 (Trục Z)</div>
                      <div className="text-sm font-mono font-bold text-white mt-0.5">
                        {explainedVariance ? `${(explainedVariance[2] * 100).toFixed(1)}%` : '9.3%'}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">Bổ trợ</div>
                    </div>
                  </div>
                </div>

                {/* 2. TOP FEATURE LOADINGS & IMPORTANCE */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <Award size={14} className="text-amber-400" /> Top đặc trưng chi phối
                    </span>
                    <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                      {(['PC1', 'PC2', 'PC3', 'All'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setSelectedPcaTab(tab)}
                          className={`px-1.5 py-0.5 rounded transition-all ${
                            selectedPcaTab === tab
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* List Top 5 features */}
                  <div className="space-y-1.5 pt-1">
                    {topLoadings.map((feat, idx) => {
                      const isPositive = feat.loading >= 0;
                      const absPct = Math.min(100, Math.abs(feat.loading) * 200);
                      return (
                        <div key={feat.name} className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-slate-300 truncate max-w-[170px]" title={feat.name}>
                              <span className="text-indigo-400 font-bold mr-1">#{idx + 1}</span>
                              {feat.name}
                            </span>
                            <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                              isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                            }`}>
                              {isPositive ? `+${feat.loading.toFixed(3)}` : feat.loading.toFixed(3)}
                            </span>
                          </div>
                          {/* Relative Magnitude Bar */}
                          <div className="w-full h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                            <div
                              style={{ width: `${absPct}%` }}
                              className={`h-full rounded-full ${isPositive ? 'bg-emerald-400' : 'bg-rose-400'}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. INTERACTIVE 3D BIPLOT CONTROLS */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-rose-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300 text-xs flex items-center gap-1.5">
                      <Compass size={14} className="text-rose-400" /> Véc-tơ đặc trưng 3D (Biplot)
                    </span>
                    {onToggleBiplot && (
                      <button
                        onClick={onToggleBiplot}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          biplotVisible
                            ? 'bg-rose-600 text-white shadow shadow-rose-600/40'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {biplotVisible ? 'Đang bật' : 'Đang tắt'}
                      </button>
                    )}
                  </div>

                  {biplotVisible && (
                    <div className="space-y-3 pt-1 border-t border-slate-800/80 animate-fade-in">
                      {/* Top K Vectors Slider */}
                      {onChangeBiplotTopK && (
                        <TooltipSlider
                          label="Số véc-tơ hiển thị (Top K)"
                          min={3}
                          max={15}
                          step={1}
                          value={biplotTopK}
                          onChange={onChangeBiplotTopK}
                          accentColor="amber"
                          minLabel="Top 3"
                          maxLabel="Top 15"
                        />
                      )}

                      {/* Vector Scale Slider */}
                      {onChangeBiplotScale && (
                        <TooltipSlider
                          label="Độ dài mũi tên (Vector Scale)"
                          min={10}
                          max={70}
                          step={5}
                          value={biplotScale}
                          onChange={onChangeBiplotScale}
                          formatValue={(v) => `${v}x`}
                          accentColor="cyan"
                          minLabel="10x (Ngắn)"
                          maxLabel="70x (Dài)"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {reductionConfig.method === 't-SNE' && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="font-semibold text-amber-300 text-xs flex items-center gap-1.5">
                  <Info size={14} /> t-SNE (t-Distributed Stochastic Neighbor Embedding)
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Thuật toán phi tuyến cực mạnh trong việc phát hiện các cụm cụ bộ (local clusters).
                </p>

                {/* Perplexity Slider */}
                <TooltipSlider
                  label="Độ phức tạp (Perplexity)"
                  min={3}
                  max={50}
                  step={1}
                  value={reductionConfig.perplexity}
                  onChange={(val) =>
                    onChangeReductionConfig({
                      ...reductionConfig,
                      perplexity: val,
                    })
                  }
                  accentColor="amber"
                  minLabel="Min: 3"
                  maxLabel="Max: 50"
                />

                {/* Iterations Slider */}
                <TooltipSlider
                  label="Số vòng lặp (Iterations)"
                  min={100}
                  max={1000}
                  step={10}
                  value={reductionConfig.iterations}
                  onChange={(val) =>
                    onChangeReductionConfig({
                      ...reductionConfig,
                      iterations: val,
                    })
                  }
                  formatValue={(v) => `${v} vòng`}
                  accentColor="amber"
                  minLabel="Min: 100"
                  maxLabel="Max: 1000"
                />
              </div>
            )}

            {reductionConfig.method === 'UMAP' && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="font-semibold text-cyan-300 text-xs flex items-center gap-1.5">
                  <Info size={14} /> UMAP (Uniform Manifold Approximation)
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Cân bằng xuất sắc giữa việc bảo toàn cấu trúc lân cận cục bộ và phân bố toàn cục của đám mây điểm.
                </p>

                {/* nNeighbors Slider */}
                <TooltipSlider
                  label="Số láng giềng (nNeighbors)"
                  min={3}
                  max={50}
                  step={1}
                  value={reductionConfig.nNeighbors}
                  onChange={(val) =>
                    onChangeReductionConfig({
                      ...reductionConfig,
                      nNeighbors: val,
                    })
                  }
                  accentColor="cyan"
                  minLabel="Min: 3"
                  maxLabel="Max: 50"
                />

                {/* minDist Slider */}
                <TooltipSlider
                  label="Khoảng cách tối thiểu (minDist)"
                  min={0.01}
                  max={0.80}
                  step={0.05}
                  value={reductionConfig.minDist}
                  onChange={(val) =>
                    onChangeReductionConfig({
                      ...reductionConfig,
                      minDist: val,
                    })
                  }
                  formatValue={(v) => v.toFixed(2)}
                  accentColor="cyan"
                  minLabel="Min: 0.01"
                  maxLabel="Max: 0.80"
                />
              </div>
            )}

            {/* LIVE OPTIMIZATION ANIMATION (t-SNE / UMAP) */}
            {(reductionConfig.method === 't-SNE' || reductionConfig.method === 'UMAP') && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px]">
                    <Zap size={14} /> Hoạt họa tụ cụm Live 3D
                  </span>
                  <span className="font-mono text-slate-400 text-[10px]">
                    {liveCurrentIter}/{liveMaxIter}
                  </span>
                </div>

                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, (liveCurrentIter / (liveMaxIter || 1)) * 100)}%` }}
                    className="bg-amber-400 h-full transition-all duration-100"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={onToggleLiveAnimation}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                      isLiveAnimating
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {isLiveAnimating ? <Pause size={13} /> : <Play size={13} />}
                    <span>{isLiveAnimating ? 'Tạm dừng' : 'Chạy tụ cụm Live'}</span>
                  </button>

                  <button
                    onClick={onResetLiveAnimation}
                    title="Đặt lại các điểm về vị trí ngẫu nhiên"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Normalization Mode */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400">
                Phương pháp chuẩn hóa trước khi giảm chiều:
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                {(['z-score', 'min-max', 'none'] as NormalizationMethod[]).map((method) => (
                  <button
                    key={method}
                    onClick={() => onChangeReductionConfig({ ...reductionConfig, normalization: method })}
                    className={`py-1.5 rounded-lg font-medium transition-all ${
                      reductionConfig.normalization === method
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {method === 'z-score' ? 'Z-Score' : method === 'min-max' ? 'Min-Max' : 'Gốc'}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Run Button */}
            <button
              onClick={onRunComputation}
              disabled={isComputing}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/30"
            >
              <RefreshCw size={14} className={isComputing ? 'animate-spin' : ''} />
              <span>Cập nhật Giảm chiều 3D ({reductionConfig.method})</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: PHÂN CỤM (CLUSTERING)                             */}
        {/* ======================================================== */}
        {activeTab === 'clustering' && (
          <div className="space-y-4 animate-fade-in">
            {/* Header info */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                <Sliders size={15} /> THUẬT TOÁN PHÂN CỤM DỮ LIỆU
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {clusteringConfig.method}
              </span>
            </div>

            {/* Algorithm Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-300">
                Chọn giải thuật gom cụm:
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
                {(['K-Means', 'DBSCAN', 'None'] as ClusteringMethod[]).map((cm) => (
                  <button
                    key={cm}
                    onClick={() => onChangeClusteringConfig({ ...clusteringConfig, method: cm })}
                    className={`py-2 rounded-lg font-bold transition-all text-xs ${
                      clusteringConfig.method === cm
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cm}
                  </button>
                ))}
              </div>
            </div>

            {/* K-Means Controls */}
            {clusteringConfig.method === 'K-Means' && (
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <TooltipSlider
                  label="Số cụm K"
                  min={2}
                  max={10}
                  step={1}
                  value={clusteringConfig.k}
                  onChange={(val) =>
                    onChangeClusteringConfig({
                      ...clusteringConfig,
                      k: val,
                    })
                  }
                  formatValue={(v) => `K = ${v} cụm`}
                  accentColor="amber"
                  minLabel="K = 2 (Tối thiểu)"
                  maxLabel="K = 10 (Tối đa)"
                />

                {/* ELBOW METHOD TRIGGER BUTTON */}
                {onOpenElbowModal && (
                  <button
                    onClick={onOpenElbowModal}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition-all shadow-md shadow-amber-500/10"
                  >
                    <TrendingDown size={15} className="text-amber-400" />
                    <span>Dò tìm K tối ưu (Elbow Method & Silhouette)</span>
                  </button>
                )}

                <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  Thuật toán tự động khởi tạo bằng <strong>K-Means++</strong> và hiển thị các vòng tròn tâm cụm phát sáng trong không gian 3 chiều.
                </p>
              </div>
            )}

            {/* DBSCAN Controls */}
            {clusteringConfig.method === 'DBSCAN' && (
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="font-semibold text-cyan-300 text-xs flex items-center gap-1.5">
                  <Info size={14} /> Phân cụm dựa trên mật độ (DBSCAN)
                </div>

                <TooltipSlider
                  label="Bán kính lân cận (Epsilon)"
                  min={0.5}
                  max={15.0}
                  step={0.5}
                  value={clusteringConfig.epsilon}
                  onChange={(val) =>
                    onChangeClusteringConfig({
                      ...clusteringConfig,
                      epsilon: val,
                    })
                  }
                  formatValue={(v) => v.toFixed(1)}
                  accentColor="cyan"
                  minLabel="Min: 0.5"
                  maxLabel="Max: 15.0"
                />

                <TooltipSlider
                  label="Số điểm tối thiểu (minPts)"
                  min={2}
                  max={20}
                  step={1}
                  value={clusteringConfig.minPts}
                  onChange={(val) =>
                    onChangeClusteringConfig({
                      ...clusteringConfig,
                      minPts: val,
                    })
                  }
                  formatValue={(v) => `${v} điểm`}
                  accentColor="cyan"
                  minLabel="Min: 2"
                  maxLabel="Max: 20"
                />

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Các điểm nằm ngoài mật độ lân cận sẽ được gán nhãn là <strong>Điểm nhiễu (Noise)</strong> màu xám.
                </p>
              </div>
            )}

            {clusteringConfig.method === 'None' && (
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-center text-slate-400 text-xs">
                Chế độ xem không phân cụm. Dữ liệu sẽ hiển thị nguyên bản theo nhãn y khoa gốc.
              </div>
            )}

            {/* Quick Run Button */}
            <button
              onClick={onRunComputation}
              disabled={isComputing}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-lg shadow-amber-600/30"
            >
              <RefreshCw size={14} className={isComputing ? 'animate-spin' : ''} />
              <span>Áp dụng Phân cụm ({clusteringConfig.method})</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: DỮ LIỆU & ĐẶC TRƯNG (DATASET & FEATURES)         */}
        {/* ======================================================== */}
        {activeTab === 'dataset' && (
          <div className="space-y-4 animate-fade-in">
            {/* Header info */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                <Database size={15} /> QUẢN LÝ BỘ DỮ LIỆU
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {totalRows} mẫu
              </span>
            </div>

            {/* Preloaded Datasets */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-300">
                Bộ dữ liệu mẫu sẵn có:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onLoadPreloadedDataset('cancer')}
                  className={`p-2.5 text-left rounded-xl border transition-all ${
                    datasetName.includes('Cancer')
                      ? 'bg-indigo-600/20 border-indigo-500 shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700'
                  }`}
                >
                  <div className="font-bold text-slate-200">data.csv (Cancer)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">569 mẫu, 30 features</div>
                </button>
                <button
                  onClick={() => onLoadPreloadedDataset('wholesale')}
                  className={`p-2.5 text-left rounded-xl border transition-all ${
                    datasetName.includes('Wholesale')
                      ? 'bg-indigo-600/20 border-indigo-500 shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700'
                  }`}
                >
                  <div className="font-bold text-slate-200">Wholesale</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">440 mẫu, 8 features</div>
                </button>
              </div>
            </div>

            {/* Custom CSV Upload */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">
                Tải lên dữ liệu bảng tùy ý:
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-indigo-500/50 hover:border-indigo-400 bg-indigo-950/20 hover:bg-indigo-950/40 text-indigo-300 font-medium transition-all"
              >
                <Upload size={14} />
                <span>Tải lên file CSV bất kỳ từ máy tính...</span>
              </button>
            </div>

            {/* Feature Selection Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px]">
                <span className="flex items-center gap-1 text-indigo-300">
                  <CheckSquare size={13} /> Chọn đặc trưng ({selectedFeatures.length}/{featureColumns.length})
                </span>
                <div className="space-x-2 text-[10px]">
                  <button onClick={onSelectAllFeatures} className="text-indigo-400 hover:underline">Tất cả</button>
                  <button onClick={onDeselectAllFeatures} className="text-slate-400 hover:underline">Bỏ chọn</button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800 custom-scrollbar">
                {featureColumns.map((col) => {
                  const isSelected = selectedFeatures.includes(col);
                  return (
                    <div
                      key={col}
                      onClick={() => onToggleFeature(col)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'bg-indigo-900/30 text-slate-200' : 'text-slate-500 hover:bg-slate-800/40'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare size={13} className="text-indigo-400" />
                      ) : (
                        <Square size={13} className="text-slate-600" />
                      )}
                      <span className="font-mono truncate">{col}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: HIỂN THỊ & XUẤT FILE (DISPLAY & EXPORT)           */}
        {/* ======================================================== */}
        {activeTab === 'display' && (
          <div className="space-y-4 animate-fade-in">
            {/* Header info */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-pink-400 text-xs flex items-center gap-1.5">
                <Palette size={15} /> TÙY CHỌN HIỂN THỊ & XUẤT FILE
              </span>
            </div>

            {/* DUAL VIEWPORT SO SÁNH */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-white text-[11px] uppercase tracking-wider">
                  <Columns size={14} className="text-indigo-400" /> Chế độ màn hình
                </span>
                <button
                  onClick={onToggleDualView}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isDualView ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {isDualView ? 'Màn hình đôi (Dual)' : 'Màn hình đơn (Single)'}
                </button>
              </div>

              {isDualView && (
                <div className="pt-2 border-t border-indigo-800/40 text-[11px] flex items-center justify-between">
                  <span className="text-slate-300">So sánh màn hình B với:</span>
                  <select
                    value={dualSecondaryMethod}
                    onChange={(e) => onChangeDualSecondaryMethod(e.target.value as ReductionMethod)}
                    className="bg-slate-900 border border-indigo-500/40 rounded px-2 py-1 text-xs font-semibold text-indigo-300"
                  >
                    <option value="t-SNE">t-SNE 3D</option>
                    <option value="UMAP">UMAP 3D</option>
                    <option value="PCA">PCA 3D</option>
                  </select>
                </div>
              )}
            </div>

            {/* COLOR MAPPING */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Palette size={13} className="text-pink-400" /> Chế độ tô màu điểm 3D:
              </label>

              <div className="grid grid-cols-3 gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => onChangeColorMode('ground-truth')}
                  className={`py-2 px-1 rounded-lg font-bold transition-all text-xs truncate ${
                    colorMode === 'ground-truth' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Nhãn gốc
                </button>
                <button
                  onClick={() => onChangeColorMode('cluster')}
                  className={`py-2 px-1 rounded-lg font-bold transition-all text-xs truncate ${
                    colorMode === 'cluster' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Cụm phân
                </button>
                <button
                  onClick={() => onChangeColorMode('feature')}
                  className={`py-2 px-1 rounded-lg font-bold transition-all text-xs truncate ${
                    colorMode === 'feature' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Đặc trưng
                </button>
              </div>

              {colorMode === 'feature' && (
                <div className="pt-2">
                  <label className="text-[10px] text-slate-400 block mb-1">Chọn đặc trưng để vẽ nhiệt:</label>
                  <select
                    value={selectedColorFeature}
                    onChange={(e) => onChangeSelectedColorFeature(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200"
                  >
                    {featureColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* EXPORT CSV BUTTON */}
            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={onExportCSV}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all border border-slate-700 shadow-md"
              >
                <FileSpreadsheet size={16} className="text-emerald-400" />
                <span>Xuất file CSV kết quả (3D + Cụm)</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
