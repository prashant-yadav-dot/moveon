// ======================================================
// MoveOn - auth.js
// Firebase Authentication + Persistent Login
// ======================================================

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
    set
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

import {
    auth,
    database
} from "./firebase-config.js";


// ======================================================
// PERSIST LOGIN
// ======================================================
//
// User ek baar login karega to Firebase login ko
// browser ke local storage me persist karega.
//
// Browser close/reopen karne ke baad bhi login rahega.
// Logout karne par hi session end hoga.
// ======================================================

let persistenceReady = null;

async function ensurePersistence() {

    if (!persistenceReady) {

        persistenceReady = setPersistence(
            auth,
            browserLocalPersistence
        );

    }

    return persistenceReady;
}


// ======================================================
// SIGN UP
// ======================================================

export async function signupUser(name, email, password) {

    try {

        await ensurePersistence();

        name = String(name || "").trim();
        email = String(email || "").trim().toLowerCase();
        password = String(password || "");

        if (!name) {
            return {
                success: false,
                error: "Please enter your name."
            };
        }

        if (!email) {
            return {
                success: false,
                error: "Please enter your email address."
            };
        }

        if (!password) {
            return {
                success: false,
                error: "Please enter your password."
            };
        }

        if (password.length < 6) {
            return {
                success: false,
                error: "Password should be at least 6 characters."
            };
        }


        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = userCredential.user;


        await updateProfile(user, {
            displayName: name
        });


        await set(
            ref(database, "users/" + user.uid),
            {
                name: name,
                email: email,
                createdAt: new Date().toISOString(),
                profileCompleted: false
            }
        );


        console.log(
            "Signup successful:",
            user.uid
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
            error: getAuthErrorMessage(error),
            code: error.code || ""
        };

    }

}


// ======================================================
// LOGIN
// ======================================================

export async function loginUser(email, password) {

    try {

        // Make sure login survives browser restart
        await ensurePersistence();


        email = String(email || "").trim().toLowerCase();
        password = String(password || "");


        if (!email) {
            return {
                success: false,
                error: "Please enter your email address."
            };
        }

        if (!password) {
            return {
                success: false,
                error: "Please enter your password."
            };
        }


        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = userCredential.user;


        console.log(
            "Login successful:",
            user.uid
        );


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
            error: getAuthErrorMessage(error),
            code: error.code || ""
        };

    }

}


// ======================================================
// LOGOUT
// ======================================================

export async function logoutUser() {

    try {

        await signOut(auth);

        console.log(
            "User logged out successfully."
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
            error: getAuthErrorMessage(error),
            code: error.code || ""
        };

    }

}


// ======================================================
// CURRENT USER
// ======================================================

export function getCurrentUser() {

    return auth.currentUser;

}


// ======================================================
// AUTH STATE LISTENER
// ======================================================

export function watchAuthState(callback) {

    if (typeof callback !== "function") {

        console.error(
            "watchAuthState: callback must be a function."
        );

        return () => {};

    }


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

        }
    );

}


// ======================================================
// REQUIRE LOGIN
// ======================================================
//
// Protected pages:
// Home
// Journal
// Mood
// Calm
// Support
// Profile
// Progress
// Challenges
// etc.
//
// Logged in  -> page opens
// Logged out -> login.html
// ======================================================

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


// ======================================================
// REDIRECT IF ALREADY LOGGED IN
// ======================================================
//
// IMPORTANT FIX
//
// Pehle:
// logged-in user -> onboarding.html
//
// Ab:
// logged-in user -> home.html
//
// Isse user ko baar-baar login/onboarding nahi karna padega.
// ======================================================

export function redirectIfLoggedIn() {

    return onAuthStateChanged(
        auth,
        (user) => {

            if (user) {

                console.log(
                    "Existing login detected. Opening Home."
                );

                window.location.replace(
                    "index.html"
                );

            }

        },
        (error) => {

            console.error(
                "Redirect Auth Error:",
                error
            );

        }
    );

}


// ======================================================
// FIREBASE AUTH ERROR HANDLER
// ======================================================

function getAuthErrorMessage(error) {

    if (!error) {
        return "Something went wrong.";
    }


    switch (error.code) {

        case "auth/email-already-in-use":
            return "This email is already registered.";

        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/weak-password":
            return "Password should be at least 6 characters.";

        case "auth/operation-not-allowed":
            return "Email/password sign-in is not enabled in Firebase.";

        case "auth/password-does-not-meet-requirements":
            return "Your password does not meet the required security rules.";

        case "auth/invalid-credential":
            return "Incorrect email or password.";

        case "auth/user-not-found":
            return "No account found with this email.";

        case "auth/wrong-password":
            return "Incorrect email or password.";

        case "auth/user-disabled":
            return "This account has been disabled.";

        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";

        case "auth/network-request-failed":
            return "Network error. Please check your internet connection.";

        case "auth/internal-error":
            return "Firebase encountered an internal error. Please try again.";

        case "auth/timeout":
            return "The request timed out. Please try again.";

        case "auth/app-not-authorized":
            return "This app is not authorized to use Firebase Authentication.";

        case "auth/api-key-not-valid":
            return "Firebase API key is invalid.";

        case "auth/invalid-api-key":
            return "Firebase API key is invalid.";

        case "auth/invalid-app-credential":
            return "Firebase app credentials are invalid.";

        default:

            console.error(
                "Unhandled Firebase Auth Error:",
                error.code,
                error.message
            );

            return (
                error.message ||
                "Something went wrong. Please try again."
            );

    }

}


export {
    getAuthErrorMessage
};
