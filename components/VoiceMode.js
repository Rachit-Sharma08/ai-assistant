"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STT_ERROR_MESSAGES, transcribeBlob } from "../lib/stt-client.js";
import { recorderSupported, startRecording } from "../lib/recorder.js";
import { speechQueue } from "../lib/speech-queue.js";
import { IconX } from "./icons.js";

const SILENCE_MS = 1500; // auto-stop after this much silence (once speech heard)
const SPEECH_THRESHOLD = 0.015; // RMS in the analyser time-domain data
const MAX_RECORD_MS = 120000;
const NO_SPEECH_GIVE_UP_MS = 45000;
const POLL_MS = 200;

const PHASE_TEXT = {
  listening: "Sun raha hu...",
  processing: "Sun ke likh raha hu...",
  thinking: "Soch raha hu...",
  speaking: "Bol raha hu...",
};

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

function formatElapsed(ms) {
  const total = Math.floor(ms / 1000);
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

// Full-screen hands-free loop: listen (silence auto-stop) → STT → send →
// speak the streamed reply → listen again. Orb tap interrupts; X exits.
export default function VoiceMode({
  open,
  onClose,
  onSend,
  isStreaming,
  onInterrupt,
}) {
  const [phase, setPhase] = useState("listening");
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const tokenRef = useRef(null);
  const recorderRef = useRef(null);
  const audioCtxRef = useRef(null);
  const streamingRef = useRef(isStreaming);
  const onSendRef = useRef(onSend);
  const onInterruptRef = useRef(onInterrupt);

  useEffect(() => {
    streamingRef.current = isStreaming;
  }, [isStreaming]);
  useEffect(() => {
    onSendRef.current = onSend;
  }, [onSend]);
  useEffect(() => {
    onInterruptRef.current = onInterrupt;
  }, [onInterrupt]);

  const stopRecorder = useCallback(() => {
    try {
      recorderRef.current?.cancel();
    } catch {
      // already stopped
    }
    recorderRef.current = null;
  }, []);

  const closeAudio = useCallback(() => {
    try {
      void audioCtxRef.current?.close();
    } catch {
      // already closed
    }
    audioCtxRef.current = null;
  }, []);

  // Mic permission denied / recorder missing → friendly error screen.
  const failWith = useCallback((code) => {
    setError(STT_ERROR_MESSAGES[code] || STT_ERROR_MESSAGES.stt_failed);
    setPhase("error");
  }, []);

  // One listen cycle: record until silence (after speech), then transcribe.
  // Returns transcript text, null for "no speech", throws on real errors.
  const listenOnce = useCallback(async (token) => {
    let handle;
    try {
      handle = await startRecording({
        maxMs: MAX_RECORD_MS,
        onTick: (ms) => setElapsed(ms),
      });
    } catch (raw) {
      const code = raw?.message || String(raw || "recording_failed");
      if (code === "cancelled") throw code;
      throw code === "permission_denied" || code === "no_recorder"
        ? code
        : "recording_failed";
    }
    recorderRef.current = handle;
    // Manual close/cancel rejects `done` before stop() is awaited — attach a
    // handler now so it never surfaces as an unhandled rejection.
    handle.done.catch(() => {});
    setPhase("listening");
    setElapsed(0);

    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextCtor();
      audioCtxRef.current = context;
      const source = context.createMediaStreamSource(handle.stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);

      const startedAt = Date.now();
      let heardSpeech = false;
      let lastLoud = Date.now();

      await new Promise((resolve) => {
        const interval = window.setInterval(() => {
          if (!token.active) {
            window.clearInterval(interval);
            resolve();
            return;
          }
          analyser.getFloatTimeDomainData(samples);
          let sum = 0;
          for (const value of samples) sum += value * value;
          const rms = Math.sqrt(sum / samples.length);
          const now = Date.now();
          if (rms > SPEECH_THRESHOLD) {
            heardSpeech = true;
            lastLoud = now;
          }
          const speechTimedOut =
            !heardSpeech && now - startedAt > NO_SPEECH_GIVE_UP_MS;
          if (
            (heardSpeech && now - lastLoud > SILENCE_MS) ||
            speechTimedOut ||
            now - startedAt > MAX_RECORD_MS
          ) {
            window.clearInterval(interval);
            resolve();
          }
        }, 100);
      });
    } finally {
      closeAudio();
    }

    if (!token.active) throw new Error("cancelled");
    setPhase("processing");

    const { blob } = await handle.stop();
    recorderRef.current = null;
    if (!token.active) throw new Error("cancelled");

    const text = await transcribeBlob(blob);
    return text || null;
  }, [closeAudio]);

  // Wait until the streamed reply finishes and the TTS queue drains.
  const waitWhileBusy = useCallback(async (token, sendPromise) => {
    const settled = { done: false };
    Promise.resolve(sendPromise)
      .catch(() => {})
      .then(() => {
        settled.done = true;
      });

    while (token.active && !settled.done) {
      setPhase(speechQueue.active() ? "speaking" : "thinking");
      await sleep(POLL_MS);
    }
    await Promise.resolve(sendPromise).catch(() => {});
    while (token.active && !token.interrupted && speechQueue.active()) {
      setPhase("speaking");
      await sleep(POLL_MS);
    }
    token.interrupted = false;
  }, []);

  const runLoop = useCallback(
    async (token) => {
      while (token.active) {
        token.interrupted = false;
        setPhase("listening");
        setElapsed(0);
        setError(null);

        let transcript = null;
        try {
          transcript = await listenOnce(token);
        } catch (raw) {
          const code = raw?.message || String(raw || "recording_failed");
          if (!token.active) return;
          if (code === "cancelled") continue;
          failWith(code);
          return;
        }
        if (!token.active) return;
        if (!transcript) {
          // Nothing understood — say so and listen again.
          setError(STT_ERROR_MESSAGES.no_speech);
          continue;
        }

        setError(null);
        setPhase("thinking");
        await waitWhileBusy(token, onSendRef.current?.(transcript));
        if (!token.active) return;
      }
    },
    [failWith, listenOnce, waitWhileBusy],
  );

  // Open → start the loop; close/unmount → stop everything.
  useEffect(() => {
    if (!open) return undefined;
    if (!recorderSupported()) {
      failWith("no_recorder");
      return undefined;
    }
    const token = { active: true, interrupted: false };
    tokenRef.current = token;
    void runLoop(token);
    return () => {
      token.active = false;
      tokenRef.current = null;
      stopRecorder();
      closeAudio();
      speechQueue.clear();
    };
  }, [open, runLoop, failWith, stopRecorder, closeAudio]);

  if (!open) return null;

  const handleOrbTap = () => {
    const token = tokenRef.current;
    if (!token || phase === "listening" || phase === "error") return;
    token.interrupted = true;
    onInterruptRef.current?.();
  };

  const handleRetry = () => {
    const token = tokenRef.current;
    if (!token) return;
    setError(null);
    setPhase("listening");
    void runLoop(token);
  };

  const listening = phase === "listening" && !error;

  return (
    <div
      data-testid="voice-mode"
      className="fixed inset-0 z-[80] flex flex-col bg-[var(--bg)] text-[var(--text)]"
      role="dialog"
      aria-modal="true"
      aria-label="Voice mode"
    >
      <div className="flex justify-end p-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Voice mode band karo"
          className="rounded-full border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <IconX />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-24">
        <button
          type="button"
          onClick={handleOrbTap}
          aria-label={
            phase === "listening" ? "Bol raha hu" : "Ruk ke sunna shuru karo"
          }
          data-testid="voice-orb"
          className="relative flex h-44 w-44 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
        >
          <span
            aria-hidden="true"
            className={`absolute inset-0 rounded-full bg-[var(--accent)] opacity-25 ${
              listening ? "animate-ping" : "animate-pulse"
            }`}
          />
          <span
            aria-hidden="true"
            className={`absolute inset-6 rounded-full bg-[var(--accent)] opacity-60 ${
              phase === "speaking" ? "animate-pulse" : ""
            }`}
          />
          <span
            aria-hidden="true"
            className="relative h-16 w-16 rounded-full bg-[var(--accent)] shadow-lg"
          />
        </button>

        <div className="text-center" role="status" aria-live="polite">
          <p className="text-xl font-medium text-[var(--text)]" data-testid="voice-state">
            {error ? error : PHASE_TEXT[phase] || PHASE_TEXT.listening}
          </p>
          {listening ? (
            <p className="mt-2 font-mono text-sm text-[var(--text-muted)]" data-testid="voice-timer">
              {formatElapsed(elapsed)}
            </p>
          ) : null}
          {phase === "speaking" || phase === "thinking" ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Rukne ke liye orb tap karo
            </p>
          ) : null}
          {error ? (
            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              Dobara try karo
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
