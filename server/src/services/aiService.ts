import OpenAI from 'openai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Provider-agnostic AI wrapper. Supports:
 *   - OpenAI (paid)        → AI_PROVIDER=openai  + OPENAI_API_KEY
 *   - Gemini (free tier)   → AI_PROVIDER=gemini  + GEMINI_API_KEY
 *
 * Both expose the same `chatJSON` interface so the rest of the app doesn't care
 * which provider is active. Selection is automatic: if AI_PROVIDER is unset,
 * we prefer whichever key is present (OpenAI first, then Gemini).
 */

export interface ChatUsage {
  promptTokens?: number;
  completionTokens?: number;
}

interface ChatJSONArgs {
  system: string;
  user: string;
  imageUrls?: string[];
  temperature?: number;
}

class AIService {
  private openaiClient: OpenAI | null = null;

  /** Which provider is active. */
  get provider(): 'openai' | 'gemini' {
    if (env.ai.provider === 'gemini' && env.ai.geminiEnabled) return 'gemini';
    if (env.ai.provider === 'openai' && env.openai.enabled) return 'openai';
    // Fallback: use whichever is configured
    if (env.openai.enabled) return 'openai';
    if (env.ai.geminiEnabled) return 'gemini';
    return env.ai.provider;
  }

  get enabled(): boolean {
    return this.provider === 'openai' ? env.openai.enabled : env.ai.geminiEnabled;
  }

  get model(): string {
    return this.provider === 'openai' ? env.openai.model : env.ai.geminiModel;
  }

  private ensureEnabled(): void {
    if (!this.enabled) {
      throw ApiError.serviceUnavailable(
        'AI features are disabled. Set OPENAI_API_KEY or GEMINI_API_KEY in server/.env',
        'AI_DISABLED',
      );
    }
  }

  private getOpenAIClient(): OpenAI {
    if (!this.openaiClient) this.openaiClient = new OpenAI({ apiKey: env.openai.apiKey });
    return this.openaiClient;
  }

  /**
   * Ask the model for a single JSON object. Returns parsed JSON + usage stats.
   * Routes to the configured provider.
   */
  async chatJSON<T = unknown>(args: ChatJSONArgs): Promise<{ data: T; usage: ChatUsage }> {
    this.ensureEnabled();
    if (this.provider === 'gemini') return this.geminiChatJSON<T>(args);
    return this.openaiChatJSON<T>(args);
  }

  // ───────────────────────── OpenAI ─────────────────────────

