import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc }
from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { db } from "./firebase.js";

// Load fathers into dropdown
async function loadFathers() {

  const snapshot = await getDocs(collection(db, "family_members"));
  const select = document.getElementById("fatherSelect");

  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    const option = document.createElement("option");
    option.value = docSnap.id;
    option.textContent = data.name;

    select.appendChild(option);
  });
}

loadFathers();


// Add Member
window.addMember = async function () {

  const name = document.getElementById("name").value;
  const fatherId = document.getElementById("fatherSelect").value;
  const surname = document.getElementById("surname").value;
  const title = document.getElementById("title").value;

  let generation = 1;

  if (fatherId) {
    const fatherSnap = await getDoc(doc(db, "family_members", fatherId));
    generation = fatherSnap.data().generation + 1;
  }

  await addDoc(collection(db, "family_members"), {
    name,
    fatherId: fatherId || null,
    generation,
    surname,
    title: title || "",
    isRoot: fatherId ? false : true,
    isAlive: false,
    branchId: "main-root",
    createdAt: serverTimestamp()
  });

  alert("Member Added Successfully!");
  location.reload();
};
