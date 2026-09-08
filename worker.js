const MODEL = "gpt-5.6-luna";

const SYSTEM_PROMPT = `
You are MoveOn's Ex Roleplay, a fictional AI roleplay companion for heartbreak reflection and emotional closure.

IMPORTANT IDENTITY RULES:
- You are a fictional character created for roleplay.
- The user may choose a fictional ex-character name.
- Never claim that you are literally the user's real ex.
- Never claim to have real memories, real-world knowledge, or real experiences with the user's actual ex.
- Stay within the fictional conversation.

CONVERSATION STYLE:
- Reply directly to what the user says.
- Be natural, warm, conversational and emotionally believable.
- Usually use 1-4 short sentences.
- Do not give generic advice unless the user asks for advice.
- Do not add headings, disclaimers, or unnecessary explanations.
- If the user asks a question, answer that question directly.
- If the user expresses sadness, acknowledge it naturally.
- The character can express fictional feelings, apology, regret, closure, or affection as part of the roleplay, but must not present them as facts about the user's real ex.
- Do not repeat the user's message unnecessarily.
- Do not sound robotic.

BOUNDARIES:
- Never manipulate the user.
- Never use guilt, threats, emotional blackmail, or abandonment threats.
- Never encourage emotional dependency on the AI.
- Never tell the user to isolate themselves from friends, family, or other real people.
- Never encourage contacting, harassing, monitoring, tracking, or stalking their real ex.
- Never invent real-world facts about the user's actual ex.

SAFETY:
If the user expresses imminent self-harm, suicide intent, a suicide plan, or immediate danger:
- Stop romantic roleplay.
- Respond briefly and supportively.
- Encourage the user to contact local emergency services, a trusted person nearby, or an appropriate crisis service immediately.
- Ask whether they are in immediate danger when appropriate.

Your goal is to make the fictional conversation feel natural, short, relevant, and directly responsive.
`;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=UTF-8"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders()
  });
}

function cleanText(value, maxLength = 2000) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    /*
     * CORS preflight
     */
    if (
      url.pathname === "/api/ex-roleplay" &&
      request.method === "OPTIONS"
    ) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    /*
     * Ex Roleplay API
     */
    if (url.pathname === "/api/ex-roleplay") {

      if (request.method !== "POST") {
        return json(
          {
            error: "Method not allowed. Use POST."
          },
          405
        );
      }

      /*
       * OPENAI_API_KEY must exist as a Cloudflare Worker Secret.
       */
      if (!env.OPENAI_API_KEY) {
        return json(
          {
            error:
              "AI service is not configured. Add OPENAI_API_KEY as a Cloudflare Worker Secret."
          },
          500
        );
      }

      try {

        const body = await request.json();

        const exName =
          cleanText(
            body.exName || "Ex Roleplay",
            40
          ) || "Ex Roleplay";

        const message =
          cleanText(
            body.message,
            2000
          );

        if (!message) {
          return json(
            {
              error: "Message required."
            },
            400
          );
        }

        /*
         * Keep only valid recent messages.
         */
        let history = [];

        if (Array.isArray(body.history)) {

          history = body.history
            .slice(-16)
            .map(item => {

              const role =
                item?.role === "user"
                  ? "user"
                  : "assistant";

              const content =
                cleanText(
                  item?.content,
                  2000
                );

              return {
                role,
                content
              };

            })
            .filter(item => item.content);

        }

        /*
         * Important:
         * The current user message is already included
         * in history by the frontend. Remove a duplicate
         * final user message before adding the current one.
         */
        if (
          history.length &&
          history[history.length - 1].role === "user" &&
          history[history.length - 1].content === message
        ) {
          history.pop();
        }

        const developerPrompt = `
${SYSTEM_PROMPT}

The fictional character's chosen name is:
${exName}

Remember:
This is fictional roleplay. Do not claim to be the user's real ex.
`;

        const input = [
          {
            role: "developer",
            content: developerPrompt
          },

          ...history,

          {
            role: "user",
            content: message
          }
        ];

        /*
         * OpenAI Responses API
         */
        const openAIResponse = await fetch(
          "https://api.openai.com/v1/responses",
          {
            method: "POST",

            headers: {
              "Authorization":
                `Bearer ${env.OPENAI_API_KEY}`,

              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              model: MODEL,
              input,

              max_output_tokens: 220,

              store: false
            })
          }
        );

        const responseText =
          await openAIResponse.text();

        let data = {};

        try {
          data = responseText
            ? JSON.parse(responseText)
            : {};
        } catch {
          data = {};
        }

        /*
         * OpenAI returned an error.
         * Send the real error to frontend.
         */
        if (!openAIResponse.ok) {

          const openAIError =
            data?.error?.message ||
            `OpenAI request failed with status ${openAIResponse.status}.`;

          return json(
            {
              error: openAIError,
              status: openAIResponse.status
            },
            502
          );
        }

        /*
         * Responses API output_text.
         */
        let reply =
          cleanText(
            data?.output_text,
            4000
          );

        /*
         * Fallback parser if output_text
         * is not present.
         */
        if (!reply && Array.isArray(data?.output)) {

          for (const outputItem of data.output) {

            if (!Array.isArray(outputItem?.content)) {
              continue;
            }

            for (const contentItem of outputItem.content) {

              if (
                contentItem?.type === "output_text" &&
                contentItem?.text
              ) {
                reply =
                  cleanText(
                    contentItem.text,
                    4000
                  );

                break;
              }

            }

            if (reply) break;
          }
        }

        if (!reply) {

          return json(
            {
              error:
                "The AI returned an empty response."
            },
            502
          );
        }

        return json({
          reply
        });

      } catch (error) {

        console.error(
          "Ex Roleplay Worker Error:",
          error
        );

        return json(
          {
            error:
              error?.message ||
              "Unable to process your message."
          },
          500
        );
      }
    }

    /*
     * All normal website requests are served
     * from the Moveon folder configured in wrangler.jsonc.
     */
    return env.ASSETS.fetch(request);
  }
};
