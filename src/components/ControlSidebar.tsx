import React, { useEffect, useRef, useState } from 'react';
import {
  ReductionMethod,
  ClusteringMethod,
  ColorMode,
  NormalizationMethod,
  ReductionConfig,
  ClusteringConfig,
  DatasetRow,
  DataValue,
  MIN_NUMERIC_FEATURES,
  DatasetSummary,
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
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Pencil,
  Trash2,
  Sun,
  Moon,
  Check,
  X,
  FolderOpen,
} from 'lucide-react';
import { TooltipSlider } from './TooltipSlider';

export type SidebarTab = 'reduction' | 'clustering' | 'dataset' | 'display';

interface ControlSidebarProps {
  datasetName: string;
  totalRows: number;
  rawRows: DatasetRow[];
  headers: string[];
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
  hasResults: boolean;
  onActiveTabChange: (tab: SidebarTab) => void;
  onRunComputation: () => void;
  onApplyClustering: () => void;
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
  // Dataset Management Props
  datasetList?: DatasetSummary[];
  activeDatasetId?: string;
  onSelectDataset?: (id: string) => void;
  onRenameDataset?: (id: string, newName: string) => void;
  onDeleteDataset?: (id: string) => void;
  onOpenRawDataModal?: () => void;
  onOpenDatasetManager?: () => void;
  // Theme support
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  datasetName,
  totalRows,
  rawRows,
  headers,
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
  hasResults,
  onActiveTabChange,
  onRunComputation,
  onApplyClustering,
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
  datasetList = [],
  activeDatasetId = '',
  onSelectDataset,
  onRenameDataset,
  onDeleteDataset,
  onOpenRawDataModal,
  onOpenDatasetManager,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('dataset');
  const [selectedPcaTab, setSelectedPcaTab] = useState<'PC1' | 'PC2' | 'PC3' | 'All'>('PC1');
  const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLight = theme === 'light';

  const handleSaveRename = (id: string) => {
    if (editingName.trim() && onRenameDataset) {
      onRenameDataset(id, editingName.trim());
    }
    setEditingDatasetId(null);
  };

  const preloadedDatasets = React.useMemo(() => {
    const list = datasetList.filter((d) => d.is_preloaded);
    if (list.length > 0) return list;
    return [
      { id: 'cancer_wdbc', name: 'Wisconsin Breast Cancer', filename: 'data.csv', total_rows: 569, features_count: 30, is_preloaded: true, label_column: 'diagnosis', id_column: 'id', created_at: '' },
      { id: 'wholesale_customers', name: 'Wholesale Customers', filename: 'wholesale.csv', total_rows: 440, features_count: 7, is_preloaded: true, label_column: 'Channel', id_column: null, created_at: '' },
    ];
  }, [datasetList]);

  const customDatasets = React.useMemo(() => {
    return datasetList.filter((d) => !d.is_preloaded);
  }, [datasetList]);

  useEffect(() => {
    onActiveTabChange(activeTab);
  }, [activeTab, onActiveTabChange]);

