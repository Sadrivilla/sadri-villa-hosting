import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { db } from "./firebase.js";

let allMembers = [];
let editingId = null;
let currentPage = 1;
const perPage = 30;

document.addEventListener("DOMContentLoaded", () => {
  loadMembers();

  document.getElementById("searchInput").addEventListener("input", handleSearch);
  document.getElementById("generationFilter").addEventListener("change", () => {
    currentPage = 1;
    renderMembers();
  });

  document.getElementById("memberModal").addEventListener("click", (e) => {
    if (e.target.id === "memberModal") closeModal();
  });
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
  populateSearchDropdown();
  renderMembers();
}

/* ================= RENDER ================= */

function renderMembers() {
  const container = document.getElementById("memberList");
  const pagination = document.getElementById("pagination");

  container.innerHTML = "";
  pagination.innerHTML = "";

  const searchValue = document.getElementById("searchInput").value.toLowerCase();
  const generationValue = document.getElementById("generationFilter").value;

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

    const initials = member.name.substring(0, 2).toUpperCase();

 let imageHtml = "";

if (member.profileImage && member.profileImage.trim() !== "") {
  imageHtml = `
    <img src="${member.profileImage}" 
         class="profile-img"
         onerror="this.style.display='none';">
  `;
} else {
  imageHtml = `
    <div class="profile-img" style="
      display:flex;
      align-items:center;
      justify-content:center;
      background:#ddd;
      font-weight:bold;
      font-size:22px;">
      ${initials}
    </div>
  `;
}

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

  for (let i = 1; i <= totalPages; i++) {
    pagination.innerHTML += `
      <div class="page-btn ${i === currentPage ? "active-page" : ""}"
           onclick="goToPage(${i})">${i}</div>
    `;
  }
}

window.goToPage = function (page) {
  currentPage = page;
  renderMembers();
};

/* ================= SEARCH ================= */

function populateSearchDropdown() {
  const dropdown = document.getElementById("searchDropdown");
  dropdown.innerHTML = "";

  allMembers.forEach(m => {
    dropdown.innerHTML += `
      <div style="padding:8px;cursor:pointer;"
           onclick="selectSearch('${m.name}')">${m.name}</div>
    `;
  });
}

window.selectSearch = function (name) {
  document.getElementById("searchInput").value = name;
  document.getElementById("searchDropdown").style.display = "none";
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
  const gens = [...new Set(allMembers.map(m => m.generation))].sort((a,b)=>a-b);

  select.innerHTML = '<option value="">All Generations</option>';
  gens.forEach(g => {
    select.innerHTML += `<option value="${g}">Generation ${g}</option>`;
  });
}

function populateFatherDropdown() {
  const select = document.getElementById("fatherSelect");
  select.innerHTML = '<option value="">-- Select Father --</option>';
  allMembers.forEach(m => {
    select.innerHTML += `<option value="${m.id}">${m.name}</option>`;
  });
}

/* ================= MODAL ================= */

window.openAddModal = function () {
  editingId = null;
  document.getElementById("modalTitle").innerText = "Add Member";
  document.getElementById("memberModal").style.display = "flex";
};

window.closeModal = function () {
  document.getElementById("memberModal").style.display = "none";
  document.getElementById("name").value = "";
  document.getElementById("fatherSelect").value = "";
};

/* ================= SAVE ================= */

window.saveMember = async function () {

  const name = document.getElementById("name").value.trim();
  const fatherId = document.getElementById("fatherSelect").value;

  if (!name) return alert("Name required");

  let generation = 1;
  if (fatherId) {
    const father = allMembers.find(m => m.id === fatherId);
    generation = father.generation + 1;
  }

  if (!editingId) {
    await addDoc(collection(db, "family_members"), {
      name,
      fatherId: fatherId || null,
      generation,
      createdAt: serverTimestamp()
    });
  } else {
    await updateDoc(doc(db, "family_members", editingId), {
      name,
      fatherId: fatherId || null,
      generation
    });
  }

  closeModal();
  loadMembers();
};

/* ================= EDIT ================= */

window.editMember = function (id) {
  const member = allMembers.find(m => m.id === id);
  editingId = id;

  document.getElementById("modalTitle").innerText = "Edit Member";
  document.getElementById("memberModal").style.display = "flex";
  document.getElementById("name").value = member.name;
  document.getElementById("fatherSelect").value = member.fatherId || "";
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
  document.getElementById("searchDropdown").style.display = "none";
  currentPage = 1;
  renderMembers();
};
