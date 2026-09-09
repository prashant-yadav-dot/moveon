// ======================================================
// MoveOn - auth.js
// Firebase Authentication + User Profile
// ======================================================

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
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
// SIGN UP
// ======================================================

export async function signupUser(name, email, password) {

    try {

        // Clean input
        name = String(name || "").trim();
        email = String(email || "").trim().toLowerCase();
        password = String(password || "");

        // Basic validation
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


        // ------------------------------------------
        // CREATE FIREBASE AUTH ACCOUNT
        // ------------------------------------------

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = userCredential.user;


        // ------------------------------------------
        // SAVE DISPLAY NAME
        // ------------------------------------------

        await updateProfile(user, {
            displayName: name
        });


        // ------------------------------------------
        // CREATE USER PROFILE IN DATABASE
        // ------------------------------------------

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

        // Clean input
        email = String(email || "").trim().toLowerCase();
        password = String(password || "");


        // Basic validation
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


        // ------------------------------------------
        // FIREBASE LOGIN
        // ------------------------------------------

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

        // IMPORTANT:
        // Firebase signOut must be called like this:
        // signOut(auth)

        await signOut(auth);

        console.log(
            "User logged out successfully."
        );


        // Redirect after successful logout
        window.location.replace("login.html");


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

export function requireAuth() {

    return onAuthStateChanged(
        auth,
        (user) => {

            if (!user) {

                // Current page is protected
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

        }
    );

}


// ======================================================
// REDIRECT IF ALREADY LOGGED IN
// ======================================================

export function redirectIfLoggedIn() {

    return onAuthStateChanged(
        auth,
        (user) => {

            if (user) {

                window.location.replace(
                    "onboarding.html"
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

        // ------------------------------------------
        // SIGNUP ERRORS
        // ------------------------------------------

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


        // ------------------------------------------
        // LOGIN ERRORS
        // ------------------------------------------

        case "auth/invalid-credential":
            return "Incorrect email or password.";

        case "auth/user-not-found":
            return "No account found with this email.";

        case "auth/wrong-password":
            return "Incorrect email or password.";

        case "auth/user-disabled":
            return "This account has been disabled.";


        // ------------------------------------------
        // REQUEST / NETWORK ERRORS
        // ------------------------------------------

        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";

        case "auth/network-request-failed":
            return "Network error. Please check your internet connection.";

        case "auth/internal-error":
            return "Firebase encountered an internal error. Please try again.";

        case "auth/timeout":
            return "The request timed out. Please try again.";


        // ------------------------------------------
        // APP / CONFIGURATION ERRORS
        // ------------------------------------------

        case "auth/app-not-authorized":
            return "This app is not authorized to use Firebase Authentication.";

        case "auth/api-key-not-valid":
            return "Firebase API key is invalid.";

        case "auth/invalid-api-key":
            return "Firebase API key is invalid.";

        case "auth/invalid-app-credential":
            return "Firebase app credentials are invalid.";


        // ------------------------------------------
        // DEFAULT
        // ------------------------------------------

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


// ======================================================
// OPTIONAL: EXPORT ERROR HANDLER
// ======================================================

export {
    getAuthErrorMessage
};