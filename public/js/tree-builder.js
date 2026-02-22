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
