import { ENV } from "./env";
import { invokeLLM } from "./llm";
import { invokeArena, isArenaConfigured } from "./arena";
import { invokeGemini, isGeminiConfigured } from "./gemini";

type DebateMessage = { role: "user" | "assistant"; content: string };
type Candidate = { name: string; answer: string };

type DeepSeekResponse = { choices?: Array<{ message?: { content?: string } }> };

function isDeepSeekConfigured() {
  return Boolean(ENV.deepseekApiKey.trim());
}

async function invokeDeepSeek(input: { messages: DebateMessage[]; system: string; maxTokens: number }) {
  const response = await fetch(`${(ENV.deepseekApiUrl || "https://api.deepseek.com").replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${ENV.deepseekApiKey.trim()}` },
    body: JSON.stringify({
      model: ENV.deepseekModel || "deepseek-chat",
      messages: [{ role: "system", content: input.system }, ...input.messages],
      max_tokens: input.maxTokens,
      temperature: 0.2,
    }),
  });
  if (!response.ok) throw new Error(`DeepSeek request failed: ${response.status}`);
  const payload = (await response.json()) as DeepSeekResponse;
  const answer = payload.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("DeepSeek returned an empty answer");
  return answer;
}

async function settleCandidate(name: string, job: Promise<string>): Promise<Candidate | null> {
  try {
    const answer = await job;
    return answer.trim() ? { name, answer: answer.trim() } : null;
  } catch (error) {
    console.warn(`${name} candidate unavailable`, error instanceof Error ? error.message : "unknown error");
    return null;
  }
}

export async function runModelDebate(input: {
  messages: DebateMessage[];
  system: string;
  locale: string;
  task: boolean;
}) {
  const candidateSystem = `${input.system}\nأنت عضو مستقل في غرفة مناقشة داخلية. أجب عن الطلب بأفضل حل عملي وباللغة ${input.locale}. ${input.task ? "هذه مهمة تنفيذية؛ قدّم نتيجة قابلة للاستخدام، لا تكتفِ بوصف ما يمكن فعله." : "هذه محادثة؛ قدّم إجابة دقيقة ومباشرة."} استخدم Markdown للجداول عند الحاجة. استخدم صورة Markdown أو رابط فيديو فقط إذا كان لديك رابط حقيقي قدمه المستخدم أو مصدر موثوق؛ لا تخترع أي رابط ولا تدّعِ إنشاء ملف لم يتم إنشاؤه. لا تذكر أنك عضو في غرفة مناقشة ولا أسماء الخدمات في إجابتك.`;
  const jobs: Array<[string, Promise<string>]> = [
    ["chatgpt", invokeLLM({ model: ENV.chatgptModel || "gpt-5-mini", messages: [{ role: "system", content: candidateSystem }, ...input.messages], maxTokens: 700 }).then((result) => {
      const content = result.choices?.[0]?.message?.content;
      return typeof content === "string" ? content : "";
    })],
    ["gemini", invokeLLM({ model: "gemini-3-flash-preview", messages: [{ role: "system", content: candidateSystem }, ...input.messages], maxTokens: 700 }).then((result) => {
      const content = result.choices?.[0]?.message?.content;
      return typeof content === "string" ? content : "";
    })],
  ];
  if (isArenaConfigured()) jobs.push(["arena", invokeArena({ system: candidateSystem, messages: input.messages, maxTokens: 800 })]);
  if (isGeminiConfigured()) jobs.push(["gemini-api", invokeGemini({ system: candidateSystem, messages: input.messages, maxTokens: 800 })]);
  if (isDeepSeekConfigured()) jobs.push(["deepseek", invokeDeepSeek({ system: candidateSystem, messages: input.messages, maxTokens: 800 })]);

  const candidates = (await Promise.all(jobs.map(([name, job]) => settleCandidate(name, job)))).filter((candidate): candidate is Candidate => Boolean(candidate));
  if (candidates.length === 0) throw new Error("No model produced a usable answer");
  if (candidates.length === 1) return candidates[0].answer;

  const evidence = candidates.map((candidate, index) => `إجابة داخلية ${index + 1}:\n${candidate.answer}`).join("\n\n");
  const judge = await invokeLLM({
    model: ENV.judgeModel || "gpt-5",
    messages: [{
      role: "system",
      content: `أنت الحكم النهائي في غرفة مناقشة داخلية. اجمع أفضل ما في الإجابات التالية، صحح التعارضات والهلوسة، ولا تذكر أسماء النماذج أو وجود مناقشة داخلية. أجب مباشرة وباللغة ${input.locale}. استخدم Markdown للجداول عندما تكون البيانات جدوليّة. احتفظ بروابط الصور والفيديو الحقيقية كما هي، ولا تنشئ روابط وهمية. إذا كانت المهمة تتطلب صورة أو ملفًا ولم يتم إنشاؤه فعليًا، قل بوضوح إنك تقدم مواصفات جاهزة للتنفيذ ولا تدّعي وجود ملف.\n\n${evidence}`,
    }, { role: "user", content: input.messages[input.messages.length - 1]?.content ?? "" }],
    maxTokens: 1000,
  });
  const finalAnswer = judge.choices?.[0]?.message?.content;
  if (typeof finalAnswer !== "string" || !finalAnswer.trim()) return candidates[0].answer;
  return finalAnswer.trim();
}
