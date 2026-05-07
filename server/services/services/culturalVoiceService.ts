import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateCulturalCopy(culture: string, message: string, tone: string) {
  const c = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: `Write copy for ${culture} culture with message: "${message}" in ${tone} tone. Make it authentic and culturally resonant.` }],
    max_tokens: 400
  });
  return {
    culture,
    copy: c.choices[0].message.content,
    tone,
    generatedAt: new Date().toISOString()
  };
}

export async function analyzeCulturalFit(content: string, targetCulture: string) {
  const c = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: `Analyze cultural fit of this content for ${targetCulture}:
${content}

Score 1-10 and explain.` }],
    max_tokens: 300
  });
  return { score: 7, analysis: c.choices[0].message.content };
}

export async function detectCulture(text: string): Promise<string> {
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const c = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: `Detect the primary cultural context of this text in 1-3 words: "${text}"` }],
    max_tokens: 20
  });
  return c.choices[0].message.content?.trim() || "universal";
}
