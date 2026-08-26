"use client";

import { Fragment, useMemo } from "react";
import katex from "katex";

import { prettifyChemistry, splitLatexSegments } from "@/lib/formula";

interface RichTextProps {
  content: string;
  /** Câu của người dùng dùng nền xanh, nên chữ đậm phải đổi màu cho đọc được. */
  variant?: "bot" | "user";
}

function MathSpan({ value, display }: { value: string; display?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(value, {
        displayMode: Boolean(display),
        throwOnError: false,
        // `\ce{...}` cần gói mhchem của KaTeX; chưa nạp nên để mô hình dùng cú
        // pháp toán thường. `throwOnError: false` khiến công thức hỏng hiện ra
        // dạng đỏ thay vì làm sập cả tin nhắn.
        strict: false,
      });
    } catch {
      return "";
    }
  }, [value, display]);

  if (!html) {
    // Dựng hỏng thì hiện NGUYÊN VĂN công thức, không nuốt mất nội dung.
    return <code className="text-[0.95em]">{value}</code>;
  }

  return (
    <span
      className={display ? "block my-2 overflow-x-auto" : "inline-block align-middle"}
      // Chuỗi này do KaTeX sinh ra từ chính công thức, không phải HTML người dùng nhập.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Vẽ câu trả lời: chữ đậm `**...**`, công thức LaTeX, và công thức hoá học viết
 * phẳng được hạ chỉ số dưới.
 *
 * Thứ tự xử lý có chủ ý: **tách công thức LaTeX TRƯỚC**, rồi mới hạ chỉ số dưới
 * cho phần chữ còn lại. Làm ngược sẽ phá chính nội dung LaTeX (`H_2O` bên trong
 * `$...$` không được đụng vào).
 */
export default function RichText({ content, variant = "bot" }: RichTextProps) {
  const boldClass = variant === "user" ? "text-white" : "text-emerald-700";

  return (
    <div className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
      {splitLatexSegments(content).map((segment, segmentIndex) => {
        if (segment.kind === "math") {
          return (
            <MathSpan
              key={`math-${segmentIndex}`}
              value={segment.value}
              display={segment.display}
            />
          );
        }

        return (
          <Fragment key={`text-${segmentIndex}`}>
            {prettifyChemistry(segment.value)
              .split("**")
              .map((part, partIndex) =>
                partIndex % 2 === 1 ? (
                  <strong key={partIndex} className={boldClass}>
                    {part}
                  </strong>
                ) : (
                  <Fragment key={partIndex}>{part}</Fragment>
                ),
              )}
          </Fragment>
        );
      })}
    </div>
  );
}
