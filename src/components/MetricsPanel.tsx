import React, { useState } from 'react';
import { EvaluationMetrics, ReductionMethod } from '../types';
import { Activity, BarChart2, PieChart, ShieldCheck, Database, Save, ChevronUp, ChevronDown } from 'lucide-react';

interface MetricsPanelProps {
  metrics: EvaluationMetrics;
  reductionMethod: ReductionMethod;
  hasGroundTruth: boolean;
  hasResults: boolean;
  onSaveExperiment?: () => void;
  onOpenHistory?: () => void;
  isSaving?: boolean;
  theme?: 'dark' | 'light';
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  reductionMethod,
  hasGroundTruth,
  hasResults,
  onSaveExperiment,
  onOpenHistory,
  isSaving,
  theme = 'dark',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { silhouetteScore, adjustedRandIndex, explainedVariance, totalVarianceExplained, clusterCounts, noiseCount } = metrics;
  const isLight = theme === 'light';

  return (
    <div className="w-full flex flex-col items-center pointer-events-none select-none">
      {/* 1. COMPACT FLOATING BAR (Always visible, doesn't obstruct 3D chart) */}
      <div className={`pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2.5 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl transition-all sm:px-5 ${
        isLight
          ? 'border-slate-200 bg-white/95 text-slate-800 shadow-slate-300/40 hover:border-slate-300'
          : 'border-slate-700/90 bg-slate-900/95 text-slate-100 shadow-slate-950/50 hover:border-slate-600'
      }`}>
        <div className={`flex items-center gap-2 pr-3 border-r ${isLight ? 'border-slate-200' : 'border-slate-700/90'}`}>
          <Activity size={15} className="text-indigo-500" />
          <span className={`text-xs font-bold tracking-[0.12em] ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>CHỈ SỐ</span>
        </div>

        {/* Silhouette quick metric */}
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-mono ${
          isLight ? 'border-slate-200 bg-slate-100 text-slate-700' : 'border-slate-700/70 bg-slate-950/60 text-slate-300'
        }`}>
          <span className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Silhouette</span>
          <span className={`font-bold tabular-nums ${isLight ? 'text-emerald-600' : 'text-emerald-300'}`}>
            {silhouetteScore !== null ? silhouetteScore.toFixed(3) : 'N/A'}
          </span>
        </div>

        {/* ARI quick metric */}
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-mono ${
          isLight ? 'border-slate-200 bg-slate-100 text-slate-700' : 'border-slate-700/70 bg-slate-950/60 text-slate-300'
        }`}>
          <span className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>ARI</span>
          <span className={`font-bold tabular-nums ${isLight ? 'text-cyan-600' : 'text-cyan-300'}`}>
            {adjustedRandIndex !== null ? adjustedRandIndex.toFixed(3) : 'N/A'}
          </span>
        </div>

        {/* PCA Variance if applicable */}
        {reductionMethod === 'PCA' && totalVarianceExplained !== undefined && (
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-mono ${
            isLight ? 'border-amber-300 bg-amber-50 text-slate-700' : 'border-amber-500/20 bg-amber-950/20 text-slate-300'
          }`}>
            <span className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Phương sai 3D</span>
            <span className={`font-bold tabular-nums ${isLight ? 'text-amber-600' : 'text-amber-300'}`}>
              {(totalVarianceExplained * 100).toFixed(1)}%
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`flex items-center gap-2 border-l pl-3 ${isLight ? 'border-slate-200' : 'border-slate-700/80'}`}>
          {onSaveExperiment && (
            <button
              onClick={onSaveExperiment}
              disabled={isSaving || !hasResults}
              title={hasResults ? 'Lưu kết quả chạy vào MongoDB' : 'Chạy giảm chiều trước khi lưu kết quả'}
              className="flex min-h-9 items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-600/90 px-3 py-2 text-[11px] font-semibold text-white shadow shadow-emerald-950/40 transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={12} />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Mongo'}</span>
            </button>
          )}

          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              title="Xem lịch sử thí nghiệm đã lưu trong MongoDB"
              className={`flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all ${
                isLight
                  ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  : 'border-slate-600/80 bg-slate-800/90 text-slate-100 hover:border-slate-500 hover:bg-slate-700'
              }`}
            >
              <Database size={12} className="text-emerald-500" />
              <span>Lịch sử</span>
            </button>
          )}

          {/* Toggle Expand Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all ${
              isLight
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                : 'border-indigo-500/40 bg-indigo-950/80 text-indigo-200 hover:border-indigo-400/60 hover:bg-indigo-900/80'
            }`}
          >
            <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* 2. EXPANDED DETAILED PANEL (Opens when user clicks 'Chi tiết') */}
      {isExpanded && (
        <div className={`pointer-events-auto mt-2 w-full max-w-3xl backdrop-blur-xl border rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/50'
            : 'bg-slate-900/95 border-slate-700/90 text-slate-200 shadow-slate-950/60'
        }`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Silhouette Score */}
            <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
              <div className={`text-[11px] mb-1 flex items-center justify-between ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                <span>Silhouette Score</span>
                <ShieldCheck size={13} className={isLight ? 'text-slate-400' : 'text-slate-500'} />
              </div>
              <div className={`text-xl font-bold font-mono ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                {silhouetteScore !== null ? silhouetteScore.toFixed(3) : 'N/A'}
              </div>
              <div className={`text-[10px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {silhouetteScore !== null ? (
                  silhouetteScore > 0.5 ? 'Tách cụm rất tốt (> 0.5)' :
                  silhouetteScore > 0.25 ? 'Tách cụm trung bình (0.25 - 0.5)' :
                  'Cụm chồng lấn (< 0.25)'
                ) : 'Cần ít nhất 2 cụm'}
              </div>
            </div>

            {/* ARI Score */}
            <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
              <div className={`text-[11px] mb-1 flex items-center justify-between ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                <span>Độ khớp ARI</span>
                <BarChart2 size={13} className={isLight ? 'text-slate-400' : 'text-slate-500'} />
              </div>
              <div className={`text-xl font-bold font-mono ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`}>
                {adjustedRandIndex !== null ? adjustedRandIndex.toFixed(3) : 'N/A'}
              </div>
              <div className={`text-[10px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {hasGroundTruth && adjustedRandIndex !== null ? (
                  adjustedRandIndex > 0.7 ? 'Khớp rất cao với nhãn thật' :
                  adjustedRandIndex > 0.3 ? 'Tương đồng mức vừa' :
                  'Ít tương quan với nhãn thật'
                ) : 'Không có nhãn tham chiếu'}
              </div>
            </div>

            {/* PCA Variance or Cluster breakdown */}
            {reductionMethod === 'PCA' && explainedVariance ? (
              <div className={`p-3 rounded-xl border col-span-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                <div className={`text-[11px] mb-1 flex items-center justify-between ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>Phương sai tích lũy (PCA 3D)</span>
                  <span className={`font-bold font-mono ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                    {((totalVarianceExplained || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className={`flex-1 rounded-full h-2 overflow-hidden flex ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                    <div
                      style={{ width: `${(explainedVariance[0] * 100).toFixed(1)}%` }}
                      className="bg-indigo-500 h-full"
                      title={`PC1: ${(explainedVariance[0] * 100).toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${(explainedVariance[1] * 100).toFixed(1)}%` }}
                      className="bg-cyan-500 h-full"
                      title={`PC2: ${(explainedVariance[1] * 100).toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${(explainedVariance[2] * 100).toFixed(1)}%` }}
                      className="bg-amber-500 h-full"
                      title={`PC3: ${(explainedVariance[2] * 100).toFixed(1)}%`}
                    />
                  </div>
                </div>
                <div className={`flex justify-between text-[10px] mt-1.5 font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>PC1: {(explainedVariance[0] * 100).toFixed(1)}%</span>
                  <span>PC2: {(explainedVariance[1] * 100).toFixed(1)}%</span>
                  <span>PC3: {(explainedVariance[2] * 100).toFixed(1)}%</span>
                </div>
              </div>
            ) : (
              <div className={`p-3 rounded-xl border col-span-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                <div className={`text-[11px] mb-1 flex items-center justify-between ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>Phân bố số lượng cụm</span>
                  <PieChart size={13} className={isLight ? 'text-slate-400' : 'text-slate-500'} />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(clusterCounts).map(([cluster, count]) => (
                    <span
                      key={cluster}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-mono border ${
                        isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-200 border-slate-700'
                      }`}
                    >
                      Cụm {cluster}: <strong className="text-indigo-500">{count}</strong>
                    </span>
                  ))}
                  {noiseCount !== undefined && noiseCount > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-500 text-[11px] font-mono border border-rose-500/30">
                      Nhiễu: {noiseCount}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
