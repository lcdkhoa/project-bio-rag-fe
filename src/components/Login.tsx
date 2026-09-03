"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Dna, ArrowRight, Server, Settings2 } from "lucide-react";
import { useStoredApiHost } from "@/lib/useStoredApiHost";

interface LoginProps {
  onLogin: (name: string) => void;
  onOpenSettings?: () => void;
}

export default function Login({ onLogin, onOpenSettings }: LoginProps) {
  const [name, setName] = useState("");
  const { isCustom, apiHost } = useStoredApiHost();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim());
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-white/80 border border-slate-200 backdrop-blur-xl rounded-3xl p-8 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />

        {/* Nút cài đặt máy chủ ở góc trên */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 rounded-xl transition-colors flex items-center gap-1.5"
            title={`Cấu hình máy chủ API (Đang dùng: ${apiHost})`}
          >
            <Server className="w-4 h-4" />
            <span
              className={`w-2 h-2 rounded-full ${
                isCustom ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
          </button>
        )}

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
            <Dna className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 text-center">
            Trợ lý Khoa học tự nhiên
          </h1>
          <p className="text-slate-500 mt-2 text-center text-sm">
            Nhập tên của em để bắt đầu tra cứu kho tri thức 12 cuốn sách giáo khoa Khoa học tự nhiên lớp 6-9.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên của em..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:shadow-none group cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Bắt đầu hỏi</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Thanh trạng thái máy chủ ở chân card */}
        {onOpenSettings && (
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span
              className="truncate max-w-[200px]"
              title={`Máy chủ hiện hành: ${apiHost}`}
            >
              Máy chủ:{" "}
              <span className="text-slate-600 font-medium">
                {isCustom ? "Tùy chỉnh" : "Mặc định"}
              </span>
            </span>
            <button
              type="button"
              onClick={onOpenSettings}
              className="hover:text-emerald-600 font-medium flex items-center gap-1 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Đổi máy chủ</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
