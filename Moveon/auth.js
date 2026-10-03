// ==========================================
// MoveOn - Complete Authentication System
// Firebase Authentication + Realtime Database
// ==========================================

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    ref,
    set,
    get,
    update
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

import {
    auth,
    database
} from "./firebase-config.js";


// ==========================================
// GET USER PROFILE
// ==========================================

export async function getUserProfile(uid) {

    if (!uid) {
        return null;
    }

    try {

        const userRef =
            ref(database, "users/" + uid);

        const snapshot =
            await get(userRef);

        if (snapshot.exists()) {
            return snapshot.val();
        }

        return null;

    } catch (error) {

        console.error(
            "Get User Profile Error:",
            error
        );

        return null;
    }
}


// ==========================================
// CREATE INITIAL USER PROFILE
// ==========================================

export async function createUserProfile(
    user,
    extraData = {}
) {

    if (!user) {
        return false;
    }

    try {

        const userRef =
            ref(database, "users/" + user.uid);

        const existing =
            await get(userRef);


        // Don't overwrite existing profile
        if (existing.exists()) {

            return true;
        }


        const name =
            extraData.name ||
            user.displayName ||
            "";


        const profile = {

            uid: user.uid,

            name: name,

            email:
                user.email || "",

            createdAt:
                Date.now(),

            profileCompleted:
                false,

            onboardingSkipped:
                false

        };


        await set(
            userRef,
            profile
        );


        console.log(
            "MoveOn user profile created."
        );


        return true;

    } catch (error) {

        console.error(
            "Create User Profile Error:",
            error
        );

        return false;
    }
}


// ==========================================
// SIGN UP
// ==========================================

export async function signupUser(
    name,
    email,
    password
) {

    try {

        const cleanName =
            name
                ? name.trim()
                : "";

        const cleanEmail =
            email
                ? email.trim()
                : "";


        if (!cleanEmail || !password) {

            return {
                success: false,
                error: {
                    code: "auth/missing-fields"
                }
            };
        }


        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                cleanEmail,
                password
            );


        const user =
            userCredential.user;


        // Set Firebase Auth display name
        if (cleanName) {

            await updateProfile(
                user,
                {
                    displayName:
                        cleanName
                }
            );
        }


        // Create MoveOn database profile
        await set(
            ref(
                database,
                "users/" + user.uid
            ),
            {

                uid:
                    user.uid,

                name:
                    cleanName,

                email:
                    cleanEmail,

                createdAt:
                    Date.now(),

                profileCompleted:
                    false,

                onboardingSkipped:
                    false

            }
        );


        return {

            success: true,

            user: user

        };


    } catch (error) {

        console.error(
            "Signup Error:",
            error
        );


        return {

            success: false,

            error: error

        };
    }
}


// ==========================================
// EMAIL LOGIN
// ==========================================

export async function loginUser(
    email,
    password
) {

    try {

        const cleanEmail =
            email
                ? email.trim()
                : "";


        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                cleanEmail,
                password
            );


        const user =
            userCredential.user;


        // Make sure database profile exists
        await createUserProfile(user);


        return {

            success: true,

            user: user

        };


    } catch (error) {

        console.error(
            "Login Error:",
            error
        );


        return {

            success: false,

            error: error

        };
    }
}


// ==========================================
// GOOGLE / APPLE USER PROFILE
// ==========================================

export async function ensureSocialUserProfile(
    user
) {

    if (!user) {
        return null;
    }


    try {

        let profile =
            await getUserProfile(
                user.uid
            );


        // Existing profile
        if (profile) {

            return profile;
        }


        // First-time Google / Apple user
        await createUserProfile(
            user
        );


        profile =
            await getUserProfile(
                user.uid
            );


        return profile;

    } catch (error) {

        console.error(
            "Social Profile Error:",
            error
        );

        return null;
    }
}


// ==========================================
// ROUTE USER
//
// profileCompleted = true
//      -> home.html
//
// profileCompleted = false
//      -> onboarding.html
//
// no profile
//      -> onboarding.html
// ==========================================

export async function routeUser(
    user
) {

    if (!user) {

        window.location.replace(
            "login.html"
        );

        return;
    }


    console.log(
        "MoveOn Auth User:",
        user.uid
    );


    let profile =
        await getUserProfile(
            user.uid
        );


    // If Google/Apple user has no profile
    if (!profile) {

        await createUserProfile(
            user
        );


        profile =
            await getUserProfile(
                user.uid
            );
    }


    // Still no profile
    if (!profile) {

        console.error(
            "Unable to load user profile."
        );

        window.location.replace(
            "onboarding.html"
        );

        return;
    }


    console.log(
        "MoveOn Profile:",
        profile
    );


    // Completed onboarding
    if (
        profile.profileCompleted === true
    ) {

        window.location.replace(
            "home.html"
        );

        return;
    }


    // New / incomplete user
    window.location.replace(
        "onboarding.html"
    );
}


