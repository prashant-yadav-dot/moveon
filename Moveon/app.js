// ======================================================
// MoveOn - app.js
// Main App Controller
// ======================================================

import {
    auth
} from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getProfile
} from "./storage.js";


// ======================================================
// PAGE LOAD
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    startMoveOnApp();

});


// ======================================================
// START APP
// ======================================================

function startMoveOnApp() {

    onAuthStateChanged(
        auth,
        async (user) => {

            if (user) {

                console.log(
                    "MoveOn User:",
                    user.uid
                );

                // Load user information
                await loadUserInformation(user);

                // Setup app controls
                setupLogoutButtons();
                setupNavigation();

            } else {

                console.log(
                    "No user logged in."
                );

                setupPublicPages();

            }

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
// LOAD USER INFORMATION
// ======================================================

async function loadUserInformation(user) {

    let profile = null;


    // ------------------------------------------
    // Get profile from Realtime Database
    // ------------------------------------------

    try {

        profile = await getProfile();

    } catch (error) {

        console.error(
            "Profile loading error:",
            error
        );

    }


    // ------------------------------------------
    // User name
    // ------------------------------------------

    const userName =
        profile?.name ||
        user.displayName ||
        "Friend";


    // ------------------------------------------
    // User email
    // ------------------------------------------

    const userEmail =
        profile?.email ||
        user.email ||
        "";


    // ------------------------------------------
    // Update name
    // ------------------------------------------

    const nameElements =
        document.querySelectorAll(
            "[data-user-name]"
        );


    nameElements.forEach(
        (element) => {

            element.textContent =
                userName;

        }
    );


    // ------------------------------------------
    // Update email
    // ------------------------------------------

    const emailElements =
        document.querySelectorAll(
            "[data-user-email]"
        );


    emailElements.forEach(
        (element) => {

            element.textContent =
                userEmail;

        }
    );


    // ------------------------------------------
    // Update avatar initials
    // ------------------------------------------

    const avatarElements =
        document.querySelectorAll(
            "[data-user-avatar]"
        );


    const initials =
        getInitials(userName);


    avatarElements.forEach(
        (element) => {

            element.textContent =
                initials;

        }
    );

}


// ======================================================
// GET INITIALS
// ======================================================

function getInitials(name) {

    if (!name) {
        return "M";
    }


    const cleanName =
        String(name).trim();


    if (!cleanName) {
        return "M";
    }


    const words =
        cleanName.split(/\s+/);


    // One-word name
    if (words.length === 1) {

        return words[0]
            .substring(0, 2)
            .toUpperCase();

    }


    // Multiple words
    return (
        words[0][0] +
        words[words.length - 1][0]
    ).toUpperCase();

}


// ======================================================
// LOGOUT BUTTONS
// ======================================================

function setupLogoutButtons() {

    const logoutButtons =
        document.querySelectorAll(
            "[data-logout]"
        );


    logoutButtons.forEach(
        (button) => {

            // Prevent duplicate event listeners
            if (
                button.dataset.logoutReady ===
                "true"
            ) {
                return;
            }


            button.dataset.logoutReady =
                "true";


            button.addEventListener(
                "click",
                async (event) => {

                    event.preventDefault();


                    // Prevent double-click logout
                    if (
                        button.dataset.loggingOut ===
                        "true"
                    ) {
                        return;
                    }


                    button.dataset.loggingOut =
                        "true";


                    try {

                        // IMPORTANT:
                        // Firebase Modular SDK
                        // uses signOut(auth)
                        await signOut(auth);


                        console.log(
                            "User logged out successfully."
                        );


                        // Redirect after logout
                        window.location.replace(
                            "login.html"
                        );


                    } catch (error) {

                        console.error(
                            "Logout error:",
                            error
                        );


                        button.dataset.loggingOut =
                            "false";


                        alert(
                            "Unable to logout. Please try again."
                        );

                    }

                }
            );

        }
    );

}


// ======================================================
// NAVIGATION
// ======================================================

function setupNavigation() {

    const navigationElements =
        document.querySelectorAll(
            "[data-page]"
        );


    navigationElements.forEach(
        (element) => {

            // Prevent duplicate listeners
            if (
                element.dataset.navigationReady ===
                "true"
            ) {
                return;
            }


            element.dataset.navigationReady =
                "true";


            element.addEventListener(
                "click",
                (event) => {

                    const page =
                        element.dataset.page;


                    if (!page) {
                        return;
                    }


                    event.preventDefault();


                    window.location.href =
                        page;

                }
            );

        }
    );

}


// ======================================================
// PUBLIC / PROTECTED PAGE SETUP
// ======================================================

function setupPublicPages() {

    const currentPage =
        window.location.pathname
            .split("/")
            .pop();


    // ------------------------------------------
    // Protected pages
    // ------------------------------------------

    const protectedPages = [

        "index.html",

        "onboarding.html",

        "journal.html",

        "mood.html",

        "contact.html",

        "challenges.html",

        "calm.html",

        "support.html",

        "progress.html",

        "profile.html",

        "nocontact.html",

        "lessons.html"

    ];


    // ------------------------------------------
    // Redirect unauthenticated users
    // ------------------------------------------

    if (
        protectedPages.includes(
            currentPage
        )
    ) {

        window.location.replace(
            "login.html"
        );

    }

}


// ======================================================
// EXPORT FUNCTIONS
// ======================================================

export {
    loadUserInformation,
    setupLogoutButtons,
    setupNavigation
};