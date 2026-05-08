const puppeteer = require("puppeteer");

function escapeHtml(input) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildConversationHtml(conversation) {
  const safeTitle = escapeHtml(conversation.title || "ChatGPT Conversation");
  const generatedAt = escapeHtml(new Date(conversation.date || Date.now()).toLocaleString());
  const sourceUrl = escapeHtml(conversation.sourceUrl || "N/A");
  const messages = (conversation.messages || [])
    .map((message) => {
      const role = message.role === "assistant" ? "assistant" : "user";
      const roleLabel = role === "assistant" ? "Assistant" : "User";
      const safeText = escapeHtml(message.text || "");
      return `
        <article class="message-row ${role}">
          <div class="bubble">
            <div class="role">${roleLabel}</div>
            <div class="text">${safeText}</div>
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${safeTitle}</title>
        <style>
          @page {
            size: A4;
            margin: 28mm 14mm 20mm 14mm;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            line-height: 1.55;
            font-size: 12.5px;
          }
          .header {
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 12px;
            margin-bottom: 18px;
          }
          .title {
            font-size: 22px;
            margin: 0 0 6px;
            color: #0f172a;
          }
          .meta {
            margin: 0;
            color: #475569;
            font-size: 11px;
          }
          .chat {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .message-row {
            width: 100%;
            display: flex;
          }
          .message-row.assistant {
            justify-content: flex-start;
          }
          .message-row.user {
            justify-content: flex-end;
          }
          .bubble {
            max-width: 82%;
            border-radius: 14px;
            padding: 10px 12px;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .assistant .bubble {
            background: #f1f5f9;
            border: 1px solid #dbeafe;
          }
          .user .bubble {
            background: #e0e7ff;
            border: 1px solid #bfdbfe;
          }
          .role {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #475569;
            margin-bottom: 6px;
            font-weight: 700;
          }
          .text {
            white-space: pre-wrap;
            word-break: break-word;
            color: #0f172a;
          }
        </style>
      </head>
      <body>
        <header class="header">
          <h1 class="title">${safeTitle}</h1>
          <p class="meta">Generated: ${generatedAt}</p>
          <p class="meta">Source: ${sourceUrl}</p>
        </header>
        <main class="chat">${messages}</main>
      </body>
    </html>
  `;
}

async function buildConversationPdf(conversation) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(buildConversationHtml(conversation), { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: `<div></div>`,
      footerTemplate: `
        <div style="width:100%; font-size:10px; color:#64748b; text-align:center; padding:0 14mm;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
      margin: { top: "0", right: "0", bottom: "14mm", left: "0" },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = { buildConversationPdf };
