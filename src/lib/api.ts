/**
 * Quản lý địa chỉ máy chủ API (API Host).
 *
 * Thứ tự ưu tiên:
 * 1. URL tùy chỉnh do người dùng nhập trên FE (lưu trong `localStorage`)
 * 2. Biến môi trường `NEXT_PUBLIC_API_HOST`
 * 3. URL dự phòng mặc định (Cloudflare tunnel / máy cục bộ)
 *
 * Bỏ dấu `/` ở cuối để `${host}/api/chat` không thành `//api/chat`.
 */
export const DEFAULT_API_HOST = (
  process.env.NEXT_PUBLIC_API_HOST ||
  "https://styles-peak-commissions-pacific.trycloudflare.com"
).replace(/\/+$/, "");

export const STORAGE_KEY_API_HOST = "rag_api_host";

const hostListeners = new Set<() => void>();

export function subscribeApiHost(listener: () => void) {
  hostListeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    hostListeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

export function emitApiHostChange() {
  hostListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore
    }
  });
}

/**
 * Lấy URL tùy chỉnh người dùng đã lưu trong localStorage (nếu có).
 */
export function getCustomApiHost(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY_API_HOST);
    return stored && stored.trim() ? stored.trim().replace(/\/+$/, "") : null;
  } catch {
    return null;
  }
}

/**
 * Lấy URL máy chủ đang áp dụng (ưu tiên override > custom lưu trong FE > DEFAULT).
 */
export function getApiHost(hostOverride?: string): string {
  if (hostOverride && hostOverride.trim()) {
    return hostOverride.trim().replace(/\/+$/, "");
  }
  const custom = getCustomApiHost();
  if (custom) {
    return custom;
  }
  return DEFAULT_API_HOST;
}

/**
 * Lưu URL máy chủ do người dùng nhập từ FE vào localStorage.
 */
export function setCustomApiHost(host: string): void {
  if (typeof window === "undefined") return;
  try {
    const cleanHost = host.trim().replace(/\/+$/, "");
    if (cleanHost) {
      localStorage.setItem(STORAGE_KEY_API_HOST, cleanHost);
    } else {
      localStorage.removeItem(STORAGE_KEY_API_HOST);
    }
  } catch {
    // ignore
  }
  emitApiHostChange();
}

/**
 * Xoá URL tùy chỉnh, khôi phục về mặc định.
 */
export function resetCustomApiHost(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_API_HOST);
  } catch {
    // ignore
  }
  emitApiHostChange();
}

/**
 * Kiểm tra xem người dùng có đang dùng URL tùy chỉnh hay không.
 */
export function isCustomApiHostSet(): boolean {
  return getCustomApiHost() !== null;
}

/**
 * Kiểm tra kết nối tới máy chủ API.
 */
export async function checkApiHealth(
  targetHost?: string,
): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
  const host = (targetHost || getApiHost()).replace(/\/+$/, "");
  if (!host) {
    return { ok: false, message: "Địa chỉ máy chủ trống." };
  }

  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "" }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - start);

    if (response.ok || response.status === 400 || response.status === 422) {
      return {
        ok: true,
        message: `Kết nối thành công (${latencyMs}ms)`,
        latencyMs,
      };
    }

    return {
      ok: false,
      message: `Máy chủ phản hồi mã ${response.status}: ${response.statusText}`,
      latencyMs,
    };
  } catch (error: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const err = error as Error;
    if (err?.name === "AbortError") {
      return { ok: false, message: "Kết nối quá thời gian chờ (hết 6 giây)." };
    }
    return {
      ok: false,
      message:
        err?.message ||
        "Không thể kết nối đến máy chủ. Kiểm tra lại địa chỉ hoặc xem máy chủ đã bật chưa.",
      latencyMs,
    };
  }
}

/**
 * Hằng số giữ lại để tương thích ngược.
 */
export const API_HOST = DEFAULT_API_HOST;


