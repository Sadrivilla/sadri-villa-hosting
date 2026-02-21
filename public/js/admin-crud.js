import { 
  collection, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

async function loadMembers() {

  const snapshot = await getDocs(collection(db, "family_members"));
  const container = document.getElementById("memberList");

  container.innerHTML = "";

  snapshot.forEach(docSnap => {

    const data = docSnap.data();

    const div = document.createElement("div");
    div.style.marginBottom = "10px";

    div.innerHTML = `
      ${data.name} (Gen ${data.generation})
      <button onclick="deleteMember('${docSnap.id}')" 
      style="margin-left:10px;background:red;color:white;border:none;padding:5px 10px;border-radius:5px;">
      Delete
      </button>
    `;

    container.appendChild(div);
  });
}

loadMembers();
// Add Member
window.addMember = async function () {

  const name = document.getElementById("name").value.trim();
  const fatherId = document.getElementById("fatherSelect").value;
  const surname = document.getElementById("surname").value.trim();
  const title = document.getElementById("title").value.trim();

  if (!name) {
    alert("Name is required!");
    return;
  }

  let generation = 1;

  if (fatherId) {
    const fatherSnap = await getDoc(doc(db, "family_members", fatherId));

    if (!fatherSnap.exists()) {
      alert("Invalid father selected.");
      return;
    }

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


// Delete Member
window.deleteMember = async function (id) {

  if (!confirm("Are you sure you want to delete this member?")) return;

  // Get member details
  const memberSnap = await getDoc(doc(db, "family_members", id));

  if (!memberSnap.exists()) {
    alert("Member not found.");
    return;
  }

  const memberData = memberSnap.data();

  // 🚫 Prevent deleting root
  if (memberData.isRoot === true) {
    alert("You cannot delete the root ancestor.");
    return;
  }

  // 🔍 Check if member has children
  const snapshot = await getDocs(collection(db, "family_members"));

  let hasChildren = false;

  snapshot.forEach(docSnap => {
    if (docSnap.data().fatherId === id) {
      hasChildren = true;
    }
  });

  if (hasChildren) {
    alert("Cannot delete this member because they have children.");
    return;
  }

  // ✅ Safe to delete
  await deleteDoc(doc(db, "family_members", id));

  alert("Member Deleted Successfully.");
  location.reload();
};
