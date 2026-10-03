const MODEL = "gpt-5.6-luna";

const DATABASE_URL =
  "https://moveon-e431b-default-rtdb.asia-southeast1.firebasedatabase.app";

const PREMIUM_PLAN = "moveon_premium_49";

/* =========================
   CORS / RESPONSE HELPERS
========================= */

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders()
    }
  });
}

function text(data, status = 200) {
  return new Response(data, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...corsHeaders()
    }
  });
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";

  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

/* =========================
   FIREBASE AUTH
========================= */

async function firebaseUserFromIdToken(token, env) {
  if (!token) return null;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
        env.FIREBASE_WEB_API_KEY
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          idToken: token
        })
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.users || !data.users.length) return null;

    return data.users[0];
  } catch (error) {
    console.error("Firebase token verification error:", error);
    return null;
  }
}

async function requireFirebaseUser(request, env) {
  const authHeader = request.headers.get("Authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();

  if (!token) return null;

  return await firebaseUserFromIdToken(token, env);
}

/* =========================
   FIREBASE DATABASE
========================= */

async function firebaseRequest(path, options = {}, env) {
  const separator = path.includes("?") ? "&" : "?";

  const url =
    `${DATABASE_URL}${path}.json` +
    `${separator}auth=${encodeURIComponent(env.FIREBASE_DB_SECRET)}`;

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

async function writePremium(uid, premium, env) {
  const response = await firebaseRequest(
    `/users/${encodeURIComponent(uid)}/premium`,
    {
      method: "PUT",
      body: JSON.stringify(premium)
    },
    env
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      "Firebase premium write failed:",
      response.status,
      errorText
    );

    throw new Error(
      `Firebase premium write failed: ${response.status}`
    );
  }

  return true;
}

async function readPremium(uid, env) {
  const response = await firebaseRequest(
    `/users/${encodeURIComponent(uid)}/premium`,
    {
      method: "GET"
    },
    env
  );

  if (!response.ok) {
    throw new Error("Unable to read Firebase premium");
  }

  return await response.json();
}

/* =========================
   RAZORPAY
========================= */

function razorpayAuth(env) {
  return "Basic " + btoa(
    `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
  );
}

async function razorpayRequest(path, options = {}, env) {
  return fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: razorpayAuth(env),
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

/* =========================
   RAZORPAY SUBSCRIPTION
========================= */

async function fetchSubscription(subscriptionId, env) {
  if (!subscriptionId) return null;

  const response = await razorpayRequest(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: "GET"
    },
    env
  );

  if (!response.ok) {
    console.error(
      "Razorpay subscription fetch failed:",
      response.status,
      await response.text()
    );

    return null;
  }

  return await response.json();
}

async function fetchUserSubscriptions(uid, env) {
  const url =
    `/subscriptions?plan_id=${encodeURIComponent(env.RAZORPAY_PLAN_ID)}` +
    `&count=100`;

  const response = await razorpayRequest(
    url,
    {
      method: "GET"
    },
    env
  );

  if (!response.ok) {
    console.error(
      "Razorpay subscription list failed:",
      response.status,
      await response.text()
    );

    return [];
  }

  const data = await response.json();

  const items = Array.isArray(data.items)
    ? data.items
    : [];

  /*
    IMPORTANT:
    We only consider subscriptions whose Razorpay notes
    contain the Firebase UID created by our Worker.
  */

  return items
    .filter((sub) => {
      return (
        sub &&
        sub.plan_id === env.RAZORPAY_PLAN_ID &&
        sub.notes &&
        sub.notes.firebase_uid === uid
      );
    })
    .sort(
      (a, b) =>
        Number(b.created_at || 0) -
        Number(a.created_at || 0)
    );
}

async function findActiveSubscription(uid, env) {
  const subscriptions = await fetchUserSubscriptions(uid, env);

  const active = subscriptions.find((sub) => {
    return (
      sub.status === "active" ||
      sub.status === "authenticated"
    );
  });

  return active || null;
}

function isPremiumActiveSubscription(subscription) {
  if (!subscription) return false;

  return (
    subscription.status === "active" ||
    subscription.status === "authenticated"
  );
}

function premiumFromSubscription(subscription) {
  const now = Date.now();

  let expiresAt = null;

  if (subscription.current_end) {
    expiresAt = Number(subscription.current_end) * 1000;
  } else if (subscription.end_at) {
    expiresAt = Number(subscription.end_at) * 1000;
  }

  return {
    active: true,
    pending: false,
    plan: PREMIUM_PLAN,
    planId: subscription.plan_id || null,
    subscriptionId: subscription.id,
    status: subscription.status,
    expiresAt,
    updatedAt: now
  };
}

/* =========================
   PREMIUM SYNC
========================= */

async function syncPremiumForUser(uid, env) {
  /*
    First check the existing Firebase subscription.
    If it is active in Razorpay, activate it.
  */

  const currentPremium = await readPremium(uid, env);

  if (
    currentPremium &&
    currentPremium.subscriptionId
  ) {
    const currentSubscription =
      await fetchSubscription(
        currentPremium.subscriptionId,
        env
      );

    if (
      currentSubscription &&
      currentSubscription.notes &&
      currentSubscription.notes.firebase_uid === uid &&
      currentSubscription.plan_id === env.RAZORPAY_PLAN_ID &&
      isPremiumActiveSubscription(currentSubscription)
    ) {
      const premium =
        premiumFromSubscription(currentSubscription);

      await writePremium(uid, premium, env);

      return {
        found: true,
        subscription: currentSubscription,
        premium
      };
    }
  }

  /*
    IMPORTANT FIX:
    If Firebase contains an old "created" subscription,
    search Razorpay for another ACTIVE subscription
    belonging to the same Firebase UID.
  */

  const activeSubscription =
    await findActiveSubscription(uid, env);

  if (activeSubscription) {
    const premium =
      premiumFromSubscription(activeSubscription);

    await writePremium(uid, premium, env);

    return {
      found: true,
      subscription: activeSubscription,
      premium
    };
  }

  return {
    found: false,
    subscription: null,
    premium: currentPremium || null
  };
}

/* =========================
   CREATE SUBSCRIPTION
========================= */

async function createPremiumSubscription(uid, user, env) {
  /*
    VERY IMPORTANT:
    Before creating another subscription,
    check whether the user already has an active one.
  */

  const existing =
    await findActiveSubscription(uid, env);

  if (existing) {
    const premium =
      premiumFromSubscription(existing);

    await writePremium(uid, premium, env);

    return {
      alreadyActive: true,
      subscription: existing
    };
  }

  const response = await razorpayRequest(
    "/subscriptions",
    {
      method: "POST",
      body: JSON.stringify({
        plan_id: env.RAZORPAY_PLAN_ID,
        total_count: 120,
        quantity: 1,
        customer_notify: 1,

        notes: {
          firebase_uid: uid,
          product: PREMIUM_PLAN
        }
      })
    },
    env
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Razorpay create subscription error:", data);

    throw new Error(
      data.error?.description ||
      "Unable to create Razorpay subscription"
    );
  }

  /*
    Save pending state.
  */

  await writePremium(
    uid,
    {
      active: false,
      pending: true,
      plan: PREMIUM_PLAN,
      planId: data.plan_id || env.RAZORPAY_PLAN_ID,
      subscriptionId: data.id,
      status: data.status || "created",
      expiresAt: 0,
      updatedAt: Date.now()
    },
    env
  );

  return {
    alreadyActive: false,
    subscription: data
  };
}

/* =========================
   CONFIRM / SYNC
========================= */

async function confirmPremium(uid, subscriptionId, env) {
  /*
    First check the subscription sent by frontend.
  */

  if (subscriptionId) {
    const requested =
      await fetchSubscription(subscriptionId, env);

    if (requested) {
      const belongsToUser =
        requested.notes &&
        requested.notes.firebase_uid === uid;

      const correctPlan =
        requested.plan_id === env.RAZORPAY_PLAN_ID;

      if (belongsToUser && correctPlan) {
        if (isPremiumActiveSubscription(requested)) {
          const premium =
            premiumFromSubscription(requested);

          await writePremium(uid, premium, env);

          return {
            active: true,
            subscription: requested,
            premium
          };
        }
      }
    }
  }

  /*
    FIX FOR YOUR CURRENT CASE:
    The Firebase ID is "created", but another subscription
    is already "active". Search and activate that one.
  */

  const result =
    await syncPremiumForUser(uid, env);

  if (result.found) {
    return {
      active: true,
      subscription: result.subscription,
      premium: result.premium
    };
  }

  return {
    active: false,
    subscription: null,
    premium: result.premium
  };
}

/* =========================
   RAZORPAY WEBHOOK
========================= */

async function verifyRazorpayWebhook(
  rawBody,
  signature,
  secret
) {
  if (!signature || !secret) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signatureBuffer =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(rawBody)
    );

  const expected =
    [...new Uint8Array(signatureBuffer)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  if (expected.length !== signature.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < expected.length; i++) {
    result |=
      expected.charCodeAt(i) ^
      signature.charCodeAt(i);
  }

  return result === 0;
}

async function handlePremiumWebhook(request, env) {
  const rawBody = await request.text();

  const signature =
    request.headers.get("X-Razorpay-Signature") || "";

  const valid =
    await verifyRazorpayWebhook(
      rawBody,
      signature,
      env.RAZORPAY_WEBHOOK_SECRET
    );

  if (!valid) {
    return json(
      {
        ok: false,
        error: "Invalid webhook signature"
      },
      401
    );
  }

  let payload;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(
      {
        ok: false,
        error: "Invalid JSON"
      },
      400
    );
  }

  const event = payload.event || "";

  const subscription =
    payload.payload?.subscription?.entity;

  if (!subscription) {
    return json({
      ok: true,
      ignored: true
    });
  }

  const uid =
    subscription.notes?.firebase_uid;

  if (!uid) {
    console.warn(
      "Webhook subscription has no firebase_uid:",
      subscription.id
    );

    return json({
      ok: true,
      ignored: true
    });
  }

  /*
    Only accept our MoveOn ₹49 plan.
  */

  if (
    subscription.plan_id !==
    env.RAZORPAY_PLAN_ID
  ) {
    return json({
      ok: true,
      ignored: true
    });
  }

  const activeEvents = [
    "subscription.activated",
    "subscription.charged",
    "subscription.resumed"
  ];

  const inactiveEvents = [
    "subscription.halted",
    "subscription.cancelled",
    "subscription.completed",
    "subscription.paused"
  ];

  if (activeEvents.includes(event)) {
    const premium =
      premiumFromSubscription(subscription);

    await writePremium(uid, premium, env);

    return json({
      ok: true,
      active: true,
      subscriptionId: subscription.id
    });
  }

  if (inactiveEvents.includes(event)) {
    await writePremium(
      uid,
      {
        active: false,
        pending: false,
        plan: PREMIUM_PLAN,
        planId: subscription.plan_id,
        subscriptionId: subscription.id,
        status: subscription.status || event,
        expiresAt: subscription.current_end
          ? Number(subscription.current_end) * 1000
          : Date.now(),
        updatedAt: Date.now()
      },
      env
    );

    return json({
      ok: true,
      active: false,
      subscriptionId: subscription.id
    });
  }

  return json({
    ok: true,
    ignored: true,
    event
  });
}

/* =========================
   EX ROLEPLAY
========================= */

async function handleExRoleplay(request, env) {
  const user = await requireFirebaseUser(request, env);

  if (!user) {
    return json(
      {
        error: "Authentication required"
      },
      401
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json(
      {
        error: "Invalid JSON"
      },
      400
    );
  }

  const {
    exName = "Alex",
    exGender = "unknown",
    message = "",
    history = []
  } = body;

  if (!message.trim()) {
    return json(
      {
        error: "Message is required"
      },
      400
    );
  }

  const genderInstruction =
    exGender === "male"
      ? "The fictional ex is male. Use naturally masculine first-person language where relevant."
      : exGender === "female"
      ? "The fictional ex is female. Use naturally feminine first-person language where relevant."
      : "The fictional ex gender is unspecified. Avoid unnecessary gender assumptions.";

  const system = `
You are MoveOn's Ex Roleplay, a fictional AI roleplay companion for heartbreak reflection.

The user may choose a name and gender for a fictional character.

IMPORTANT:
- Never claim to literally be the user's real ex.
- Never claim to have real memories outside the conversation.
- Stay clearly within fictional roleplay.
- Do not manipulate the user into dependency.
- Do not encourage self-harm or emotional isolation.
- Keep replies short, natural, warm and directly responsive.
- Usually reply in 1-4 short sentences.
- Do not repeatedly remind the user that you are AI unless needed for clarity.
- The purpose is reflection, closure and emotional processing.

Fictional character name: ${exName}
${genderInstruction}
`;

  const messages = [
    {
      role: "system",
      content: system
    }
  ];

  if (Array.isArray(history)) {
    for (const item of history.slice(-20)) {
      if (
        item &&
        (item.role === "user" ||
          item.role === "assistant") &&
        typeof item.content === "string"
      ) {
        messages.push({
          role: item.role,
          content: item.content
        });
      }
    }
  }

  messages.push({
    role: "user",
    content: message
  });

  if (!env.OPENAI_API_KEY) {
    return json(
      {
        error: "OPENAI_API_KEY is not configured"
      },
      500
    );
  }

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        "Authorization":
          `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        input: messages,
        max_output_tokens: 300
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "OpenAI Ex Roleplay error:",
      data
    );

    return json(
      {
        error:
          data.error?.message ||
          "AI request failed"
      },
      500
    );
  }

  const output =
    data.output_text ||
    data.output?.[0]?.content?.[0]?.text ||
    "";

  return json({
    reply: output.trim()
  });
}

