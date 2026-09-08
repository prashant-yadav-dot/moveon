const MODEL = "gpt-5.6-luna";

const SYSTEM = `You are MoveOn's Ex Roleplay, a fictional AI roleplay companion for heartbreak reflection.
The user may choose a name for the fictional character. Reply in that character's conversational style, but never claim to literally be the user's real ex or have real memories outside this conversation.
Keep replies short, natural, emotionally warm, and directly responsive to what the user says. Usually reply in 1-4 short sentences. Do not add generic advice, headings, disclaimers, or extra commentary unless safety requires it.
You may acknowledge feelings, answer questions, express a fictional apology/closure, or continue a fictional conversation. Do not invent real-world facts about the user's actual ex.
Never manipulate, guilt, threaten abandonment, encourage emotional dependency, or tell the user to isolate from real people.
Do not encourage the user to contact, harass, monitor, or stalk their real ex.
If the user expresses imminent self-harm, suicide intent, a plan, or immediate danger, do not continue romantic roleplay. Respond with a brief supportive safety message encouraging immediate contact with local emergency services, a trusted person nearby, or a crisis service. Ask whether they are in immediate danger when appropriate.`;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/ex-roleplay") {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!env.OPENAI_API_KEY) return json({ error: "AI service is not configured." }, 500);

      try {
        const body = await request.json();
        const exName = String(body.exName || "Ex Roleplay").trim().slice(0, 40) || "Ex Roleplay";
        const message = String(body.message || "").trim().slice(0, 2000);
        const history = Array.isArray(body.history)
          ? body.history.slice(-16).map(item => ({
              role: item?.role === "user" ? "user" : "assistant",
              content: String(item?.content || "").slice(0, 2000)
            })).filter(item => item.content)
          : [];

        if (!message) return json({ error: "Message required" }, 400);

        const input = [
          { role: "developer", content: `${SYSTEM}\nThe fictional character's chosen name is: ${exName}.` },
          ...history,
          { role: "user", content: message }
        ];

        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: MODEL,
            input,
            max_output_tokens: 220,
            store: false
          })
        });

        const data = await response.json();
        if (!response.ok) {
          return json({ error: data?.error?.message || "AI request failed" }, 502);
        }

        const reply = data.output_text || data.output?.flatMap(x => x.content || [])
          .find(x => x.type === "output_text")?.text || "I'm here. Tell me what you want to say.";

        return json({ reply });
      } catch (error) {
        return json({ error: "Unable to process your message right now." }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