  // Compute Top 5 Feature Loadings for PCA
  const topLoadings = React.useMemo(() => {
    if (!pcaComponents || pcaComponents.length < 3 || selectedFeatures.length === 0) {
      return [];
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
      e.target.value = '';
    }
  };

  const isAtlas = dbStatus.includes('Connected') || dbStatus.includes('Atlas');
  const tabGuidance: Record<SidebarTab, string> = {
    dataset: 'Chọn bộ dữ liệu và ít nhất 3 đặc trưng số để phân tích.',
    reduction: 'Thiết lập phép chiếu 3D độc lập (PCA, t-SNE hoặc UMAP) và chuẩn hóa dữ liệu.',
    clustering: 'Thiết lập thuật toán phân cụm riêng. Bạn có thể cấu hình mục này trước hoặc sau khi chọn phép chiếu.',
    display: 'Khám phá biểu đồ, so sánh hai phép chiếu và xuất kết quả.',
  };
  const tabLabels: Record<SidebarTab, string> = {
    dataset: 'Dữ liệu',
    reduction: 'Giảm chiều',
    clustering: 'Phân cụm',
    display: 'Hiển thị',
  };
  const canOpenReduction = selectedFeatures.length >= MIN_NUMERIC_FEATURES && !isComputing;
  const canOpenClustering = selectedFeatures.length >= MIN_NUMERIC_FEATURES && !isComputing;
  const handleTabChange = (value: string) => {
    if (value === 'dataset') setActiveTab('dataset');
    else if (value === 'reduction' && canOpenReduction) setActiveTab('reduction');
    else if (value === 'clustering' && canOpenClustering) setActiveTab('clustering');
    else if (value === 'display' && hasResults && !isComputing) setActiveTab('display');
  };
  if (isCollapsed) {
    return (
      <aside className={`flex h-full w-14 shrink-0 flex-col items-center gap-3 border-r py-3 transition-colors ${
        isLight ? 'border-slate-200 bg-white/95 text-slate-800' : 'border-slate-800 bg-slate-900/95 text-slate-200'
      }`}>
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          aria-label="Mở rộng bảng điều khiển"
          title="Mở rộng bảng điều khiển"
          className={`rounded-lg border p-2 transition-colors ${
            isLight ? 'border-slate-300 bg-slate-100 text-indigo-600 hover:bg-slate-200' : 'border-slate-700 bg-slate-950 text-indigo-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <PanelLeftOpen size={18} />
        </button>
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isLight ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
            title={isLight ? 'Giao diện tối' : 'Giao diện sáng'}
            className={`rounded-lg border p-2 transition-colors ${
              isLight ? 'border-slate-300 bg-slate-100 text-amber-600 hover:bg-slate-200' : 'border-slate-700 bg-slate-950 text-amber-400 hover:bg-slate-800 hover:text-amber-300'
            }`}
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        )}
        <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" title={datasetName} />
        <span className={`text-[10px] font-mono [writing-mode:vertical-rl] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          {totalRows.toLocaleString('vi-VN')} mẫu
        </span>
      </aside>
    );
  }

  return (
    <aside className={`relative z-30 flex h-full w-72 shrink-0 flex-col overflow-hidden border-r select-none transition-[width] duration-200 md:w-80 ${
      isLight ? 'border-slate-200 bg-white text-slate-800' : 'border-slate-800 bg-slate-900/95 text-slate-200'
    }`}>
      {/* 1. Header with App Title */}
      <div className={`p-3.5 border-b space-y-2.5 ${
        isLight ? 'border-slate-200 bg-slate-50/90' : 'border-slate-800 bg-slate-950/60'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl border shadow-inner ${
              isLight ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-indigo-600/30 text-indigo-400 border-indigo-500/30'
            }`}>
              <Sparkles size={17} />
            </div>
            <div>
              <h1 className={`text-sm font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>3D DATA EXPLORER</h1>
              <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Giảm chiều & Phân cụm Không gian 3D</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={isLight ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
                title={isLight ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
                className={`rounded-lg p-1.5 transition-colors ${
                  isLight ? 'text-amber-600 hover:bg-slate-200 hover:text-amber-700' : 'text-amber-400 hover:bg-slate-800 hover:text-amber-300'
                }`}
              >
                {isLight ? <Moon size={16} /> : <Sun size={16} />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              aria-label="Thu gọn bảng điều khiển"
              title="Thu gọn để mở rộng biểu đồ"
              className={`rounded-lg p-1.5 transition-colors ${
                isLight ? 'text-slate-500 hover:bg-slate-200 hover:text-slate-800' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <PanelLeftClose size={16} />
            </button>
          </div>
        </div>

        {/* Live Database Connection Badge & Security Center */}
        <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] ${
          isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950/80 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isAtlas ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className={`font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>CSDL:</span>
            <span className={`font-semibold ${isAtlas ? (isLight ? 'text-emerald-700' : 'text-emerald-400') : (isLight ? 'text-amber-700' : 'text-amber-300')}`}>
              {dbStatus || 'Đang kết nối...'}
            </span>
          </div>
          {onOpenSecurityModal && (
            <button
              onClick={onOpenSecurityModal}
              title="Mở Trung tâm Bảo mật & Chia sẻ LAN"
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors border ${
                isLight ? 'bg-white hover:bg-slate-50 text-indigo-700 border-slate-300 shadow-xs' : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border-slate-700'
              }`}
            >
              <ShieldCheck size={12} className={isLight ? 'text-emerald-600' : 'text-emerald-400'} />
              <span>Bảo mật</span>
            </button>
          )}
        </div>

        {/* Independent feature selector */}
        <div className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 ${
          isLight ? 'border-slate-200 bg-slate-100' : 'border-slate-800 bg-slate-950/90'
        }`}>
          <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
            isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-500/15 text-indigo-300'
          }`}>
            Khu vực
          </span>
          <label className="sr-only" htmlFor="feature-area">Chọn chức năng</label>
          <select
            id="feature-area"
            value={activeTab}
            onChange={(event) => handleTabChange(event.target.value)}
            className={`min-w-0 flex-1 cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none transition-colors focus:ring-2 ${
              isLight ? 'border-slate-300 bg-white text-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20' : 'border-slate-700 bg-slate-900 text-slate-100 focus:border-indigo-400 focus:ring-indigo-500/30'
            }`}
          >
            <option value="dataset">Dữ liệu</option>
            <option value="reduction" disabled={!canOpenReduction}>Giảm chiều (PCA / t-SNE / UMAP)</option>
            <option value="clustering" disabled={!canOpenClustering}>Phân cụm</option>
            <option value="display" disabled={!hasResults || isComputing}>Hiển thị & xuất dữ liệu</option>
          </select>
        </div>
      </div>

      {/* 3. SCROLLABLE TAB CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-xs">
        <div className={`rounded-2xl border px-4 py-3.5 shadow-sm ${
          isLight ? 'border-indigo-200 bg-indigo-50/70 text-slate-800' : 'border-indigo-500/25 bg-gradient-to-br from-indigo-950/50 to-slate-950/40 text-slate-100 shadow-indigo-950/30'
        }`}>
          <p className={`mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
            isLight ? 'text-indigo-700' : 'text-indigo-300'
          }`}>
            {tabLabels[activeTab]}
          </p>
          <p className={`text-[13px] font-semibold leading-relaxed ${
            isLight ? 'text-slate-800' : 'text-slate-100'
          }`}>{tabGuidance[activeTab]}</p>
          <p className={`mt-2 truncate text-[10px] ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`} title={datasetName}>
            Hiện tại: {datasetName} · {totalRows.toLocaleString('vi-VN')} mẫu · {selectedFeatures.length} đặc trưng
          </p>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: GIẢM CHIỀU (DIMENSIONALITY REDUCTION)             */}
        {/* ======================================================== */}
        {activeTab === 'reduction' && (
          <div className="space-y-5 animate-fade-in">
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
              <label className={`text-[11px] font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Phương pháp giảm chiều không gian:
              </label>
              <div className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/70 border-slate-800'
              }`}>
                {(['PCA', 't-SNE', 'UMAP'] as ReductionMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => onChangeReductionConfig({ ...reductionConfig, method: m })}
                    className={`py-2 rounded-lg font-bold transition-all text-xs ${
                      reductionConfig.method === m
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : isLight
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
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
              <details className={`rounded-xl border p-3 ${
                isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/40'
              }`}>
                <summary className={`cursor-pointer list-none text-xs font-semibold marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 ${
                  isLight ? 'text-indigo-900' : 'text-indigo-200'
                }`}>
                  <span className="flex items-center justify-between gap-2">
                    <span>Phân tích PCA & đặc trưng</span>
                    <span className={`font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>
                      {totalVarianceExplained !== undefined ? `${(totalVarianceExplained * 100).toFixed(1)}%` : 'Chưa chạy'}
                    </span>
                  </span>
                </summary>
                <div className="space-y-3.5 pt-3">
                {/* 1. EXPLAINED VARIANCE / SCREE PLOT CARD */}
                <div className={`p-3.5 rounded-xl border space-y-3 ${
                  isLight ? 'bg-white border-indigo-200 shadow-sm' : 'bg-slate-950/70 border-indigo-500/30 shadow-lg'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-xs flex items-center gap-1.5 ${
                      isLight ? 'text-indigo-700' : 'text-indigo-300'
                    }`}>
                      <BarChart3 size={15} className="text-indigo-500" /> Tỷ lệ giải thích phương sai (Scree)
                    </span>
                    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${
                      isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      Tổng: {totalVarianceExplained !== undefined ? `${(totalVarianceExplained * 100).toFixed(1)}%` : 'Chưa có kết quả'}
                    </span>
                  </div>

                  {/* Cumulative Progress Bar */}
                  <div className="space-y-1">
                    <div className={`flex justify-between text-[10px] font-mono ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      <span>Bảo toàn cấu trúc {selectedFeatures.length}D → 3D</span>
                      <span className={`font-bold ${isLight ? 'text-indigo-700' : 'text-indigo-300'}`}>
                        {totalVarianceExplained !== undefined ? `${(totalVarianceExplained * 100).toFixed(1)}%` : 'Chưa chạy'}
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden p-0.5 border ${
                      isLight ? 'bg-slate-200 border-slate-300' : 'bg-slate-800 border-slate-700/60'
                    }`}>
                      <div
                        style={{
                          width: `${Math.min(100, totalVarianceExplained !== undefined ? totalVarianceExplained * 100 : 0)}%`,
                        }}
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Individual Principal Components Grid */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <div className={`p-2 rounded-lg border text-center ${
                      isLight ? 'bg-slate-50 border-indigo-200' : 'bg-slate-900/90 border-indigo-500/20'
                    }`}>
                      <div className={`text-[10px] font-bold ${isLight ? 'text-indigo-700' : 'text-indigo-300'}`}>PC1 (Trục X)</div>
                      <div className={`text-sm font-mono font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {explainedVariance ? `${(explainedVariance[0] * 100).toFixed(1)}%` : '—'}
                      </div>
                      <div className={`text-[9px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Chính yếu</div>
                    </div>

                    <div className={`p-2 rounded-lg border text-center ${
                      isLight ? 'bg-slate-50 border-purple-200' : 'bg-slate-900/90 border-purple-500/20'
                    }`}>
                      <div className={`text-[10px] font-bold ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>PC2 (Trục Y)</div>
                      <div className={`text-sm font-mono font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {explainedVariance ? `${(explainedVariance[1] * 100).toFixed(1)}%` : '—'}
                      </div>
                      <div className={`text-[9px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Thứ cấp</div>
                    </div>

                    <div className={`p-2 rounded-lg border text-center ${
                      isLight ? 'bg-slate-50 border-pink-200' : 'bg-slate-900/90 border-pink-500/20'
                    }`}>
                      <div className={`text-[10px] font-bold ${isLight ? 'text-pink-700' : 'text-pink-300'}`}>PC3 (Trục Z)</div>
                      <div className={`text-sm font-mono font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {explainedVariance ? `${(explainedVariance[2] * 100).toFixed(1)}%` : '—'}
                      </div>
                      <div className={`text-[9px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Bổ trợ</div>
                    </div>
                  </div>
                </div>

                {/* 2. TOP FEATURE LOADINGS & IMPORTANCE */}
                <div className={`p-3.5 rounded-xl border space-y-2.5 ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      <Award size={14} className="text-amber-500" /> Top đặc trưng chi phối
                    </span>
                    <div className={`flex p-0.5 rounded-lg border text-[10px] font-mono ${
                      isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'
                    }`}>
                      {(['PC1', 'PC2', 'PC3', 'All'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setSelectedPcaTab(tab)}
                          className={`px-1.5 py-0.5 rounded transition-all ${
                            selectedPcaTab === tab
                              ? 'bg-indigo-600 text-white font-bold'
                              : isLight
                                ? 'text-slate-600 hover:text-slate-900'
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
                    {topLoadings.length === 0 && (
                      <p className="text-[11px] text-slate-500">
                        Chạy giảm chiều PCA để xem đặc trưng đóng góp.
                      </p>
                    )}
                    {topLoadings.map((feat, idx) => {
                      const isPositive = feat.loading >= 0;
                      const absPct = Math.min(100, Math.abs(feat.loading) * 200);
                      return (
                        <div key={feat.name} className={`p-1.5 rounded-lg border text-[11px] ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800/80'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-mono truncate max-w-[170px] ${
                              isLight ? 'text-slate-800' : 'text-slate-300'
                            }`} title={feat.name}>
                              <span className="text-indigo-500 font-bold mr-1">#{idx + 1}</span>
                              {feat.name}
                            </span>
                            <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                              isPositive ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'
                            }`}>
                              {isPositive ? `+${feat.loading.toFixed(3)}` : feat.loading.toFixed(3)}
                            </span>
                          </div>
                          {/* Relative Magnitude Bar */}
                          <div className={`w-full h-1 rounded-full mt-1 overflow-hidden ${
                            isLight ? 'bg-slate-200' : 'bg-slate-800'
                          }`}>
                            <div
                              style={{ width: `${absPct}%` }}
                              className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. INTERACTIVE 3D BIPLOT CONTROLS */}
                <div className={`p-3.5 rounded-xl border space-y-3 ${
                  isLight ? 'bg-white border-rose-200 shadow-sm' : 'bg-slate-950/70 border-rose-500/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-xs flex items-center gap-1.5 ${
                      isLight ? 'text-rose-700' : 'text-rose-300'
                    }`}>
                      <Compass size={14} className="text-rose-500" /> Véc-tơ đặc trưng 3D (Biplot)
                    </span>
                    {onToggleBiplot && (
                      <button
                        onClick={onToggleBiplot}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          biplotVisible
                            ? 'bg-rose-600 text-white shadow shadow-rose-600/40'
                            : isLight
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {biplotVisible ? 'Đang bật' : 'Đang tắt'}
                      </button>
                    )}
                  </div>

                  {biplotVisible && (
                    <div className={`space-y-3 pt-1 border-t animate-fade-in ${
                      isLight ? 'border-slate-200' : 'border-slate-800/80'
                    }`}>
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
                          theme={theme}
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
                          theme={theme}
                        />
                      )}
                    </div>
                  )}
                </div>
                </div>
              </details>
            )}

            {reductionConfig.method === 't-SNE' && (
              <div className={`p-3.5 rounded-xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className={`font-semibold text-xs flex items-center gap-1.5 ${
                  isLight ? 'text-amber-700' : 'text-amber-300'
                }`}>
                  <Info size={14} /> t-SNE (t-Distributed Stochastic Neighbor Embedding)
                </div>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Thuật toán phi tuyến cực mạnh trong việc phát hiện các cụm cụ bộ (local clusters).
                </p>

                <details className={`rounded-lg border p-2.5 ${
                  isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-950/50'
                }`}>
                  <summary className={`cursor-pointer text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    Tùy chỉnh tham số nâng cao
                  </summary>
                  <div className="space-y-3 pt-3">
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
                  theme={theme}
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
                  theme={theme}
                />
                  </div>
                </details>
              </div>
            )}

            {reductionConfig.method === 'UMAP' && (
              <div className={`p-3.5 rounded-xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className={`font-semibold text-xs flex items-center gap-1.5 ${
                  isLight ? 'text-cyan-700' : 'text-cyan-300'
                }`}>
                  <Info size={14} /> UMAP (Uniform Manifold Approximation)
                </div>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Cân bằng xuất sắc giữa việc bảo toàn cấu trúc lân cận cục bộ và phân bố toàn cục của đám mây điểm.
                </p>

                <details className={`rounded-lg border p-2.5 ${
                  isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-950/50'
                }`}>
                  <summary className={`cursor-pointer text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    Tùy chỉnh tham số nâng cao
                  </summary>
                  <div className="space-y-3 pt-3">
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
                  theme={theme}
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
                  theme={theme}
                />
                  </div>
                </details>
              </div>
            )}

            {/* LIVE OPTIMIZATION ANIMATION (t-SNE / UMAP) */}
            {(reductionConfig.method === 't-SNE' || reductionConfig.method === 'UMAP') && (
              <div className={`p-3 rounded-xl border space-y-2 ${
                isLight ? 'bg-slate-50 border-indigo-200' : 'bg-slate-950/80 border-indigo-500/40'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 font-bold text-[11px] ${
                    isLight ? 'text-amber-700' : 'text-amber-300'
                  }`}>
                    <Zap size={14} /> Hoạt họa tụ cụm Live 3D
                  </span>
                  <span className={`font-mono text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {liveCurrentIter}/{liveMaxIter}
                  </span>
                </div>

                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                  <div
                    style={{ width: `${Math.min(100, (liveCurrentIter / (liveMaxIter || 1)) * 100)}%` }}
                    className="bg-amber-500 h-full transition-all duration-100"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={onToggleLiveAnimation}
                    disabled={isComputing || (!hasResults && !isLiveAnimating)}
                    title={!hasResults ? 'Chạy giảm chiều t-SNE/UMAP trước để tạo biểu đồ.' : undefined}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg font-semibold text-xs transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
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
                    disabled={!hasResults || isComputing}
                    title="Đặt lại các điểm về vị trí ngẫu nhiên"
                    className={`p-1.5 rounded-lg transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                      isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Normalization Mode */}
            <div className="space-y-1.5">
              <label className={`text-[11px] font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                Chuẩn hóa dữ liệu trước khi giảm chiều:
              </label>
              <div className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}>
                {(['z-score', 'min-max', 'none'] as NormalizationMethod[]).map((method) => (
                  <button
                    key={method}
                    onClick={() => onChangeReductionConfig({ ...reductionConfig, normalization: method })}
                    className={`py-1.5 rounded-lg font-medium transition-all ${
                      reductionConfig.normalization === method
                        ? 'bg-indigo-600 text-white shadow'
                        : isLight
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
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
              <span>Chạy giảm chiều bằng {reductionConfig.method}</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: PHÂN CỤM (CLUSTERING)                             */}
        {/* ======================================================== */}
        {activeTab === 'clustering' && (
          <div className="space-y-5 animate-fade-in">
            {/* Header info */}
            <div className={`flex items-center justify-between pb-2 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <span className={`font-bold text-xs flex items-center gap-1.5 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                <Sliders size={15} /> THUẬT TOÁN PHÂN CỤM DỮ LIỆU
              </span>
              <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {clusteringConfig.method}
              </span>
            </div>

            {/* Algorithm Selector */}
            <div className="space-y-2">
              <label className={`text-[11px] font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Chọn giải thuật gom cụm:
              </label>
              <div className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/70 border-slate-800'
              }`}>
                {(['K-Means', 'DBSCAN', 'None'] as ClusteringMethod[]).map((cm) => (
                  <button
                    key={cm}
                    onClick={() => onChangeClusteringConfig({ ...clusteringConfig, method: cm })}
                    className={`py-2 rounded-lg font-bold transition-all text-xs ${
                      clusteringConfig.method === cm
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : isLight
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
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
              <div className={`p-3.5 rounded-xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}>
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
                  theme={theme}
                />

                {/* ELBOW METHOD TRIGGER BUTTON */}
                {onOpenElbowModal && (
                  <button
                    onClick={onOpenElbowModal}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all shadow-sm ${
                      isLight
                        ? 'bg-gradient-to-r from-amber-50 to-indigo-50 hover:from-amber-100 hover:to-indigo-100 text-amber-800 border-amber-300'
                        : 'bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 text-amber-300 border-amber-500/40 shadow-amber-500/10'
                    }`}
                  >
                    <TrendingDown size={15} className={isLight ? 'text-amber-600' : 'text-amber-400'} />
                    <span>Dò tìm K tối ưu (Elbow Method & Silhouette)</span>
                  </button>
                )}

                <p className={`text-[11px] leading-relaxed pt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Thuật toán tự động khởi tạo bằng <strong>K-Means++</strong> và hiển thị các vòng tròn tâm cụm phát sáng trong không gian 3 chiều.
                </p>
              </div>
            )}

            {/* DBSCAN Controls */}
            {clusteringConfig.method === 'DBSCAN' && (
              <div className={`p-3.5 rounded-xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className={`font-semibold text-xs flex items-center gap-1.5 ${
                  isLight ? 'text-cyan-700' : 'text-cyan-300'
                }`}>
                  <Info size={14} /> Phân cụm dựa trên mật độ (DBSCAN)
                </div>

                <details className={`rounded-lg border p-2.5 ${
                  isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-950/50'
                }`}>
                  <summary className={`cursor-pointer text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    Tùy chỉnh tham số nâng cao
                  </summary>
                  <div className="space-y-3 pt-3">
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
                  theme={theme}
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
                  theme={theme}
                />
                  </div>
                </details>

                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Các điểm nằm ngoài mật độ lân cận sẽ được gán nhãn là <strong>Điểm nhiễu (Noise)</strong> màu xám.
                </p>
              </div>
            )}

            {clusteringConfig.method === 'None' && (
              <div className={`p-4 rounded-xl border text-center text-xs ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950/50 border-slate-800 text-slate-400'
              }`}>
                Chế độ xem không phân cụm. Dữ liệu sẽ hiển thị nguyên bản theo nhãn phân loại gốc.
              </div>
            )}

            {/* Quick Run Button */}
            <button
              onClick={onApplyClustering}
              disabled={isComputing || !hasResults}
              title={!hasResults ? 'Chạy giảm chiều trước để tạo tọa độ 3D, sau đó mới áp dụng phân cụm.' : 'Phân cụm trên tọa độ 3D hiện tại'}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-lg shadow-amber-600/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw size={14} className={isComputing ? 'animate-spin' : ''} />
              <span>{hasResults ? `Áp dụng Phân cụm (${clusteringConfig.method})` : 'Chạy giảm chiều trước để phân cụm'}</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: DỮ LIỆU & ĐẶC TRƯNG (DATASET & FEATURES)         */}
        {/* ======================================================== */}
        {activeTab === 'dataset' && (
          <div className="space-y-5 animate-fade-in">
            {/* Header info */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                <Database size={15} /> QUẢN LÝ BỘ DỮ LIỆU
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {totalRows} mẫu
              </span>
            </div>

            {/* 1. FOLDER-STYLE DATASET MANAGER CARD */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isLight ? 'bg-gradient-to-br from-indigo-50/80 to-slate-50 border-indigo-200 shadow-sm' : 'bg-gradient-to-br from-indigo-950/40 to-slate-950/60 border-indigo-500/30 shadow-md'
            }`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
                  }`}>
                    <FolderOpen size={20} />
                  </div>
                  <div>
                    <h3 className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Thư mục Bộ dữ liệu
                    </h3>
                    <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Kho lưu trữ tập trung dữ liệu mẫu & tải lên
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-950/80 text-indigo-300 border-indigo-700/50'
                }`}>
                  {datasetList.length || preloadedDatasets.length + customDatasets.length} tệp
                </span>
              </div>

              {/* Active dataset indicator */}
              <div className={`p-2.5 rounded-xl border mb-3 flex items-center justify-between gap-2 ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
              }`}>
                <div className="min-w-0 flex-1">
                  <span className={`text-[9px] font-semibold uppercase tracking-wider block ${
                    isLight ? 'text-indigo-600' : 'text-indigo-400'
                  }`}>
                    Đang làm việc:
                  </span>
                  <span className={`text-xs font-bold truncate block ${isLight ? 'text-slate-800' : 'text-slate-100'}`} title={datasetName}>
                    {datasetName}
                  </span>
                  <span className={`text-[10px] block font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {totalRows.toLocaleString('vi-VN')} dòng · {featureColumns.length} đặc trưng
                  </span>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" title="Đang kích hoạt" />
              </div>

              {/* Action Button to Open Manager Modal */}
              <button
                type="button"
                onClick={onOpenDatasetManager}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <FolderOpen size={15} />
                <span>Mở Quản lý Bộ dữ liệu (Thư mục)</span>
              </button>
            </div>

            {/* Feature Selection Checkboxes */}
            <div className={`space-y-3 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/90'}`}>
              <div className={`flex items-center justify-between gap-2 font-semibold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                <span className={`flex items-center gap-1.5 ${isLight ? 'text-indigo-700' : 'text-indigo-200'}`}>
                  <CheckSquare size={13} /> Chọn đặc trưng ({selectedFeatures.length}/{featureColumns.length})
                </span>
                <div className="space-x-2 text-[10px]">
                  <button onClick={onSelectAllFeatures} disabled={isComputing} className={`hover:underline disabled:opacity-40 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>Tất cả</button>
                  <button onClick={onDeselectAllFeatures} disabled={isComputing} className={`hover:underline disabled:opacity-40 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Bỏ chọn</button>
                </div>
              </div>

              <div className={`max-h-52 overflow-y-auto space-y-1.5 p-2.5 rounded-xl border custom-scrollbar ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-700/80'
              }`}>
                {featureColumns.map((col) => {
                  const isSelected = selectedFeatures.includes(col);
                  return (
                    <button
                      type="button"
                      key={col}
                      onClick={() => onToggleFeature(col)}
                      disabled={isComputing}
                      aria-pressed={isSelected}
                      className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left rounded-lg cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        isSelected
                          ? isLight ? 'bg-indigo-100 text-indigo-900 font-medium' : 'bg-indigo-900/40 text-slate-100'
                          : isLight ? 'text-slate-600 hover:bg-slate-200/60' : 'text-slate-400 hover:bg-slate-800/60'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare size={13} className={isLight ? 'text-indigo-600' : 'text-indigo-400'} />
                      ) : (
                        <Square size={13} className={isLight ? 'text-slate-400' : 'text-slate-600'} />
                      )}
                      <span className="font-mono truncate">{col}</span>
                    </button>
                  );
                })}
              </div>
              {featureColumns.length < MIN_NUMERIC_FEATURES ? (
                <p className="rounded-lg border border-rose-500/20 bg-rose-950/20 px-2.5 py-2 text-[11px] leading-relaxed text-rose-200" role="status">
                  Bộ dữ liệu cần có ít nhất {MIN_NUMERIC_FEATURES} cột số hợp lệ để phân tích.
                </p>
              ) : selectedFeatures.length < MIN_NUMERIC_FEATURES ? (
                <p className={`rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed ${
                  isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'border-amber-500/20 bg-amber-950/20 text-amber-200'
                }`} role="status">
                  Chọn thêm {MIN_NUMERIC_FEATURES - selectedFeatures.length} đặc trưng số để bật tính toán.
                </p>
              ) : null}
            </div>

            {rawRows.length > 0 && (
              <section className={`space-y-3 rounded-2xl border p-3.5 shadow-sm ${
                isLight ? 'border-emerald-200 bg-emerald-50/60' : 'border-emerald-500/25 bg-gradient-to-br from-emerald-950/20 to-slate-950/70'
              }`} aria-label="Xem trước dữ liệu gốc">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className={`text-[11px] font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>Dữ liệu gốc · xem trước</h3>
                    <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {Math.min(rawRows.length, 10)} / {totalRows.toLocaleString('vi-VN')} dòng · chưa giảm chiều
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onOpenRawDataModal && (
                      <button
                        type="button"
                        onClick={onOpenRawDataModal}
                        title="Phóng to bảng dữ liệu gốc đầy đủ (100% dòng, tìm kiếm & phân trang)"
                        className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg border transition-all shadow-xs ${
                          isLight
                            ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        <Maximize2 size={12} />
                        <span>Phóng to</span>
                      </button>
                    )}
                    <FileSpreadsheet size={15} className={`shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} aria-hidden="true" />
                  </div>
                </div>
                <div className={`max-h-52 overflow-auto rounded-xl border custom-scrollbar ${
                  isLight ? 'border-slate-200 bg-white' : 'border-slate-700/80'
                }`}>
                  <table className="min-w-full border-collapse text-left text-[10px]">
                    <thead className={`sticky top-0 z-10 ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'}`}>
                      <tr>
                        {headers.map((header) => (
                          <th key={header} scope="col" className={`whitespace-nowrap border-b px-2 py-1.5 font-semibold ${
                            isLight ? 'border-slate-200' : 'border-slate-700'
                          }`}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 10).map((row, rowIndex) => (
                        <tr key={rowIndex} className={isLight ? (rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50') : (rowIndex % 2 === 0 ? 'bg-slate-900/70' : 'bg-slate-950/70')}>
                          {headers.map((header) => {
                            const value: DataValue | undefined = row[header];
                            return (
                              <td key={header} className={`max-w-40 whitespace-nowrap border-b px-2 py-1 font-mono ${
                                isLight ? 'border-slate-200 text-slate-700' : 'border-slate-800/70 text-slate-300'
                              }`}>
                                <span className="block truncate" title={value == null ? '' : String(value)}>
                                  {value == null ? '—' : String(value)}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: HIỂN THỊ & XUẤT FILE (DISPLAY & EXPORT)           */}
        {/* ======================================================== */}
        {activeTab === 'display' && (
          <div className="space-y-4 animate-fade-in">
            {/* Header info */}
            <div className={`flex items-center justify-between pb-2 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <span className={`font-bold text-xs flex items-center gap-1.5 ${isLight ? 'text-pink-700' : 'text-pink-400'}`}>
                <Palette size={15} /> TÙY CHỌN HIỂN THỊ & XUẤT FILE
              </span>
            </div>

            {/* DUAL VIEWPORT SO SÁNH */}
            <div className={`p-3 rounded-xl border space-y-2.5 ${
              isLight ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 shadow-sm' : 'bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border-indigo-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider ${
                  isLight ? 'text-slate-800' : 'text-white'
                }`}>
                  <Columns size={14} className={isLight ? 'text-indigo-600' : 'text-indigo-400'} /> Chế độ màn hình
                </span>
                <button
                  onClick={onToggleDualView}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isDualView
                      ? 'bg-indigo-600 text-white shadow'
                      : isLight
                        ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {isDualView ? 'Màn hình đôi (Dual)' : 'Màn hình đơn (Single)'}
                </button>
              </div>

              {isDualView && (
                <div className={`pt-2 border-t text-[11px] flex items-center justify-between ${
                  isLight ? 'border-indigo-200 text-slate-700' : 'border-indigo-800/40 text-slate-300'
                }`}>
                  <span>So sánh màn hình B với:</span>
                  <select
                    value={dualSecondaryMethod}
                    onChange={(e) => onChangeDualSecondaryMethod(e.target.value as ReductionMethod)}
                    className={`rounded px-2 py-1 text-xs font-semibold outline-none ${
                      isLight ? 'bg-white border border-indigo-300 text-indigo-700 shadow-xs' : 'bg-slate-900 border border-indigo-500/40 text-indigo-300'
                    }`}
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
              <label className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <Palette size={13} className={isLight ? 'text-pink-600' : 'text-pink-400'} /> Chế độ tô màu điểm 3D:
              </label>

              <div className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <button
                  onClick={() => onChangeColorMode('ground-truth')}
                  className={`py-2 px-1 rounded-lg font-bold transition-all text-xs truncate ${
                    colorMode === 'ground-truth'
                      ? 'bg-indigo-600 text-white shadow'
                      : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Nhãn gốc
                </button>
                <button
                  onClick={() => onChangeColorMode('cluster')}
                  className={`py-2 px-1 rounded-lg font-bold transition-all text-xs truncate ${
                    colorMode === 'cluster'
                      ? 'bg-indigo-600 text-white shadow'
                      : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Cụm phân
                </button>
                <button
                  onClick={() => onChangeColorMode('feature')}
                  className={`py-2 px-1 rounded-lg font-bold transition-all text-xs truncate ${
                    colorMode === 'feature'
                      ? 'bg-indigo-600 text-white shadow'
                      : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Đặc trưng
                </button>
              </div>

              {colorMode === 'feature' && (
                <div className="pt-2">
                  <label className={`text-[10px] block mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Chọn đặc trưng để vẽ nhiệt:</label>
                  <select
                    value={selectedColorFeature}
                    onChange={(e) => onChangeSelectedColorFeature(e.target.value)}
                    className={`w-full rounded-lg p-2 text-xs font-mono border outline-none ${
                      isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                    }`}
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
            <div className={`pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <button
                onClick={onExportCSV}
                disabled={!hasResults || isComputing}
                title={!hasResults ? 'Chạy tính toán trước khi xuất kết quả' : 'Tải tọa độ 3D và nhãn cụm dưới dạng CSV'}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold transition-all border shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                }`}
              >
                <FileSpreadsheet size={16} className="text-emerald-500" />
                <span>Xuất file CSV kết quả (3D + Cụm)</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </aside>
  );
};
