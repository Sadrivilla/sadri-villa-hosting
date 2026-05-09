const functions = require("firebase-functions");

  ${imageHtml}
</div>
</body>
</html>`;

    // ========================================================
    // GitHub Repository Details
    // ========================================================
    const owner = "Sadrivilla";
    const repo = "sadri-villa-hosting";
    const branch = "main";

    const filePath = `public/team/${slug}.html`;

    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "GITHUB_TOKEN secret not found"
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
      url: `https://sadrivilla.in/team/${slug}.html`
    };
  });

// ============================================================
// Helper Function
// ============================================================
function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
