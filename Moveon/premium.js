
// MoveOn Premium — Firebase + Razorpay + Owner Lifetime Access

import { auth, database } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

// Must match OWNER_EMAIL configured in Cloudflare Worker
const OWNER_EMAIL = "app.moveon.recovery@gmail.com";

export async function getPremiumStatus(user = auth.currentUser) {

    if (!user) {
        return { active: false };
    }

    // Owner gets lifetime Premium
    const email = String(user.email || "")
        .trim()
        .toLowerCase();

    if (email === OWNER_EMAIL.toLowerCase()) {
        return {
            active: true,
            owner: true,
            pending: false,
            plan: "lifetime",
            expiresAt: 0
        };
    }

    // Normal users: Firebase Premium verification
    try {

        const snap = await get(
            ref(database, `users/${user.uid}/premium`)
        );

        const data = snap.exists()
            ? (snap.val() || {})
            : {};

        const expiresAt = Number(data.expiresAt || 0);

        const active =
            data.active === true &&
            (!expiresAt || expiresAt > Date.now());

        return {
            ...data,
            active,
            owner: false
        };

    } catch (error) {

        console.error("Premium status error:", error);

        return {
            active: false,
            error
        };
    }
}

export async function requirePremium(
    redirect = "premium.html"
) {

    return new Promise((resolve) => {

        const unsubscribe = onAuthStateChanged(
            auth,
            async (user) => {

                unsubscribe();

                if (!user) {

                    window.location.replace("login.html");

                    resolve(false);
                    return;
                }

                const status = await getPremiumStatus(user);

                if (!status.active) {

                    window.location.replace(redirect);

                    resolve(false);
                    return;
                }

                document.documentElement.classList.add(
                    "premium-ready"
                );

                resolve(true);
            }
        );

    });
}

export function formatPremiumDate(timestamp) {

    if (!timestamp) {
        return "Lifetime Access";
    }

    const date = new Date(Number(timestamp));

    if (Number.isNaN(date.getTime())) {
        return "Active";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}
