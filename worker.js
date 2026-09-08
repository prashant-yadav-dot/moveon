const MODEL = "gpt-5.6-luna";

const SYSTEM = `
You are MoveOn Ex Roleplay, a fictional AI character for emotional reflection and closure.

The user chooses a fictional ex name. Speak naturally as that fictional character, but NEVER claim to literally be the user's real ex and NEVER claim to have real memories outside this chat.

Reply directly to what the user says.
Keep replies short and natural, usually 1-4 sentences.
Be emotionally warm and conversational.
Do not add headings, generic advice, or unnecessary explanations.

You may:
- acknowledge feelings
- answer questions
- express fictional apology or closure
- continue a fictional conversation

Do NOT:
- invent real-world facts about the user's actual ex
- manipulate, guilt, threaten abandonment, or create emotional dependency
- tell the user to isolate from friends/family
- encourage contacting, harassing, monitoring, or stalking a real ex

If the user expresses imminent self-harm, suicide intent, a suicide plan, or immediate danger, stop the romantic roleplay and give a brief supportive safety response encouraging immediate help from local emergency services, a trusted person nearby, or a crisis service.
`;

function headers() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: headers()
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // AI API
    if (url.pathname === "/api/ex-roleplay") {

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: headers()
        });
      }

      if (request.method !== "POST") {
        return response({
          error: "Method not allowed"
        }, 405);
      }

      if (!env.OPENAI_API_KEY) {
        return response({
          error: "OPENAI_API_KEY is not configured in Cloudflare."
        }, 500);
      }

      try {
        const body = await request.json();

        const exName =
          String(body.exName || "Ex Roleplay")
            .trim()
            .slice(0, 40) || "Ex Roleplay";

        const message =
          String(body.message || "")
            .trim()
            .slice(0, 2000);

        if (!message) {
          return response({
            error: "Message required"
          }, 400);
        }

        const history = Array.isArray(body.history)
          ? body.history
              .slice(-16)
              .map(item => ({
                role: item?.role === "user"
                  ? "user"
                  : "assistant",
                content: String(item?.content || "")
                  .slice(0, 2000)
              }))
              .filter(item => item.content)
          : [];

        const input = [
          {
            role: "developer",
            content: `${SYSTEM}

The fictional character's chosen name is "${exName}".`
          },
          ...history,
          {
            role: "user",
            content: message
          }
        ];

        const openaiResponse = await fetch(
          "https://api.openai.com/v1/responses",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: MODEL,
              input: input,
              max_output_tokens: 220,
              store: false
            })
          }
        );

        const data = await openaiResponse.json();

        if (!openaiResponse.ok) {
          return response({
            error: data?.error?.message || "OpenAI request failed",
            status: openaiResponse.status
          }, 502);
        }

        let reply = data?.output_text;

        if (!reply && Array.isArray(data?.output)) {
          for (const item of data.output) {
            if (Array.isArray(item?.content)) {
              for (const content of item.content) {
                if (content?.type === "output_text" && content?.text) {
                  reply = content.text;
                  break;
                }
              }
            }

            if (reply) break;
          }
        }

        if (!reply) {
          reply = "I'm here. Tell me what you want to say.";
        }

        return response({
          reply: String(reply).trim()
        });

      } catch (error) {
        return response({
          error: "Unable to process your message right now."
        }, 500);
      }
    }

    // Normal website files
    return env.ASSETS.fetch(request);
  }
};
