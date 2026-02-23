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
function showMessage(message, type = "success") {

  const box = document.getElementById("notification");

  box.textContent = message;
  box.style.display = "block";

  if (type === "success") {
    box.style.backgroundColor = "#28a745";
  } 
  else if (type === "error") {
    box.style.backgroundColor = "#dc3545";
  } 
  else if (type === "warning") {
    box.style.backgroundColor = "#ffc107";
    box.style.color = "black";
  }

  setTimeout(() => {
    box.style.display = "none";
    box.style.color = "white";
  }, 3000);
}

// Load fathers into dropdown
async function loadFathers() {

  const snapshot = await getDocs(collection(db, "family_members"));
  const select = document.getElementById("fatherSelect");

  // Clear existing options first
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

async function loadMembers() {

  const searchValue = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const generationValue = document.getElementById("generationFilter")?.value;

  const snapshot = await getDocs(collection(db, "family_members"));
  const container = document.getElementById("memberList");

  container.innerHTML = "";

  const generations = new Set();

  snapshot.forEach(docSnap => {

    const data = docSnap.data();
    generations.add(data.generation);

    // 🔎 Search filter
    if (searchValue && !data.name.toLowerCase().includes(searchValue)) {
      return;
    }

    // 🎯 Generation filter
    if (generationValue && data.generation != generationValue) {
      return;
    }

    const div = document.createElement("div");
    div.style.marginBottom = "10px";

    div.innerHTML = `
      ${data.name} (Gen ${data.generation})

      <button onclick="editMember('${docSnap.id}')" 
      style="margin-left:10px;background:orange;color:white;border:none;padding:5px 10px;border-radius:5px;">
      Edit
      </button>

      <button onclick="deleteMember('${docSnap.id}')" 
      style="margin-left:5px;background:red;color:white;border:none;padding:5px 10px;border-radius:5px;">
      Delete
      </button>
    `;

    container.appendChild(div);
  });

  populateGenerationFilter(generations);
}

loadMembers();
// Add Member

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

    // Upload image if exists
    if (file) {

      showMessage("Uploading image...", "warning");

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


window.updateMember = async function () {

  try {

    if (!editingId) {
      showMessage("Please click Edit first.", "warning");
      return;
    }

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

    let generation = 1;

    if (fatherId) {
      const fatherSnap = await getDoc(doc(db, "family_members", fatherId));
      generation = fatherSnap.data().generation + 1;
    }

    showMessage("Updating member...", "warning");

    await updateDoc(doc(db, "family_members", editingId), {
      name,
      fatherId: fatherId || null,
      generation,
      surname,
      title: title || "",
      dob: dob || ""
    });

    // Replace image if new file selected
    if (file) {

      if (file.size > 2 * 1024 * 1024) {
        showMessage("Image must be under 2MB.", "error");
        return;
      }

      showMessage("Uploading new image...", "warning");


     const imageRef = ref(storage, "profilePhotos/" + editingId + "/profile.jpg");

// Delete old image first
try {
  await deleteObject(imageRef);
} catch (e) {
  // ignore if not exists
}
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
    loadFathers();

  } catch (error) {
    console.error(error);
    showMessage(error.message, "error");
  }
};
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

};

// Delete Member
window.deleteMember = async function (id) {

  if (!confirm("Are you sure you want to delete this member?")) return;

  // Get member details
  const memberSnap = await getDoc(doc(db, "family_members", id));

  if (!memberSnap.exists()) {
showMessage("Member not found.", "error");
    return;
  }

  const memberData = memberSnap.data();

  // 🚫 Prevent deleting root
  if (memberData.isRoot === true) {
showMessage("You cannot delete the root ancestor.", "warning");
    return;
  }

  // 🔍 Check if member has children (Optimized)
const q = query(
  collection(db, "family_members"),
  where("fatherId", "==", id)
);

const childrenSnapshot = await getDocs(q);

if (!childrenSnapshot.empty) {
  showMessage("Cannot delete this member because they have children.", "warning");
  return;
}
  // Delete profile image from storage
try {
  const imageRef = ref(storage, "profilePhotos/" + id + "/profile.jpg");
  await deleteObject(imageRef);
} catch (e) {
  // ignore if no image
}

  // ✅ Safe to delete
  await deleteDoc(doc(db, "family_members", id));

showMessage("Member Deleted Successfully.", "success");
loadMembers();
loadFathers();
};
async function isDescendant(childId, potentialFatherId) {

  const snapshot = await getDocs(collection(db, "family_members"));

  const members = {};
  snapshot.forEach(docSnap => {
    members[docSnap.id] = docSnap.data();
  });

  async function check(currentId) {
    for (const id in members) {
      if (members[id].fatherId === currentId) {
        if (id === potentialFatherId) {
          return true;
        }
        const result = await check(id);
        if (result) return true;
      }
    }
    return false;
  }

  return await check(childId);
}
async function updateChildrenGenerations(parentId, parentGeneration) {

  const snapshot = await getDocs(collection(db, "family_members"));

  for (const docSnap of snapshot.docs) {

    const data = docSnap.data();

    if (data.fatherId === parentId) {

      const newGeneration = parentGeneration + 1;

      await updateDoc(doc(db, "family_members", docSnap.id), {
        generation: newGeneration
      });

      // Recursively update grandchildren
      await updateChildrenGenerations(docSnap.id, newGeneration);
    }
  }
}
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
document.addEventListener("input", function(e) {
  if (e.target.id === "searchInput") {
    loadMembers();
  }
});

document.addEventListener("change", function(e) {
  if (e.target.id === "generationFilter") {
    loadMembers();
  }
});

window.resetFilters = function() {
  document.getElementById("searchInput").value = "";
  document.getElementById("generationFilter").value = "";
  loadMembers();
};

