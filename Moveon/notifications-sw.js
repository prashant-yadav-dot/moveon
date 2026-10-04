importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:'AIzaSyC2xqSeAK7U0uDVzpbSo0EAw3ZtMsPYRZg',authDomain:'moveon-e431b.firebaseapp.com',projectId:'moveon-e431b',storageBucket:'moveon-e431b.firebasestorage.app',messagingSenderId:'692148707719',appId:'1:692148707719:web:ca9a7acfe4edbb9286f322'});
const messaging=firebase.messaging();
messaging.onBackgroundMessage(payload=>{const n=payload.notification||{};self.registration.showNotification(n.title||'MoveOn 💜',{body:n.body||'A gentle reminder for your healing journey.',icon:'/logo.png',badge:'/logo.png',data:payload.data||{}});});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c)return c.focus();}return clients.openWindow('/home.html');}));});