  private async openaiChatJSON<T>(args: ChatJSONArgs): Promise<{ data: T; usage: ChatUsage }> {
    const client = this.getOpenAIClient();
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: args.system },
    ];

    if (args.imageUrls?.length) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: args.user },
          ...args.imageUrls.map((url) => ({ type: 'image_url', image_url: { url } }) as const),
        ],
      });
    } else {
      messages.push({ role: 'user', content: args.user });
    }

    const started = Date.now();
    const res = await client.chat.completions.create({
      model: env.openai.model,
      messages,
      temperature: args.temperature ?? 0.7,
      response_format: { type: 'json_object' },
    });
    logger.debug({ provider: 'openai', latencyMs: Date.now() - started, tokens: res.usage }, 'chatJSON call');

    const raw = res.choices[0]?.message?.content ?? '{}';
    return this.parseJSON<T>(raw);
  }

  // ───────────────────────── Gemini ─────────────────────────

  private async geminiChatJSON<T>(args: ChatJSONArgs): Promise<{ data: T; usage: ChatUsage }> {
    // Build Gemini "parts" — text first, then any inline images (resolved once).
    const parts: GeminiPart[] = [{ text: `${args.system}\n\n${args.user}` }];
    for (const image of args.imageUrls ?? []) {
      const inline = await urlToGeminiImage(image);
      if (inline) parts.push({ inline_data: inline });
    }

    // Try the primary model, then fall back to alternates on transient errors
    // (503 high-demand, 429 rate-limit). This makes the AI tab resilient.
    const candidates = [env.ai.geminiModel, ...GEMINI_FALLBACK_MODELS].filter(
      (m, i, arr) => m && arr.indexOf(m) === i,
    );

    let lastErr: unknown = null;
    for (const model of candidates) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          return await this.callGeminiOnce<T>(model, parts, args.temperature ?? 0.7);
        } catch (err) {
          lastErr = err;
          const status = geminiErrStatus(err);
          // Only retry/fallback on transient errors.
          if (status === 503 || status === 429 || status === 500 || status === 504) {
            logger.warn({ model, attempt, status }, 'Gemini transient error — retrying/falling back');
            await sleep(800 * (attempt + 1));
            continue;
          }
          // Non-transient (400/403/404) — throw immediately.
          throw err;
        }
      }
    }
    throw (
      lastErr ??
      ApiError.serviceUnavailable('Gemini is temporarily unavailable. Please try again.', 'AI_REQUEST_FAILED')
    );
  }

  private async callGeminiOnce<T>(
    model: string,
    parts: GeminiPart[],
    temperature: number,
  ): Promise<{ data: T; usage: ChatUsage }> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.ai.geminiApiKey}`;

    const started = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature,
          responseMimeType: 'application/json',
        },
      } satisfies GeminiRequest),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error({ model, status: res.status, detail }, 'Gemini API error');
      if (res.status === 400 || res.status === 403) {
        throw ApiError.badRequest(`Gemini rejected the request (${res.status}). Check your API key/model.`);
      }
      if (res.status === 404) {
        throw ApiError.badRequest(`Gemini model '${model}' not found. Update GEMINI_MODEL in server/.env.`);
      }
      // Transient (429/500/502/503/504) — surface status for retry/fallback logic.
      throw ApiError.serviceUnavailable(`Gemini request failed (${res.status})`, 'AI_REQUEST_FAILED');
    }

    const json = (await res.json()) as GeminiResponse;
    logger.debug({ provider: 'gemini', model, latencyMs: Date.now() - started, tokens: json.usageMetadata }, 'chatJSON call');

    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    return {
      ...this.parseJSON<T>(raw),
      usage: {
        promptTokens: json.usageMetadata?.promptTokenCount,
        completionTokens: json.usageMetadata?.candidatesTokenCount,
      },
    };
  }

  // ───────────────────────── shared ─────────────────────────

  private parseJSON<T>(raw: string): { data: T; usage: ChatUsage } {
    try {
      return { data: JSON.parse(raw) as T, usage: {} };
    } catch {
      // Sometimes models wrap JSON in ```json fences — try to recover.
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenced) {
        try {
          return { data: JSON.parse(fenced[1]) as T, usage: {} };
        } catch {
          /* fall through */
        }
      }
      throw ApiError.unprocessable('AI returned malformed JSON', { raw: raw.slice(0, 300) });
    }
  }
}

export const aiService = new AIService();

// ───────────────────────── Gemini helpers ─────────────────────────

/** Models tried in order if the primary fails with a transient error. */
const GEMINI_FALLBACK_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
];

/** Extract the HTTP status from a thrown ApiError/generic error. */
function geminiErrStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    return (err as { status: number }).status;
  }
  return undefined;
}

/** Promise-based delay. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Convert a data-URL or remote URL into Gemini's inline_data format. */
async function urlToGeminiImage(
  url: string,
): Promise<{ mime_type: string; data: string } | null> {
  // Already a data URL: data:image/png;base64,XXXX
  const dataUrl = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(url);
  if (dataUrl) {
    return { mime_type: dataUrl[1], data: dataUrl[2] };
  }
  // Remote URL — fetch and re-encode
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') ?? 'image/png';
    return { mime_type: mime, data: buf.toString('base64') };
  } catch {
    return null;
  }
}

// ───────────────────────── Gemini types ─────────────────────────

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

interface GeminiRequest {
  contents: Array<{ role: string; parts: GeminiPart[] }>;
  generationConfig: {
    temperature?: number;
    responseMimeType?: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}
