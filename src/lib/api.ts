/**
 * Địa chỉ máy chủ đọc từ biến môi trường, KHÔNG ghi cứng.
 *
 * Trước đây file này ghi cứng địa chỉ và đổi bằng cách comment dòng này bỏ dòng
 * kia — trong khi `.env` đã có sẵn `NEXT_PUBLIC_API_HOST` mà không ai đọc. Hậu
 * quả: muốn trỏ sang máy chủ khác (Colab, cloudflared, máy cục bộ) phải sửa mã
 * nguồn rồi build lại.
 *
 * Bỏ dấu `/` ở cuối để `${API_HOST}/api/chat` không thành `//api/chat`.
 */
export const API_HOST = (
  process.env.NEXT_PUBLIC_API_HOST ?? "http://localhost:5000"
).replace(/\/+$/, "");

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
export function resolveImageUrl(image: ChatImage | null | undefined): string {
  if (!image) return "";
  const raw = (image.image_url || image.image_path || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const normalized = raw.replace(/\\/g, "/");
  const marker = "/database/images/";
  const relative = normalized.includes(marker)
    ? `/images/${normalized.split(marker)[1]}`
    : normalized;

  return `${API_HOST}${relative.startsWith("/") ? "" : "/"}${relative}`;
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

export async function sendChatMessage(question: string): Promise<ChatResponse> {
  const response = await fetch(`${API_HOST}/api/chat`, {
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
): Promise<ChatResponse> {
  const response = await fetch(`${API_HOST}/api/chat/stream`, {
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
