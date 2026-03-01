import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

import { db, storage } from "./firebase.js";

let allMembers = [];
let editingId = null;
let currentPage = 1;
const perPage = 30;

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  loadMembers();

  const searchInput = document.getElementById("searchInput");
  const dropdown = document.getElementById("searchDropdown");

  /* Show dropdown on click */
  searchInput.addEventListener("click", () => {
    dropdown.style.display = "block";
  });

  /* Filter while typing */
  searchInput.addEventListener("input", handleSearch);

  /* Hide dropdown outside click */
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#searchInput") &&
        !e.target.closest("#searchDropdown")) {
      dropdown.style.display = "none";
    }
  });

  /* Image preview */
  document.getElementById("profileImage")
    ?.addEventListener("change", previewImage);

  /* Initials live update */
  document.getElementById("name")
    ?.addEventListener("input", updateInitials);

  /* Generation filter */
  document.getElementById("generationFilter")
    ?.addEventListener("change", () => {
      currentPage = 1;
      renderMembers();
    });
});

/* ================= LOAD MEMBERS ================= */

async function loadMembers() {
  const snapshot = await getDocs(collection(db, "family_members"));

  allMembers = [];
  snapshot.forEach(docSnap => {
    allMembers.push({ id: docSnap.id, ...docSnap.data() });
  });

  allMembers.sort((a, b) => a.generation - b.generation);

  populateGenerationFilter();
  populateFatherDropdown();
  populateSearchDropdown();
  renderMembers();
}

/* ================= PROFILE PREVIEW ================= */

function previewImage(e) {
  const file = e.target.files[0];
  const box = document.getElementById("profilePreviewBox");
  if (!file || !box) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    box.style.backgroundImage = `url(${event.target.result})`;
    box.style.backgroundSize = "cover";
    box.innerText = "";
  };
  reader.readAsDataURL(file);
}

function updateInitials() {
  const name = document.getElementById("name")?.value.trim();
  const box = document.getElementById("profilePreviewBox");

  if (!box) return;

  if (!document.getElementById("profileImage")?.files.length) {
    box.style.backgroundImage = "none";
    box.innerText = name ? name.substring(0, 2).toUpperCase() : "?";
  }
}

/* ================= RENDER MEMBERS ================= */

