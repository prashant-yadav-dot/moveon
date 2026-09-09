// firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDiyugFF7XBXQNZUyn1SDAUgnavcqa41jI",
    authDomain: "moveon-84795.firebaseapp.com",
    databaseURL: "https://moveon-84795-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "moveon-84795",
    storageBucket: "moveon-84795.firebasestorage.app",
    messagingSenderId: "484263665992",
    appId: "1:484263665992:web:93ca9924b44bd36f0bd37d",
    measurementId: "G-VN20E9SNE3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Authentication
const auth = getAuth(app);

// Realtime Database
const database = getDatabase(app);

// Firebase Analytics
const analytics = getAnalytics(app);

export {
    app,
    auth,
    database,
    analytics
};