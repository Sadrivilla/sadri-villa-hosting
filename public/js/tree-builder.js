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

    if (node.children) {
      node.children.forEach(child => {

        const parentCenterX = node.x + 75;
        const parentBottomY = node.y + 60;

        const childCenterX = child.x + 75;
        const childTopY = child.y;

        const line = document.createElementNS(
          "http://www.w3.org/2000/svg", "line"
        );

        line.setAttribute("x1", parentCenterX);
        line.setAttribute("y1", parentBottomY);
        line.setAttribute("x2", childCenterX);
        line.setAttribute("y2", childTopY);
        line.setAttribute("class", "connector");

        svg.appendChild(line);

        draw(child);
      });
    }

    const rect = document.createElementNS(
      "http://www.w3.org/2000/svg", "rect"
    );

    rect.setAttribute("x", node.x);
    rect.setAttribute("y", node.y);
    rect.setAttribute("width", 150);
    rect.setAttribute("height", 60);
    rect.setAttribute("rx", 10);
    rect.setAttribute("class", "node-box");

    svg.appendChild(rect);

    const text = document.createElementNS(
      "http://www.w3.org/2000/svg", "text"
    );

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
