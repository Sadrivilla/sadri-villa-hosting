const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * TEMPORARY – Run ONCE to create first admin
 */
exports.bootstrapAdmin = functions.https.onCall(async (data, context) => {
  const uid = data.uid;

  if (!uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "UID is required"
    );
  }

  await admin.auth().setCustomUserClaims(uid, { admin: true });

  return {
    success: true,
    message: "Admin claim added"
  };
});

