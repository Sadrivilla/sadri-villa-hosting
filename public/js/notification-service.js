import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    getFunctions,
    httpsCallable
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-functions.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import { firebaseConfig } from "../firebase-config.js";

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const auth = getAuth(app);

const functions = getFunctions(app, "us-central1");

const sendPushNotification = httpsCallable(
    functions,
    "sendPushNotification"
);
// ======================================
// Get All Users
// ======================================

async function getAllUsers(){

    const snapshot = await getDocs(
        collection(db,"users")
    );

    return snapshot.docs.map(doc=>({

        id:doc.id,

        ...doc.data()

    }));

}

// ======================================
// Get User By ID
// ======================================

async function getUserById(userId){

    const snapshot = await getDoc(
        doc(db,"users",userId)
    );

    if(!snapshot.exists()){

        return null;

    }

    return{

        id:snapshot.id,

        ...snapshot.data()

    };

}

// ======================================
// Resolve Recipients
// ======================================

async function getRecipients(recipients){

    const users = await getAllUsers();

    // All Users
    if(recipients==="all"){

        return users;

    }

    // Admins Only
    if(recipients==="admins"){

        return users.filter(user=>

            user.role==="admin"

        );

    }

    // Selected Users
    if(Array.isArray(recipients)){

        return users.filter(user=>

            recipients.includes(user.id)

        );

    }

    return [];

}
// ======================================
// Save Dashboard Notification
// ======================================

async function saveDashboardNotification(data){

    try{

        await addDoc(
            collection(db,"notifications"),
            {

                userId:data.userId || "",

                type:data.type || "custom",

                title:data.title || "",

                message:data.message || "",

                url:data.url || "/dashboard.html",

                read:false,

                createdAt:serverTimestamp(),

                createdBy:data.createdBy || "System",

                senderName:data.senderName || "System"

            }
        );

    }catch(error){

        console.error(
            "Dashboard Notification Error:",
            error
        );

    }

}

// ======================================
// Save Notification History
// ======================================

async function saveNotificationHistory(data){

    try{

        await addDoc(
            collection(db,"notification_history"),
            {

                title:data.title || "",

                message:data.message || "",

                notificationType:data.type || "custom",

                delivery:data.delivery || "app",

                status:data.status || "sent",

                browserStatus:data.browserStatus || "",

                appStatus:data.appStatus || "sent",

                userId:data.userId || "",

                userName:data.userName || "",

                email:data.email || "",

                role:data.role || "user",

                triggeredBy:data.triggeredBy || "System",

                read:false,

                createdAt:serverTimestamp()

            }
        );

    }catch(error){

        console.error(
            "Notification History Error:",
            error
        );

    }

}
// ======================================
// Main Notification Engine
// ======================================

async function sendNotification(options){

    const users = await getRecipients(options.recipients);
    let sent = 0;

for(const user of users){

    if(!user.email){
        continue;
    }

    try{

            if(
                !user.fcmToken ||
                user.notificationsEnabled===false
            ){
                continue;
            }

            await saveDashboardNotification({

                userId:user.id,

                type:options.type,

                title:options.title,

                message:options.message,

                url:options.url,

                createdBy:options.triggeredBy || "System",

                senderName:options.triggeredBy || "System"

            });

            await saveNotificationHistory({

                userId:user.id,

                userName:user.fullName,

                email:user.email,

                role:user.role,

                type:options.type,

                title:options.title,

                message:options.message,

                triggeredBy:options.triggeredBy || "System",

                delivery:"app",

                status:"sent",

                appStatus:"sent",

                browserStatus:"pending"

            });
        console.log("Notification URL:", options.url);

           const result = await sendPushNotification({

    token:user.fcmToken,

    title:options.title,

    body:options.message,

    url:options.url

});

console.log(
    "Push sent:",
    user.email,
    result
);
            sent++;

        }catch(error){

           console.error(
    "Notification Error:",
    {
        userId:user.id,
        email:user.email,
        error:error
    }
);

        }
    }

return sent;

}

export {

    db,

    auth,

    sendPushNotification,

    collection,

    getDocs,

    getDoc,

    doc,

    addDoc,

    serverTimestamp,

    getAllUsers,

    getUserById,

getRecipients,

saveDashboardNotification,

saveNotificationHistory,

sendNotification

};