function renderMembers() {

  const container = document.getElementById("memberList");
  const pagination = document.getElementById("pagination");

  if (!container || !pagination) return;

  container.innerHTML = "";
  pagination.innerHTML = "";

  const searchValue =
    document.getElementById("searchInput")?.value.toLowerCase() || "";

  const generationValue =
    document.getElementById("generationFilter")?.value || "";

  let filtered = allMembers.filter(m => {
    if (searchValue && !m.name.toLowerCase().includes(searchValue))
      return false;
    if (generationValue && m.generation != generationValue)
      return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const start = (currentPage - 1) * perPage;
  const paginated = filtered.slice(start, start + perPage);

  paginated.forEach(member => {

    const fatherName = member.fatherId
      ? allMembers.find(f => f.id === member.fatherId)?.name || "-"
      : "-";

    const initials = member.name
      ? member.name.substring(0, 2).toUpperCase()
      : "?";

    let imageHtml = member.profileImage
      ? `<div class="profile-img"
           style="background-image:url('${member.profileImage}');
                  background-size:cover;"></div>`
      : `<div class="profile-img"
           style="display:flex;align-items:center;
                  justify-content:center;
                  background:#ddd;font-weight:bold;">
           ${initials}
         </div>`;

    container.innerHTML += `
      <div class="member-card">
        ${imageHtml}
        <strong>${member.name}</strong><br>
        Father: ${fatherName}<br>
        Generation: ${member.generation}<br>
        DOB: ${member.dob || "-"}
        <div class="actions">
          <button onclick="editMember('${member.id}')" class="btn primary">Edit</button>
          <button onclick="deleteMember('${member.id}')" class="btn danger">Delete</button>
        </div>
      </div>
    `;
  });

  /* Pagination */
  for (let i = 1; i <= totalPages; i++) {
    pagination.innerHTML += `
      <div class="page-btn ${i === currentPage ? "active-page" : ""}"
           onclick="goToPage(${i})">${i}</div>`;
  }
}

window.goToPage = function (page) {
  currentPage = page;
  renderMembers();
};

/* ================= SEARCH ================= */

function populateSearchDropdown() {
  const dropdown = document.getElementById("searchDropdown");
  if (!dropdown) return;

  dropdown.innerHTML = "";

  allMembers.forEach(m => {
    dropdown.innerHTML += `
      <div style="padding:8px;cursor:pointer;"
           onclick="selectSearch('${m.name.replace(/'/g,"")}')">
        ${m.name}
      </div>`;
  });
}

window.selectSearch = function (name) {
  document.getElementById("searchInput").value = name;
  document.getElementById("searchDropdown").style.display = "none";
  currentPage = 1;
  renderMembers();
};

function handleSearch() {
  document.getElementById("searchDropdown").style.display = "block";
  currentPage = 1;
  renderMembers();
}

/* ================= DROPDOWNS ================= */

function populateGenerationFilter() {
  const select = document.getElementById("generationFilter");
  if (!select) return;

  const gens = [...new Set(allMembers.map(m => m.generation))]
    .sort((a,b)=>a-b);

  select.innerHTML = '<option value="">All Generations</option>';
  gens.forEach(g => {
    select.innerHTML += `<option value="${g}">Generation ${g}</option>`;
  });
}

function populateFatherDropdown() {
  const select = document.getElementById("fatherSelect");
  if (!select) return;

  select.innerHTML = '<option value="">-- Select Father --</option>';
  allMembers.forEach(m => {
    select.innerHTML += `<option value="${m.id}">${m.name}</option>`;
  });
}

/* ================= MODAL ================= */

window.openAddModal = function () {
  editingId = null;

  document.getElementById("memberModal").style.display = "flex";
  document.getElementById("modalTitle").innerText = "Add Member";

  document.getElementById("name").value = "";
  document.getElementById("fatherSelect").value = "";
  document.getElementById("profileImage").value = "";

  const box = document.getElementById("profilePreviewBox");
  box.style.backgroundImage = "none";
  box.innerText = "?";
};

window.closeModal = function () {
  document.getElementById("memberModal").style.display = "none";
};

/* ================= SAVE MEMBER ================= */

window.saveMember = async function () {

  const name = document.getElementById("name").value.trim();
  const fatherId = document.getElementById("fatherSelect").value;
  const file = document.getElementById("profileImage").files[0];

  if (!name) return alert("Name required");

  let generation = 1;
  if (fatherId) {
    const father = allMembers.find(m => m.id === fatherId);
    generation = father.generation + 1;
  }

  let imageURL = null;

  if (file) {
    const imageRef = ref(storage, "profiles/" + Date.now());
    await uploadBytes(imageRef, file);
    imageURL = await getDownloadURL(imageRef);
  }

  if (!editingId) {
    await addDoc(collection(db, "family_members"), {
      name,
      fatherId: fatherId || null,
      generation,
      profileImage: imageURL || "",
      createdAt: serverTimestamp()
    });
  } else {
    const updateData = {
      name,
      fatherId: fatherId || null,
      generation
    };

    if (imageURL !== null) {
      updateData.profileImage = imageURL;
    }

    await updateDoc(doc(db, "family_members", editingId), updateData);
  }

  closeModal();
  loadMembers();
};

/* ================= EDIT ================= */

window.editMember = function (id) {
  const member = allMembers.find(m => m.id === id);
  if (!member) return;

  editingId = id;

  document.getElementById("memberModal").style.display = "flex";
  document.getElementById("modalTitle").innerText = "Edit Member";

  document.getElementById("name").value = member.name || "";
  document.getElementById("fatherSelect").value = member.fatherId || "";

  const box = document.getElementById("profilePreviewBox");

  if (member.profileImage) {
    box.style.backgroundImage = `url(${member.profileImage})`;
    box.style.backgroundSize = "cover";
    box.innerText = "";
  } else {
    box.style.backgroundImage = "none";
    box.innerText = member.name
      ? member.name.substring(0, 2).toUpperCase()
      : "?";
  }
};

/* ================= DELETE ================= */

window.deleteMember = async function (id) {
  if (!confirm("Delete this member?")) return;
  await deleteDoc(doc(db, "family_members", id));
  loadMembers();
};

/* ================= RESET ================= */

window.resetFilters = function () {
  document.getElementById("searchInput").value = "";
  document.getElementById("generationFilter").value = "";
  currentPage = 1;
  renderMembers();
};
