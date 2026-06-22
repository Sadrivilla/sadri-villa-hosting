const functions = require("firebase-functions");
const admin = require("firebase-admin");

exports.sendPushNotification = functions.https.onCall(async (request) => {

    return {
        success: true,
        message: "Push Notification Function Created"
    };

});
