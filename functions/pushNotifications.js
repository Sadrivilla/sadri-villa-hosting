const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

exports.sendPushNotification = onCall(async (request) => {
  try {
    const { token, title, body, url = "/dashboard.html" } = request.data;

    if (!token) {
      throw new HttpsError(
        "invalid-argument",
        "FCM token is required."
      );
    }

    const message = {
      token,
      notification: {
        title: title || "Sadri Villa",
        body: body || ""
      },
      data: {
        url
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

    throw new HttpsError(
      "internal",
      error.message || "Failed to send notification."
    );
  }
});
