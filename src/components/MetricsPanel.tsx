import React, { useState } from 'react';
import { EvaluationMetrics, ReductionMethod } from '../types';
import { Activity, BarChart2, PieChart, ShieldCheck, Database, Save, ChevronUp, ChevronDown } from 'lucide-react';

interface MetricsPanelProps {
  metrics: EvaluationMetrics;
  reductionMethod: ReductionMethod;
  hasGroundTruth: boolean;
  onSaveExperiment?: () => void;
  onOpenHistory?: () => void;
  isSaving?: boolean;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  reductionMethod,
  hasGroundTruth,
  onSaveExperiment,
  onOpenHistory,
  isSaving,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { silhouetteScore, adjustedRandIndex, explainedVariance, totalVarianceExplained, clusterCounts, noiseCount } = metrics;

  return (
    <div className="w-full flex flex-col items-center pointer-events-none select-none">
      {/* 1. COMPACT FLOATING BAR (Always visible, doesn't obstruct 3D chart) */}
      <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-xl border border-slate-700/80 px-4 py-2 rounded-2xl shadow-2xl transition-all">
        <div className="flex items-center gap-2 pr-3 border-r border-slate-700/80">
          <Activity size={15} className="text-indigo-400" />
          <span className="text-xs font-bold text-white tracking-wide">CHỈ SỐ:</span>
        </div>

        {/* Silhouette quick metric */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400 text-[11px]">Silhouette:</span>
          <span className="font-bold text-emerald-400">
            {silhouetteScore !== null ? silhouetteScore.toFixed(3) : 'N/A'}
          </span>
        </div>

        <span className="text-slate-600">|</span>

        {/* ARI quick metric */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400 text-[11px]">ARI:</span>
          <span className="font-bold text-cyan-400">
            {adjustedRandIndex !== null ? adjustedRandIndex.toFixed(3) : 'N/A'}
          </span>
        </div>

        {/* PCA Variance if applicable */}
        {reductionMethod === 'PCA' && totalVarianceExplained !== undefined && (
          <>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">Phương sai 3D:</span>
              <span className="font-bold text-amber-400">
                {(totalVarianceExplained * 100).toFixed(1)}%
              </span>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-700/80">
          {onSaveExperiment && (
            <button
              onClick={onSaveExperiment}
              disabled={isSaving}
              title="Lưu kết quả chạy vào MongoDB"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-[11px] font-semibold text-white transition-all shadow shadow-emerald-700/40 disabled:opacity-50"
            >
              <Save size={12} />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Mongo'}</span>
            </button>
          )}

          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              title="Xem lịch sử thí nghiệm đã lưu trong MongoDB"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 transition-all border border-slate-700"
            >
              <Database size={12} className="text-emerald-400" />
              <span>Lịch sử</span>
            </button>
          )}

          {/* Toggle Expand Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-300 text-[11px] font-semibold border border-indigo-800/60 transition-all"
          >
            <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* 2. EXPANDED DETAILED PANEL (Opens when user clicks 'Chi tiết') */}
      {isExpanded && (
        <div className="pointer-events-auto mt-2 w-full max-w-3xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 text-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Silhouette Score */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-[11px] mb-1 flex items-center justify-between">
                <span>Silhouette Score</span>
                <ShieldCheck size={13} className="text-slate-500" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {silhouetteScore !== null ? silhouetteScore.toFixed(3) : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {silhouetteScore !== null ? (
                  silhouetteScore > 0.5 ? 'Tách cụm rất tốt (> 0.5)' :
                  silhouetteScore > 0.25 ? 'Tách cụm trung bình (0.25 - 0.5)' :
                  'Cụm chồng lấn (< 0.25)'
                ) : 'Cần ít nhất 2 cụm'}
              </div>
            </div>

            {/* ARI Score */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-[11px] mb-1 flex items-center justify-between">
                <span>Độ khớp ARI</span>
                <BarChart2 size={13} className="text-slate-500" />
              </div>
              <div className="text-xl font-bold font-mono text-cyan-400">
                {adjustedRandIndex !== null ? adjustedRandIndex.toFixed(3) : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {hasGroundTruth && adjustedRandIndex !== null ? (
                  adjustedRandIndex > 0.7 ? 'Khớp rất cao với nhãn thật' :
                  adjustedRandIndex > 0.3 ? 'Tương đồng mức vừa' :
                  'Ít tương quan với nhãn thật'
                ) : 'Không có nhãn tham chiếu'}
              </div>
            </div>

            {/* PCA Variance or Cluster breakdown */}
            {reductionMethod === 'PCA' && explainedVariance ? (
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 col-span-2">
                <div className="text-slate-400 text-[11px] mb-1 flex items-center justify-between">
                  <span>Phương sai tích lũy (PCA 3D)</span>
                  <span className="text-amber-400 font-bold font-mono">
                    {((totalVarianceExplained || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden flex">
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
                <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
                  <span>PC1: {(explainedVariance[0] * 100).toFixed(1)}%</span>
                  <span>PC2: {(explainedVariance[1] * 100).toFixed(1)}%</span>
                  <span>PC3: {(explainedVariance[2] * 100).toFixed(1)}%</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 col-span-2">
                <div className="text-slate-400 text-[11px] mb-1 flex items-center justify-between">
                  <span>Phân bố số lượng cụm</span>
                  <PieChart size={13} className="text-slate-500" />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(clusterCounts).map(([cluster, count]) => (
                    <span
                      key={cluster}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 text-[11px] font-mono border border-slate-700"
                    >
                      Cụm {cluster}: <strong className="text-indigo-300">{count}</strong>
                    </span>
                  ))}
                  {noiseCount !== undefined && noiseCount > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-950/40 text-rose-300 text-[11px] font-mono border border-rose-800/50">
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
