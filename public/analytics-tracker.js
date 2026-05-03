import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, collection, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const app = initializeApp({
  apiKey:"AIzaSyC7gkT4F_dRJpWfef12y6cwV3F2PTMJ6fY",
  authDomain:"sadri-villa-14c06.firebaseapp.com",
  projectId:"sadri-villa-14c06"
});

const db = getFirestore(app);
const auth = getAuth(app);

function getPageName(){
  let page = window.location.pathname.split("/").pop().replace(".html","");
  return page || "index";
}

async function trackPage(){
  const page = getPageName();
  const key = "visited_" + page;

  if(sessionStorage.getItem(key)) return;

const user = auth.currentUser;

await setDoc(doc(collection(db,"analytics_logs")),{
  page: page,
  userId: user ? user.uid : "guest",
  timestamp: Date.now()
});

  sessionStorage.setItem(key,"true");
}

onAuthStateChanged(auth, user=>{
  trackPage(); // always track (guest + user)
});
