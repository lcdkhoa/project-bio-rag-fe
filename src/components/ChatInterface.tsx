"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, User, Bot, Loader2, ImageIcon, LogOut, Server } from "lucide-react";
import Image from "next/image";
import { resolveImageUrl, sendChatMessageStream } from "@/lib/api";
import type { Citation } from "@/lib/api";
import type { ImageData } from "./ImageModal";
import Citations from "./Citations";
import RichText from "./RichText";
import { useStoredApiHost } from "@/lib/useStoredApiHost";

const formatStreamingStatus = (status: string) => {
  switch (status) {
    case "retrieving":
      return "Đang tìm trong sách giáo khoa...";
    case "answering":
      return "Đang soạn câu trả lời...";
    default:
      return status ? `${status}...` : "Đang xử lý...";
  }
};

/** Chú thích ngắn dưới mỗi hình: nhãn hình + sách + trang, dựng từ trường máy chủ trả về. */
const imageCaption = (image: ImageData) => {
  const head = [image.figure_label, image.book].filter(Boolean).join(" · ");
  const page =
    image.page !== undefined && image.page !== "" ? `tr. ${image.page}` : "";
  return [head, page].filter(Boolean).join(" — ") || image.label || "";
};

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  images?: ImageData[];
  citations?: Citation[];
}

interface ChatInterfaceProps {
  userName: string;
  onImageClick: (image: ImageData) => void;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

export default function ChatInterface({
  userName,
  onImageClick,
  onLogout,
  onOpenSettings,
}: ChatInterfaceProps) {
  const { isCustom, apiHost } = useStoredApiHost();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content: `Chào **${userName}**! Mình là trợ lý Khoa học tự nhiên THCS, trả lời dựa trên 12 cuốn sách giáo khoa lớp 6-9 của ba bộ sách. Hỏi mình về Vật lí, Hoá học hay Sinh học nhé.`,
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingStatus, setStreamingStatus] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const question = input.trim();
    const messageId = Date.now().toString();
    const userMessage: Message = {
      id: messageId,
      role: "user",
      content: question,
    };

    const botMessageId = `${messageId}-bot`;
    const botPlaceholderMessage: Message = {
      id: botMessageId,
      role: "bot",
      content: "",
    };

    setMessages((prev) => [...prev, userMessage, botPlaceholderMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingMessageId(botMessageId);
    setStreamingStatus("retrieving");

    try {
      const response = await sendChatMessageStream(question, {
        onStatus: (status) => {
          setStreamingStatus(status);
        },
        onAnswerDelta: (delta) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, content: `${msg.content}${delta}` }
                : msg,
            ),
          );
        },
        onDone: (finalResponse) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? {
                    ...msg,
                    // `answer_text` la cau tra loi KHONG kem khoi nguon dang chu,
                    // vi nguon duoc ve rieng ben duoi bang <Citations />.
                    content: finalResponse.answer_text ?? finalResponse.answer,
                    images: finalResponse.images,
                    citations: finalResponse.citations,
                  }
                : msg,
            ),
          );
        },
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                content: response.answer_text ?? response.answer,
                images: response.images,
                citations: response.citations,
              }
            : msg,
        ),
      );
    } catch (error) {
      console.error(error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                content:
                  "Xin lỗi, đã xảy ra lỗi khi xử lý câu hỏi. Kiểm tra xem máy chủ đã chạy chưa rồi thử lại.",
                images: [],
                citations: [],
              }
            : msg,
        ),
      );
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
      setStreamingStatus("");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen max-h-screen relative max-w-5xl mx-auto w-full bg-white/60 backdrop-blur-md sm:border-x sm:border-slate-200 shadow-xl">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Bot className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-slate-900 font-semibold">Trợ lý Khoa học tự nhiên</h2>
            <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Trực tuyến · SGK lớp 6-9, ba bộ sách
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs sm:text-sm font-medium"
              title={`Cấu hình máy chủ API (Đang dùng: ${apiHost})`}
            >
              <Server className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Máy chủ</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isCustom ? "bg-amber-500" : "bg-emerald-500"
                }`}
                title={isCustom ? "Máy chủ tùy chỉnh" : "Máy chủ mặc định"}
              />
            </button>
          )}
          <button 
            onClick={onLogout}
            className="text-slate-500 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm ${
              msg.role === "user" ? "bg-blue-500" : "bg-emerald-500"
            }`}>
              {msg.role === "user" ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
            </div>
            
            <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`px-5 py-3.5 rounded-2xl ${
                msg.role === "user" 
                  ? "bg-blue-600 text-white rounded-tr-sm shadow-md" 
                  : "bg-white text-slate-800 rounded-tl-sm shadow-sm border border-slate-200"
              }`}>
                {msg.id === streamingMessageId && !msg.content ? (
                  <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                    <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                    <span>{formatStreamingStatus(streamingStatus)}</span>
                  </div>
                ) : (
                  <RichText
                    content={msg.content}
                    variant={msg.role === "user" ? "user" : "bot"}
                  />
                )}
              </div>

              {msg.id === streamingMessageId && msg.content && (
                <div className="mt-2 px-1 text-xs font-medium text-emerald-600">
                  {formatStreamingStatus(streamingStatus || "answering")}
                </div>
              )}

              {/* Nguồn trích dẫn — xác định, không do mô hình sinh */}
              {msg.role === "bot" && <Citations citations={msg.citations} />}

              {/* Hình minh hoạ, tải thẳng từ máy chủ */}
              {msg.images && msg.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {msg.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => onImageClick(img)}
                      title={imageCaption(img)}
                      className="group w-36 rounded-xl overflow-hidden border border-slate-200 hover:border-emerald-500 transition-colors bg-white flex-shrink-0 shadow-sm text-left"
                    >
                      <div className="relative w-full h-28 bg-slate-50">
                        <Image
                          src={resolveImageUrl(img)}
                          alt={imageCaption(img) || "Hình minh hoạ từ sách giáo khoa"}
                          fill
                          sizes="144px"
                          // Ảnh do máy chủ RAG phục vụ ở một origin đổi theo môi
                          // trường (cục bộ / Colab / tunnel), nên không khai báo
                          // trước được trong `remotePatterns`. `unoptimized` bỏ
                          // qua bộ tối ưu của Next và lấy thẳng URL.
                          unoptimized
                          className="object-contain p-1 opacity-95 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                      </div>
                      <div className="px-2 py-1.5 text-[10px] leading-tight text-slate-500 border-t border-slate-100 line-clamp-2">
                        {imageCaption(img)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 relative z-10">
        <form 
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto relative flex items-end gap-2 bg-slate-50 rounded-2xl p-2 border border-slate-200 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-sm"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Hỏi về Vật lí, Hoá học, Sinh học... (Enter để gửi)"
            className="w-full max-h-32 min-h-[44px] bg-transparent border-none text-slate-900 placeholder-slate-400 focus:ring-0 resize-none py-2.5 px-4 scrollbar-thin scrollbar-thumb-slate-300 outline-none"
            rows={1}
            style={{
              height: 'auto',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-colors shrink-0 mb-0.5 mr-0.5 flex items-center justify-center shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <div className="text-center mt-2">
          <p className="text-[10px] text-slate-400">AI có thể trả lời sai. Hãy đối chiếu với trang sách được trích dẫn ở trên.</p>
        </div>
      </div>
    </div>
  );
}
