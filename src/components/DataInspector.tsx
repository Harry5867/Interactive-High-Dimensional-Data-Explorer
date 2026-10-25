import React, { useState } from 'react';
import { DataPoint } from '../types';
import { X, Search, FileText } from 'lucide-react';

interface DataInspectorProps {
  point: DataPoint | null;
  onClose: () => void;
}

export const DataInspector: React.FC<DataInspectorProps> = ({ point, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!point) return null;

  const features = Object.entries(point.originalFeatures).filter(([key]) =>
    key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="absolute top-16 right-4 z-40 w-80 md:w-96 max-h-[80vh] flex flex-col bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-200 text-xs animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-indigo-400" />
          <span className="font-bold text-white">Chi tiết điểm (ID: {point.id})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Summary Chips */}
      <div className="p-3 bg-slate-950/30 border-b border-slate-800 flex flex-wrap gap-2 text-[11px]">
        {point.label !== undefined && (
          <span className="px-2 py-0.5 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
            Nhãn gốc: <strong className="text-white">{point.label}</strong>
          </span>
        )}
        <span className="px-2 py-0.5 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800/40">
          Cụm phân: <strong className="text-white">{point.cluster === -1 ? 'Nhiễu' : point.cluster}</strong>
        </span>
        <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono">
          3D: ({point.x.toFixed(2)}, {point.y.toFixed(2)}, {point.z.toFixed(2)})
        </span>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-slate-800">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm tên đặc trưng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Feature Table */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar max-h-96">
        {features.length === 0 ? (
          <div className="text-center py-6 text-slate-500 italic">Không tìm thấy đặc trưng khớp</div>
        ) : (
          features.map(([key, val]) => (
            <div
              key={key}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/40 hover:bg-slate-800/40 transition-colors border border-slate-800/40"
            >
              <span className="text-slate-400 font-mono truncate mr-2" title={key}>{key}</span>
              <span className="text-indigo-300 font-mono font-semibold">{val}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
