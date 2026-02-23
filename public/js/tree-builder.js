import { collection, getDocs } 
from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { db } from "./firebase.js";
// =======================================
// 🎨 MODE TOGGLE (Classic / Modern)
// =======================================

window.setMode = function(mode) {

  const svg = document.getElementById("treeSvg");
  if (!svg) return;

  svg.setAttribute("data-mode", mode);

  if(mode === "modern") {
    svg.setAttribute("data-modern", "true");
  } else {
    svg.removeAttribute("data-modern");
  }

  renderTree(); // 🔥 THIS WAS MISSING
};


// =======================================
// 🌳 RENDER SVG TREE
// =======================================

async function renderTree() {

  const snapshot = await getDocs(collection(db, "family_members"));
  const members = [];

  snapshot.forEach(doc => {
    members.push({ id: doc.id, ...doc.data() });
  });

  // Build tree structure
  const map = {};
  members.forEach(m => {
    map[m.id] = { ...m, children: [] };
  });

  let root = null;

  members.forEach(m => {
    if (m.fatherId && map[m.fatherId]) {
      map[m.fatherId].children.push(map[m.id]);
    } else {
      root = map[m.id];
    }
  });

  if (!root) {
    console.error("Root not found");
    return;
  }

  const boxWidth = 150;
  const boxHeight = 60;
  const siblingGap = 40;
  const levelGap = 120;

  // -------- Measure Subtree Width --------
  function measure(node) {

    if (!node.children || node.children.length === 0) {
      node.subtreeWidth = boxWidth;
      return boxWidth;
    }

    let total = 0;

    node.children.forEach(child => {
      total += measure(child);
    });

    total += siblingGap * (node.children.length - 1);

    node.subtreeWidth = Math.max(total, boxWidth);

    return node.subtreeWidth;
  }

  // -------- Assign X Y Positions --------
  function assign(node, centerX, y) {

    node.x = centerX - boxWidth / 2;
    node.y = y;

    if (!node.children || node.children.length === 0) return;

    let startX = centerX - node.subtreeWidth / 2;

    node.children.forEach(child => {

      const childCenter =
        startX + child.subtreeWidth / 2;

      assign(child, childCenter, y + levelGap);

      startX += child.subtreeWidth + siblingGap;
    });
  }

  measure(root);
  assign(root, root.subtreeWidth / 2 + 100, 80);

  drawSVG(root);
}


// =======================================
// 🖌 DRAW SVG
// =======================================

