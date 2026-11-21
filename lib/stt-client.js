// Shared client for /api/stt: upload a recorded blob, get transcript text.

export const STT_ERROR_MESSAGES = {
  no_speech: "Kuch sunai nahi diya — dobara try karo.",
  rate_limited: "Free limit abhi full hai. 30-60 second baad dobara try karo.",
  too_big: "Recording bahut lambi thi — max 2 minute ki recording chalti hai.",
  stt_failed: "Transcription fail ho gaya. Network check karke dobara try karo.",
  bad_request: "Recording bhejne me dikkat aa gayi — dobara try karo.",
  permission_denied: "Mic ki permission chahiye — browser settings me allow karo.",
  no_recorder: "Is browser me recording available nahi hai.",
  cancelled: "",
};

export async function transcribeBlob(blob) {
  const form = new FormData();
  const extension = String(blob.type || "").includes("mp4") ? "mp4" : "webm";
  form.append("audio", blob, `recording.${extension}`);

  let response;
  try {
    response = await fetch("/api/stt", { method: "POST", body: form });
  } catch {
    throw new Error("stt_failed");
  }

  if (!response.ok) {
    let code = "stt_failed";
    try {
      const failure = await response.json();
      if (failure?.error) code = failure.error;
    } catch {
      // keep default
    }
    throw new Error(code);
  }

  const data = await response.json();
  return String(data?.text || "").trim();
}
