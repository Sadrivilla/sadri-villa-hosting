import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const svg = document.getElementById("treeSvg");

const width = 5000;
const height = 3000;

svg.setAttribute("width", width);
svg.setAttribute("height", height);

const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
svg.appendChild(g);

let members = [];

/* ================= FETCH MEMBERS ================= */

async function loadMembers() {

  const snap = await getDocs(collection(db,"family_members"));

  members = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  buildTree();

}

loadMembers();

/* ================= BUILD TREE ================= */

function buildTree(){

  const map = {};
  members.forEach(m => map[m.id] = { ...m, children: [] });

  let root = null;

  members.forEach(m => {

    if(m.fatherId && map[m.fatherId]){
      map[m.fatherId].children.push(map[m.id]);
    }else{
      root = map[m.id];
    }

  });

  const tree = layoutTree(root);

  drawTree(tree);

}

/* ================= TREE LAYOUT ================= */

function layoutTree(root){

  const levels = {};

  function traverse(node, depth = 0){

    if(!levels[depth]) levels[depth] = [];

    levels[depth].push(node);

    node.depth = depth;

    node.children.forEach(c => traverse(c, depth+1));

  }

  traverse(root);

  const nodeWidth = 140;
  const nodeHeight = 60;

  Object.keys(levels).forEach(level => {

    const nodes = levels[level];

    nodes.forEach((node,i)=>{

      node.x = i * nodeWidth * 1.8;
      node.y = level * nodeHeight * 2;

    });

  });

  return root;

}

/* ================= DRAW TREE ================= */

function drawTree(root){

  g.innerHTML = "";

  function drawNode(node){

    const group = createSVG("g");

    group.setAttribute("transform",`translate(${node.x},${node.y})`);

    const rect = createSVG("rect");
    rect.setAttribute("width",120);
    rect.setAttribute("height",40);
    rect.setAttribute("rx",8);
    rect.setAttribute("class","node-box");

    const text = createSVG("text");
    text.setAttribute("x",60);
    text.setAttribute("y",22);
    text.setAttribute("text-anchor","middle");
    text.setAttribute("class","node-text");
    text.textContent = node.name || "Unknown";

    group.appendChild(rect);
    group.appendChild(text);

    group.onclick = () => openProfile(node);

    g.appendChild(group);

    node.children.forEach(child=>{

      drawLink(node,child);
      drawNode(child);

    });

  }

  drawNode(root);

}

/* ================= DRAW CONNECTOR ================= */

function drawLink(parent,child){

  const path = createSVG("path");

  const startX = parent.x + 60;
  const startY = parent.y + 40;

  const endX = child.x + 60;
  const endY = child.y;

  const d = `
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

/* ================= ZOOM + DRAG ================= */

let scale = 1;

svg.addEventListener("wheel",(e)=>{

  e.preventDefault();

  if(e.deltaY < 0) scale += 0.1;
  else scale -= 0.1;

  if(scale < 0.3) scale = 0.3;

  g.setAttribute("transform",`scale(${scale})`);

});

let isDragging = false;
let startX,startY;

svg.addEventListener("mousedown",(e)=>{

  isDragging = true;

  startX = e.clientX;
  startY = e.clientY;

  svg.style.cursor = "grabbing";

});

svg.addEventListener("mousemove",(e)=>{

  if(!isDragging) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  svg.parentElement.scrollLeft -= dx;
  svg.parentElement.scrollTop -= dy;

  startX = e.clientX;
  startY = e.clientY;

});

svg.addEventListener("mouseup",()=>{

  isDragging = false;

  svg.style.cursor = "grab";

});

/* ================= PROFILE MODAL ================= */

function openProfile(node){

  document.getElementById("modalName").innerText = node.name || "";
  document.getElementById("modalGeneration").innerText = node.generation || "";

  document.getElementById("profileModal").style.display="flex";

}
