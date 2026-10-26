import React, { useState, useRef, useEffect } from 'react';
import { DatasetSummary } from '../types';
import {
  FolderArchive,
  FolderOpen,
  Upload,
  Pencil,
  Trash2,
  Check,
  X,
  Database,
  FileSpreadsheet,
  Search,
  Plus,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface DatasetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetList: DatasetSummary[];
  activeDatasetId: string;
  onSelectDataset: (id: string) => void;
  onRenameDataset: (id: string, newName: string) => void;
  onDeleteDataset: (id: string) => void;
  onFileUpload: (file: File) => void;
  isComputing?: boolean;
  theme?: 'dark' | 'light';
}

export const DatasetManagerModal: React.FC<DatasetManagerModalProps> = ({
  isOpen,
  onClose,
  datasetList,
  activeDatasetId,
  onSelectDataset,
  onRenameDataset,
  onDeleteDataset,
  onFileUpload,
  isComputing = false,
  theme = 'dark',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLight = theme === 'light';

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingDatasetId) {
          setEditingDatasetId(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, editingDatasetId]);

  if (!isOpen) return null;

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      onRenameDataset(id, editingName.trim());
    }
    setEditingDatasetId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
      e.target.value = '';
      onClose();
    }
  };

  const preloadedList = datasetList.filter((d) => d.is_preloaded);
  const customList = datasetList.filter((d) => !d.is_preloaded);

  const filterItem = (d: DatasetSummary) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.filename.toLowerCase().includes(searchTerm.toLowerCase());

  const filteredPreloaded = preloadedList.filter(filterItem);
  const filteredCustom = customList.filter(filterItem);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dataset-manager-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        className={`relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden border transition-all ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-700/80 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <FolderArchive size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="dataset-manager-title"
                  className={`text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}
                >
                  Thư mục Quản lý Bộ dữ liệu
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 text-xs font-semibold border border-indigo-500/30">
                  {datasetList.length} bộ dữ liệu
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Kho lưu trữ bộ dữ liệu mẫu và các tệp CSV do bạn tải lên
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className={`p-2 rounded-xl transition-all ${
              isLight
                ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar: Search & Direct Upload Action */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b text-xs ${
            isLight ? 'bg-slate-100/60 border-slate-200' : 'bg-slate-950/40 border-slate-800/80'
          }`}
        >
          {/* Search bar */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Tìm kiếm bộ dữ liệu theo tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs outline-none transition-all ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                  : 'bg-slate-900 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-indigo-400'
              }`}
            />
          </div>

          {/* Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-md shadow-indigo-600/25"
          >
            <Plus size={15} />
            <span>Tải lên tệp CSV mới</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
          {/* 1. Preloaded Datasets Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <FolderOpen size={15} /> Thư mục mẫu sẵn có (Hệ thống)
              </span>
              <span className="text-[10px] text-slate-400">({filteredPreloaded.length} mục)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredPreloaded.map((d) => {
                const isActive = activeDatasetId === d.id;
                const isEditing = editingDatasetId === d.id;

                return (
                  <div
                    key={d.id}
                    className={`group relative rounded-2xl border p-4 transition-all ${
                      isActive
                        ? isLight
                          ? 'border-indigo-400 bg-indigo-50/70 shadow-md ring-1 ring-indigo-400'
                          : 'border-indigo-500 bg-indigo-600/15 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500'
                        : isLight
                          ? 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-slate-100/60'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(d.id);
                            if (e.key === 'Escape') setEditingDatasetId(null);
                          }}
                          className={`flex-1 rounded-xl border px-3 py-1.5 text-xs outline-none ${
                            isLight
                              ? 'bg-white border-indigo-400 text-slate-800'
                              : 'bg-slate-900 border-indigo-500 text-white'
                          }`}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(d.id)}
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20"
                          title="Lưu tên mới"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDatasetId(null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-500/20"
                          title="Hủy"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-between h-full gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5">
                              <Database size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                                  {d.name}
                                </span>
                                {isActive && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                    Đang chọn
                                  </span>
                                )}
                              </div>
                              <p className={`text-[11px] mt-0.5 font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                {d.filename}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingDatasetId(d.id);
                              setEditingName(d.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg transition-opacity"
                            title="Đổi tên bộ dữ liệu"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/80">
                          <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            <strong>{d.total_rows.toLocaleString('vi-VN')}</strong> dòng ·{' '}
                            <strong>{d.features_count ?? 30}</strong> đặc trưng số
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onSelectDataset(d.id);
                              onClose();
                            }}
                            disabled={isActive}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all ${
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-400 cursor-default'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                            }`}
                          >
                            <span>{isActive ? 'Đã kích hoạt' : 'Chọn bộ dữ liệu'}</span>
                            {!isActive && <ArrowRight size={13} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Custom Uploaded Datasets Section */}
          <div className="space-y-3 pt-4 border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <FileSpreadsheet size={15} /> Bộ dữ liệu của bạn (Đã tải lên)
              </span>
              <span className="text-[10px] text-slate-400">({customList.length} tệp)</span>
            </div>

            {filteredCustom.length === 0 ? (
              <div
                className={`flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed text-center transition-all ${
                  isLight
                    ? 'border-slate-300 bg-slate-50/60 text-slate-500'
                    : 'border-slate-800 bg-slate-950/30 text-slate-400'
                }`}
              >
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-2">
                  <Upload size={24} />
                </div>
                <p className="font-semibold text-sm">Chưa có tệp CSV tùy chỉnh nào được tải lên</p>
                <p className="text-xs mt-1 text-slate-400">
                  Bạn có thể tải lên tệp CSV bất kỳ từ máy tính để phân tích không gian 3D.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3.5 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/25"
                >
                  <Plus size={15} />
                  <span>Chọn tệp CSV từ máy tính</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredCustom.map((d) => {
                  const isActive = activeDatasetId === d.id;
                  const isEditing = editingDatasetId === d.id;

                  return (
                    <div
                      key={d.id}
                      className={`group relative rounded-2xl border p-4 transition-all ${
                        isActive
                          ? isLight
                            ? 'border-indigo-400 bg-indigo-50/70 shadow-md ring-1 ring-indigo-400'
                            : 'border-indigo-500 bg-indigo-600/15 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500'
                          : isLight
                            ? 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-slate-100/60'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(d.id);
                              if (e.key === 'Escape') setEditingDatasetId(null);
                            }}
                            className={`flex-1 rounded-xl border px-3 py-1.5 text-xs outline-none ${
                              isLight
                                ? 'bg-white border-indigo-400 text-slate-800'
                                : 'bg-slate-900 border-indigo-500 text-white'
                            }`}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(d.id)}
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20"
                            title="Lưu tên mới"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDatasetId(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-500/20"
                            title="Hủy"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col justify-between h-full gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-0.5">
                                <FileSpreadsheet size={18} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                                    {d.name}
                                  </span>
                                  {isActive && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                      Đang chọn
                                    </span>
                                  )}
                                </div>
                                <p className={`text-[11px] mt-0.5 font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {d.filename}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDatasetId(d.id);
                                  setEditingName(d.name);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg"
                                title="Đổi tên bộ dữ liệu"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Bạn có chắc muốn xóa bộ dữ liệu "${d.name}"?`)) {
                                    onDeleteDataset(d.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg"
                                title="Xóa bộ dữ liệu"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/80">
                            <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                              <strong>{d.total_rows.toLocaleString('vi-VN')}</strong> dòng ·{' '}
                              <strong>{d.features_count ?? '?'}</strong> đặc trưng số
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                onSelectDataset(d.id);
                                onClose();
                              }}
                              disabled={isActive}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all ${
                                isActive
                                  ? 'bg-emerald-500/15 text-emerald-400 cursor-default'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                              }`}
                            >
                              <span>{isActive ? 'Đã kích hoạt' : 'Chọn bộ dữ liệu'}</span>
                              {!isActive && <ArrowRight size={13} />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-6 py-3 border-t text-xs ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950/80 border-slate-800 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Dữ liệu được lưu trữ an toàn trong cơ sở dữ liệu MongoDB/In-Memory</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl font-semibold transition-all ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
