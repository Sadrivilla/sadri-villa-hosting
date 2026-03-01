import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

import { db, storage } from "./firebase.js";

let allMembers = [];
let editingId = null;
let deleteId = null;

/* TOAST */
function showMessage(message, type="success"){
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className=`toast ${type}`;
  const icon = type==="error"?"❌":type==="warning"?"⚠":"✔";
  toast.innerHTML=`<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(()=>toast.remove(),3000);
}

/* LOAD */
async function loadMembers(){
  const snapshot = await getDocs(collection(db,"family_members"));
  allMembers=[];
  snapshot.forEach(docSnap=>{
    allMembers.push({id:docSnap.id,...docSnap.data()});
  });
  renderMembers();
  populateFatherDropdown();
}

/* RENDER */
function renderMembers(){
  const container=document.getElementById("memberList");
  container.innerHTML="";
  const search=document.getElementById("searchInput").value.toLowerCase();

  allMembers
  .filter(m=>m.name.toLowerCase().includes(search))
  .forEach(member=>{
    const father=allMembers.find(f=>f.id===member.fatherId)?.name||"-";
    const img=member.profileImage
      ? `<div class="profile-img" style="background-image:url('${member.profileImage}');background-size:cover;"></div>`
      : `<div class="profile-img" style="display:flex;align-items:center;justify-content:center;background:#ddd;">${member.name.substring(0,2)}</div>`;

    container.innerHTML+=`
    <div class="member-card">
      ${img}
      <strong>${member.name}</strong><br>
      Father: ${father}<br>
      <div class="actions">
        <button class="btn primary" onclick="editMember('${member.id}')">Edit</button>
        <button class="btn danger" onclick="openDeleteModal('${member.id}')">Delete</button>
      </div>
    </div>`;
  });
}

/* SEARCH AUTO */
document.getElementById("searchInput").addEventListener("input",e=>{
  const value=e.target.value.toLowerCase();
  const dropdown=document.getElementById("searchDropdown");
  dropdown.innerHTML="";
  if(!value){dropdown.style.display="none";renderMembers();return;}
  const matches=allMembers.filter(m=>m.name.toLowerCase().includes(value));
  matches.forEach(m=>{
    dropdown.innerHTML+=`<div onclick="selectSearch('${m.name}')">${m.name}</div>`;
  });
  dropdown.style.display="block";
  renderMembers();
});

window.selectSearch=function(name){
  document.getElementById("searchInput").value=name;
  document.getElementById("searchDropdown").style.display="none";
  renderMembers();
}

/* FATHER DROPDOWN (Disable Loop) */
function isDescendant(childId,fatherId){
  let current=allMembers.find(m=>m.id===fatherId);
  while(current){
    if(current.fatherId===childId) return true;
    current=allMembers.find(m=>m.id===current.fatherId);
  }
  return false;
}

function populateFatherDropdown(){
  const select=document.getElementById("fatherSelect");
  select.innerHTML='<option value="">Select Father</option>';
  allMembers.forEach(m=>{
    const disabled=editingId&&(m.id===editingId||isDescendant(editingId,m.id));
    select.innerHTML+=`<option value="${m.id}" ${disabled?"disabled":""}>${m.name}</option>`;
  });
}

/* MODAL */
window.openAddModal=function(){
  editingId=null;
  document.getElementById("memberModal").style.display="flex";
}

window.closeModal=function(){
  document.getElementById("memberModal").style.display="none";
}

/* EDIT */
window.editMember=function(id){
  editingId=id;
  const m=allMembers.find(x=>x.id===id);
  document.getElementById("memberModal").style.display="flex";
  document.getElementById("name").value=m.name;
  document.getElementById("fatherSelect").value=m.fatherId||"";
  populateFatherDropdown();
}

/* SAVE */
window.saveMember=async function(){
  const name=document.getElementById("name").value.trim();
  const fatherId=document.getElementById("fatherSelect").value;

  if(!name){showMessage("Name required","warning");return;}

  if(editingId&&isDescendant(editingId,fatherId)){
    showMessage("Invalid father selection","error");
    return;
  }

  if(!editingId){
    await addDoc(collection(db,"family_members"),{
      name,fatherId:fatherId||null,createdAt:serverTimestamp()
    });
    showMessage("Member added");
  }else{
    await updateDoc(doc(db,"family_members",editingId),{
      name,fatherId:fatherId||null
    });
    showMessage("Member updated");
  }

  closeModal();
  loadMembers();
}

/* DELETE */
window.openDeleteModal=function(id){
  const hasChildren=allMembers.some(m=>m.fatherId===id);
  if(hasChildren){
    showMessage("Cannot delete member with children","error");
    return;
  }
  deleteId=id;
  document.getElementById("deleteModal").style.display="flex";
}

window.closeDeleteModal=function(){
  document.getElementById("deleteModal").style.display="none";
}

window.confirmDelete=async function(){
  await deleteDoc(doc(db,"family_members",deleteId));
  closeDeleteModal();
  loadMembers();
  showMessage("Member deleted");
}

loadMembers();
