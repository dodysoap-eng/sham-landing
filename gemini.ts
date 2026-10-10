import { ENV } from "./env";

type GeminiMessage = { role: "user" | "assistant"; content: string };
type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

const baseUrl = () => (ENV.geminiApiUrl || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");

export function isGeminiConfigured() {
  return Boolean(ENV.geminiApiKey?.trim());
}

export async function invokeGemini(input: {
  messages: GeminiMessage[];
  system: string;
  maxTokens?: number;
}) {
  const apiKey = ENV.geminiApiKey.trim();
  if (!apiKey) throw new Error("Gemini غير مفعّل.");
  const model = ENV.geminiModel || "gemini-2.5-flash";
  const response = await fetch(`${baseUrl()}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.system }] },
      contents: input.messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      generationConfig: { maxOutputTokens: input.maxTokens ?? 900 },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini فشل في الرد (${response.status}): ${detail.slice(0, 300)}`);
  }
  const payload = (await response.json()) as GeminiResponse;
  const answer = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim();
  if (!answer) throw new Error("Gemini أرسل ردًا فارغًا.");
  return answer;
}
