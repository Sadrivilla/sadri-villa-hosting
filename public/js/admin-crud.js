import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

import { db, storage } from "./firebase.js";

import { 
  collection,
  getDocs, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  deleteDoc,
  updateDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let editingId = null;

/* ================= NOTIFICATION ================= */

function showMessage(message, type = "success") {

  const box = document.getElementById("notification");
  if (!box) return;

  box.textContent = message;
  box.style.display = "block";

  if (type === "success") box.style.backgroundColor = "#16a34a";
  else if (type === "error") box.style.backgroundColor = "#dc2626";
  else box.style.backgroundColor = "#f59e0b";

  setTimeout(() => {
    box.style.display = "none";
  }, 3000);
}

/* ================= LOAD FATHERS ================= */

async function loadFathers() {

  const snapshot = await getDocs(collection(db, "family_members"));
  const select = document.getElementById("fatherSelect");
  if (!select) return;

  select.innerHTML = '<option value="">-- Select Father (Leave empty for Root) --</option>';

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const option = document.createElement("option");
    option.value = docSnap.id;
    option.textContent = data.name;
    select.appendChild(option);
  });
}

loadFathers();

/* ================= LOAD MEMBERS ================= */

async function loadMembers() {

  const searchValue = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const generationValue = document.getElementById("generationFilter")?.value;

  const snapshot = await getDocs(collection(db, "family_members"));
  const container = document.getElementById("memberList");
  if (!container) return;

  container.innerHTML = "";

  const generations = new Set();

  snapshot.forEach(docSnap => {

    const data = docSnap.data();
    generations.add(data.generation);

    if (searchValue && !data.name.toLowerCase().includes(searchValue)) return;
    if (generationValue && data.generation != generationValue) return;

    const imageUrl = data.profileImage || "https://via.placeholder.com/70";

    const div = document.createElement("div");

    div.innerHTML = `
      <div class="card member-card">

        <img src="${imageUrl}" class="profile-img">

        <div class="member-details">
          <strong>${data.name}</strong><br>
          Generation: ${data.generation}<br>
          DOB: ${data.dob || '-'}
        </div>

        <div class="actions">
          <button onclick="editMember('${docSnap.id}')" class="btn primary">
            Edit
          </button>

          <button onclick="deleteMember('${docSnap.id}')" class="btn danger">
            Delete
          </button>
        </div>

      </div>
    `;

    container.appendChild(div);
  });

  populateGenerationFilter(generations);
}

loadMembers();

/* ================= ADD MEMBER ================= */

window.addMember = async function () {

  try {

    const name = document.getElementById("name").value.trim();
    const fatherId = document.getElementById("fatherSelect").value;
    const surname = document.getElementById("surname").value.trim();
    const title = document.getElementById("title").value.trim();
    const dob = document.getElementById("dob").value;
    const file = document.getElementById("profileImage").files[0];

    if (!name) {
      showMessage("Name is required!", "error");
      return;
    }

    if (file && file.size > 2 * 1024 * 1024) {
      showMessage("Image must be under 2MB.", "error");
      return;
    }

    let generation = 1;

    if (fatherId) {
      const fatherSnap = await getDoc(doc(db, "family_members", fatherId));
      generation = fatherSnap.data().generation + 1;
    }

    showMessage("Creating member...", "warning");

    const docRef = await addDoc(collection(db, "family_members"), {
      name,
      fatherId: fatherId || null,
      generation,
      surname,
      title: title || "",
      dob: dob || "",
      profileImage: "",
      isRoot: fatherId ? false : true,
      isAlive: false,
      branchId: "main-root",
      createdAt: serverTimestamp()
    });

    if (file) {
      const imageRef = ref(storage, "profilePhotos/" + docRef.id + "/profile.jpg");
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);

      await updateDoc(doc(db, "family_members", docRef.id), {
        profileImage: downloadURL
      });
    }

    showMessage("Member Added Successfully!", "success");

    clearForm();
    loadMembers();
    loadFathers();

  } catch (error) {
    console.error(error);
    showMessage(error.message, "error");
  }
};

