# Chat Link to PDF Converter

Full-stack MERN-style JavaScript application that converts a public ChatGPT share link into:
- structured conversation preview in the UI
- professionally formatted downloadable PDF

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Axios
- Backend: Node.js, Express, Axios, Cheerio, jsPDF

## Folder Structure

```text
web23/
  backend/
    src/
      services/
        chatExtractor.js
        pdfService.js
      utils/
        validateUrl.js
    server.js
    .env.example
    package.json
  client/
    src/
      App.jsx
      api.js
      main.jsx
      index.css
    .env.example
    tailwind.config.js
    postcss.config.js
    vite.config.js
    package.json
  README.md
```

## API Structure

### `GET /api/health`
Health check endpoint.

Response:
```json
{
  "status": "ok",
  "service": "Chat Link to PDF Converter API"
}
```

### `POST /api/convert`
Extracts conversation from a public ChatGPT shared URL.

Request body:
```json
{
  "url": "https://chatgpt.com/share/..."
}
```

Response:
```json
{
  "title": "Conversation Title",
  "date": "2026-05-08T13:05:00.000Z",
  "sourceUrl": "https://chatgpt.com/share/...",
  "messages": [
    {
      "id": "message-id",
      "role": "user",
      "text": "Message text",
      "createTime": 1710000000
    }
  ]
}
```

### `POST /api/convert/pdf`
Builds and downloads PDF from the extracted conversation.

Request body:
```json
{
  "url": "https://chatgpt.com/share/..."
}
```

Response: `application/pdf` (download attachment)

## Installation Guide

## 1) Backend setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Runs API on `http://localhost:5000`.

## 2) Frontend setup

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Runs app on `http://localhost:5173`.

## Features Implemented

- ChatGPT share URL validation (`/share/` + valid host)
- Error handling for invalid/unreadable/private links
- Conversion progress indicators in UI
- Conversation preview with user/assistant chat bubbles
- PDF generation with:
  - title
  - generation date
  - chat-bubble style sections
  - clean typography
  - page numbers
- Light/dark mode toggle
- Mobile responsive layout
