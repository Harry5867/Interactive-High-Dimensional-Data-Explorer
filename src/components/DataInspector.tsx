import React, { useState } from 'react';
import { DataPoint } from '../types';
import { X, Search, FileText } from 'lucide-react';

interface DataInspectorProps {
  point: DataPoint | null;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const DataInspector: React.FC<DataInspectorProps> = ({ point, onClose, theme = 'dark' }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!point) return null;

  const isLight = theme === 'light';

  const features = Object.entries(point.originalFeatures).filter(([key]) =>
    key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`absolute top-16 right-4 z-40 w-80 md:w-96 max-h-[80vh] flex flex-col backdrop-blur-xl border rounded-2xl shadow-2xl overflow-hidden text-xs animate-in fade-in slide-in-from-right-4 duration-200 ${
      isLight
        ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/50'
        : 'bg-slate-900/95 border-slate-700/80 text-slate-200 shadow-slate-950/70'
    }`}>
      {/* Header */}
      <div className={`p-3.5 border-b flex items-center justify-between ${
        isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/40'
      }`}>
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-indigo-500" />
          <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Chi tiết điểm (ID: {point.id})
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Đóng chi tiết"
          className={`p-1 rounded-lg transition-colors ${
            isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <X size={15} />
        </button>
      </div>

      {/* Summary Chips */}
      <div className={`p-3 border-b flex flex-wrap gap-2 text-[11px] ${
        isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-slate-950/30'
      }`}>
        {point.label !== undefined && (
          <span className={`px-2 py-0.5 rounded-lg border ${
            isLight ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-indigo-950/80 text-indigo-300 border-indigo-800/50'
          }`}>
            Nhãn: <strong className={isLight ? 'text-indigo-950 font-bold' : 'text-white'}>{String(point.label)}</strong>
          </span>
        )}
        <span className={`px-2 py-0.5 rounded-lg border ${
          isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-950/60 text-amber-300 border-amber-800/40'
        }`}>
          Cụm phân: <strong className={isLight ? 'text-amber-950 font-bold' : 'text-white'}>{point.cluster === -1 ? 'Nhiễu' : point.cluster}</strong>
        </span>
        <span className={`px-2 py-0.5 rounded-lg font-mono border ${
          isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-transparent'
        }`}>
          3D: ({point.x.toFixed(2)}, {point.y.toFixed(2)}, {point.z.toFixed(2)})
        </span>
      </div>

      {/* Search Input */}
      <div className={`p-2 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên đặc trưng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full border rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-indigo-500 transition-colors ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'
            }`}
          />
        </div>
      </div>

      {/* Feature Table */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar max-h-96">
        {features.length === 0 ? (
          <div className="text-center py-6 text-slate-400 italic">Không tìm thấy đặc trưng khớp</div>
        ) : (
          features.map(([key, val]) => (
            <div
              key={key}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors border ${
                isLight
                  ? 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                  : 'bg-slate-950/40 hover:bg-slate-800/40 border-slate-800/40 text-slate-200'
              }`}
            >
              <span className={`font-mono truncate mr-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} title={key}>{key}</span>
              <span className={`font-mono font-semibold ${isLight ? 'text-indigo-600' : 'text-indigo-300'}`}>{val}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
