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
const perPage = 12;

/* ================= TOAST ================= */

function showMessage(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  let icon = "✔";
  if (type === "error") icon = "❌";
  if (type === "warning") icon = "⚠";

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

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

  document.getElementById("searchInput")
    .addEventListener("input", handleSearch);

  document.getElementById("generationFilter")
    .addEventListener("change", () => {
      currentPage = 1;
      renderMembers();
    });

  document.getElementById("profileImage")
    .addEventListener("change", previewImage);

  document.getElementById("name")
    .addEventListener("input", updateInitials);
});

/* ================= LOAD ================= */

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

function handleSearch() {
  const value = document.getElementById("searchInput").value.toLowerCase();
  const dropdown = document.getElementById("searchDropdown");

  dropdown.innerHTML = "";

  if (!value) {
    dropdown.style.display = "none";
    renderMembers();
    return;
  }

  const matches = allMembers.filter(m =>
    m.name.toLowerCase().includes(value)
  );

  matches.forEach(m => {
    dropdown.innerHTML += `
      <div onclick="selectSearch('${m.name}')">
        ${m.name}
      </div>`;
  });

  dropdown.style.display = "block";
  currentPage = 1;
  renderMembers();
}

window.selectSearch = function(name) {
  document.getElementById("searchInput").value = name;
  document.getElementById("searchDropdown").style.display = "none";
  renderMembers();
};

/* ================= PROFILE PREVIEW ================= */

function previewImage(e) {
  const file = e.target.files[0];
  const box = document.getElementById("profilePreviewBox");
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
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
    box.innerText = name ? name.substring(0,2).toUpperCase() : "?";
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
           background-size:cover;background-position:center;"></div>`
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

window.openAddModal=function(){
  editingId=null;
  document.getElementById("memberModal").style.display="flex";
};

window.closeModal=function(){
  document.getElementById("memberModal").style.display="none";
};

/* ================= EDIT ================= */

window.editMember=function(id){
  const member=allMembers.find(m=>m.id===id);
  if(!member) return;

  editingId=id;
  document.getElementById("memberModal").style.display="flex";
  document.getElementById("name").value=member.name||"";
  document.getElementById("fatherSelect").value=member.fatherId||"";
};

/* ================= SAVE ================= */

window.saveMember=async function(){
  try{
    showLoader();

    const name=document.getElementById("name").value.trim();
    const fatherId=document.getElementById("fatherSelect").value;

    if(!name){
      showMessage("Name required","warning");
      hideLoader();
      return;
    }

    if(!editingId){
      await addDoc(collection(db,"family_members"),{
        name,
        fatherId:fatherId||null,
        generation:1,
        createdAt:serverTimestamp()
      });
      showMessage("Member added");
    }else{
      await updateDoc(doc(db,"family_members",editingId),{
        name,
        fatherId:fatherId||null
      });
      showMessage("Member updated");
    }

    await loadMembers();
    closeModal();
  }
  catch(error){
    showMessage("Save failed","error");
  }

  hideLoader();
};

/* ================= DELETE ================= */

window.deleteMember=async function(id){
  const hasChildren=allMembers.some(m=>m.fatherId===id);

  if(hasChildren){
    showMessage("Cannot delete member with children","error");
    return;
  }

  try{
    showLoader();
    await deleteDoc(doc(db,"family_members",id));
    showMessage("Member deleted");
    await loadMembers();
  }
  catch{
    showMessage("Delete failed","error");
  }

  hideLoader();
};

/* ================= RESET ================= */

window.resetFilters=function(){
  document.getElementById("searchInput").value="";
  document.getElementById("generationFilter").value="";
  currentPage=1;
  renderMembers();
};
