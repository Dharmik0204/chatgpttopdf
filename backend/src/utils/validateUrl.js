const VALID_HOSTS = ["chatgpt.com", "chat.openai.com"];

function validateSharedChatUrl(url) {
  if (!url || typeof url !== "string") {
    return { isValid: false, message: "ChatGPT share URL is required." };
  }

  try {
    const parsed = new URL(url);
    const isValidHost = VALID_HOSTS.some((host) => parsed.hostname.endsWith(host));
    const hasSharePath = parsed.pathname.includes("/share/");

    if (!isValidHost || !hasSharePath) {
      return {
        isValid: false,
        message:
          "Invalid link. Use a public ChatGPT share URL like https://chatgpt.com/share/...",
      };
    }

    return { isValid: true, message: "ok" };
  } catch (_error) {
    return { isValid: false, message: "Invalid URL format." };
  }
}

module.exports = { validateSharedChatUrl };
