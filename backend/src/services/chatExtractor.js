const axios = require("axios");
const cheerio = require("cheerio");
const { launchBrowser } = require("../puppeteerLaunch");

function normalizeText(rawText) {
  return String(rawText || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mapConversation(conversation) {
  if (!conversation?.mapping) {
    throw new Error("Conversation data not found in shared link.");
  }

  const mapping = conversation.mapping;
  const entries = Object.values(mapping)
    .map((item) => item?.message)
    .filter(Boolean)
    .map((message) => {
      const role = message.author?.role === "assistant" ? "assistant" : "user";
      const parts = message.content?.parts || [];
      const text = normalizeText(parts.join("\n"));
      return {
        id: message.id,
        role,
        text,
        createTime: message.create_time || 0,
      };
    })
    .filter((item) => item.text);

  entries.sort((a, b) => (a.createTime || 0) - (b.createTime || 0));

  if (!entries.length) {
    throw new Error("No chat messages found in this conversation.");
  }

  return {
    title: conversation.title || "ChatGPT Conversation",
    date: new Date().toISOString(),
    sourceUrl: conversation.share_url || "",
    messages: entries.map(({ id, role, text, createTime }) => ({
      id,
      role,
      text,
      createTime,
    })),
  };
}

function findConversationInObject(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (value.mapping && typeof value.mapping === "object") {
    return value;
  }

  for (const child of Object.values(value)) {
    const found = findConversationInObject(child);
    if (found) {
      return found;
    }
  }

  return null;
}

function extractFromKnownJsonScripts(html) {
  const $ = cheerio.load(html);
  const nextData = $("#__NEXT_DATA__").html();

  if (nextData) {
    const parsed = JSON.parse(nextData);
    const conversation = findConversationInObject(parsed);
    if (conversation) {
      return mapConversation(conversation);
    }
  }

  const scriptContents = $("script")
    .toArray()
    .map((script) => $(script).html() || "")
    .filter(Boolean);

  for (const content of scriptContents) {
    if (!content.includes("mapping")) {
      continue;
    }

    const jsonLikeMatches = content.match(/\{[\s\S]*\}/g) || [];
    for (const candidate of jsonLikeMatches) {
      try {
        const parsed = JSON.parse(candidate);
        const conversation = findConversationInObject(parsed);
        if (conversation) {
          return mapConversation(conversation);
        }
      } catch (_error) {
        continue;
      }
    }
  }

  throw new Error("Could not parse page metadata.");
}

function extractFromDom(html) {
  const $ = cheerio.load(html);
  const blocks = $("[data-message-author-role]").toArray();

  if (!blocks.length) {
    throw new Error("No chat messages found in rendered content.");
  }

  const messages = blocks
    .map((node, index) => {
      const roleAttr = ($(node).attr("data-message-author-role") || "").toLowerCase();
      const role = roleAttr === "assistant" ? "assistant" : "user";
      const text = normalizeText($(node).text());
      return {
        id: `dom-${index + 1}`,
        role,
        text,
        createTime: index + 1,
      };
    })
    .filter((item) => item.text);

  if (!messages.length) {
    throw new Error("Rendered messages are empty.");
  }

  const title = normalizeText($("title").first().text()) || "ChatGPT Conversation";
  return {
    title,
    date: new Date().toISOString(),
    sourceUrl: "",
    messages,
  };
}

async function fetchRenderedHtml(url) {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return await page.content();
  } finally {
    await browser.close();
  }
}

async function extractConversationFromUrl(url) {
  let html = "";

  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
    });
    html = response.data;
  } catch (_fetchError) {
    html = "";
  }

  if (html) {
    try {
      return extractFromKnownJsonScripts(html);
    } catch (_primaryError) {
      try {
        return extractFromDom(html);
      } catch (_secondaryError) {
        // fall through to rendered HTML fallback
      }
    }
  }

  const renderedHtml = await fetchRenderedHtml(url);
  try {
    return extractFromKnownJsonScripts(renderedHtml);
  } catch (_thirdError) {
    return extractFromDom(renderedHtml);
  }
}

module.exports = { extractConversationFromUrl };
