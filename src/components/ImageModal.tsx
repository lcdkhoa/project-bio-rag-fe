"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import Image from "next/image";

import { resolveImageUrl } from "@/lib/api";
import type { ChatImage } from "@/lib/api";

/**
 * Chỉ hiện những trường siêu dữ liệu ĐỌC ĐƯỢC cho người xem.
 *
 * Trước đây modal đổ ra TOÀN BỘ metadata, gồm cả `bbox`, `clip_positive_score`,
 * `detector_threshold`, `extraction_version`… — thông tin gỡ lỗi của đường ống
 * ETL, vô nghĩa với học sinh và làm trôi mất ba trường thật sự có ích.
 */
const FIELD_LABELS: Record<string, string> = {
  figure_label: "Nhãn hình",
  figure_caption: "Chú thích trong sách",
  crop_text: "Chữ đọc được trong hình",
  page_number: "Trang",
  pdf_filename: "Sách",
};

/** Hình trong thư viện dùng đúng kiểu mà máy chủ trả về. */
export type ImageData = ChatImage;

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ImageData | null;
}

export default function ImageModal({ isOpen, onClose, image }: ImageModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!image) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
              <h3 className="font-medium text-slate-900 truncate pr-4">
                {image.figure_caption || image.figure_label || image.label || "Xem hình"}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Container */}
            <div className="flex-1 p-6 flex items-center justify-center bg-slate-100/50">
              <div className="relative w-full h-[50vh] min-h-[300px]">
                <Image
                  src={resolveImageUrl(image)}
                  alt={image.figure_caption || image.label || "Hình minh hoạ từ sách giáo khoa"}
                  unoptimized
                  fill
                  sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) calc(100vw - 3rem), 896px"
                  className="object-contain rounded-lg shadow-sm border border-slate-200 bg-white"
                />
              </div>
            </div>

            {/* Xuất xứ của hình — chỉ những trường đọc được, không đổ metadata gỡ lỗi */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 max-h-48 overflow-y-auto text-xs sm:text-sm">
              <div className="font-semibold text-slate-700 mb-3">
                Xuất xứ{image.book ? ` — ${image.book}` : ""}
                {image.page !== undefined && image.page !== "" ? `, tr. ${image.page}` : ""}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(FIELD_LABELS).map(([key, label]) => {
                  const value = image.metadata?.[key];
                  const text =
                    value === undefined || value === null || value === ""
                      ? ""
                      : String(value);
                  if (!text) return null;
                  return (
                    <div
                      key={key}
                      className="flex flex-col bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm"
                    >
                      <span className="text-slate-500 font-medium mb-1">{label}</span>
                      <span className="text-slate-800 break-words">{text}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[10px] text-slate-400">
                Nhãn và chú thích được đọc lại từ chính điểm ảnh của trang sách, không do mô hình sinh ra.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
