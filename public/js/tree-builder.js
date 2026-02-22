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
// 📄 EXPORT TREE AS PDF
// =======================================

window.exportTreePDF = async function () {

  const { jsPDF } = window.jspdf;

  const tree = document.getElementById("tree");

  const canvas = await html2canvas(tree, {
    scale: 2
  });

  const imgData = canvas.toDataURL("image/png");

  // ✅ A3 Landscape size
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a3"
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);

  pdf.save("Digital-Shajra-A3.pdf");
};
// =======================================
// 📊 EXPORT EXCEL
// =======================================

window.exportExcel = async function () {

  const snapshot = await getDocs(collection(db, "family_members"));

  const data = [];

  snapshot.forEach(docSnap => {
    const m = docSnap.data();

    data.push({
      Name: m.name || "",
      Surname: m.surname || "",
      Generation: m.generation || "",
      FatherID: m.fatherId || "",
      Alive: m.isAlive ? "Yes" : "No"
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Family Members");

  XLSX.writeFile(workbook, "Digital-Shajra-Sadri.xlsx");
};
