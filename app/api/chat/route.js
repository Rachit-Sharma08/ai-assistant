import Groq from "groq-sdk";
import {
  DEFAULT_MODEL,
  DEFAULT_VISION_MODEL,
  FALLBACK_MODEL,
  IMAGE_PLACEHOLDER,
  MAX_REQUEST_IMAGES,
  SEARCH_SENTINEL,
  SOURCES_SENTINEL,
  SYSTEM_PROMPT,
  VOICE_MODE_HINT,
} from "../../../lib/config.js";
import { searchWeb } from "../../../lib/search.js";

export const maxDuration = 60;

const MAX_MESSAGES = 8;
const MAX_MESSAGE_CHARACTERS = 8000;
// Vercel JSON body limit is 4.5 MB — reject anything bigger with a clean 413.
const MAX_PAYLOAD_CHARACTERS = 4_000_000;

const WEB_SEARCH_TOOL = {
  type: "function",
  function: {
    name: "web_search",
    description:
      "Search the live web for current or recent information: news, prices, trends, scores, weather, anything time-sensitive. Use whenever answering needs up-to-date facts.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Short web search query",
        },
      },
      required: ["query"],
    },
  },
};

function jsonError(error, status) {
  return Response.json({ error }, { status });
}

function statusOf(error) {
  return error?.status ?? error?.statusCode ?? error?.response?.status;
}

function canRetryWithFallback(error) {
  const status = statusOf(error);
  const errorText = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return (
    status === 429 ||
    status === 413 ||
    errorText.includes("model") ||
    errorText.includes("decommissioned")
  );
}

function errorResponse(error) {
  const status = statusOf(error);
  if (status === 413) return jsonError("payload_too_large", 413);
  return status === 429
    ? jsonError("rate_limited", 429)
    : jsonError("server_error", 500);
}

function todayInKolkata() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

// Accepts plain-string content and OpenAI-style multimodal arrays.
// Returns { role, text, images: [dataUrl...] } or null when unusable.
function normalizeMessage(message) {
  if (
    !message ||
    (message.role !== "user" && message.role !== "assistant")
  ) {
    return null;
  }
  const content = message.content;
  if (typeof content === "string") {
    return { role: message.role, text: content, images: [] };
  }
  if (Array.isArray(content)) {
    let text = "";
    const images = [];
    for (const part of content) {
      if (part?.type === "text" && typeof part.text === "string") {
        text += text ? `\n${part.text}` : part.text;
      } else if (
        part?.type === "image_url" &&
        typeof part.image_url?.url === "string"
      ) {
        images.push(part.image_url.url);
      }
    }
    if (!text && images.length === 0) return null;
    return { role: message.role, text, images };
  }
  return null;
}

function withPlaceholder(text) {
  const base = String(text || "").trim();
  return base ? `${base}\n${IMAGE_PLACEHOLDER}` : IMAGE_PLACEHOLDER;
}

// Keep image data only for the newest image messages that fit the budget;
// everything older becomes a one-line placeholder text.
function trimImages(list) {
  let kept = 0;
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const message = list[index];
    if (message.images.length === 0) continue;
    if (kept + message.images.length <= MAX_REQUEST_IMAGES) {
      kept += message.images.length;
    } else {
      message.text = withPlaceholder(message.text);
      message.images = [];
    }
  }
  return list;
}

function boundedMessages(list) {
  const recent = trimImages(list.slice(-MAX_MESSAGES)).map((message) => ({
    ...message,
    text: message.text.slice(-MAX_MESSAGE_CHARACTERS),
  }));

  const totalCharacters = () =>
    recent.reduce((total, message) => total + message.text.length, 0);

  while (recent.length > 1 && totalCharacters() > MAX_MESSAGE_CHARACTERS) {
    recent.shift();
  }

  if (recent.length === 1 && recent[0].text.length > MAX_MESSAGE_CHARACTERS) {
    recent[0].text = recent[0].text.slice(-MAX_MESSAGE_CHARACTERS);
  }

  return recent;
}

// Text-only messages stay plain strings (fast path unchanged); messages with
// images become OpenAI-compatible multimodal content arrays.
function toApiContent(message) {
  if (message.images.length === 0) return message.text;
  const parts = [];
  parts.push({
    type: "text",
    text:
      message.text.trim() ||
      "Is image me kya hai? Simple Hinglish me samjhao.",
  });
  for (const url of message.images) {
    parts.push({ type: "image_url", image_url: { url } });
  }
  return parts;
}

const BASE_OPTIONS = {
  max_completion_tokens: 1500,
  temperature: 0.6,
  reasoning_effort: "low",
  include_reasoning: false,
};

// First call: non-streaming, with the web_search tool available.
async function callModelWithTools(apiKey, model, messages) {
  const client = new Groq({ apiKey, maxRetries: 0 });
  return client.chat.completions.create(
    {
      model,
      messages,
      ...BASE_OPTIONS,
      tools: [WEB_SEARCH_TOOL],
      tool_choice: "auto",
    },
    { maxRetries: 0 },
  );
}

// Final call: streaming, no tools (max 1 search round).
async function openModelStream(apiKey, model, messages) {
  const client = new Groq({ apiKey, maxRetries: 0 });
  const stream = await client.chat.completions.create(
    {
      model,
      messages,
      ...BASE_OPTIONS,
      stream: true,
    },
    { maxRetries: 0 },
  );

  const iterator = stream[Symbol.asyncIterator]();
  let firstContent = null;
  let done = false;

  while (!done && !firstContent) {
    const result = await iterator.next();
    done = result.done;
    if (
      !done &&
      typeof result.value?.choices?.[0]?.delta?.content === "string" &&
      result.value.choices[0].delta.content.length > 0
    ) {
      firstContent = result.value;
    }
  }

  return { iterator, firstContent, done };
}

