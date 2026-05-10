const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

exports.generateMemberPage = functions.https.onCall(async (request) => {
  const memberId = request.data.memberId;

  if (!memberId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "memberId is required"
    );
  }

  // Read member from Firestore
  const snap = await admin
    .firestore()
    .collection("team")
    .doc(memberId)
    .get();

  if (!snap.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Member not found"
    );
  }

  const member = snap.data();

  // Generate slug
  const slug = (member.slug || member.name || "member")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  const name = member.name || "Member";
  const role = member.role || "";

  // Primary image
let imageUrl = "https://sadrivilla.in/og-image.jpg";

if (Array.isArray(member.images) && member.images.length > 0) {
const firstImage = cleanImageUrl(member.images[0]);

if (firstImage) {
imageUrl = firstImage;
}
}


  // Full biography paragraphs
  let descriptionHtml = "";

  if (Array.isArray(member.descriptions)) {
    member.descriptions.forEach((item) => {
      let text = "";

      if (typeof item === "string") {
        text = item;
      } else if (item && item.text) {
        text = item.text;
      }

      if (text.trim()) {
        descriptionHtml += \n<div class="description-block">${text}</div>;
      }
    });
  }

  // Fallback description if no paragraphs
  if (!descriptionHtml) {
    descriptionHtml =
`\n<div class="description-block"><p>${
    escapeHtml(role || `${name} profile on Sadri Villa`)
  }</p></div>`;

  }

  // Social links and sameAs schema
  let socialHtml = "";
  const sameAs = [];

  const socialFields = [
    ["facebook", "Facebook"],
    ["instagram", "Instagram"],
    ["linkedin", "LinkedIn"],
    ["twitter", "Twitter"],
    ["youtube", "YouTube"]
  ];

socialFields.forEach(([field, label]) => {
let url = "";

if (field === "instagram") {
url = normalizeUrl(member[field], "https://instagram.com/");
} else if (field === "linkedin") {
url = normalizeUrl(member[field], "https://linkedin.com/in/");
} else {
url = normalizeUrl(member[field]);
}

if (url) {
socialHtml +=
`\n<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
sameAs.push(url);
}
});


  const pageTitle = `${name}${role ? ` | ${role}` : ""} | Sadri Villa`;

  const metaDescription =
    member.metaDescription ||
    role ||
    `${name} profile on Sadri Villa`;

  const pageUrl = `https://sadrivilla.in/team/${slug}.html`;

  // Structured data
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: name,
    jobTitle: role,
    description: metaDescription,
    url: pageUrl,
    image: imageUrl,
    sameAs: sameAs
  };

  // Advanced SEO HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>${escapeHtml(pageTitle)}</title>

  <meta name="description" content="${escapeHtml(metaDescription)}">
  <meta name="robots" content="index, follow, max-image-preview:large">

  <link rel="canonical" href="${pageUrl}">

  <!-- Open Graph -->
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(metaDescription)}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:site_name" content="Sadri Villa">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(metaDescription)}">
  <meta name="twitter:image" content="${imageUrl}">

  <!-- Structured Data -->
  <script type="application/ld+json">${JSON.stringify(schema)}</script>

  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.8;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 30px;
    }

    .profile-image {
      width: 220px;
      max-width: 100%;
      border-radius: 16px;
      margin-bottom: 20px;
    }

    h1 {
      font-size: 42px;
      margin-bottom: 10px;
    }

    h2 {
      font-size: 24px;
      color: #475569;
      margin-bottom: 25px;
      font-weight: 400;
    }

    p {
      margin-bottom: 18px;
    }

    .social {
      margin-top: 30px;
      margin-bottom: 30px;
    }

    .social a {
      margin-right: 15px;
      text-decoration: none;
      font-weight: 600;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <article class="container">

    <img
      class="profile-image"
      src="${imageUrl}"
      alt="${escapeHtml(name)}"
      loading="eager"
    >

    <h1>${escapeHtml(name)}</h1>

    <h2>${escapeHtml(role)}</h2>

    ${descriptionHtml}

    <div class="social">
      ${socialHtml}
    </div>

  </article>
</body>
</html>`;

  // GitHub repository details
  const owner = "Sadrivilla";
  const repo = "sadri-villa-hosting";
  const branch = "main";

  const filePath = `public/team/${slug}.html`;

  // IMPORTANT: Replace with your current GitHub token if needed.
 const token = "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";

  if (!token || token === "PASTE_YOUR_GITHUB_TOKEN_HERE") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "GitHub token not configured"
    );
  }

  const apiUrl =
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  // Check if file already exists
  let sha;

  try {
    const existing = await axios.get(apiUrl, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json"
      },
      params: {
        ref: branch
      }
    });

    sha = existing.data.sha;
  } catch (error) {
    // File does not exist yet.
  }

  // Create or update file in GitHub
  await axios.put(
    apiUrl,
    {
      message: `Auto-generate team page: ${slug}`,
      content: Buffer.from(html).toString("base64"),
      branch,
      sha
    },
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  return {
    success: true,
    slug,
    filePath,
    url: pageUrl
  };
});

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
