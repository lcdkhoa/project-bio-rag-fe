const API_HOST = "https://lcdkhoa-bio-rag-be.hf.space";
// const API_HOST = "http://localhost:5000";

export interface ChatImage {
  image_path: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  answer: string;
  images: ChatImage[];
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

  return {
    answer:
      "answer" in responsePayload && typeof responsePayload.answer === "string"
        ? responsePayload.answer
        : fallbackAnswer,
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

  return {
    answer,
    images: [],
  };
}
