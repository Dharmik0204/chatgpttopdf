import { useMemo, useState } from "react";
import axios from "axios";
import { convertChatUrl, downloadConversationPdf } from "./api";
import { generatePdfFromConversation } from "./pdfFallback";

const INITIAL_PROGRESS = { step: "idle", percent: 0 };

function isValidChatgptShareUrl(rawUrl) {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    const validHost =
      parsed.hostname.endsWith("chatgpt.com") || parsed.hostname.endsWith("chat.openai.com");
    return validHost && parsed.pathname.includes("/share/");
  } catch (_error) {
    return false;
  }
}

function saveBlob(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}

async function extractAxiosErrorMessage(error, fallbackMessage) {
  if (!axios.isAxiosError(error)) {
    return fallbackMessage;
  }

  const payload = error.response?.data;
  if (!payload) {
    return fallbackMessage;
  }

  if (typeof payload === "string") {
    return payload || fallbackMessage;
  }

  if (payload instanceof Blob) {
    try {
      const text = await payload.text();
      const parsed = JSON.parse(text);
      return parsed?.error || text || fallbackMessage;
    } catch (_error) {
      return fallbackMessage;
    }
  }

  if (typeof payload === "object" && payload.error) {
    return payload.error;
  }

  return fallbackMessage;
}

export default function App() {
  const [url, setUrl] = useState("");
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(INITIAL_PROGRESS);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("light");

  const canConvert = useMemo(() => isValidChatgptShareUrl(url), [url]);

  async function handleConvert() {
    setError("");
    setConversation(null);
    setLoading(true);
    setProgress({ step: "Fetching conversation", percent: 30 });

    try {
      const data = await convertChatUrl(url.trim());
      setProgress({ step: "Formatting messages", percent: 80 });
      setConversation(data);
      setProgress({ step: "Completed", percent: 100 });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || "Failed to convert URL.");
      } else {
        setError("Unexpected error while converting.");
      }
      setProgress(INITIAL_PROGRESS);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!conversation) return;
    setError("");
    setLoading(true);
    setProgress({ step: "Generating PDF", percent: 40 });

    try {
      const blob = await downloadConversationPdf(url.trim(), (p) => {
        setProgress({ step: "Downloading PDF", percent: p });
      });
      const baseTitle =
        (conversation.title || "chat-conversation")
          .replace(/[^\w\- ]/g, "")
          .trim()
          .replace(/\s+/g, "-")
          .toLowerCase() || "chat-conversation";
      saveBlob(blob, `${baseTitle}.pdf`);
      setProgress({ step: "Completed", percent: 100 });
    } catch (err) {
      try {
        const fallbackBlob = generatePdfFromConversation(conversation);
        const baseTitle =
          (conversation.title || "chat-conversation")
            .replace(/[^\w\- ]/g, "")
            .trim()
            .replace(/\s+/g, "-")
            .toLowerCase() || "chat-conversation";
        saveBlob(fallbackBlob, `${baseTitle}.pdf`);
        setError("Server PDF failed, downloaded using browser fallback PDF.");
        setProgress({ step: "Completed (fallback)", percent: 100 });
      } catch (_fallbackError) {
        const msg = await extractAxiosErrorMessage(err, "Failed to download PDF.");
        setError(msg);
        setProgress(INITIAL_PROGRESS);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
          <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Chat Link to PDF Converter</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Paste a public ChatGPT share link and export the chat as a clean PDF.
                </p>
              </div>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            </div>
          </header>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <label className="mb-2 block text-sm font-semibold">ChatGPT share URL</label>
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://chatgpt.com/share/..."
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-indigo-500 placeholder:text-slate-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
              />
              <button
                onClick={handleConvert}
                disabled={!canConvert || loading}
                className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Converting..." : "Convert"}
              </button>
            </div>
            {!canConvert && url && (
              <p className="mt-2 text-sm text-rose-500">
                Enter a valid public ChatGPT share URL containing `/share/`.
              </p>
            )}

            {loading && (
              <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/50">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{progress.step}</span>
                  <span>{progress.percent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-200 dark:bg-indigo-900">
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                {error}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Preview</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Review extracted messages before downloading.
                </p>
              </div>
              <button
                onClick={handleDownloadPdf}
                disabled={!conversation || loading}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Download PDF
              </button>
            </div>

            {!conversation && (
              <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No conversation preview yet.
              </p>
            )}

            {conversation && (
              <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
                <h3 className="text-base font-semibold">{conversation.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Extracted on {new Date(conversation.date).toLocaleString()}
                </p>
                {conversation.messages.map((message) => (
                  <article
                    key={message.id}
                    className={`max-w-[90%] rounded-2xl p-4 text-sm md:max-w-[75%] ${
                      message.role === "user"
                        ? "ml-auto bg-indigo-100 text-indigo-950 dark:bg-indigo-950 dark:text-indigo-100"
                        : "mr-auto bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                    }`}
                  >
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                      {message.role}
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
