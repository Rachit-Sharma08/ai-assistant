// Client-side TTS pipeline: sentence detection on the streamed text +
// a strictly sequential audio queue (no overlap, clears on Stop/new message).

const MAX_CHARS = 500; // matches /api/tts limit

/* ---------- markdown → speakable text ---------- */

export function stripMarkdown(text) {
  return String(text ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images: drop
    .replace(/```[\s\S]*$/g, " ") // unterminated code fence at stream end
    .replace(/```/g, " ") // stray fences
    .replace(/\[([^\]]+)\]\(([^)]*)\)/g, "$1") // links: keep only the text
    .replace(/https?:\/\/\S+/g, " ") // bare URLs: drop
    .replace(/`([^`]*)`/g, "$1") // inline code: keep the content
    .replace(/^#{1,6}\s*/gm, "") // headings
    .replace(/^\s*>\s?/gm, "") // blockquotes
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/\*([^*]+)\*/g, "$1") // italic
    .replace(/^\s*\|.*\|\s*$/gm, " ") // table rows
    .replace(/\|/g, " ")
    .replace(/^\s*[-*+]\s+/gm, "") // list bullets
    .replace(/^\s*[-*_]{3,}\s*$/gm, " ") // horizontal rules
    .replace(/[*_`#~]/g, "") // stray markers
    .replace(/\s+/g, " ")
    .trim();
}

// Sentence terminators: . ? ! । followed by whitespace/end, or a newline.
// Lookahead keeps "3.5" and "Rs.500" from splitting mid-token.
const TERMINATOR = /[.?!।](?=\s|$)|\n+/g;

// Feed it the raw (unspoken) buffer; get back complete speakable sentences
// and the leftover buffer. Complete code blocks are removed entirely;
// an unterminated fence is held back until it closes.
export function extractSentences(buffer) {
  let work = String(buffer ?? "").replace(/```[\s\S]*?```/g, " ");
  let held = "";
  const fence = work.indexOf("```");
  if (fence !== -1) {
    held = work.slice(fence);
    work = work.slice(0, fence);
  }

  let last = -1;
  const re = new RegExp(TERMINATOR.source, "g");
  let match;
  while ((match = re.exec(work)) !== null) {
    last = match.index + match[0].length;
  }
  if (last === -1) return { sentences: [], rest: held + work };

  const ready = work.slice(0, last);
  const remain = work.slice(last);
  const sentences = ready
    .split(/[.?!।](?=\s|$)|\n+/g)
    .map((part) => stripMarkdown(part))
    .filter(Boolean);
  return { sentences, rest: held + remain };
}

// End of stream: whatever is left is one final sentence.
export function flushSentences(buffer) {
  const withBreak = String(buffer ?? "").endsWith("\n")
    ? String(buffer ?? "")
    : `${buffer ?? ""}\n`;
  const { sentences, rest } = extractSentences(withBreak);
  const tail = stripMarkdown(rest);
  return tail ? [...sentences, tail] : sentences;
}

/* ---------- sequential audio queue ---------- */

let queue = [];
let playing = false;
let generation = 0; // bumped by clear() so stale play chains exit quietly
let currentAudio = null;
let currentFetch = null;
let currentUrl = null;

async function speak(text, gen) {
  const controller = new AbortController();
  currentFetch = controller;

  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: controller.signal,
  });
  if (!response.ok) throw new Error("tts_failed");

  const blob = await response.blob();
  if (gen !== generation) return; // cleared while fetching

  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = URL.createObjectURL(blob);

  await new Promise((resolve) => {
    const audio = new Audio(currentUrl);
    currentAudio = audio;
    audio.onended = resolve;
    audio.onerror = resolve;
    audio.play().catch(() => resolve());
  });
}

async function runQueue() {
  if (playing) return;
  const item = queue.shift();
  if (item === undefined) return;

  const gen = generation;
  playing = true;
  try {
    await speak(item, gen);
  } catch {
    // Cartesia down / aborted — skip the sentence, chat carries on.
  } finally {
    if (gen !== generation) return; // cleared meanwhile; clear() owns the state
    playing = false;
    currentAudio = null;
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      currentUrl = null;
    }
    void runQueue();
  }
}

export const speechQueue = {
  enqueue(text) {
    const cleaned = String(text ?? "").trim();
    if (!cleaned) return;
    queue.push(cleaned.slice(0, MAX_CHARS));
    void runQueue();
  },
  clear() {
    generation += 1;
    queue = [];
    currentFetch?.abort();
    currentFetch = null;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      currentUrl = null;
    }
    playing = false;
  },
};
