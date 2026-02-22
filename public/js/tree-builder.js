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
// 📄 PROFESSIONAL VERTICAL TREE (25 SIBLINGS SAFE)
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

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a3"
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const boxWidth = 65;
  const boxHeight = 20;
  const levelGap = 50;
  const siblingGap = 20;

  pdf.setFontSize(9);

  // -------- Measure Subtree Width Properly --------
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

  // -------- Draw Tree Centered --------
  function draw(node, centerX, topY) {

    const x = centerX - boxWidth / 2;
    const y = topY;

    // Draw box
    pdf.rect(x, y, boxWidth, boxHeight);

    const text = pdf.splitTextToSize(
      node.name + "\nGen " + node.generation,
      boxWidth - 6
    );

    pdf.text(text, x + 3, y + 7);

    if (!node.children || node.children.length === 0)
      return;

    const childrenY = y + levelGap;

    let startX = centerX - node.subtreeWidth / 2;

    // Draw vertical line down from parent
    pdf.line(
      centerX,
      y + boxHeight,
      centerX,
      y + boxHeight + 10
    );

    const connectorY = y + boxHeight + 10;

    node.children.forEach(child => {

      const childCenterX =
        startX + child.subtreeWidth / 2;

      // Horizontal connector
      pdf.line(
        childCenterX,
        connectorY,
        centerX,
        connectorY
      );

      // Vertical down to child
      pdf.line(
        childCenterX,
        connectorY,
        childCenterX,
        childrenY
      );

      draw(child, childCenterX, childrenY);

      startX += child.subtreeWidth + siblingGap;
    });
  }

  measure(root);
  draw(root, pageWidth / 2, 25);

  pdf.save("Sadri-Digital-Shajra-Proper-Alignment.pdf");
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
