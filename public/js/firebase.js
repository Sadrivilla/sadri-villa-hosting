import { initializeApp } from 
"https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import { getFirestore } from 
"https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { getAuth } from 
"https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC7gkT4F_dRJpWfef12y6cwV3F2PTMJ6fY",
  authDomain: "sadri-villa-14c06.firebaseapp.com",
  projectId: "sadri-villa-14c06",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
