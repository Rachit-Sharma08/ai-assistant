// Microphone recording helpers shared by the composer mic and voice mode.

export function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4", // Safari
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return ""; // let the browser choose
}

export function recorderSupported() {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

// Starts a recording. Resolves with { blob } on stop(), rejects with
// "permission_denied" | "no_recorder" | "recording_failed".
// onTick(ms) fires every 250 ms; recording auto-stops at maxMs.
export async function startRecording({ maxMs = 120000, onTick } = {}) {
  if (!recorderSupported()) throw new Error("no_recorder");

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
      throw new Error("permission_denied");
    }
    throw new Error("recording_failed");
  }

  const mimeType = pickMimeType();
  const chunks = [];
  let recorder;
  try {
    recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
  } catch {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("recording_failed");
  }

  const startedAt = Date.now();
  let finished = false;
  let resolveStop;
  let rejectStop;
  const stopped = new Promise((resolve, reject) => {
    resolveStop = resolve;
    rejectStop = reject;
  });

  const timer = window.setInterval(() => {
    const elapsed = Date.now() - startedAt;
    onTick?.(elapsed);
    if (elapsed >= maxMs) void stop();
  }, 250);

  const cleanup = () => {
    window.clearInterval(timer);
    stream.getTracks().forEach((track) => track.stop());
  };

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };
  recorder.onerror = () => {
    if (finished) return;
    finished = true;
    cleanup();
    rejectStop(new Error("recording_failed"));
  };
  recorder.onstop = () => {
    if (finished) return;
    finished = true;
    cleanup();
    const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
    if (blob.size === 0) rejectStop(new Error("recording_failed"));
    else resolveStop({ blob, elapsedMs: Date.now() - startedAt });
  };

  async function stop() {
    if (finished) return stopped;
    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {
      finished = true;
      cleanup();
      rejectStop(new Error("recording_failed"));
    }
    return stopped;
  }

  function cancel() {
    if (finished) {
      cleanup();
      return;
    }
    finished = true;
    window.clearInterval(timer);
    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {
      // already stopped
    }
    stream.getTracks().forEach((track) => track.stop());
    chunks.length = 0;
    rejectStop(new Error("cancelled"));
  }

  recorder.start();
  onTick?.(0);
  return { stop, cancel, stream };
}

// Browser Web Speech API fallback (returns null when unavailable).
export function createSpeechRecognition({ lang = "hi-IN", onResult, onError } = {}) {
  const Recognition =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.lang = lang;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript ?? "";
    onResult?.(text.trim());
  };
  recognition.onerror = (event) => onError?.(event.error || "speech_failed");
  recognition.onend = () => {
    // no-op: callers treat onResult/onError as terminal
  };

  return {
    start() {
      try {
        recognition.start();
      } catch {
        onError?.("speech_failed");
      }
    },
    stop() {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    },
  };
}
