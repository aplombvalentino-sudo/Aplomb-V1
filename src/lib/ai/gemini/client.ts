/**
 * Gemini SDK client. One shared instance to avoid spinning up per request.
 *
 * Required env var:
 *   GEMINI_API_KEY  — provided by you, stored in .env.local and Vercel
 *
 * Model is configurable; defaults to gemini-2.5-flash for cost/latency.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

let _client: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (_client) return _client;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local and Vercel environment variables.",
    );
  }
  _client = new GoogleGenerativeAI(key);
  return _client;
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
