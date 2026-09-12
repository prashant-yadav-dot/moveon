// ==========================================
// MoveOn - Authentication System
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
// SIGN UP
// ==========================================

export async function signupUser(name, email, password) {

    try {

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = userCredential.user;

        // Save display name
        if (name && name.trim() !== "") {

            await updateProfile(user, {
                displayName: name.trim()
            });

        }

        // Save user profile in Firebase Database
        await set(
            ref(database, "users/" + user.uid),
            {
                uid: user.uid,
                name: name ? name.trim() : "",
                email: email,
                createdAt: Date.now(),
                profileCompleted: false
            }
        );

        return {
            success: true,
            user: user
        };

    } catch (error) {

        console.error("Signup Error:", error);

        return {
            success: false,
            error: error
        };
    }
}


// ==========================================
// LOGIN
// ==========================================

export async function loginUser(email, password) {

    try {

        // IMPORTANT:
        // Keep user logged in even after
        // closing and reopening the browser.
        await setPersistence(
            auth,
            browserLocalPersistence
        );

        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        return {
            success: true,
            user: userCredential.user
        };

    } catch (error) {

        console.error("Login Error:", error);

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

        // After explicit logout,
        // send user to public login page.
        window.location.replace("login.html");

    } catch (error) {

        console.error("Logout Error:", error);

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

export function watchAuthState(callback) {

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
// Use this on protected pages such as:
// home.html
// journal.html
// mood.html
// challenges.html
// calm.html
// support.html
// progress.html
// profile.html
// etc.

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
// This function is mainly for login/signup pages.
//
// If the user is already logged in and opens:
// login.html
//
// They should NOT be sent to onboarding.
// They should go directly to home.html.
//
// index.html remains the PUBLIC landing page.

export function redirectIfLoggedIn() {

    return onAuthStateChanged(
        auth,
        (user) => {

            if (user) {

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
