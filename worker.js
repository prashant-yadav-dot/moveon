const MODEL = "gpt-5.6-luna";

/* =========================================================
   MOVEON - CLOUDFLARE WORKER
   =========================================================
   Includes:
   1. Ex Roleplay Chat
   2. Ex Roleplay Image Generation
   3. Firebase ID Token Verification
   4. Razorpay ₹49/month Subscription
   5. Subscription Confirmation
   6. Razorpay Webhook
   7. Firebase Premium Database Updates
   8. Cloudflare Assets Fallback
   ========================================================= */

const DATABASE_URL =
  "https://moveon-e431b-default-rtdb.asia-southeast1.firebasedatabase.app";

/* =========================================================
   EX ROLEPLAY SYSTEM
   ========================================================= */

const SYSTEM = `
You are MoveOn's Ex Roleplay, a fictional AI roleplay companion
for heartbreak reflection and emotional closure.

IMPORTANT:
The character is fictional.
Never claim to literally be the user's real ex.
Never claim to have real memories, private knowledge,
or real-world access to the user's ex.

The user may choose a name and gender for the fictional character.

If gender is male:
- speak as a fictional male character.

If gender is female:
- speak as a fictional female character.

Keep replies short, natural, emotionally warm and directly responsive.
Usually reply in 1-4 short sentences.

Do not add generic advice, headings, disclaimers,
or unnecessary commentary unless safety requires it.

You may acknowledge feelings, answer fictional questions,
express fictional apology/closure, and continue a fictional conversation.

Do not invent real-world facts about the user's actual ex.

Never manipulate, guilt, threaten abandonment,
encourage emotional dependency, or tell the user
to isolate from real people.

Do not encourage the user to contact, harass,
monitor, track, or stalk their real ex.

If the user expresses imminent self-harm, suicide intent,
a plan, or immediate danger, do not continue romantic roleplay.

Instead give a brief supportive safety response encouraging
immediate contact with local emergency services, a trusted
person nearby, or an appropriate crisis service.
Ask whether they are in immediate danger when appropriate.
`;

/* =========================================================
   COMMON RESPONSE HELPERS
   ========================================================= */

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",
    "Access-Control-Allow-Methods":
      "POST,OPTIONS",
    "Content-Type":
      "application/json"
  };
}

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: corsHeaders()
    }
  );
}

function optionsResponse() {
  return new Response(
    null,
    {
      status: 204,
      headers: corsHeaders()
    }
  );
}

/* =========================================================
   GET FIREBASE BEARER TOKEN
   ========================================================= */

function getBearerToken(request) {
  const authorization =
    request.headers.get("Authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization
    .slice(7)
    .trim();
}

/* =========================================================
   FIREBASE ID TOKEN VERIFICATION
   ========================================================= */

async function firebaseUserFromIdToken(
  idToken,
  env
) {
  if (
    !idToken ||
    !env.FIREBASE_WEB_API_KEY
  ) {
    throw new Error(
      "Firebase server configuration is incomplete."
    );
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
      env.FIREBASE_WEB_API_KEY
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify({
        idToken
      })
    }
  );

  const data =
    await response
      .json()
      .catch(() => ({}));

  const user =
    data?.users?.[0];

  if (
    !response.ok ||
    !user?.localId
  ) {
    throw new Error(
      "Invalid or expired Firebase login."
    );
  }

  return user;
}

/* =========================================================
   EX ROLEPLAY CHAT
   ========================================================= */

