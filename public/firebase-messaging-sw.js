importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyC7gkT4F_dRJpWfef12y6cwV3F2PTMJ6fY",
    authDomain: "sadri-villa-14c06.firebaseapp.com",
    projectId: "sadri-villa-14c06",
    storageBucket: "sadri-villa-14c06.firebasestorage.app",
    messagingSenderId: "687608762860",
    appId: "1:687608762860:web:5ffdc557f3893d00e530c9"
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
