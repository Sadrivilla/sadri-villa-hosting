const functions = require("firebase-functions");
const admin = require("firebase-admin");

exports.sendPushNotification = functions.https.onCall(async (request) => {

    try {

        const token = request.data.token;
        const title = request.data.title;
        const body = request.data.body;
        const url = request.data.url || "/dashboard.html";

        if (!token) {

            throw new functions.https.HttpsError(
                "invalid-argument",
                "FCM token is required."
            );

        }

        const message = {

            token: token,

            notification: {

                title: title || "Sadri Villa",

                body: body || ""

            },

            data: {

                url: url

            },

            webpush: {

                notification: {

                    icon: "/favicon.png",

                    badge: "/favicon.png"

                }

            }

        };

        const response = await admin.messaging().send(message);

        return {

            success: true,

            messageId: response

        };

    } catch (error) {

        console.error(error);

        throw new functions.https.HttpsError(
            "internal",
            error.message
        );

    }

});
