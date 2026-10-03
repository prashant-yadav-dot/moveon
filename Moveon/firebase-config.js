// firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyC2xqSeAK7U0uDVzpbSo0EAw3ZtMsPYRZg",
    authDomain: "moveon-e431b.firebaseapp.com",
    databaseURL: "https://moveon-e431b-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "moveon-e431b",
    storageBucket: "moveon-e431b.firebasestorage.app",
    messagingSenderId: "692148707719",
    appId: "1:692148707719:web:ca9a7acfe4edbb9286f322",
    measurementId: "G-KX88FX2G7J"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

export {
    app,
    auth,
    database,
    storage,
    analytics
};
