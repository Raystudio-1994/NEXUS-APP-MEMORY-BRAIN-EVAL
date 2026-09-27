/**
 * Refactored Context & Verification Lib.
 * All GoogleGenAI calls have been migrated securely to the Express backend.
 * This prevents exposure of sensitive Gemini API keys in the browser bundle.
 */

/**
 * Computes the SHA-256 cryptographic hash of string content in a browser-safe, native context.
 */
export async function computeSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
