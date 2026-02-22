import { collection, getDocs } 
from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { db } from "./firebase.js";

async function buildTree() {

  const snapshot = await getDocs(collection(db, "family_members"));
  const members = [];

  snapshot.forEach(docSnap => {
    members.push({ id: docSnap.id, ...docSnap.data() });
  });

  const memberMap = {};

  // ✅ STEP 1: Create all nodes
  members.forEach(m => {

    memberMap[m.id] = {
      text: {
        name: m.name,
        title: (m.surname ? m.surname + " | " : "") + "Gen " + m.generation
      },
      HTMLclass: m.generation === 1 ? "root-node" : "normal-node",
      children: []
    };

  });

  let rootNode = null;

  // ✅ STEP 2: Link children to fathers
  members.forEach(m => {

    if (m.fatherId && memberMap[m.fatherId]) {
      memberMap[m.fatherId].children.push(memberMap[m.id]);
    } else {
      rootNode = memberMap[m.id];
    }

  });

  const chart_config = {
    chart: {
      container: "#tree"
    },
    nodeStructure: rootNode
  };

  new Treant(chart_config);
}

buildTree();


// =======================================
// 🔎 SEARCH BY NAME OR SURNAME
// =======================================

window.searchTree = function () {

  const value = document
    .getElementById("treeSearch")
    .value
    .toLowerCase()
    .trim();

  if (!value) return;

  const nodes = document.querySelectorAll(".node");

  let found = false;

  nodes.forEach(node => {

    node.classList.remove("highlight-node");

    const text = node.innerText.toLowerCase();

    if (text.includes(value)) {

      node.classList.add("highlight-node");

      node.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      found = true;
    }
  });

  if (!found) {
    alert("No member found.");
  }
};


// =======================================
// 🔁 RESET SEARCH
// =======================================

window.resetTreeSearch = function () {

  document.getElementById("treeSearch").value = "";

  document.querySelectorAll(".node")
    .forEach(node => node.classList.remove("highlight-node"));
};
// =======================================
// 📄 DYNAMIC LARGE PAGE VERTICAL TREE
// =======================================

window.exportTreePDF = async function () {

  const { jsPDF } = window.jspdf;
  const snapshot = await getDocs(collection(db, "family_members"));

  const members = [];
  snapshot.forEach(doc => {
    members.push({ id: doc.id, ...doc.data() });
  });

  // -------- Build Tree --------
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

  const boxWidth = 65;
  const boxHeight = 20;
  const siblingGap = 20;
  const levelGap = 50;
  const margin = 30;

  let maxDepth = 0;

  // -------- Measure Subtree Width --------
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

  // -------- Create CUSTOM SIZE PAGE --------
  const pdf = new jsPDF({
    orientation: totalWidth > totalHeight ? "landscape" : "portrait",
    unit: "mm",
    format: [totalWidth, totalHeight]
  });

  pdf.setFontSize(9);

  // -------- Draw Tree --------
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

    // Vertical from parent
    pdf.line(centerX, y + boxHeight, centerX, connectorY);

    // Long horizontal connector
    const minX = Math.min(...childCenters);
    const maxX = Math.max(...childCenters);

    pdf.line(minX, connectorY, maxX, connectorY);

    // Draw children
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
// 📊 EXPORT EXCEL (PROFESSIONAL)
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

  // Auto column width
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
