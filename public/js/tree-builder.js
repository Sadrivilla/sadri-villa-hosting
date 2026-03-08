import { collection, getDocs }
from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { db } from "./firebase.js";

let scale = 1;
let memberMap = {};

// =============================
// MODE TOGGLE
// =============================

window.setMode = function(mode){

const svg = document.getElementById("treeSvg");

if(!svg) return;

if(mode === "modern"){
svg.setAttribute("data-modern","true");
}else{
svg.removeAttribute("data-modern");
}

renderTree();

};


// =============================
// RENDER TREE
// =============================

async function renderTree(){

const snapshot = await getDocs(collection(db,"family_members"));

const members=[];

snapshot.forEach(doc=>{
members.push({id:doc.id,...doc.data()});
});

memberMap={};

members.forEach(m=>{
memberMap[m.id]={...m,children:[]};
});


// connect children

members.forEach(m=>{

if(m.fatherId && memberMap[m.fatherId]){

memberMap[m.fatherId].children.push(memberMap[m.id]);

}

});


// detect root

let root=null;

members.forEach(m=>{

if(!m.fatherId || m.generation===1){
root=memberMap[m.id];
}

});

if(!root){
console.error("Root not found");
return;
}


// layout settings

const boxWidth=150;
const siblingGap=40;
const levelGap=120;



// =============================
// MEASURE SUBTREE WIDTH
// =============================

function measure(node){

if(!node.children || node.children.length===0){

node.subtreeWidth=boxWidth;
return boxWidth;

}

node.children.sort((a,b)=>{
return (a.createdAt?.seconds||0)-(b.createdAt?.seconds||0);
});

let total=0;

node.children.forEach(child=>{
total+=measure(child);
});

total+=siblingGap*(node.children.length-1);

node.subtreeWidth=Math.max(total,boxWidth);

return node.subtreeWidth;

}



// =============================
// ASSIGN POSITIONS
// =============================

function assign(node,centerX,y){

node.x=centerX-boxWidth/2;
node.y=y;

if(!node.children || node.children.length===0) return;

let startX=centerX-node.subtreeWidth/2;

node.children.forEach(child=>{

const childCenter=startX+child.subtreeWidth/2;

assign(child,childCenter,y+levelGap);

startX+=child.subtreeWidth+siblingGap;

});

}



measure(root);

assign(root,root.subtreeWidth/2+200,80);

drawTree(root);

setTimeout(()=>{

const container=document.getElementById("treeContainer");

if(container){

container.scrollLeft=
(container.scrollWidth-container.clientWidth)/2;

}

},100);

}



// =============================
// DRAW SVG TREE
// =============================

function drawTree(root){

const svg=document.getElementById("treeSvg");

svg.innerHTML="";


// arrow marker

const defs=document.createElementNS("http://www.w3.org/2000/svg","defs");

const marker=document.createElementNS("http://www.w3.org/2000/svg","marker");

marker.setAttribute("id","arrow");
marker.setAttribute("markerWidth","10");
marker.setAttribute("markerHeight","10");
marker.setAttribute("refX","6");
marker.setAttribute("refY","3");
marker.setAttribute("orient","auto");

const path=document.createElementNS("http://www.w3.org/2000/svg","path");

path.setAttribute("d","M0,0 L0,6 L8,3 z");
path.setAttribute("fill","#333");

marker.appendChild(path);
defs.appendChild(marker);

svg.appendChild(defs);


// calculate height

function calcHeight(node){

let max=node.y+200;

if(node.children){

node.children.forEach(c=>{
max=Math.max(max,calcHeight(c));
});

}

return max;

}

const totalHeight=calcHeight(root);

svg.setAttribute("width",root.subtreeWidth+400);
svg.setAttribute("height",totalHeight+100);



// =============================
// DRAW NODE
// =============================

function draw(node){

const parentCenter=node.x+75;
const parentBottom=node.y+60;


if(node.children && node.children.length>0){

const connectorY=parentBottom+25;


// vertical

const v=document.createElementNS("http://www.w3.org/2000/svg","line");

v.setAttribute("x1",parentCenter);
v.setAttribute("y1",parentBottom);
v.setAttribute("x2",parentCenter);
v.setAttribute("y2",connectorY);

v.setAttribute("class","connector");

svg.appendChild(v);


// horizontal

const centers=node.children.map(c=>c.x+75);

const minX=Math.min(...centers);
const maxX=Math.max(...centers);

const h=document.createElementNS("http://www.w3.org/2000/svg","line");

h.setAttribute("x1",minX);
h.setAttribute("y1",connectorY);
h.setAttribute("x2",maxX);
h.setAttribute("y2",connectorY);

h.setAttribute("class","connector");

svg.appendChild(h);


// children connectors

node.children.forEach(child=>{

const line=document.createElementNS("http://www.w3.org/2000/svg","line");

line.setAttribute("x1",child.x+75);
line.setAttribute("y1",connectorY);
line.setAttribute("x2",child.x+75);
line.setAttribute("y2",child.y);

line.setAttribute("class","connector");
line.setAttribute("marker-end","url(#arrow)");

svg.appendChild(line);

draw(child);

});

}



// node box

const rect=document.createElementNS("http://www.w3.org/2000/svg","rect");

rect.setAttribute("x",node.x);
rect.setAttribute("y",node.y);
rect.setAttribute("width",150);
rect.setAttribute("height",60);
rect.setAttribute("rx",10);

rect.setAttribute("class","node-box");

rect.dataset.id=node.id;


// generation color

let hue=(node.generation*47)%360;

rect.setAttribute("fill",`hsl(${hue},70%,88%)`);

rect.style.cursor="pointer";

rect.addEventListener("click",()=>{

openProfileModal(node);

});

svg.appendChild(rect);


// text

const text=document.createElementNS("http://www.w3.org/2000/svg","text");

text.setAttribute("x",node.x+75);
text.setAttribute("y",node.y+35);
text.setAttribute("text-anchor","middle");

text.setAttribute("class","node-text");

text.textContent=`${node.name} Gen ${node.generation}`;

svg.appendChild(text);

}

draw(root);

}



// =============================
// EXPORT PDF
// =============================

window.exportTreePDF=async function(){

const { jsPDF } = window.jspdf;

const snapshot=await getDocs(collection(db,"family_members"));

const members=[];

snapshot.forEach(doc=>{
members.push({id:doc.id,...doc.data()});
});

const pdf=new jsPDF();

let y=20;

members.forEach(m=>{

pdf.text(`${m.name}  Gen ${m.generation}`,20,y);

y+=8;

});

pdf.save("Sadri-Shajra.pdf");

};



// =============================
// EXPORT EXCEL
// =============================

window.exportExcel=async function(){

const snapshot=await getDocs(collection(db,"family_members"));

const rows=[];

snapshot.forEach(doc=>{
rows.push(doc.data());
});

const sheet=XLSX.utils.json_to_sheet(rows);

const wb=XLSX.utils.book_new();

XLSX.utils.book_append_sheet(wb,sheet,"Family");

XLSX.writeFile(wb,"Sadri-Shajra.xlsx");

};


renderTree();