export interface ChatImage {
  image_path: string;
  /** Đường dẫn tương đối dưới máy chủ, vd `/images/SGK_KHTN_7_CTST/page_108_img_0.png`. */
  image_url?: string;
  label?: string;
  /** Nhãn hình đọc lại từ điểm ảnh của trang gốc, vd `Hình 23.1`. */
  figure_label?: string;
  /** Dòng chú thích đọc lại từ trang gốc. */
  figure_caption?: string;
  page?: number | string;
  /** Tên sách để hiển thị, vd `Khoa học tự nhiên 7 (Chân trời sáng tạo)`. */
  book?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Một nguồn trích dẫn. Máy chủ dựng nó từ metadata của chính đoạn văn bản được
 * truy xuất — **mô hình ngôn ngữ không sinh ra số trang này**, nên nó không thể
 * bịa. Đó là lý do phải hiển thị tách bạch chứ không để lẫn vào câu trả lời.
 */
export interface Citation {
  book: string;
  page: number | string;
  section?: string | null;
  display: string;
}

export interface ChatResponse {
  /** Câu trả lời KÈM khối "📚 Nguồn:" dạng chữ (giữ để tương thích ngược). */
  answer: string;
  /** Câu trả lời KHÔNG có khối nguồn — đây là thứ nên hiển thị. */
  answer_text?: string;
  citations?: Citation[];
  images: ChatImage[];
}

/**
 * Ghép đường dẫn ảnh do máy chủ trả về thành URL tuyệt đối.
 *
 * Máy chủ trả `/images/<sách>/<tệp>.png` và tự phục vụ tệp đó qua route
 * `/images/<path>`. Ảnh **không** được chép sang frontend: kho ảnh là 4,6 GB và
 * bị dựng lại mỗi lần sửa bước cắt hình, nên một bản sao ở đây sẽ lệch đi mà
 * không có gì báo.
 *
 * Vẫn xử lý được dạng cũ (đường dẫn tuyệt đối của máy đã chạy ETL), để frontend
 * không phụ thuộc vào việc máy chủ đã cập nhật hay chưa.
 */
export function resolveImageUrl(
  image: ChatImage | null | undefined,
  hostOverride?: string,
): string {
  if (!image) return "";
  const raw = (image.image_url || image.image_path || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const normalized = raw.replace(/\\/g, "/");
  const marker = "/database/images/";
  const relative = normalized.includes(marker)
    ? `/images/${normalized.split(marker)[1]}`
    : normalized;

  const host = getApiHost(hostOverride);
  return `${host}${relative.startsWith("/") ? "" : "/"}${relative}`;
}

export interface ChatStreamHandlers {
  onStatus?: (status: string) => void;
  onAnswerDelta?: (delta: string) => void;
  onDone?: (response: ChatResponse) => void;
}

interface ParsedSseEvent {
  eventName: string;
  payload: unknown;
}

function getApiError(response: Response) {
  return new Error(
    `API error: ${response.status} ${response.statusText}`.trim(),
  );
}

function parseSseEvent(rawEvent: string): ParsedSseEvent | null {
  const lines = rawEvent.split(/\r?\n/);
  let eventName = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (!dataLines.length) {
    return null;
  }

  return {
    eventName,
    payload: JSON.parse(dataLines.join("\n")),
  };
}

function getStatusMessage(payload: unknown) {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload && typeof payload === "object" && "status" in payload) {
    return String(payload.status ?? "");
  }

  return "";
}

function getAnswerDelta(payload: unknown) {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload && typeof payload === "object" && "delta" in payload) {
    return String(payload.delta ?? "");
  }

  return "";
}

function getStreamError(payload: unknown) {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    if ("error" in payload && payload.error) {
      return String(payload.error);
    }

    if ("message" in payload && payload.message) {
      return String(payload.message);
    }
  }

  return "Streaming request failed.";
}

function toChatResponse(payload: unknown, fallbackAnswer = ""): ChatResponse {
  const responsePayload = payload && typeof payload === "object" ? payload : {};

  const answer =
    "answer" in responsePayload && typeof responsePayload.answer === "string"
      ? responsePayload.answer
      : fallbackAnswer;

  return {
    answer,
    // Máy chủ cũ chưa có `answer_text`; khi đó dùng luôn `answer` để giao diện
    // vẫn hiện được nội dung (kèm khối nguồn dạng chữ) thay vì trắng trơn.
    answer_text:
      "answer_text" in responsePayload &&
      typeof responsePayload.answer_text === "string"
        ? responsePayload.answer_text
        : answer,
    citations:
      "citations" in responsePayload && Array.isArray(responsePayload.citations)
        ? (responsePayload.citations as Citation[])
        : [],
    images:
      "images" in responsePayload && Array.isArray(responsePayload.images)
        ? (responsePayload.images as ChatImage[])
        : [],
  };
}

export async function sendChatMessage(
  question: string,
  hostOverride?: string,
): Promise<ChatResponse> {
  const host = getApiHost(hostOverride);
  const response = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw getApiError(response);
  }

  return await response.json();
}

export async function sendChatMessageStream(
  question: string,
  handlers: ChatStreamHandlers = {},
  hostOverride?: string,
): Promise<ChatResponse> {
  const host = getApiHost(hostOverride);
  const response = await fetch(`${host}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw getApiError(response);
  }

  if (!response.body) {
    throw new Error("Streaming is not supported by this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let answer = "";
  let finalResponse: ChatResponse | null = null;

  const processRawEvent = (rawEvent: string) => {
    const parsedEvent = parseSseEvent(rawEvent);

    if (!parsedEvent) {
      return;
    }

    const { eventName, payload } = parsedEvent;

    if (eventName === "status") {
      handlers.onStatus?.(getStatusMessage(payload));
      return;
    }

    if (eventName === "answer_delta") {
      const delta = getAnswerDelta(payload);
      if (!delta) {
        return;
      }

      answer += delta;
      handlers.onAnswerDelta?.(delta);
      return;
    }

    if (eventName === "done") {
      finalResponse = toChatResponse(payload, answer);
      handlers.onDone?.(finalResponse);
      return;
    }

    if (eventName === "error") {
      throw new Error(getStreamError(payload));
    }
  };

  const processBufferedEvents = () => {
    const rawEvents = buffer.split(/\r?\n\r?\n/);
    buffer = rawEvents.pop() ?? "";

    for (const rawEvent of rawEvents) {
      processRawEvent(rawEvent);
    }
  };

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    processBufferedEvents();
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    processRawEvent(buffer);
  }

  if (finalResponse) {
    return finalResponse;
  }

  // Luồng kết thúc mà không có sự kiện `done` (mạng đứt giữa chừng): giữ lại
  // phần chữ đã nhận được, và nói rõ là KHÔNG có nguồn — thà thiếu còn hơn để
  // người đọc tưởng câu trả lời này không có trích dẫn nào.
  return {
    answer,
    answer_text: answer,
    citations: [],
    images: [],
  };
}
