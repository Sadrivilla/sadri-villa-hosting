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
let currentPage = 1;
const perPage = 8;

/* ================= LOADING SPINNER ================= */

function showLoader(){
  document.body.style.cursor="wait";
}

function hideLoader(){
  document.body.style.cursor="default";
}

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

/* ================= LOAD MEMBERS ================= */

async function loadMembers() {

  showLoader();

  const snapshot = await getDocs(collection(db, "family_members"));
  allMembers = [];

  snapshot.forEach(docSnap => {
    allMembers.push({ id: docSnap.id, ...docSnap.data() });
  });

  // Sort generation wise properly
  allMembers.sort((a,b)=>a.generation - b.generation);

  renderMembers();
  populateGenerationFilter();
  populateFatherDropdown();
  populateSearchDropdown();

  hideLoader();
}

loadMembers();

/* ================= RENDER ================= */

function renderMembers() {

  const container = document.getElementById("memberList");
  const pagination = document.getElementById("pagination");
  container.innerHTML="";
  pagination.innerHTML="";

  const searchValue = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const generationValue = document.getElementById("generationFilter")?.value;

  let filtered = allMembers.filter(m=>{
    if(searchValue && !m.name.toLowerCase().includes(searchValue)) return false;
    if(generationValue && m.generation != generationValue) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  if(currentPage > totalPages) currentPage = 1;

  const start = (currentPage-1)*perPage;
  const pageMembers = filtered.slice(start, start+perPage);

  pageMembers.forEach(member=>{

    const father = member.fatherId 
      ? allMembers.find(f=>f.id===member.fatherId)?.name || "-"
      : "-";

    let imageHtml;

    if(member.profileImage){
      imageHtml = `<img src="${member.profileImage}" class="profile-img">`;
    }else{
      imageHtml = `
        <div class="profile-img" style="display:flex;align-items:center;justify-content:center;font-size:40px;background:#eee;">
          ${member.name.charAt(0).toUpperCase()}
        </div>`;
    }

    const div = document.createElement("div");
    div.className="member-card";
    div.innerHTML=`
      ${imageHtml}
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
  const select=document.getElementById("fatherSelect");
  if(!select) return;

  select.innerHTML='<option value="">-- Select Father --</option>';

  allMembers.forEach(m=>{
    const option=document.createElement("option");
    option.value=m.id;
    option.textContent=m.name;
    select.appendChild(option);
  });
}

function populateSearchDropdown(){
  const searchInput=document.getElementById("searchInput");
  if(!searchInput) return;

  searchInput.setAttribute("list","memberListData");

  let datalist=document.getElementById("memberListData");
  if(!datalist){
    datalist=document.createElement("datalist");
    datalist.id="memberListData";
    document.body.appendChild(datalist);
  }

  datalist.innerHTML="";
  allMembers.forEach(m=>{
    const option=document.createElement("option");
    option.value=m.name;
    datalist.appendChild(option);
  });
}

/* ================= SAVE MEMBER ================= */

window.saveMember = async function(){

  const name=document.getElementById("name").value.trim();
  const fatherId=document.getElementById("fatherSelect").value;
  const surname=document.getElementById("surname").value.trim();
  const title=document.getElementById("title").value.trim();
  const dob=document.getElementById("dob").value;
  const file=document.getElementById("profileImage").files[0];

  if(!name){
    showMessage("Name is required","error");
    return;
  }

  let generation=1;
  if(fatherId){
    const fatherSnap=await getDoc(doc(db,"family_members",fatherId));
    generation=fatherSnap.data().generation+1;
  }

  showLoader();

  try{

    if(!editingId){

      const docRef=await addDoc(collection(db,"family_members"),{
        name,fatherId:fatherId||null,generation,
        surname,title,dob,
        profileImage:"",
        isRoot:fatherId?false:true,
        createdAt:serverTimestamp()
      });

      if(file){
        const imageRef=ref(storage,"profilePhotos/"+docRef.id+"/profile.jpg");
        await uploadBytes(imageRef,file);
        const downloadURL=await getDownloadURL(imageRef);
        await updateDoc(doc(db,"family_members",docRef.id),{profileImage:downloadURL});
      }

      showMessage("Member Added Successfully");

    }else{

      await updateDoc(doc(db,"family_members",editingId),{
        name,fatherId:fatherId||null,generation,
        surname,title,dob
      });

      if(file){
        const imageRef=ref(storage,"profilePhotos/"+editingId+"/profile.jpg");
        try{ await deleteObject(imageRef);}catch(e){}
        await uploadBytes(imageRef,file);
        const downloadURL=await getDownloadURL(imageRef);
        await updateDoc(doc(db,"family_members",editingId),{profileImage:downloadURL});
      }

      showMessage("Member Updated Successfully");
    }

    clearForm();
    closeModal();
    editingId=null;
    loadMembers();

  }catch(error){
    showMessage(error.message,"error");
  }

  hideLoader();
};

/* ================= EDIT ================= */

window.openEdit=function(id){

  const member=allMembers.find(m=>m.id===id);
  if(!member) return;

  editingId=id;

  document.getElementById("modalTitle").innerText="Edit Member";
  document.getElementById("name").value=member.name;
  document.getElementById("surname").value=member.surname||"";
  document.getElementById("title").value=member.title||"";
  document.getElementById("dob").value=member.dob||"";
  document.getElementById("fatherSelect").value=member.fatherId||"";

  const preview=document.getElementById("imagePreview");

  if(member.profileImage){
    preview.src=member.profileImage;
    preview.style.display="block";
  }else{
    preview.style.display="none";
  }

  openModal();
};

/* ================= DELETE ================= */

window.deleteMember=async function(id){

  if(!confirm("Delete this member?")) return;

  const q=query(collection(db,"family_members"),where("fatherId","==",id));
  const children=await getDocs(q);
  if(!children.empty){
    showMessage("Cannot delete member with children","warning");
    return;
  }

  try{
    const imageRef=ref(storage,"profilePhotos/"+id+"/profile.jpg");
    await deleteObject(imageRef);
  }catch(e){}

  await deleteDoc(doc(db,"family_members",id));
  showMessage("Member Deleted");
  loadMembers();
};

/* ================= HELPERS ================= */

function clearForm(){
  document.getElementById("name").value="";
  document.getElementById("surname").value="";
  document.getElementById("title").value="";
  document.getElementById("fatherSelect").value="";
  document.getElementById("dob").value="";
  document.getElementById("profileImage").value="";
  document.getElementById("imagePreview").style.display="none";
}

document.getElementById("searchInput")?.addEventListener("input",()=>{
  currentPage=1;
  renderMembers();
});

document.getElementById("generationFilter")?.addEventListener("change",()=>{
  currentPage=1;
  renderMembers();
});

window.resetFilters=function(){
  document.getElementById("searchInput").value="";
  document.getElementById("generationFilter").value="";
  currentPage=1;
  renderMembers();
};

window.onclick=function(e){
  const modal=document.getElementById("memberModal");
  if(e.target===modal){
    closeModal();
  }
};