function drawSVG(root) {

  const svg = document.getElementById("treeSvg");
  svg.innerHTML = "";
  // 🔺 Arrow Marker Definition
const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
marker.setAttribute("id", "arrow");
marker.setAttribute("markerWidth", "10");
marker.setAttribute("markerHeight", "10");
marker.setAttribute("refX", "6");
marker.setAttribute("refY", "3");
marker.setAttribute("orient", "auto");
marker.setAttribute("markerUnits", "strokeWidth");

const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
path.setAttribute("d", "M0,0 L0,6 L8,3 z");
path.setAttribute("fill", "#333");

marker.appendChild(path);
defs.appendChild(marker);
svg.appendChild(defs);

  function calculateHeight(node) {

    let max = node.y + 200;

    if (node.children) {
      node.children.forEach(child => {
        max = Math.max(max, calculateHeight(child));
      });
    }

    return max;
  }

  const totalHeight = calculateHeight(root);

  svg.setAttribute("width", root.subtreeWidth + 200);
  svg.setAttribute("height", totalHeight + 100);

function draw(node) {

  const parentCenterX = node.x + 75;
  const parentBottomY = node.y + 60;

  // ===== CONNECTORS (PDF STYLE) =====
  if (node.children && node.children.length > 0) {

    const connectorY = parentBottomY + 25;

    // 1️⃣ Vertical from parent
    const vLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    vLine.setAttribute("x1", parentCenterX);
    vLine.setAttribute("y1", parentBottomY);
    vLine.setAttribute("x2", parentCenterX);
    vLine.setAttribute("y2", connectorY);
    vLine.setAttribute("class", "connector");
    svg.appendChild(vLine);

    let childCenters = node.children.map(child => child.x + 75);

    const minX = Math.min(...childCenters);
    const maxX = Math.max(...childCenters);

    // 2️⃣ Horizontal line
    const hLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    hLine.setAttribute("x1", minX);
    hLine.setAttribute("y1", connectorY);
    hLine.setAttribute("x2", maxX);
    hLine.setAttribute("y2", connectorY);
    hLine.setAttribute("class", "connector");
    svg.appendChild(hLine);

    // 3️⃣ Vertical to children + arrow
    node.children.forEach(child => {

      const childCenterX = child.x + 75;
      const childTopY = child.y;

      const childLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      childLine.setAttribute("x1", childCenterX);
      childLine.setAttribute("y1", connectorY);
      childLine.setAttribute("x2", childCenterX);
      childLine.setAttribute("y2", childTopY);
      childLine.setAttribute("class", "connector");
      childLine.setAttribute("marker-end", "url(#arrow)");
      svg.appendChild(childLine);

      draw(child);
    });
  }

  // ===== NODE BOX =====
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

  rect.setAttribute("x", node.x);
  rect.setAttribute("y", node.y);
  rect.setAttribute("width", 150);
  rect.setAttribute("height", 60);
  rect.setAttribute("rx", 10);
  rect.setAttribute("class", "node-box");

  // 🎨 Generation Color Logic
  let color;

  switch(node.generation) {
    case 1: color = "#fef3c7"; break;
    case 2: color = "#dbeafe"; break;
    case 3: color = "#dcfce7"; break;
    case 4: color = "#fce7f3"; break;
    case 5: color = "#ede9fe"; break;
    default: color = "#ffffff";
  }

  if(svg.getAttribute("data-modern") === "true") {
    rect.setAttribute("fill", "#eef2ff");
  } else {
    rect.setAttribute("fill", color);
  }

rect.style.cursor = "pointer";

rect.addEventListener("click", () => {
  openProfileModal(node);
});

rect.style.cursor = "pointer";

rect.addEventListener("click", () => {
  openProfileModal(node);
});

svg.appendChild(rect);
  // ===== TEXT =====
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");

  text.setAttribute("x", node.x + 75);
  text.setAttribute("y", node.y + 30);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("class", "node-text");

  text.textContent = node.name + " | Gen " + node.generation;

  svg.appendChild(text);
}
draw(root);
}

// =======================================
// 📄 VECTOR PDF EXPORT (UNCHANGED)
// =======================================

