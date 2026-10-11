// Kartlara soru: açılımı ve soruyu Claude'a gönderir, kişisel bir yorum döndürür.
// API anahtarı Netlify ortam değişkeninden (ANTHROPIC_API_KEY) okunur; tarayıcıya hiç gitmez.
import Anthropic from "@anthropic-ai/sdk";

export const config = { path: "/api/ask" };

const SYSTEM = `You are a warm, insightful tarot reader writing in Turkish for a personal tarot web app.

You receive the querent's question, the cards drawn (with position, orientation and keywords) and a rule-based summary the app already showed. Write a reading that answers the question through the cards: show how the cards relate to one another and to the question, not just what each card means alone. Build on the summary rather than repeating it.

Address the querent as "sen", in natural, flowing Turkish. Keep it short: 2-3 brief paragraphs, about 120 words in total, plain prose with no headings, lists or markdown. End with one concrete, gentle piece of advice.

Tarot here is for reflection and fun: speak about tendencies and possibilities, never certainties. For health, legal or money matters, don't make predictions; gently suggest a professional instead. If the question is unrelated to the reading or to tarot, briefly steer back to the cards.`;

const clip = (s, n) => String(s ?? "").slice(0, n);

export default async (req) => {
  if (req.method !== "POST") return Response.json({ error: "Yalnızca POST" }, { status: 405 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Geçersiz istek" }, { status: 400 }); }

  const question = clip(body.question, 300).trim();
  const cards = Array.isArray(body.cards) ? body.cards.slice(0, 3) : [];
  if (!question || !cards.length) return Response.json({ error: "Soru ve kartlar gerekli" }, { status: 400 });

  const cardLines = cards.map((c, i) =>
    `${i + 1}. ${clip(c.position, 40)} — ${clip(c.name, 60)}${c.reversed ? " (ters)" : ""}: ${clip(c.keywords, 200)}`).join("\n");
  const prompt = `Açılım: ${clip(body.spread, 60)}
Kartlar:
${cardLines}

Uygulamanın gösterdiği özet:
${clip(body.summary, 3000)}

Soru: ${question}`;

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    if (response.stop_reason === "refusal") {
      return Response.json({ error: "Kartlar bu soruya cevap vermedi. Soruyu farklı sormayı dene." }, { status: 422 });
    }
    const answer = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    if (!answer) return Response.json({ error: "Boş cevap geldi, tekrar dene." }, { status: 502 });
    return Response.json({ answer });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Invalid API key");
      return Response.json({ error: "API anahtarı geçersiz." }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Çok fazla istek; biraz sonra tekrar dene." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      // Kredi bittiğinde de buraya düşer (400, "credit balance is too low")
      console.error(`API error ${error.status}:`, error.message);
      return Response.json({ error: "Şu an kartlara ulaşılamıyor." }, { status: 502 });
    }
    console.error(error);
    return Response.json({ error: "Şu an kartlara ulaşılamıyor." }, { status: 500 });
  }
};
