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
let allMembers = [];

/* ================= NOTIFICATION ================= */

function showMessage(message, type = "success") {

  const box = document.getElementById("notification");
  if (!box) return;

  box.textContent = message;
  box.style.display = "block";

  if (type === "success") box.style.backgroundColor = "#16a34a";
  else if (type === "error") box.style.backgroundColor = "#dc2626";
  else box.style.backgroundColor = "#f59e0b";

  setTimeout(() => box.style.display = "none", 3000);
}

/* ================= LOAD DATA ================= */

async function loadMembers() {

  const snapshot = await getDocs(collection(db, "family_members"));
  allMembers = [];

  snapshot.forEach(docSnap => {
    allMembers.push({ id: docSnap.id, ...docSnap.data() });
  });

  // Sort generation wise
  allMembers.sort((a,b)=>a.generation - b.generation);

  renderMembers();
  populateGenerationFilter();
  loadSearchDropdown();
}

loadMembers();

/* ================= RENDER MEMBERS ================= */

function renderMembers() {

  const container = document.getElementById("memberList");
  if (!container) return;

  const searchValue = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const generationValue = document.getElementById("generationFilter")?.value;

  container.innerHTML = "";

  const filtered = allMembers.filter(m => {
    if (searchValue && !m.name.toLowerCase().includes(searchValue)) return false;
    if (generationValue && m.generation != generationValue) return false;
    return true;
  });

  filtered.forEach(member => {

    const father = member.fatherId 
      ? allMembers.find(f => f.id === member.fatherId)?.name || "-"
      : "-";

    const imageUrl = member.profileImage || "https://via.placeholder.com/100";

    const div = document.createElement("div");
    div.className = "member-card";

    div.innerHTML = `
      <img src="${imageUrl}" class="profile-img">
      <strong>${member.name}</strong><br>
      Father: ${father}<br>
      Generation: ${member.generation}<br>
      DOB: ${member.dob || "-"}<br>

      <div class="actions">
        <button onclick="openEdit('${member.id}')" class="btn primary">Edit</button>
        <button onclick="deleteMember('${member.id}')" class="btn danger">Delete</button>
      </div>
    `;

    container.appendChild(div);
  });
}

/* ================= SEARCH DROPDOWN ================= */

function loadSearchDropdown(){

  const dropdown = document.getElementById("searchDropdown");
  if(!dropdown) return;

  dropdown.innerHTML = "";

  allMembers.forEach(m=>{
    const item = document.createElement("div");
    item.className="dropdown-item";
    item.innerText=m.name;
    item.onclick=()=>{
      document.getElementById("searchInput").value=m.name;
      dropdown.style.display="none";
      renderMembers();
    };
    dropdown.appendChild(item);
  });
}

document.getElementById("searchInput")?.addEventListener("focus",()=>{
  const dropdown = document.getElementById("searchDropdown");
  if(dropdown) dropdown.style.display="block";
});

document.getElementById("searchInput")?.addEventListener("input",()=>{
  renderMembers();
});

/* ================= ADD MEMBER ================= */

window.saveMember = async function(){

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
        isRoot: fatherId ? false : true,
        createdAt: serverTimestamp()
      });

      if (file) {
        const imageRef = ref(storage, "profilePhotos/" + docRef.id + "/profile.jpg");
        await uploadBytes(imageRef, file);
        const downloadURL = await getDownloadURL(imageRef);

        await updateDoc(doc(db, "family_members", docRef.id), {
          profileImage: downloadURL
        });
      }

      showMessage("Member Added Successfully!");

    } else {

      await updateDoc(doc(db, "family_members", editingId), {
        name,
        fatherId: fatherId || null,
        generation,
        surname,
        title,
        dob
      });

      if (file) {
        const imageRef = ref(storage, "profilePhotos/" + editingId + "/profile.jpg");
        try { await deleteObject(imageRef); } catch(e){}
        await uploadBytes(imageRef, file);
        const downloadURL = await getDownloadURL(imageRef);

        await updateDoc(doc(db, "family_members", editingId), {
          profileImage: downloadURL
        });
      }

      showMessage("Member Updated Successfully!");
    }

    editingId = null;
    clearForm();
    closeModal();
    loadMembers();

  } catch (error) {
    showMessage(error.message, "error");
  }
};

/* ================= EDIT ================= */

window.openEdit = function(id){

  const member = allMembers.find(m=>m.id===id);
  if(!member) return;

  editingId = id;

  document.getElementById("modalTitle").innerText="Edit Member";
  document.getElementById("name").value=member.name;
  document.getElementById("surname").value=member.surname || "";
  document.getElementById("title").value=member.title || "";
  document.getElementById("dob").value=member.dob || "";
  document.getElementById("fatherSelect").value=member.fatherId || "";

  if(member.profileImage){
    const preview=document.getElementById("imagePreview");
    preview.src=member.profileImage;
    preview.style.display="block";
  }

  openModal();
};

/* ================= DELETE ================= */

window.deleteMember = async function (id) {

  if (!confirm("Delete this member?")) return;

  const member = allMembers.find(m=>m.id===id);
  if(!member) return;

  if (member.isRoot) {
    showMessage("Cannot delete root ancestor.", "warning");
    return;
  }

  const q = query(collection(db, "family_members"), where("fatherId", "==", id));
  const childrenSnapshot = await getDocs(q);

  if (!childrenSnapshot.empty) {
    showMessage("Cannot delete member with children.", "warning");
    return;
  }

  try {
    const imageRef = ref(storage, "profilePhotos/" + id + "/profile.jpg");
    await deleteObject(imageRef);
  } catch(e){}

  await deleteDoc(doc(db, "family_members", id));

  showMessage("Member Deleted Successfully!");
  loadMembers();
};

/* ================= HELPERS ================= */

function clearForm() {
  document.getElementById("name").value="";
  document.getElementById("surname").value="";
  document.getElementById("title").value="";
  document.getElementById("fatherSelect").value="";
  document.getElementById("dob").value="";
  document.getElementById("profileImage").value="";
  document.getElementById("imagePreview").style.display="none";
}

function populateGenerationFilter(){

  const select=document.getElementById("generationFilter");
  if(!select) return;

  const gens=[...new Set(allMembers.map(m=>m.generation))].sort((a,b)=>a-b);

  select.innerHTML='<option value="">All Generations</option>';

  gens.forEach(gen=>{
    const option=document.createElement("option");
    option.value=gen;
    option.textContent="Generation "+gen;
    select.appendChild(option);
  });
}

document.addEventListener("change", e=>{
  if(e.target.id==="generationFilter") renderMembers();
});

/* ================= CLOSE MODAL OUTSIDE CLICK ================= */

window.onclick=function(e){
  const modal=document.getElementById("memberModal");
  if(e.target===modal){
    closeModal();
  }
};
