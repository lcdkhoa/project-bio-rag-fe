"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Server,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Activity,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useStoredApiHost } from "@/lib/useStoredApiHost";
import { checkApiHealth } from "@/lib/api";

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ServerSettingsDialog({ onClose }: { onClose: () => void }) {
  const { apiHost, customHost, isCustom, defaultHost, setHost, resetHost } =
    useStoredApiHost();

  const [inputUrl, setInputUrl] = useState(customHost ?? defaultHost);
  const [isChecking, setIsChecking] = useState(false);
  const [healthResult, setHealthResult] = useState<{
    ok: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Khóa cuộn trang khi modal hiển thị
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleTestConnection = async () => {
    const target = inputUrl.trim() || defaultHost;
    setIsChecking(true);
    setHealthResult(null);

    try {
      const res = await checkApiHealth(target);
      setHealthResult(res);
    } catch {
      setHealthResult({
        ok: false,
        message: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại URL.",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputUrl.trim().replace(/\/+$/, "");

    if (!clean || clean === defaultHost) {
      resetHost();
    } else {
      setHost(clean);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  const handleResetToDefault = () => {
    setInputUrl(defaultHost);
    resetHost();
    setHealthResult(null);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Lớp nền mờ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      {/* Hộp thoại */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10"
      >
        {/* Thanh màu trang trí */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500" />

        {/* Tiêu đề */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                Cấu hình máy chủ API
              </h3>
              <p className="text-xs text-slate-500">
                Địa chỉ kết nối dịch vụ RAG backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung form */}
        <div className="p-6 space-y-5">
          {/* Thẻ trạng thái hiện tại */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Máy chủ đang hoạt động:
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  isCustom
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                }`}
              >
                {isCustom ? "Tùy chỉnh (FE)" : "Mặc định (.env)"}
              </span>
            </div>
            <div className="text-xs font-mono text-slate-800 break-all select-all">
              {apiHost}
            </div>
          </div>

          {/* Nhập URL mới */}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label
                htmlFor="api-url-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Địa chỉ máy chủ mới (URL)
              </label>
              <div className="relative">
                <input
                  id="api-url-input"
                  type="text"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    setHealthResult(null);
                  }}
                  placeholder="https://...trycloudflare.com hoặc http://localhost:5000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
                {inputUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputUrl("");
                      setHealthResult(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>

            {/* Nút kiểm tra kết nối */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isChecking || !inputUrl.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>Đang kiểm tra...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Kiểm tra kết nối</span>
                  </>
                )}
              </button>

              {/* Nút mở nhanh link */}
              {inputUrl.startsWith("http") && (
                <a
                  href={inputUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  <span>Mở link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Kết quả kiểm tra kết nối */}
            {healthResult && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                  healthResult.ok
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
                    : "bg-rose-50/80 border-rose-200 text-rose-800"
                }`}
              >
                {healthResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 leading-relaxed">
                  <span className="font-semibold">
                    {healthResult.ok ? "Thành công: " : "Lỗi: "}
                  </span>
                  {healthResult.message}
                </div>
              </motion.div>
            )}

            {/* Thông báo lưu thành công */}
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Đã lưu cấu hình máy chủ thành công!</span>
              </motion.div>
            )}

            {/* Ghi chú trợ giúp */}
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-[11px] leading-relaxed text-amber-900/80">
              💡 <span className="font-semibold">Mẹo:</span> Khi chạy backend
              qua Google Colab hoặc Cloudflare Tunnel, mỗi lần chạy máy chủ sẽ
              cấp một địa chỉ <code>*.trycloudflare.com</code> mới. Bạn chỉ cần
              dán link mới vào đây là hệ thống tự kết nối được ngay.
            </div>
          </form>
        </div>

        {/* Chân trang (Hành động) */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium py-1.5 px-2.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Khôi phục về địa chỉ máy chủ mặc định trong hệ thống"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục mặc định</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              className="px-4 py-2 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ServerSettingsModal({
  isOpen,
  onClose,
}: ServerSettingsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && <ServerSettingsDialog onClose={onClose} />}
    </AnimatePresence>
  );
}