/* ================= EDIT MEMBER ================= */

window.editMember = async function(id) {

  const snap = await getDoc(doc(db, "family_members", id));
  if (!snap.exists()) {
    showMessage("Member not found.", "error");
    return;
  }

  const data = snap.data();

  document.getElementById("name").value = data.name;
  document.getElementById("surname").value = data.surname || "";
  document.getElementById("title").value = data.title || "";
  document.getElementById("fatherSelect").value = data.fatherId || "";
  document.getElementById("dob").value = data.dob || "";

  editingId = id;

  showMessage("Now update details and click Save Member.", "warning");
};

/* ================= UPDATE MEMBER ================= */

window.updateMember = async function () {

  if (!editingId) {
    showMessage("Click Edit first.", "warning");
    return;
  }

  try {

    const name = document.getElementById("name").value.trim();
    const fatherId = document.getElementById("fatherSelect").value;
    const surname = document.getElementById("surname").value.trim();
    const title = document.getElementById("title").value.trim();
    const dob = document.getElementById("dob").value;
    const file = document.getElementById("profileImage").files[0];

    let generation = 1;

    if (fatherId) {
      const fatherSnap = await getDoc(doc(db, "family_members", fatherId));
      generation = fatherSnap.data().generation + 1;
    }

    await updateDoc(doc(db, "family_members", editingId), {
      name,
      fatherId: fatherId || null,
      generation,
      surname,
      title: title || "",
      dob: dob || ""
    });

    if (file) {
      const imageRef = ref(storage, "profilePhotos/" + editingId + "/profile.jpg");

      try { await deleteObject(imageRef); } catch(e){}

      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);

      await updateDoc(doc(db, "family_members", editingId), {
        profileImage: downloadURL
      });
    }

    showMessage("Member Updated Successfully!", "success");

    editingId = null;
    clearForm();
    loadMembers();

  } catch (error) {
    showMessage(error.message, "error");
  }
};

/* ================= DELETE MEMBER ================= */

window.deleteMember = async function (id) {

  if (!confirm("Are you sure you want to delete this member?")) return;

  const memberSnap = await getDoc(doc(db, "family_members", id));
  if (!memberSnap.exists()) return;

  const memberData = memberSnap.data();

  if (memberData.isRoot === true) {
    showMessage("Cannot delete root ancestor.", "warning");
    return;
  }

  const q = query(collection(db, "family_members"), where("fatherId", "==", id));
  const childrenSnapshot = await getDocs(q);

  if (!childrenSnapshot.empty) {
    showMessage("Cannot delete member with children.", "warning");
    return;
  }

  try {
    const imageRef = ref(storage, "profilePhotos/" + id + "/profile.jpg");
    await deleteObject(imageRef);
  } catch(e){}

  await deleteDoc(doc(db, "family_members", id));

  showMessage("Member Deleted Successfully.", "success");
  loadMembers();
};

/* ================= HELPERS ================= */

function clearForm() {
  document.getElementById("name").value = "";
  document.getElementById("surname").value = "";
  document.getElementById("title").value = "";
  document.getElementById("fatherSelect").value = "";
  document.getElementById("dob").value = "";
  document.getElementById("profileImage").value = "";
}

function populateGenerationFilter(generations) {

  const select = document.getElementById("generationFilter");
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = '<option value="">All Generations</option>';

  Array.from(generations)
    .sort((a, b) => a - b)
    .forEach(gen => {
      const option = document.createElement("option");
      option.value = gen;
      option.textContent = "Generation " + gen;
      select.appendChild(option);
    });

  select.value = currentValue;
}

document.addEventListener("input", e => {
  if (e.target.id === "searchInput") loadMembers();
});

document.addEventListener("change", e => {
  if (e.target.id === "generationFilter") loadMembers();
});

window.resetFilters = function() {
  document.getElementById("searchInput").value = "";
  document.getElementById("generationFilter").value = "";
  loadMembers();
};
