import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

import { db, storage } from "./firebase.js";

import {
  collection, getDocs, addDoc,
  serverTimestamp, doc, getDoc,
  deleteDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let editingId = null;
let allMembers = [];

/* ================= UI HELPERS ================= */

window.showMessage = function(msg, type="success"){
  const box=document.getElementById("notification");
  box.innerText=msg;
  box.style.display="block";
  box.style.background= type==="error" ? "#dc2626" : "#16a34a";
  setTimeout(()=>box.style.display="none",3000);
};

function showLoader(){ document.getElementById("loader").style.display="flex"; }
function hideLoader(){ document.getElementById("loader").style.display="none"; }

/* ================= LOAD DATA ================= */

async function loadMembers(){
  const snapshot = await getDocs(collection(db,"family_members"));
  allMembers = [];

  snapshot.forEach(docSnap=>{
    allMembers.push({id:docSnap.id,...docSnap.data()});
  });

  allMembers.sort((a,b)=>a.generation-b.generation);

  renderMembers();
  loadFathers();
}

loadMembers();

/* ================= RENDER ================= */

function renderMembers(){

  const container=document.getElementById("memberList");
  container.innerHTML="";

  const search=document.getElementById("searchInput").value.toLowerCase();
  const gen=document.getElementById("generationFilter").value;

  const filtered=allMembers.filter(m=>{
    if(search && !m.name.toLowerCase().includes(search)) return false;
    if(gen && m.generation!=gen) return false;
    return true;
  });

  filtered.forEach(member=>{

    const father=member.fatherId
      ? allMembers.find(f=>f.id===member.fatherId)?.name || "-"
      : "-";

    const imageUrl=member.profileImage || "https://ui-avatars.com/api/?name="+member.name;

    const div=document.createElement("div");
    div.className="member-card";

    div.innerHTML=`
      <img src="${imageUrl}" class="profile-img">
      <strong>${member.name}</strong><br>
      Father: ${father}<br>
      Generation: ${member.generation}<br>
      DOB: ${member.dob || "-"}
      <div class="actions">
        <button class="btn primary" onclick="openEditModal('${member.id}')">Edit</button>
        <button class="btn danger" onclick="deleteMember('${member.id}')">Delete</button>
      </div>
    `;

    container.appendChild(div);
  });
}

/* ================= FATHER DROPDOWN ================= */

function loadFathers(){
  const select=document.getElementById("fatherSelect");
  select.innerHTML='<option value="">-- Select Father --</option>';
  allMembers.forEach(m=>{
    const opt=document.createElement("option");
    opt.value=m.id;
    opt.textContent=m.name;
    select.appendChild(opt);
  });
}

/* ================= MODAL ================= */

window.openAddModal=function(){
  editingId=null;
  document.getElementById("modalTitle").innerText="Add Member";
  document.getElementById("memberModal").style.display="flex";
};

window.openEditModal=function(id){

  const member=allMembers.find(m=>m.id===id);
  if(!member) return;

  editingId=id;

  document.getElementById("modalTitle").innerText="Edit Member";
  document.getElementById("memberModal").style.display="flex";

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
};

window.closeModal=function(){
  document.getElementById("memberModal").style.display="none";
  clearForm();
};

function clearForm(){
  document.getElementById("name").value="";
  document.getElementById("surname").value="";
  document.getElementById("title").value="";
  document.getElementById("dob").value="";
  document.getElementById("fatherSelect").value="";
  document.getElementById("profileImage").value="";
  document.getElementById("imagePreview").style.display="none";
}

/* ================= SAVE ================= */

window.saveMember=async function(){

  const name=document.getElementById("name").value.trim();
  const fatherId=document.getElementById("fatherSelect").value;
  const surname=document.getElementById("surname").value;
  const title=document.getElementById("title").value;
  const dob=document.getElementById("dob").value;
  const file=document.getElementById("profileImage").files[0];

  if(!name){ showMessage("Name required","error"); return; }

  showLoader();

  let generation=1;
  if(fatherId){
    const father=allMembers.find(f=>f.id===fatherId);
    generation=(father?.generation || 0)+1;
  }

  try{

    if(!editingId){

      const docRef=await addDoc(collection(db,"family_members"),{
        name,fatherId:fatherId||null,generation,
        surname,title,dob,profileImage:"",
        createdAt:serverTimestamp()
      });

      if(file){
        const imageRef=ref(storage,"profilePhotos/"+docRef.id+"/profile.jpg");
        await uploadBytes(imageRef,file);
        const url=await getDownloadURL(imageRef);
        await updateDoc(doc(db,"family_members",docRef.id),{profileImage:url});
      }

      showMessage("Member Added");

    }else{

      await updateDoc(doc(db,"family_members",editingId),{
        name,fatherId:fatherId||null,generation,
        surname,title,dob
      });

      if(file){
        const imageRef=ref(storage,"profilePhotos/"+editingId+"/profile.jpg");
        await uploadBytes(imageRef,file);
        const url=await getDownloadURL(imageRef);
        await updateDoc(doc(db,"family_members",editingId),{profileImage:url});
      }

      showMessage("Member Updated");
    }

    closeModal();
    loadMembers();

  }catch(err){
    showMessage(err.message,"error");
  }

  hideLoader();
};

/* ================= DELETE ================= */

window.deleteMember=async function(id){
  if(!confirm("Delete this member?")) return;

  await deleteDoc(doc(db,"family_members",id));
  showMessage("Deleted");
  loadMembers();
};

/* ================= FILTER ================= */

document.getElementById("searchInput")
.addEventListener("input",renderMembers);

document.getElementById("generationFilter")
.addEventListener("change",renderMembers);

window.resetFilters=function(){
  document.getElementById("searchInput").value="";
  document.getElementById("generationFilter").value="";
  renderMembers();
};