// Pump an opened model stream into the response stream.
async function pipeStream(opened, controller, encoder) {
  const enqueueContent = (chunk) => {
    const content = chunk?.choices?.[0]?.delta?.content;
    if (typeof content === "string" && content.length > 0) {
      controller.enqueue(encoder.encode(content));
    }
  };

  try {
    if (opened.firstContent) enqueueContent(opened.firstContent);
    let done = opened.done;
    while (!done) {
      const next = await opened.iterator.next();
      done = next.done;
      if (!done) enqueueContent(next.value);
    }
    controller.close();
  } catch {
    controller.error(new Error("stream_failed"));
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("server_error", 400);
  }

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonError("server_error", 400);
  }

  const normalized = body.messages.map(normalizeMessage).filter(Boolean);
  if (normalized.length === 0) {
    return jsonError("server_error", 400);
  }

  const payloadCharacters = JSON.stringify(body.messages).length;
  if (payloadCharacters > MAX_PAYLOAD_CHARACTERS) {
    return jsonError("payload_too_large", 413);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return jsonError("server_error", 500);
  }

  const recent = boundedMessages(normalized);
  const hasImages = recent.some((message) => message.images.length > 0);
  const voiceMode = body.voice === true;

  const modelMessages = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nToday's date in Asia/Kolkata: ${todayInKolkata()}${
        voiceMode ? `\n\n${VOICE_MODE_HINT}` : ""
      }`,
    },
    ...recent.map((message) => ({
      role: message.role,
      content: toApiContent(message),
    })),
  ];
  const primaryModel = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const fallbackModel = process.env.GROQ_FALLBACK_MODEL || FALLBACK_MODEL;
  const visionModel = process.env.GROQ_VISION_MODEL || DEFAULT_VISION_MODEL;

  const encoder = new TextEncoder();
  let activeIterator = null;

  const streamResponse = (opened) =>
    new Response(
      new ReadableStream({
        async start(controller) {
          activeIterator = opened.iterator;
          await pipeStream(opened, controller, encoder);
        },
        cancel() {
          if (typeof activeIterator?.return === "function") {
            void activeIterator.return();
          }
        },
      }),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
      },
    );

  // Vision turn: stream straight from the vision model — no search round
  // (tool calling with images is the flaky path, skip it instead of failing).
  if (hasImages) {
    try {
      const opened = await openModelStream(apiKey, visionModel, modelMessages);
      return streamResponse(opened);
    } catch (error) {
      return errorResponse(error);
    }
  }

  // Non-streaming call with tools; errors keep the old status-code behavior.
  let completion;
  let usedModel = primaryModel;
  try {
    completion = await callModelWithTools(apiKey, primaryModel, modelMessages);
  } catch (primaryError) {
    if (!canRetryWithFallback(primaryError) || fallbackModel === primaryModel) {
      return errorResponse(primaryError);
    }

    try {
      completion = await callModelWithTools(apiKey, fallbackModel, modelMessages);
      usedModel = fallbackModel;
    } catch (fallbackError) {
      return errorResponse(fallbackError);
    }
  }

  const choice = completion?.choices?.[0];
  const toolCall = choice?.message?.tool_calls?.[0];
  const wantsSearch = toolCall?.function?.name === "web_search";

  const responseStream = new ReadableStream({
    async start(controller) {
      // No tool call → we already have the full answer; drip it out in chunks.
      if (!wantsSearch) {
        const content = choice?.message?.content ?? "";
        const CHUNK = 24;
        for (let index = 0; index < content.length; index += CHUNK) {
          controller.enqueue(encoder.encode(content.slice(index, index + CHUNK)));
        }
        controller.close();
        return;
      }

      // Tell the client a search is running, then do it.
      controller.enqueue(encoder.encode(SEARCH_SENTINEL));

      let query = "";
      try {
        query = JSON.parse(toolCall.function?.arguments || "{}")?.query?.trim() ?? "";
      } catch {
        query = "";
      }

      let toolContent;
      if (query) {
        try {
          const results = await searchWeb(query);
          // One JSON line of sources for the UI, before any answer text.
          const sources = results.map(({ title, link }) => ({ title, link }));
          controller.enqueue(
            encoder.encode(`${SOURCES_SENTINEL}${JSON.stringify(sources)}\n`),
          );
          toolContent = JSON.stringify({ results });
        } catch {
          toolContent = JSON.stringify({
            error: "search_failed",
            note: "Search abhi kaam nahi kar raha. Apni knowledge se jawab do aur clearly bolo ki live data nahi mila.",
          });
        }
      } else {
        toolContent = JSON.stringify({
          error: "search_failed",
          note: "Search abhi kaam nahi kar raha. Apni knowledge se jawab do aur clearly bolo ki live data nahi mila.",
        });
      }

      const finalMessages = [
        ...modelMessages,
        {
          role: "assistant",
          content: choice?.message?.content ?? null,
          // Echo only the call we answered, even if the model asked for more.
          tool_calls: [toolCall],
        },
        { role: "tool", tool_call_id: toolCall.id, content: toolContent },
      ];

      try {
        const opened = await openModelStream(apiKey, usedModel, finalMessages);
        activeIterator = opened.iterator;
        await pipeStream(opened, controller, encoder);
      } catch {
        controller.error(new Error("stream_failed"));
      }
    },
    cancel() {
      if (typeof activeIterator?.return === "function") {
        void activeIterator.return();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
