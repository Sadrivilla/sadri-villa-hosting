importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {

    console.log("Background Message:", payload);

    const notificationTitle =
        payload.notification?.title || "Sadri Villa";

    const notificationOptions = {
        body: payload.notification?.body || "",
        icon: "/favicon.png",
        badge: "/favicon.png",
        data: payload.data
    };

    self.registration.showNotification(
        notificationTitle,
        notificationOptions
    );

});

self.addEventListener("notificationclick", function(event){

    event.notification.close();

    let url = "/";

    if(event.notification.data && event.notification.data.url){
        url = event.notification.data.url;
    }

    event.waitUntil(
        clients.openWindow(url)
    );

});
