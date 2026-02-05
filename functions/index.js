const { onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

/* ✅ ADD ADMIN */
exports.addAdmin = onCall({ region: "us-central1" }, async (req) => {
  const caller = req.auth;
  if (!caller?.token?.admin) {
    throw new Error("Only admin can add admin");
  }

  const { uid } = req.data;
  if (!uid) throw new Error("UID required");

  await admin.auth().setCustomUserClaims(uid, { admin: true });

  await admin.firestore().collection("adminLogs").add({
    action: "ADD_ADMIN",
    targetUid: uid,
    by: caller.uid,
    at: Date.now()
  });

  return { success: true };
});

/* ❌ REMOVE ADMIN */
exports.removeAdmin = onCall({ region: "us-central1" }, async (req) => {
  const caller = req.auth;
  if (!caller?.token?.admin) {
    throw new Error("Only admin can remove admin");
  }

  const { uid } = req.data;
  if (!uid) throw new Error("UID required");

  await admin.auth().setCustomUserClaims(uid, {});

  await admin.firestore().collection("adminLogs").add({
    action: "REMOVE_ADMIN",
    targetUid: uid,
    by: caller.uid,
    at: Date.now()
  });

  return { success: true };
});


