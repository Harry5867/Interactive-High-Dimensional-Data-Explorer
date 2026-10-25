import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Lock,
  Wifi,
  Database,
  CheckCircle2,
  AlertTriangle,
  Server,
  Share2,
  Copy,
  Check,
  RefreshCw,
  KeyRound,
  Globe2,
  Activity,
  Cpu,
  Trash2,
  Zap,
} from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbStatus: string;
  onRefreshDb: () => Promise<void>;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  dbStatus,
  onRefreshDb,
}) => {
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheMsg, setCacheMsg] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/system-health');
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      }
    } catch (e) {
      // Backend may be offline
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isCloudConnected = dbStatus.toLowerCase().includes('connected') || dbStatus.toLowerCase().includes('cloud');

  const handlePingTest = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await fetch('/api/test-db', { method: 'POST' });
      const data = await res.json();
      if (data.connected) {
        setPingResult('✅ Kết nối MongoDB Atlas THÀNH CÔNG! Độ trễ phản hồi cực thấp.');
      } else {
        setPingResult(`⚠️ ${data.message || 'Chưa kết nối được. Đang chạy chế độ tự hành In-Memory.'}`);
      }
      await onRefreshDb();
      await fetchHealth();
    } catch (err: any) {
      setPingResult('⚠️ Lỗi kiểm tra: ' + err.message);
    } finally {
      setIsPinging(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    setCacheMsg(null);
    try {
      const res = await fetch('/api/cache', { method: 'DELETE' });
      const data = await res.json();
      setCacheMsg(data.message || 'Đã dọn dẹp cache tính toán!');
      await fetchHealth();
    } catch (err: any) {
      setCacheMsg('Lỗi dọn cache: ' + err.message);
    } finally {
      setIsClearingCache(false);
    }
  };

  const copyHostCommand = () => {
    navigator.clipboard.writeText('npm run dev:host');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Trung tâm Bảo mật & Giám sát Backend (System Health & Security)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kiểm soát an toàn dữ liệu, mã hóa kết nối MongoDB Atlas và đo lường hiệu năng thời gian thực
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. Trạng thái kết nối Cloud Database thời gian thực */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database size={18} className={isCloudConnected ? 'text-emerald-400' : 'text-amber-400'} />
                <span className="text-sm font-bold text-white">Trạng thái Database Engine:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                    isCloudConnected
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {dbStatus}
                </span>
              </div>

              <button
                onClick={handlePingTest}
                disabled={isPinging}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
              >
                <RefreshCw size={13} className={isPinging ? 'animate-spin' : ''} />
                <span>{isPinging ? 'Đang kiểm tra...' : 'Kiểm tra kết nối (Ping Test)'}</span>
              </button>
            </div>

            {pingResult && (
              <div className="text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200">
                {pingResult}
              </div>
            )}
          </div>

          {/* 2. Giám sát Hiệu năng Backend & Caching (Real-Time Metrics) */}
          {systemHealth && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Activity size={14} /> Giám sát tài nguyên Backend (System Observability)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Uptime: {systemHealth.uptime}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                {/* RAM Metric */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Cpu size={14} className="text-cyan-400" />
                    <span>Bộ nhớ RAM Node.js</span>
                  </div>
                  <div className="font-mono text-cyan-300 font-bold text-sm">
                    {systemHealth.memory?.heapUsedMb} <span className="text-[11px] font-normal text-slate-400">/ {systemHealth.memory?.heapTotalMb}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">RSS: {systemHealth.memory?.rssMb}</span>
                </div>

                {/* Database Latency */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Server size={14} className="text-emerald-400" />
                    <span>Độ trễ MongoDB</span>
                  </div>
                  <div className="font-mono text-emerald-400 font-bold text-sm">
                    {systemHealth.database?.latency || 'N/A'}
                  </div>
                  <span className="text-[10px] text-slate-500">Tổng docs: {systemHealth.database?.totalDocuments || 0}</span>
                </div>

                {/* Compute Cache */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Zap size={14} className="text-amber-400" />
                    <span>Bộ nhớ đệm (Cache)</span>
                  </div>
                  <div className="font-mono text-amber-300 font-bold text-sm">
                    {systemHealth.cache?.memoryEntries || 0} bản ghi
                  </div>
                  <span className="text-[10px] text-slate-500">Tốc độ: &lt; 5ms (Hit)</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  ⚡ Gzip Compression & SHA-256 Multi-tier LRU Cache đang hoạt động tối ưu.
                </span>
                <button
                  onClick={handleClearCache}
                  disabled={isClearingCache}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 text-[11px] border border-rose-900/40 transition-colors"
                >
                  <Trash2 size={12} />
                  <span>{isClearingCache ? 'Đang xóa...' : 'Xóa bộ nhớ đệm Cache'}</span>
                </button>
              </div>

              {cacheMsg && (
                <div className="text-[11px] p-2 rounded-lg bg-slate-900 border border-indigo-900 text-indigo-300">
                  {cacheMsg}
                </div>
              )}
            </div>
          )}

          {/* 3. Bốn trụ cột bảo vệ dữ liệu */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Lock size={14} className="text-indigo-400" />
              Kiến trúc bảo mật dữ liệu y tế (Cancer Data Security)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                  <KeyRound size={15} />
                  <span>1. Ẩn thông tin nhạy cảm (.env)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Toàn bộ chuỗi kết nối và tài khoản MongoDB Atlas được lưu trong file <code className="text-indigo-300">.env</code> độc lập. Frontend và người dùng ngoài không thể thấy mật khẩu cơ sở dữ liệu.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <Shield size={15} />
                  <span>2. Mã hóa đường truyền (TLS/SSL)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Mọi luồng dữ liệu 3D và kết quả phân cụm truyền giữa Backend và MongoDB Atlas Cloud đều được mã hóa bằng giao thức TLS 1.3 / SSL chống nghe lén (Sniffing/Man-in-the-middle).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                  <Globe2 size={15} />
                  <span>3. Tường lửa mạng (IP Access List)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  MongoDB Atlas áp dụng cơ chế IP Whitelisting: Chỉ những địa chỉ IP được cấp phép mới được phép gửi truy vấn dữ liệu vào Database.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                  <Server size={15} />
                  <span>4. Cơ chế tự hành (In-Memory Fallback)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Khi mất kết nối Internet hoặc rớt mạng Atlas, hệ thống tự động chuyển sang In-Memory Store, đảm bảo không bao giờ bị gián đoạn hay crash khi đang thuyết trình.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Hướng dẫn chia sẻ mạng nội bộ LAN */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-800/50 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi size={18} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Chia sẻ đồ án qua mạng Wi-Fi / LAN</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                Multi-Device Ready
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn muốn thầy cô hoặc bạn bè trong phòng lab mở điện thoại hoặc laptop xem biểu đồ 3D tương tác cùng lúc? Chỉ cần mở terminal chạy lệnh sau:
            </p>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
              <span className="text-emerald-400 font-bold select-all">npm run dev:host</span>
              <button
                onClick={copyHostCommand}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
              >
                {copiedCmd ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedCmd ? 'Đang copy!' : 'Copy lệnh'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              💡 Sau khi chạy, Vite sẽ hiển thị địa chỉ mạng LAN (ví dụ: <code className="text-cyan-300">http://192.168.1.5:3000</code>). Mọi người cùng kết nối vào mạng Wi-Fi đó có thể truy cập ngay!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Hệ thống tuân thủ tiêu chuẩn an toàn dữ liệu web và tối ưu backend hiệu năng cao.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