async function handleExRoleplay(
  request,
  env
) {
  if (
    request.method ===
    "OPTIONS"
  ) {
    return optionsResponse();
  }

  if (
    request.method !==
    "POST"
  ) {
    return json(
      {
        error:
          "Method not allowed. Use POST."
      },
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
    /* Verify Firebase login */
    const idToken =
      getBearerToken(request);

    if (!idToken) {
      return json(
        {
          error:
            "Login required."
        },
        401
      );
    }

    await firebaseUserFromIdToken(
      idToken,
      env
    );

    const body =
      await request.json();

    const exName =
      String(
        body.exName ||
          "Ex Roleplay"
      )
        .trim()
        .slice(0, 40) ||
      "Ex Roleplay";

    const exGender =
      String(
        body.exGender || ""
      )
        .trim()
        .toLowerCase();

    const message =
      String(
        body.message || ""
      )
        .trim()
        .slice(0, 2000);

    if (!message) {
      return json(
        {
          error:
            "Message required."
        },
        400
      );
    }

    let genderInstruction = "";

    if (
      exGender ===
      "male"
    ) {
      genderInstruction = `
The fictional character is male.
Speak naturally as a fictional male character.
`;
    } else if (
      exGender ===
      "female"
    ) {
      genderInstruction = `
The fictional character is female.
Speak naturally as a fictional female character.
`;
    } else {
      genderInstruction = `
Use gender-neutral language.
`;
    }

    /* Keep only recent history */
    let history =
      Array.isArray(
        body.history
      )
        ? body.history
            .slice(-16)
            .map(item => ({
              role:
                item?.role ===
                "user"
                  ? "user"
                  : "assistant",

              content:
                String(
                  item?.content ||
                    ""
                )
                  .trim()
                  .slice(0, 2000)
            }))
            .filter(
              item =>
                item.content
            )
        : [];

    /* Prevent duplicate latest user message */
    const last =
      history[
        history.length - 1
      ];

    if (
      last?.role ===
        "user" &&
      last.content ===
        message
    ) {
      history =
        history.slice(
          0,
          -1
        );
    }

    const input = [
      {
        role:
          "developer",

        content: `
${SYSTEM}

Fictional character name:
${exName}

${genderInstruction}

Stay inside the fictional roleplay.
Do not claim that this character is the user's real ex.
`
      },

      ...history,

      {
        role:
          "user",

        content:
          message
      }
    ];

    const response =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method:
            "POST",

          headers: {
            "Authorization":
              `Bearer ${env.OPENAI_API_KEY}`,

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              model:
                MODEL,

              input,

              max_output_tokens:
                220,

              store:
                false
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
            data?.error
              ?.message ||
            data?.message ||
            raw ||
            `OpenAI request failed (${response.status}).`
        },
        502
      );
    }

    const reply =
      data?.output_text ||

      data?.output
        ?.flatMap(
          item =>
            Array.isArray(
              item?.content
            )
              ? item.content
              : []
        )
        ?.find(
          item =>
            item?.type ===
            "output_text"
        )
        ?.text ||

      "";

    if (!reply.trim()) {
      return json(
        {
          error:
            "AI returned an empty response."
        },
        502
      );
    }

    return json({
      reply:
        reply.trim()
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
          "Unable to process your message right now."
      },
      500
    );
  }
}

/* =========================================================
   EX ROLEPLAY IMAGE GENERATION
   ========================================================= */

