import { collection, getDocs } 
from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { db } from "./firebase.js";

async function buildTree() {

  const snapshot = await getDocs(collection(db, "family_members"));
  const members = [];

  snapshot.forEach(doc => {
    members.push({ id: doc.id, ...doc.data() });
  });

  const memberMap = {};
  members.forEach(m => memberMap[m.id] = {
      text: { name: m.name },
      children: []
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
