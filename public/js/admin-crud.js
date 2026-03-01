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
let deleteTargetId = null;

/* ================= LOADER ================= */

function showLoader() {
  document.getElementById("loader").style.display = "flex";
}
function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

/* ================= TOAST ================= */

function showMessage(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  let icon = "✔";
  if (type === "error") icon = "❌";
  if (type === "warning") icon = "⚠";

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ================= IMAGE PREVIEW ================= */

function previewImage(e) {
  const file = e.target.files[0];
  const box = document.getElementById("profilePreviewBox");
  if (!file || !box) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    box.style.backgroundImage = `url(${event.target.result})`;
    box.style.backgroundSize = "cover";
    box.style.backgroundPosition = "center";
    box.innerText = "";
  };
  reader.readAsDataURL(file);
}

function updateInitials() {
  const name = document.getElementById("name").value.trim();
  const box = document.getElementById("profilePreviewBox");

  if (!document.getElementById("profileImage").files.length) {
    box.style.backgroundImage = "none";
    box.innerText = name ? name.substring(0, 2).toUpperCase() : "?";
  }
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  loadMembers();

  const searchInput = document.getElementById("searchInput");
  const searchDropdown = document.getElementById("searchDropdown");

  searchInput.addEventListener("input", () => {
    populateSearchDropdown();
    searchDropdown.style.display = "block";
    currentPage = 1;
    renderMembers();
  });

  searchInput.addEventListener("focus", () => {
    populateSearchDropdown();
    searchDropdown.style.display = "block";
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#searchInput") &&
        !e.target.closest("#searchDropdown")) {
      searchDropdown.style.display = "none";
    }
  });

  document.getElementById("profileImage")
    ?.addEventListener("change", previewImage);

  document.getElementById("name")
    ?.addEventListener("input", updateInitials);

  document.getElementById("confirmDeleteBtn")
    ?.addEventListener("click", confirmDelete);

  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  });
});

/* ================= LOAD MEMBERS ================= */

async function loadMembers() {

  showLoader();

  const snapshot = await getDocs(collection(db, "family_members"));

  allMembers = [];
  snapshot.forEach(docSnap => {
    allMembers.push({ id: docSnap.id, ...docSnap.data() });
  });

  allMembers.sort((a, b) => a.generation - b.generation);

  populateGenerationFilter();
  populateFatherDropdown();
  renderMembers();

  hideLoader();
}

/* ================= SEARCH DROPDOWN ================= */

function populateSearchDropdown() {

  const dropdown = document.getElementById("searchDropdown");
  const value =
    document.getElementById("searchInput").value.toLowerCase();

  dropdown.innerHTML = "";

  const filtered = allMembers.filter(m =>
    m.name.toLowerCase().includes(value)
  );

  filtered.forEach(m => {
    const div = document.createElement("div");
    div.style.padding = "8px";
    div.style.cursor = "pointer";
    div.innerText = m.name;

    div.onclick = function() {
      document.getElementById("searchInput").value = m.name;
      dropdown.style.display = "none";
      currentPage = 1;
      renderMembers();
    };

    dropdown.appendChild(div);
  });
}

/* ================= DROPDOWNS ================= */

function populateGenerationFilter() {
  const select = document.getElementById("generationFilter");
  select.innerHTML = `<option value="">All Generations</option>`;

  const generations = [...new Set(allMembers.map(m => m.generation))]
    .sort((a, b) => a - b);

  generations.forEach(gen => {
    select.innerHTML += `<option value="${gen}">Generation ${gen}</option>`;
  });
}

function populateFatherDropdown() {
  const select = document.getElementById("fatherSelect");
  select.innerHTML = `<option value="">Select Father</option>`;

  allMembers.forEach(member => {
    select.innerHTML += `
      <option value="${member.id}">
        ${member.name} (Gen ${member.generation})
      </option>`;
  });
}

/* ================= TREE VALIDATION ================= */

function createsCycle(memberId, newFatherId) {
  let current = newFatherId;
  while (current) {
    if (current === memberId) return true;
    const parent = allMembers.find(m => m.id === current);
    current = parent ? parent.fatherId : null;
  }
  return false;
}

async function updateChildrenGenerations(parentId) {

  const children = allMembers.filter(m => m.fatherId === parentId);

  for (let child of children) {

    const parent = allMembers.find(m => m.id === parentId);
    const newGeneration = parent.generation + 1;

    await updateDoc(doc(db, "family_members", child.id), {
      generation: newGeneration
    });

    child.generation = newGeneration;

    await updateChildrenGenerations(child.id);
  }
}

/* ================= RENDER ================= */

function renderMembers() {

  const container = document.getElementById("memberList");
  const pagination = document.getElementById("pagination");

  container.innerHTML = "";
  pagination.innerHTML = "";

  const searchValue =
    document.getElementById("searchInput").value.toLowerCase();

  let filtered = allMembers.filter(m =>
    m.name.toLowerCase().includes(searchValue)
  );

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

    const imageHtml = member.profileImage
      ? `<div class="profile-img"
           style="background-image:url('${member.profileImage}');
                  background-size:cover;
                  background-position:center;"></div>`
      : `<div class="profile-img"
           style="display:flex;align-items:center;
                  justify-content:center;background:#ddd;font-weight:bold;">
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
      </div>`;
  });

  for (let i = 1; i <= totalPages; i++) {
    pagination.innerHTML += `
      <div class="page-btn ${i === currentPage ? "active-page" : ""}"
           onclick="goToPage(${i})">${i}</div>`;
  }
}

/* ================= GLOBAL FUNCTIONS ================= */

window.goToPage = function(page){
  currentPage = page;
  renderMembers();
};

window.openAddModal = function(){
  editingId = null;
  document.getElementById("memberModal").style.display = "flex";
};

window.closeModal = function(){
  document.getElementById("memberModal").style.display = "none";
};

window.editMember = function(id){

  const member = allMembers.find(m => m.id === id);
  if (!member) return;

  editingId = id;

  document.getElementById("memberModal").style.display = "flex";
  document.getElementById("modalTitle").innerText = "Edit Member";

  document.getElementById("name").value = member.name || "";
  document.getElementById("fatherSelect").value = member.fatherId || "";
};

window.deleteMember = function(id){

  const hasChildren = allMembers.some(m => m.fatherId === id);

  if(hasChildren){
    showMessage("Cannot delete member with children.", "error");
    return;
  }

  deleteTargetId = id;
  document.getElementById("deleteModal").style.display = "flex";
};

window.closeDeleteModal = function(){
  document.getElementById("deleteModal").style.display = "none";
};
