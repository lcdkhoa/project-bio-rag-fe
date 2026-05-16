const API_HOST = "https://kings-adapters-fate-feeling.trycloudflare.com";

export interface ChatResponse {
  answer: string;
  images: Array<{
    image_path: string;
    label?: string;
    metadata?: Record<string, any>;
  }>;
}
console.log(API_HOST);
export async function sendChatMessage(question: string): Promise<ChatResponse> {
  const response = await fetch(`${API_HOST}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return await response.json();
}
