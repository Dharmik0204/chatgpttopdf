import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function convertChatUrl(url) {
  const response = await axios.post(`${API_BASE_URL}/api/convert`, { url });
  return response.data;
}

export async function downloadConversationPdf(url, onProgress) {
  const response = await axios.post(
    `${API_BASE_URL}/api/convert/pdf`,
    { url },
    {
      responseType: "blob",
      onDownloadProgress: (event) => {
        if (!event.total || !onProgress) {
          return;
        }
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(Math.min(Math.max(percent, 0), 100));
      },
    }
  );
  return response.data;
}
