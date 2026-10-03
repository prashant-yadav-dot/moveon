// ==========================================
// MoveOn - Authentication System
// Firebase Auth + Profile/Onboarding Routing
// ==========================================

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    ref,
    set,
    get
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

import {
    auth,
    database
} from "./firebase-config.js";


// ==========================================
// HELPER: GET USER PROFILE
// ==========================================

async function getUserProfile(uid) {

    try {

        const userRef = ref(
            database,
            "users/" + uid
        );

        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            return snapshot.val();
        }

        return null;

    } catch (error) {

        console.error(
            "Get user profile error:",
            error
        );

        return null;
    }
}


// ==========================================
// HELPER: ROUTE USER
// ==========================================

async function routeUser(user) {

    if (!user) {

        window.location.replace("login.html");

        return;
    }


    const profile =
        await getUserProfile(user.uid);


    // --------------------------------------
    // New user / profile not found
    // --------------------------------------

    if (!profile) {

        window.location.replace(
            "onboarding.html"
        );

        return;
    }


    // --------------------------------------
    // Onboarding completed
    // --------------------------------------

    if (
        profile.profileCompleted === true
    ) {

        window.location.replace(
            "home.html"
        );

        return;
    }


    // --------------------------------------
    // Onboarding not completed
    // --------------------------------------

    window.location.replace(
        "onboarding.html"
    );
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

        // Make login persistent
        await setPersistence(
            auth,
            browserLocalPersistence
        );


        // Create Firebase Auth user
        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            userCredential.user;


        // Save display name
        const cleanName =
            name
                ? name.trim()
                : "";


        if (cleanName !== "") {

            await updateProfile(
                user,
                {
                    displayName:
                        cleanName
                }
            );

        }


        // Create user profile
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
                    email,

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
// LOGIN
// ==========================================

export async function loginUser(
    email,
    password
) {

    try {

        // Keep user logged in
        await setPersistence(
            auth,
            browserLocalPersistence
        );


        // Firebase login
        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            userCredential.user;


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
// LOGOUT
// ==========================================

export async function logoutUser() {

    try {

        await signOut(auth);


        window.location.replace(
            "login.html"
        );


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
// GET CURRENT USER
// ==========================================

export function getCurrentUser() {

    return auth.currentUser;

}


// ==========================================
// WATCH AUTH STATE
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
// REQUIRE LOGIN
// ==========================================
// Use on protected pages:
// home.html
// journal.html
// mood.html
// challenges.html
// calm.html
// support.html
// progress.html
// profile.html
// etc.
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
// REDIRECT IF ALREADY LOGGED IN
// ==========================================
// Public pages:
// login.html
// signup.html
//
// New user -> onboarding.html
// Completed user -> home.html
// ==========================================

export function redirectIfLoggedIn() {

    return onAuthStateChanged(
        auth,
        async (user) => {

            if (!user) {

                return;

            }


            console.log(
                "Logged-in user detected:",
                user.uid
            );


            await routeUser(user);

        },
        (error) => {

            console.error(
                "Redirect Auth Error:",
                error
            );

        }
    );
}


// ==========================================
// ROUTE CURRENT USER
// ==========================================
// Can be used manually from login/signup
// after successful authentication.
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
// EXPORT PROFILE HELPER
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
