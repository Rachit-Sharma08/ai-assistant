import Groq from "groq-sdk";
import {
  DEFAULT_MODEL,
  FALLBACK_MODEL,
  SEARCH_SENTINEL,
  SOURCES_SENTINEL,
  SYSTEM_PROMPT,
} from "../../../lib/config.js";
import { searchWeb } from "../../../lib/search.js";

export const maxDuration = 60;

const MAX_MESSAGES = 8;
const MAX_MESSAGE_CHARACTERS = 8000;

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
  return statusOf(error) === 429
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

function boundedMessages(messages) {
  const recent = messages.slice(-MAX_MESSAGES).map(({ role, content }) => ({
    role,
    content,
  }));

  const totalCharacters = () =>
    recent.reduce((total, message) => total + message.content.length, 0);

  while (recent.length > 1 && totalCharacters() > MAX_MESSAGE_CHARACTERS) {
    recent.shift();
  }

  if (recent.length === 1 && recent[0].content.length > MAX_MESSAGE_CHARACTERS) {
    recent[0].content = recent[0].content.slice(-MAX_MESSAGE_CHARACTERS);
  }

  return recent;
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

  const isValid = body.messages.every(
    (message) =>
      message &&
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string",
  );

  if (!isValid) {
    return jsonError("server_error", 400);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return jsonError("server_error", 500);
  }

  const modelMessages = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nToday's date in Asia/Kolkata: ${todayInKolkata()}`,
    },
    ...boundedMessages(body.messages),
  ];
  const primaryModel = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const fallbackModel = process.env.GROQ_FALLBACK_MODEL || FALLBACK_MODEL;

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

  const encoder = new TextEncoder();
  let activeIterator = null;

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
