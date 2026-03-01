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

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {

  loadMembers();

  document.getElementById("searchInput")
    .addEventListener("click", () => {
      populateSearchDropdown();
      document.getElementById("searchDropdown").style.display = "block";
    });

  document.getElementById("searchInput")
    .addEventListener("input", () => {
      populateSearchDropdown();
      currentPage = 1;
      renderMembers();
    });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#searchInput") &&
        !e.target.closest("#searchDropdown")) {
      document.getElementById("searchDropdown").style.display = "none";
    }
  });

  document.getElementById("generationFilter")
    .addEventListener("change", () => {
      currentPage = 1;
      renderMembers();
    });

  document.getElementById("profileImage")
    .addEventListener("change", previewImage);

  document.getElementById("name")
    .addEventListener("input", updateInitials);

  /* Close modals on outside click */
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", function(e){
      if(e.target === modal){
        modal.style.display = "none";
      }
    });
  });

  /* Confirm delete */
  document.getElementById("confirmDeleteBtn")
    ?.addEventListener("click", confirmDelete);
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
  renderMembers();
}

/* ================= SEARCH ================= */

function populateSearchDropdown() {

  const dropdown = document.getElementById("searchDropdown");
  const searchValue =
    document.getElementById("searchInput").value.toLowerCase();

  dropdown.innerHTML = "";

  const filtered = allMembers.filter(m =>
    m.name.toLowerCase().includes(searchValue)
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

/* ================= PROFILE PREVIEW ================= */

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

/* ================= RENDER MEMBERS ================= */

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

/* ================= MODAL ================= */

window.openAddModal = function(){
  editingId = null;
  document.getElementById("memberModal").style.display = "flex";
  document.getElementById("modalTitle").innerText = "Add Member";

  document.getElementById("name").value = "";
  document.getElementById("fatherSelect").value = "";
  document.getElementById("surname").value = "";
  document.getElementById("title").value = "";
  document.getElementById("dob").value = "";
  document.getElementById("profileImage").value = "";

  const box = document.getElementById("profilePreviewBox");
  box.style.backgroundImage = "none";
  box.innerText = "?";
};

window.closeModal = function(){
  document.getElementById("memberModal").style.display = "none";
};

/* ================= EDIT ================= */

window.editMember = function(id){

  const member = allMembers.find(m => m.id === id);
  if (!member) return;

  editingId = id;

  document.getElementById("memberModal").style.display = "flex";
  document.getElementById("modalTitle").innerText = "Edit Member";

  document.getElementById("name").value = member.name || "";
  document.getElementById("fatherSelect").value = member.fatherId || "";
  document.getElementById("surname").value = member.surname || "";
  document.getElementById("title").value = member.title || "";
  document.getElementById("dob").value = member.dob || "";

  const box = document.getElementById("profilePreviewBox");

  if (member.profileImage) {
    box.style.backgroundImage = `url(${member.profileImage})`;
    box.style.backgroundSize = "cover";
    box.style.backgroundPosition = "center";
    box.innerText = "";
  } else {
    box.style.backgroundImage = "none";
    box.innerText = member.name
      ? member.name.substring(0, 2).toUpperCase()
      : "?";
  }
};

/* ================= SAVE ================= */

window.saveMember = async function(){

  try {

    showLoader();

    const name = document.getElementById("name").value.trim();
    const fatherId = document.getElementById("fatherSelect").value;
    const surname = document.getElementById("surname").value;
    const title = document.getElementById("title").value;
    const dob = document.getElementById("dob").value;
    const file = document.getElementById("profileImage").files[0];

    if (!name) {
      showMessage("Name is required.", "warning");
      hideLoader();
      return;
    }

    let generation = 1;
    if (fatherId) {
      const father = allMembers.find(m => m.id === fatherId);
      generation = father ? father.generation + 1 : 1;
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
        surname: surname || "",
        title: title || "",
        dob: dob || "",
        profileImage: imageURL || "",
        createdAt: serverTimestamp()
      });

      showMessage("Member added successfully.", "success");

    } else {

      const existing = allMembers.find(m => m.id === editingId);

      const updateData = {
        name,
        fatherId: fatherId || null,
        generation,
        surname: surname || "",
        title: title || "",
        dob: dob || ""
      };

      updateData.profileImage =
        imageURL !== null
          ? imageURL
          : existing.profileImage || "";

      await updateDoc(doc(db, "family_members", editingId), updateData);

      showMessage("Member updated successfully.", "success");
    }

    await loadMembers();
    closeModal();

  } catch (error) {
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

window.closeDeleteModal = function(){
  document.getElementById("deleteModal").style.display = "none";
};

async function confirmDelete(){

  if(!deleteTargetId) return;

  try{
    showLoader();
    await deleteDoc(doc(db, "family_members", deleteTargetId));
    await loadMembers();
    showMessage("Member deleted successfully.", "success");
  }catch{
    showMessage("Delete failed.", "error");
  }

  hideLoader();
  closeDeleteModal();
  deleteTargetId = null;
}
