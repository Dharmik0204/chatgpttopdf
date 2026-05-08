import { jsPDF } from "jspdf";

function drawWrappedText(doc, text, x, y, width, lineHeight) {
  const lines = doc.splitTextToSize(text || "", width);
  lines.forEach((line, index) => {
    doc.text(line, x, y + index * lineHeight);
  });
  return Math.max(lines.length, 1) * lineHeight;
}

function addFooter(doc, pageNumber, width, height) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Page ${pageNumber}`, width / 2, height - 12, { align: "center" });
}

export function generatePdfFromConversation(conversation) {
  const doc = new jsPDF({
    orientation: "p",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const lineHeight = 15;
  let pageNumber = 1;
  let cursorY = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  doc.text(conversation.title || "ChatGPT Conversation", margin, cursorY);
  cursorY += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(110, 110, 110);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, cursorY);
  cursorY += 30;

  for (const message of conversation.messages || []) {
    const isUser = message.role === "user";
    const bubbleX = isUser ? pageWidth * 0.35 : margin;
    const bubbleWidth = isUser ? pageWidth * 0.55 - margin : pageWidth * 0.62;
    const textPadding = 12;
    const textWidth = bubbleWidth - textPadding * 2;
    const lines = doc.splitTextToSize(message.text || "", textWidth);
    const textHeight = Math.max(lines.length * lineHeight, 20);
    const bubbleHeight = textHeight + textPadding * 2 + 16;

    if (cursorY + bubbleHeight > pageHeight - 40) {
      addFooter(doc, pageNumber, pageWidth, pageHeight);
      doc.addPage();
      pageNumber += 1;
      cursorY = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(isUser ? "User" : "Assistant", bubbleX, cursorY);
    cursorY += 8;

    doc.setFillColor(isUser ? 232 : 245, isUser ? 240 : 248, isUser ? 255 : 255);
    doc.roundedRect(bubbleX, cursorY, bubbleWidth, bubbleHeight, 10, 10, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    drawWrappedText(doc, message.text || "", bubbleX + textPadding, cursorY + 20, textWidth, lineHeight);
    cursorY += bubbleHeight + 18;
  }

  addFooter(doc, pageNumber, pageWidth, pageHeight);
  return doc.output("blob");
}
