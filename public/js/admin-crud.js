import { 
  ref, uploadBytes, getDownloadURL, deleteObject 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

import { db, storage } from "./firebase.js";

import { 
  collection, getDocs, addDoc, serverTimestamp,
  doc, getDoc, deleteDoc, updateDoc, query, where
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let allMembers = [];
let editingId = null;
let currentPage = 1;
const perPage = 8;

/* ================= SPINNER ================= */

function showSpinner() {
  document.getElementById("loader").style.display = "flex";
}
function hideSpinner() {
  document.getElementById("loader").style.display = "none";
}

/* ================= NOTIFICATION ================= */

function showMessage(msg, type="success"){
  const box = document.getElementById("notification");
  box.textContent = msg;
  box.style.display = "block";
  box.style.background = type==="error" ? "#dc2626" : "#16a34a";
  setTimeout(()=> box.style.display="none", 3000);
}

/* ================= LOAD MEMBERS ================= */

async function loadMembers(){
  const snapshot = await getDocs(collection(db,"family_members"));
  allMembers = [];

  snapshot.forEach(docSnap=>{
    allMembers.push({id:docSnap.id, ...docSnap.data()});
  });

  allMembers.sort((a,b)=>a.generation - b.generation);

  populateFatherDropdown();
  populateGenerationFilter();
  renderMembers();
}
loadMembers();

/* ================= RENDER ================= */

function renderMembers(){

  const container = document.getElementById("memberList");
  const pagination = document.getElementById("pagination");

  container.innerHTML="";
  pagination.innerHTML="";

  const search = document.getElementById("searchInput").value.toLowerCase();
  const gen = document.getElementById("generationFilter").value;

  let filtered = allMembers.filter(m=>{
    if(search && !m.name.toLowerCase().includes(search)) return false;
    if(gen && m.generation != gen) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length/perPage);
  if(currentPage>totalPages) currentPage=1;

  const start = (currentPage-1)*perPage;
  const pageData = filtered.slice(start,start+perPage);

  pageData.forEach(member=>{

    const father = member.fatherId ?
      allMembers.find(f=>f.id===member.fatherId)?.name || "-" : "-";

    const image = member.profileImage
      ? `<img src="${member.profileImage}" class="profile-img">`
      : `<div class="profile-img default-avatar">
           ${member.name.charAt(0).toUpperCase()}
         </div>`;

    const div=document.createElement("div");
    div.className="member-card";
    div.innerHTML=`
      ${image}
      <strong>${member.name}</strong><br>
      Father: ${father}<br>
      Generation: ${member.generation}<br>
      DOB: ${member.dob || "-"}<br>

      <div class="actions">
        <button class="btn primary" onclick="openEditModal('${member.id}')">Edit</button>
        <button class="btn danger" onclick="deleteMember('${member.id}')">Delete</button>
      </div>
    `;
    container.appendChild(div);
  });

  for(let i=1;i<=totalPages;i++){
    const btn=document.createElement("div");
    btn.className="page-btn"+(i===currentPage?" active-page":"");
    btn.innerText=i;
    btn.onclick=()=>{
      currentPage=i;
      renderMembers();
    };
    pagination.appendChild(btn);
  }
}

/* ================= DROPDOWNS ================= */

function populateFatherDropdown(){
  const select = document.getElementById("fatherSelect");
  select.innerHTML='<option value="">-- Select Father --</option>';

  allMembers.forEach(m=>{
    const option=document.createElement("option");
    option.value=m.id;
    option.textContent=m.name;
    select.appendChild(option);
  });
}

function populateGenerationFilter(){
  const select=document.getElementById("generationFilter");
  const gens=[...new Set(allMembers.map(m=>m.generation))].sort((a,b)=>a-b);

  select.innerHTML='<option value="">All Generations</option>';
  gens.forEach(g=>{
    const option=document.createElement("option");
    option.value=g;
    option.textContent="Generation "+g;
    select.appendChild(option);
  });
}

/* ================= ADD MEMBER ================= */

window.saveNewMember = async function(){

  const name=document.getElementById("name").value.trim();
  if(!name){ showMessage("Name required","error"); return;}

  showSpinner();

  try{
    const fatherId=document.getElementById("fatherSelect").value;
    let generation=1;

    if(fatherId){
      const fatherSnap=await getDoc(doc(db,"family_members",fatherId));
      generation=fatherSnap.data().generation+1;
    }

    const docRef=await addDoc(collection(db,"family_members"),{
      name,
      fatherId:fatherId||null,
      generation,
      surname:document.getElementById("surname").value,
      title:document.getElementById("title").value,
      dob:document.getElementById("dob").value,
      profileImage:"",
      createdAt:serverTimestamp()
    });

    const file=document.getElementById("profileImage").files[0];
    if(file){
      const imageRef=ref(storage,"profilePhotos/"+docRef.id+"/profile.jpg");
      await uploadBytes(imageRef,file);
      const url=await getDownloadURL(imageRef);
      await updateDoc(doc(db,"family_members",docRef.id),{profileImage:url});
    }

    showMessage("Member Added");
    closeAddModal();
    loadMembers();

  }catch(e){
    showMessage(e.message,"error");
  }

  hideSpinner();
};

/* ================= EDIT ================= */

window.openEditModal=function(id){

  const member=allMembers.find(m=>m.id===id);
  if(!member) return;

  editingId=id;

  document.getElementById("editName").value=member.name;
  document.getElementById("editSurname").value=member.surname||"";
  document.getElementById("editTitle").value=member.title||"";
  document.getElementById("editDob").value=member.dob||"";
  document.getElementById("editFatherSelect").value=member.fatherId||"";

  const preview=document.getElementById("editPreview");
  if(member.profileImage){
    preview.src=member.profileImage;
    preview.style.display="block";
  }else{
    preview.style.display="none";
  }

  document.getElementById("editModal").style.display="flex";
};

window.updateExistingMember=async function(){

  if(!editingId) return;

  showSpinner();

  try{
    await updateDoc(doc(db,"family_members",editingId),{
      name:document.getElementById("editName").value,
      surname:document.getElementById("editSurname").value,
      title:document.getElementById("editTitle").value,
      dob:document.getElementById("editDob").value
    });

    const file=document.getElementById("editProfileImage").files[0];
    if(file){
      const imageRef=ref(storage,"profilePhotos/"+editingId+"/profile.jpg");
      await uploadBytes(imageRef,file);
      const url=await getDownloadURL(imageRef);
      await updateDoc(doc(db,"family_members",editingId),{profileImage:url});
    }

    showMessage("Member Updated");
    closeEditModal();
    loadMembers();

  }catch(e){
    showMessage(e.message,"error");
  }

  hideSpinner();
};

/* ================= DELETE ================= */

window.deleteMember=async function(id){
  if(!confirm("Delete member?")) return;
  await deleteDoc(doc(db,"family_members",id));
  loadMembers();
};
