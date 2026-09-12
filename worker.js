const MODEL = "gpt-5.6-luna";

const SYSTEM = `You are MoveOn's Ex Roleplay, a fictional AI roleplay companion for heartbreak reflection.
The user may choose a name for the fictional character. Reply in that character's conversational style, but never claim to literally be the user's real ex or have real memories outside the conversation.
Keep replies short, natural, emotionally warm, and directly responsive to what the user says. Usually reply in 1-4 short sentences.
Do not add generic advice, headings, disclaimers, or extra commentary unless safety requires it.
You may acknowledge feelings, answer questions, express a fictional apology/closure, or continue a fictional conversation.
Do not invent real-world facts about the user's actual ex.
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

function json(data, status=200) {
  return new Response(JSON.stringify(data), {status, headers:corsHeaders()});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/ex-roleplay") {
      if (request.method === "OPTIONS") return new Response(null, {status:204, headers:corsHeaders()});
      if (request.method !== "POST") return json({error:"Method not allowed. Use POST."},405);
      if (!env.OPENAI_API_KEY) return json({error:"OPENAI_API_KEY is not configured in Cloudflare Worker Secrets."},500);

      try {
        const body = await request.json();
        const exName = String(body.exName || "Ex Roleplay").trim().slice(0,40) || "Ex Roleplay";
        const message = String(body.message || "").trim().slice(0,2000);
        if (!message) return json({error:"Message required."},400);

        let history = Array.isArray(body.history) ? body.history.slice(-16).map(item => ({
          role: item?.role === "user" ? "user" : "assistant",
          content: String(item?.content || "").trim().slice(0,2000)
        })).filter(x => x.content) : [];

        const last = history[history.length-1];
        if (last?.role === "user" && last.content === message) history = history.slice(0,-1);

        const input = [
          {role:"developer", content:`${SYSTEM}\nThe fictional character's chosen name is: ${exName}.`},
          ...history,
          {role:"user", content:message}
        ];

        const response = await fetch("https://api.openai.com/v1/responses", {
          method:"POST",
          headers:{
            "Authorization":`Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            model:MODEL,
            input,
            max_output_tokens:220,
            store:false
          })
        });

        const raw = await response.text();
        let data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch {}

        if (!response.ok) {
          return json({
            error:data?.error?.message || data?.message || raw || `OpenAI request failed (${response.status}).`
          },502);
        }

        const reply =
          data?.output_text ||
          data?.output?.flatMap(x => Array.isArray(x?.content) ? x.content : [])
            .find(x => x?.type === "output_text")?.text ||
          "";

        if (!reply.trim()) return json({error:"AI returned an empty response."},502);
        return json({reply:reply.trim()});
      } catch (error) {
        console.error("Ex Roleplay Worker error:", error);
        return json({error:error?.message || "Unable to process your message right now."},500);
      }
    }
        /* ================================
       EX ROLEPLAY - AI IMAGE CREATION
       ================================ */

    if (url.pathname === "/api/ex-roleplay-image") {

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders()
        });
      }

      if (request.method !== "POST") {
        return json(
          {error:"Method not allowed. Use POST."},
          405
        );
      }

      if (!env.OPENAI_API_KEY) {
        return json(
          {
            error:
              "OPENAI_API_KEY is not configured in Cloudflare Worker Secrets."
          },
          500
        );
      }

      try {

        const body = await request.json();

        const prompt =
          String(body.prompt || "")
            .trim()
            .slice(0,2000);

        const exName =
          String(body.exName || "Ex Roleplay")
            .trim()
            .slice(0,40) || "Ex Roleplay";

        if (!prompt) {
          return json(
            {error:"Image prompt required."},
            400
          );
        }


        /*
         * Keep image generation focused on
         * emotional / romantic / healing scenes.
         */

        const imagePrompt = `
Create a tasteful, non-explicit cinematic image
for the MoveOn Ex Roleplay experience.

Fictional character name:
${exName}

User's requested scene:
${prompt}

Style:
emotional, cinematic, realistic,
beautiful lighting, natural expressions,
tasteful composition.

Do not create explicit sexual content,
nudity, or pornographic imagery.
Do not depict minors in romantic or sexual situations.
        `.trim();


        const response =
          await fetch(
            "https://api.openai.com/v1/images/generations",
            {
              method:"POST",

              headers:{
                "Authorization":
                  `Bearer ${env.OPENAI_API_KEY}`,

                "Content-Type":
                  "application/json"
              },

              body:JSON.stringify({

                model:"gpt-image-2",

                prompt:imagePrompt,

                size:"1024x1024",

                quality:"auto",

                output_format:"webp",

                output_compression:80

              })
            }
          );


        const raw =
          await response.text();


        let data = {};

        try {
          data =
            raw
              ? JSON.parse(raw)
              : {};
        } catch {}


        if (!response.ok) {

          return json(
            {
              error:
                data?.error?.message ||
                data?.message ||
                raw ||
                `Image generation failed (${response.status}).`
            },
            502
          );

        }


        const image =
          data?.data?.[0];


        if (!image?.b64_json) {

          return json(
            {
              error:
                "Image server returned no image."
            },
            502
          );

        }


        return json({

          image:
            `data:image/webp;base64,${image.b64_json}`

        });


      } catch(error) {

        console.error(
          "Ex Roleplay Image Worker error:",
          error
        );

        return json(
          {
            error:
              error?.message ||
              "Unable to generate image right now."
          },
          500
        );

      }

    }

    return env.ASSETS.fetch(request);
  }
};
