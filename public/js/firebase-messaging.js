import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
getMessaging,
onMessage
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging.js";

const firebaseConfig = {

apiKey: "AIzaSyC7gkT4F_dRJpWfef12y6cwV3F2PTMJ6fY",

authDomain: "sadri-villa-14c06.firebaseapp.com",

projectId: "sadri-villa-14c06",

storageBucket: "sadri-villa-14c06.firebasestorage.app",

messagingSenderId: "687608762860",

appId: "1:687608762860:web:5ffdc557f3893d00e530c9"

};

const app = initializeApp(firebaseConfig);

const messaging = getMessaging(app);

onMessage(messaging,(payload)=>{

console.log("Foreground Message:",payload);

new Notification(

payload.notification?.title || "Sadri Villa",

{

body:payload.notification?.body || "",

icon:"/favicon.png"

}

);

});
