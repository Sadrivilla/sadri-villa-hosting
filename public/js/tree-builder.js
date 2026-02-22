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
// 📄 VECTOR HORIZONTAL GENEALOGY PDF
// =======================================

window.exportTreePDF = async function () {

  const { jsPDF } = window.jspdf;
  const snapshot = await getDocs(collection(db, "family_members"));

  const members = [];
  snapshot.forEach(doc => {
    members.push({ id: doc.id, ...doc.data() });
  });

  // ---------- Build Tree Map ----------
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

  // ---------- Layout Settings ----------
  const boxWidth = 60;
  const boxHeight = 18;
  const horizontalSpacing = 90;
  const verticalSpacing = 28;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a3"
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  let currentPage = 1;

  // ---------- Recursive Layout ----------
  function drawNode(node, genIndex, yStart) {

    const x = genIndex * horizontalSpacing + 20;

    // If new generation exceeds page width → add new page
    if (x + boxWidth > pageWidth) {
      pdf.addPage();
      currentPage++;
    }

    let totalHeight = 0;

    // Calculate total children height
    node.children.forEach(child => {
      totalHeight += boxHeight + verticalSpacing;
    });

    if (totalHeight > 0)
      totalHeight -= verticalSpacing;

    let y = yStart;

    // If children exist, center father
    if (node.children.length > 0) {
      const childrenTop = yStart;
      const childrenBottom = yStart + totalHeight;
      y = (childrenTop + childrenBottom) / 2 - boxHeight / 2;
    }

    // Draw box
    pdf.rect(x, y, boxWidth, boxHeight);

    // Add name text
    pdf.setFontSize(8);
    pdf.text(
      node.name,
      x + 3,
      y + 6
    );

    pdf.text(
      "Gen " + node.generation,
      x + 3,
      y + 12
    );

    // Draw children recursively
    let childY = yStart;

    node.children.forEach(child => {

      const childCenterY = childY + boxHeight / 2;

      // Draw connecting line
      pdf.line(
        x + boxWidth,
        y + boxHeight / 2,
        x + boxWidth + 10,
        childCenterY
      );

      drawNode(child, genIndex + 1, childY);

      childY += boxHeight + verticalSpacing;
    });
  }

  // Start drawing from root
  drawNode(root, 0, 20);

  pdf.save("Sadri-Digital-Shajra-Vector.pdf");
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
