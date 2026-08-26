"use client";

import { BookOpen } from "lucide-react";

import type { Citation } from "@/lib/api";

interface CitationsProps {
  citations?: Citation[];
}

/**
 * Danh sách nguồn của một câu trả lời.
 *
 * Đây là bảo đảm quan trọng nhất của hệ thống, và trước bản này nó **không tới
 * được mắt học sinh**: máy chủ dựng trích dẫn xác định từ metadata của chính
 * đoạn văn bản được truy xuất, nhưng giao diện chỉ đọc `answer` và `images`,
 * bỏ hẳn danh sách nguồn.
 *
 * Số trang ở đây **không do mô hình ngôn ngữ sinh ra**, nên nó không thể bịa —
 * khác hẳn một chatbot tự nói "trang 103". Vì vậy phần này hiển thị tách bạch,
 * không trộn vào câu trả lời.
 */
export default function Citations({ citations }: CitationsProps) {
  if (!citations?.length) return null;

  return (
    <div className="mt-3 w-full">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
        <BookOpen className="w-3.5 h-3.5" />
        <span>Nguồn trích dẫn ({citations.length})</span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {citations.map((citation, index) => (
          <li
            key={`${citation.book}-${citation.page}-${citation.section ?? ""}-${index}`}
            className="inline-flex items-baseline gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-900"
          >
            <span className="font-medium">{citation.book}</span>
            <span className="text-emerald-700">tr. {citation.page}</span>
            {citation.section ? (
              <span className="text-emerald-600 italic">· {citation.section}</span>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[10px] text-slate-400">
        Số trang lấy từ siêu dữ liệu của đoạn sách được truy xuất, không do mô hình tự viết ra.
      </p>
    </div>
  );
}
