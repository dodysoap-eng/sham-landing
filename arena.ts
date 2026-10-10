import { ENV } from "./env";

type ArenaMessage = { role: "user" | "assistant"; content: string };
type ArenaResponse = { content?: Array<{ type: string; text?: string }> };

const baseUrl = () => (ENV.arenaApiUrl || "https://api.preview.arena.ai").replace(/\/$/, "");

export function isArenaConfigured() {
  return Boolean(ENV.arenaApiKey);
}

export async function invokeArena(input: {
  messages: ArenaMessage[];
  system: string;
  maxTokens?: number;
}) {
  if (!ENV.arenaApiKey) throw new Error("Arena AI غير مفعّل. أضف ARENA_API_KEY إلى إعدادات الخادم.");
  const response = await fetch(`${baseUrl()}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ENV.arenaApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ENV.arenaModel || "coding-router-preview",
      max_tokens: input.maxTokens ?? 900,
      system: input.system,
      messages: input.messages,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Arena AI فشل في الرد (${response.status}): ${detail.slice(0, 300)}`);
  }
  const payload = (await response.json()) as ArenaResponse;
  const answer = payload.content?.filter((item) => item.type === "text").map((item) => item.text || "").join("\n").trim();
  if (!answer) throw new Error("Arena AI أرسل ردًا فارغًا.");
  return answer;
}
