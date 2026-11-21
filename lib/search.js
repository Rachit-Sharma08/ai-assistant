const SERPAPI_URL = "https://serpapi.com/search.json";

// Top 5 Google results (India, Hindi-leaning). Throws on any failure —
// callers must catch and continue without search.
export async function searchWeb(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) throw new Error("serpapi_not_configured");

  const params = new URLSearchParams({
    engine: "google",
    q: query,
    hl: "hi",
    gl: "in",
    num: "5",
    api_key: apiKey,
  });

  const response = await fetch(`${SERPAPI_URL}?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`serpapi_http_${response.status}`);

  const data = await response.json();
  return (Array.isArray(data?.organic_results) ? data.organic_results : [])
    .slice(0, 5)
    .map((result) => ({
      title: result?.title ?? "",
      link: result?.link ?? "",
      snippet: result?.snippet ?? "",
    }))
    .filter((result) => result.link);
}
