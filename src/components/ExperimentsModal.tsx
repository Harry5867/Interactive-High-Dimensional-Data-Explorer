import React from 'react';
import { X, Database, Layers } from 'lucide-react';
import { ExperimentRecord } from '../types';

export type { ExperimentRecord } from '../types';

interface ExperimentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  experiments: ExperimentRecord[];
  onRefresh: () => void;
}

export const ExperimentsModal: React.FC<ExperimentsModalProps> = ({
  isOpen,
  onClose,
  experiments,
  onRefresh,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <Database size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                LỊCH SỬ THÍ NGHIỆM TRONG CSDL (MongoDB Document Store)
              </h2>
              <p className="text-[11px] text-slate-400">
                Lưu trữ và đối sánh hiệu năng các thuật toán Giảm chiều & Phân cụm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              Làm mới
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {experiments.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Layers size={36} className="mx-auto text-slate-600 opacity-60" />
              <div className="text-sm">Chưa có kết quả thí nghiệm nào được lưu vào CSDL MongoDB.</div>
              <div className="text-xs text-slate-600">
                Hãy chạy một thuật toán và bấm nút "Lưu vào MongoDB" trên màn hình chính!
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                    <th className="p-3">#ID</th>
                    <th className="p-3">Bộ dữ liệu</th>
                    <th className="p-3">Giảm chiều</th>
                    <th className="p-3">Phân cụm</th>
                    <th className="p-3">Silhouette</th>
                    <th className="p-3">Độ khớp ARI</th>
                    <th className="p-3">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {experiments.map((exp, idx) => (
                    <tr key={exp.id || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-slate-500 truncate max-w-[80px]" title={String(exp.id)}>
                        #{String(exp.id).slice(-6)}
                      </td>
                      <td className="p-3 text-slate-200 font-sans font-medium">{exp.dataset_name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/50 text-[11px]">
                          {exp.reduction_method}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-800/40 text-[11px]">
                          {exp.clustering_method} (k={exp.k})
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-400">
                        {exp.silhouette_score !== null ? exp.silhouette_score.toFixed(3) : 'N/A'}
                      </td>
                      <td className="p-3 font-bold text-cyan-400">
                        {exp.ari !== null ? exp.ari.toFixed(3) : 'N/A'}
                      </td>
                      <td className="p-3 text-slate-400 font-sans text-[11px]">
                        {new Date(exp.created_at).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>Tổng số lượt thí nghiệm: <strong className="text-white">{experiments.length}</strong></span>
          <span className="font-mono text-emerald-400 text-[11px]">Database: MongoDB Collection (experiments)</span>
        </div>
      </div>
    </div>
  );
};
