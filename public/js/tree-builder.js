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
// 📄 FIXED VECTOR VERTICAL TREE (A3 LANDSCAPE)
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

  // A3 LANDSCAPE
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a3"
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const levelSpacing = 45;
  const siblingSpacing = 20;
  const padding = 4;

  pdf.setFontSize(9);

  // 🔹 Dynamic box size based on text
  function getBoxSize(node) {
    const nameLines = pdf.splitTextToSize(node.name, 80);
    const genText = "Gen " + node.generation;
    const textHeight = (nameLines.length + 1) * 5;

    return {
      width: 80,
      height: textHeight + padding
    };
  }

  function measureWidth(node) {
    const box = getBoxSize(node);

    if (!node.children || node.children.length === 0)
      return box.width;

    let total = 0;
    node.children.forEach(child => {
      total += measureWidth(child) + siblingSpacing;
    });

    return total - siblingSpacing;
  }

  function drawNode(node, centerX, topY) {

    const box = getBoxSize(node);

    if (topY + box.height > pageHeight - 20) {
      pdf.addPage();
      topY = 20;
    }

    const x = centerX - box.width / 2;
    const y = topY;

    pdf.rect(x, y, box.width, box.height);

    const nameLines = pdf.splitTextToSize(node.name, box.width - 6);
    pdf.text(nameLines, x + 3, y + 6);

    pdf.text("Gen " + node.generation, x + 3, y + box.height - 4);

    if (!node.children || node.children.length === 0)
      return;

    const totalWidth = measureWidth(node);
    let startX = centerX - totalWidth / 2;

    const connectorY = y + box.height + 8;
    pdf.line(centerX, y + box.height, centerX, connectorY);

    node.children.forEach(child => {

      const childWidth = measureWidth(child);
      const childCenterX = startX + childWidth / 2;

      pdf.line(childCenterX, connectorY, centerX, connectorY);

      pdf.line(childCenterX, connectorY, childCenterX, topY + levelSpacing);

      drawNode(child, childCenterX, topY + levelSpacing);

      startX += childWidth + siblingSpacing;
    });
  }

  drawNode(root, pageWidth / 2, 25);

  pdf.save("Sadri-Digital-Shajra-A3-Vertical.pdf");
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
