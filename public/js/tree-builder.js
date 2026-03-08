import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const svg = document.getElementById("treeSvg");

svg.setAttribute("width",5000);
svg.setAttribute("height",3000);

const g = document.createElementNS("http://www.w3.org/2000/svg","g");
svg.appendChild(g);

let members=[];

/* ================= LOAD DATA ================= */

async function loadMembers(){

  const snap = await getDocs(collection(db,"family_members"));

  members = snap.docs.map(doc=>({
    id:doc.id,
    ...doc.data()
  }));

  buildTree();

}

loadMembers();

/* ================= BUILD TREE ================= */

function buildTree(){

  const map={};

  members.forEach(m=>{
    map[m.id]={...m,children:[]};
  });

  let root=null;

  members.forEach(m=>{

    if(m.fatherId && map[m.fatherId]){
      map[m.fatherId].children.push(map[m.id]);
    }else{
      root=map[m.id];
    }

  });

  layoutTree(root,0);
  drawTree(root);

}

/* ================= PERFECT LAYOUT ================= */

const nodeWidth=140;
const nodeHeight=100;
let nextX=0;

function layoutTree(node,depth){

  node.y = depth * nodeHeight;

  if(node.children.length===0){

    node.x = nextX;
    nextX += nodeWidth*1.6;

  }else{

    node.children.forEach(child=>{
      layoutTree(child,depth+1);
    });

    const first=node.children[0];
    const last=node.children[node.children.length-1];

    node.x = (first.x + last.x)/2;

  }

}

/* ================= DRAW TREE ================= */

function drawTree(root){

  g.innerHTML="";

  function drawNode(node){

    const group=createSVG("g");
    group.setAttribute("transform",`translate(${node.x},${node.y})`);

    const rect=createSVG("rect");
    rect.setAttribute("width",120);
    rect.setAttribute("height",40);
    rect.setAttribute("rx",8);
    rect.setAttribute("class","node-box");

    const text=createSVG("text");
    text.setAttribute("x",60);
    text.setAttribute("y",24);
    text.setAttribute("text-anchor","middle");
    text.setAttribute("class","node-text");
    text.textContent=node.name || "Unknown";

    group.appendChild(rect);
    group.appendChild(text);

    group.onclick=()=>openProfile(node);

    g.appendChild(group);

    node.children.forEach(child=>{

      drawLink(node,child);
      drawNode(child);

    });

  }

  drawNode(root);

}

/* ================= CONNECTORS ================= */

function drawLink(parent,child){

  const path=createSVG("path");

  const startX=parent.x+60;
  const startY=parent.y+40;

  const endX=child.x+60;
  const endY=child.y;

  const d=`
  M ${startX} ${startY}
  V ${(startY+endY)/2}
  H ${endX}
  V ${endY}
  `;

  path.setAttribute("d",d);
  path.setAttribute("class","connector");

  g.appendChild(path);

}

/* ================= SVG HELPER ================= */

function createSVG(tag){

  return document.createElementNS(
    "http://www.w3.org/2000/svg",
    tag
  );

}

/* ================= ZOOM ================= */

let scale=1;

svg.addEventListener("wheel",(e)=>{

  e.preventDefault();

  if(e.deltaY<0) scale+=0.1;
  else scale-=0.1;

  if(scale<0.3) scale=0.3;

  g.setAttribute("transform",`scale(${scale})`);

});

/* ================= DRAG ================= */

let isDragging=false;
let startX,startY;

svg.addEventListener("mousedown",(e)=>{

  isDragging=true;
  startX=e.clientX;
  startY=e.clientY;

  svg.style.cursor="grabbing";

});

svg.addEventListener("mousemove",(e)=>{

  if(!isDragging) return;

  const dx=e.clientX-startX;
  const dy=e.clientY-startY;

  svg.parentElement.scrollLeft-=dx;
  svg.parentElement.scrollTop-=dy;

  startX=e.clientX;
  startY=e.clientY;

});

svg.addEventListener("mouseup",()=>{

  isDragging=false;
  svg.style.cursor="grab";

});

/* ================= PROFILE MODAL ================= */

function openProfile(node){

  document.getElementById("modalName").innerText=node.name||"";
  document.getElementById("modalGeneration").innerText=node.generation||"";

  document.getElementById("modalFather").innerText=node.fatherName||"";
  document.getElementById("modalDob").innerText=node.dob||"";

  document.getElementById("profileModal").style.display="flex";

}