// ==========================================
// REDIRECT IF ALREADY LOGGED IN
// ==========================================

export function redirectIfLoggedIn() {

    return onAuthStateChanged(
        auth,

        async (user) => {

            if (!user) {
                return;
            }


            console.log(
                "Existing MoveOn session detected."
            );


            await routeUser(user);

        },

        (error) => {

            console.error(
                "Auth State Error:",
                error
            );
        }
    );
}


// ==========================================
// REDIRECT CURRENT USER
// ==========================================

export async function redirectUser() {

    const user =
        auth.currentUser;


    if (!user) {

        window.location.replace(
            "login.html"
        );

        return;
    }


    await routeUser(user);
}


// ==========================================
// REQUIRE LOGIN
// ==========================================

export function requireAuth() {

    return onAuthStateChanged(
        auth,

        (user) => {

            if (!user) {

                window.location.replace(
                    "login.html"
                );
            }

        },

        (error) => {

            console.error(
                "Require Auth Error:",
                error
            );

            window.location.replace(
                "login.html"
            );
        }
    );
}


// ==========================================
// AUTH STATE WATCHER
// ==========================================

export function watchAuthState(
    callback
) {

    return onAuthStateChanged(
        auth,

        (user) => {

            callback(user);

        },

        (error) => {

            console.error(
                "Auth State Error:",
                error
            );

            callback(null);
        }
    );
}


// ==========================================
// CURRENT USER
// ==========================================

export function getCurrentUser() {

    return auth.currentUser;
}


// ==========================================
// CURRENT USER PROFILE
// ==========================================

export async function getCurrentUserProfile() {

    const user =
        auth.currentUser;


    if (!user) {
        return null;
    }


    return await getUserProfile(
        user.uid
    );
}


// ==========================================
// UPDATE USER PROFILE
// ==========================================

export async function updateUserProfile(
    data
) {

    const user =
        auth.currentUser;


    if (!user) {

        return {
            success: false,
            error: "NOT_LOGGED_IN"
        };
    }


    try {

        await update(
            ref(
                database,
                "users/" + user.uid
            ),
            data
        );


        // Update Firebase Auth display name
        if (
            data.name &&
            data.name.trim()
        ) {

            await updateProfile(
                user,
                {
                    displayName:
                        data.name.trim()
                }
            );
        }


        return {
            success: true
        };


    } catch (error) {

        console.error(
            "Update Profile Error:",
            error
        );


        return {
            success: false,
            error: error
        };
    }
}


// ==========================================
// COMPLETE ONBOARDING
// ==========================================

export async function completeOnboarding(
    onboardingData = {}
) {

    const user =
        auth.currentUser;


    if (!user) {

        return {
            success: false,
            error: "NOT_LOGGED_IN"
        };
    }


    try {

        await update(
            ref(
                database,
                "users/" + user.uid
            ),
            {

                onboarding:
                    onboardingData,

                profileCompleted:
                    true,

                onboardingSkipped:
                    false,

                onboardingCompletedAt:
                    Date.now()

            }
        );


        return {
            success: true
        };


    } catch (error) {

        console.error(
            "Complete Onboarding Error:",
            error
        );


        return {
            success: false,
            error: error
        };
    }
}


// ==========================================
// SKIP ONBOARDING
// ==========================================

export async function skipOnboarding() {

    const user =
        auth.currentUser;


    if (!user) {

        return {
            success: false,
            error: "NOT_LOGGED_IN"
        };
    }


    try {

        await update(
            ref(
                database,
                "users/" + user.uid
            ),
            {

                profileCompleted:
                    true,

                onboardingSkipped:
                    true,

                onboardingCompletedAt:
                    Date.now()

            }
        );


        return {
            success: true
        };


    } catch (error) {

        console.error(
            "Skip Onboarding Error:",
            error
        );


        return {
            success: false,
            error: error
        };
    }
}


// ==========================================
// PASSWORD RESET
// ==========================================

export async function resetPassword(
    email
) {

    try {

        const cleanEmail =
            email
                ? email.trim()
                : "";


        if (!cleanEmail) {

            return {
                success: false,
                error: {
                    code: "auth/invalid-email"
                }
            };
        }


        await sendPasswordResetEmail(
            auth,
            cleanEmail
        );


        return {
            success: true
        };


    } catch (error) {

        console.error(
            "Password Reset Error:",
            error
        );


        return {
            success: false,
            error: error
        };
    }
}


// ==========================================
// LOGOUT
// ==========================================

export async function logoutUser() {

    try {

        await signOut(auth);


        // Clear only MoveOn auth/onboarding flags
        localStorage.removeItem(
            "moveon_onboarding_completed"
        );


        window.location.replace(
            "login.html"
        );


        return {
            success: true
        };


    } catch (error) {

        console.error(
            "Logout Error:",
            error
        );


        return {
            success: false,
            error: error
        };
    }
}


// ==========================================
// EXPORT AUTH OBJECT
// ==========================================

export {
    auth
};
