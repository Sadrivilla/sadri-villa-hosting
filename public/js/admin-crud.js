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

/* ================= AGE ================= */

function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
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

/* ================= IMAGE PREVIEW ================= */

function setPreview(url) {
  const box = document.getElementById("profilePreviewBox");
  if (!box) return;

  if (url) {
    box.style.backgroundImage = `url(${url})`;
    box.style.backgroundSize = "cover";
    box.style.backgroundPosition = "center";
    box.innerHTML = "";
  } else {
    box.style.backgroundImage = "none";
    box.innerHTML = `<span style="font-size:40px;">👤</span>`;
  }
}

function previewImage(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    setPreview(event.target.result);
  };
  reader.readAsDataURL(file);
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {

  loadMembers();

  document.getElementById("profileImage")
    ?.addEventListener("change", previewImage);

  document.getElementById("generationFilter")
    ?.addEventListener("change", () => {
      currentPage = 1;
      renderMembers();
    });

  /* SEARCH */
  const searchInput = document.getElementById("searchInput");
  const searchDropdown = document.getElementById("searchDropdown");

  searchInput.addEventListener("focus", () => {
    populateSearchDropdown("");
    searchDropdown.style.display = "block";
  });

  searchInput.addEventListener("input", () => {
    populateSearchDropdown(searchInput.value);
    currentPage = 1;
    renderMembers();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#searchInput") &&
        !e.target.closest("#searchDropdown")) {
      searchDropdown.style.display = "none";
    }
  });

  document.getElementById("confirmDeleteBtn")
    ?.addEventListener("click", confirmDelete);

  /* OUTSIDE CLICK CLOSE */
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.style.display = "none";
    });
  });
});

/* ================= LOAD ================= */

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

function populateSearchDropdown(value = "") {

  const dropdown = document.getElementById("searchDropdown");
  dropdown.innerHTML = "";

  const filtered = allMembers.filter(m =>
    m.name.toLowerCase().includes(value.toLowerCase())
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

/* ================= RENDER ================= */

function renderMembers() {

  const container = document.getElementById("memberList");
  const pagination = document.getElementById("pagination");

  container.innerHTML = "";
  pagination.innerHTML = "";

  const searchValue =
    document.getElementById("searchInput").value.toLowerCase();

  const generationValue =
    document.getElementById("generationFilter").value;

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

    const age = calculateAge(member.dob);

    const imageHtml = member.profileImage
      ? `<div class="profile-img"
           style="background-image:url('${member.profileImage}');
           background-size:cover;background-position:center;"></div>`
      : `<div class="profile-img"
           style="display:flex;align-items:center;
           justify-content:center;font-size:40px;">👤</div>`;

    container.innerHTML += `
      <div class="member-card">
        ${imageHtml}
        <strong>${member.name}</strong><br>
        Father: ${fatherName}<br>
        Generation: ${member.generation}<br>
        DOB: ${member.dob || "-"}<br>
        Age: ${age !== null ? age + " years" : "-"}
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

/* ================= GLOBAL ================= */

window.goToPage = function(page){
  currentPage = page;
  renderMembers();
};

window.openAddModal = function(){

  editingId = null;

  document.getElementById("modalTitle").innerText = "Add Member";
  document.getElementById("memberModal").style.display = "flex";

  document.getElementById("name").value = "";
  document.getElementById("fatherSelect").value = "";
  document.getElementById("dob").value = "";
  document.getElementById("profileImage").value = "";

  setPreview(null);
};

window.editMember = function(id){

  const member = allMembers.find(m => m.id === id);
  if (!member) return;

  editingId = id;

  document.getElementById("modalTitle").innerText = "Edit Member";
  document.getElementById("memberModal").style.display = "flex";

  document.getElementById("name").value = member.name || "";
  document.getElementById("fatherSelect").value = member.fatherId || "";
  document.getElementById("dob").value = member.dob || "";

  setPreview(member.profileImage || null);
};

window.closeModal = function(){
  document.getElementById("memberModal").style.display = "none";
};

/* ================= SAVE ================= */

window.saveMember = async function(){

  try {

    showLoader();

    const name = document.getElementById("name").value.trim();
    const fatherId = document.getElementById("fatherSelect").value;
    const dob = document.getElementById("dob").value;
    const file = document.getElementById("profileImage").files[0];

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

    if (editingId && fatherId && createsCycle(editingId, fatherId)) {
      showMessage("Circular relationship detected.", "error");
      hideLoader();
      return;
    }

    let generation = 1;
    if (fatherId) {
      const father = allMembers.find(m => m.id === fatherId);
      if (!father) {
        showMessage("Selected father does not exist.", "error");
        hideLoader();
        return;
      }
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
        dob: dob || "",
        profileImage: imageURL || "",
        createdAt: serverTimestamp()
      });

      showMessage("Member added successfully.");

    } else {

      const updateData = {
        name,
        fatherId: fatherId || null,
        generation,
        dob: dob || ""
      };

      if (imageURL) updateData.profileImage = imageURL;

      await updateDoc(doc(db, "family_members", editingId), updateData);

      showMessage("Member updated successfully.");
    }

    await loadMembers();
    closeModal();

  } catch {
    showMessage("Error saving member.", "error");
  }

  hideLoader();
};
/* ================= DELETE ================= */

window.deleteMember = function(id){

  const hasChildren = allMembers.some(m => m.fatherId === id);

  if (hasChildren) {
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
}

/* ================= RESET FILTER ================= */

window.resetFilters = function(){
  document.getElementById("searchInput").value = "";
  document.getElementById("generationFilter").value = "";
  currentPage = 1;
  renderMembers();
};
