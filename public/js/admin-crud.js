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

let allMembers = [];
let editingId = null;
let currentPage = 1;
const perPage = 30;

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  loadMembers();
});

/* ================= LOADER ================= */

function showLoader() {
  document.getElementById("loader").style.display = "flex";
}

function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

/* ================= MESSAGE ================= */

function showMessage(msg, type = "success") {
  const box = document.getElementById("notification");
  box.innerText = msg;
  box.style.display = "block";
  box.style.background =
    type === "error" ? "#dc2626" :
    type === "warning" ? "#f59e0b" :
    "#16a34a";

  setTimeout(() => box.style.display = "none", 3000);
}

/* ================= LOAD MEMBERS ================= */

async function loadMembers() {

  const snapshot = await getDocs(collection(db, "family_members"));
  allMembers = [];

  snapshot.forEach(docSnap => {
    allMembers.push({ id: docSnap.id, ...docSnap.data() });
  });

  allMembers.sort((a, b) => a.generation - b.generation);

  renderMembers();
  populateGenerationFilter();
  populateFatherDropdown();
}

/* ================= RENDER ================= */

function renderMembers() {

  const container = document.getElementById("memberList");
  container.innerHTML = "";

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
  if (currentPage > totalPages) currentPage = 1;

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
      ? `<img src="${member.profileImage}" class="profile-img">`
      : `<div class="profile-img" style="display:flex;align-items:center;justify-content:center;background:#ddd;font-weight:bold;font-size:22px;">${initials}</div>`;

    const div = document.createElement("div");
    div.className = "member-card";

    div.innerHTML = `
      ${imageHtml}
      <strong>${member.name}</strong><br>
      Father: ${fatherName}<br>
      Generation: ${member.generation}<br>
      DOB: ${member.dob || "-"}
      <div class="actions">
        <button onclick="editMember('${member.id}')" class="btn primary">Edit</button>
        <button onclick="deleteMember('${member.id}')" class="btn danger">Delete</button>
      </div>
    `;

    container.appendChild(div);
  });

  renderPagination(totalPages);
}

/* ================= PAGINATION ================= */

function renderPagination(totalPages) {

  let pagination = document.getElementById("pagination");

  if (!pagination) {
    pagination = document.createElement("div");
    pagination.id = "pagination";
    document.body.appendChild(pagination);
  }

  pagination.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("div");
    btn.className = "page-btn" + (i === currentPage ? " active-page" : "");
    btn.innerText = i;
    btn.onclick = () => {
      currentPage = i;
      renderMembers();
    };
    pagination.appendChild(btn);
  }
}

/* ================= FILTER EVENTS ================= */

document.getElementById("searchInput").addEventListener("input", () => {
  currentPage = 1;
  renderMembers();
});

document.getElementById("generationFilter").addEventListener("change", () => {
  currentPage = 1;
  renderMembers();
});

/* ================= DROPDOWNS ================= */

function populateGenerationFilter() {

  const select = document.getElementById("generationFilter");
  const gens = [...new Set(allMembers.map(m => m.generation))]
    .sort((a, b) => a - b);

  select.innerHTML = '<option value="">All Generations</option>';

  gens.forEach(g => {
    const option = document.createElement("option");
    option.value = g;
    option.textContent = "Generation " + g;
    select.appendChild(option);
  });
}

function populateFatherDropdown() {

  const select = document.getElementById("fatherSelect");

  select.innerHTML =
    '<option value="">-- Select Father (Leave empty for Root) --</option>';

  allMembers.forEach(m => {
    const option = document.createElement("option");
    option.value = m.id;
    option.textContent = m.name;
    select.appendChild(option);
  });
}

/* ================= ADD MEMBER ================= */

window.openAddModal = function () {
  editingId = null;
  document.getElementById("modalTitle").innerText = "Add Member";
  document.getElementById("memberModal").style.display = "flex";
};

window.saveMember = async function () {

  showLoader();

  const name = document.getElementById("name").value.trim();
  const fatherId = document.getElementById("fatherSelect").value;
  const surname = document.getElementById("surname").value.trim();
  const title = document.getElementById("title").value.trim();
  const dob = document.getElementById("dob").value;
  const file = document.getElementById("profileImage").files[0];

  if (!name) {
    hideLoader();
    showMessage("Name required", "error");
    return;
  }

  let generation = 1;

  if (fatherId) {
    const father = allMembers.find(m => m.id === fatherId);
    generation = father.generation + 1;
  }

  try {

    if (!editingId) {

      const docRef = await addDoc(collection(db, "family_members"), {
        name,
        fatherId: fatherId || null,
        generation,
        surname,
        title,
        dob,
        profileImage: "",
        createdAt: serverTimestamp()
      });

      if (file) {
        const imageRef = ref(storage, "profilePhotos/" + docRef.id + "/profile.jpg");
        await uploadBytes(imageRef, file);
        const url = await getDownloadURL(imageRef);
        await updateDoc(doc(db, "family_members", docRef.id), {
          profileImage: url
        });
      }

      showMessage("Member Added");

    } else {

      await updateDoc(doc(db, "family_members", editingId), {
        name,
        fatherId: fatherId || null,
        generation,
        surname,
        title,
        dob
      });

      showMessage("Member Updated");
    }

    closeModal();
    loadMembers();

  } catch (error) {
    showMessage(error.message, "error");
  }

  hideLoader();
};

/* ================= EDIT ================= */

window.editMember = function (id) {

  const member = allMembers.find(m => m.id === id);
  if (!member) return;

  editingId = id;

  document.getElementById("modalTitle").innerText = "Edit Member";
  document.getElementById("memberModal").style.display = "flex";

  document.getElementById("name").value = member.name;
  document.getElementById("surname").value = member.surname || "";
  document.getElementById("title").value = member.title || "";
  document.getElementById("dob").value = member.dob || "";
  document.getElementById("fatherSelect").value = member.fatherId || "";
};

/* ================= DELETE ================= */

window.deleteMember = async function (id) {

  if (!confirm("Delete this member?")) return;

  await deleteDoc(doc(db, "family_members", id));
  showMessage("Deleted");
  loadMembers();
};
