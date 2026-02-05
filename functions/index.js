const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Call once to make a user admin
 * Use UID as input
 */
exports.makeAdmin = functions.https.onCall(async (data, context) => {

  // 🔐 Only existing admins can make another admin
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can assign admin role"
    );
  }

  const uid = data.uid;

  if (!uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "UID is required"
    );
  }

  await admin.auth().setCustomUserClaims(uid, { admin: true });

  return { success: true, message: "Admin claim added" };
});
