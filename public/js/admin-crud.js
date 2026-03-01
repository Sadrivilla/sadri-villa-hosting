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

/* ================= INITIALS ================= */

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

  document.getElementById("searchInput")
    .addEventListener("input", () => {
      currentPage = 1;
      renderMembers();
    });

  document.getElementById("profileImage")
    ?.addEventListener("change", previewImage);

  document.getElementById("name")
    ?.addEventListener("input", updateInitials);

  document.getElementById("confirmDeleteBtn")
    ?.addEventListener("click", confirmDelete);

  /* OUTSIDE CLICK CLOSE */
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

/* ================= CIRCULAR CHECK ================= */

function createsCycle(memberId, newFatherId) {

  let current = newFatherId;

  while (current) {

    if (current === memberId) {
      return true;
    }

    const parent = allMembers.find(m => m.id === current);
    current = parent ? parent.fatherId : null;
  }

  return false;
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

window.goToPage = function(page){
  currentPage = page;
  renderMembers();
};

/* ================= SAVE ================= */

window.saveMember = async function(){

  try {

    showLoader();

    const name = document.getElementById("name").value.trim();
    const fatherId = document.getElementById("fatherSelect").value;

    if (!name) {
      showMessage("Name is required.", "warning");
      hideLoader();
      return;
    }

    if (editingId && fatherId === editingId) {
      showMessage("Member cannot be father of himself.", "error");
      hideLoader();
      return;
    }

    if (fatherId && !allMembers.some(m => m.id === fatherId)) {
      showMessage("Selected father does not exist.", "error");
      hideLoader();
      return;
    }

    if (editingId && fatherId && createsCycle(editingId, fatherId)) {
      showMessage("Invalid hierarchy: circular relationship detected.", "error");
      hideLoader();
      return;
    }

    let generation = 1;
    if (fatherId) {
      const father = allMembers.find(m => m.id === fatherId);
      generation = father ? father.generation + 1 : 1;
    }

    if (!editingId) {

      await addDoc(collection(db, "family_members"), {
        name,
        fatherId: fatherId || null,
        generation,
        createdAt: serverTimestamp()
      });

      showMessage("Member added successfully.");

    } else {

      await updateDoc(doc(db, "family_members", editingId), {
        name,
        fatherId: fatherId || null,
        generation
      });

      showMessage("Member updated successfully.");
    }

    await loadMembers();
    document.getElementById("memberModal").style.display = "none";

  } catch {
    showMessage("Error saving member.", "error");
  }

  hideLoader();
};

/* ================= DELETE ================= */

window.deleteMember = function(id){

  const hasChildren = allMembers.some(m => m.fatherId === id);

  if(hasChildren){
    showMessage("Cannot delete member with children.", "error");
    return;
  }

  deleteTargetId = id;
  document.getElementById("deleteModal").style.display = "flex";
};

async function confirmDelete(){

  if(!deleteTargetId) return;

  try{
    showLoader();

    await deleteDoc(doc(db, "family_members", deleteTargetId));
    await loadMembers();

    showMessage("Member deleted successfully.");

  }catch{
    showMessage("Delete failed.", "error");
  }

  hideLoader();
  document.getElementById("deleteModal").style.display = "none";
  deleteTargetId = null;
};