/* =========================
   EX ROLEPLAY IMAGE
========================= */

async function handleExRoleplayImage(request, env) {
  const user = await requireFirebaseUser(request, env);

  if (!user) {
    return json(
      {
        error: "Authentication required"
      },
      401
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json(
      {
        error: "Invalid JSON"
      },
      400
    );
  }

  const {
    exName = "Alex",
    exGender = "unknown",
    prompt = ""
  } = body;

  if (!prompt.trim()) {
    return json(
      {
        error: "Image prompt is required"
      },
      400
    );
  }

  const gender =
    exGender === "male"
      ? "male"
      : exGender === "female"
      ? "female"
      : "gender-neutral";

  const imagePrompt = `
Create a fictional, non-explicit adult character named "${exName}".

Character gender: ${gender}.

This is fictional roleplay content for a heartbreak reflection app.

User image request:
${prompt}

Do not depict real people.
Do not create sexual or explicit content.
Do not imply that this fictional character is a real person's actual ex.
Natural realistic photography style.
  `;

  const response = await fetch(
    "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      headers: {
        "Authorization":
          `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: imagePrompt,
        size: "1024x1024"
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "OpenAI image error:",
      data
    );

    return json(
      {
        error:
          data.error?.message ||
          "Image generation failed"
      },
      500
    );
  }

  const image =
    data.data?.[0];

  if (!image) {
    return json(
      {
        error: "No image returned"
      },
      500
    );
  }

  /*
    NOTE:
    If OpenAI returns b64_json, this returns it to the client.
    For production, upload the image to Firebase Storage
    and save only the URL/path in RTDB.
  */

  if (image.b64_json) {
    return json({
      imageBase64:
        `data:image/png;base64,${image.b64_json}`
    });
  }

  if (image.url) {
    return json({
      imageUrl: image.url
    });
  }

  return json(
    {
      error: "Image data unavailable"
    },
    500
  );
}

/* =========================
   MAIN PREMIUM ROUTES
========================= */

async function handlePremiumCreate(request, env) {
  const user =
    await requireFirebaseUser(request, env);

  if (!user) {
    return json(
      {
        error: "Authentication failed"
      },
      401
    );
  }

  try {
    const result =
      await createPremiumSubscription(
        user.localId,
        user,
        env
      );

    return json({
      ok: true,
      alreadyActive:
        result.alreadyActive,
      subscription:
        result.subscription
    });
  } catch (error) {
    console.error(
      "Premium create error:",
      error
    );

    return json(
      {
        error: error.message ||
          "Unable to create subscription"
      },
      500
    );
  }
}

async function handlePremiumConfirm(request, env) {
  const user =
    await requireFirebaseUser(request, env);

  if (!user) {
    return json(
      {
        error: "Authentication failed"
      },
      401
    );
  }

  let body = {};

  try {
    body = await request.json();
  } catch {}

  const subscriptionId =
    body.subscriptionId ||
    body.razorpay_subscription_id ||
    null;

  try {
    const result =
      await confirmPremium(
        user.localId,
        subscriptionId,
        env
      );

    if (result.active) {
      return json({
        ok: true,
        active: true,
        subscriptionId:
          result.subscription.id,
        premium:
          result.premium
      });
    }

    return json(
      {
        ok: true,
        active: false,
        pending: true,
        premium:
          result.premium
      },
      409
    );
  } catch (error) {
    console.error(
      "Premium confirm error:",
      error
    );

    return json(
      {
        error:
          error.message ||
          "Premium confirmation failed"
      },
      500
    );
  }
}

async function handlePremiumStatus(request, env) {
  const user =
    await requireFirebaseUser(request, env);

  if (!user) {
    return json(
      {
        error: "Authentication failed"
      },
      401
    );
  }

  try {
    /*
      This automatically fixes your current case:
      Firebase has old CREATED ID,
      Razorpay has ACTIVE ID.
    */

    const result =
      await syncPremiumForUser(
        user.localId,
        env
      );

    return json({
      ok: true,
      active:
        result.found &&
        result.premium?.active === true,
      premium:
        result.premium || null,
      subscriptionId:
        result.subscription?.id || null
    });
  } catch (error) {
    console.error(
      "Premium status error:",
      error
    );

    return json(
      {
        error:
          error.message ||
          "Premium status check failed"
      },
      500
    );
  }
}

/* =========================
   MAIN WORKER
========================= */

export default {
  async fetch(request, env) {
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders()
        });
      }

      const url =
        new URL(request.url);

      const path =
        url.pathname;

      /* ---------- PREMIUM ---------- */

      if (
        request.method === "POST" &&
        path === "/api/premium/create-subscription"
      ) {
        return await handlePremiumCreate(
          request,
          env
        );
      }

      if (
        request.method === "POST" &&
        path === "/api/premium/confirm-subscription"
      ) {
        return await handlePremiumConfirm(
          request,
          env
        );
      }

      if (
        request.method === "POST" &&
        path === "/api/premium/sync"
      ) {
        return await handlePremiumConfirm(
          request,
          env
        );
      }

      if (
        request.method === "GET" &&
        path === "/api/premium/status"
      ) {
        return await handlePremiumStatus(
          request,
          env
        );
      }

      if (
        request.method === "POST" &&
        path === "/api/premium/webhook"
      ) {
        return await handlePremiumWebhook(
          request,
          env
        );
      }

      /* ---------- EX ROLEPLAY ---------- */

      if (
        request.method === "POST" &&
        path === "/api/ex-roleplay"
      ) {
        return await handleExRoleplay(
          request,
          env
        );
      }

      if (
        request.method === "POST" &&
        path === "/api/ex-roleplay-image"
      ) {
        return await handleExRoleplayImage(
          request,
          env
        );
      }

      /* ---------- STATIC ASSETS ---------- */

      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return text(
        "MoveOn Worker is running.",
        200
      );
    } catch (error) {
      console.error(
        "Worker fatal error:",
        error
      );

      return json(
        {
          error: "Internal server error"
        },
        500
      );
    }
  }
};
