// MoveOn Premium — Firebase + Razorpay subscription client
import { auth, database } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

export async function getPremiumStatus(user = auth.currentUser) {
    if (!user) return { active: false };

    try {
        const snap = await get(ref(database, `users/${user.uid}/premium`));
        const data = snap.exists() ? (snap.val() || {}) : {};
        const expiresAt = Number(data.expiresAt || 0);
        const active = data.active === true && (!expiresAt || expiresAt > Date.now());

        return { ...data, active };
    } catch (error) {
        console.error("Premium status error:", error);
        return { active: false, error };
    }
}

export async function requirePremium(redirect = "premium.html") {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
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

            document.documentElement.classList.add("premium-ready");
            resolve(true);
        });
    });
}

export function formatPremiumDate(timestamp) {
    if (!timestamp) return "Active";
    const date = new Date(Number(timestamp));
    if (Number.isNaN(date.getTime())) return "Active";
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}
