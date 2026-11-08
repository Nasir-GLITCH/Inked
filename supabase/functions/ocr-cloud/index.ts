// ocr-cloud: transcribes the text in one image with Google's Gemini API.
//
// Why an edge function: the Gemini API key must never ship in the mobile app. The
// platform verifies the caller's JWT (verify_jwt = true), so only signed-in users can
// call this. The key lives in the project's function secrets (GEMINI_API_KEY).
//
// Request:  POST { imageBase64: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp' }
// Response: 200 { text, model, durationMs } or { error: <code> } with a matching status.
//
// NOTE: this is an evaluation endpoint. There is no per-user quota yet (see
// docs/DECISIONS.md, ADR-016); add one before any public release.

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
// base64 text length cap, about 7.5 MB of image data.
const MAX_BASE64_LENGTH = 10_000_000;
const UPSTREAM_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS_PER_MODEL = 2;
// Strongest Flash model, for a fair handwriting test. Override with the GEMINI_MODEL secret
// (for example gemini-3.1-flash-lite, cheaper) without redeploying.
const DEFAULT_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

const PROMPT =
  'Transcribe all text in this image exactly as written, including handwriting. ' +
  'Keep the original reading order and put each line of text on its own line. ' +
  'Do not correct spelling or grammar and do not translate. ' +
  'Write [illegible] for words you cannot read. ' +
  'Reply with the transcription only, with no commentary.';

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function callGemini(
  model: string,
  apiKey: string,
  mimeType: string,
  imageBase64: string,
): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { ...JSON_HEADERS, 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: imageBase64 } }],
          },
        ],
        generationConfig: { temperature: 0 },
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    },
  );
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  let body: { imageBase64?: unknown; mimeType?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_request' });
  }
  const { imageBase64, mimeType } = body;
  if (
    typeof imageBase64 !== 'string' ||
    imageBase64.length === 0 ||
    typeof mimeType !== 'string' ||
    !ALLOWED_MIME_TYPES.has(mimeType)
  ) {
    return json(400, { error: 'invalid_request' });
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return json(413, { error: 'image_too_large' });
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('ocr-cloud: GEMINI_API_KEY is not set');
    return json(500, { error: 'server_misconfigured' });
  }
  const primaryModel = Deno.env.get('GEMINI_MODEL') ?? DEFAULT_MODEL;
  const models = primaryModel === FALLBACK_MODEL ? [primaryModel] : [primaryModel, FALLBACK_MODEL];

  const startedAt = Date.now();
  let upstream: Response | undefined;
  let model = primaryModel;
  let lastFailure: 'busy' | 'timeout' | 'rate_limited' | 'error' = 'error';

  // New models are often overloaded (503). Try each model, retrying transient failures
  // once, then fall back to the stable model. The model actually used is returned.
  outer: for (const candidate of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const response = await callGemini(candidate, apiKey, mimeType, imageBase64);
        if (response.ok) {
          upstream = response;
          model = candidate;
          break outer;
        }
        // Log the status only: the response body can echo request details.
        console.error('ocr-cloud: upstream returned', response.status, 'for model', candidate);
        if (response.status === 429) {
          lastFailure = 'rate_limited';
          break; // retrying the same model will not help; try the fallback
        }
        lastFailure = response.status === 503 || response.status === 500 ? 'busy' : 'error';
        if (lastFailure === 'error') break;
      } catch (error) {
        console.error('ocr-cloud: upstream request failed', (error as Error).name, candidate);
        lastFailure = 'timeout';
      }
    }
  }

  if (!upstream) {
    if (lastFailure === 'rate_limited') return json(429, { error: 'rate_limited' });
    if (lastFailure === 'busy') return json(503, { error: 'upstream_busy' });
    if (lastFailure === 'timeout') return json(504, { error: 'upstream_timeout' });
    return json(502, { error: 'upstream_error' });
  }

  let data: GeminiResponse;
  try {
    data = await upstream.json();
  } catch {
    return json(502, { error: 'upstream_error' });
  }
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();

  return json(200, { text, model, durationMs: Date.now() - startedAt });
});
