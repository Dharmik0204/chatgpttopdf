const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

// Puppeteer: default cache is ~/.cache/puppeteer on Render and may not match runtime.
// Install browsers into backend/.puppeteer-cache (postinstall) unless using system Chromium.
if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
  process.env.PUPPETEER_CACHE_DIR =
    process.env.PUPPETEER_CACHE_DIR || path.join(__dirname, ".puppeteer-cache");
}

const express = require("express");
const cors = require("cors");
const { validateSharedChatUrl } = require("./src/utils/validateUrl");
const { extractConversationFromUrl } = require("./src/services/chatExtractor");
const { buildConversationPdf } = require("./src/services/pdfService");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = [
        process.env.CLIENT_ORIGIN,
        "http://localhost:5173",
        "https://chatgpttopdf.vercel.app",
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Chat Link to PDF Converter API" });
});

app.post("/api/convert", async (req, res) => {
  const { url } = req.body || {};
  const validation = validateSharedChatUrl(url);

  if (!validation.isValid) {
    return res.status(400).json({ error: validation.message });
  }

  try {
    const data = await extractConversationFromUrl(url);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({
      error:
        error.message ||
        "Unable to convert this link. Ensure it is a public ChatGPT share URL.",
    });
  }
});

app.post("/api/convert/pdf", async (req, res) => {
  const { url } = req.body || {};
  const validation = validateSharedChatUrl(url);

  if (!validation.isValid) {
    return res.status(400).json({ error: validation.message });
  }

  try {
    const conversation = await extractConversationFromUrl(url);
    const pdfBuffer = await buildConversationPdf(conversation);
    const safeTitle = (conversation.title || "chat-link-conversation")
      .replace(/[^\w\- ]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeTitle || "chat-conversation"}.pdf"`
    );
    return res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    return res.status(500).json({
      error:
        error.message ||
        "PDF generation failed. Try again with another shared link.",
    });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