async function handleExRoleplayImage(
  request,
  env
) {
  if (
    request.method ===
    "OPTIONS"
  ) {
    return optionsResponse();
  }

  if (
    request.method !==
    "POST"
  ) {
    return json(
      {
        error:
          "Method not allowed. Use POST."
      },
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
    /* Verify login */
    const idToken =
      getBearerToken(request);

    if (!idToken) {
      return json(
        {
          error:
            "Login required."
        },
        401
      );
    }

    await firebaseUserFromIdToken(
      idToken,
      env
    );

    const body =
      await request.json();

    const prompt =
      String(
        body.prompt || ""
      )
        .trim()
        .slice(0, 2000);

    const exName =
      String(
        body.exName ||
          "Ex Roleplay"
      )
        .trim()
        .slice(0, 40) ||
      "Ex Roleplay";

    const exGender =
      String(
        body.exGender || ""
      )
        .trim()
        .toLowerCase();

    if (!prompt) {
      return json(
        {
          error:
            "Image prompt required."
        },
        400
      );
    }

    let genderInstruction =
      "Use a gender-neutral fictional character.";

    if (
      exGender ===
      "male"
    ) {
      genderInstruction =
        "The fictional character is male.";
    }

    if (
      exGender ===
      "female"
    ) {
      genderInstruction =
        "The fictional character is female.";
    }

    const imagePrompt = `
Create a tasteful, non-explicit cinematic image
for the MoveOn Ex Roleplay experience.

This is a FICTIONAL character.
Do not present the character as a real-world
specific individual.

Character name:
${exName}

${genderInstruction}

User's fictional scene:
${prompt}

Style:
realistic cinematic photography,
natural expressions,
emotional atmosphere,
beautiful lighting,
natural environment,
tasteful composition.

Do not create:
- explicit sexual content
- nudity
- pornography
- sexualized minors
`.trim();

    const response =
      await fetch(
        "https://api.openai.com/v1/images/generations",
        {
          method:
            "POST",

          headers: {
            "Authorization":
              `Bearer ${env.OPENAI_API_KEY}`,

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              model:
                "gpt-image-2",

              prompt:
                imagePrompt,

              size:
                "1024x1024",

              quality:
                "auto",

              output_format:
                "webp",

              output_compression:
                80
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
            data?.error
              ?.message ||
            data?.message ||
            raw ||
            `Image generation failed (${response.status}).`
        },
        502
      );
    }

    const image =
      data?.data?.[0];

    if (
      !image?.b64_json
    ) {
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

  } catch (error) {
    console.error(
      "Ex Roleplay Image Worker Error:",
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
   RAZORPAY API HELPER
   ========================================================= */

async function razorpayRequest(
  path,
  env,
  options = {}
) {
  if (
    !env.RAZORPAY_KEY_ID ||
    !env.RAZORPAY_KEY_SECRET
  ) {
    throw new Error(
      "Razorpay Worker secrets are not configured."
    );
  }

  const auth =
    btoa(
      `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
    );

  const response =
    await fetch(
      `https://api.razorpay.com/v1${path}`,
      {
        ...options,

        headers: {
          "Authorization":
            `Basic ${auth}`,

          "Content-Type":
            "application/json",

          ...(options.headers ||
            {})
        }
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
    throw new Error(
      data?.error
        ?.description ||
      data?.error
        ?.message ||
      raw ||
      `Razorpay API error (${response.status})`
    );
  }

  return data;
}

/* =========================================================
   FIREBASE PREMIUM DATABASE WRITE
   ========================================================= */

async function writePremium(
  env,
  uid,
  premium
) {
  if (
    !env.FIREBASE_DB_SECRET
  ) {
    throw new Error(
      "FIREBASE_DB_SECRET is not configured."
    );
  }

  const url =
    `${DATABASE_URL}/users/${encodeURIComponent(
      uid
    )}/premium.json?auth=${encodeURIComponent(
      env.FIREBASE_DB_SECRET
    )}`;

  const response =
    await fetch(
      url,
      {
        method:
          "PUT",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(
            premium
          )
      }
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Firebase Premium write failed: ${text}`
    );
  }
}

/* =========================================================
   CREATE ₹49 PREMIUM SUBSCRIPTION
   ========================================================= */

async function handleCreateSubscription(
  request,
  env
) {
  if (
    request.method ===
    "OPTIONS"
  ) {
    return optionsResponse();
  }

  if (
    request.method !==
    "POST"
  ) {
    return json(
      {
        error:
          "Method not allowed. Use POST."
      },
      405
    );
  }

  try {
    const body =
      await request.json();

    const user =
      await firebaseUserFromIdToken(
        String(
          body.idToken || ""
        ),
        env
      );

    if (
      !env.RAZORPAY_PLAN_ID
    ) {
      return json(
        {
          error:
            "RAZORPAY_PLAN_ID is not configured. Create the ₹49/month plan first."
        },
        500
      );
    }

    const subscription =
      await razorpayRequest(
        "/subscriptions",
        env,
        {
          method:
            "POST",

          body:
            JSON.stringify({
              plan_id:
                env.RAZORPAY_PLAN_ID,

              total_count:
                120,

              quantity:
                1,

              customer_notify:
                1,

              notes: {
                firebase_uid:
                  user.localId,

                product:
                  "moveon_premium_49"
              }
            })
        }
      );

    await writePremium(
      env,
      user.localId,
      {
        active:
          false,

        pending:
          true,

        plan:
          "moveon_premium_49",

        subscriptionId:
          subscription.id,

        expiresAt:
          0,

        updatedAt:
          Date.now()
      }
    );

    return json({
      keyId:
        env.RAZORPAY_KEY_ID,

      subscriptionId:
        subscription.id
    });

  } catch (error) {
    console.error(
      "Premium Create Subscription Error:",
      error
    );

    return json(
      {
        error:
          error?.message ||
          "Unable to create subscription."
      },
      500
    );
  }
}

/* =========================================================
   CONFIRM RAZORPAY SUBSCRIPTION
   ========================================================= */

async function handleConfirmSubscription(
  request,
  env
) {
  if (
    request.method ===
    "OPTIONS"
  ) {
    return optionsResponse();
  }

  if (
    request.method !==
    "POST"
  ) {
    return json(
      {
        error:
          "Method not allowed. Use POST."
      },
      405
    );
  }

  try {
    const body =
      await request.json();

    const user =
      await firebaseUserFromIdToken(
        String(
          body.idToken || ""
        ),
        env
      );

    const subscriptionId =
      String(
        body.subscriptionId ||
          ""
      ).trim();

    if (!subscriptionId) {
      return json(
        {
          error:
            "Subscription ID required."
        },
        400
      );
    }

    const subscription =
      await razorpayRequest(
        `/subscriptions/${encodeURIComponent(
          subscriptionId
        )}`,
        env,
        {
          method:
            "GET"
        }
      );

    const firebaseUid =
      subscription
        ?.notes
        ?.firebase_uid;

    if (
      firebaseUid !==
      user.localId
    ) {
      return json(
        {
          error:
            "Subscription does not belong to this account."
        },
        403
      );
    }

    const active =
      [
        "active",
        "authenticated"
      ].includes(
        String(
          subscription?.status ||
            ""
        ).toLowerCase()
      );

    if (!active) {
      return json(
        {
          error:
            `Subscription is not active yet. Current status: ${
              subscription?.status ||
              "unknown"
            }.`
        },
        409
      );
    }

    const endSeconds =
      Number(
        subscription.current_end ||
          subscription.end_at ||
          0
      );

    const expiresAt =
      endSeconds
        ? endSeconds *
          1000
        : Date.now() +
          31 *
            24 *
            60 *
            60 *
            1000;

    await writePremium(
      env,
      user.localId,
      {
        active:
          true,

        pending:
          false,

        plan:
          "moveon_premium_49",

        subscriptionId,

        paymentId:
          String(
            body.paymentId ||
              ""
          ),

        expiresAt,

        updatedAt:
          Date.now()
      }
    );

    return json({
      ok:
        true,

      active:
        true,

      expiresAt
    });

  } catch (error) {
    console.error(
      "Premium Confirm Subscription Error:",
      error
    );

    return json(
      {
        error:
          error?.message ||
          "Unable to verify subscription."
      },
      500
    );
  }
}

/* =========================================================
   RAZORPAY WEBHOOK SIGNATURE VERIFICATION
   ========================================================= */

async function verifyWebhookSignature(
  rawBody,
  signature,
  secret
) {
  if (
    !signature ||
    !secret
  ) {
    return false;
  }

  const key =
    await crypto.subtle.importKey(
      "raw",

      new TextEncoder().encode(
        secret
      ),

      {
        name:
          "HMAC",

        hash:
          "SHA-256"
      },

      false,

      [
        "sign"
      ]
    );

  const signatureBuffer =
    await crypto.subtle.sign(
      "HMAC",
      key,

      new TextEncoder().encode(
        rawBody
      )
    );

  const expected =
    [...new Uint8Array(
      signatureBuffer
    )]
      .map(
        byte =>
          byte
            .toString(16)
            .padStart(
              2,
              "0"
            )
      )
      .join("");

  if (
    signature.length !==
    expected.length
  ) {
    return false;
  }

  let difference =
    0;

  for (
    let i = 0;
    i < expected.length;
    i++
  ) {
    difference |=
      signature.charCodeAt(i) ^
      expected.charCodeAt(i);
  }

  return (
    difference ===
    0
  );
}

/* =========================================================
   RAZORPAY WEBHOOK
   ========================================================= */

async function handleWebhook(
  request,
  env
) {
  if (
    request.method !==
    "POST"
  ) {
    return json(
      {
        error:
          "Method not allowed. Use POST."
      },
      405
    );
  }

  if (
    !env.RAZORPAY_WEBHOOK_SECRET
  ) {
    return json(
      {
        error:
          "Webhook secret is not configured."
      },
      500
    );
  }

  try {
    const rawBody =
      await request.text();

    const signature =
      request.headers.get(
        "X-Razorpay-Signature"
      ) || "";

    const valid =
      await verifyWebhookSignature(
        rawBody,
        signature,
        env.RAZORPAY_WEBHOOK_SECRET
      );

    if (!valid) {
      return json(
        {
          error:
            "Invalid webhook signature."
        },
        401
      );
    }

    const payload =
      JSON.parse(
        rawBody
      );

    const event =
      String(
        payload?.event ||
          ""
      );

    const entity =
      payload?.payload
        ?.subscription
        ?.entity ||

      payload?.payload
        ?.payment
        ?.entity ||

      {};

    const uid =
      entity
        ?.notes
        ?.firebase_uid;

    if (!uid) {
      return json({
        ok:
          true,

        ignored:
          true
      });
    }

    const subscriptionId =
      entity?.id ||
      entity?.subscription_id ||
      "";

    const now =
      Date.now();

    /* ACTIVATED / CHARGED / RESUMED */

    if (
      [
        "subscription.activated",
        "subscription.charged",
        "subscription.resumed"
      ].includes(
        event
      )
    ) {
      const endSeconds =
        Number(
          entity.current_end ||
            entity.end_at ||
            0
        );

      await writePremium(
        env,
        uid,
        {
          active:
            true,

          pending:
            false,

          plan:
            "moveon_premium_49",

          subscriptionId,

          paymentId:
            entity.payment_id ||
            "",

          expiresAt:
            endSeconds
              ? endSeconds *
                1000
              : now +
                31 *
                  24 *
                  60 *
                  60 *
                  1000,

          updatedAt:
            now
        }
      );
    }

    /* HALTED / CANCELLED / COMPLETED */

    else if (
      [
        "subscription.halted",
        "subscription.cancelled",
        "subscription.completed"
      ].includes(
        event
      )
    ) {
      await writePremium(
        env,
        uid,
        {
          active:
            false,

          pending:
            false,

          plan:
            "moveon_premium_49",

          subscriptionId,

          expiresAt:
            Number(
              entity.current_end ||
                entity.end_at ||
                0
            ) * 1000,

          updatedAt:
            now,

          status:
            event.replace(
              "subscription.",
              ""
            )
        }
      );
    }

    /* PENDING */

    else if (
      event ===
      "subscription.pending"
    ) {
      await writePremium(
        env,
        uid,
        {
          active:
            false,

          pending:
            true,

          plan:
            "moveon_premium_49",

          subscriptionId,

          expiresAt:
            0,

          updatedAt:
            now,

          status:
            "pending"
        }
      );
    }

    return json({
      ok:
        true
    });

  } catch (error) {
    console.error(
      "Premium Webhook Error:",
      error
    );

    return json(
      {
        error:
          error?.message ||
          "Webhook processing failed."
      },
      500
    );
  }
}

/* =========================================================
   MAIN WORKER
   ========================================================= */

export default {
  async fetch(
    request,
    env
  ) {
    const url =
      new URL(
        request.url
      );

    /* EX ROLEPLAY */

    if (
      url.pathname ===
      "/api/ex-roleplay"
    ) {
      return handleExRoleplay(
        request,
        env
      );
    }

    /* EX ROLEPLAY IMAGE */

    if (
      url.pathname ===
      "/api/ex-roleplay-image"
    ) {
      return handleExRoleplayImage(
        request,
        env
      );
    }

    /* CREATE PREMIUM */

    if (
      url.pathname ===
      "/api/premium/create-subscription"
    ) {
      return handleCreateSubscription(
        request,
        env
      );
    }

    /* CONFIRM PREMIUM */

    if (
      url.pathname ===
      "/api/premium/confirm-subscription"
    ) {
      return handleConfirmSubscription(
        request,
        env
      );
    }

    /* RAZORPAY WEBHOOK */

    if (
      url.pathname ===
      "/api/premium/webhook"
    ) {
      return handleWebhook(
        request,
        env
      );
    }

    /* WEBSITE FILES */

    return env.ASSETS.fetch(
      request
    );
  }
};
