<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
  import { getFunctions } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

  const firebaseConfig = {
    apiKey: "AIzaSyC7gkT4F_dRJpWfef12y6cwV3F2PTMJ6fY",
    authDomain: "sadri-villa-14c06.firebaseapp.com",
    projectId: "sadri-villa-14c06",
    storageBucket: "sadri-villa-14c06.firebasestorage.app",
    messagingSenderId: "687608762860",
    appId: "1:687608762860:web:5ffdc557f3893d00e530c9",
  };

  export const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);
  export const db = getFirestore(app);
  export const functions = getFunctions(app, "us-central1");
</script>
