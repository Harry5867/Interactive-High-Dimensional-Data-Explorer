import React, { useState, useMemo, useEffect } from 'react';
import { DatasetRow, DataValue } from '../types';
import { X, Search, FileSpreadsheet, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download } from 'lucide-react';

interface RawDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetName: string;
  headers: string[];
  rawRows: DatasetRow[];
  totalRows: number;
  labelColumn?: string | null;
  theme?: 'dark' | 'light';
}

export const RawDataModal: React.FC<RawDataModalProps> = ({
  isOpen,
  onClose,
  datasetName,
  headers,
  rawRows,
  totalRows,
  labelColumn,
  theme = 'dark',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset page when search or dataset changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, datasetName]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rawRows;
    const term = searchTerm.toLowerCase().trim();
    return rawRows.filter((row) =>
      headers.some((header) => {
        const val = row[header];
        return val != null && String(val).toLowerCase().includes(term);
      })
    );
  }, [rawRows, headers, searchTerm]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredRows.length);
  const currentRows = useMemo(() => {
    return filteredRows.slice(startIndex, endIndex);
  }, [filteredRows, startIndex, endIndex]);

  const handleExportCSV = () => {
    if (filteredRows.length === 0) return;
    const csvHeader = headers.join(',');
    const csvBody = filteredRows
      .map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val == null) return '';
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(',')
      )
      .join('\n');
    const blob = new Blob([`${csvHeader}\n${csvBody}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${datasetName}_full_export.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const isLight = theme === 'light';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="raw-data-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        className={`relative flex flex-col w-full max-w-7xl h-[92vh] rounded-2xl shadow-2xl overflow-hidden border transition-all ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-700/80 text-slate-100'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2
                id="raw-data-modal-title"
                className={`text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}
              >
                Toàn bộ dữ liệu gốc: {datasetName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                <span>{totalRows.toLocaleString('vi-VN')} dòng</span>
                <span>•</span>
                <span>{headers.length} cột dữ liệu</span>
                {labelColumn && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">Cột nhãn: {labelColumn}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              title="Tải về file CSV dữ liệu này"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Download size={14} />
              <span>Xuất CSV</span>
            </button>
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
        </div>

        {/* Modal Toolbar: Search & Pagination Controls */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b text-xs ${
            isLight ? 'bg-slate-100/60 border-slate-200' : 'bg-slate-950/40 border-slate-800/80'
          }`}
        >
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm giá trị trong bảng..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs outline-none transition-all ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30'
              }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Số dòng/trang:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className={`px-2 py-1 rounded-lg border text-xs font-semibold outline-none cursor-pointer ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-800'
                    : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={validCurrentPage <= 1}
                title="Trang đầu"
                className={`p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed ${
                  isLight
                    ? 'border-slate-300 hover:bg-slate-200 text-slate-700'
                    : 'border-slate-700 hover:bg-slate-800 text-slate-200'
                }`}
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage <= 1}
                title="Trang trước"
                className={`p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed ${
                  isLight
                    ? 'border-slate-300 hover:bg-slate-200 text-slate-700'
                    : 'border-slate-700 hover:bg-slate-800 text-slate-200'
                }`}
              >
                <ChevronLeft size={14} />
              </button>

              <span className="px-2 font-mono text-slate-400">
                {validCurrentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage >= totalPages}
                title="Trang sau"
                className={`p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed ${
                  isLight
                    ? 'border-slate-300 hover:bg-slate-200 text-slate-700'
                    : 'border-slate-700 hover:bg-slate-800 text-slate-200'
                }`}
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={validCurrentPage >= totalPages}
                title="Trang cuối"
                className={`p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed ${
                  isLight
                    ? 'border-slate-300 hover:bg-slate-200 text-slate-700'
                    : 'border-slate-700 hover:bg-slate-800 text-slate-200'
                }`}
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body: Scrollable Full Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse text-left text-xs">
            <thead
              className={`sticky top-0 z-10 font-bold uppercase tracking-wider text-[11px] shadow-sm ${
                isLight ? 'bg-slate-100 text-slate-700 border-b border-slate-300' : 'bg-slate-800 text-slate-300 border-b border-slate-700'
              }`}
            >
              <tr>
                <th scope="col" className="w-14 px-3 py-2.5 text-center font-mono border-r border-slate-700/40">
                  #
                </th>
                {headers.map((header) => {
                  const isLabel = header === labelColumn;
                  return (
                    <th
                      key={header}
                      scope="col"
                      className={`whitespace-nowrap px-3 py-2.5 font-semibold ${
                        isLabel ? 'text-emerald-400 bg-emerald-950/20 font-bold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{header}</span>
                        {isLabel && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                            Nhãn
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length + 1} className="py-12 text-center text-slate-400">
                    Không tìm thấy dòng nào khớp với từ khóa &ldquo;{searchTerm}&rdquo;.
                  </td>
                </tr>
              ) : (
                currentRows.map((row, idx) => {
                  const rowIndex = startIndex + idx + 1;
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={rowIndex}
                      className={`transition-colors ${
                        isLight
                          ? isEven
                            ? 'bg-white hover:bg-indigo-50/50'
                            : 'bg-slate-50 hover:bg-indigo-50/50'
                          : isEven
                          ? 'bg-slate-900/60 hover:bg-indigo-950/30'
                          : 'bg-slate-950/60 hover:bg-indigo-950/30'
                      }`}
                    >
                      <td className="w-14 px-3 py-1.5 text-center text-slate-400 font-mono border-r border-slate-800/40 select-none">
                        {rowIndex}
                      </td>
                      {headers.map((header) => {
                        const val: DataValue | undefined = row[header];
                        const isLabel = header === labelColumn;
                        return (
                          <td
                            key={header}
                            className={`whitespace-nowrap px-3 py-1.5 max-w-xs truncate ${
                              isLabel
                                ? 'text-emerald-300 font-semibold'
                                : typeof val === 'number'
                                ? isLight
                                  ? 'text-slate-800'
                                  : 'text-slate-200'
                                : 'text-slate-400'
                            }`}
                            title={val == null ? '' : String(val)}
                          >
                            {val == null ? '—' : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer: Statistics & Quick Summary */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-t text-xs ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950/80 border-slate-800 text-slate-400'
          }`}
        >
          <div className="font-mono">
            Hiển thị dòng <span className="font-bold text-indigo-400">{filteredRows.length > 0 ? startIndex + 1 : 0}</span> đến{' '}
            <span className="font-bold text-indigo-400">{endIndex}</span> /{' '}
            <span className="font-bold text-emerald-400">{filteredRows.length.toLocaleString('vi-VN')}</span> dòng{' '}
            {searchTerm && `(lọc từ tổng số ${totalRows.toLocaleString('vi-VN')} dòng gốc)`}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">Nhấn ESC hoặc bấm nút Đóng để quay lại</span>
            <button
              onClick={onClose}
              className={`px-4 py-1.5 rounded-xl font-semibold border transition-all ${
                isLight
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
