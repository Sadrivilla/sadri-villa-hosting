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

  const boxWidth = 70;
  const boxHeight = 20;
  const siblingSpacing = 10;
  const levelSpacing = 50;

  const maxPerRow = 5; // 👈 handles 25 siblings = 5 rows

  pdf.setFontSize(9);

  function drawBox(centerX, y, text) {
    const x = centerX - boxWidth / 2;

    pdf.rect(x, y, boxWidth, boxHeight);

    const lines = pdf.splitTextToSize(text, boxWidth - 6);
    pdf.text(lines, x + 3, y + 8);
  }

  function drawNode(node, centerX, y) {

    if (y + boxHeight > pageHeight - 20) {
      pdf.addPage();
      y = 20;
    }

    drawBox(centerX, y, node.name + "\nGen " + node.generation);

    if (!node.children || node.children.length === 0)
      return;

    const totalChildren = node.children.length;
    const rows = Math.ceil(totalChildren / maxPerRow);

    const startY = y + levelSpacing;

    let childIndex = 0;

    for (let r = 0; r < rows; r++) {

      const itemsInRow = Math.min(maxPerRow, totalChildren - childIndex);

      const rowWidth =
        itemsInRow * boxWidth +
        (itemsInRow - 1) * siblingSpacing;

      let startX = centerX - rowWidth / 2;

      for (let c = 0; c < itemsInRow; c++) {

        const child = node.children[childIndex];

        const childCenterX = startX + boxWidth / 2;

        // Connector
        pdf.line(
          centerX,
          y + boxHeight,
          childCenterX,
          startY - 10
        );

        drawNode(
          child,
          childCenterX,
          startY + r * (boxHeight + 20)
        );

        startX += boxWidth + siblingSpacing;
        childIndex++;
      }
    }
  }

  drawNode(root, pageWidth / 2, 25);

  pdf.save("Sadri-Digital-Shajra-A3-Professional.pdf");
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
