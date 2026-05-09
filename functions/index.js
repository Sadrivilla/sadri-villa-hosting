const functions = require("firebase-functions");
const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

const BOT_AGENTS = [
  "googlebot",
  "google-inspectiontool",
  "bingbot",
  "twitterbot",
  "facebookexternalhit",
  "linkedinbot",
  "slackbot",
  "whatsapp"
];

const RENDERTRON_URL =
  "https://rendertron-rd0g.onrender.com/render/";

// Serve static files properly
app.use(express.static(
  path.join(__dirname, "../public")
));

app.use(async (req, res) => {

  const userAgent =
    req.headers["user-agent"]?.toLowerCase() || "";

  const isBot = BOT_AGENTS.some(bot =>
    userAgent.includes(bot)
  );

  // ONLY for team pages
  if (isBot && req.originalUrl.startsWith("/team/")) {

    try {

      const fullUrl =
        "https://sadrivilla.in" + req.originalUrl;

      const renderUrl =
        RENDERTRON_URL + fullUrl;

      const response = await axios.get(renderUrl, {
        timeout: 15000
      });

      res.send(response.data);

    } catch (e) {

      console.error(e);

      res.status(500).send("Rendertron Error");

    }

} else {

  // Team page → member.html
  if (req.originalUrl.startsWith("/team/")) {

    res.sendFile(
      path.join(__dirname, "../public/member.html")
    );

  } else {

    // Other pages/files
    res.sendFile(
      path.join(__dirname, "../public/index.html")
    );

  }

}

});

exports.app = functions.https.onRequest(app);
exports.generateMemberPage = functions
  .runWith({
    secrets: ["GITHUB_TOKEN"]
  })
  .https.onCall(async (data, context) => {
    return {
      success: true,
      message: "Cloud Function is connected successfully."
    };
  });
