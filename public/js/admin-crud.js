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

/* ================= LOADER ================= */

function showLoader() {
  document.getElementById("loader").style.display = "flex";
}

function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  loadMembers();

  const searchInput = document.getElementById("searchInput");
  const dropdown = document.getElementById("searchDropdown");

  searchInput.addEventListener("click", () => {
    populateSearchDropdown();
    dropdown.style.display = "block";
  });

  searchInput.addEventListener("input", handleSearch);

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#searchInput") &&
        !e.target.closest("#searchDropdown")) {
      dropdown.style.display = "none";
    }
  });

  document.getElementById("profileImage")
    ?.addEventListener("change", previewImage);

  document.getElementById("name")
    ?.addEventListener("input", updateInitials);

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
  renderMembers();
}

/* ================= SEARCH ================= */

function populateSearchDropdown() {

  const dropdown = document.getElementById("searchDropdown");
  dropdown.innerHTML = "";

  allMembers.forEach(m => {
    dropdown.innerHTML += `
      <div style="padding:8px;cursor:pointer;"
           onclick="selectSearch('${m.name.replace(/'/g,"")}')">
        ${m.name}
      </div>`;
  });
}

window.selectSearch = function(name) {
  document.getElementById("searchInput").value = name;
  document.getElementById("searchDropdown").style.display = "none";
  currentPage = 1;
  renderMembers();
};

function handleSearch() {
  currentPage = 1;
  renderMembers();
}

/* ================= PROFILE PREVIEW ================= */

function previewImage(e) {
  const file = e.target.files[0];
  const box = document.getElementById("profilePreviewBox");

  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    box.style.backgroundImage = `url(${event.target.result})`;
    box.style.backgroundSize = "cover";
    box.innerText = "";
  };
  reader.readAsDataURL(file);
}

function updateInitials() {
  const name = document.getElementById("name").value.trim();
  const box = document.getElementById("profilePreviewBox");

  if (!document.getElementById("profileImage").files.length) {
    box.style.backgroundImage = "none";
    box.innerText = name ? name.substring(0,2).toUpperCase() : "?";
  }
}

/* ================= TREE VALIDATION ================= */

function isDescendant(childId, potentialFatherId) {

  let current = allMembers.find(m => m.id === potentialFatherId);

  while (current) {
    if (current.fatherId === childId) return true;
    current = allMembers.find(m => m.id === current.fatherId);
  }

  return false;
}

async function updateChildrenGenerations(parentId, parentGeneration) {

  const children = allMembers.filter(m => m.fatherId === parentId);

  for (let child of children) {

    const newGen = parentGeneration + 1;

    await updateDoc(doc(db, "family_members", child.id), {
      generation: newGen
    });

    child.generation = newGen;

    await updateChildrenGenerations(child.id, newGen);
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

  const generationValue =
    document.getElementById("generationFilter").value;

  let filtered = allMembers.filter(m => {
    if (searchValue && !m.name.toLowerCase().includes(searchValue)) return false;
    if (generationValue && m.generation != generationValue) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const start = (currentPage - 1) * perPage;
  const paginated = filtered.slice(start, start + perPage);

  paginated.forEach(member => {

    const fatherName = member.fatherId
      ? allMembers.find(f => f.id === member.fatherId)?.name || "-"
      : "-";

    const initials = member.name.substring(0,2).toUpperCase();

    const imageHtml = member.profileImage
      ? `<div class="profile-img"
           style="background-image:url('${member.profileImage}');
                  background-size:cover;"></div>`
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

  for (let i=1;i<=totalPages;i++){
    pagination.innerHTML += `
      <div class="page-btn ${i===currentPage?"active-page":""}"
           onclick="goToPage(${i})">${i}</div>`;
  }
}

window.goToPage = function(page){
  currentPage = page;
  renderMembers();
};

/* ================= DROPDOWNS ================= */

function populateFatherDropdown(){

  const select = document.getElementById("fatherSelect");
  select.innerHTML = '<option value="">-- Select Father --</option>';

  allMembers.forEach(m=>{
    select.innerHTML += `<option value="${m.id}">${m.name}</option>`;
  });
}

function populateGenerationFilter(){

  const select = document.getElementById("generationFilter");

  const gens=[...new Set(allMembers.map(m=>m.generation))]
    .sort((a,b)=>a-b);

  select.innerHTML='<option value="">All Generations</option>';

  gens.forEach(g=>{
    select.innerHTML+=`<option value="${g}">Generation ${g}</option>`;
  });
}

/* ================= MODAL ================= */

window.openAddModal = function(){
  editingId = null;
  document.getElementById("memberModal").style.display="flex";
  document.getElementById("modalTitle").innerText="Add Member";
};

window.closeModal = function(){
  document.getElementById("memberModal").style.display="none";
};
