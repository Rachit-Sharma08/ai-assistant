import {
  DEFAULT_CARTESIA_LANGUAGE,
  DEFAULT_CARTESIA_MODEL,
  DEFAULT_CARTESIA_VERSION,
} from "../../../lib/config.js";

export const maxDuration = 30;

const MAX_TEXT_CHARACTERS = 500;
const CARTESIA_BYTES_URL = "https://api.cartesia.ai/tts/bytes";

function jsonError(error, status) {
  return Response.json({ error }, { status });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad_request", 400);
  }

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return jsonError("bad_request", 400);
  if (text.length > MAX_TEXT_CHARACTERS) return jsonError("too_long", 400);

  const apiKey = process.env.CARTESIA_API_KEY;
  const voiceId = process.env.CARTESIA_VOICE_ID;
  if (!apiKey || !voiceId) return jsonError("tts_not_configured", 500);

  const language = process.env.CARTESIA_LANGUAGE || DEFAULT_CARTESIA_LANGUAGE;
  const payload = {
    model_id: process.env.CARTESIA_MODEL || DEFAULT_CARTESIA_MODEL,
    transcript: text,
    voice: voiceId,
    language,
    output_format: { container: "mp3", sample_rate: 44100, bit_rate: 128000 },
  };
  // Romanized Hinglish reads best with English-Indian normalizer (per Cartesia docs).
  if (language === "hi" || language === "hi-IN") {
    payload.normalization = "en-IN";
  }

  try {
    const cartesia = await fetch(CARTESIA_BYTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Cartesia-Version":
          process.env.CARTESIA_VERSION || DEFAULT_CARTESIA_VERSION,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!cartesia.ok) return jsonError("tts_failed", 502);

    const audio = await cartesia.arrayBuffer();
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch {
    return jsonError("tts_failed", 502);
  }
}
