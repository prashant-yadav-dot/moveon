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


    /* =========================================================
       MOVEON PREMIUM — RAZORPAY SUBSCRIPTIONS
       Server-only secrets:
       RAZORPAY_KEY_ID
       RAZORPAY_KEY_SECRET
       RAZORPAY_PLAN_ID
       RAZORPAY_WEBHOOK_SECRET
       FIREBASE_WEB_API_KEY
       FIREBASE_DB_SECRET
       ========================================================= */

    async function firebaseUserFromIdToken(idToken, env) {
      if (!idToken || !env.FIREBASE_WEB_API_KEY) throw new Error("Firebase server configuration is incomplete.");

      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,
        {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({idToken})
        }
      );

      const data = await response.json().catch(() => ({}));
      const user = data?.users?.[0];
      if (!response.ok || !user?.localId) throw new Error("Invalid or expired Firebase login.");
      return user;
    }

    async function razorpayRequest(path, env, options = {}) {
      if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay Worker secrets are not configured.");
      }

      const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);

      const response = await fetch(`https://api.razorpay.com/v1${path}`, {
        ...options,
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      });

      const raw = await response.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch {}
      if (!response.ok) {
        throw new Error(data?.error?.description || data?.error?.message || raw || `Razorpay API error (${response.status})`);
      }
      return data;
    }

    async function writePremium(env, uid, premium) {
      if (!env.FIREBASE_DB_SECRET) throw new Error("FIREBASE_DB_SECRET is not configured.");

      const url =
        `https://moveon-84795-default-rtdb.asia-southeast1.firebasedatabase.app/users/${encodeURIComponent(uid)}/premium.json?auth=${encodeURIComponent(env.FIREBASE_DB_SECRET)}`;

      const response = await fetch(url, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(premium)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Firebase Premium write failed: ${text}`);
      }
    }

    if (url.pathname === "/api/premium/create-subscription") {
      if (request.method === "OPTIONS") return new Response(null, {status:204, headers:corsHeaders()});
      if (request.method !== "POST") return json({error:"Method not allowed. Use POST."},405);

      try {
        const body = await request.json();
        const user = await firebaseUserFromIdToken(String(body.idToken || ""), env);

        if (!env.RAZORPAY_PLAN_ID) {
          return json({error:"RAZORPAY_PLAN_ID is not configured. Create the ₹49/month plan first."},500);
        }

        const subscription = await razorpayRequest("/subscriptions", env, {
          method: "POST",
          body: JSON.stringify({
            plan_id: env.RAZORPAY_PLAN_ID,
            total_count: 120,
            quantity: 1,
            customer_notify: 1,
            notes: {
              firebase_uid: user.localId,
              product: "moveon_premium_49"
            }
          })
        });

        await writePremium(env, user.localId, {
          active: false,
          pending: true,
          plan: "moveon_premium_49",
          subscriptionId: subscription.id,
          expiresAt: 0,
          updatedAt: Date.now()
        });

        return json({
          keyId: env.RAZORPAY_KEY_ID,
          subscriptionId: subscription.id
        });
      } catch (error) {
        console.error("Premium create subscription error:", error);
        return json({error:error?.message || "Unable to create subscription."},500);
      }
    }

    if (url.pathname === "/api/premium/confirm-subscription") {
      if (request.method === "OPTIONS") return new Response(null, {status:204, headers:corsHeaders()});
      if (request.method !== "POST") return json({error:"Method not allowed. Use POST."},405);

      try {
        const body = await request.json();
        const user = await firebaseUserFromIdToken(String(body.idToken || ""), env);
        const subscriptionId = String(body.subscriptionId || "").trim();

        if (!subscriptionId) return json({error:"Subscription ID required."},400);

        const subscription = await razorpayRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`, env, {
          method: "GET"
        });

        const firebaseUid = subscription?.notes?.firebase_uid;
        if (firebaseUid !== user.localId) {
          return json({error:"Subscription does not belong to this account."},403);
        }

        const active = ["active", "authenticated"].includes(String(subscription?.status || "").toLowerCase());
        if (!active) {
          return json({
            error:`Subscription is not active yet. Current status: ${subscription?.status || "unknown"}.`
          },409);
        }

        const endSeconds = Number(subscription.current_end || subscription.end_at || 0);
        const expiresAt = endSeconds ? endSeconds * 1000 : Date.now() + 31 * 24 * 60 * 60 * 1000;

        await writePremium(env, user.localId, {
          active: true,
          pending: false,
          plan: "moveon_premium_49",
          subscriptionId,
          paymentId: String(body.paymentId || ""),
          expiresAt,
          updatedAt: Date.now()
        });

        return json({ok:true, active:true, expiresAt});
      } catch (error) {
        console.error("Premium confirm subscription error:", error);
        return json({error:error?.message || "Unable to verify subscription."},500);
      }
    }

    if (url.pathname === "/api/premium/webhook") {
      if (request.method !== "POST") return json({error:"Method not allowed. Use POST."},405);
      if (!env.RAZORPAY_WEBHOOK_SECRET) return json({error:"Webhook secret is not configured."},500);

      try {
        const rawBody = await request.text();
        const signature = request.headers.get("X-Razorpay-Signature") || "";

        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(env.RAZORPAY_WEBHOOK_SECRET),
          {name:"HMAC", hash:"SHA-256"},
          false,
          ["sign"]
        );
        const signatureBuffer = await crypto.subtle.sign(
          "HMAC",
          key,
          new TextEncoder().encode(rawBody)
        );
        const expected = [...new Uint8Array(signatureBuffer)]
          .map(b => b.toString(16).padStart(2,"0"))
          .join("");

        if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual) {
          if (signature !== expected) return json({error:"Invalid webhook signature."},401);
        } else {
          const a = new TextEncoder().encode(signature);
          const b = new TextEncoder().encode(expected);
          let diff = a.length ^ b.length;
          for (let i=0;i<a.length;i++) diff |= a[i] ^ b[i];
          if (diff !== 0) return json({error:"Invalid webhook signature."},401);
        }

        const payload = JSON.parse(rawBody);
        const event = String(payload?.event || "");
        const entity =
          payload?.payload?.subscription?.entity ||
          payload?.payload?.payment?.entity ||
          {};

        const uid = entity?.notes?.firebase_uid;
        if (!uid) return json({ok:true, ignored:true});

        const subscriptionId = entity?.id || entity?.subscription_id || "";
        const now = Date.now();

        if (["subscription.activated","subscription.charged","subscription.resumed"].includes(event)) {
          const endSeconds = Number(entity.current_end || entity.end_at || 0);
          await writePremium(env, uid, {
            active: true,
            pending: false,
            plan: "moveon_premium_49",
            subscriptionId,
            paymentId: entity.payment_id || "",
            expiresAt: endSeconds ? endSeconds * 1000 : now + 31*24*60*60*1000,
            updatedAt: now
          });
        } else if (["subscription.halted","subscription.cancelled","subscription.completed"].includes(event)) {
          await writePremium(env, uid, {
            active: false,
            pending: false,
            plan: "moveon_premium_49",
            subscriptionId,
            expiresAt: Number(entity.current_end || entity.end_at || 0) * 1000,
            updatedAt: now,
            status: event.replace("subscription.","")
          });
        } else if (event === "subscription.pending") {
          await writePremium(env, uid, {
            active: false,
            pending: true,
            plan: "moveon_premium_49",
            subscriptionId,
            expiresAt: 0,
            updatedAt: now,
            status: "pending"
          });
        }

        return json({ok:true});
      } catch (error) {
        console.error("Premium webhook error:", error);
        return json({error:error?.message || "Webhook processing failed."},500);
      }
    }


    return env.ASSETS.fetch(request);
  }
};