window.exportTreePDF = async function () {

  const { jsPDF } = window.jspdf;
  const snapshot = await getDocs(collection(db, "family_members"));

  const members = [];
  snapshot.forEach(doc => {
    members.push({ id: doc.id, ...doc.data() });
  });

  const map = {};
  members.forEach(m => {
    map[m.id] = { ...m, children: [] };
  });

  let root = null;

  members.forEach(m => {
    if (m.fatherId && map[m.fatherId]) {
      map[m.fatherId].children.push(map[m.id]);
    } else {
      root = map[m.id];
    }
  });

  if (!root) {
    console.error("Root not found");
    return;
  }

  const boxWidth = 65;
  const boxHeight = 20;
  const siblingGap = 20;
  const levelGap = 50;
  const margin = 30;

  let maxDepth = 0;

  function measure(node, depth = 0) {

    maxDepth = Math.max(maxDepth, depth);

    if (!node.children || node.children.length === 0) {
      node.subtreeWidth = boxWidth;
      return boxWidth;
    }

    let total = 0;

    node.children.forEach(child => {
      total += measure(child, depth + 1);
    });

    total += siblingGap * (node.children.length - 1);

    node.subtreeWidth = Math.max(total, boxWidth);

    return node.subtreeWidth;
  }

  measure(root);

  const totalWidth = root.subtreeWidth + margin * 2;
  const totalHeight = (maxDepth + 1) * levelGap + margin * 2;

  const pdf = new jsPDF({
    orientation: totalWidth > totalHeight ? "landscape" : "portrait",
    unit: "mm",
    format: [totalWidth, totalHeight]
  });

  pdf.setFontSize(9);

  function draw(node, centerX, topY) {

    const x = centerX - boxWidth / 2;
    const y = topY;

    pdf.rect(x, y, boxWidth, boxHeight);

    const text = pdf.splitTextToSize(
      node.name + "\nGen " + node.generation,
      boxWidth - 6
    );

    pdf.text(text, x + 3, y + 7);

    if (!node.children || node.children.length === 0)
      return;

    const connectorY = y + boxHeight + 10;
    const childrenY = y + levelGap;

    let startX = centerX - node.subtreeWidth / 2;

    let childCenters = [];

    node.children.forEach(child => {
      const childCenterX = startX + child.subtreeWidth / 2;
      childCenters.push(childCenterX);
      startX += child.subtreeWidth + siblingGap;
    });

    pdf.line(centerX, y + boxHeight, centerX, connectorY);

    const minX = Math.min(...childCenters);
    const maxX = Math.max(...childCenters);

    pdf.line(minX, connectorY, maxX, connectorY);

    node.children.forEach((child, index) => {
      const childCenterX = childCenters[index];
      pdf.line(childCenterX, connectorY, childCenterX, childrenY);
      draw(child, childCenterX, childrenY);
    });
  }

  draw(root, totalWidth / 2, margin);

  pdf.save("Sadri-Digital-Shajra-Full-Blueprint.pdf");
};


// =======================================
// 📊 EXCEL EXPORT
// =======================================

window.exportExcel = async function () {

  const snapshot = await getDocs(collection(db, "family_members"));
  const data = [];

  snapshot.forEach(docSnap => {
    const m = docSnap.data();

    data.push({
      "Full Name": m.name || "",
      "Surname": m.surname || "",
      "Generation": m.generation || "",
      "Father ID": m.fatherId || "Root",
      "Alive Status": m.isAlive ? "Yes" : "No"
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet["!cols"] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 12 },
    { wch: 20 },
    { wch: 15 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sadri Family");

  XLSX.writeFile(workbook, "Digital-Shajra-Sadri.xlsx");
};


renderTree();
// ===============================
// PROFILE MODAL FUNCTIONS
// ===============================

// ===============================
// OPEN PROFILE MODAL
// ===============================

window.openProfileModal = function(node) {

  // Basic Info (same as node)
  document.getElementById("modalName").textContent = node.name;
  document.getElementById("modalGeneration").textContent = node.generation;

  // Date of Birth
  document.getElementById("modalDob").textContent = node.dob || "N/A";

  // Father Name
  let fatherName = "Root";
  if (node.fatherId && node.fatherName) {
    fatherName = node.fatherName;
  }
  document.getElementById("modalFather").textContent = fatherName;

  // Children
  const children = node.children || [];
  document.getElementById("modalChildrenCount").textContent = children.length;

  const container = document.getElementById("modalChildrenList");
  container.innerHTML = "";

  children.forEach(child => {
    const box = document.createElement("div");
    box.className = "child-box";
    box.textContent = child.name;
    container.appendChild(box);
  });

  document.getElementById("profileModal").style.display = "flex";
};

window.closeProfileModal = function() {
  document.getElementById("profileModal").style.display = "none";
};

// CLICK OUTSIDE TO CLOSE
document.addEventListener("click", function(e) {
  const modal = document.getElementById("profileModal");
  if (e.target === modal) {
    closeProfileModal();
  }
});
