// storage.js

import {
    ref,
    set,
    get,
    update,
    remove,
    push
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

import {
    database,
    auth
} from "./firebase-config.js";


// ==========================================
// GET CURRENT USER ID
// ==========================================

function getUserId() {

    const user = auth.currentUser;

    if (!user) {
        throw new Error("User is not logged in.");
    }

    return user.uid;
}


// ==========================================
// SAVE USER PROFILE
// ==========================================

export async function saveProfile(profileData) {

    try {

        const uid = getUserId();

        await update(
            ref(database, `users/${uid}`),
            profileData
        );

        return true;

    } catch (error) {

        console.error("Save Profile Error:", error);

        return false;
    }
}


// ==========================================
// GET USER PROFILE
// ==========================================

export async function getProfile() {

    try {

        const uid = getUserId();

        const snapshot =
            await get(ref(database, `users/${uid}`));

        if (snapshot.exists()) {

            return snapshot.val();

        }

        return null;

    } catch (error) {

        console.error("Get Profile Error:", error);

        return null;
    }
}


// ==========================================
// SAVE JOURNAL
// ==========================================

export async function saveJournal(journalData) {

    try {

        const uid = getUserId();

        const journalRef =
            push(ref(database, `users/${uid}/journal`));

        await set(journalRef, {

            ...journalData,

            createdAt: new Date().toISOString()

        });

        return journalRef.key;

    } catch (error) {

        console.error("Save Journal Error:", error);

        return null;
    }
}


// ==========================================
// GET ALL JOURNALS
// ==========================================

export async function getJournals() {

    try {

        const uid = getUserId();

        const snapshot =
            await get(ref(database, `users/${uid}/journal`));

        if (snapshot.exists()) {

            return snapshot.val();

        }

        return {};

    } catch (error) {

        console.error("Get Journals Error:", error);

        return {};
    }
}


// ==========================================
// DELETE JOURNAL
// ==========================================

export async function deleteJournal(journalId) {

    try {

        const uid = getUserId();

        await remove(
            ref(database, `users/${uid}/journal/${journalId}`)
        );

        return true;

    } catch (error) {

        console.error("Delete Journal Error:", error);

        return false;
    }
}


// ==========================================
// SAVE MOOD
// ==========================================

export async function saveMood(moodData) {

    try {

        const uid = getUserId();

        const moodRef =
            push(ref(database, `users/${uid}/moods`));

        await set(moodRef, {

            ...moodData,

            createdAt: new Date().toISOString()

        });

        return moodRef.key;

    } catch (error) {

        console.error("Save Mood Error:", error);

        return null;
    }
}


// ==========================================
// GET MOODS
// ==========================================

export async function getMoods() {

    try {

        const uid = getUserId();

        const snapshot =
            await get(ref(database, `users/${uid}/moods`));

        if (snapshot.exists()) {

            return snapshot.val();

        }

        return {};

    } catch (error) {

        console.error("Get Moods Error:", error);

        return {};
    }
}


// ==========================================
// SAVE CHALLENGE PROGRESS
// ==========================================

export async function saveChallengeProgress(
    challengeId,
    challengeData
) {

    try {

        const uid = getUserId();

        await set(
            ref(
                database,
                `users/${uid}/challenges/${challengeId}`
            ),
            {

                ...challengeData,

                updatedAt: new Date().toISOString()

            }
        );

        return true;

    } catch (error) {

        console.error(
            "Save Challenge Error:",
            error
        );

        return false;
    }
}


// ==========================================
// GET CHALLENGES
// ==========================================

export async function getChallenges() {

    try {

        const uid = getUserId();

        const snapshot =
            await get(
                ref(database, `users/${uid}/challenges`)
            );

        if (snapshot.exists()) {

            return snapshot.val();

        }

        return {};

    } catch (error) {

        console.error(
            "Get Challenges Error:",
            error
        );

        return {};
    }
}


// ==========================================
// SAVE PROGRESS
// ==========================================

export async function saveProgress(progressData) {

    try {

        const uid = getUserId();

        await update(
            ref(database, `users/${uid}/progress`),
            {

                ...progressData,

                updatedAt: new Date().toISOString()

            }
        );

        return true;

    } catch (error) {

        console.error(
            "Save Progress Error:",
            error
        );

        return false;
    }
}


// ==========================================
// GET PROGRESS
// ==========================================

export async function getProgress() {

    try {

        const uid = getUserId();

        const snapshot =
            await get(
                ref(database, `users/${uid}/progress`)
            );

        if (snapshot.exists()) {

            return snapshot.val();

        }

        return {};

    } catch (error) {

        console.error(
            "Get Progress Error:",
            error
        );

        return {};
    }
}


// ==========================================
// SAVE CALM SESSION
// ==========================================

export async function saveCalmSession(sessionData) {

    try {

        const uid = getUserId();

        const calmRef =
            push(ref(database, `users/${uid}/calmSessions`));

        await set(calmRef, {

            ...sessionData,

            createdAt: new Date().toISOString()

        });

        return calmRef.key;

    } catch (error) {

        console.error(
            "Save Calm Session Error:",
            error
        );

        return null;
    }
}


// ==========================================
// GET COMPLETE USER DATA
// ==========================================

export async function getUserData() {

    try {

        const uid = getUserId();

        const snapshot =
            await get(ref(database, `users/${uid}`));

        if (snapshot.exists()) {

            return snapshot.val();

        }

        return null;

    } catch (error) {

        console.error(
            "Get User Data Error:",
            error
        );

        return null;
    }
}