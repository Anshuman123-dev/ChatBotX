const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export async function searchChat(messages) {
  const res = await fetch(`${API_BASE}/api/search-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    let errText = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) errText = data.detail;
    } catch (_) {}
    throw new Error(errText);
  }
  return res.json(); // { response, steps? }
}

export async function uploadRag(sessionId, files) {
  const fd = new FormData();
  fd.append("session_id", sessionId);
  for (let f of files) fd.append("files", f);
  const res = await fetch(`${API_BASE}/api/rag/upload`, {
    method: "POST",
    body: fd,
  });
  return res.json();
}

export async function queryRag(sessionId, question) {
  const res = await fetch(`${API_BASE}/api/rag/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, question }),
  });
  return res.json();
}

export async function summarizeUrl(url) {
  const res = await fetch(`${API_BASE}/api/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    let errText = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) errText = data.detail;
    } catch (_) {}
    throw new Error(errText);
  }
  return res.json();
}

// Database API functions
export async function createSession(sessionId, name) {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, name }),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  return res.json();
}

export async function getSessions() {
  const res = await fetch(`${API_BASE}/api/sessions`);
  if (!res.ok) throw new Error(`Failed to get sessions: ${res.status}`);
  return res.json();
}

export async function deleteSession(sessionId) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete session: ${res.status}`);
  return res.json();
}

export async function renameSession(sessionId, newName) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}?name=${encodeURIComponent(newName)}`, {
    method: "PUT",
  });
  if (!res.ok) throw new Error(`Failed to rename session: ${res.status}`);
  return res.json();
}

export async function saveMessage(sessionId, role, content, thinking = []) {
  const res = await fetch(`${API_BASE}/api/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, role, content, thinking }),
  });
  if (!res.ok) throw new Error(`Failed to save message: ${res.status}`);
  return res.json();
}

export async function getMessages(sessionId) {
  const res = await fetch(`${API_BASE}/api/messages/${sessionId}`);
  if (!res.ok) throw new Error(`Failed to get messages: ${res.status}`);
  return res.json();
}

export async function clearMessages(sessionId) {
  const res = await fetch(`${API_BASE}/api/messages/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to clear messages: ${res.status}`);
  return res.json();
}
