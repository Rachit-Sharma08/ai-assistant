import { DEFAULT_STT_MODEL, STT_PROMPT } from "../../../lib/config.js";

export const maxDuration = 60;

// Vercel serverless body limit is 4.5 MB — keep the upload safely under it.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const GROQ_TRANSCRIPTIONS_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";

function jsonError(error, status) {
  return Response.json({ error }, { status });
}

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonError("bad_request", 400);
  }

  const audio = form.get("audio");
  if (!audio || typeof audio === "string" || audio.size === 0) {
    return jsonError("bad_request", 400);
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return jsonError("too_big", 413);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return jsonError("stt_not_configured", 500);

  const outgoing = new FormData();
  outgoing.append("file", audio, audio.name || "recording.webm");
  outgoing.append("model", process.env.GROQ_STT_MODEL || DEFAULT_STT_MODEL);
  outgoing.append("prompt", STT_PROMPT);
  outgoing.append("temperature", "0");
  outgoing.append("response_format", "json");

  let response;
  try {
    response = await fetch(GROQ_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: outgoing,
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    return jsonError("stt_failed", 502);
  }

  if (!response.ok) {
    return response.status === 429
      ? jsonError("rate_limited", 429)
      : jsonError("stt_failed", 502);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return jsonError("stt_failed", 502);
  }

  const text = String(data?.text ?? "").trim();
  if (!text) return jsonError("no_speech", 422);

  return Response.json({ text });
}
